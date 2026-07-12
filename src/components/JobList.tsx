import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Job } from '../types';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useJobsDb } from '../hooks/useJobsDb';
import { clearAllJobs } from '../lib/db';
import { getSpreadsheetExportUrl, getSpreadsheetXlsxExportUrl, exportToExcel, worksheetToRows, parseRowsToJobs, parseCSV } from '../lib/csvHelper';
import { VirtualizedJobList } from './jobs/VirtualizedJobList';
import { JobFilters } from './jobs/JobFilters';
import { CsvSyncSection } from './jobs/CsvSyncSection';
import { ManualJobModal } from './jobs/ManualJobModal';
import { ConfirmAppliedModal } from './jobs/ConfirmAppliedModal';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeUrl, getJobId, extractCompanyFromUrl, extractRoleFromUrl, sanitizeProfileName, normalizeDateStr } from '../lib/extractor';
import { SyncProgressBar } from './jobs/SyncProgressBar';
import { CountdownBanner } from './jobs/CountdownBanner';
import { WipeConfirmationModal } from './jobs/WipeConfirmationModal';

interface SheetTab {
  name: string;
  jobs: Job[];
}

const fetchViaBackground = (
  url: string,
  binary: boolean = false
): Promise<{ success: boolean; data?: string; error?: string }> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: binary ? 'FETCH_SPREADSHEET_BINARY' : 'FETCH_SPREADSHEET', url },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'Empty background response.' });
        }
      }
    );
  });
};

