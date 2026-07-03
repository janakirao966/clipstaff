import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile, Snippet, Job } from '../types';

interface ProfileSlice {
  profiles: Profile[];
  activeProfile: Profile | null;
  profileTriggers: Record<string, string>;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile | null) => void;
  addProfile: (profile: Profile) => void;
  updateProfileInStore: (profile: Profile) => void;
  deleteProfileFromStore: (id: string) => void;
  updateProfileTrigger: (key: string, trigger: string) => void;
}

interface SnippetSlice {
  snippets: Snippet[];
  dynamicShortcuts: Record<string, string>;
  resumeText: string;
  searchTerm: string;
  setSnippets: (snippets: Snippet[]) => void;
  setDynamicShortcuts: (shorts: Record<string, string>) => void;
  setResumeText: (text: string) => void;
  setSearchTerm: (term: string) => void;
  addSnippet: (snippet: Snippet) => void;
  updateSnippetInStore: (snippet: Snippet) => void;
  deleteSnippetFromStore: (id: string) => void;
  resetStore: () => void;
}

interface JobSlice {
  spreadsheetUrl: string;
  jobs: Job[];
  setSpreadsheetUrl: (url: string) => void;
  setJobs: (jobs: Job[]) => void;
  updateJobStatus: (url: string, status: Job['status']) => void;
}

interface EligibilitySlice {
  geminiApiKey: string;
  checkerJdText: string;
  lastEligibilityResult: any;
  setGeminiApiKey: (key: string) => void;
  setCheckerJdText: (text: string) => void;
  setLastEligibilityResult: (result: any) => void;
}

export const useStore = create<ProfileSlice & SnippetSlice & JobSlice & EligibilitySlice>()(
  persist(
    (set) => ({
      // Profile Slice
      profiles: [],
      activeProfile: null,
      profileTriggers: {
        full_name: 'name;',
        first_name: 'fname;',
        middle_name: 'mname;',
        last_name: 'lname;',
        email: 'email;',
        phone: 'phone;',
        linkedin_url: 'linkedin;',
        portfolio_url: 'portfolio;',
        location: 'location;',
        street_address: 'street;',
        city: 'city;',
        state: 'state;',
        pin_code: 'pincode;',
        professional_subtitle: 'title;',
        password: 'pwd;'
      },
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
      updateProfileTrigger: (key, trigger) => set((state) => ({
        profileTriggers: { ...state.profileTriggers, [key]: trigger }
      })),

      // Snippet Slice
      snippets: [],
      dynamicShortcuts: {},
      resumeText: '',
      searchTerm: '',
      setSnippets: (snippets) => set({ snippets }),
      setDynamicShortcuts: (dynamicShortcuts) => set({ dynamicShortcuts }),
      setResumeText: (resumeText) => set({ resumeText }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      addSnippet: (snippet) => set((state) => ({ snippets: [...state.snippets, snippet] })),
      updateSnippetInStore: (updated) => set((state) => ({
        snippets: state.snippets.map((s) => s.id === updated.id ? updated : s)
      })),
      deleteSnippetFromStore: (id) => set((state) => ({
        snippets: state.snippets.filter((s) => s.id !== id)
      })),

      // Job Slice
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1zhdK9LJ8z0RLZmRv7TqirPTUuFAcfy9ENigLYnNTLsA/edit?usp=sharing',
      jobs: [],
      setSpreadsheetUrl: (spreadsheetUrl) => set({ spreadsheetUrl }),
      setJobs: (jobs) => set({ jobs }),
      updateJobStatus: (url, status) => set((state) => ({
        jobs: state.jobs.map((job) => job.url === url ? { ...job, status } : job)
      })),

      // Eligibility Slice
      geminiApiKey: '',
      checkerJdText: '',
      lastEligibilityResult: null,
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      setCheckerJdText: (checkerJdText) => set({ checkerJdText }),
      setLastEligibilityResult: (lastEligibilityResult) => set({ lastEligibilityResult }),

      resetStore: () => set({
        profiles: [],
        activeProfile: null,
        profileTriggers: {
          full_name: 'name;',
          first_name: 'fname;',
          middle_name: 'mname;',
          last_name: 'lname;',
          email: 'email;',
          phone: 'phone;',
          linkedin_url: 'linkedin;',
          portfolio_url: 'portfolio;',
          location: 'location;',
          street_address: 'street;',
          city: 'city;',
          state: 'state;',
          pin_code: 'pincode;',
          professional_subtitle: 'title;',
          password: 'pwd;'
        },
        snippets: [],
        dynamicShortcuts: {},
        resumeText: '',
        searchTerm: '',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1zhdK9LJ8z0RLZmRv7TqirPTUuFAcfy9ENigLYnNTLsA/edit?usp=sharing',
        jobs: [],
        geminiApiKey: '',
        checkerJdText: '',
        lastEligibilityResult: null,
      }),
    }),
    {
      name: 'clipstaff-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        if (version === 0 && persistedState && persistedState.profileTriggers) {
          const triggers = persistedState.profileTriggers;
          const updatedTriggers = { ...triggers };
          Object.keys(updatedTriggers).forEach((key) => {
            const val = updatedTriggers[key];
            if (typeof val === 'string' && val.startsWith(';')) {
              updatedTriggers[key] = val.substring(1) + ';';
            }
          });
          persistedState.profileTriggers = updatedTriggers;
        }
        return persistedState;
      },
      // Only persist these specific fields to avoid conflicts with Supabase data
      partialize: (state) => ({ 
        resumeText: state.resumeText,
        activeProfile: state.activeProfile,
        searchTerm: state.searchTerm,
        profileTriggers: state.profileTriggers,
        spreadsheetUrl: state.spreadsheetUrl,
        jobs: state.jobs,
        geminiApiKey: state.geminiApiKey,
        checkerJdText: state.checkerJdText,
        lastEligibilityResult: state.lastEligibilityResult
      }),
    }
  )
);
