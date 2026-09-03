import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Profile } from '../types';
import { useAuth } from './useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { syncShortcutsToStorage } from '../lib/sync';

export const useProfiles = () => {
  const { user } = useAuth();
  const setProfiles = useStore(state => state.setProfiles);
  const setActiveProfile = useStore(state => state.setActiveProfile);
  const activeProfile = useStore(state => state.activeProfile);
  const profiles = useStore(state => state.profiles);

  const fetchProfile = useCallback(async () => {
    if (!user) return null;

    if (!isSupabaseConfigured || user.id === 'local-user') {
      const current = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);
      return current;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;
      
      const profile = data?.[0] || null;
      if (profile) {
        const currentProfiles = useStore.getState().profiles || [];
        const exists = currentProfiles.some(p => p.id === profile.id);
        const updatedProfiles = exists 
          ? currentProfiles.map(p => p.id === profile.id ? profile : p)
          : [...currentProfiles, profile];

        setProfiles(updatedProfiles);
        setActiveProfile(profile);

        // Sync fetched profile shortcuts to local storage and all tabs
        const state = useStore.getState();
        syncShortcutsToStorage(
          state.snippets,
          state.dynamicShortcuts,
          profile,
          state.profileTriggers,
          updatedProfiles
        );
      }
      return profile;
    } catch (e) {
      console.warn('ClipStaff: Falling back to local profile store:', e);
      return activeProfile;
    }
  }, [user, activeProfile, profiles, setProfiles, setActiveProfile]);

  const saveProfile = useCallback(async (updates: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }) => {
    const currentUserId = user?.id || 'local-user';

    const localProfile: Profile = {
      id: updates.id || activeProfile?.id || `profile-${Date.now()}`,
      user_id: currentUserId,
      created_at: activeProfile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: updates.name || updates.full_name || 'Candidate Profile',
      full_name: updates.full_name || updates.name || '',
      first_name: updates.first_name || '',
      middle_name: updates.middle_name || '',
      last_name: updates.last_name || '',
      email: updates.email || '',
      phone: updates.phone || '',
      linkedin_url: updates.linkedin_url || '',
      portfolio_url: updates.portfolio_url || '',
      location: updates.location || '',
      street_address: updates.street_address || '',
      city: updates.city || '',
      state: updates.state || '',
      pin_code: updates.pin_code || '',
      professional_subtitle: updates.professional_subtitle || '',
      password: updates.password || '',
      experience: updates.experience || [],
      education: updates.education || [],
      certifications: updates.certifications || [],
      is_active: true
    };

    // If Supabase is configured and authenticated, sync remotely
    if (isSupabaseConfigured && currentUserId !== 'local-user') {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', currentUserId)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('profiles')
            .update({ ...updates, is_active: true })
            .eq('id', existing[0].id);
        } else {
          await supabase
            .from('profiles')
            .insert([{ ...updates, user_id: currentUserId, is_active: true }]);
        }
      } catch (e) {
        console.warn('ClipStaff: Failed to sync profile to Supabase, saving locally:', e);
      }
    }

    // Update in-memory profiles array immutably
    const currentProfiles = useStore.getState().profiles || [];
    const idx = currentProfiles.findIndex(p => p.id === localProfile.id || (p.name && p.name === localProfile.name));
    let updatedProfiles: Profile[];
    if (idx >= 0) {
      updatedProfiles = currentProfiles.map((p, i) => i === idx ? localProfile : p);
    } else {
      updatedProfiles = [...currentProfiles, localProfile];
    }

    setProfiles(updatedProfiles);
    setActiveProfile(localProfile);

    // Sync all shortcuts to Chrome local storage and open tabs immediately
    const state = useStore.getState();
    syncShortcutsToStorage(
      state.snippets,
      state.dynamicShortcuts,
      localProfile,
      state.profileTriggers,
      updatedProfiles
    );

    return localProfile;
  }, [user, activeProfile, setProfiles, setActiveProfile]);

  const deleteProfile = useCallback(async (profileId: string) => {
    if (isSupabaseConfigured && user && user.id !== 'local-user') {
      try {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', profileId);
      } catch (e) {
        console.warn('ClipStaff: Failed to delete profile from Supabase:', e);
      }
    }

    const currentProfiles = useStore.getState().profiles || [];
    const remainingProfiles = currentProfiles.filter(p => p.id !== profileId);
    setProfiles(remainingProfiles);

    const currentActive = useStore.getState().activeProfile;
    let nextActive: Profile | null = null;
    if (currentActive?.id === profileId) {
      nextActive = remainingProfiles.length > 0 ? remainingProfiles[0] : null;
      setActiveProfile(nextActive);
    } else {
      nextActive = currentActive;
    }

    const state = useStore.getState();
    syncShortcutsToStorage(
      state.snippets,
      state.dynamicShortcuts,
      nextActive,
      state.profileTriggers,
      remainingProfiles
    );
  }, [user, setProfiles, setActiveProfile]);

  const clearActiveProfile = useCallback(() => {
    setActiveProfile(null);
    const state = useStore.getState();
    syncShortcutsToStorage(
      state.snippets,
      state.dynamicShortcuts,
      null,
      state.profileTriggers,
      state.profiles
    );
  }, [setActiveProfile]);

  return {
    fetchProfile,
    saveProfile,
    deleteProfile,
    clearActiveProfile
  };
};
