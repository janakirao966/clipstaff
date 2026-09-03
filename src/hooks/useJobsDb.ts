import { useState, useEffect, useCallback } from 'react';
import { Job, VaultJob } from '../types';
import * as db from '../lib/db';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, normalizeUrl, sanitizeProfileName, normalizeDateStr } from '../lib/extractor';
import { checkCompanyExclusion } from '../lib/exclusionHelper';
import { parseExcelWorkbookToSheets, parseRowsToJobs } from '../lib/csvHelper';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export const useJobsDb = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Universal Vault States
  const [vaultProfiles, setVaultProfiles] = useState<string[]>([]);
  const [selectedVaultProfile, setSelectedVaultProfile] = useState<string>('');
  const [vaultJobs, setVaultJobs] = useState<VaultJob[]>([]);
  const [isMergingSheet, setIsMergingSheet] = useState(false);

  // Persist setter helper
  const updateSelectedVaultProfile = useCallback((profile: string) => {
    setSelectedVaultProfile(profile);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ lastActiveVaultProfile: profile });
    } else {
      localStorage.setItem('clipstaff_lastActiveVaultProfile', profile);
    }
  }, []);

  // Load persisted vault profile on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lastActiveVaultProfile'], (result) => {
        if (result.lastActiveVaultProfile) {
          setSelectedVaultProfile(result.lastActiveVaultProfile);
        }
      });
    } else {
      const saved = localStorage.getItem('clipstaff_lastActiveVaultProfile');
      if (saved) {
        setSelectedVaultProfile(saved);
      }
    }
  }, []);

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

  const loadVaultProfiles = useCallback(async () => {
    try {
      const list = await db.getUniversalProfiles();
      setVaultProfiles(list);
      
      // Only clear selection if the currently selected profile was removed from the vault
      // Do NOT auto-select a profile — let the user pick from the dropdown
      if (selectedVaultProfile && selectedVaultProfile !== '__all__' && !list.includes(selectedVaultProfile)) {
        updateSelectedVaultProfile('');
      }
    } catch (e) {
      console.error('Failed to load universal profiles:', e);
    }
  }, [selectedVaultProfile, updateSelectedVaultProfile]);

  const loadVaultJobs = useCallback(async () => {
    if (selectedVaultProfile) {
      try {
        if (selectedVaultProfile === '__all__') {
          const data = await db.getAllUniversalJobs();
          setVaultJobs(data);
        } else {
          const data = await db.getUniversalJobsByProfile(selectedVaultProfile);
          setVaultJobs(data);
        }
      } catch (e) {
        console.error('Failed to load universal vault jobs:', e);
        setVaultJobs([]);
      }
    } else {
      setVaultJobs([]);
    }
  }, [selectedVaultProfile]);

  // Load vault jobs whenever selected vault profile changes
  useEffect(() => {
    loadVaultJobs();
  }, [selectedVaultProfile, loadVaultJobs]);

  // Initial load vault profiles
  useEffect(() => {
    loadVaultProfiles();
  }, [loadVaultProfiles]);

  const addJob = useCallback(async (url: string, company?: string, role?: string, status: Job['status'] = 'not_applied') => {
    const normUrl = normalizeUrl(url);
    const finalCompany = company || extractCompanyFromUrl(normUrl);
    const finalRole = role || extractRoleFromUrl(normUrl);

    // Check Profile Experience & Exclusions
    const state = useStore.getState();
    const exclusion = checkCompanyExclusion({
      url: normUrl,
      companyName: finalCompany,
      profile: state.activeProfile,
      candidateExclusions: state.candidateExclusions,
      globalExclusions: state.globalExclusions
    });

    if (exclusion.isExcluded) {
      const warnMsg = exclusion.warningMessage || `⚠️ Exclusion Warning: "${exclusion.matchedCompany}" is in your experience list. Do not apply!`;
      throw new Error(warnMsg);
    }

    const id = getJobId(normUrl);
    const dateAdded = normalizeDateStr(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
    const now = Date.now();

    const jobItem: Job = {
      id,
      company: finalCompany,
      role: finalRole,
      url: normUrl,
      dateAdded,
      status,
      createdAt: now,
      updatedAt: now,
      appliedAt: status === 'applied' ? now : undefined
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
    try {
      await db.updateJobStatusByUrl(normUrl, status);
      await loadJobs();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }
  }, [loadJobs]);

  const batchUpdateJobStatuses = useCallback(async (
    jobsToUpdate: { url: string; company?: string; role?: string }[],
    status: Job['status']
  ) => {
    try {
      await db.batchUpdateJobStatuses(jobsToUpdate, status);
      await loadJobs();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
      }
    } catch (e) {
      console.error('Failed to batch update job statuses:', e);
    }
  }, [loadJobs]);

  const deleteJob = useCallback(async (id: string) => {
    console.log('[ClipStaff Hook] deleteJob called with ID:', id);
    try {
      await db.deleteJob(id);
      console.log('[ClipStaff Hook] db.deleteJob completed successfully for ID:', id);
      await loadJobs();
      toast.success('Application deleted successfully');
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
      }
    } catch (e: any) {
      console.error('[ClipStaff Hook] Failed to delete job:', e);
      toast.error('Failed to delete application', { description: e.message || String(e) });
    }
  }, [loadJobs]);

  const importJobs = useCallback(async (
    sheetJobs: Job[],
    onProgress?: (progress: { current: number; total: number; successCount: number; failedCount: number }) => void
  ) => {
    try {
      const sanitized = sheetJobs.map((job, idx) => ({ 
        ...job, 
        url: normalizeUrl(job.url),
        rowIndex: job.rowIndex !== undefined ? job.rowIndex : idx + 1
      }));
      await db.importJobsBulk(sanitized, onProgress);
      await loadJobs();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
      }
    } catch (e) {
      console.error('Failed to bulk import jobs:', e);
      throw e;
    }
  }, [loadJobs]);

  // Universal Vault Import Handler
  const importUniversalVault = useCallback(async (file: File): Promise<{ success: boolean; profiles: string[]; totalJobs: number }> => {
    const loadingToast = toast.loading('Importing Excel Vault...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sheets = await parseExcelWorkbookToSheets(arrayBuffer);

      if (sheets.length === 0) {
        throw new Error('Workbook contains no readable worksheets or rows.');
      }

      const allVaultJobs: VaultJob[] = [];
      const loadedProfileNames: string[] = [];

      for (const sheet of sheets) {
        // Parse rows to standard Job objects
        const parsedJobs = parseRowsToJobs(sheet.rows);
        if (parsedJobs.length === 0) continue;

        loadedProfileNames.push(sheet.name);

        parsedJobs.forEach((job, idx) => {
          allVaultJobs.push({
            id: `vault-${sheet.name}-${getJobId(job.url, idx + 1)}`,
            profileName: sheet.name,
            company: job.company,
            role: job.role,
            url: job.url,
            status: job.status,
            dateAdded: job.dateAdded,
            rowIndex: job.rowIndex !== undefined ? job.rowIndex : idx + 1,
            createdAt: job.createdAt || (Date.now() - (parsedJobs.length - idx) * 10),
            updatedAt: job.updatedAt || Date.now()
          });
        });
      }

      if (allVaultJobs.length === 0) {
        throw new Error('No valid job links found in the uploaded spreadsheet.');
      }

      // Overwrite database store
      await db.clearUniversalVault();
      await db.saveUniversalVaultJobs(allVaultJobs);
      
      // Refresh list of profiles
      await loadVaultProfiles();

      toast.dismiss(loadingToast);
      toast.success('Vault Loaded Successfully', {
        description: `Loaded ${loadedProfileNames.length} profile ${loadedProfileNames.length === 1 ? 'sheet' : 'sheets'} with ${allVaultJobs.length} total applications.`
      });

      return {
        success: true,
        profiles: loadedProfileNames,
        totalJobs: allVaultJobs.length
      };
    } catch (err: any) {
      console.error('Failed to import universal vault:', err);
      toast.dismiss(loadingToast);
      toast.error('Vault Load Failed', {
        description: err.message || 'Invalid or unreadable Excel file.'
      });
      return {
        success: false,
        profiles: [],
        totalJobs: 0
      };
    }
  }, [loadVaultProfiles]);

  // Universal Vault Export/Merge Handler
  const exportMergeUniversal = useCallback(async (
    existingFile: File | null, 
    profileName: string, 
    currentJobs: Job[],
    onDownloadTriggered?: (fileUrl: string, filename: string) => void
  ) => {
    const loadingToast = toast.loading('Generating universal vault...');

    try {
      // 1. Sanitize Profile/Sheet Name
      const sanitizedName = sanitizeProfileName(profileName);

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      if (existingFile) {
        const arrayBuffer = await existingFile.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
      }

      // 2. Overwrite tab (character-insensitive & case-insensitive check)
      const normalizeSheetName = (name: string) => name.toLowerCase().replace(/[-_\s]+/g, '');
      const sanitizedNameNormalized = normalizeSheetName(sanitizedName);
      
      const matchedSheet = workbook.worksheets.find(
        s => normalizeSheetName(s.name) === sanitizedNameNormalized
      );
      if (matchedSheet) {
        workbook.removeWorksheet(matchedSheet.id);
      }

      const worksheet = workbook.addWorksheet(sanitizedName);

      // 3. Define columns and Table if jobs exist
      if (currentJobs.length > 0) {
        const cleanTabName = sanitizedName.replace(/[^a-zA-Z0-9_]/g, '_');
        const uniqueTableName = `Table_${cleanTabName}_${Date.now()}`;
        
        worksheet.addTable({
          name: uniqueTableName,
          ref: 'A1',
          headerRow: true,
          totalsRow: false,
          style: {
            theme: 'TableStyleMedium2', // Slate/Blue themed table style
            showRowStripes: true,
          },
          columns: [
            { name: 'S.No.', filterButton: true },
            { name: 'Company', filterButton: true },
            { name: 'Role', filterButton: true },
            { name: 'URL', filterButton: true },
            { name: 'Status', filterButton: true },
            { name: 'Date Added', filterButton: true }
          ],
          rows: currentJobs.map((job, index) => [
            index + 1,
            job.company,
            job.role,
            job.url,
            job.status,
            job.dateAdded ? normalizeDateStr(job.dateAdded) : ''
          ])
        });
      } else {
        worksheet.columns = [
          { header: 'S.No.', key: 'sno', width: 8 },
          { header: 'Company', key: 'company', width: 25 },
          { header: 'Role', key: 'role', width: 30 },
          { header: 'URL', key: 'url', width: 45 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Date Added', key: 'dateAdded', width: 18 }
        ];
      }

      // Format headers and rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.height = 28;
          row.eachCell((cell) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF1E293B' } // Slate-800
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
          return;
        }

        row.height = 24;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } }; // Slate-700
          cell.alignment = { vertical: 'middle' };

          // Center S.No, Status, and Date columns
          if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          // Clickable URL Hyperlinks (Column 4)
          if (colNumber === 4 && cell.value) {
            const rawUrl = cell.value.toString();
            cell.value = { text: rawUrl, hyperlink: rawUrl };
            cell.font = {
              name: 'Segoe UI',
              size: 10,
              color: { argb: 'FF2563EB' }, // Blue-600
              underline: true
            };
          }

          // Color-coded Status badges (Column 5)
          if (colNumber === 5 && cell.value) {
            const val = cell.value.toString().toLowerCase();
            if (val === 'applied') {
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } }; // Green-600
              cell.value = 'Applied';
            } else if (val === 'skipped') {
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }; // Red-600
              cell.value = 'Skipped';
            } else {
              cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF64748B' } }; // Slate-500
              cell.value = 'To Apply';
            }
          }
        });
      });

      // Auto-fit column widths
      worksheet.columns.forEach((column) => {
        let maxLen = column.header ? column.header.toString().length : 10;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: false }, (cell) => {
            const val = cell.value;
            if (val) {
              const valStr = typeof val === 'object' && 'text' in val ? val.text.toString() : val.toString();
              if (valStr.length > maxLen) maxLen = valStr.length;
            }
          });
        }
        column.width = Math.min(Math.max(maxLen + 4, 12), 65);
      });

      // 5. Setup hidden metadata sheet
      let metaSheet = workbook.getWorksheet('__meta__');
      if (!metaSheet) {
        metaSheet = workbook.addWorksheet('__meta__');
      }
      metaSheet.getCell('A1').value = '1.0.0';
      metaSheet.state = 'hidden';

      // 6. Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileUrl = URL.createObjectURL(blob);
      const filename = 'Job_application_vault.xlsx';

      toast.dismiss(loadingToast);

      if (onDownloadTriggered) {
        onDownloadTriggered(fileUrl, filename);
      } else {
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', fileUrl);
        downloadLink.setAttribute('download', filename);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(fileUrl);
        toast.success('Universal Vault Exported');
      }
    } catch (err: any) {
      console.error('Failed to export universal vault:', err);
      toast.dismiss(loadingToast);
      toast.error('Export Failed', { description: err.message || 'Error occurred.' });
    }
  }, []);

  const exportMergeGoogleSheet = useCallback(async (
    webAppUrl: string,
    profileName: string,
    currentJobs: Job[]
  ) => {
    if (isMergingSheet) return;
    if (!webAppUrl.trim()) {
      toast.error('Google Web App URL Required', {
        description: 'Please configure your Google Web App URL in the settings.'
      });
      return;
    }

    setIsMergingSheet(true);
    const loadingToast = toast.loading('Merging to Google Sheet...');

    try {
      // Sanitize Profile Name
      const sanitizedName = sanitizeProfileName(profileName);

      // Send to background task to make the CORS POST request with 30s timeout
      const timeoutPromise = new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: 'Google Sheet merge request timed out. Please check your web app URL and connection.' }), 30000);
      });

      const sendPromise = new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            { 
              type: 'POST_API', 
              url: webAppUrl.trim(),
              body: {
                action: 'batch_upload',
                profileName: sanitizedName,
                jobs: currentJobs.map(j => ({
                  ...j,
                  dateAdded: j.dateAdded ? normalizeDateStr(j.dateAdded) : ''
                }))
              }
            },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(res || { success: false, error: 'Empty response' });
              }
            }
          );
        } else {
          resolve({ success: false, error: 'Extension context not available' });
        }
      });

      const response = await Promise.race([sendPromise, timeoutPromise]);

      toast.dismiss(loadingToast);

      if (response.success) {
        const addedCount = response.data?.addedCount ?? 0;
        toast.success('Google Sheet Merged!', {
          description: `Successfully merged profile. Added ${addedCount} new applications to tab "${sanitizedName}".`
        });
      } else {
        throw new Error(response.error || 'Request failed');
      }
    } catch (err: any) {
      console.error('Failed to merge to Google Sheet:', err);
      toast.dismiss(loadingToast);
      toast.error('Google Sheet Merge Failed', {
        description: err.message || 'Error occurred during network request.'
      });
    } finally {
      setIsMergingSheet(false);
    }
  }, [isMergingSheet]);

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

  const deleteVaultJob = useCallback(async (id: string) => {
    console.log('[ClipStaff Hook] deleteVaultJob called with ID:', id);
    try {
      await db.deleteUniversalJobById(id);
      console.log('[ClipStaff Hook] db.deleteUniversalJobById completed successfully for ID:', id);
      await loadVaultJobs();
      await loadVaultProfiles();
      toast.success('Vault application deleted successfully');
    } catch (e) {
      console.error('[ClipStaff Hook] Failed to delete universal vault job:', e);
      toast.error('Failed to delete job from vault');
    }
  }, [loadVaultJobs, loadVaultProfiles]);

  const updateVaultJobStatus = useCallback(async (url: string, status: Job['status']) => {
    try {
      await db.updateUniversalJobStatusByUrl(url, status);
      await loadVaultJobs();
    } catch (e) {
      console.error('Failed to update universal vault job status:', e);
      toast.error('Failed to update job status in vault');
    }
  }, [loadVaultJobs]);

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
    batchUpdateJobStatuses,
    deleteJob,
    importJobs,
    getActiveTabInfo,
    
    // Universal Vault Hook exports
    vaultProfiles,
    selectedVaultProfile,
    setSelectedVaultProfile: updateSelectedVaultProfile,
    vaultJobs,
    importUniversalVault,
    exportMergeUniversal,
    exportMergeGoogleSheet,
    isMergingSheet,
    deleteVaultJob,
    updateVaultJobStatus
  };
};
