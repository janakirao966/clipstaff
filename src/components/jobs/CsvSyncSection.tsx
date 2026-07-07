import React from 'react';
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
  Upload
} from 'lucide-react';

interface CsvSyncSectionProps {
  viewMode: 'sheet' | 'local';
  setViewMode: (mode: 'sheet' | 'local') => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  showAddForm: boolean;
  setShowAddForm: (val: boolean) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  fetching: boolean;
  handleSyncJobs: () => void;
  handleImportCSVFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  handleCaptureCurrentTab: () => void;
  jobUrlInput: string;
  setJobUrlInput: (val: string) => void;
  companyInput: string;
  setCompanyInput: (val: string) => void;
  roleInput: string;
  setRoleInput: (val: string) => void;
  onAddJob: () => void;
  onClearJobs: () => void;
}

export const CsvSyncSection = ({
  viewMode,
  setViewMode,
  showSettings,
  setShowSettings,
  showAddForm,
  setShowAddForm,
  urlInput,
  setUrlInput,
  fetching,
  handleSyncJobs,
  handleImportCSVFile,
  onExportCSV,
  handleCaptureCurrentTab,
  jobUrlInput,
  setJobUrlInput,
  companyInput,
  setCompanyInput,
  roleInput,
  setRoleInput,
  onAddJob,
  onClearJobs
}: CsvSyncSectionProps) => {
  return (
    <div className="space-y-4">
      {/* View Switcher Header */}
      <div className="flex items-center justify-between border-b border-graphite pb-3.5">
        <div className="flex gap-1.5 p-1 bg-carbon border border-graphite rounded-md">
          <button
            onClick={() => setViewMode('local')}
            className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
              viewMode === 'local' 
                ? 'bg-accent/10 border border-accent/20 text-accent' 
                : 'border border-transparent text-ash hover:text-mist'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Local Database
          </button>
          <button
            onClick={() => setViewMode('sheet')}
            className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
              viewMode === 'sheet' 
                ? 'bg-accent/10 border border-accent/20 text-accent' 
                : 'border border-transparent text-ash hover:text-mist'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Google Sheet Sync
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === 'sheet' ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                icon={<Settings className="w-3.5 h-3.5" />}
                className={`text-[9px] px-2 ${showSettings ? 'text-accent' : 'text-ash hover:text-mist'}`}
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
                className="text-[9px] px-2"
                title="Force refresh database"
              >
                Sync Jobs
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
                onClick={onExportCSV}
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
              <Button
                size="sm"
                variant="danger"
                onClick={onClearJobs}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="text-[9px] px-2"
                title="Clear all local jobs"
              >
                Wipe
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Spreadsheet URL Settings Panel */}
      {viewMode === 'sheet' && showSettings && (
        <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl space-y-3 auto-layout-transition">
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
        <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl space-y-3.5 auto-layout-transition">
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
              onClick={onAddJob}
            >
              Save Application
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
