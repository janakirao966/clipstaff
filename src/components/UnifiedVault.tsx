import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSnippets } from '../hooks/useSnippets';
import { useProfiles } from '../hooks/useProfiles';
import { toast } from 'sonner';
import { SnippetDetail } from './SnippetDetail';
import { SnippetList } from './vault/SnippetList';
import { ImportExportManager } from './vault/ImportExportManager';
import { ProfileForm } from './vault/ProfileForm';

export const UnifiedVault = ({ onAutofill }: { onAutofill?: () => void }) => {
  const activeProfile = useStore(state => state.activeProfile);
  const { fetchSnippets } = useSnippets();
  const { saveProfile } = useProfiles();
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfileItem, setEditingProfileItem] = useState<any>(null);
  const [profileEditValue, setProfileEditValue] = useState('');

  // Non-blocking background sync
  useEffect(() => {
    fetchSnippets().catch(() => {});
  }, [fetchSnippets]);

  const handleSaveProfileShortcut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !editingProfileItem) return;

    const updatedProfile = { ...activeProfile };
    const shortcut = editingProfileItem.shortcut;
    const firstName = (activeProfile.full_name || activeProfile.name || '').trim().split(/\s+/)[0];
    const p = (firstName ? firstName[0] : 'p').toLowerCase();
    const newText = profileEditValue;

    if (shortcut === `${p}gm`) {
      updatedProfile.email = newText;
    } else if (shortcut === `${p}n;`) {
      updatedProfile.full_name = newText;
      updatedProfile.name = newText;
    } else if (shortcut === `${p}p;`) {
      updatedProfile.phone = newText;
    } else if (shortcut === `${p}l;`) {
      updatedProfile.linkedin_url = newText;
    } else if (shortcut === 'st;') {
      updatedProfile.location = newText;
    } else if (shortcut.startsWith('rl')) {
      const idx = parseInt(shortcut.substring(2)) - 1;
      if (updatedProfile.experience && updatedProfile.experience[idx]) {
        updatedProfile.experience[idx] = { ...updatedProfile.experience[idx], title: newText };
      }
    } else if (shortcut.startsWith('cp')) {
      const idx = parseInt(shortcut.substring(2)) - 1;
      if (updatedProfile.experience && updatedProfile.experience[idx]) {
        updatedProfile.experience[idx] = { ...updatedProfile.experience[idx], company: newText };
      }
    } else if (shortcut.startsWith('exp')) {
      const idx = parseInt(shortcut.substring(3)) - 1;
      if (updatedProfile.experience && updatedProfile.experience[idx]) {
        updatedProfile.experience[idx] = { ...updatedProfile.experience[idx], description: newText };
      }
    } else if (shortcut.startsWith('edu')) {
      const idx = parseInt(shortcut.substring(3)) - 1;
      if (updatedProfile.education && updatedProfile.education[idx]) {
        updatedProfile.education[idx] = { ...updatedProfile.education[idx], school: newText };
      }
    } else if (shortcut.startsWith('deg')) {
      const idx = parseInt(shortcut.substring(3)) - 1;
      if (updatedProfile.education && updatedProfile.education[idx]) {
        updatedProfile.education[idx] = { ...updatedProfile.education[idx], degree: newText };
      }
    }

    const loadingToast = toast.loading('Updating Profile...');
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, user_id, created_at, updated_at, ...cleanUpdates } = updatedProfile as any;
      await saveProfile(cleanUpdates);
      toast.dismiss(loadingToast);
      toast.success('Shortcut Updated');
      setEditingProfileItem(null);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to update Profile');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <ImportExportManager
        onAutofill={onAutofill}
        onAddShortcut={() => setIsAdding(true)}
      />

      <SnippetList
        onCopy={() => {}}
        onEditProfile={(item) => {
          setEditingProfileItem(item);
          setProfileEditValue(item.text);
        }}
        onEditSnippet={(item) => setEditingSnippet(item)}
      />

      <ProfileForm
        editingProfileItem={editingProfileItem}
        onClose={() => setEditingProfileItem(null)}
        profileEditValue={profileEditValue}
        setProfileEditValue={setProfileEditValue}
        onSave={handleSaveProfileShortcut}
      />

      {(isAdding || editingSnippet) && (
        <SnippetDetail
          snippet={editingSnippet}
          onClose={() => {
            setIsAdding(false);
            setEditingSnippet(null);
          }}
        />
      )}
    </div>
  );
};
