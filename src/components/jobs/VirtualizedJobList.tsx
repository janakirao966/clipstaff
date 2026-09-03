import React, { useEffect, useRef } from 'react';
import { List } from 'react-window';
import { Job } from '../../types';
import { JobTableRow } from './JobTableRow';
import { ChevronDown, Check, ExternalLink, Trash2, XCircle } from 'lucide-react';

const ListComponent = List as any;

interface VirtualizedJobListProps {
  jobs: Job[];
  layoutMode: 'cards' | 'table';
  viewMode: 'sheet' | 'local';
  selectedVaultProfile: string;
  selectedSheetIdx: number;
  onApply: (job: Job) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (url: string, status: Job['status']) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  onItemsRendered?: (props: { visibleStartIndex: number; visibleStopIndex: number }) => void;
}

const CardRow = ({
  index,
  style,
  jobs,
  viewMode,
  onDelete,
  onApply,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown,
  isReadOnly,
  showProfileBadge
}: any): JSX.Element | null => {
  const job = jobs[index];
  if (!job) return null;
  
  const isDropdownActive = activeDropdown === job.id;
  
  return (
    <div style={{ ...style, zIndex: isDropdownActive ? 100 : 1 }}>
      <div className="pb-3 pr-1">
        <JobTableRow
          job={job}
          viewMode={viewMode}
          onDelete={onDelete}
          onApply={onApply}
          onUpdateStatus={onUpdateStatus}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          isReadOnly={isReadOnly}
          showProfileBadge={showProfileBadge}
        />
      </div>
    </div>
  );
};


