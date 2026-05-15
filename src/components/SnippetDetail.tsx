import React, { useState } from 'react';
import { useSnippets } from '../hooks/useSnippets';
import { X, Save, Loader2 } from 'lucide-react';

interface SnippetDetailProps {
  snippet?: any;
  onClose: () => void;
}

export const SnippetDetail: React.FC<SnippetDetailProps> = ({ snippet, onClose }) => {
  const { createSnippet, updateSnippet } = useSnippets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shortcut: snippet?.shortcut || '',
    text: snippet?.text || '',
    category: snippet?.category || 'General',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (snippet) {
        await updateSnippet(snippet.id, formData);
      } else {
        await createSnippet(formData);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('unique')) {
        alert('Shortcut already exists!');
      } else {
        alert('Failed to save snippet');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-2 duration-200">
      <header className="flex items-center justify-between p-md border-b border-slate-100">
        <h3 className="text-lg font-bold text-accent">
          {snippet ? 'Edit Snippet' : 'New Snippet'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-md space-y-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Shortcut</label>
            <div className="relative">
              <input
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent transition-all bg-slate-50/50"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                placeholder="e.g. name"
              />
            </div>
            <p className="text-[10px] text-slate-400">Type this word + Space on any site to expand it.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Expanded Text</label>
            <textarea
              required
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent transition-all bg-slate-50/50 resize-none text-sm leading-relaxed"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Enter the full text to insert..."
            />
          </div>

          <div className="space-y-xs">
            <label className="text-label text-slate-500 font-medium uppercase tracking-wider">Category</label>
            <input
              className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none text-sm"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Professional, Personal"
            />
          </div>
        </div>

        <div className="p-md border-t border-slate-100 bg-slate-50">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-sm bg-accent text-white py-2 rounded-md font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Snippet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
