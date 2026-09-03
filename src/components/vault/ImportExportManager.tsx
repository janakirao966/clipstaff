import React, { useRef, useState } from 'react';
import { Button } from '../ui';
import { 
  Upload, 
  Plus, 
  Sparkles, 
  Download, 
  ChevronDown, 
  User, 
  Layers, 
  Zap 
} from 'lucide-react';
import { toast } from 'sonner';
import { useSnippets } from '../../hooks/useSnippets';
import { useProfiles } from '../../hooks/useProfiles';
import { useStore } from '../../store/useStore';
import { 
  exportProfileBundleJSON, 
  exportSystemBackupJSON, 
  exportShortcutsJSON, 
  inspectImportJSON, 
  executeProfileImport 
} from '../../lib/profileIO';
import { getAllJobs, importJobsBulk, clearAllJobs } from '../../lib/db';
import { ImportAuditModal } from './ImportAuditModal';
import { ImportAuditReport, ImportStrategy } from '../../types';

interface ImportExportManagerProps {
  onAutofill?: () => void;
  onAddShortcut: () => void;
}

export const ImportExportManager = ({ onAutofill, onAddShortcut }: ImportExportManagerProps) => {
  const snippets = useStore(state => state.snippets);
  const activeProfile = useStore(state => state.activeProfile);
  const profiles = useStore(state => state.profiles);
  const profileTriggers = useStore(state => state.profileTriggers);
  const resumeText = useStore(state => state.resumeText);
  const setResumeText = useStore(state => state.setResumeText);
  const candidateExclusions = useStore(state => state.candidateExclusions);
  const tailoredBullets = useStore(state => state.tailoredBullets);
  const tailoredCoverLetter = useStore(state => state.tailoredCoverLetter);
  const globalExclusions = useStore(state => state.globalExclusions);
  const sectorExclusions = useStore(state => state.sectorExclusions);
  const spreadsheetUrl = useStore(state => state.spreadsheetUrl);
  const googleWebAppUrl = useStore(state => state.googleWebAppUrl);
  const setProfiles = useStore(state => state.setProfiles);
  const setActiveProfile = useStore(state => state.setActiveProfile);
  const updateProfileTrigger = useStore(state => state.updateProfileTrigger);

  const { updateSnippet, createSnippet, deleteSnippet } = useSnippets();
  const { saveProfile } = useProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import Audit Modal State
  const [auditReport, setAuditReport] = useState<ImportAuditReport | null>(null);
  const [auditFileName, setAuditFileName] = useState<string>('');
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  const handleExportProfileBundle = async () => {
    setShowExportMenu(false);
    setExporting(true);
    const toastId = toast.loading('Exporting Profile Bundle...');
    try {
      const allJobs = await getAllJobs().catch(() => []);
      const profileToExport = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);

      if (!profileToExport) {
        throw new Error('Please configure and select an active profile first.');
      }

      const candidateKey = profileToExport.name || profileToExport.full_name || 'default';
      const exclusions = candidateExclusions[candidateKey] || [];

      await exportProfileBundleJSON({
        profile: profileToExport,
        resumeText,
        profileTriggers,
        snippets,
        applications: allJobs,
        rulesAndPreferences: {
          candidateExclusions: exclusions,
          tailoredBullets,
          tailoredCoverLetter
        }
      });

      toast.dismiss(toastId);
      toast.success('Profile Exported Successfully', {
        description: `Exported profile, ${snippets.length} shortcuts, and ${allJobs.length} application records.`
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Export Failed', { description: err.message || 'Could not export profile.' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportShortcutsOnly = async () => {
    setShowExportMenu(false);
    try {
      if (snippets.length === 0) {
        toast.info('No shortcuts found in your vault.');
        return;
      }
      const targetProfile = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);
      await exportShortcutsJSON(snippets, targetProfile?.full_name || targetProfile?.name);
      toast.success(`Exported ${snippets.length} shortcuts to JSON`);
    } catch (err: any) {
      toast.error('Export Failed', { description: err.message });
    }
  };

  const handleExportFullSystem = async () => {
    setShowExportMenu(false);
    const toastId = toast.loading('Exporting full system backup...');
    try {
      const allJobs = await getAllJobs().catch(() => []);
      await exportSystemBackupJSON({
        profiles: profiles.length > 0 ? profiles : (activeProfile ? [activeProfile] : []),
        activeProfile,
        snippets,
        applications: allJobs,
        profileTriggers,
        resumeText,
        globalExclusions,
        sectorExclusions,
        candidateExclusions,
        spreadsheetUrl,
        googleWebAppUrl
      });
      toast.dismiss(toastId);
      toast.success('System Backup Exported', {
        description: `Exported ${profiles.length || 1} profile(s), ${snippets.length} shortcuts, and ${allJobs.length} applications.`
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Backup Failed', { description: err.message });
    }
  };

  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const currentJobs = await getAllJobs().catch(() => []);
        const report = inspectImportJSON(text, snippets, currentJobs);

        if (!report.isValid) {
          toast.error('Invalid JSON Format', { description: report.error });
          return;
        }

        setAuditReport(report);
        setAuditFileName(file.name);
        setShowAuditModal(true);
      } catch (err: any) {
        toast.error('Failed to parse file', { description: err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async (strategy: ImportStrategy) => {
    if (!auditReport) return;
    const toastId = toast.loading(`Importing data with ${strategy === 'merge' ? 'Merge & Sync' : 'Fresh Overwrite'}...`);

    try {
      const result = await executeProfileImport({
        report: auditReport,
        strategy,
        currentProfile: activeProfile,
        currentSnippets: snippets,
        currentTriggers: profileTriggers,
        saveProfile,
        setResumeText,
        updateProfileTrigger,
        createSnippet,
        updateSnippet,
        deleteSnippet,
        importJobsBulk,
        clearAllJobs,
        setProfiles,
        setActiveProfile
      });

      toast.dismiss(toastId);
      toast.success('Import Successful', {
        description: `Imported ${result.profileSaved ? 'profile, ' : ''}${result.snippetsImported} new / ${result.snippetsUpdated} updated shortcuts, and ${result.jobsImported} application records.`
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Import Failed', { description: err.message || 'An error occurred during import.' });
    }
  };

  return (
    <div className="flex items-center justify-between px-1 gap-2 relative">
      {onAutofill ? (
        <Button
          size="sm"
          variant="primary"
          onClick={onAutofill}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="text-[10px]"
        >
          Autofill
        </Button>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1.5 relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSelectImportFile}
          accept=".json"
          className="hidden"
        />

        {/* Export Dropdown */}
        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-[10px]"
          >
            Export <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </Button>

          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowExportMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-carbon border border-graphite rounded-xl shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleExportProfileBundle}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                >
                  <div className="p-1.5 rounded-md bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent group-hover:text-void transition-colors mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white leading-none group-hover:text-accent transition-colors">
                      Active Profile Bundle
                    </p>
                    <p className="text-[9px] text-ash leading-tight mt-1">
                      Full profile, custom shortcuts &amp; stored job applications.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportShortcutsOnly}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                >
                  <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-400 group-hover:text-void transition-colors mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white leading-none group-hover:text-amber-300 transition-colors">
                      Shortcuts Only
                    </p>
                    <p className="text-[9px] text-ash leading-tight mt-1">
                      Export active manual snippets &amp; triggers.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullSystem}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                >
                  <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-400 group-hover:text-void transition-colors mt-0.5">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white leading-none group-hover:text-blue-300 transition-colors">
                      Full System Backup
                    </p>
                    <p className="text-[9px] text-ash leading-tight mt-1">
                      All profiles, settings, exclusions &amp; global records.
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Import Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload className="w-3.5 h-3.5" />}
          className="text-[10px]"
        >
          Import
        </Button>

        {/* Add Shortcut Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddShortcut}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="text-[10px]"
        >
          Shortcut
        </Button>
      </div>

      {/* Import Audit Modal */}
      <ImportAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        report={auditReport}
        fileName={auditFileName}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
};
