import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui';
import { 
  RefreshCw, 
  Settings, 
  Database,
  Trash2,
  Plus,
  Bookmark,
  X,
  Download,
  Upload,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

interface CsvSyncSectionProps {
  viewMode: 'sheet' | 'local';
  setViewMode: (mode: 'sheet' | 'local') => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  fetching: boolean;
  handleSyncJobs: () => void;
  handleImportCSVFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onOpenAddModal: (mode: 'manual' | 'capture') => void;
  onClearJobs: () => void;

  // New Vault Props
  onExportMergeUniversal: (file: File | null) => void;
  onImportUniversalVault: (file: File) => void;
  vaultProfiles: string[];
  selectedVaultProfile: string;
  setSelectedVaultProfile: (val: string) => void;

  // Google Sheets integration props
  googleWebAppUrl?: string;
  setGoogleWebAppUrl?: (val: string) => void;
  onExportMergeGoogleSheet?: () => void;

  // Multi-sheet tab props
  sheetTabNames?: string[];
  selectedSheetIdx?: number;
  onSheetTabChange?: (idx: number) => void;

  // Auto-confirm settings props
  autoConfirmEnabled?: boolean;
  autoConfirmDuration?: number;
  onToggleAutoConfirm?: (val: boolean) => void;
  onDurationChange?: (val: number) => void;
  isMergingSheet?: boolean;
}

export const CsvSyncSection = ({
  viewMode,
  setViewMode,
  showSettings,
  setShowSettings,
  urlInput,
  setUrlInput,
  fetching,
  handleSyncJobs,
  handleImportCSVFile,
  onExportCSV,
  onOpenAddModal,
  onClearJobs,
  onExportMergeUniversal,
  onImportUniversalVault,
  vaultProfiles,
  selectedVaultProfile,
  setSelectedVaultProfile,
  googleWebAppUrl = '',
  setGoogleWebAppUrl,
  onExportMergeGoogleSheet,
  sheetTabNames = [],
  selectedSheetIdx = 0,
  onSheetTabChange,
  autoConfirmEnabled = false,
  autoConfirmDuration = 30,
  onToggleAutoConfirm,
  onDurationChange,
  isMergingSheet = false
}: CsvSyncSectionProps) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  return (
    <div className="space-y-4">
      {/* View Switcher Header */}
      <div className="flex flex-col gap-3 border-b border-graphite pb-3.5">
        <div className="flex gap-1.5 p-1 bg-carbon border border-graphite rounded-md w-full">
          <button
            onClick={() => { setViewMode('local'); setSelectedVaultProfile(''); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'local' 
                ? 'bg-accent/10 border border-accent/20 text-accent' 
                : 'border border-transparent text-ash hover:text-mist'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Local Database
          </button>
          <button
            onClick={() => { setViewMode('sheet'); setSelectedVaultProfile(''); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'sheet' 
                ? 'bg-accent/10 border border-accent/20 text-accent' 
                : 'border border-transparent text-ash hover:text-mist'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Google Sheet Refresh
          </button>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-1.5 justify-between w-full">
          {viewMode === 'sheet' ? (
            <div className="flex items-center gap-1.5 w-full justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                icon={<Settings className="w-3.5 h-3.5" />}
                className={`text-[9px] px-2.5 ${showSettings ? 'text-accent' : 'text-ash hover:text-mist'}`}
                title="Spreadsheet settings"
              >
                Settings
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSyncJobs}
                isLoading={fetching}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-[9px] px-2.5"
                title="Force refresh database"
              >
                Refresh Jobs
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 w-full">
              {selectedVaultProfile ? (
                /* Vault Read-Only Mode — hide all write actions */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                      <Database className="w-3 h-3 text-accent" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent">
                        {selectedVaultProfile === '__all__' ? 'All Vault Applications' : selectedVaultProfile}
                      </span>
                    </div>
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-ash/60">Read-Only Vault</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedVaultProfile('')}
                      icon={<X className="w-3.5 h-3.5" />}
                      className="text-[9px] px-2.5 text-ash hover:text-white"
                      title="Back to Local Database"
                    >
                      Back to Local
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal Local Mode — compact action bar */
                <div className="flex flex-col gap-2.5 w-full">
                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSVFile}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImportUniversalVault(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="universal-vault-input"
                  />
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onExportMergeUniversal(file);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="merge-vault-picker"
                  />

                  {/* Clean 3-button row */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenAddModal('capture')}
                        icon={<Bookmark className="w-3.5 h-3.5" />}
                        className="text-[9px] px-2.5 text-accent-light hover:text-accent"
                        title="Save current tab URL"
                      >
                        Save Tab
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenAddModal('manual')}
                        icon={<Plus className="w-3.5 h-3.5" />}
                        className="text-[9px] px-2.5"
                        title="Add job manually"
                      >
                        Add
                      </Button>
                    </div>                    {/* Actions on Right */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSettings(!showSettings)}
                        icon={<Settings className="w-3.5 h-3.5" />}
                        className={`text-[9px] px-2 ${showSettings ? 'text-accent' : 'text-ash hover:text-mist hover:bg-white/5'}`}
                        title="Application settings"
                      />

                      {/* ⋯ More Dropdown */}
                      <div className="relative" ref={moreMenuRef}>
                        <button
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                            showMoreMenu
                              ? 'bg-white/10 border-white/15 text-white'
                              : 'bg-transparent border-transparent text-ash hover:text-mist hover:bg-white/5'
                          }`}
                          title="More actions"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                          <span>More</span>
                          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showMoreMenu && (
                          <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0D0D0D] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => { document.getElementById('csv-file-input')?.click(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5 text-mist" />
                              Import CSV
                            </button>
                            <button
                              onClick={() => { document.getElementById('universal-vault-input')?.click(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5 text-accent-light" />
                              Load Vault
                            </button>
                            
                            <div className="border-t border-white/5 my-1" />

                            <button
                              onClick={() => { onExportCSV(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-mist" />
                              Export Excel
                            </button>
                            <button
                              onClick={() => { onExportMergeUniversal(null); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors"
                              title="Create a fresh universal vault spreadsheet"
                            >
                              <Download className="w-3.5 h-3.5 text-accent-light" />
                              Create New Vault
                            </button>
                            <button
                              onClick={() => { document.getElementById('merge-vault-picker')?.click(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors"
                              title="Merge current jobs into an existing universal vault spreadsheet"
                            >
                              <Download className="w-3.5 h-3.5 text-pulse-green" />
                              Merge to Vault
                            </button>
                            <button
                              disabled={isMergingSheet}
                              onClick={() => { onExportMergeGoogleSheet?.(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-ash hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                              title={isMergingSheet ? "Merge in progress..." : "Merge current jobs to your configured Google Sheet"}
                            >
                              <Database className="w-3.5 h-3.5 text-accent-light" />
                              {isMergingSheet ? 'Merging...' : 'Merge to Google Sheet'}
                            </button>

                            <div className="border-t border-white/5 my-1" />

                            <button
                              onClick={() => { onClearJobs(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Wipe All Jobs
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vault Profile Selector — always visible in local mode if vault data is loaded */}
              {vaultProfiles.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-[#0A0A0A] border border-white/5 rounded-xl">
                  <Database className="w-3.5 h-3.5 text-accent/60 shrink-0" />
                  <label className="text-[8px] font-black uppercase tracking-widest text-ash shrink-0">
                    Vault Profile:
                  </label>
                  <select
                    value={selectedVaultProfile}
                    onChange={(e) => setSelectedVaultProfile(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-lg py-1.5 px-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-accent/40 cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="">— Select Vault Profile —</option>
                    <option value="__all__">📂 — All Applications —</option>
                    {vaultProfiles.map((profileName) => (
                      <option key={profileName} value={profileName}>
                        📂 {profileName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl space-y-4 auto-layout-transition">
          {/* General Auto-Confirm Settings (available in both modes) */}
          <div className="space-y-3 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-light">Auto-Confirm Applied</h4>
                <p className="text-[8px] text-ash">Automatically mark a job as applied after opening its link.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={autoConfirmEnabled} 
                  onChange={(e) => onToggleAutoConfirm?.(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-7 h-4 bg-void border border-graphite rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ash peer-checked:after:bg-accent after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-accent/10 peer-checked:border-accent/30"></div>
              </label>
            </div>

            {autoConfirmEnabled && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-ash">
                  <span>Countdown Duration:</span>
                  <span className="text-accent">{autoConfirmDuration} seconds</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="60" 
                  step="5"
                  value={autoConfirmDuration} 
                  onChange={(e) => onDurationChange?.(Number(e.target.value))}
                  className="w-full h-1 bg-void rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            )}
          </div>

          {/* Spreadsheet Settings (only in Sheet mode) */}
          {viewMode === 'sheet' && (
            <div className="space-y-4 pt-1">
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

              <div className="space-y-1 pt-3 border-t border-white/5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-light">Google Web App URL (Apps Script)</h4>
                <p className="text-[9px] text-muted">Enter the deployed Google Apps Script Web App URL to enable writing/merging.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-4 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                  value={googleWebAppUrl}
                  onChange={(e) => setGoogleWebAppUrl?.(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sheet Tab Profile Selector — visible in sheet mode when multiple sheets detected */}
      {viewMode === 'sheet' && sheetTabNames.length > 1 && (
        <div className="flex items-center gap-2 p-2.5 bg-[#0A0A0A] border border-white/5 rounded-xl">
          <RefreshCw className="w-3.5 h-3.5 text-accent/60 shrink-0" />
          <label className="text-[8px] font-black uppercase tracking-widest text-ash shrink-0">
            Sheet Profile:
          </label>
          <select
            value={selectedSheetIdx}
            onChange={(e) => onSheetTabChange?.(Number(e.target.value))}
            className="flex-1 bg-black border border-white/10 rounded-lg py-1.5 px-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-accent/40 cursor-pointer appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {sheetTabNames.map((name, idx) => (
              <option key={idx} value={idx}>
                📄 {name} 
              </option>
            ))}
          </select>
        </div>
      )}    </div>
  );
};
