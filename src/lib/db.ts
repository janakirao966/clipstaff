import { Job, VaultJob } from '../types';
import { normalizeUrl, getJobId } from './extractor';

const DB_NAME = 'ClipStaffDB';
const DB_VERSION = 4;
const STORE_NAME = 'applications';
const VAULT_STORE_NAME = 'universal_vault_applications';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if we are running in an environment where indexedDB is supported
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const transaction = request.transaction;
      const oldVersion = event.oldVersion;
      
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = transaction!.objectStore(STORE_NAME);
      }
      
      if (!store.indexNames.contains('url')) {
        store.createIndex('url', 'url', { unique: true });
      }

      // Add indexes for query optimizations (Phase 3.2)
      if (!store.indexNames.contains('status')) {
        store.createIndex('status', 'status', { unique: false });
      }
      if (!store.indexNames.contains('status_dateAdded')) {
        store.createIndex('status_dateAdded', ['status', 'dateAdded'], { unique: false });
      }
      if (!store.indexNames.contains('company')) {
        store.createIndex('company', 'company', { unique: false });
      }
      if (!store.indexNames.contains('syncState')) {
        store.createIndex('syncState', 'syncState', { unique: false });
      }

      if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
        const vaultStore = db.createObjectStore(VAULT_STORE_NAME, { keyPath: 'id' });
        vaultStore.createIndex('profileName', 'profileName', { unique: false });
      }

      // Phase 1.2: URL Normalization migration for existing jobs
      if (oldVersion > 0 && oldVersion < 3) {
        const cursorReq = store.openCursor();
        const jobsToMigrate: any[] = [];
        cursorReq.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            jobsToMigrate.push(cursor.value);
            cursor.continue();
          } else {
            // Deduplicate and normalize
            const normalizedMap = new Map<string, any>();
            for (const job of jobsToMigrate) {
              const normUrl = normalizeUrl(job.url);
              const detId = getJobId(normUrl);
              
              const existing = normalizedMap.get(normUrl);
              if (existing) {
                // Keep the most advanced status (applied > skipped > not_applied)
                if (job.status === 'applied' || (job.status === 'skipped' && existing.status === 'not_applied')) {
                  existing.status = job.status;
                }
                existing.company = existing.company || job.company;
                existing.role = existing.role || job.role;
                existing.dateAdded = existing.dateAdded || job.dateAdded;
                existing.syncState = existing.syncState || job.syncState;
                existing.retryCount = Math.max(existing.retryCount || 0, job.retryCount || 0);
              } else {
                normalizedMap.set(normUrl, {
                  ...job,
                  id: detId,
                  url: normUrl
                });
              }
            }
            
            // Clear and put normalized jobs
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
              normalizedMap.forEach(job => {
                store.put(job);
              });
              console.log(`[ClipStaff DB Migration] Normalized and migrated ${jobsToMigrate.length} jobs to ${normalizedMap.size} unique jobs.`);
            };
          }
        };
      }
    };
  });
};

import { dbWriteMutex, withRetry } from './transaction';

export const getAllJobs = async (): Promise<Job[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to fetch jobs'));
    };
  });
};

export const addJob = async (job: Job): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('url');
        
        const normalizedUrl = normalizeUrl(job.url);
        const getRequest = index.get(normalizedUrl);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            reject(new Error('Already saved'));
          } else {
            const jobWithSync = {
              ...job,
              url: normalizedUrl,
              id: job.id || getJobId(normalizedUrl),
              syncState: job.syncState === 'synced' ? 'synced' : ('pending' as const),
              retryCount: job.syncState === 'synced' ? undefined : 0,
              version: 1
            };
            const addRequest = store.add(jobWithSync);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error || new Error('Failed to add job'));
          }
        };
        
        getRequest.onerror = () => {
          reject(getRequest.error || new Error('Failed to query job by URL'));
        };
      });
    });
  } finally {
    release();
  }
};

export const updateJob = async (job: Job): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getReq = store.get(job.id);
        getReq.onsuccess = () => {
          const existing = getReq.result as Job | undefined;
          if (existing) {
            // OCC version check
            if (job.version !== undefined && existing.version !== undefined && job.version !== existing.version) {
              reject(new Error('Concurrency conflict: job was updated by another process.'));
              return;
            }
            
            const updated = {
              ...existing,
              ...job,
              url: normalizeUrl(job.url),
              syncState: 'pending' as const,
              retryCount: 0,
              version: (existing.version || 0) + 1
            };
            
            const putReq = store.put(updated);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error || new Error('Failed to update job'));
          } else {
            const jobWithSync = {
              ...job,
              url: normalizeUrl(job.url),
              syncState: 'pending' as const,
              retryCount: 0,
              version: 1
            };
            const addReq = store.add(jobWithSync);
            addReq.onsuccess = () => resolve();
            addReq.onerror = () => reject(addReq.error || new Error('Failed to add job'));
          }
        };
        getReq.onerror = () => {
          reject(getReq.error || new Error('Failed to fetch job for update'));
        };
      });
    });
  } finally {
    release();
  }
};

