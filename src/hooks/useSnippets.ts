import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Snippet } from '../types';
import { useAuth } from './useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { syncShortcutsToStorage } from '../lib/sync';

export const useSnippets = () => {
  const { user } = useAuth();
  const setSnippets = useStore(state => state.setSnippets);

  const fetchSnippets = useCallback(async () => {
    const state = useStore.getState();
    if (!user) {
      syncShortcutsToStorage(state.snippets, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);
      return;
    }

    if (!isSupabaseConfigured || user.id === 'local-user') {
      syncShortcutsToStorage(state.snippets, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setSnippets(data);
        const currentState = useStore.getState();
        syncShortcutsToStorage(data, currentState.dynamicShortcuts, currentState.activeProfile, currentState.profileTriggers, currentState.profiles);
      }
    } catch (e) {
      console.warn('ClipStaff: Falling back to local snippets store:', e);
      const currentState = useStore.getState();
      syncShortcutsToStorage(currentState.snippets, currentState.dynamicShortcuts, currentState.activeProfile, currentState.profileTriggers, currentState.profiles);
    }
  }, [user, setSnippets]);

  const createSnippet = useCallback(async (snippet: Omit<Snippet, 'id' | 'user_id' | 'created_at'>) => {
    const currentUserId = user?.id || 'local-user';
    const cleanShortcut = (snippet.shortcut || '').trim().toLowerCase();
    const newSnippet: Snippet = {
      id: 'snippet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      user_id: currentUserId,
      shortcut: cleanShortcut,
      text: snippet.text,
      category: snippet.category || 'General',
      is_pinned: !!snippet.is_pinned,
      created_at: new Date().toISOString(),
    } as Snippet;

    const state = useStore.getState();
    const filtered = state.snippets.filter(s => (s.shortcut || '').trim().toLowerCase() !== cleanShortcut);
    const updatedSnippets = [...filtered, newSnippet];
    setSnippets(updatedSnippets);
    syncShortcutsToStorage(updatedSnippets, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);

    if (!isSupabaseConfigured || currentUserId === 'local-user') {
      return newSnippet;
    }

    try {
      const payload = {
        shortcut: cleanShortcut,
        text: snippet.text,
        category: snippet.category || 'General',
        user_id: currentUserId,
      };

      const { data, error } = await supabase
        .from('snippets')
        .upsert([payload], { onConflict: 'user_id,shortcut' })
        .select()
        .single();

      if (error) {
        console.error('ClipStaff: Supabase create snippet error:', error);
        return newSnippet;
      }
      
      const currentList = useStore.getState().snippets;
      const syncedList = currentList.map(s => s.id === newSnippet.id ? data : s);
      setSnippets(syncedList);
      syncShortcutsToStorage(syncedList, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);
      return data;
    } catch (e) {
      console.warn('ClipStaff: Saving snippet locally:', e);
      return newSnippet;
    }
  }, [user, setSnippets]);

  const updateSnippet = useCallback(async (id: string, updates: Partial<Snippet>) => {
    const cleanUpdates = {
      ...updates,
      ...(updates.shortcut ? { shortcut: updates.shortcut.trim().toLowerCase() } : {})
    };

    const state = useStore.getState();
    const existing = state.snippets.find(s => s.id === id);
    const updated = { ...existing, ...cleanUpdates } as Snippet;
    const updatedSnippets = state.snippets.map(s => s.id === id ? updated : s);
    setSnippets(updatedSnippets);
    syncShortcutsToStorage(updatedSnippets, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);

    if (!isSupabaseConfigured || !user || user.id === 'local-user') {
      return updated;
    }

    try {
      const { data, error } = await supabase
        .from('snippets')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const currentList = useStore.getState().snippets;
      const syncedList = currentList.map(s => s.id === id ? data : s);
      setSnippets(syncedList);
      syncShortcutsToStorage(syncedList, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);
      return data;
    } catch (e) {
      console.warn('ClipStaff: Updating snippet locally:', e);
      return updated;
    }
  }, [user, setSnippets]);

  const deleteSnippet = useCallback(async (id: string) => {
    const state = useStore.getState();
    const updatedSnippets = state.snippets.filter(s => s.id !== id);
    setSnippets(updatedSnippets);
    syncShortcutsToStorage(updatedSnippets, state.dynamicShortcuts, state.activeProfile, state.profileTriggers, state.profiles);

    if (!isSupabaseConfigured || !user || user.id === 'local-user') {
      return;
    }

    try {
      const { error } = await supabase
        .from('snippets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.warn('ClipStaff: Deleted snippet locally:', e);
    }
  }, [user, setSnippets]);

  return {
    fetchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet
  };
};
