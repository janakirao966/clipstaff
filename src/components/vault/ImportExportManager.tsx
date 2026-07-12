import { useRef } from 'react';
import { Button } from '../ui';
import { Upload, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { parseExperiencesFromResumeText } from '../../lib/resumeParser';
import { useSnippets } from '../../hooks/useSnippets';
import { useProfiles } from '../../hooks/useProfiles';
import { useStore } from '../../store/useStore';

interface ImportExportManagerProps {
  onAutofill?: () => void;
  onAddShortcut: () => void;
}

export const ImportExportManager = ({ onAutofill, onAddShortcut }: ImportExportManagerProps) => {
  const snippets = useStore(state => state.snippets);
  const setResumeText = useStore(state => state.setResumeText);
  const { updateSnippet, createSnippet } = useSnippets();
  const { saveProfile } = useProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // A. Check if this is a Profile Backup JSON
        const rootKeys = Object.keys(parsed);
        if (rootKeys.length === 1 && parsed[rootKeys[0]] && typeof parsed[rootKeys[0]] === 'object' && 'profile' in parsed[rootKeys[0]]) {
          const data = parsed[rootKeys[0]];
          const p = data.profile;
          const resumeRawText = data.text || '';

          // Parse experiences from text using isolated utility
          const parsedExperiences = parseExperiencesFromResumeText(resumeRawText);

          const education = (p.education || []).map((edu: any) => ({
            degree: edu.degree || '',
            field_of_study: edu.field_of_study || '',
            school: edu.school || '',
            location: edu.location || '',
            start_year: edu.dates ? edu.dates.split(/[–-]/)[0]?.trim() || '' : edu.start_year || '',
            end_year: edu.dates ? edu.dates.split(/[–-]/)[1]?.trim() || '' : edu.end_year || ''
          }));

          const profileData = {
            name: rootKeys[0] || p.name || '',
            full_name: p.name || '',
            first_name: p.first_name || '',
            middle_name: p.middle_name || '',
            last_name: p.last_name || '',
            email: p.email || '',
            phone: p.phone || '',
            linkedin_url: p.linkedin || '',
            portfolio_url: '',
            location: p.location || '',
            street_address: p.street_address || '',
            city: p.city || '',
            state: p.state || '',
            pin_code: p.pin_code || '',
            professional_subtitle: p.subtitle || '',
            password: p.password || '',
            experience: parsedExperiences,
            education: education,
            certifications: p.certs || [],
            is_active: true
          };

          const loadingToast = toast.loading('Importing Profile Backup...');
          try {
            await saveProfile(profileData as any);
            if (resumeRawText) {
              setResumeText(resumeRawText);
            }
            toast.dismiss(loadingToast);
            toast.success('Profile Imported Successfully', {
              description: `Loaded profile details for ${profileData.full_name || profileData.name}.`
            });
          } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Profile Import Failed');
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // B. Handle Standard Shortcuts
        let items: { shortcut: string; text: string; category?: string }[] = [];

        if (Array.isArray(parsed)) {
          items = parsed.filter(item => typeof item === 'object' && item !== null && 'shortcut' in item && 'text' in item);
        } else if (typeof parsed === 'object' && parsed !== null) {
          Object.keys(parsed).forEach(key => {
            if (typeof parsed[key] === 'string') {
              items.push({
                shortcut: key,
                text: parsed[key],
                category: 'General'
              });
            }
          });
        }

        // De-duplicate items inside the imported list (case-insensitive), keeping the latest one
        const uniqueItemsMap = new Map<string, { shortcut: string; text: string; category?: string }>();
        for (const item of items) {
          const normalized = item.shortcut.trim().toLowerCase();
          if (normalized) {
            uniqueItemsMap.set(normalized, item);
          }
        }
        const uniqueItems = Array.from(uniqueItemsMap.values());

        if (uniqueItems.length === 0) {
          toast.error('Invalid JSON Format', {
            description: 'Provide an array of shortcut objects or a key-value object.'
          });
          return;
        }

        let importCount = 0;
        let updateCount = 0;
        const loadingToast = toast.loading(`Importing ${uniqueItems.length} shortcuts...`);

        for (const item of uniqueItems) {
          try {
            const normalizedShortcut = item.shortcut.trim().toLowerCase();
            const existing = snippets.find(
              (s: any) => s.shortcut.trim().toLowerCase() === normalizedShortcut
            );

            if (existing) {
              await updateSnippet(existing.id, {
                text: item.text,
                category: item.category || existing.category || 'General'
              });
              updateCount++;
            } else {
              await createSnippet({
                shortcut: normalizedShortcut,
                text: item.text,
                category: item.category || 'General'
              });
              importCount++;
            }
          } catch (err) {
            console.error('Failed to import shortcut:', item.shortcut, err);
          }
        }

        toast.dismiss(loadingToast);
        toast.success('Import Complete', {
          description: `Successfully imported ${importCount} new and updated ${updateCount} existing shortcuts.`
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        toast.error('Import Failed', {
          description: 'Failed to parse JSON file.'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center justify-between px-1 gap-2">
      {onAutofill ? (
        <Button
          size="sm"
          variant="primary"
          onClick={onAutofill}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="text-[10px]"
        >
          Autofill
        </Button>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJSON}
          accept=".json"
          className="hidden"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload className="w-3.5 h-3.5" />}
        >
          Import
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddShortcut}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Shortcut
        </Button>
      </div>
    </div>
  );
};
