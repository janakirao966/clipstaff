import React, { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { AuthContext } from './AuthContextObject';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // 1. Check if offline/local mode was selected
      let isOffline = false;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const res = await new Promise<any>((resolve) => chrome.storage.local.get(['clipstaff_offline_mode'], resolve));
          isOffline = res?.clipstaff_offline_mode === true;
        }
        if (!isOffline) {
          isOffline = localStorage.getItem('clipstaff_offline_mode') === 'true';
        }
      } catch {}

      if (isOffline) {
        if (isMounted) {
          const localUser: User = {
            id: 'local-user',
            app_metadata: {},
            user_metadata: { full_name: 'Local Recruiter' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: 'local@clipstaff.app'
          } as any;
          setUser(localUser);
          setLoading(false);
        }
        return;
      }

      // 2. Fetch Supabase session from storage adapter
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session && isMounted) {
          setSession(data.session);
          setUser(data.session.user ?? null);
        } else if (!data?.session && typeof chrome !== 'undefined' && chrome.storage?.local) {
          // Direct fallback from chrome.storage.local
          const all = await new Promise<any>((resolve) => chrome.storage.local.get(null, resolve));
          const tokenKey = Object.keys(all || {}).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          if (tokenKey && all[tokenKey]) {
            try {
              const parsed = typeof all[tokenKey] === 'string' ? JSON.parse(all[tokenKey]) : all[tokenKey];
              if (parsed?.access_token && parsed?.user) {
                await supabase.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token || '',
                });
                if (isMounted) {
                  setUser(parsed.user);
                  setSession(parsed);
                }
              }
            } catch (err) {
              console.warn('Session restore fallback error:', err);
            }
          }
        }
      } catch (e) {
        console.warn('Supabase auth session check failed:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // 3. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem('clipstaff_offline_mode');
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(['clipstaff_offline_mode', 'clipstaff_shortcuts'], () => {});
      }
      setUser(null);
      setSession(null);

      // 1. Sign out from Supabase if configured
      await supabase.auth.signOut().catch(() => {});
      
      // 2. Reset Zustand store
      useStore.getState().resetStore();
    } catch (err) {
      console.error('Error during signOut:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
