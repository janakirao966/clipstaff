import { Job } from '../types';

const DB_NAME = 'ClipStaffDB';
const DB_VERSION = 1;
const STORE_NAME = 'applications';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create an index on url to ensure we don't save duplicate URLs if desired
        store.createIndex('url', 'url', { unique: true });
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
