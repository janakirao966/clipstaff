import { Button } from '../ui';
import { Modal } from '../ui/Modal';

interface ProfileFormProps {
  editingProfileItem: any;
  onClose: () => void;
  profileEditValue: string;
  setProfileEditValue: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export const ProfileForm = ({
  editingProfileItem,
  onClose,
  profileEditValue,
  setProfileEditValue,
  onSave
}: ProfileFormProps) => {
  if (!editingProfileItem) return null;

  return (
    <Modal
      isOpen={!!editingProfileItem}
      onClose={onClose}
      title={`Edit ${editingProfileItem.label}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={onSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
            Shortcut Trigger
          </label>
          <div className="px-4 py-3 bg-[#050505] border border-white/5 rounded-xl text-xs text-muted/60 font-mono">
            {editingProfileItem.shortcut}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
            Expansion Text
          </label>
          <textarea
            rows={5}
            className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
            value={profileEditValue}
            onChange={(e) => setProfileEditValue(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
