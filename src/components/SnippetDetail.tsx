import React, { useState } from 'react';
import { useSnippets } from '../hooks/useSnippets';
import { X, Save, Hash, Type } from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';

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
        toast.success('Shortcut Updated');
      } else {
        await createSnippet(formData);
        toast.success('Shortcut Created');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Save Failed', {
        description: err.message || 'The shortcut word might already exist.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col w-full max-w-[450px] mx-auto bg-[#0A0A0A] border-x border-white/5 overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="px-6 py-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Hash className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {snippet ? 'Edit Shortcut' : 'New Shortcut'}
              </h3>
              <p className="text-[9px] font-medium text-muted uppercase tracking-widest">Text expansion rule</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Shortcut Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Shortcut Word</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                <input
                  required
                  placeholder="e.g. msa"
                  className="w-full pl-12 pr-4 py-3.5 bg-black border border-white/5 rounded-xl text-sm font-mono text-accent-light placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s+/g, '').toLowerCase() })}
                />
              </div>
              <p className="text-[9px] font-medium text-muted/50 ml-1">Typing this word will instantly expand to the full text.</p>
            </div>

            {/* Content Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Expansion Text</label>
              <div className="relative group">
                <Type className="absolute left-4 top-5 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                <textarea
                  required
                  rows={8}
                  placeholder="Enter the full text to expand..."
                  className="w-full pl-12 pr-4 py-4 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                />
              </div>
            </div>

            {/* Category Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Category</label>
              <input
                placeholder="e.g. General"
                className="w-full px-5 py-3.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div className="p-6 border-t border-white/5">
            <Button
              type="submit"
              isLoading={loading}
              icon={<Save className="w-4 h-4" />}
              className="w-full py-4 text-sm font-bold tracking-widest"
            >
              SAVE SHORTCUT
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
