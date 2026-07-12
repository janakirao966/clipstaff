import { Job } from '../../types';
import { ChevronDown, Check, ExternalLink, Trash2 } from 'lucide-react';

interface JobTableLayoutProps {
  paginatedJobs: Job[];
  viewMode: 'sheet' | 'local';
  selectedVaultProfile: string;
  selectedSheetIdx: number;
  onApply: (job: Job) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (url: string, status: Job['status']) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
}

export const JobTableLayout = ({
  paginatedJobs,
  viewMode,
  selectedVaultProfile,
  selectedSheetIdx,
  onApply,
  onDelete,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown
}: JobTableLayoutProps) => {
  const statusConfig = {
    not_applied: { 
      label: 'To Apply', 
      color: 'text-ash bg-white/5 border-graphite hover:bg-white/10'
    },
    applied: { 
      label: 'Applied', 
      color: 'text-pulse-green bg-pulse-green/10 border-pulse-green/20 hover:bg-pulse-green/20'
    },
    skipped: { 
      label: 'Skipped', 
      color: 'text-coral-red bg-coral-red/10 border-coral-red/20 hover:bg-coral-red/20'
    }
  };

  return (
    <div className="overflow-x-auto border border-graphite rounded-xl bg-carbon custom-scrollbar">
      <table className="w-full text-left border-collapse text-[10px] min-w-[500px]">
        <thead>
          <tr className="border-b border-graphite bg-void text-ash font-bold uppercase tracking-wider text-[8px]">
            <th className="py-2.5 px-3 w-12 text-center">S.No</th>
            <th className="py-2.5 px-3">Role</th>
            <th className="py-2.5 px-3">Company</th>
            <th className="py-2.5 px-3">Date Added</th>
            <th className="py-2.5 px-3 text-center w-28">Status</th>
            <th className="py-2.5 px-3 text-center w-28">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-graphite/40">
          {paginatedJobs.map((job, idx) => {
            const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.not_applied;
            const isReadOnly = !!selectedVaultProfile;
            const showProfileBadge = selectedVaultProfile === '__all__' || (viewMode === 'sheet' && selectedSheetIdx === -1);
            
            return (
              <tr key={job.id || idx} className="hover:bg-obsidian/40 transition-colors">
                <td className="py-2.5 px-3 text-center text-ash font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3 font-semibold text-paper truncate max-w-[120px]" title={job.role}>
                  {job.role}
                </td>
                <td className="py-2.5 px-3 text-ash truncate max-w-[100px]" title={job.company}>
                  <div>{job.company}</div>
                  {showProfileBadge && (job as any).profileName && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-accent/15 border border-accent/25 rounded text-[7px] font-black uppercase tracking-wider text-accent mt-0.5">
                      {(job as any).profileName}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-fog font-mono text-[9px]">
                  {job.dateAdded || 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === job.id ? null : job.id);
                      }}
                      className={`flex items-center justify-between w-24 gap-1 px-2 py-1 rounded border text-[8px] font-bold uppercase tracking-wider transition-all ${config.color}`}
                    >
                      <span>{config.label}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>

                    {activeDropdown === job.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-24 bg-[#0D0D0D] border border-white/10 rounded-lg shadow-premium z-50 py-1 overflow-hidden"
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
                              className={`w-full text-left px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors ${
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
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onApply(job)}
                      className={`px-2 py-1 rounded active:scale-95 duration-150 transition-all flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider border ${
                        job.status === 'applied'
                          ? 'bg-pulse-green/10 hover:bg-pulse-green/20 text-pulse-green border-pulse-green/20'
                          : job.status === 'skipped'
                          ? 'bg-coral-red/10 hover:bg-coral-red/20 text-coral-red border-coral-red/20'
                          : 'bg-accent/10 hover:bg-accent/20 text-accent border-accent/20'
                      }`}
                    >
                      <span>
                        {job.status === 'applied' ? 'Applied' : job.status === 'skipped' ? 'Skipped' : 'Apply'}
                      </span>
                      {job.status === 'applied' ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : job.status === 'skipped' ? (
                        null
                      ) : (
                        <ExternalLink className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {viewMode === 'local' && !isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(job.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/10 text-ash hover:text-red-500 active:scale-95 duration-150 transition-all"
                        title="Delete application"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
