import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSnippets } from '../hooks/useSnippets';
import { copyToClipboard } from '../lib/clipboard';
import { Search, Plus, Edit2, Trash2, Hash, Copy, Check, Loader2 } from 'lucide-react';
import { SnippetDetail } from './SnippetDetail';

export const SnippetList = () => {
  const { snippets, searchTerm, setSearchTerm } = useStore();
  const { fetchSnippets, deleteSnippet } = useSnippets();
  const [loading, setLoading] = useState(true);
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSnippets().finally(() => setLoading(false));
  }, []);

  const filteredSnippets = snippets.filter(s => 
    s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = async (text: string, id: string, shortcut: string) => {
    const success = await copyToClipboard(text, `/${shortcut}`);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="px-6 pt-8 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Snippet Vault</h2>
          <button
            onClick={() => setIsAdding(true)}
            className="w-8 h-8 flex items-center justify-center bg-accent/10 text-accent-light rounded-lg hover:bg-accent hover:text-white transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search shortcuts..."
            className="w-full pl-11 pr-4 py-3 bg-surface/40 border border-white/5 rounded-2xl text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 space-y-2">
        {snippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-4 border border-white/5">
              <Hash className="w-8 h-8 text-muted/30" />
            </div>
            <p className="text-sm font-medium text-muted">Your vault is empty</p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group flex items-center justify-between p-4 bg-surface/40 border border-white/5 rounded-2xl hover:border-white/20 hover:bg-surface/60 transition-all duration-300"
            >
              <div className="flex flex-col min-w-0 pr-4">
                <span className="text-sm font-mono font-bold text-accent-light tracking-tight mb-1">
                  {snippet.shortcut}
                </span>
                <span className="text-[11px] text-muted truncate leading-relaxed">
                  {snippet.text}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={() => handleCopy(snippet.text, snippet.id, snippet.shortcut)}
                  className="p-2 text-muted hover:text-emerald-400 hover:bg-emerald-400/5 rounded-lg transition-colors"
                  title="Copy"
                >
                  {copiedId === snippet.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setEditingSnippet(snippet)}
                  className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Purge snippet "${snippet.shortcut}"?`)) {
                      deleteSnippet(snippet.id);
                    }
                  }}
                  className="p-2 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
}
