import React, { useState } from 'react';
import { useSnippets } from '../hooks/useSnippets';
import { X, Save, Loader2, Hash, Type } from 'lucide-react';

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col w-full max-w-[450px] mx-auto bg-[#0A0A0A] border-x border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-10 pb-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/20">
              <Hash className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black tracking-tight text-white">
                {snippet ? 'Modify Sequence' : 'Establish Sequence'}
              </h3>
              <p className="text-[9px] font-mono text-muted uppercase tracking-widest">Macro Buffer Encryption: Active</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5 text-muted" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            
            {/* Shortcut Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Trigger Shortcut</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                <input
                  required
                  placeholder="e.g. name"
                  className="w-full pl-12 pr-4 py-4 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm font-mono text-accent-light placeholder:text-muted/30 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                />
              </div>
              <p className="text-[9px] font-medium text-muted/50 ml-1">Typing this trigger word + Space/Enter will execute expansion.</p>
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Payload Content</label>
              <div className="relative group">
                <Type className="absolute left-4 top-6 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                <textarea
                  required
                  rows={8}
                  placeholder="Insert the content for this trigger..."
                  className="w-full pl-12 pr-4 py-5 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm text-white placeholder:text-muted/30 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all resize-none leading-relaxed"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                />
              </div>
            </div>

            {/* Category Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Vault Category</label>
              <input
                placeholder="e.g. Professional"
                className="w-full px-5 py-4 bg-[#0A0A0A] border border-white/5 rounded-2xl text-xs text-white placeholder:text-muted/30 focus:outline-none focus:border-accent/40 transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-[#0A0A0A] border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="w-full group bg-accent hover:bg-accent-light text-white py-4 rounded-2xl font-display font-black tracking-tight text-lg shadow-accent-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Update Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
