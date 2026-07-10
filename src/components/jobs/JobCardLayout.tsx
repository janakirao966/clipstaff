import { Job } from '../../types';
import { JobTableRow } from './JobTableRow';

interface JobCardLayoutProps {
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

export const JobCardLayout = ({
  paginatedJobs,
  viewMode,
  selectedVaultProfile,
  selectedSheetIdx,
  onApply,
  onDelete,
  onUpdateStatus,
  activeDropdown,
  setActiveDropdown
}: JobCardLayoutProps) => {
  return (
    <div className="grid gap-3">
      {paginatedJobs.map((job, idx) => {
        const isReadOnly = !!selectedVaultProfile;
        const showProfileBadge = selectedVaultProfile === '__all__' || (viewMode === 'sheet' && selectedSheetIdx === -1);
        
        return (
          <JobTableRow
            key={job.id || idx}
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
        );
      })}
    </div>
  );
};
