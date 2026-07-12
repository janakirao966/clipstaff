import { Search } from 'lucide-react';

interface JobFiltersProps {
  viewMode: 'sheet' | 'local';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: 'all' | 'not_applied' | 'applied' | 'skipped';
  setActiveTab: (tab: 'all' | 'not_applied' | 'applied' | 'skipped') => void;
  dateFilter: 'today' | 'yesterday' | 'yesterday_today' | 'last_7_days' | 'all' | 'custom';
  setDateFilter: (filter: 'today' | 'yesterday' | 'yesterday_today' | 'last_7_days' | 'all' | 'custom') => void;
  customDate: string;
  setCustomDate: (date: string) => void;
}

export const JobFilters = ({
  viewMode,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  dateFilter,
  setDateFilter,
  customDate,
  setCustomDate
}: JobFiltersProps) => {
  return (
    <>
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
        <input
          type="text"
          placeholder={`Search ${viewMode === 'local' ? 'saved' : 'synced'} jobs by role or company...`}
          className="w-full pl-12 pr-4 py-2.5 bg-carbon border border-graphite rounded-xl text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Date Filter & Status Tabs */}
      <div className="space-y-3 pb-2 border-b border-graphite">
        {/* Date Filter Row */}
        <div className="flex flex-col gap-1.5 px-0.5">
          <label className="text-[8px] font-black text-ash uppercase tracking-widest px-0.5">
            Date Added
          </label>
          <div className="flex gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 bg-carbon border border-graphite rounded-xl text-[10px] font-bold text-mist focus:outline-none focus:border-bone transition-colors cursor-pointer select-none uppercase tracking-wider"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="yesterday_today">Today & Yesterday (Shift)</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="all">All Dates</option>
              <option value="custom">Specific Date</option>
            </select>
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-carbon border border-graphite rounded-xl text-xs text-mist focus:outline-none focus:border-bone transition-colors font-mono cursor-pointer"
              />
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5">
          {(['all', 'not_applied', 'applied', 'skipped'] as const).map((tab) => {
            const labels = {
              all: 'All',
              not_applied: 'To Apply',
              applied: 'Applied',
              skipped: 'Skipped'
            };
            const colors = {
              all: activeTab === 'all' ? 'bg-white/5 border-graphite text-paper' : 'border-transparent text-ash hover:text-mist',
              not_applied: activeTab === 'not_applied' ? 'bg-white/5 border-graphite text-mist' : 'border-transparent text-ash hover:text-mist',
              applied: activeTab === 'applied' ? 'bg-pulse-green/10 border-pulse-green/20 text-pulse-green' : 'border-transparent text-ash hover:text-mist',
              skipped: activeTab === 'skipped' ? 'bg-coral-red/10 border-coral-red/20 text-coral-red' : 'border-transparent text-ash hover:text-mist'
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 border rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all text-center ${colors[tab]}`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
