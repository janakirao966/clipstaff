import { Job, VaultJob } from '../types';

const DB_NAME = 'ClipStaffDB';
const DB_VERSION = 2;
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

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;
      
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = transaction!.objectStore(STORE_NAME);
      }
      
      if (!store.indexNames.contains('url')) {
        store.createIndex('url', 'url', { unique: true });
      }

      if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
        const vaultStore = db.createObjectStore(VAULT_STORE_NAME, { keyPath: 'id' });
        vaultStore.createIndex('profileName', 'profileName', { unique: false });
      }
    };
  });
};

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
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Check if URL already exists via index first
    const index = store.index('url');
    const getRequest = index.get(job.url);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        // If it exists, update it or reject? Let's update it to ensure new details are merged, or throw.
        // Actually, let's just put it to overwrite/merge to avoid unique key index violation,
        // using the existing ID of the matched job.
        const existing = getRequest.result;
        const updatedJob = { ...existing, ...job, id: existing.id };
        const putRequest = store.put(updatedJob);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error || new Error('Failed to update existing job'));
      } else {
        const addRequest = store.add(job);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error || new Error('Failed to add job'));
      }
    };

    getRequest.onerror = () => {
      // Fallback: try direct add
      const addRequest = store.add(job);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error || new Error('Failed to add job'));
    };
  });
};

export const updateJob = async (job: Job): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(job);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to update job'));
    };
  });
};

export const deleteJob = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
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
};

export const updateJobStatusByUrl = async (url: string, status: Job['status']): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('url');
    const getRequest = index.get(url);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        const updated = { ...existing, status };
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
};

export const importJobsBulk = async (jobs: Job[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('url');

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error('Failed to bulk import jobs'));
    };

    jobs.forEach(job => {
      const getRequest = index.get(job.url);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const existing = getRequest.result;
          const updated = { ...existing, ...job, id: existing.id };
          store.put(updated);
        } else {
          store.add(job);
        }
      };
    });
  });
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
