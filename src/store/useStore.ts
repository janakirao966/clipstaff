import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Profile, Snippet, Job, SheetTab } from '../types';

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
  googleWebAppUrl: string;
  jobs: Job[];
  sheetTabs: SheetTab[];
  selectedSheetIdx: number;
  syncStatus: 'synced' | 'syncing' | 'error';
  dailyGoal: number;
  setSpreadsheetUrl: (url: string) => void;
  setGoogleWebAppUrl: (url: string) => void;
  setJobs: (jobs: Job[]) => void;
  setSheetTabs: (tabs: SheetTab[]) => void;
  setSelectedSheetIdx: (idx: number) => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'error') => void;
  setDailyGoal: (goal: number) => void;
  updateJobStatus: (url: string, status: Job['status']) => void;
}

interface EligibilitySlice {
  geminiApiKey: string;
  selectedGeminiModel: string;
  checkerJdText: string;
  lastEligibilityResult: any;
  globalExclusions: string[];
  sectorExclusions: string[];
  candidateExclusions: Record<string, string[]>;
  tailoredBullets: string[];
  tailoredCoverLetter: string;
  setGeminiApiKey: (key: string) => void;
  setSelectedGeminiModel: (model: string) => void;
  setCheckerJdText: (text: string) => void;
  setLastEligibilityResult: (result: any) => void;
  setGlobalExclusions: (exclusions: string[]) => void;
  setSectorExclusions: (sectors: string[]) => void;
  setCandidateExclusions: (exclusions: Record<string, string[]>) => void;
  setTailoredBullets: (bullets: string[]) => void;
  setTailoredCoverLetter: (letter: string) => void;
}

let isSelfStorageUpdate = false;

