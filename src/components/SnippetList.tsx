import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSnippets } from '../hooks/useSnippets';
import { copyToClipboard } from '../lib/clipboard';
import { 
  Hash, Plus, Edit2, Trash2, Search, Copy, Check, Loader2 
} from 'lucide-react';
import { SnippetDetail } from './SnippetDetail';

export const SnippetList = () => {
  const { snippets } = useStore();
  const { fetchSnippets, deleteSnippet } = useSnippets();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSnippets().finally(() => setLoading(false));
  }, []);

  const handleCopy = async (text: string, id: string, shortcut: string) => {
    await copyToClipboard(text, shortcut);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search and Action Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Snippet Vault</h2>
          <button
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-accent text-muted hover:text-white rounded-xl border border-white/5 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative group px-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search shortcut or content..."
            className="w-full pl-12 pr-4 py-4 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Snippet Grid */}
      <div className="space-y-3 px-1 pb-24">
        {snippets.length === 0 ? (
          <div className="py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-muted">
            <Hash className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Vault Empty</p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group p-5 bg-[#0A0A0A]/50 border border-white/5 rounded-2xl hover:border-white/20 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-mono font-black text-accent-light tracking-tight">
                      {snippet.shortcut}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-mono text-muted uppercase tracking-tighter">Shortcut</span>
                  </div>
                  <p className="text-[11px] text-muted truncate font-medium opacity-70 leading-relaxed">
                    {snippet.text}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={() => handleCopy(snippet.text, snippet.id, snippet.shortcut)}
                    className="p-2.5 text-muted hover:text-emerald-400 hover:bg-emerald-400/5 rounded-xl transition-colors"
                    title="Copy"
                  >
                    {copiedId === snippet.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingSnippet(snippet)}
                    className="p-2.5 text-muted hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Purge snippet "${snippet.shortcut}"?`)) {
                        deleteSnippet(snippet.id);
                      }
                    }}
                    className="p-2.5 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Border */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
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
