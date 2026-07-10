import { useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';
import { Briefcase, Calendar, Globe } from 'lucide-react';
import { Job } from '../../types';

interface ConfirmAppliedModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingJob: Job | null;
  onConfirm: (applied: boolean) => void;
}

export const ConfirmAppliedModal = ({
  isOpen,
  onClose,
  pendingJob,
  onConfirm
}: ConfirmAppliedModalProps) => {

  // Keyboard navigation listener (Enter to confirm applied, Esc to cancel)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

  const getDomain = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(pendingJob?.url);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Application Status"
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <Briefcase className="w-6 h-6 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white leading-snug">
            Did you submit your application?
          </h3>
          <p className="text-xs text-slate-400 px-2 leading-relaxed">
            We opened the link for <span className="text-white font-semibold">{pendingJob?.role}</span> at <span className="text-white font-semibold">{pendingJob?.company}</span>.
          </p>
        </div>

        {pendingJob && (
          <div className="bg-obsidian border border-graphite rounded-xl p-3 text-[10px] text-ash space-y-1.5 text-left max-w-xs mx-auto select-none font-sans">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-accent/75" />
                Domain:
              </span>
              <span className="font-mono text-paper font-semibold">{domain}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent/75" />
                Opened At:
              </span>
              <span className="font-mono text-paper font-semibold">{currentDate} {currentTime}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center pt-2 select-none">
          <Button
            variant="secondary"
            onClick={() => onConfirm(false)}
            className="text-[10px] w-28 py-2.5 hover:bg-white/5"
            title="Press Esc to cancel"
          >
            No, Not Yet
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(true)}
            className="text-[10px] w-28 py-2.5 bg-pulse-green hover:bg-pulse-green/90 border border-pulse-green/20 text-white shadow-pulse-green/25 shadow-lg"
            title="Press Enter to confirm"
          >
            Yes, Applied
          </Button>
        </div>
      </div>
    </Modal>
  );
};
