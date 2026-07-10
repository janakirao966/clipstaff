import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Job } from '../types';
import { Button } from './ui';
import { Modal } from './ui/Modal';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useJobsDb } from '../hooks/useJobsDb';
import { clearAllJobs } from '../lib/db';
import { isValidJobUrl, extractCompanyFromUrl, extractRoleFromUrl, getJobId } from '../lib/extractor';
import { getSpreadsheetExportUrl, getSpreadsheetXlsxExportUrl, exportToExcel, worksheetToRows, parseRowsToJobs, parseCSV } from '../lib/csvHelper';
import { JobTableRow } from './jobs/JobTableRow';
import { JobFilters } from './jobs/JobFilters';
import { CsvSyncSection } from './jobs/CsvSyncSection';

interface SheetTab {
  name: string;
  jobs: Job[];
}

// Helper: fetch a URL via background script
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

  const {
    jobs: localJobs,
    vaultProfiles,
    selectedVaultProfile,
    setSelectedVaultProfile,
    vaultJobs,
    importUniversalVault,
    exportMergeUniversal,
    exportMergeGoogleSheet
  } = localDb;
  
  const [viewMode, setViewMode] = useState<'sheet' | 'local'>('local');
  const [urlInput, setUrlInput] = useState(spreadsheetUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'not_applied' | 'applied' | 'skipped'>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [pendingConfirmJob, setPendingConfirmJob] = useState<Job | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Manual Add Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [companyInput, setCompanyInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [jobUrlInput, setJobUrlInput] = useState('');

  // Pagination page size state
  const [pageSize, setPageSize] = useState(50);
  const autoSyncedRef = useRef(false);



  // Reset pagination when filter tabs or selected vault profiles change
  useEffect(() => {
    setPageSize(50);
  }, [activeTab, selectedVaultProfile]);

  // Sync state if store updates from options
  useEffect(() => {
    setUrlInput(spreadsheetUrl);
  }, [spreadsheetUrl]);

  // Prevent viewing the current profile's data as a vault tab
  useEffect(() => {
    if (selectedVaultProfile && activeProfile?.full_name) {
      const activeSanitized = activeProfile.full_name
        .replace(/[\\\/?:*\[\]]/g, '_')
        .slice(0, 31)
        .trim()
        .toLowerCase();
      const selectedSanitized = selectedVaultProfile
        .replace(/[\\\/?:*\[\]]/g, '_')
        .slice(0, 31)
        .trim()
        .toLowerCase();
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
    const loadingToast = toast.loading('Fetching spreadsheet...');
    setSpreadsheetUrl(targetUrl);

    try {
      // Try XLSX export first (gets all sheets at once)
      const xlsxResponse = await fetchViaBackground(xlsxUrl, true);

      if (xlsxResponse.success && xlsxResponse.data) {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(xlsxResponse.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse XLSX with ExcelJS
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(bytes.buffer);

        // Get visible worksheets (skip hidden/meta sheets)
        const validSheets = workbook.worksheets.filter(
          (s: any) => s.state !== 'hidden' && s.name !== '__meta__'
        );

        if (validSheets.length === 0) {
          throw new Error('Spreadsheet has no visible worksheets.');
        }

        const currentJobs = useStore.getState().jobs;

        if (validSheets.length === 1) {
          // Single sheet — existing behavior
          setSheetTabs([]);
          setSelectedSheetIdx(0);
          const rows = worksheetToRows(validSheets[0]);
          const parsedJobs = parseRowsToJobs(rows, currentJobs);
          setJobs(parsedJobs);
          toast.dismiss(loadingToast);
          toast.success('Refresh Complete', {
            description: `Loaded ${parsedJobs.length} job application links.`
          });
        } else {
          // Multiple sheets — multi-tab mode
          const tabs: SheetTab[] = validSheets.map((sheet: any) => {
            const rows = worksheetToRows(sheet);
            const sheetJobs = parseRowsToJobs(rows);
            return { name: sheet.name, jobs: sheetJobs };
          });

          // Auto-select the user's own sheet if it matches activeProfile name
          let defaultIdx = 0;
          if (activeProfile?.full_name) {
            const profileNameLower = activeProfile.full_name
              .replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase();
            const matchIdx = tabs.findIndex(t => 
              t.name.replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase() === profileNameLower
            );
            if (matchIdx !== -1) defaultIdx = matchIdx;
          }

          setSheetTabs(tabs);
          setSelectedSheetIdx(defaultIdx);
          setJobs(tabs[defaultIdx].jobs);
          toast.dismiss(loadingToast);
          toast.success('Refresh Complete', {
            description: `Found ${tabs.length} profile sheets. Showing "${tabs[defaultIdx].name}" with ${tabs[defaultIdx].jobs.length} links.`
          });
        }
      } else {
        // XLSX export failed — fallback to CSV (single sheet only)
        console.warn('XLSX fetch failed, falling back to CSV:', xlsxResponse.error);
        toast.warning('Multi-tab sync failed', {
          description: `Could not fetch sheets structure (${xlsxResponse.error || 'unknown error'}). Falling back to single-sheet CSV.`
        });
        const csvExportUrl = getSpreadsheetExportUrl(targetUrl);
        if (!csvExportUrl) throw new Error('Could not build export URL.');

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
        setJobs(parsedJobs);
        toast.dismiss(loadingToast);
        toast.success('Refresh Complete', {
          description: `Loaded ${parsedJobs.length} job application links.`
        });
      }

      setShowSettings(false);
    } catch (err: any) {
      console.error('Spreadsheet refresh error:', err);
      toast.dismiss(loadingToast);
      toast.error('Refresh Failed', {
        description: err.message || 'Make sure the sheet is shared and anyone with the link can view.'
      });
    } finally {
      setFetching(false);
    }
  }, [setSpreadsheetUrl, setJobs, activeProfile]);

  const handleSyncJobs = useCallback(() => {
    syncJobs(urlInput);
  }, [syncJobs, urlInput]);

  // Handle switching sheet tabs
  const handleSheetTabChange = useCallback((idx: number) => {
    setSelectedSheetIdx(idx);
    if (sheetTabs[idx]) {
      setJobs(sheetTabs[idx].jobs);
    }
  }, [sheetTabs, setJobs]);

  // Auto-sync on first mount if we have a spreadsheet URL and no jobs
  useEffect(() => {
    if (spreadsheetUrl && jobs.length === 0 && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      syncJobs(spreadsheetUrl);
    }
  }, [spreadsheetUrl, jobs.length, syncJobs]);

  // Handle clicking the Apply button
  const handleApply = (job: Job) => {
    window.open(job.url, '_blank', 'noopener,noreferrer');
    
    if (job.status === 'not_applied') {
      setPendingConfirmJob(job);
      toast.info('Link Opened', {
        description: `Confirm status once you return.`
      });
    } else {
      toast.success('Link Opened', {
        description: `Viewing job at ${job.company}.`
      });
    }
  };

  const handleConfirmApplied = async (applied: boolean) => {
    if (pendingConfirmJob) {
      const isVaultJob = !!selectedVaultProfile;

      if (applied) {
        if (isVaultJob) {
          // Copy vault job into local profile's database with status 'applied'
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
    setShowConfirmModal(false);
    setPendingConfirmJob(null);
  };

  const handleCaptureCurrentTab = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      toast.error('Capture Failed', {
        description: 'Not in a Chrome Extension context.'
      });
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        toast.error('Capture Failed', {
          description: 'No active tab detected.'
        });
        return;
      }

      if (!isValidJobUrl(tab.url)) {
        toast.error('Not a Job Page', {
          description: 'Saving is restricted for system, communication, search, or social feeds (Gmail, WhatsApp, Google Search, etc.).'
        });
        return;
      }

      setJobUrlInput(tab.url);

      // Extract fallbacks from URL
      const parsedCompany = extractCompanyFromUrl(tab.url);
      const parsedRole = extractRoleFromUrl(tab.url);

      // Execute content scraping script inside the active tab DOM
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const metadata = { title: '', company: '' };
          try {
            // 1. JSON-LD JobPosting schema extraction
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              try {
                const json = JSON.parse(script.textContent || '');
                const objects = Array.isArray(json) ? json : [json];
                for (const obj of objects) {
                  const type = obj['@type'] || obj['type'];
                  if (type === 'JobPosting') {
                    if (obj.title) metadata.title = obj.title;
                    if (obj.hiringOrganization) {
                      if (typeof obj.hiringOrganization === 'string') {
                        metadata.company = obj.hiringOrganization;
                      } else if (obj.hiringOrganization.name) {
                        metadata.company = obj.hiringOrganization.name;
                      }
                    }
                    break;
                  }
                }
              } catch (e) {}
              if (metadata.title && metadata.company) break;
            }

            // 2. OpenGraph Meta Tags
            if (!metadata.title) {
              const ogTitle = document.querySelector('meta[property="og:title"]');
              const twitterTitle = document.querySelector('meta[name="twitter:title"]');
              const metaTitle = document.querySelector('meta[name="title"]');
              metadata.title = ogTitle?.getAttribute('content') || 
                               twitterTitle?.getAttribute('content') || 
                               metaTitle?.getAttribute('content') || '';
            }

            if (!metadata.company) {
              const ogSiteName = document.querySelector('meta[property="og:site_name"]');
              const twitterSite = document.querySelector('meta[name="twitter:site"]');
              metadata.company = ogSiteName?.getAttribute('content') || 
                                twitterSite?.getAttribute('content') || '';
            }

            // 3. Fallback H1 Header Tag
            if (!metadata.title) {
              const h1 = document.querySelector('h1');
              if (h1) metadata.title = h1.textContent?.trim() || '';
            }
          } catch (e) {}
          return metadata;
        }
      }, (results) => {
        const scraped = results?.[0]?.result;

        // Apply Scraped Company or fall back to URL extraction
        if (scraped?.company?.trim()) {
          setCompanyInput(scraped.company.trim());
        } else {
          setCompanyInput(parsedCompany);
        }

        // Apply Scraped Role or fall back to URL extraction / Title splitting
        let finalRole = '';
        if (scraped?.title?.trim()) {
          finalRole = scraped.title.trim();
        } else if (parsedRole !== 'Job Opportunity') {
          finalRole = parsedRole;
        } else if (tab.title) {
          // Clean tab title
          let cleanTitle = tab.title;
          const delimiters = [' | ', ' - ', ' – ', ' at '];
          for (const delim of delimiters) {
            if (cleanTitle.includes(delim)) {
              cleanTitle = cleanTitle.split(delim)[0];
            }
          }
          finalRole = cleanTitle.trim();
        } else {
          finalRole = 'Job Opportunity';
        }

        setRoleInput(finalRole);
        setShowAddForm(true);

        const isJobUrl = !['chrome:', 'chrome-extension:', 'about:', 'file:'].includes(new URL(tab.url!).protocol);
        if (isJobUrl) {
          toast.success('Captured Tab Details', {
            description: 'Successfully scraped details from active page content.'
          });
        } else {
          toast.warning('Not a Job Page', {
            description: 'This URL does not look like a standard job application, but you can still customize and save it.'
          });
        }
      });

    } catch (err: any) {
      console.error('Failed to capture tab details:', err);
      toast.error('Capture Failed', {
        description: 'An error occurred during tab DOM scanning.'
      });
    }
  };

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
        
        let urlIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('apply') || h.includes('website') || h.includes('href'));
        let companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && (h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm') || h.includes('name')));
        let roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && (h.includes('role') || h.includes('role/position') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation')));
        let statusIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (h.includes('status') || h.includes('stage') || h.includes('progress')));
        let dateIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && idx !== statusIdx && (h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day')));

        if (urlIdx === -1) {
          urlIdx = 2; // Default column index mapping matching our CSV schema
          companyIdx = 0;
          roleIdx = 1;
          statusIdx = 3;
          dateIdx = 4;
        }

        const parsedJobs: Job[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const url = (row[urlIdx] || '').trim();
          if (!url || (!url.startsWith('http') && !url.includes('.'))) continue;

          const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : extractCompanyFromUrl(url);
          const role = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].trim() : extractRoleFromUrl(url);
          
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
            id: getJobId(url, i),
            company,
            role,
            url,
            status,
            dateAdded
          });
        }

        if (parsedJobs.length === 0) {
          toast.error('Import Failed', { description: 'Could not parse any valid job application links.' });
          return;
        }

        await localDb.importJobs(parsedJobs);
        toast.success('Import Successful', {
          description: `Successfully loaded ${parsedJobs.length} jobs into your local database.`
        });
      } catch (err: any) {
        toast.error('Import Failed', { description: err.message || 'Error parsing CSV.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Close dropdown on click outside
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

  // Stats calculation
  const stats = useMemo(() => {
    const total = displayedJobs.length;
    const notApplied = displayedJobs.filter(j => j.status === 'not_applied').length;
    const applied = displayedJobs.filter(j => j.status === 'applied').length;
    const skipped = displayedJobs.filter(j => j.status === 'skipped').length;
    return { total, notApplied, applied, skipped };
  }, [displayedJobs]);

  // Filtered list
  const filteredJobs = useMemo(() => {
    let result = displayedJobs;

    if (activeTab === 'not_applied') {
      result = displayedJobs.filter(j => j.status === 'not_applied');
    } else if (activeTab === 'applied') {
      result = displayedJobs.filter(j => j.status === 'applied');
    } else if (activeTab === 'skipped') {
      result = displayedJobs.filter(j => j.status === 'skipped');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(j => 
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.url.toLowerCase().includes(q)
      );
    }

    return result;
  }, [displayedJobs, activeTab, searchTerm]);

  // Paginated list for performance
  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice(0, pageSize);
  }, [filteredJobs, pageSize]);

  const handleAddManualJob = async () => {
    if (!jobUrlInput) {
      toast.error('URL required');
      return;
    }

    if (!isValidJobUrl(jobUrlInput)) {
      toast.error('Not a Job Page', {
        description: 'Saving is restricted for system, communication, search, or social feeds (Gmail, WhatsApp, Google Search, etc.).'
      });
      return;
    }

    try {
      await localDb.addJob(jobUrlInput, companyInput, roleInput);
      setShowAddForm(false);
      toast.success('Job Saved', {
        description: `Added ${roleInput || 'Job'} at ${companyInput || 'Company'} to local IndexedDB.`
      });
    } catch (e: any) {
      toast.error('Save failed', { description: e.message || 'Unknown error' });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Dynamic Header & Actions Bar */}
      <CsvSyncSection
        viewMode={viewMode}
        setViewMode={setViewMode}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        fetching={fetching}
        handleSyncJobs={handleSyncJobs}
        handleImportCSVFile={handleImportCSVFile}
        onExportCSV={() => exportToExcel(displayedJobs, activeProfile?.full_name)}
        handleCaptureCurrentTab={handleCaptureCurrentTab}
        jobUrlInput={jobUrlInput}
        setJobUrlInput={setJobUrlInput}
        companyInput={companyInput}
        setCompanyInput={setCompanyInput}
        roleInput={roleInput}
        setRoleInput={setRoleInput}
        onAddJob={handleAddManualJob}
        onClearJobs={handleClearAllJobs}
        onExportMergeUniversal={(file) => exportMergeUniversal(file, activeProfile?.full_name || 'Default_Profile', localJobs)}
        onImportUniversalVault={importUniversalVault}
        vaultProfiles={useMemo(() => {
          const activeSanitized = (activeProfile?.full_name || '')
            .replace(/[\\\/?:*\[\]]/g, '_')
            .slice(0, 31)
            .trim()
            .toLowerCase();
          return vaultProfiles.filter(p => {
            const sanitizedP = p.replace(/[\\\/?:*\[\]]/g, '_').slice(0, 31).trim().toLowerCase();
            return sanitizedP !== activeSanitized;
          });
        }, [vaultProfiles, activeProfile])}
        selectedVaultProfile={selectedVaultProfile}
        setSelectedVaultProfile={setSelectedVaultProfile}
        googleWebAppUrl={googleWebAppUrl}
        setGoogleWebAppUrl={setGoogleWebAppUrl}
        onExportMergeGoogleSheet={() => exportMergeGoogleSheet(googleWebAppUrl, activeProfile?.full_name || 'Default_Profile', localJobs)}
        sheetTabNames={sheetTabs.map(t => t.name)}
        selectedSheetIdx={selectedSheetIdx}
        onSheetTabChange={handleSheetTabChange}
      />

      {/* Statistics Cards Grid */}
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

      {/* Search Input & Status Filters */}
      <JobFilters
        viewMode={viewMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Jobs List Grid */}
      <div className="space-y-4">
        <div className="grid gap-3">
          {paginatedJobs.length === 0 ? (
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
            paginatedJobs.map((job, idx) => (
              <JobTableRow
                key={job.id || idx}
                job={job}
                viewMode={viewMode}
                onDelete={localDb.deleteJob}
                onApply={handleApply}
                onUpdateStatus={viewMode === 'sheet' ? updateJobStatus : localDb.updateJobStatus}
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                isReadOnly={!!selectedVaultProfile}
                showProfileBadge={selectedVaultProfile === '__all__'}
              />
            ))
          )}
        </div>

        {/* Load More Pagination Trigger */}
        {filteredJobs.length > pageSize && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageSize(prev => prev + 50)}
              className="text-[9px] font-bold uppercase tracking-wider text-ash hover:text-mist bg-white/5 border border-graphite px-4 py-2 rounded-xl"
            >
              Load More (+50)
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => handleConfirmApplied(false)}
        title="Confirm Application Status"
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <Briefcase className="w-6 h-6 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white leading-snug">
              Did you submit your application?
            </h3>
            <p className="text-xs text-slate-400 px-2 leading-relaxed">
              We opened the link for <span className="text-white font-semibold">{pendingConfirmJob?.role}</span> at <span className="text-white font-semibold">{pendingConfirmJob?.company}</span>.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="secondary"
              onClick={() => handleConfirmApplied(false)}
              className="text-[10px] w-28 py-2.5"
            >
              No, Not Yet
            </Button>
            <Button
              variant="primary"
              onClick={() => handleConfirmApplied(true)}
              className="text-[10px] w-28 py-2.5 bg-pulse-green hover:bg-pulse-green/90 border border-pulse-green/20 text-white shadow-pulse-green/25 shadow-lg"
            >
              Yes, Applied
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
