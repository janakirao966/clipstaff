import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
);

if (!isSupabaseConfigured) {
  console.info('ClipStaff: Operating in local/offline mode (Supabase keys not configured in .env).');
}

// Custom storage adapter: chrome.storage.local with localStorage fallback for cross-page persistence
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await new Promise<any>((resolve) => {
          chrome.storage.local.get([key], (res) => resolve(res || {}));
        });
        if (result && result[key] !== undefined && result[key] !== null) {
          return typeof result[key] === 'string' ? result[key] : JSON.stringify(result[key]);
        }
      }
    } catch (e) {
      console.warn('ClipStaff: chrome.storage.local getItem error:', e);
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        });
      }
    } catch (e) {
      console.warn('ClipStaff: chrome.storage.local setItem error:', e);
    }
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.remove([key], () => resolve());
        });
      }
    } catch (e) {
      console.warn('ClipStaff: chrome.storage.local removeItem error:', e);
    }
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for side panel
  },
});
