import { useEffect, useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { Job } from '../types';
import { Button } from './ui';
import { Modal } from './ui/Modal';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useJobsDb } from '../hooks/useJobsDb';
import { clearAllJobs } from '../lib/db';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId } from '../lib/extractor';
import { parseCSV, getSpreadsheetExportUrl, exportToCSV } from '../lib/csvHelper';
import { JobTableRow } from './jobs/JobTableRow';
import { JobFilters } from './jobs/JobFilters';
import { CsvSyncSection } from './jobs/CsvSyncSection';

export const JobList = () => {
  const { spreadsheetUrl, setSpreadsheetUrl, jobs, setJobs, updateJobStatus } = useStore();
  const localDb = useJobsDb();
  
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

  // Sync state if store updates from options
  useEffect(() => {
    setUrlInput(spreadsheetUrl);
  }, [spreadsheetUrl]);

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

  // Fetch and Sync Job List from Google Sheet
  const handleSyncJobs = useCallback(async () => {
    const exportUrl = getSpreadsheetExportUrl(urlInput);
    if (!exportUrl) {
      toast.error('Invalid URL', {
        description: 'Please provide a valid Google Sheets URL.'
      });
      return;
    }

    setFetching(true);
    const loadingToast = toast.loading('Syncing job links from spreadsheet...');

    try {
      // Save the sheet URL in the store
      setSpreadsheetUrl(urlInput);

      // Perform fetch via background script to bypass webpage CSP/CORS
      const response = await new Promise<{ success: boolean; data?: string; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'FETCH_SPREADSHEET', url: exportUrl },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { success: false, error: 'Empty background response.' });
            }
          }
        );
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch spreadsheet from background.');
      }

      const csvText = response.data || '';
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        throw new Error('Spreadsheet is empty.');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      
      // Dynamic Column Detection
      let urlIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('apply') || h.includes('website') || h.includes('href'));
      const companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && (h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm') || h.includes('name')));
      const roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && (h.includes('role') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation')));
      const dateIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day')));

      // Fallbacks if columns are not found
      if (urlIdx === -1 && rows.length > 1) {
        const firstDataRow = rows[1];
        for (let col = 0; col < firstDataRow.length; col++) {
          const val = firstDataRow[col] || '';
          if (val.startsWith('http://') || val.startsWith('https://')) {
            urlIdx = col;
            break;
          }
        }
      }

      if (urlIdx === -1) urlIdx = 0;

      const parsedJobs: Job[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const url = (row[urlIdx] || '').trim();
        if (!url || (!url.startsWith('http') && !url.includes('.'))) continue;

        let company = '';
        if (companyIdx !== -1 && companyIdx !== urlIdx) {
          company = (row[companyIdx] || '').trim();
        }
        if (!company || company.startsWith('http')) {
          company = extractCompanyFromUrl(url);
        }

        let role = '';
        if (roleIdx !== -1 && roleIdx !== urlIdx) {
          role = (row[roleIdx] || '').trim();
        }
        if (!role || role === 'Job Opportunity') {
          role = extractRoleFromUrl(url);
        }

        const dateAdded = dateIdx !== -1 && dateIdx !== urlIdx && dateIdx !== companyIdx && dateIdx !== roleIdx
          ? (row[dateIdx] || '').trim() 
          : undefined;

        // Check if job already exists in our local store
        const existingJob = jobs.find(j => j.url === url);
        const status = existingJob ? existingJob.status : 'not_applied';
        const id = existingJob ? existingJob.id : getJobId(url, i);

        parsedJobs.push({
          id,
          company,
          role,
          url,
          dateAdded,
          status
        });
      }

      setJobs(parsedJobs);
      toast.dismiss(loadingToast);
      toast.success('Sync Complete', {
        description: `Successfully loaded ${parsedJobs.length} job application links.`
      });
      setShowSettings(false);
    } catch (err: any) {
      console.error('Spreadsheet sync error:', err);
      toast.dismiss(loadingToast);
      toast.error('Sync Failed', {
        description: err.message || 'Make sure the sheet is shared and anyone with the link can view.'
      });
    } finally {
      setFetching(false);
    }
  }, [urlInput, setSpreadsheetUrl, jobs, setJobs]);

  // Auto-sync on first mount if we have a spreadsheet URL and no jobs
  useEffect(() => {
    if (spreadsheetUrl && jobs.length === 0) {
      handleSyncJobs();
    }
  }, [spreadsheetUrl, jobs.length, handleSyncJobs]);

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

  const handleConfirmApplied = (applied: boolean) => {
    if (pendingConfirmJob) {
      if (applied) {
        if (viewMode === 'sheet') {
          updateJobStatus(pendingConfirmJob.url, 'applied');
        } else {
          localDb.updateJobStatus(pendingConfirmJob.url, 'applied');
        }
        toast.success('Applied!', {
          description: `Status updated to Applied for ${pendingConfirmJob.company}.`
        });
      } else {
        toast.info('Status Unchanged', {
          description: `Kept status as To Apply for ${pendingConfirmJob.company}.`
        });
      }
    }
    setShowConfirmModal(false);
    setPendingConfirmJob(null);
  };

  const handleCaptureCurrentTab = async () => {
    const tabInfo = await localDb.getActiveTabInfo();
    if (tabInfo) {
      const isJobUrl = (tabInfo.url && !['chrome:', 'chrome-extension:', 'about:', 'file:'].includes(new URL(tabInfo.url).protocol));
      
      setJobUrlInput(tabInfo.url);
      setCompanyInput(extractCompanyFromUrl(tabInfo.url));
      
      const role = extractRoleFromUrl(tabInfo.url);
      if (role === 'Job Opportunity' && tabInfo.title) {
        let cleanTitle = tabInfo.title;
        const delimiters = [' | ', ' - ', ' – ', ' at '];
        for (const delim of delimiters) {
          if (cleanTitle.includes(delim)) {
            cleanTitle = cleanTitle.split(delim)[0];
          }
        }
        setRoleInput(cleanTitle.trim());
      } else {
        setRoleInput(role);
      }
      setShowAddForm(true);

      if (isJobUrl) {
        toast.success('Captured Tab Details', {
          description: 'Review details and click Save.'
        });
      } else {
        toast.warning('Not a Job Page', {
          description: 'This URL does not look like a standard job application, but you can still customize and save it.'
        });
      }
    } else {
      toast.error('Capture Failed', {
        description: 'Could not detect active tab URL. Try opening a valid job page.'
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

  const handleClearAllJobs = async () => {
    if (window.confirm("Are you sure you want to clear ALL saved jobs from your local database? This cannot be undone.")) {
      try {
        await clearAllJobs();
        await localDb.loadJobs();
        toast.success("Local database cleared");
      } catch (err: any) {
        toast.error("Failed to clear database", { description: err.message });
      }
    }
  };

  const displayedJobs = viewMode === 'sheet' ? jobs : localDb.jobs;

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

  const handleAddManualJob = async () => {
    if (!jobUrlInput) {
      toast.error('URL required');
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
        onExportCSV={() => exportToCSV(displayedJobs)}
        handleCaptureCurrentTab={handleCaptureCurrentTab}
        jobUrlInput={jobUrlInput}
        setJobUrlInput={setJobUrlInput}
        companyInput={companyInput}
        setCompanyInput={setCompanyInput}
        roleInput={roleInput}
        setRoleInput={setRoleInput}
        onAddJob={handleAddManualJob}
        onClearJobs={handleClearAllJobs}
      />

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-4 gap-2.5">
        <div className="p-3 bg-carbon border border-graphite rounded-md text-center">
          <div className="text-[9px] font-bold text-ash uppercase tracking-wider mb-0.5">Total</div>
          <div className="text-sm font-semibold text-paper">{stats.total}</div>
        </div>
        <div className="p-3 bg-carbon border border-graphite rounded-md text-center">
          <div className="text-[9px] font-bold text-ash uppercase tracking-wider mb-0.5">To Apply</div>
          <div className="text-sm font-semibold text-mist">{stats.notApplied}</div>
        </div>
        <div className="p-3 bg-carbon border border-graphite rounded-md text-center">
          <div className="text-[9px] font-bold text-pulse-green uppercase tracking-wider mb-0.5">Applied</div>
          <div className="text-sm font-semibold text-pulse-green">{stats.applied}</div>
        </div>
        <div className="p-3 bg-carbon border border-graphite rounded-md text-center">
          <div className="text-[9px] font-bold text-coral-red uppercase tracking-wider mb-0.5">Skipped</div>
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
      <div className="grid gap-3">
        {filteredJobs.length === 0 ? (
          <div className="py-12 border border-dashed border-graphite rounded-md flex flex-col items-center justify-center">
            <Briefcase className="w-8 h-8 mb-3 text-graphite" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ash text-center px-4">
              {displayedJobs.length === 0 
                ? (viewMode === 'local' 
                  ? 'No local applications saved yet. Click "Save Tab" to track one.' 
                  : 'No jobs synced. Click "Sync Jobs" to fetch.')
                : 'No matching jobs found.'}
            </p>
          </div>
        ) : (
          filteredJobs.map((job, idx) => (
            <JobTableRow
              key={job.id || idx}
              job={job}
              viewMode={viewMode}
              onDelete={localDb.deleteJob}
              onApply={handleApply}
              onUpdateStatus={viewMode === 'sheet' ? updateJobStatus : localDb.updateJobStatus}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
            />
          ))
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
              className="text-[10px] w-28 py-2.5 bg-green-500 hover:bg-green-400 border border-green-500/20 text-white shadow-green-500/25 shadow-lg"
            >
              Yes, Applied
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
