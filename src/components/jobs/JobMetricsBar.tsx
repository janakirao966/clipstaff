import React, { useState } from 'react';
import { Job } from '../../types';
import { normalizeDateStr } from '../../lib/extractor';
import { useStore } from '../../store/useStore';
import { CheckCircle2, Bookmark, XCircle, Flame, Target, Edit2, Check } from 'lucide-react';

interface JobMetricsBarProps {
  jobs: Job[];
  onSelectQuickFilter?: (filter: 'today' | 'today_applied' | 'all') => void;
}

export const JobMetricsBar: React.FC<JobMetricsBarProps> = ({ jobs, onSelectQuickFilter }) => {
  const dailyGoal = useStore(state => state.dailyGoal) || 20;
  const setDailyGoal = useStore(state => state.setDailyGoal);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(dailyGoal));

  const todayStr = normalizeDateStr(
    new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  );

  // Compute metrics
  const todayJobs = jobs.filter(j => normalizeDateStr(j.dateAdded || '') === todayStr);
  const appliedTodayCount = todayJobs.filter(j => j.status === 'applied').length;
  const skippedTodayCount = todayJobs.filter(j => j.status === 'skipped').length;
  const savedTodayCount = todayJobs.length;
  const totalPipelineCount = jobs.length;

  const progressPct = Math.min(100, Math.round((appliedTodayCount / Math.max(1, dailyGoal)) * 100));

  const handleSaveGoal = () => {
    const num = parseInt(goalInput, 10);
    if (!isNaN(num) && num > 0) {
      setDailyGoal(num);
    }
    setIsEditingGoal(false);
  };

  return (
    <div className="p-3.5 bg-carbon border border-graphite rounded-2xl space-y-3 shadow-lg">
      {/* Top Row: Daily Goal Tracker & Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <Target className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Daily Target</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-12 px-1.5 py-0.5 bg-void border border-accent/40 rounded text-[10px] font-bold text-accent focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGoal();
                    }}
                  />
                  <button onClick={handleSaveGoal} className="text-accent hover:text-white p-0.5">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setGoalInput(String(dailyGoal));
                    setIsEditingGoal(true);
                  }}
                  className="flex items-center gap-1 text-[9px] text-ash hover:text-accent group transition-colors"
                  title="Edit daily application target"
                >
                  <span>({dailyGoal} Goal)</span>
                  <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                </button>
              )}
            </div>
            <p className="text-[8px] text-fog font-medium">
              {appliedTodayCount >= dailyGoal
                ? '🎯 Target Reached! Outstanding momentum!'
                : `${dailyGoal - appliedTodayCount} more application${dailyGoal - appliedTodayCount === 1 ? '' : 's'} to reach today's target.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-void border border-graphite">
          <Flame className={`w-3.5 h-3.5 ${appliedTodayCount > 0 ? 'text-amber-400 animate-pulse' : 'text-ash'}`} />
          <span className="text-[10px] font-black text-white">{progressPct}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-void h-1.5 rounded-full overflow-hidden border border-graphite/40">
        <div 
          className="h-full bg-accent transition-all duration-500 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Metrics Chips / Filter Cards */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        <button
          onClick={() => onSelectQuickFilter?.('today')}
          className="p-2 rounded-xl bg-void border border-graphite hover:border-accent/30 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-wider text-ash group-hover:text-mist">Saved Today</span>
            <Bookmark className="w-3 h-3 text-ash group-hover:text-accent transition-colors" />
          </div>
          <div className="text-sm font-black text-white mt-1">{savedTodayCount}</div>
        </button>

        <button
          onClick={() => onSelectQuickFilter?.('today_applied')}
          className="p-2 rounded-xl bg-void border border-graphite hover:border-emerald-500/30 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400/90">Applied</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-sm font-black text-emerald-400 mt-1">{appliedTodayCount}</div>
        </button>

        <button
          onClick={() => onSelectQuickFilter?.('today')}
          className="p-2 rounded-xl bg-void border border-graphite hover:border-rose-500/30 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-wider text-rose-400/90">Skipped</span>
            <XCircle className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-black text-rose-400 mt-1">{skippedTodayCount}</div>
        </button>

        <button
          onClick={() => onSelectQuickFilter?.('all')}
          className="p-2 rounded-xl bg-void border border-graphite hover:border-white/20 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-wider text-ash group-hover:text-mist">Pipeline</span>
            <span className="text-[9px] text-fog font-bold">ALL</span>
          </div>
          <div className="text-sm font-black text-white mt-1">{totalPipelineCount}</div>
        </button>
      </div>
    </div>
  );
};