export const JobList = () => {
  const spreadsheetUrl = useStore(state => state.spreadsheetUrl);
  const setSpreadsheetUrl = useStore(state => state.setSpreadsheetUrl);
  const googleWebAppUrl = useStore(state => state.googleWebAppUrl);
  const setGoogleWebAppUrl = useStore(state => state.setGoogleWebAppUrl);
  const jobs = useStore(state => state.jobs);
  const setJobs = useStore(state => state.setJobs);
  const updateJobStatus = useStore(state => state.updateJobStatus);
  const activeProfile = useStore(state => state.activeProfile);
  const profiles = useStore(state => state.profiles);
  const sheetTabs = useStore(state => state.sheetTabs);
  const setSheetTabs = useStore(state => state.setSheetTabs);
  const selectedSheetIdx = useStore(state => state.selectedSheetIdx);
  const setSelectedSheetIdx = useStore(state => state.setSelectedSheetIdx);
  const activeProfileToUse = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);
  const localDb = useJobsDb();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    jobs: localJobs,
    vaultProfiles,
    selectedVaultProfile,
    setSelectedVaultProfile,
    vaultJobs,
    importUniversalVault,
    exportMergeUniversal,
    exportMergeGoogleSheet,
    isMergingSheet
  } = localDb;
  
  const [viewMode, setViewMode] = useState<'sheet' | 'local'>('local');
  const [urlInput, setUrlInput] = useState(spreadsheetUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'not_applied' | 'applied' | 'skipped'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'yesterday_today' | 'last_7_days' | 'all' | 'custom'>('today');
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [customDate, setCustomDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [pendingConfirmJob, setPendingConfirmJob] = useState<Job | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Manual Add Form Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'manual' | 'capture'>('manual');

  const layoutMode = 'cards';
  const [visibleRange, setVisibleRange] = useState({ start: 0, stop: 9 });

  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const [autoConfirmDuration, setAutoConfirmDuration] = useState(30);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [activeError, setActiveError] = useState<{ title: string; desc: string; advice: string } | null>(null);

  // Sync state if store updates from options
  useEffect(() => {
    setUrlInput(spreadsheetUrl);
  }, [spreadsheetUrl]);

  // Prevent viewing the current profile's data as a vault tab
  useEffect(() => {
    if (selectedVaultProfile && (activeProfileToUse?.full_name || activeProfileToUse?.name)) {
      const activeSanitized = sanitizeProfileName(activeProfileToUse.full_name || activeProfileToUse.name).toLowerCase();
      const selectedSanitized = sanitizeProfileName(selectedVaultProfile).toLowerCase();
      if (activeSanitized === selectedSanitized) {
        setSelectedVaultProfile('');
      }
    }
  }, [selectedVaultProfile, activeProfileToUse, setSelectedVaultProfile]);

  // Listen for window focus/visibility change to prompt confirmation when user comes back
  useEffect(() => {
    const handleFocusCheck = () => {
      if (pendingConfirmJob) {
        setShowConfirmModal(true);
      }
    };

    window.addEventListener('focus', handleFocusCheck);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingConfirmJob) {
        setShowConfirmModal(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocusCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingConfirmJob]);

  // Listen for message from top window indicating a job was saved by shortcut
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'JOB_SAVED_BY_SHORTCUT') {
        const job = event.data.job;
        setPendingConfirmJob(job);
        
        if (autoConfirmEnabled) {
          setCountdown(autoConfirmDuration);
          setIsTimerPaused(false);
        } else {
          setCountdown(null);
          setShowConfirmModal(true);
        }
      }
    };
    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [autoConfirmEnabled, autoConfirmDuration]);

  // Helper to diagnose errors and return advice
  const getErrorRecoveryDetails = (error: any) => {
    const msg = (error?.message || String(error)).toLowerCase();
    let title = 'Operation Failed';
    let desc = error?.message || 'An unexpected error occurred.';
    let advice = 'If the problem persists, please reload the extension or report the bug.';

    if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('status 0')) {
      title = 'Network Connection Error';
      desc = 'Unable to establish network connection to Google Sheet.';
      advice = 'Please verify your internet connection, confirm the sheet URL is correct, and try again.';
    } else if (msg.includes('permission') || msg.includes('access') || msg.includes('notallowed') || msg.includes('denied')) {
      title = 'Permission Denied';
      desc = 'The extension does not have permission to access the active tab or storage.';
      advice = 'Ensure activeTab and clipboard permissions are enabled in your browser settings.';
    } else if (msg.includes('quota') || msg.includes('full') || msg.includes('exceeded') || msg.includes('limit')) {
      title = 'Storage Quota Exceeded';
      desc = 'IndexedDB database or local storage is full.';
      advice = 'Wipe unused vaults or clear your browser cache to free up storage space.';
    } else if (msg.includes('database') || msg.includes('indexeddb') || msg.includes('transaction') || msg.includes('lock')) {
      title = 'Database Lock Failure';
      desc = 'A database transaction timed out or conflicted with another write.';
      advice = 'Wait a few seconds for current syncs to complete, or restart the extension.';
    }

    return { title, desc, advice };
  };

  // Fetch and Sync Job List from Spreadsheet (supports multi-sheet XLSX)
  const syncJobs = useCallback(async (targetUrl: string) => {
    const xlsxUrl = getSpreadsheetXlsxExportUrl(targetUrl);
    if (!xlsxUrl) {
      toast.error('Invalid URL', {
        description: 'Please provide a valid Google Sheets URL.'
      });
      return;
    }

    setFetching(true);
    setActiveError(null);
    setSyncProgress({ current: 0, total: 100, stage: 'Connecting to Google Sheets...' });
    const loadingToast = toast.loading('Fetching spreadsheet...');
    setSpreadsheetUrl(targetUrl);

    try {
      setSyncProgress({ current: 20, total: 100, stage: 'Downloading Sheet data...' });
      const xlsxResponse = await fetchViaBackground(xlsxUrl, true);
      let loadedParsed = false;

      if (xlsxResponse.success && xlsxResponse.data) {
        try {
          setSyncProgress({ current: 50, total: 100, stage: 'Parsing Spreadsheet rows...' });
          // Decode base64 to ArrayBuffer
          const binaryString = atob(xlsxResponse.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(bytes.buffer);

          let validSheets = workbook.worksheets.filter(
            (s: any) => s.state !== 'hidden' && s.name !== '__meta__'
          );

          if (validSheets.length > 0) {
            const currentJobs = useStore.getState().jobs;

            if (validSheets.length === 1) {
              setSheetTabs([]);
              setSelectedSheetIdx(0);
              const rows = worksheetToRows(validSheets[0]);
              const parsedJobs = parseRowsToJobs(rows, currentJobs);
              
              setSyncProgress({ current: 80, total: 100, stage: 'Importing jobs to vault...' });
              await localDb.importJobs(parsedJobs);
              setJobs(parsedJobs);
              
              loadedParsed = true;
              toast.dismiss(loadingToast);
              toast.success('Refresh Complete', {
                description: `Loaded ${parsedJobs.length} job application links.`,
                action: {
                  label: 'Dismiss All',
                  onClick: () => toast.dismiss()
                }
              });
            } else {
              setSyncProgress({ current: 70, total: 100, stage: 'Mapping profiles...' });
              const tabs: SheetTab[] = validSheets.map((sheet: any) => {
                const rows = worksheetToRows(sheet);
                const sheetJobs = parseRowsToJobs(rows);
                return { name: sheet.name, jobs: sheetJobs };
              });

              let defaultIdx = 0;
              if (activeProfileToUse) {
                const normalizeCompare = (val: string) => val.toLowerCase().replace(/[-_\s\\\/?:*\[\]]+/g, '');
                const profileNameNorm = normalizeCompare(activeProfileToUse.name || '');
                const profileFullNameNorm = normalizeCompare(activeProfileToUse.full_name || '');
                
                const matchIdx = tabs.findIndex(t => {
                  const sheetNameNorm = normalizeCompare(t.name);
                  return sheetNameNorm === profileNameNorm || sheetNameNorm === profileFullNameNorm;
                });
                if (matchIdx !== -1) defaultIdx = matchIdx;
              }

              setSheetTabs(tabs);
              setSelectedSheetIdx(defaultIdx);
              
              setSyncProgress({ current: 85, total: 100, stage: 'Importing default profile...' });
              await localDb.importJobs(tabs[defaultIdx].jobs);
              setJobs(tabs[defaultIdx].jobs);
              
              loadedParsed = true;
              toast.dismiss(loadingToast);
              toast.success('Refresh Complete', {
                description: `Found ${tabs.length} profile sheets. Showing "${tabs[defaultIdx].name}" with ${tabs[defaultIdx].jobs.length} links.`,
                action: {
                  label: 'Dismiss All',
                  onClick: () => toast.dismiss()
                }
              });
            }
          }
        } catch (innerErr) {
          console.warn('XLSX parsing failed, falling back to CSV:', innerErr);
        }
      }

      if (!loadedParsed) {
        console.warn('XLSX fetch failed or invalid, falling back to CSV');
        const csvExportUrl = getSpreadsheetExportUrl(targetUrl);
        if (!csvExportUrl) throw new Error('Could not build export URL.');

        setSyncProgress({ current: 40, total: 100, stage: 'Fetching CSV export...' });
        const csvResponse = await fetchViaBackground(csvExportUrl);
        if (!csvResponse.success) {
          throw new Error(csvResponse.error || 'Failed to fetch spreadsheet.');
        }

        const csvText = csvResponse.data || '';
        const rows = parseCSV(csvText);
        if (rows.length === 0) throw new Error('Spreadsheet is empty.');

        const currentJobs = useStore.getState().jobs;
        const parsedJobs = parseRowsToJobs(rows, currentJobs);

        setSheetTabs([]);
        setSelectedSheetIdx(0);
        
        setSyncProgress({ current: 80, total: 100, stage: 'Importing jobs...' });
        await localDb.importJobs(parsedJobs);
        setJobs(parsedJobs);
        
        loadedParsed = true;
        toast.dismiss(loadingToast);
        toast.success('Refresh Complete', {
          description: `Loaded ${parsedJobs.length} job application links.`,
          action: {
            label: 'Dismiss All',
            onClick: () => toast.dismiss()
          }
        });
      }

      setShowSettings(false);
    } catch (err: any) {
      console.error('Spreadsheet refresh error:', err);
      toast.dismiss(loadingToast);
      
      const recovery = getErrorRecoveryDetails(err);
      setActiveError(recovery);
      toast.error('Refresh Failed', {
        description: recovery.desc
      });
    } finally {
      setSyncProgress(null);
      setFetching(false);
    }
  }, [setSpreadsheetUrl, setJobs, activeProfile, localDb]);

  const handleSyncJobs = useCallback(() => {
    syncJobs(urlInput);
  }, [syncJobs, urlInput]);

  const handleSheetTabChange = useCallback((idx: number) => {
    setSelectedSheetIdx(idx);
    if (sheetTabs[idx]) {
      setJobs(sheetTabs[idx].jobs);
    }
  }, [sheetTabs, setJobs]);

  const handleApply = (job: Job) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: job.url });
    } else {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }
    
    if (job.status === 'not_applied') {
      setPendingConfirmJob(job);
      
      // Increment pending confirmation count & save in chrome.storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['pendingConfirmationIds'], (result) => {
          const ids = result.pendingConfirmationIds || [];
          if (!ids.includes(job.id)) {
            const newIds = [...ids, job.id];
            chrome.storage.local.set({ pendingConfirmationIds: newIds }, () => {
              setPendingCount(newIds.length);
              updateBadge(newIds.length);
            });
          }
        });
      }

      if (autoConfirmEnabled) {
        setCountdown(autoConfirmDuration);
        setIsTimerPaused(false);
        toast.info('Link Opened', {
          description: `Auto-confirming as Applied in ${autoConfirmDuration}s...`
        });
      } else {
        setCountdown(null);
        toast.info('Link Opened', {
          description: `Confirm status once you return.`
        });
      }
    } else {
      toast.success('Link Opened', {
        description: `Viewing job at ${job.company}.`
      });
    }
  };

  const handleConfirmApplied = async (applied: boolean) => {
    if (pendingConfirmJob) {
      const isVaultJob = !!selectedVaultProfile;

      // Remove from pending confirmation list in chrome.storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['pendingConfirmationIds'], (result) => {
          const ids = result.pendingConfirmationIds || [];
          const newIds = ids.filter((id: string) => id !== pendingConfirmJob.id);
          chrome.storage.local.set({ pendingConfirmationIds: newIds }, () => {
            setPendingCount(newIds.length);
            updateBadge(newIds.length);
          });
        });
      }

      if (applied) {
        if (isVaultJob) {
          try {
            await localDb.addJob(
              pendingConfirmJob.url,
              pendingConfirmJob.company,
              pendingConfirmJob.role,
              'applied'
            );
            toast.success('Applied & Saved!', {
              description: `Saved to your local profile from ${selectedVaultProfile}'s vault.`
            });
          } catch (e: any) {
            toast.error('Save Failed', { description: e.message || 'Could not save to local database.' });
          }
        } else if (viewMode === 'sheet') {
          updateJobStatus(pendingConfirmJob.url, 'applied');
          const normalizedUrl = normalizeUrl(pendingConfirmJob.url);
          const exists = localJobs.some(j => normalizeUrl(j.url) === normalizedUrl);
          if (!exists) {
            try {
              await localDb.addJob(
                pendingConfirmJob.url,
                pendingConfirmJob.company,
                pendingConfirmJob.role,
                'applied'
              );
            } catch (e) {
              console.error('Failed to add sheet job to local database:', e);
            }
          } else {
            await localDb.updateJobStatus(pendingConfirmJob.url, 'applied');
          }
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'TRIGGER_BATCH_PUSH', force: true }).catch(() => {});
          }
          toast.success('Applied!', {
            description: `Status updated to Applied for ${pendingConfirmJob.company}.`
          });
        } else {
          await localDb.updateJobStatus(pendingConfirmJob.url, 'applied');
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'TRIGGER_BATCH_PUSH', force: true }).catch(() => {});
          }
          toast.success('Applied!', {
            description: `Status updated to Applied for ${pendingConfirmJob.company}.`
          });
        }
      } else {
        if (isVaultJob) {
          toast.info('Not Saved', {
            description: `${pendingConfirmJob.company} was not added to your local profile.`
          });
        } else {
          toast.info('Status Unchanged', {
            description: `Kept status as To Apply for ${pendingConfirmJob.company}.`
          });
        }
      }
    }
    setCountdown(null);
    setShowConfirmModal(false);
    setPendingConfirmJob(null);
  };

  const handleResolveAllPendingConfirmations = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['pendingConfirmationIds'], async (result) => {
        const ids: string[] = result.pendingConfirmationIds || [];
        if (ids.length === 0) return;

        const isVaultJob = !!selectedVaultProfile;

        for (const id of ids) {
          const job = displayedJobs.find(j => j.id === id);
          if (job) {
            if (isVaultJob) {
              try {
                await localDb.addJob(job.url, job.company, job.role, 'applied');
              } catch (e) {
                console.error('Failed to add vault job:', e);
              }
            } else if (viewMode === 'sheet') {
              updateJobStatus(job.url, 'applied');
              const normalizedUrl = normalizeUrl(job.url);
              const exists = localJobs.some(j => normalizeUrl(j.url) === normalizedUrl);
              if (!exists) {
                try {
                  await localDb.addJob(job.url, job.company, job.role, 'applied');
                } catch (e) {
                  console.error('Failed to add sheet job to local database:', e);
                }
              } else {
                await localDb.updateJobStatus(job.url, 'applied');
              }
            } else {
              await localDb.updateJobStatus(job.url, 'applied');
            }
          }
        }

        if (!isVaultJob && typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'TRIGGER_BATCH_PUSH', force: true }).catch(() => {});
        }

        chrome.storage.local.set({ pendingConfirmationIds: [] }, () => {
          setPendingCount(0);
          updateBadge(0);
          toast.success('Confirmed!', {
            description: `All pending applications marked as Applied.`
          });
        });
      });
    }
  };

  const handleDismissAllPendingConfirmations = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ pendingConfirmationIds: [] }, () => {
        setPendingCount(0);
        updateBadge(0);
        toast.info('Pending confirmations cleared.');
      });
    }
  };

  const handleUpdateStatus = useCallback(async (url: string, status: Job['status']) => {
    if (viewMode === 'sheet') {
      updateJobStatus(url, status);
      const normalizedUrl = normalizeUrl(url);
      const exists = localJobs.some(j => normalizeUrl(j.url) === normalizedUrl);
      if (!exists && status === 'applied') {
        const job = jobs.find(j => normalizeUrl(j.url) === normalizedUrl);
        if (job) {
          try {
            await localDb.addJob(job.url, job.company, job.role, 'applied');
          } catch (e) {
            console.error('Failed to add sheet job to local database:', e);
          }
        }
      } else {
        await localDb.updateJobStatus(url, status);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'TRIGGER_BATCH_PUSH', force: true }).catch(() => {});
      }
    } else if (selectedVaultProfile) {
      await localDb.updateVaultJobStatus(url, status);
    } else {
      await localDb.updateJobStatus(url, status);
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'TRIGGER_BATCH_PUSH', force: true }).catch(() => {});
      }
    }
  }, [viewMode, selectedVaultProfile, updateJobStatus, localDb, localJobs, jobs]);

  const updateBadge = (count: number) => {
    if (typeof chrome !== 'undefined' && chrome.action) {
      chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#D97706' });
    }
  };

  const handleToggleAutoConfirm = (val: boolean) => {
    setAutoConfirmEnabled(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ autoConfirmEnabled: val });
    }
  };

  const handleDurationChange = (val: number) => {
    setAutoConfirmDuration(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ autoConfirmDuration: val });
    }
  };

  // Load auto-confirm and pending confirmation states on startup
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['autoConfirmEnabled', 'autoConfirmDuration', 'pendingConfirmationIds'], (result) => {
        if (result.autoConfirmEnabled !== undefined) {
          setAutoConfirmEnabled(result.autoConfirmEnabled);
        }
        if (result.autoConfirmDuration !== undefined) {
          setAutoConfirmDuration(result.autoConfirmDuration);
        }
        const ids = result.pendingConfirmationIds || [];
        setPendingCount(ids.length);
        updateBadge(ids.length);
      });
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || isTimerPaused || !pendingConfirmJob) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleConfirmApplied(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [countdown, isTimerPaused, pendingConfirmJob]);

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          toast.error('Import Failed', { description: 'The CSV file is empty.' });
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        let urlIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('apply') || h.includes('website') || h.includes('href') || h.includes('site'));
        let companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && (h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm') || h.includes('name') || h.includes('comp')));
        let roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && (h.includes('role') || h.includes('role/position') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation') || h.includes('post')));
        let statusIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (h.includes('status') || h.includes('stage') || h.includes('progress') || h.includes('state')));
        let dateIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && idx !== statusIdx && (h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day') || h.includes('created')));

        if (urlIdx === -1) {
          urlIdx = Math.max(0, headers.findIndex(h => h.includes('http') || h.includes('www')));
          if (urlIdx === -1) urlIdx = 0;
          companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && h.includes('company'));
          roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && h.includes('role'));
        }

        toast.info('CSV Columns Mapped', {
          description: `URL: col ${urlIdx + 1} ("${rows[0][urlIdx] || ''}"), Company: ${companyIdx !== -1 ? 'col ' + (companyIdx + 1) + ' ("' + (rows[0][companyIdx] || '') + '")' : 'extracted from URL'}, Role: ${roleIdx !== -1 ? 'col ' + (roleIdx + 1) + ' ("' + (rows[0][roleIdx] || '') + '")' : 'extracted from URL'}`
        });

        const parsedJobs: Job[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const url = (row[urlIdx] || '').trim();
          if (!url || (!url.startsWith('http') && !url.includes('.'))) continue;

          const normUrl = normalizeUrl(url);
          const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : extractCompanyFromUrl(normUrl);
          const role = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].trim() : extractRoleFromUrl(normUrl);
          
          let status: Job['status'] = 'not_applied';
          if (statusIdx !== -1 && row[statusIdx]) {
            const rawStatus = row[statusIdx].toLowerCase().trim().replace(' ', '_');
            if (rawStatus === 'applied') status = 'applied';
            else if (rawStatus === 'skipped') status = 'skipped';
          }

          const dateAdded = normalizeDateStr(dateIdx !== -1 && row[dateIdx] 
            ? row[dateIdx].trim() 
            : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));

          parsedJobs.push({
            id: getJobId(normUrl),
            company,
            role,
            url: normUrl,
            status,
            dateAdded
          });
        }

        if (parsedJobs.length === 0) {
          toast.error('Import Failed', { description: 'Could not parse any valid job application links.' });
          return;
        }

        setActiveError(null);
        setSyncProgress({ current: 0, total: parsedJobs.length, stage: 'Importing CSV...' });

        await localDb.importJobs(parsedJobs, (progress) => {
          setSyncProgress({
            current: progress.current,
            total: progress.total,
            stage: 'Importing CSV...'
          });
        });

        toast.success('Import Successful', {
          description: `Successfully loaded ${parsedJobs.length} jobs into your local database.`,
          action: {
            label: 'Dismiss All',
            onClick: () => toast.dismiss()
          }
        });
      } catch (err: any) {
        console.error('CSV import error:', err);
        const recovery = getErrorRecoveryDetails(err);
        setActiveError(recovery);
        toast.error('Import Failed', { description: recovery.desc });
      } finally {
        setSyncProgress(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdown(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleClearAllJobs = () => {
    setShowWipeModal(true);
  };

  const handleConfirmedWipeOnly = async () => {
    try {
      await clearAllJobs();
      await localDb.loadJobs();
      toast.success('Local database cleared');
    } catch (err: any) {
      toast.error('Failed to clear database', { description: err.message });
    }
  };

  const displayedJobs = viewMode === 'sheet' 
    ? jobs 
    : (selectedVaultProfile ? (vaultJobs as any[]) : localJobs);

  const dateFilteredJobs = useMemo(() => {
    let result = displayedJobs;

    const todayStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    
    const getYesterdayStr = () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };
    const yesterdayStr = getYesterdayStr();

    const parseDateStr = (dateStr?: string): Date | null => {
      const normalized = normalizeDateStr(dateStr);
      if (!normalized) return null;
      const parts = normalized.split('/');
      if (parts.length !== 3) return null;
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
      return new Date(year, month - 1, day);
    };

    const isWithinLast7Days = (dateStr?: string) => {
      const d = parseDateStr(dateStr);
      if (!d) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - d.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    };

    const convertInputDateToLocaleStr = (inputDateStr: string): string => {
      const parts = inputDateStr.split('-');
      if (parts.length !== 3) return '';
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    };
    const customDateLocaleStr = convertInputDateToLocaleStr(customDate);

    if (dateFilter === 'today') {
      result = result.filter(j => normalizeDateStr(j.dateAdded) === todayStr);
    } else if (dateFilter === 'yesterday') {
      result = result.filter(j => normalizeDateStr(j.dateAdded) === yesterdayStr);
    } else if (dateFilter === 'yesterday_today') {
      result = result.filter(j => {
        const norm = normalizeDateStr(j.dateAdded);
        return norm === todayStr || norm === yesterdayStr;
      });
    } else if (dateFilter === 'last_7_days') {
      result = result.filter(j => isWithinLast7Days(j.dateAdded));
    } else if (dateFilter === 'custom' && customDateLocaleStr) {
      result = result.filter(j => normalizeDateStr(j.dateAdded) === customDateLocaleStr);
    }

    return result;
  }, [displayedJobs, dateFilter, customDate]);

  const stats = useMemo(() => {
    const total = dateFilteredJobs.length;
    const notApplied = dateFilteredJobs.filter(j => j.status === 'not_applied').length;
    const applied = dateFilteredJobs.filter(j => j.status === 'applied').length;
    const skipped = dateFilteredJobs.filter(j => j.status === 'skipped').length;
    return { total, notApplied, applied, skipped };
  }, [dateFilteredJobs]);

  const filteredJobs = useMemo(() => {
    let result = dateFilteredJobs;

    if (activeTab === 'not_applied') {
      result = dateFilteredJobs.filter(j => j.status === 'not_applied');
    } else if (activeTab === 'applied') {
      result = dateFilteredJobs.filter(j => j.status === 'applied');
    } else if (activeTab === 'skipped') {
      result = dateFilteredJobs.filter(j => j.status === 'skipped');
    }

    if (debouncedSearchTerm.trim()) {
      const q = debouncedSearchTerm.toLowerCase();
      result = result.filter(j => 
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.url.toLowerCase().includes(q)
      );
    }

    // Sort by status: not_applied -> applied -> skipped (robust normalization)
    return [...result].sort((a, b) => {
      const getStatusWeight = (status: string | undefined | null) => {
        if (!status) return 0;
        const norm = status.trim().toLowerCase().replace(/\s+/g, '_');
        if (norm === 'applied') return 1;
        if (norm === 'skipped') return 2;
        return 0; // to_apply, not_applied, or any other value defaults to top
      };
      return getStatusWeight(a.status) - getStatusWeight(b.status);
    });
  }, [dateFilteredJobs, activeTab, debouncedSearchTerm]);



  const onOpenAddModal = (mode: 'manual' | 'capture') => {
    setAddModalMode(mode);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <SyncProgressBar
        syncProgress={syncProgress}
        activeError={activeError}
        onCloseError={() => setActiveError(null)}
      />
      <CsvSyncSection
        viewMode={viewMode}
        setViewMode={setViewMode}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        fetching={fetching}
        handleSyncJobs={handleSyncJobs}
        handleImportCSVFile={handleImportCSVFile}
        onExportCSV={() => exportToExcel(dateFilteredJobs, activeProfileToUse?.full_name || activeProfileToUse?.name)}
        onOpenAddModal={onOpenAddModal}
        onClearJobs={handleClearAllJobs}
        onExportMergeUniversal={(file) => exportMergeUniversal(file, activeProfileToUse?.full_name || activeProfileToUse?.name || 'Default_Profile', dateFilteredJobs)}
        onImportUniversalVault={importUniversalVault}
        vaultProfiles={useMemo(() => {
          const activeSanitized = sanitizeProfileName(activeProfileToUse?.full_name || activeProfileToUse?.name).toLowerCase();
          return vaultProfiles.filter(p => {
            const sanitizedP = sanitizeProfileName(p).toLowerCase();
            return sanitizedP !== activeSanitized;
          });
        }, [vaultProfiles, activeProfileToUse])}
        selectedVaultProfile={selectedVaultProfile}
        setSelectedVaultProfile={setSelectedVaultProfile}
        googleWebAppUrl={googleWebAppUrl}
        setGoogleWebAppUrl={setGoogleWebAppUrl}
        onExportMergeGoogleSheet={() => exportMergeGoogleSheet(googleWebAppUrl, activeProfileToUse?.full_name || activeProfileToUse?.name || 'Default_Profile', dateFilteredJobs)}
        sheetTabNames={sheetTabs.map(t => t.name)}
        selectedSheetIdx={selectedSheetIdx}
        onSheetTabChange={handleSheetTabChange}
        autoConfirmEnabled={autoConfirmEnabled}
        autoConfirmDuration={autoConfirmDuration}
        onToggleAutoConfirm={handleToggleAutoConfirm}
        onDurationChange={handleDurationChange}
        isMergingSheet={isMergingSheet}
      />

      <div className="grid grid-cols-4 gap-2">
        <div className="py-2.5 px-2 bg-carbon border border-graphite rounded-xl text-center">
          <div className="text-[8px] font-black text-ash uppercase tracking-widest mb-0.5">Total</div>
          <div className="text-sm font-semibold text-paper">{stats.total}</div>
        </div>
        <div className="py-2.5 px-2 bg-carbon border border-graphite rounded-xl text-center">
          <div className="text-[8px] font-black text-ash uppercase tracking-widest mb-0.5">To Apply</div>
          <div className="text-sm font-semibold text-mist">{stats.notApplied}</div>
        </div>
        <div className="py-2.5 px-2 bg-carbon border border-graphite rounded-xl text-center">
          <div className="text-[8px] font-black text-pulse-green uppercase tracking-widest mb-0.5">Applied</div>
          <div className="text-sm font-semibold text-pulse-green">{stats.applied}</div>
        </div>
        <div className="py-2.5 px-2 bg-carbon border border-graphite rounded-xl text-center">
          <div className="text-[8px] font-black text-coral-red uppercase tracking-widest mb-0.5">Skipped</div>
          <div className="text-sm font-semibold text-coral-red">{stats.skipped}</div>
        </div>
      </div>

      <CountdownBanner
        pendingConfirmJob={pendingConfirmJob}
        countdown={countdown}
        isTimerPaused={isTimerPaused}
        setIsTimerPaused={setIsTimerPaused}
        handleConfirmApplied={handleConfirmApplied}
        pendingCount={pendingCount}
        handleResolveAllPendingConfirmations={handleResolveAllPendingConfirmations}
        handleDismissAllPendingConfirmations={handleDismissAllPendingConfirmations}
      />

      <JobFilters
        viewMode={viewMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />



      {filteredJobs.length > 0 && (
        <div className="text-[9px] font-bold text-ash uppercase tracking-wider px-1 text-right mb-1 select-none">
          Showing {visibleRange.start + 1}–{Math.min(visibleRange.stop + 1, filteredJobs.length)} of {filteredJobs.length} jobs
        </div>
      )}

      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="py-12 border border-dashed border-graphite rounded-md flex flex-col items-center justify-center">
            <Briefcase className="w-8 h-8 mb-3 text-graphite" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ash text-center px-4">
              {displayedJobs.length === 0 
                ? (selectedVaultProfile
                  ? 'No applications found for this profile.'
                  : (viewMode === 'local' 
                    ? 'No local applications saved yet. Click "Save Tab" to track one.' 
                    : 'No jobs found. Click "Refresh Jobs" to fetch.'))
                : 'No matching jobs found.'}
            </p>
          </div>
        ) : (
          <VirtualizedJobList
            jobs={filteredJobs}
            layoutMode={layoutMode}
            viewMode={viewMode}
            selectedVaultProfile={selectedVaultProfile}
            selectedSheetIdx={selectedSheetIdx}
            onApply={handleApply}
            onDelete={selectedVaultProfile ? localDb.deleteVaultJob : localDb.deleteJob}
            onUpdateStatus={handleUpdateStatus}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => setVisibleRange({ start: visibleStartIndex, stop: visibleStopIndex })}
          />
        )}
      </div>

      <ManualJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={localDb.loadJobs}
        mode={addModalMode}
      />

      <ConfirmAppliedModal
        isOpen={showConfirmModal}
        onClose={() => handleConfirmApplied(false)}
        pendingJob={pendingConfirmJob}
        onConfirm={handleConfirmApplied}
      />

      <WipeConfirmationModal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        onConfirmWipeOnly={handleConfirmedWipeOnly}
        onExportMergeUniversal={async (file, onDownload) => {
          await exportMergeUniversal(file, activeProfileToUse?.full_name || activeProfileToUse?.name || 'Default_Profile', localJobs, onDownload);
        }}
        onExportCSV={async (onDownload) => {
          await exportToExcel(localJobs, activeProfileToUse?.full_name || activeProfileToUse?.name, onDownload);
        }}
      />
    </div>
  );
};
