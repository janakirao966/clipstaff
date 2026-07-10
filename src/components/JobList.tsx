import { useEffect, useState, useMemo, useCallback, useTransition, useRef } from 'react';
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
import { normalizeUrl, getJobId, extractCompanyFromUrl, extractRoleFromUrl, sanitizeProfileName } from '../lib/extractor';

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
  const { spreadsheetUrl, setSpreadsheetUrl, googleWebAppUrl, setGoogleWebAppUrl, jobs, setJobs, updateJobStatus, activeProfile, sheetTabs, setSheetTabs, selectedSheetIdx, setSelectedSheetIdx } = useStore();
  const localDb = useJobsDb();
  const [, startTransition] = useTransition();
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [pendingConfirmJob, setPendingConfirmJob] = useState<Job | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Manual Add Form Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'manual' | 'capture'>('manual');

  const [layoutMode, setLayoutMode] = useState<'cards' | 'table'>('cards');
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
    if (selectedVaultProfile && activeProfile?.name) {
      const activeSanitized = sanitizeProfileName(activeProfile.name).toLowerCase();
      const selectedSanitized = sanitizeProfileName(selectedVaultProfile).toLowerCase();
      if (activeSanitized === selectedSanitized) {
        setSelectedVaultProfile('');
      }
    }
  }, [selectedVaultProfile, activeProfile, setSelectedVaultProfile]);

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

          const ownProfileNameLower = activeProfile?.name
            ? activeProfile.name.replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase()
            : '';

          let validSheets = workbook.worksheets.filter(
            (s: any) => s.state !== 'hidden' && s.name !== '__meta__'
          );

          if (validSheets.length > 0) {
            // Exclude own sheet from vault tabs if there are other sheets
            if (ownProfileNameLower && validSheets.length > 1) {
              const filtered = validSheets.filter((s: any) => {
                const sheetNameLower = s.name.replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase();
                return sheetNameLower !== ownProfileNameLower;
              });
              if (filtered.length > 0) {
                validSheets = filtered;
              }
            }

            const currentJobs = useStore.getState().jobs;

            if (validSheets.length === 1) {
              setSheetTabs([]);
              setSelectedSheetIdx(0);
              const rows = worksheetToRows(validSheets[0]);
              const parsedJobs = parseRowsToJobs(rows, currentJobs);
              
              setSyncProgress({ current: 80, total: 100, stage: 'Importing jobs to vault...' });
              await localDb.importJobs(parsedJobs);
              
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
              if (activeProfile?.name) {
                const profileNameLower = activeProfile.name
                  .replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase();
                const matchIdx = tabs.findIndex(t => 
                  t.name.replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase() === profileNameLower
                );
                if (matchIdx !== -1) defaultIdx = matchIdx;
              }

              setSheetTabs(tabs);
              setSelectedSheetIdx(defaultIdx);
              
              setSyncProgress({ current: 85, total: 100, stage: 'Importing default profile...' });
              await localDb.importJobs(tabs[defaultIdx].jobs);
              
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
    window.open(job.url, '_blank', 'noopener,noreferrer');
    
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
          toast.success('Applied!', {
            description: `Status updated to Applied for ${pendingConfirmJob.company}.`
          });
        } else {
          localDb.updateJobStatus(pendingConfirmJob.url, 'applied');
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

          const dateAdded = dateIdx !== -1 && row[dateIdx] 
            ? row[dateIdx].trim() 
            : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

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
    toast('Wipe all saved jobs?', {
      description: 'This will permanently delete ALL applications from your local database.',
      duration: 8000,
      action: {
        label: 'Confirm Wipe',
        onClick: async () => {
          try {
            await clearAllJobs();
            await localDb.loadJobs();
            toast.success('Local database cleared');
          } catch (err: any) {
            toast.error('Failed to clear database', { description: err.message });
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  const displayedJobs = viewMode === 'sheet' 
    ? jobs 
    : (selectedVaultProfile ? (vaultJobs as any[]) : localJobs);

  const stats = useMemo(() => {
    const total = displayedJobs.length;
    const notApplied = displayedJobs.filter(j => j.status === 'not_applied').length;
    const applied = displayedJobs.filter(j => j.status === 'applied').length;
    const skipped = displayedJobs.filter(j => j.status === 'skipped').length;
    return { total, notApplied, applied, skipped };
  }, [displayedJobs]);

  const filteredJobs = useMemo(() => {
    let result = displayedJobs;

    if (activeTab === 'not_applied') {
      result = displayedJobs.filter(j => j.status === 'not_applied');
    } else if (activeTab === 'applied') {
      result = displayedJobs.filter(j => j.status === 'applied');
    } else if (activeTab === 'skipped') {
      result = displayedJobs.filter(j => j.status === 'skipped');
    }

    if (debouncedSearchTerm.trim()) {
      const q = debouncedSearchTerm.toLowerCase();
      result = result.filter(j => 
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.url.toLowerCase().includes(q)
      );
    }

    return result;
  }, [displayedJobs, activeTab, debouncedSearchTerm]);



  const onOpenAddModal = (mode: 'manual' | 'capture') => {
    setAddModalMode(mode);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Progress Bar */}
      {syncProgress && (
        <div className="p-4 bg-carbon border border-graphite rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-accent flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              {syncProgress.stage}
            </span>
            <span className="text-ash">
              {syncProgress.total > 0
                ? `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`
                : ''}
            </span>
          </div>
          {syncProgress.total > 0 && (
            <div className="w-full h-1.5 bg-void border border-graphite rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 rounded-full" 
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          )}
          <div className="text-[8px] text-muted text-right uppercase tracking-widest select-none">
            Processed {syncProgress.current} of {syncProgress.total} items
          </div>
        </div>
      )}

      {/* Error Recovery Advice Alert */}
      {activeError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl space-y-2 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400">{activeError.title}</h4>
              <p className="text-[9px] text-paper font-medium">{activeError.desc}</p>
            </div>
            <button 
              onClick={() => setActiveError(null)}
              className="text-ash hover:text-white text-[9px] font-bold"
            >
              Close
            </button>
          </div>
          <p className="text-[8.5px] text-ash/80 leading-normal">{activeError.advice}</p>
          <div className="flex justify-end pt-1">
            <a 
              href="https://github.com/janakirao966/clipstaff/issues/new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[8.5px] font-bold text-accent hover:underline flex items-center gap-1"
            >
              Report Bug / Ask Help
            </a>
          </div>
        </div>
      )}
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
        onExportCSV={() => exportToExcel(displayedJobs, activeProfile?.name)}
        onOpenAddModal={onOpenAddModal}
        onClearJobs={handleClearAllJobs}
        onExportMergeUniversal={(file) => exportMergeUniversal(file, activeProfile?.name || 'Default_Profile', localJobs)}
        onImportUniversalVault={importUniversalVault}
        vaultProfiles={useMemo(() => {
          const activeSanitized = sanitizeProfileName(activeProfile?.name).toLowerCase();
          return vaultProfiles.filter(p => {
            const sanitizedP = sanitizeProfileName(p).toLowerCase();
            return sanitizedP !== activeSanitized;
          });
        }, [vaultProfiles, activeProfile])}
        selectedVaultProfile={selectedVaultProfile}
        setSelectedVaultProfile={setSelectedVaultProfile}
        googleWebAppUrl={googleWebAppUrl}
        setGoogleWebAppUrl={setGoogleWebAppUrl}
        onExportMergeGoogleSheet={() => exportMergeGoogleSheet(googleWebAppUrl, activeProfile?.name || 'Default_Profile', localJobs)}
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

      {pendingConfirmJob && (
        <div className="p-3.5 bg-accent/10 border border-accent/25 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 select-none">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-[8px] font-black text-accent uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              {countdown !== null
                ? `Auto-confirming in ${countdown}s${isTimerPaused ? ' (Paused)' : ''}`
                : 'Did you apply?'}
            </h4>
            <p className="text-[10px] text-paper truncate font-semibold">
              {pendingConfirmJob.role}
            </p>
            <p className="text-[9px] text-ash truncate">
              at <span className="text-mist font-medium">{pendingConfirmJob.company}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {countdown !== null && (
              <button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[8px] text-ash hover:text-mist border border-graphite rounded-lg font-bold uppercase tracking-wider transition-all"
              >
                {isTimerPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            <button
              onClick={() => handleConfirmApplied(true)}
              className="px-2.5 py-1 bg-pulse-green/10 hover:bg-pulse-green/20 text-pulse-green border border-pulse-green/25 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleConfirmApplied(false)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-ash border border-graphite rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              No
            </button>
          </div>
        </div>
      )}

      {pendingCount > 0 && !pendingConfirmJob && (
        <div className="flex items-center gap-1.5 p-2.5 bg-accent/5 border border-accent/15 rounded-xl text-[9px] text-accent font-medium select-none animate-in fade-in duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>You have {pendingCount} application status {pendingCount === 1 ? 'confirmation' : 'confirmations'} pending.</span>
        </div>
      )}

      <JobFilters
        viewMode={viewMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={(tab) => startTransition(() => {
          setActiveTab(tab);
        })}
      />

      <div className="flex justify-end gap-1.5 px-1">
        <button
          onClick={() => setLayoutMode('cards')}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
            layoutMode === 'cards'
              ? 'bg-white/5 border-graphite text-accent'
              : 'bg-transparent border-transparent text-ash hover:text-mist hover:bg-white/5'
          }`}
        >
          Cards View
        </button>
        <button
          onClick={() => setLayoutMode('table')}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
            layoutMode === 'table'
              ? 'bg-white/5 border-graphite text-accent'
              : 'bg-transparent border-transparent text-ash hover:text-mist hover:bg-white/5'
          }`}
        >
          Spreadsheet View
        </button>
      </div>

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
            onUpdateStatus={viewMode === 'sheet' ? updateJobStatus : (selectedVaultProfile ? localDb.updateVaultJobStatus : localDb.updateJobStatus)}
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
    </div>
  );
};
