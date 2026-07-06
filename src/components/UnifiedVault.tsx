import { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useSnippets } from '../hooks/useSnippets';
import { useProfiles } from '../hooks/useProfiles';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy,
  Hash,
  Loader2,
  Pin,
  Upload,
  Sparkles
} from 'lucide-react';
import { SnippetDetail } from './SnippetDetail';
import { handleShortcutClick, copyToClipboard } from '../lib/clipboard';
import { Button } from './ui';
import { Modal } from './ui/Modal';
import { toast } from 'sonner';

export const UnifiedVault = ({ onAutofill }: { onAutofill?: () => void }) => {
  const { snippets, searchTerm, setSearchTerm, activeProfile } = useStore();
  const { fetchSnippets, deleteSnippet, updateSnippet, createSnippet } = useSnippets();
  const { saveProfile } = useProfiles();
  const { setResumeText } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProfileItem, setEditingProfileItem] = useState<any>(null);
  const [profileEditValue, setProfileEditValue] = useState('');
  
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

          // Parse experiences from text
          let parsedExperiences: any[] = [];
          if (resumeRawText) {
            const normalizedText = resumeRawText.replace(/\r\n/g, '\n');
            const boundaries = 'SUMMARY|PROFESSIONAL SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION';
            const experienceRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:EXPERIENCE|PROFESSIONAL EXPERIENCE)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
            const expMatch = normalizedText.match(experienceRx);
            
            if (expMatch && expMatch[1]) {
              const expBlock = expMatch[1].trim();
              const lines = expBlock.split('\n');
              let currentExp: any = null;
              let descLines: string[] = [];

              lines.forEach((line: string) => {
                const t = line.trim();
                if (t.includes('|') && !/^([-•*·]|\d+\.)/.test(t)) {
                  if (currentExp) {
                    currentExp.description = descLines.join('\n');
                    parsedExperiences.push(currentExp);
                  }
                  const parts = t.split('|').map(x => x.trim());
                  const company = parts[0] || '';
                  const location = parts[1] || '';
                  const title = parts[2] || '';
                  const dates = parts[3] || '';

                  let start_date = '';
                  let end_date = '';
                  if (dates) {
                    const dateParts = dates.split(/[–-]/).map(d => d.trim());
                    start_date = dateParts[0] || '';
                    end_date = dateParts[1] || '';
                  }

                  currentExp = {
                    company,
                    title,
                    location,
                    start_date,
                    end_date,
                    description: ''
                  };
                  descLines = [];
                } else if (t) {
                  descLines.push(t.replace(/^([-•*·]|\d+\.)\s*/, ''));
                }
              });

              if (currentExp) {
                currentExp.description = descLines.join('\n');
                parsedExperiences.push(currentExp);
              }
            }
          }

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

        if (items.length === 0) {
          toast.error('Invalid JSON Format', {
            description: 'Provide an array of shortcut objects or a key-value object.'
          });
          return;
        }

        let importCount = 0;
        const loadingToast = toast.loading(`Importing ${items.length} shortcuts...`);

        for (const item of items) {
          try {
            await createSnippet({
              shortcut: item.shortcut,
              text: item.text,
              category: item.category || 'General'
            });
            importCount++;
          } catch (err) {
            console.error('Failed to import shortcut:', item.shortcut, err);
          }
        }

        toast.dismiss(loadingToast);
        toast.success('Import Complete', {
          description: `Successfully imported ${importCount} of ${items.length} shortcuts.`
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

  useEffect(() => {
    fetchSnippets().finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(snippets.map(s => s.category || 'General'));
    return ['All', ...Array.from(cats)];
  }, [snippets]);

  const filteredAndSorted = useMemo(() => {
    let list = snippets;
    if (activeCategory !== 'All') {
      list = snippets.filter(s => (s.category || 'General') === activeCategory);
    }
    const filtered = list.filter(s => 
      s.shortcut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.text?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aPinned = a.is_pinned ? 1 : 0;
      const bPinned = b.is_pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [snippets, searchTerm, activeCategory]);

  const profileShortcutsList = useMemo(() => {
    if (!activeProfile) return [];
    
    const { experience, education, email, full_name, name, phone, linkedin_url, location } = activeProfile;
    const firstName = (full_name || name || '').trim().split(/\s+/)[0];
    const p = (firstName ? firstName[0] : 'p').toLowerCase();
    
    const list: { id: string; shortcut: string; text: string; label: string }[] = [];
    
    const add = (shortcut: string, text: string | null | undefined, label: string) => {
      if (text && text.trim()) {
        list.push({ id: `profile-${shortcut}`, shortcut, text: text.trim(), label });
      }
    };
    
    add(`${p}gm`, email, 'Profile Email');
    add(`${p}n;`, full_name || name, 'Profile Name');
    add(`${p}p;`, phone, 'Profile Phone');
    add(`${p}l;`, linkedin_url, 'Profile LinkedIn');
    add('st;', location, 'Profile Location');
    
    const experiencesList = experience || [];
    experiencesList.forEach((exp, idx) => {
      const num = idx + 1;
      add(`rl${num}`, exp.title, `Exp ${num} Role`);
      add(`cp${num}`, exp.company, `Exp ${num} Company`);
      if (exp.description?.trim()) {
        const cleanDesc = exp.description
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => line.replace(/^([-•*·]|\d+\.)\s*/, ''))
          .map(line => `- ${line}`)
          .join('\n');
        add(`exp${num}`, cleanDesc, `Exp ${num} Bullets`);
      }
    });
    
    const educationsList = education || [];
    educationsList.forEach((edu, idx) => {
      const num = idx + 1;
      add(`edu${num}`, edu.school, `Edu ${num} School`);
      add(`deg${num}`, edu.degree, `Edu ${num} Degree`);
      add(`major${num}`, edu.field_of_study, `Edu ${num} Major`);
    });
    
    return list;
  }, [activeProfile]);

  const filteredProfileShortcuts = useMemo(() => {
    if (!searchTerm) return profileShortcutsList;
    return profileShortcutsList.filter(s => 
      s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profileShortcutsList, searchTerm]);

  const handleTogglePin = async (item: any) => {
    const isCurrentlyPinned = !!item.is_pinned;
    if (!isCurrentlyPinned) {
      const pinnedCount = snippets.filter(s => s.is_pinned).length;
      if (pinnedCount >= 5) {
        toast.error('Pin Limit Exceeded', {
          description: 'You can only pin up to 5 shortcuts.'
        });
        return;
      }
    }
    
    try {
      await updateSnippet(item.id, { is_pinned: !isCurrentlyPinned });
      toast.success(isCurrentlyPinned ? 'Shortcut unpinned' : 'Shortcut pinned');
    } catch (err) {
      toast.error('Failed to update pin state');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Search & Action */}
      <div className="space-y-4">
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
              onClick={() => setIsAdding(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Shortcut
            </Button>
          </div>
        </div>


        {/* Categories Filter Tabs */}
        {categories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all border whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-white/5 border-graphite text-accent'
                    : 'bg-carbon border-graphite text-ash hover:text-mist hover:border-smoke'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search your custom shortcuts..."
            className="w-full pl-12 pr-4 py-2.5 bg-carbon border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Profile Shortcuts (If active) */}
      {filteredProfileShortcuts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-accent pl-2">
            {activeProfile?.name || 'Active'} Profile Shortcuts
          </h4>
          <div className="grid gap-3">
            {filteredProfileShortcuts.map((item) => (
              <div
                key={item.id}
                className="group p-4 bg-carbon border border-graphite rounded-md hover:border-smoke hover:bg-obsidian transition-all cursor-pointer relative overflow-hidden"
                onClick={() => handleShortcutClick(item.text, item.shortcut)}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <span className="text-xs font-bold text-accent-light">
                        {item.shortcut}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-ash">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-xs text-mist truncate pr-10">{item.text}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.text, item.shortcut);
                      }}
                      className="p-2 text-muted hover:text-accent-light transition-all"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfileItem(item);
                        setProfileEditValue(item.text);
                      }}
                      className="p-2 text-muted hover:text-white"
                      title="Edit profile shortcut"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Snippets Only */}
      <div className="space-y-3">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted pl-2">
          Custom Vault Shortcuts
        </h4>
        <div className="grid gap-3">
        {filteredAndSorted.length === 0 ? (
          <div className="py-12 border border-dashed border-graphite rounded-md flex flex-col items-center justify-center">
            <Hash className="w-8 h-8 mb-3 text-graphite" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ash">No manual shortcuts found</p>
          </div>
        ) : (
          filteredAndSorted.map((item: any) => (
            <div
              key={item.id}
              className="group p-4 bg-carbon border border-graphite rounded-md hover:border-smoke hover:bg-obsidian transition-all cursor-pointer relative overflow-hidden"
              onClick={() => handleShortcutClick(item.text, item.shortcut)}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <span className="text-xs font-bold text-accent-light">
                      {item.shortcut}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ash">
                        User Shortcut {item.is_pinned && '• Pinned'}
                      </span>
                    </div>
                    <p className="text-xs text-mist truncate pr-10">{item.text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Pin Toggle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(item);
                    }}
                    className={`p-2 transition-all ${
                      item.is_pinned 
                        ? 'text-accent opacity-100' 
                        : 'text-muted hover:text-white opacity-0 group-hover:opacity-100'
                    }`}
                    title={item.is_pinned ? 'Unpin shortcut' : 'Pin shortcut (max 5)'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${item.is_pinned ? 'fill-current text-accent' : ''}`} />
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.text, item.shortcut);
                      }}
                      className="p-2 text-muted hover:text-accent-light transition-all"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSnippet(item);
                      }}
                      className="p-2 text-muted hover:text-white"
                      title="Edit shortcut"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(item.id);
                      }}
                      className="p-2 text-muted hover:text-red-400"
                      title="Delete shortcut"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Confirm Deletion"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                if (deletingId) {
                  deleteSnippet(deletingId);
                  setDeletingId(null);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          Are you sure you want to delete this shortcut? This action cannot be undone and will immediately remove the expansion from all job portals.
        </p>
      </Modal>

      {editingProfileItem && (
        <Modal
          isOpen={!!editingProfileItem}
          onClose={() => setEditingProfileItem(null)}
          title={`Edit ${editingProfileItem.label}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditingProfileItem(null)}>Cancel</Button>
              <Button variant="secondary" size="sm" onClick={handleSaveProfileShortcut}>Save</Button>
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
      )}

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
