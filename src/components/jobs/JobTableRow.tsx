import { Job } from '../../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check,
  ChevronDown,
  Trash2,
  ExternalLink,
  Database
} from 'lucide-react';

interface JobTableRowProps {
  job: Job;
  viewMode: 'sheet' | 'local';
  onDelete: (id: string) => void;
  onApply: (job: Job) => void;
  onUpdateStatus: (url: string, status: Job['status']) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  isReadOnly?: boolean;
  showProfileBadge?: boolean;
}

export const JobTableRow = ({
  job,
  viewMode,
  onDelete,
  onApply,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown,
  isReadOnly = false,
  showProfileBadge = false
}: JobTableRowProps) => {
  const statusConfig = {
    not_applied: { 
      label: 'To Apply', 
      color: 'text-ash bg-white/5 border-graphite hover:bg-white/10', 
      icon: <Clock className="w-3 h-3" /> 
    },
    applied: { 
      label: 'Applied', 
      color: 'text-pulse-green bg-pulse-green/10 border-pulse-green/20 hover:bg-pulse-green/20', 
      icon: <CheckCircle2 className="w-3 h-3" /> 
    },
    skipped: { 
      label: 'Skipped', 
      color: 'text-coral-red bg-coral-red/10 border-coral-red/20 hover:bg-coral-red/20', 
      icon: <XCircle className="w-3 h-3 text-coral-red" /> 
    }
  };

  const config = statusConfig[job.status];

  return (
    <div className="group p-4 bg-carbon border border-graphite rounded-xl hover:border-smoke hover:bg-obsidian hover:-translate-y-0.5 duration-150 transition-all flex flex-col gap-3 relative overflow-hidden">
      {/* Top Row: Job details */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-paper tracking-wide truncate">{job.role}</h4>
          <p className="text-[10px] font-medium text-ash mt-0.5 truncate">{job.company}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
            {job.dateAdded && (
              <span className="text-[8px] font-mono font-semibold text-fog uppercase tracking-widest">
                Added: {job.dateAdded}
              </span>
            )}
            {showProfileBadge && (job as any).profileName && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/15 border border-accent/25 rounded-md text-[8px] font-black uppercase tracking-wider text-accent">
                <Database className="w-2.5 h-2.5 text-accent" />
                {(job as any).profileName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Delete button (only in Local database view and not read-only) */}
          {viewMode === 'local' && !isReadOnly && (
            <button
              onClick={(e) => {
                console.log('[ClipStaff UI] Delete button clicked in JobTableRow for job ID:', job.id);
                e.stopPropagation();
                onDelete(job.id);
              }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-ash hover:text-red-500 active:scale-95 duration-150 transition-all"
              title="Delete application"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Apply Button */}
          <button
            onClick={() => onApply(job)}
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

        {isReadOnly ? (
          /* Static Badge in Read-Only Mode */
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${config.color.replace('hover:bg-white/10', '').replace('hover:bg-pulse-green/20', '').replace('hover:bg-coral-red/20', '')}`}>
            {config.icon}
            <span>{config.label}</span>
          </div>
        ) : (
          /* Dropdown status toggler */
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
                        onUpdateStatus(job.url, status);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors ${
                        job.status === status ? 'text-accent' : 'text-ash hover:text-mist'
                      }`}
                    >
                      {optionLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
