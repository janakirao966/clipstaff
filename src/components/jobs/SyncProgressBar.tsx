import React from 'react';

interface SyncProgressBarProps {
  syncProgress: { current: number; total: number; stage: string } | null;
  activeError: { title: string; desc: string; advice: string } | null;
  onCloseError: () => void;
}

export const SyncProgressBar: React.FC<SyncProgressBarProps> = ({
  syncProgress,
  activeError,
  onCloseError
}) => {
  return (
    <>
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
              onClick={onCloseError}
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
    </>
  );
};
