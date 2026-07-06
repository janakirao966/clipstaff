import { useState, useEffect, useCallback } from 'react';
import { Job } from '../types';
import * as db from '../lib/db';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, normalizeUrl } from '../lib/extractor';

export const useJobsDb = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getAllJobs();
      setJobs(data);
    } catch (e) {
      console.error('Failed to load jobs from IndexedDB:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const addJob = useCallback(async (url: string, company?: string, role?: string, status: Job['status'] = 'not_applied') => {
    const normUrl = normalizeUrl(url);
    const finalCompany = company || extractCompanyFromUrl(normUrl);
    const finalRole = role || extractRoleFromUrl(normUrl);
    const id = getJobId(normUrl);
    const dateAdded = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const jobItem: Job = {
      id,
      company: finalCompany,
      role: finalRole,
      url: normUrl,
      dateAdded,
      status
    };

    await db.addJob(jobItem);
    await loadJobs();
    
    // Broadcast changes so other parts of the extension (like other tabs' sidebars) sync in real time
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
    }
  }, [loadJobs]);

  const updateJobStatus = useCallback(async (url: string, status: Job['status']) => {
    const normUrl = normalizeUrl(url);
    const dbJobs = await db.getAllJobs();
    const existing = dbJobs.find(j => normalizeUrl(j.url) === normUrl);
    if (existing) {
      const updated = { ...existing, status };
      await db.updateJob(updated);
      await loadJobs();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
      }
    }
  }, [loadJobs]);

  const deleteJob = useCallback(async (id: string) => {
    await db.deleteJob(id);
    await loadJobs();
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
    }
  }, [loadJobs]);

  const importJobs = useCallback(async (sheetJobs: Job[]) => {
    for (const job of sheetJobs) {
      await db.addJob({ ...job, url: normalizeUrl(job.url) });
    }
    await loadJobs();
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
    }
  }, [loadJobs]);

  const getActiveTabInfo = useCallback(async (): Promise<{ url: string; title: string } | null> => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        return {
          url: tab.url,
          title: tab.title || ''
        };
      }
    } catch (e) {
      console.error('Failed to get active tab info:', e);
    }
    return null;
  }, []);

  // Listen for real-time updates from background or other sidebars
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    const listener = (message: any) => {
      if (message.type === 'JOB_DATABASE_CHANGED') {
        loadJobs();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [loadJobs]);

  // Initial load
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs,
    loading,
    loadJobs,
    addJob,
    updateJobStatus,
    deleteJob,
    importJobs,
    getActiveTabInfo
  };
};
