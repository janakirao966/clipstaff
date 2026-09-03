import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useSnippets } from '../../hooks/useSnippets';
import { handleShortcutClick } from '../../lib/clipboard';
import { toast } from 'sonner';
import { Search, Pin, Copy, Edit2, Trash2, Hash } from 'lucide-react';
import { Button } from '../ui';
import { Modal } from '../ui/Modal';
import { Snippet } from '../../types';

interface SnippetListProps {
  onCopy: (text: string, shortcut: string) => void;
  onEditProfile: (item: any) => void;
  onEditSnippet: (item: Snippet) => void;
}

export const SnippetList = ({
  onCopy,
  onEditProfile,
  onEditSnippet
}: SnippetListProps) => {
  const snippets = useStore(state => state.snippets);
  const searchTerm = useStore(state => state.searchTerm);
  const setSearchTerm = useStore(state => state.setSearchTerm);
  const activeProfile = useStore(state => state.activeProfile);
  const { deleteSnippet, updateSnippet } = useSnippets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  const handleShortcutClickLocal = async (text: string | null | undefined, shortcut: string) => {
    if (!text) return;
    await handleShortcutClick(text, shortcut);
    setCopiedShortcut(shortcut);
    onCopy(text, shortcut);
    setTimeout(() => setCopiedShortcut(null), 1500);
  };

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

    const certsList = activeProfile.certifications || [];
    certsList.forEach((cert, idx) => {
      const num = idx + 1;
      add(`cert${num}`, cert, `Cert ${num}`);
    });
    if (certsList.length > 0) {
      add('certs;', certsList.map(c => `- ${c}`).join('\n'), 'All Certifications');
    }
    
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

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dupes: any[] = [];
    
    profileShortcutsList.forEach(ps => {
      seen.add(ps.shortcut.trim().toLowerCase());
    });

    snippets.forEach(s => {
      const norm = s.shortcut.trim().toLowerCase();
      if (seen.has(norm)) {
        dupes.push(s);
      } else {
        seen.add(norm);
      }
    });
    return dupes;
  }, [snippets, profileShortcutsList]);

  const handleDeduplicate = async () => {
    const loadingToast = toast.loading('Cleaning up duplicate shortcuts...');
    try {
      const seen = new Set<string>();
      const toDelete: string[] = [];

      profileShortcutsList.forEach(ps => {
        seen.add(ps.shortcut.trim().toLowerCase());
      });

      const sorted = [...snippets].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      for (const s of sorted) {
        const norm = s.shortcut.trim().toLowerCase();
        if (seen.has(norm)) {
          toDelete.push(s.id);
        } else {
          seen.add(norm);
        }
      }

      if (toDelete.length === 0) {
        toast.dismiss(loadingToast);
        toast.success('No duplicates found');
        return;
      }

      for (const id of toDelete) {
        await deleteSnippet(id);
      }

      toast.dismiss(loadingToast);
      toast.success('Clean Up Complete', {
        description: `Successfully removed ${toDelete.length} duplicate/redundant shortcut(s) from your vault.`
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Clean Up Failed', {
        description: err.message || 'An error occurred during deduplication.'
      });
    }
  };

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

  return (
    <div className="space-y-6">
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

      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
        <input
          type="text"
          placeholder="Search your custom shortcuts..."
          className="w-full pl-12 pr-4 py-2.5 bg-carbon border border-graphite rounded-xl text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Duplicate warning banner */}
      {duplicates.length > 0 && (
        <div className="p-3 bg-coral-red/5 border border-coral-red/20 rounded-xl flex items-center justify-between gap-3 text-xs text-mist animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-coral-red/10 rounded-lg flex items-center justify-center border border-coral-red/20">
              <span className="text-coral-red font-bold">!</span>
            </div>
            <div>
              <p className="font-semibold text-white text-[11px]">Duplicate Shortcuts Found</p>
              <p className="text-[10px] text-ash">You have {duplicates.length} duplicate shortcut trigger(s).</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeduplicate}
            className="text-[9px] font-bold border border-coral-red/30 text-coral-red hover:bg-coral-red/15 hover:border-coral-red/50 animate-pulse hover:animate-none"
          >
            Clean Up
          </Button>
        </div>
      )}

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
                className={`group p-4 bg-carbon border transition-all cursor-pointer relative overflow-hidden rounded-xl ${
                  copiedShortcut === item.shortcut
                    ? 'border-accent/40 bg-accent/[0.02] shadow-[0_0_15px_rgba(228,242,34,0.15)]'
                    : 'border-graphite hover:border-smoke hover:bg-obsidian'
                }`}
                onClick={() => handleShortcutClickLocal(item.text, item.shortcut)}
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

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShortcutClickLocal(item.text, item.shortcut);
                      }}
                      className="p-2 text-ash hover:text-accent-light transition-all"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProfile(item);
                      }}
                      className="p-2 text-ash hover:text-white transition-all"
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
              className={`group p-4 bg-carbon border transition-all cursor-pointer relative overflow-hidden rounded-xl ${
                copiedShortcut === item.shortcut
                  ? 'border-accent/40 bg-accent/[0.02] shadow-[0_0_15px_rgba(228,242,34,0.15)]'
                  : 'border-graphite hover:border-smoke hover:bg-obsidian'
              }`}
              onClick={() => handleShortcutClickLocal(item.text, item.shortcut)}
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
                        : 'text-ash hover:text-white opacity-60 group-hover:opacity-100'
                    }`}
                    title={item.is_pinned ? 'Unpin shortcut' : 'Pin shortcut (max 5)'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${item.is_pinned ? 'fill-current text-accent' : ''}`} />
                  </button>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShortcutClickLocal(item.text, item.shortcut);
                      }}
                      className="p-2 text-ash hover:text-accent-light transition-all"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSnippet(item);
                      }}
                      className="p-2 text-ash hover:text-white transition-all"
                      title="Edit shortcut"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(item.id);
                      }}
                      className="p-2 text-ash hover:text-coral-red transition-all"
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
              onClick={async () => {
                if (deletingId) {
                  try {
                    await deleteSnippet(deletingId);
                    toast.success('Shortcut deleted successfully');
                  } catch (e: any) {
                    console.error('Failed to delete snippet:', e);
                    toast.error('Failed to delete shortcut', { description: e.message || String(e) });
                  }
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
    </div>
  );
};
