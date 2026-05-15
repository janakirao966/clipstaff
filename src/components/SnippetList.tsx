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
    <div className="flex flex-col h-full bg-white">
      <div className="p-md space-y-md border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-bold text-accent">Snippets</h2>
          <button
            onClick={() => setIsAdding(true)}
            className="p-1.5 bg-accent text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shortcuts or text..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {snippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-xl text-center space-y-sm">
            <Hash className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">No snippets created yet.</p>
            <p className="text-xs text-slate-400">Add common phrases to expand them instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="flex items-center justify-between p-md hover:bg-slate-50 transition-colors group"
              >
                <div className="flex flex-col min-w-0 pr-md">
                  <span className="text-sm font-bold text-accent font-mono tracking-tight">
                    {snippet.shortcut}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate leading-relaxed">
                    {snippet.text}
                  </span>
                </div>
                <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(snippet.text, snippet.id, snippet.shortcut)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md"
                      title="Copy to clipboard"
                    >
                      {copiedId === snippet.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingSnippet(snippet)}
                      className="p-1.5 text-slate-400 hover:text-accent hover:bg-white rounded-md"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete snippet "/${snippet.shortcut}"?`)) {
                          deleteSnippet(snippet.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-destructive hover:bg-white rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {snippet.text}
                </p>
                <div className="flex items-center gap-xs text-[10px] text-slate-400 font-medium">
                  <span className="px-1.5 py-0.5 border border-slate-200 rounded uppercase">
                    {snippet.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