export const deleteJob = async (id: string): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error || new Error('Failed to delete job'));
        };
      });
    });
  } finally {
    release();
  }
};

export const updateJobStatusByUrl = async (url: string, status: Job['status']): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('url');
        const normalizedUrl = normalizeUrl(url);
        const getRequest = index.get(normalizedUrl);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as Job | undefined;
          if (existing) {
            const updated = { 
              ...existing, 
              status,
              syncState: 'pending' as const,
              retryCount: 0,
              version: (existing.version || 0) + 1
            };
            const putRequest = store.put(updated);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error || new Error('Failed to update job status'));
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => {
          reject(getRequest.error || new Error('Failed to query job by URL'));
        };
      });
    });
  } finally {
    release();
  }
};

export const importJobsBulk = async (
  jobs: Job[],
  onProgress?: (progress: { current: number; total: number; successCount: number; failedCount: number }) => void
): Promise<void> => {
  const batchSize = 50;
  let successCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const release = await dbWriteMutex.acquire();
    try {
      await withRetry(async () => {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const index = store.index('url');
          
          let hasError = false;
          
          transaction.onerror = () => {
            hasError = true;
            reject(transaction.error || new Error('Transaction aborted'));
          };
          
          transaction.oncomplete = () => {
            if (!hasError) {
              successCount += batch.length;
              resolve();
            }
          };
          
          batch.forEach(job => {
            const normUrl = normalizeUrl(job.url);
            const getRequest = index.get(normUrl);
            
            getRequest.onsuccess = () => {
              const existing = getRequest.result as Job | undefined;
              if (existing) {
                const updated = { 
                  ...existing, 
                  ...job, 
                  url: normUrl,
                  id: existing.id,
                  syncState: job.syncState || existing.syncState || 'pending',
                  version: (existing.version || 0) + 1
                };
                store.put(updated);
              } else {
                const newJob = {
                  ...job,
                  url: normUrl,
                  id: job.id || getJobId(normUrl),
                  syncState: job.syncState || 'pending',
                  version: 1
                };
                store.add(newJob);
              }
            };
            
            getRequest.onerror = () => {
              hasError = true;
              transaction.abort();
              reject(new Error('Failed to lookup job URL during bulk import'));
            };
          });
        });
      });
    } catch (err) {
      failedCount += batch.length;
      console.error('[ClipStaff] Bulk import batch failed:', err);
    } finally {
      release();
    }
    
    if (onProgress) {
      onProgress({
        current: Math.min(i + batchSize, jobs.length),
        total: jobs.length,
        successCount,
        failedCount
      });
    }
  }
  
  if (failedCount > 0) {
    throw new Error(`Bulk import completed with errors. Success: ${successCount}, Failed: ${failedCount}`);
  }
};

export const clearAllJobs = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to clear jobs'));
    };
  });
};

export const clearUniversalVault = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to clear universal vault'));
    };
  });
};

export const saveUniversalVaultJobs = async (jobs: VaultJob[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VAULT_STORE_NAME);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error('Failed to save universal vault jobs'));
    };

    jobs.forEach(job => {
      store.put(job);
    });
  });
};

export const getUniversalJobsByProfile = async (profileName: string): Promise<VaultJob[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const index = store.index('profileName');
    
    // Perform a case-insensitive search by fetching all and filtering, or direct lookup if matched.
    // Excel worksheet names are case-insensitive, so we normalize.
    const request = index.openCursor();
    const results: VaultJob[] = [];
    const targetNameLower = profileName.toLowerCase();

    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const job = cursor.value as VaultJob;
        if (job.profileName.toLowerCase() === targetNameLower) {
          results.push(job);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to query universal vault by profile'));
    };
  });
};

export const getUniversalProfiles = async (): Promise<string[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const jobs = request.result || [];
      const profileSet = new Set<string>();
      jobs.forEach(j => {
        if (j.profileName) {
          profileSet.add(j.profileName);
        }
      });
      resolve(Array.from(profileSet));
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to load universal profiles'));
    };
  });
};

export const getAllUniversalJobs = async (): Promise<VaultJob[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as VaultJob[]) || []);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to fetch all universal vault jobs'));
    };
  });
};

export const updateUniversalJobStatusByUrl = async (url: string, status: Job['status']): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const job = cursor.value as VaultJob;
        if (job.url === url) {
          const updated = { ...job, status };
          cursor.update(updated);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to update universal job status'));
    };
  });
};

export const deleteUniversalJobById = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to delete universal job'));
    };
  });
};

export const getPendingJobs = async (): Promise<Job[]> => {
  const allJobs = await getAllJobs();
  return allJobs.filter(job => job.syncState === 'pending');
};

