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
        <div className="flex-1 overflow-y-auto p-md space-y-md">
          <div className="space-y-xs">
            <label className="text-label text-slate-500 font-medium uppercase tracking-wider">Shortcut</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">/</span>
              <input
                required
                className="w-full pl-7 pr-4 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none font-mono text-sm"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                placeholder="my-name"
              />
            </div>
            <p className="text-[10px] text-slate-400">Unique identifier for expansion (e.g. /name)</p>
          </div>

          <div className="space-y-xs">
            <label className="text-label text-slate-500 font-medium uppercase tracking-wider">Expanded Text</label>
            <textarea
              required
              rows={6}
              className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none text-sm resize-none"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="The text to insert when shortcut is typed..."
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