const chromeExtensionStorage: StateStorage = {
  getItem: (name: string): string | null | Promise<string | null> => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return localStorage.getItem(name);
    }
    return new Promise((resolve) => {
      chrome.storage.local.get([name], (result) => {
        resolve(result[name] || null);
      });
    });
  },
  setItem: (name: string, value: string): void | Promise<void> => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.setItem(name, value);
      return;
    }
    isSelfStorageUpdate = true;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [name]: value }, () => {
        setTimeout(() => {
          isSelfStorageUpdate = false;
        }, 60);
        resolve();
      });
    });
  },
  removeItem: (name: string): void | Promise<void> => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.removeItem(name);
      return;
    }
    isSelfStorageUpdate = true;
    return new Promise((resolve) => {
      chrome.storage.local.remove([name], () => {
        setTimeout(() => {
          isSelfStorageUpdate = false;
        }, 60);
        resolve();
      });
    });
  }
};

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
      setDynamicShortcuts: (dynamicShortcuts) => set((state) => {
        const prevKeys = Object.keys(state.dynamicShortcuts);
        const nextKeys = Object.keys(dynamicShortcuts);
        if (prevKeys.length === nextKeys.length && prevKeys.every(k => state.dynamicShortcuts[k] === dynamicShortcuts[k])) {
          return state;
        }
        return { dynamicShortcuts };
      }),
      setResumeText: (resumeText) => set({ resumeText }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      addSnippet: (snippet) => set((state) => {
        const cleanShortcut = (snippet.shortcut || '').trim().toLowerCase();
        const existingIdx = state.snippets.findIndex(s => (s.shortcut || '').trim().toLowerCase() === cleanShortcut);
        if (existingIdx >= 0) {
          const updated = [...state.snippets];
          updated[existingIdx] = snippet;
          return { snippets: updated };
        }
        return { snippets: [...state.snippets, snippet] };
      }),
      updateSnippetInStore: (updated) => set((state) => ({
        snippets: state.snippets.map((s) => s.id === updated.id ? updated : s)
      })),
      deleteSnippetFromStore: (id) => set((state) => ({
        snippets: state.snippets.filter((s) => s.id !== id)
      })),

      // Job Slice
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1zhdK9LJ8z0RLZmRv7TqirPTUuFAcfy9ENigLYnNTLsA/edit?usp=sharing',
      googleWebAppUrl: '',
      jobs: [],
      sheetTabs: [],
      selectedSheetIdx: 0,
      syncStatus: 'synced',
      dailyGoal: 20,
      setSpreadsheetUrl: (spreadsheetUrl) => set({ spreadsheetUrl }),
      setGoogleWebAppUrl: (googleWebAppUrl) => set({ googleWebAppUrl }),
      setJobs: (jobs) => set({ jobs }),
      setSheetTabs: (sheetTabs) => set({ sheetTabs }),
      setSelectedSheetIdx: (selectedSheetIdx) => set({ selectedSheetIdx }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      updateJobStatus: (url, status) => set((state) => {
        const updatedJobs = state.jobs.map((job) => job.url === url ? { ...job, status } : job);
        const updatedTabs = state.sheetTabs.map((tab) => ({
          ...tab,
          jobs: tab.jobs.map((job) => job.url === url ? { ...job, status } : job)
        }));
        return { jobs: updatedJobs, sheetTabs: updatedTabs };
      }),

      // Eligibility Slice
      geminiApiKey: '',
      selectedGeminiModel: 'gemini-2.5-flash',
      checkerJdText: '',
      lastEligibilityResult: null,
      globalExclusions: [
        'KPMG', 'Infosys', 'Deloitte', 'Fidelity', 'Amazon'
      ],
      sectorExclusions: [
        'Management & Consulting', 'Government Projects', 'Aerospace / Defense'
      ],
      candidateExclusions: {},
      tailoredBullets: [],
      tailoredCoverLetter: '',
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      setSelectedGeminiModel: (selectedGeminiModel) => set({ selectedGeminiModel }),
      setCheckerJdText: (checkerJdText) => set({ checkerJdText }),
      setLastEligibilityResult: (lastEligibilityResult) => set({ lastEligibilityResult }),
      setGlobalExclusions: (globalExclusions) => set({ globalExclusions }),
      setSectorExclusions: (sectorExclusions) => set({ sectorExclusions }),
      setCandidateExclusions: (candidateExclusions) => set({ candidateExclusions }),
      setTailoredBullets: (tailoredBullets) => set({ tailoredBullets }),
      setTailoredCoverLetter: (tailoredCoverLetter) => set({ tailoredCoverLetter }),

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
        googleWebAppUrl: '',
        jobs: [],
        sheetTabs: [],
        selectedSheetIdx: 0,
        syncStatus: 'synced',
        dailyGoal: 20,
        geminiApiKey: '',
        selectedGeminiModel: 'gemini-2.5-flash',
        checkerJdText: '',
        lastEligibilityResult: null,
        globalExclusions: [
          'KPMG', 'Infosys', 'Deloitte', 'Fidelity', 'Amazon'
        ],
        sectorExclusions: [
          'Management & Consulting', 'Government Projects', 'Aerospace / Defense'
        ],
        candidateExclusions: {},
        tailoredBullets: [],
        tailoredCoverLetter: ''
      }),
    }),
    {
      name: 'clipstaff-storage',
      version: 2,
      storage: createJSONStorage(() => chromeExtensionStorage),
      migrate: (persistedState: any, version: number) => {
        if (version < 1 && persistedState && persistedState.profileTriggers) {
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

        if (persistedState) {
          if (persistedState.candidateExclusions) {
            const cleaned: Record<string, string[]> = {};
            const dummyNames = new Set(['Mounika', 'Pravilika', 'Pravalika', 'Hardhik']);
            Object.keys(persistedState.candidateExclusions).forEach(key => {
              if (!dummyNames.has(key)) {
                cleaned[key] = persistedState.candidateExclusions[key];
              }
            });
            persistedState.candidateExclusions = cleaned;
          }

          if (Array.isArray(persistedState.globalExclusions)) {
            const dummyCompanies = new Set([
              'BW Design Group', 'FLUOR Corporation', 'TATA Motors', 'Saulsbury', 'Targa Resources', 'MEL Systems', 'BAE Systems'
            ]);
            persistedState.globalExclusions = persistedState.globalExclusions.filter((c: string) => !dummyCompanies.has(c));
          }
        }

        return persistedState;
      },
      // Persist state fields to local/extension storage (including snippets!)
      partialize: (state) => ({ 
        profiles: state.profiles,
        resumeText: state.resumeText,
        activeProfile: state.activeProfile,
        snippets: state.snippets,
        searchTerm: state.searchTerm,
        profileTriggers: state.profileTriggers,
        spreadsheetUrl: state.spreadsheetUrl,
        googleWebAppUrl: state.googleWebAppUrl,
        jobs: state.jobs,
        sheetTabs: state.sheetTabs,
        selectedSheetIdx: state.selectedSheetIdx,
        syncStatus: state.syncStatus,
        dailyGoal: state.dailyGoal,
        geminiApiKey: state.geminiApiKey,
        selectedGeminiModel: state.selectedGeminiModel,
        checkerJdText: state.checkerJdText,
        lastEligibilityResult: state.lastEligibilityResult,
        globalExclusions: state.globalExclusions,
        sectorExclusions: state.sectorExclusions,
        candidateExclusions: state.candidateExclusions,
        tailoredBullets: state.tailoredBullets,
        tailoredCoverLetter: state.tailoredCoverLetter
      }),
    }
  )
);

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_STATUS_CHANGED') {
      useStore.getState().setSyncStatus(message.status);
    }
  });
}

// Multi-Tab & Cross-Window Instant Sync Listener
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['clipstaff-storage']) {
      if (isSelfStorageUpdate) return;
      try {
        const rawVal = changes['clipstaff-storage'].newValue;
        if (rawVal) {
          const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
          const stateData = parsed.state || parsed;
          if (stateData) {
            useStore.setState((prev) => ({
              ...prev,
              ...(Array.isArray(stateData.snippets) ? { snippets: stateData.snippets } : {}),
              ...(Array.isArray(stateData.profiles) ? { profiles: stateData.profiles } : {}),
              ...(stateData.activeProfile !== undefined ? { activeProfile: stateData.activeProfile } : {})
            }));
          }
        }
      } catch (e) {
        console.warn('ClipStaff: Error syncing storage changes across tabs:', e);
      }
    }
  });
}
