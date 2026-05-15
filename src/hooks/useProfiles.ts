import { supabase } from '../lib/supabase';
import { useStore, Profile } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';

export const useProfiles = () => {
  const { user } = useAuth();
  const { 
    setProfiles, 
    setActiveProfile, 
    addProfile, 
    updateProfileInStore, 
    deleteProfileFromStore 
  } = useStore();

  const fetchProfiles = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setProfiles(data || []);
    
    const active = data?.find(p => p.is_active);
    if (active) setActiveProfile(active);
  };

  const createProfile = async (profile: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    // If new profile is active, unset others first
    if (profile.is_active) {
      await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert([{ ...profile, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    addProfile(data);
    if (data.is_active) setActiveProfile(data);
    return data;
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    if (!user) return;

    // If setting to active, unset others first
    if (updates.is_active) {
      await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    updateProfileInStore(data);
    return data;
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    deleteProfileFromStore(id);
  };

  const toggleActiveProfile = async (id: string) => {
    if (!user) return;

    // 1. Unset all
    await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // 2. Set target
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // 3. Refresh local store (simpler than manual update of all items)
    await fetchProfiles();
    return data;
  };

  return {
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleActiveProfile
  };
};
