import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Snippet } from '../types';
import { useAuth } from './useAuth';

export const useSnippets = () => {
  const { user } = useAuth();
  const { 
    setSnippets, 
    addSnippet, 
    updateSnippetInStore, 
    deleteSnippetFromStore 
  } = useStore();

  const fetchSnippets = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('snippets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setSnippets(data || []);
  }, [user, setSnippets]);

  const createSnippet = useCallback(async (snippet: Omit<Snippet, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('snippets')
      .insert([{ ...snippet, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    addSnippet(data);
    return data;
  }, [user, addSnippet]);

  const updateSnippet = useCallback(async (id: string, updates: Partial<Snippet>) => {
    const { data, error } = await supabase
      .from('snippets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    updateSnippetInStore(data);
    return data;
  }, [updateSnippetInStore]);

  const deleteSnippet = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    deleteSnippetFromStore(id);
  }, [deleteSnippetFromStore]);

  return {
    fetchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet
  };
};
