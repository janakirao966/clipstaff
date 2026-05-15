import { supabase } from '../lib/supabase';
import { useStore, Snippet } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';

export const useSnippets = () => {
  const { user } = useAuth();
  const { 
    setSnippets, 
    addSnippet, 
    updateSnippetInStore, 
    deleteSnippetFromStore 
  } = useStore();

  const fetchSnippets = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('snippets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setSnippets(data || []);
  };

  const createSnippet = async (snippet: Omit<Snippet, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('snippets')
      .insert([{ ...snippet, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    addSnippet(data);
    return data;
  };

  const updateSnippet = async (id: string, updates: Partial<Snippet>) => {
    const { data, error } = await supabase
      .from('snippets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    updateSnippetInStore(data);
    return data;
  };

  const deleteSnippet = async (id: string) => {
    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    deleteSnippetFromStore(id);
  };

  return {
    fetchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet
  };
};
