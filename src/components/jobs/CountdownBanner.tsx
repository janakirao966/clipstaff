import React from 'react';
import { Job } from '../../types';

interface CountdownBannerProps {
  pendingConfirmJob: Job | null;
  countdown: number | null;
  isTimerPaused: boolean;
  setIsTimerPaused: (paused: boolean) => void;
  handleConfirmApplied: (applied: boolean) => void;
  pendingCount: number;
  handleResolveAllPendingConfirmations: () => void;
  handleDismissAllPendingConfirmations: () => void;
}

export const CountdownBanner: React.FC<CountdownBannerProps> = ({
  pendingConfirmJob,
  countdown,
  isTimerPaused,
  setIsTimerPaused,
  handleConfirmApplied,
  pendingCount,
  handleResolveAllPendingConfirmations,
  handleDismissAllPendingConfirmations
}) => {
  return (
    <>
      {pendingConfirmJob && (
        <div className="p-3.5 bg-accent/10 border border-accent/25 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 select-none">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-[8px] font-black text-accent uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              {countdown !== null
                ? `Auto-confirming in ${countdown}s${isTimerPaused ? ' (Paused)' : ''}`
                : 'Did you apply?'}
            </h4>
            <p className="text-[10px] text-paper truncate font-semibold">
              {pendingConfirmJob.role}
            </p>
            <p className="text-[9px] text-ash truncate">
              at <span className="text-mist font-medium">{pendingConfirmJob.company}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {countdown !== null && (
              <button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[8px] text-ash hover:text-mist border border-graphite rounded-lg font-bold uppercase tracking-wider transition-all"
              >
                {isTimerPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            <button
              onClick={() => handleConfirmApplied(true)}
              className="px-2.5 py-1 bg-pulse-green/10 hover:bg-pulse-green/20 text-pulse-green border border-pulse-green/25 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleConfirmApplied(false)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-ash border border-graphite rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              No
            </button>
          </div>
        </div>
      )}

      {pendingCount > 0 && !pendingConfirmJob && (
        <div className="flex items-center justify-between gap-3 p-2.5 bg-accent/5 border border-accent/15 rounded-xl text-[9px] text-accent font-medium animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>You have {pendingCount} application status {pendingCount === 1 ? 'confirmation' : 'confirmations'} pending.</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleResolveAllPendingConfirmations}
              className="px-2.5 py-1 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              Confirm Applied
            </button>
            <button
              onClick={handleDismissAllPendingConfirmations}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-ash border border-graphite rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