export const markJobsAsSynced = async (ids: string[]): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let completed = 0;
        let hasError = false;

        if (ids.length === 0) {
          resolve();
          return;
        }

        ids.forEach(id => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const job = getReq.result;
            if (job) {
              job.syncState = 'synced';
              job.lastSyncedAt = Date.now();
              job.retryCount = 0;
              job.version = (job.version || 0) + 1;
              const putReq = store.put(job);
              putReq.onsuccess = () => {
                completed++;
                if (completed === ids.length && !hasError) resolve();
              };
              putReq.onerror = () => {
                hasError = true;
                reject(putReq.error || new Error('Failed to update sync state'));
              };
            } else {
              completed++;
              if (completed === ids.length && !hasError) resolve();
            }
          };
          getReq.onerror = () => {
            hasError = true;
            reject(getReq.error || new Error('Failed to fetch job for sync state update'));
          };
        });
      });
    });
  } finally {
    release();
  }
};

export const markJobsAsError = async (ids: string[]): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let completed = 0;
        let hasError = false;

        if (ids.length === 0) {
          resolve();
          return;
        }

        ids.forEach(id => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const job = getReq.result;
            if (job) {
              job.syncState = 'error';
              job.retryCount = (job.retryCount || 0) + 1;
              job.lastRetryAt = Date.now();
              job.version = (job.version || 0) + 1;
              const putReq = store.put(job);
              putReq.onsuccess = () => {
                completed++;
                if (completed === ids.length && !hasError) resolve();
              };
              putReq.onerror = () => {
                hasError = true;
                reject(putReq.error || new Error('Failed to update sync state'));
              };
            } else {
              completed++;
              if (completed === ids.length && !hasError) resolve();
            }
          };
          getReq.onerror = () => {
            hasError = true;
            reject(getReq.error || new Error('Failed to fetch job for sync state update'));
          };
        });
      });
    });
  } finally {
    release();
  }
};

export const mergeExternalJobs = async (externalJobs: Job[]): Promise<boolean> => {
  const release = await dbWriteMutex.acquire();
  try {
    return await withRetry(async () => {
      const db = await initDB();
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const allLocal = getAllReq.result as Job[];
          const localUrlMap = new Map<string, Job>();
          allLocal.forEach(j => {
            localUrlMap.set(normalizeUrl(j.url), j);
          });
          
          let addedAny = false;
          let completed = 0;
          let hasError = false;
          
          const jobsToProcess = externalJobs.filter(extJob => {
            const extNormUrl = normalizeUrl(extJob.url);
            const existingLocal = localUrlMap.get(extNormUrl);
            
            if (existingLocal) {
              // Conflict resolution: keep 'applied' over external 'not_applied'
              if (existingLocal.status === 'applied' && extJob.status === 'not_applied') {
                return false;
              }
              
              if (existingLocal.status !== extJob.status) {
                const updated = {
                  ...existingLocal,
                  status: extJob.status,
                  syncState: 'synced' as const,
                  lastSyncedAt: Date.now(),
                  version: (existingLocal.version || 0) + 1
                };
                store.put(updated);
                addedAny = true;
              }
              return false;
            }
            return true;
          });
          
          if (jobsToProcess.length === 0) {
            resolve(addedAny);
            return;
          }
          
          jobsToProcess.forEach(job => {
            const extNormUrl = normalizeUrl(job.url);
            const jobToInsert = {
              ...job,
              id: job.id || getJobId(extNormUrl),
              url: extNormUrl,
              syncState: 'synced' as const,
              lastSyncedAt: Date.now(),
              version: 1
            };
            
            const addReq = store.add(jobToInsert);
            addReq.onsuccess = () => {
              addedAny = true;
              completed++;
              if (completed === jobsToProcess.length && !hasError) {
                resolve(addedAny);
              }
            };
            addReq.onerror = () => {
              hasError = true;
              reject(addReq.error || new Error('Failed to merge job'));
            };
          });
        };
        
        getAllReq.onerror = () => {
          reject(getAllReq.error || new Error('Failed to retrieve local jobs during merge'));
        };
      });
    });
  } finally {
    release();
  }
};

export const markJobsAsFailed = async (ids: string[]): Promise<void> => {
  const release = await dbWriteMutex.acquire();
  try {
    await withRetry(async () => {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let completed = 0;
        let hasError = false;

        if (ids.length === 0) {
          resolve();
          return;
        }

        ids.forEach(id => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const job = getReq.result;
            if (job) {
              job.syncState = 'error';
              job.retryCount = 5;
              job.version = (job.version || 0) + 1;
              const putReq = store.put(job);
              putReq.onsuccess = () => {
                completed++;
                if (completed === ids.length && !hasError) resolve();
              };
              putReq.onerror = () => {
                hasError = true;
                reject(putReq.error || new Error('Failed to update sync state to failed'));
              };
            } else {
              completed++;
              if (completed === ids.length && !hasError) resolve();
            }
          };
          getReq.onerror = () => {
            hasError = true;
            reject(getReq.error || new Error('Failed to fetch job for sync state update'));
          };
        });
      });
    });
  } finally {
    release();
  }
};

