import { create } from 'zustand';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  visa_status: string | null;
  notice_period: string | null;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface Snippet {
  id: string;
  user_id: string;
  shortcut: string;
  text: string;
  category: string;
  created_at: string;
}

interface ProfileSlice {
  profiles: Profile[];
  activeProfile: Profile | null;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile | null) => void;
  addProfile: (profile: Profile) => void;
  updateProfileInStore: (profile: Profile) => void;
  deleteProfileFromStore: (id: string) => void;
}

interface SnippetSlice {
  snippets: Snippet[];
  searchTerm: string;
  setSnippets: (snippets: Snippet[]) => void;
  setSearchTerm: (term: string) => void;
  addSnippet: (snippet: Snippet) => void;
  updateSnippetInStore: (snippet: Snippet) => void;
  deleteSnippetFromStore: (id: string) => void;
}

export const useStore = create<ProfileSlice & SnippetSlice>()((set) => ({
  // Profile Slice
  profiles: [],
  activeProfile: null,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (activeProfile) => set({ activeProfile }),
  addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
  updateProfileInStore: (updated) => set((state) => ({
    profiles: state.profiles.map((p) => p.id === updated.id ? updated : p),
    activeProfile: state.activeProfile?.id === updated.id ? updated : state.activeProfile
  })),
  deleteProfileFromStore: (id) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== id),
    activeProfile: state.activeProfile?.id === id ? null : state.activeProfile
  })),

  // Snippet Slice
  snippets: [],
  searchTerm: '',
  setSnippets: (snippets) => set({ snippets }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  addSnippet: (snippet) => set((state) => ({ snippets: [...state.snippets, snippet] })),
  updateSnippetInStore: (updated) => set((state) => ({
    snippets: state.snippets.map((s) => s.id === updated.id ? updated : s)
  })),
  deleteSnippetFromStore: (id) => set((state) => ({
    snippets: state.snippets.filter((s) => s.id !== id)
  })),
}));
