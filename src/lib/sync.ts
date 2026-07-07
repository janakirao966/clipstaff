import { Snippet, Profile } from '../types';

/**
 * Compiles manual shortcuts, dynamic experience shortcuts, and active profile fields,
 * and broadcasts them to all open tabs.
 */
export const syncShortcutsToStorage = (
  snippets: Snippet[], 
  dynamicShortcuts: Record<string, string> = {},
  activeProfile: Profile | null = null,
  profileTriggers: Record<string, string> = {}
) => {
  const shortcuts: Record<string, string> = {};

  try {
    // 1. Compile manual snippets
    snippets.forEach(s => {
      if (s.shortcut) {
        shortcuts[s.shortcut.toLowerCase()] = s.text;
      }
    });

    // 2. Merge dynamic shortcuts
    Object.keys(dynamicShortcuts).forEach(key => {
      shortcuts[key.toLowerCase()] = dynamicShortcuts[key];
    });

    // 3. Auto-map active profile fields
    if (activeProfile) {
      // Find the first letter of their first name (or fall back to 'p' if empty)
      const firstName = (activeProfile.first_name || activeProfile.full_name || activeProfile.name || '').trim().split(/\s+/)[0];
      const p = (firstName ? firstName[0] : 'p').toLowerCase();

      // A. Dynamic First-Letter Templates
      const nameTemplateMappings = [
        { key: `${p}gm`, value: activeProfile.email },
        { key: `${p}n;`, value: activeProfile.full_name || activeProfile.name },
        { key: `${p}p;`, value: activeProfile.phone },
        { key: `${p}l;`, value: activeProfile.linkedin_url },
        { key: 'st;', value: activeProfile.street_address || activeProfile.location }
      ];

      nameTemplateMappings.forEach(({ key, value }) => {
        if (typeof value === 'string' && value.trim()) {
          shortcuts[key.toLowerCase()] = value.trim();
        }
      });

      // B. Structural Work Experience (rl1, cp1, exp1, etc.)
      const experiences = activeProfile.experience || [];
      experiences.forEach((exp, idx) => {
        const num = idx + 1;
        if (exp.title?.trim()) shortcuts[`rl${num}`] = exp.title.trim();
        if (exp.company?.trim()) shortcuts[`cp${num}`] = exp.company.trim();
        if (exp.description?.trim()) {
          // Format bullet points cleanly (ensure lines start with standard dash)
          const cleanDesc = exp.description
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^([-•*·]|\d+\.)\s*/, '')) // Strip existing bullets
            .map(line => `- ${line}`)
            .join('\n');
          
          if (cleanDesc) {
            shortcuts[`exp${num}`] = cleanDesc;
          }
        }
      });

      // C. Structural Education (edu1, edu2, deg1, deg2, major1, major2)
      const educations = activeProfile.education || [];
      educations.forEach((edu, idx) => {
        const num = idx + 1;
        if (edu.school?.trim()) shortcuts[`edu${num}`] = edu.school.trim();
        if (edu.degree?.trim()) shortcuts[`deg${num}`] = edu.degree.trim();
        if (edu.field_of_study?.trim()) shortcuts[`major${num}`] = edu.field_of_study.trim();
      });

      // D. Fallback / Custom profileTriggers
      const fieldMappings: { storeKey: string; profileKey: keyof Profile; defaultTrigger: string }[] = [
        { storeKey: 'full_name', profileKey: 'full_name', defaultTrigger: 'name;' },
        { storeKey: 'first_name', profileKey: 'first_name', defaultTrigger: 'fname;' },
        { storeKey: 'middle_name', profileKey: 'middle_name', defaultTrigger: 'mname;' },
        { storeKey: 'last_name', profileKey: 'last_name', defaultTrigger: 'lname;' },
        { storeKey: 'email', profileKey: 'email', defaultTrigger: 'email;' },
        { storeKey: 'phone', profileKey: 'phone', defaultTrigger: 'phone;' },
        { storeKey: 'linkedin_url', profileKey: 'linkedin_url', defaultTrigger: 'linkedin;' },
        { storeKey: 'portfolio_url', profileKey: 'portfolio_url', defaultTrigger: 'portfolio;' },
        { storeKey: 'location', profileKey: 'location', defaultTrigger: 'location;' },
        { storeKey: 'street_address', profileKey: 'street_address', defaultTrigger: 'street;' },
        { storeKey: 'city', profileKey: 'city', defaultTrigger: 'city;' },
        { storeKey: 'state', profileKey: 'state', defaultTrigger: 'state;' },
        { storeKey: 'pin_code', profileKey: 'pin_code', defaultTrigger: 'pincode;' },
        { storeKey: 'professional_subtitle', profileKey: 'professional_subtitle', defaultTrigger: 'title;' },
        { storeKey: 'password', profileKey: 'password', defaultTrigger: 'pwd;' },
      ];

      fieldMappings.forEach(({ storeKey, profileKey, defaultTrigger }) => {
        const val = activeProfile[profileKey];
        if (typeof val === 'string' && val.trim()) {
          const trigger = (profileTriggers[storeKey] || defaultTrigger).trim().toLowerCase();
          if (trigger) {
            shortcuts[trigger] = val.trim();
          }
        }
      });
    }

    // A. Persist to Storage - The content scripts will pick this up via storage.onChanged
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ 
        clipstaff_shortcuts: shortcuts,
        clipstaff_active_profile: activeProfile
      });
    }
  } catch (err) {
    console.error('ClipStaff: Sync Exception', err);
  }

  return shortcuts;
};