const TableRow = ({
  index,
  style,
  jobs,
  viewMode,
  onDelete,
  onApply,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown,
  isReadOnly,
  showProfileBadge,
  statusConfig
}: any): JSX.Element | null => {
  const job = jobs[index];
  if (!job) return null;
  
  const config = statusConfig[job.status] || statusConfig.not_applied;
  const isDropdownActive = activeDropdown === job.id;
  
  return (
    <div 
      style={{ ...style, zIndex: isDropdownActive ? 100 : 1 }}
      className="flex items-center border-b border-graphite/40 hover:bg-obsidian/45 transition-colors text-[10px] text-paper py-2"
    >
      {/* Serial Number */}
      <div className="w-10 text-center text-ash font-mono select-none px-1">
        {index + 1}
      </div>

      {/* Role Name */}
      <div className="flex-1 font-semibold truncate px-2 max-w-[120px]" title={job.role}>
        {job.role}
      </div>

      {/* Company Name & optional Profile Badge */}
      <div className="flex-1 text-ash truncate px-2 max-w-[120px]" title={job.company}>
        <div>{job.company}</div>
        {showProfileBadge && (job as any).profileName && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-accent/15 border border-accent/25 rounded text-[7px] font-black uppercase tracking-wider text-accent mt-0.5">
            {(job as any).profileName}
          </span>
        )}
      </div>

      {/* Date Added */}
      <div className="w-24 text-fog font-mono text-[9px] px-2 truncate">
        {job.dateAdded || 'N/A'}
      </div>

      {/* Status Dropdown */}
      <div className="w-24 text-center px-1">
        <div className="relative inline-block text-left">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown(activeDropdown === job.id ? null : job.id);
            }}
            className={`flex items-center justify-between w-20 gap-1 px-1.5 py-0.5 rounded border text-[7.5px] font-bold uppercase tracking-wider transition-all ${config.color}`}
          >
            <span>{config.label}</span>
            <ChevronDown className="w-2 h-2 opacity-60" />
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
                };
                return (
                  <button
                    key={status}
                    onClick={() => {
                      onUpdateStatus(job.url, status);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center justify-between w-full px-2 py-1 text-left text-[8px] font-semibold tracking-wider uppercase transition-colors hover:bg-white/5 ${
                      job.status === status ? 'text-accent' : 'text-ash'
                    }`}
                  >
                    <span>{optionLabel[status]}</span>
                    {job.status === status && <Check className="w-2 h-2 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions (Apply & Delete) */}
      <div className="w-20 text-center flex items-center justify-center gap-1.5 px-1">
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
            <Check className="w-2 h-2" />
          ) : job.status === 'skipped' ? (
            <XCircle className="w-2 h-2" />
          ) : (
            <ExternalLink className="w-2 h-2" />
          )}
        </button>
        
        {viewMode === 'local' && !isReadOnly && (
          <button
            onClick={() => {
              console.log('[ClipStaff UI] Delete button clicked in Table for job ID:', job.id);
              onDelete(job.id);
            }}
            className="p-1 rounded bg-red-500/5 hover:bg-red-500/15 text-ash hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
            title="Delete application"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const VirtualizedJobList = ({
  jobs,
  layoutMode,
  viewMode,
  selectedVaultProfile,
  selectedSheetIdx,
  onApply,
  onDelete,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown,
  onItemsRendered
}: VirtualizedJobListProps) => {

  const isReadOnly = !!selectedVaultProfile;
  const showProfileBadge = selectedVaultProfile === '__all__' || (viewMode === 'sheet' && selectedSheetIdx === -1);

  const listRef = useRef<any>(null);

  // Restore scroll offset on mount or mode change
  useEffect(() => {
    const key = `clipstaff_scroll_offset_${layoutMode}`;
    const restoreScroll = () => {
      const element = listRef.current?.element;
      if (!element) return;
      
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get([key], (res) => {
          if (res[key] && element) {
            element.scrollTop = res[key];
          }
        });
      } else {
        const offset = localStorage.getItem(key);
        if (offset && element) {
          element.scrollTop = parseInt(offset, 10);
        }
      }
    };
    
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, [layoutMode, jobs.length]);

  const scrollTimerRef = useRef<any>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Persist scroll offset with 200ms debounce
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollOffset = e.currentTarget.scrollTop;
    const key = `clipstaff_scroll_offset_${layoutMode}`;
    
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = setTimeout(() => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [key]: scrollOffset });
      } else {
        localStorage.setItem(key, scrollOffset.toString());
      }
    }, 200);
  };

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

  const listHeight = 380; // height of viewport in px

  if (layoutMode === 'cards') {
    return (
      <ListComponent
        listRef={listRef}
        height={listHeight}
        rowCount={jobs.length}
        rowHeight={136} // 124px card height + 12px gap
        rowComponent={CardRow}
        rowProps={{
          jobs,
          viewMode,
          onDelete,
          onApply,
          onUpdateStatus,
          activeDropdown,
          setActiveDropdown,
          isReadOnly,
          showProfileBadge
        }}
        onScroll={handleScroll}
        onRowsRendered={({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
          if (onItemsRendered) {
            onItemsRendered({ visibleStartIndex: startIndex, visibleStopIndex: stopIndex });
          }
        }}
      />
    );
  }

  // Render Table Layout
  return (
    <div className="border border-graphite rounded-xl bg-carbon overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="flex items-center border-b border-graphite bg-void text-ash font-bold uppercase tracking-wider text-[8px] py-2.5 select-none font-sans">
        <div className="w-10 text-center">S.No</div>
        <div className="flex-1 px-2">Role</div>
        <div className="flex-1 px-2">Company</div>
        <div className="w-24 px-2">Date Added</div>
        <div className="w-24 text-center">Status</div>
        <div className="w-20 text-center">Actions</div>
      </div>

      {/* Table Body List */}
      <div className="custom-scrollbar overflow-x-auto min-w-[450px]">
        <ListComponent
          listRef={listRef}
          height={listHeight}
          rowCount={jobs.length}
          rowHeight={40} // 40px row height
          rowComponent={TableRow}
          rowProps={{
            jobs,
            viewMode,
            onDelete,
            onApply,
            onUpdateStatus,
            activeDropdown,
            setActiveDropdown,
            isReadOnly,
            showProfileBadge,
            statusConfig
          }}
          className="divide-y divide-graphite/40"
          onScroll={handleScroll}
          onRowsRendered={({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
            if (onItemsRendered) {
              onItemsRendered({ visibleStartIndex: startIndex, visibleStopIndex: stopIndex });
            }
          }}
        />
      </div>
    </div>
  );
};
