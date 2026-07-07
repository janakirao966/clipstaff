import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Profile } from '../types';
import { useAuth } from './useAuth';

export const useProfiles = () => {
  const { user } = useAuth();
  const { 
    setProfiles, 
    setActiveProfile 
  } = useStore();

  const fetchProfile = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (error) throw error;
    
    const profile = data?.[0] || null;
    if (profile) {
      setProfiles([profile]);
      setActiveProfile(profile);
    }
    return profile;
  }, [user, setProfiles, setActiveProfile]);

  const saveProfile = useCallback(async (updates: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      // Update
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, is_active: true })
        .eq('id', existing[0].id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ ...updates, user_id: user.id, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    setProfiles([result]);
    setActiveProfile(result);
    return result;
  }, [user, setProfiles, setActiveProfile]);

  return {
    fetchProfile,
    saveProfile
  };
};
