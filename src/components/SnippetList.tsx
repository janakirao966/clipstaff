import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSnippets } from '../hooks/useSnippets';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy,
  Hash,
  Loader2
} from 'lucide-react';
import { SnippetDetail } from './SnippetDetail';
import { handleShortcutClick, copyToClipboard } from '../lib/clipboard';
import { Button } from './ui';

export const SnippetList = () => {
  const { snippets, searchTerm, setSearchTerm } = useStore();
  const { fetchSnippets, deleteSnippet } = useSnippets();
  const [loading, setLoading] = useState(true);
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchSnippets().finally(() => setLoading(false));
  }, [fetchSnippets]);

  const filteredSnippets = snippets.filter(s => 
    s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header & Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Shortcut Vault</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsAdding(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-[9px]"
          >
            New Shortcut
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search shortcuts or text..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Snippets Grid */}
      <div className="grid gap-3">
        {filteredSnippets.length === 0 ? (
          <div className="py-12 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-muted/30">
            <Hash className="w-10 h-10 mb-4 opacity-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No shortcuts found</p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => handleShortcutClick(snippet.text, snippet.shortcut)}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <span className="text-xs font-bold text-accent-light">{snippet.shortcut}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Shortcut: {snippet.shortcut}</span>
                    </div>
                    <p className="text-xs text-slate-200 truncate pr-4">{snippet.text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(snippet.text, snippet.shortcut);
                    }}
                    className="p-2 text-muted hover:text-accent-light transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSnippet(snippet);
                    }}
                    className="p-2 text-muted hover:text-white"
                    title="Edit shortcut"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete shortcut "${snippet.shortcut}"?`)) {
                        deleteSnippet(snippet.id);
                      }
                    }}
                    className="p-2 text-muted hover:text-red-400"
                    title="Delete shortcut"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
