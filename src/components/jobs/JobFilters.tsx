import { Search } from 'lucide-react';

interface JobFiltersProps {
  viewMode: 'sheet' | 'local';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: 'all' | 'not_applied' | 'applied' | 'skipped';
  setActiveTab: (tab: 'all' | 'not_applied' | 'applied' | 'skipped') => void;
}

export const JobFilters = ({
  viewMode,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab
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

      {/* Filter Tabs */}
      <div className="flex gap-1.5 border-b border-graphite pb-2">
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
    </>
  );
};
