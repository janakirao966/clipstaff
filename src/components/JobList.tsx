import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Job } from '../types';
import { Button } from './ui';
import { Modal } from './ui/Modal';
import { 
  Briefcase, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check,
  ChevronDown,
  Database,
  Trash2,
  Plus,
  Bookmark,
  X,
  Download,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { useJobsDb } from '../hooks/useJobsDb';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, isValidJobUrl } from '../lib/extractor';

// Robust CSV Parser (RFC 4180 compliant)
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip LF of CRLF
        }
        row.push(cell.trim());
        result.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  
  return result.filter(r => r.some(c => c.length > 0));
}

// Convert Google Sheet edit URL to export CSV URL
const getSpreadsheetExportUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const id = match[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
};

function escapeCSVCell(val: string): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV(jobs: Job[]) {
  if (jobs.length === 0) {
    toast.error('No jobs to export.');
    return;
  }
  
  const headers = ['Company', 'Role', 'URL', 'Status', 'Date Added'];
  const rows = jobs.map(job => [
    job.company,
    job.role,
    job.url,
    job.status,
    job.dateAdded || ''
  ]);
  
  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map(row => row.map(escapeCSVCell).join(','))
  ].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `clipstaff_applications_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('CSV Export Completed');
}

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
  const handleSyncJobs = async () => {
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
      
      // Look for company column (excluding the one matched as urlIdx)
      let companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && (h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm') || h.includes('name')));
      
      // Look for role column (excluding urlIdx and companyIdx)
      let roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && (h.includes('role') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation')));
      
      let dateIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day')));

      // Fallbacks if columns are not found
      if (urlIdx === -1 && rows.length > 1) {
        // Find column with URLs in first data row
        const firstDataRow = rows[1];
        for (let col = 0; col < firstDataRow.length; col++) {
          const val = firstDataRow[col] || '';
          if (val.startsWith('http://') || val.startsWith('https://')) {
            urlIdx = col;
            break;
          }
        }
      }

      // If still no url index found, default to first column
      if (urlIdx === -1) urlIdx = 0;

      const parsedJobs: Job[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const url = (row[urlIdx] || '').trim();
        // Basic URL validation
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
  };

  // Auto-sync on first mount if we have a spreadsheet URL and no jobs
  useEffect(() => {
    if (spreadsheetUrl && jobs.length === 0) {
      handleSyncJobs();
    }
  }, []);

  // Handle clicking the Apply button
  const handleApply = (job: Job) => {
    // Open link in new tab
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
      const isJobUrl = isValidJobUrl(tabInfo.url);
      
      setJobUrlInput(tabInfo.url);
      setCompanyInput(extractCompanyFromUrl(tabInfo.url));
      
      let role = extractRoleFromUrl(tabInfo.url);
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
          // Default fallbacks
          urlIdx = 2; // In our exported CSV, URL is index 2
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
    // Reset file input value
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

  // Determine active jobs list source
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

    // Filter by status tab
    if (activeTab === 'not_applied') {
      result = displayedJobs.filter(j => j.status === 'not_applied');
    } else if (activeTab === 'applied') {
      result = displayedJobs.filter(j => j.status === 'applied');
    } else if (activeTab === 'skipped') {
      result = displayedJobs.filter(j => j.status === 'skipped');
    }

    // Filter by search term
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

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Source Selector Tab */}
      <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-graphite gap-1">
        <button
          onClick={() => setViewMode('local')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
            viewMode === 'local'
              ? 'bg-accent text-void shadow-lg shadow-accent/15'
              : 'text-ash hover:text-mist hover:bg-white/5'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Saved Applications
        </button>
        <button
          onClick={() => setViewMode('sheet')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
            viewMode === 'sheet'
              ? 'bg-accent text-void shadow-lg shadow-accent/15'
              : 'text-ash hover:text-mist hover:bg-white/5'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Spreadsheet Sync
        </button>
      </div>

      {/* Header section with Dynamic Actions based on View Mode */}
      <div className="flex items-center justify-between px-2 gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted whitespace-nowrap">
          {viewMode === 'local' ? 'Local DB' : 'Spreadsheet'}
        </h3>
        
        <div className="flex items-center gap-1.5">
          {viewMode === 'sheet' ? (
            <>
              {jobs.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await localDb.importJobs(jobs);
                      toast.success('Import Complete', {
                        description: `Successfully imported ${jobs.length} synced jobs to local IndexedDB.`
                      });
                    } catch (e: any) {
                      toast.error('Import Failed', {
                        description: e.message || 'Could not import jobs.'
                      });
                    }
                  }}
                  className="text-[9px] px-2 text-accent hover:text-accent-light"
                >
                  Import to Local
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                icon={<Settings className="w-3.5 h-3.5" />}
                className="text-[9px] px-2"
              >
                Config Sheet
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSyncJobs}
                isLoading={fetching}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />}
                className="text-[9px] px-2.5"
              >
                Sync jobs
              </Button>
            </>
          ) : (
            <>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSVFile}
                className="hidden"
                id="csv-file-input"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => document.getElementById('csv-file-input')?.click()}
                icon={<Upload className="w-3.5 h-3.5" />}
                className="text-[9px] px-2 text-ash hover:text-mist"
                title="Import from CSV"
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => exportToCSV(localDb.jobs)}
                icon={<Download className="w-3.5 h-3.5" />}
                className="text-[9px] px-2 text-ash hover:text-mist"
                title="Export to CSV"
              >
                Export
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCaptureCurrentTab}
                icon={<Bookmark className="w-3.5 h-3.5" />}
                className="text-[9px] px-2 text-accent-light hover:text-accent"
              >
                Save Tab
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setJobUrlInput('');
                  setCompanyInput('');
                  setRoleInput('');
                  setShowAddForm(true);
                }}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="text-[9px] px-2"
              >
                Add Manual
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Spreadsheet URL Settings Panel */}
      {viewMode === 'sheet' && showSettings && (
        <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-light">Google Spreadsheet URL</h4>
            <p className="text-[9px] text-muted">Enter the shared link. Ensure Anyone with Link can View is enabled in Google Sheets.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
              className="flex-1 px-4 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleSyncJobs}
              isLoading={fetching}
              className="text-[10px]"
            >
              Save & Fetch
            </Button>
          </div>
        </div>
      )}

      {/* Local Add Form Panel */}
      {viewMode === 'local' && showAddForm && (
        <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl space-y-3.5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-light">Save Job Application URL</h4>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="p-1 rounded-md hover:bg-white/5 text-ash hover:text-mist transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Job URL</label>
              <input
                type="text"
                placeholder="https://..."
                className="w-full px-3.5 py-2 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                value={jobUrlInput}
                onChange={(e) => setJobUrlInput(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Company</label>
                <input
                  type="text"
                  placeholder="e.g. Google"
                  className="w-full px-3.5 py-2 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Role / Position</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Developer"
                  className="w-full px-3.5 py-2 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
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
              }}
            >
              Save Application
            </Button>
          </div>
        </div>
      )}

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

      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
        <input
          type="text"
          placeholder={`Search ${viewMode === 'local' ? 'saved' : 'synced'} jobs by role or company...`}
          className="w-full pl-12 pr-4 py-2.5 bg-carbon border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 border-b border-graphite pb-2">
        {(['all', 'not_applied', 'applied', 'skipped'] as const).map((tab) => {
          const labels = {
            all: 'All',
            not_applied: 'To Apply',
            applied: 'Applied',
            skipped: 'Skipped'
          };
          const colors = {
            all: activeTab === 'all' ? 'bg-white/5 border-graphite text-paper' : 'border-transparent text-ash hover:text-mist',
            not_applied: activeTab === 'not_applied' ? 'bg-white/5 border-graphite text-mist' : 'border-transparent text-ash hover:text-mist',
            applied: activeTab === 'applied' ? 'bg-pulse-green/10 border-pulse-green/20 text-pulse-green' : 'border-transparent text-ash hover:text-mist',
            skipped: activeTab === 'skipped' ? 'bg-coral-red/10 border-coral-red/20 text-coral-red' : 'border-transparent text-ash hover:text-mist'
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 border rounded-md text-[9px] font-bold uppercase tracking-wider transition-all text-center ${colors[tab]}`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Jobs List Grid */}
      <div className="grid gap-3">
        {filteredJobs.length === 0 ? (
          <div className="py-12 border border-dashed border-graphite rounded-md flex flex-col items-center justify-center">
            <Briefcase className="w-8 h-8 mb-3 text-graphite" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ash text-center px-4">
              {displayedJobs.length === 0 
                ? (viewMode === 'local' 
                  ? 'No local applications saved yet. Click "Save Current Tab" to track one.' 
                  : 'No jobs synced. Click "Sync Jobs" above to fetch.')
                : 'No matching jobs found.'}
            </p>
          </div>
        ) : (
          filteredJobs.map((job, idx) => {
            const statusConfig = {
              not_applied: { label: 'To Apply', color: 'text-ash bg-white/5 border-graphite hover:bg-white/10', icon: <Clock className="w-3 h-3" /> },
              applied: { label: 'Applied', color: 'text-pulse-green bg-pulse-green/10 border-pulse-green/20 hover:bg-pulse-green/20', icon: <CheckCircle2 className="w-3 h-3" /> },
              skipped: { label: 'Skipped', color: 'text-coral-red bg-coral-red/10 border-coral-red/20 hover:bg-coral-red/20', icon: <XCircle className="w-3 h-3 text-coral-red" /> }
            };

            const config = statusConfig[job.status];

            return (
              <div 
                key={job.id || idx}
                className="group p-4 bg-carbon border border-graphite rounded-md hover:border-smoke hover:bg-obsidian hover:-translate-y-0.5 duration-150 transition-all flex flex-col gap-3 relative overflow-hidden"
              >
                {/* Top Row: Job details */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-paper tracking-wide truncate">{job.role}</h4>
                    <p className="text-[10px] font-medium text-ash mt-0.5 truncate">{job.company}</p>
                    {job.dateAdded && (
                      <span className="inline-block text-[8px] font-mono font-semibold text-fog uppercase tracking-widest mt-1">
                        Added: {job.dateAdded}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Delete button (only in Local database view) */}
                    {viewMode === 'local' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          localDb.deleteJob(job.id);
                          toast.success('Job Deleted', {
                            description: `Removed ${job.role} at ${job.company}.`
                          });
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-ash hover:text-red-500 active:scale-95 duration-150 transition-all"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApply(job)}
                      className={`px-3.5 py-1.5 rounded-md active:scale-95 duration-150 transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider border ${
                        job.status === 'applied'
                          ? 'bg-pulse-green/10 hover:bg-pulse-green/20 text-pulse-green border-pulse-green/20'
                          : job.status === 'skipped'
                          ? 'bg-coral-red/10 hover:bg-coral-red/20 text-coral-red border-coral-red/20'
                          : 'bg-accent/10 hover:bg-accent/20 text-accent border-accent/20'
                      }`}
                      title={
                        job.status === 'applied'
                          ? "Applied - Click to open link again"
                          : job.status === 'skipped'
                          ? "Skipped - Click to open link"
                          : "Open Link & Confirm Status"
                      }
                    >
                      <span>
                        {job.status === 'applied' ? 'Applied' : job.status === 'skipped' ? 'Skipped' : 'Apply'}
                      </span>
                      {job.status === 'applied' ? (
                        <Check className="w-3 h-3" />
                      ) : job.status === 'skipped' ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <ExternalLink className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Status selector */}
                <div className="flex items-center justify-between border-t border-graphite pt-2.5 relative">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ash">Status:</span>

                  {/* Dropdown status toggler */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === job.id ? null : job.id);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider border active:scale-95 duration-150 transition-all ${config.color}`}
                    >
                      {config.icon}
                      <span>{config.label}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>

                    {activeDropdown === job.id && (
                      <div 
                        className="absolute right-0 bottom-full mb-1 w-28 bg-[#0D0D0D] border border-white/10 rounded-xl shadow-premium z-50 py-1 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(['not_applied', 'applied', 'skipped'] as const).map((status) => {
                          const optionLabel = {
                            not_applied: 'To Apply',
                            applied: 'Applied',
                            skipped: 'Skipped'
                          }[status];

                          return (
                            <button
                              key={status}
                              onClick={() => {
                                if (viewMode === 'sheet') {
                                  updateJobStatus(job.url, status);
                                } else {
                                  localDb.updateJobStatus(job.url, status);
                                }
                                setActiveDropdown(null);
                                toast.success('Status Updated', {
                                  description: `Updated status for ${job.company} to ${optionLabel}.`
                                });
                              }}
                              className={`w-full px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all flex items-center justify-between ${
                                job.status === status ? 'text-accent' : 'text-slate-300'
                              }`}
                            >
                              <span>{optionLabel}</span>
                              {job.status === status && <Check className="w-3 h-3 text-accent" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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
