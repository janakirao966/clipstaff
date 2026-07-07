-- Add is_pinned column to snippets table to support pinning shortcuts
ALTER TABLE public.snippets 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
