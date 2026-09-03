import { Snippet, Profile } from '../types';

/**
 * Compiles manual shortcuts, dynamic experience shortcuts, and active profile fields,
 * and broadcasts them to all open tabs and storage.
 */
export const syncShortcutsToStorage = (
  snippets: Snippet[] = [], 
  dynamicShortcuts: Record<string, string> = {},
  activeProfile: Profile | null = null,
  profileTriggers: Record<string, string> = {},
  profiles: Profile[] = [],
  tailoredCoverLetter: string = ''
): Record<string, string> => {
  const shortcuts: Record<string, string> = {};

  try {
    // 1. Compile manual snippets
    if (Array.isArray(snippets)) {
      snippets.forEach(s => {
        if (s && s.shortcut) {
          shortcuts[s.shortcut.trim().toLowerCase()] = s.text;
        }
      });
    }

    // 2. Merge dynamic shortcuts
    if (dynamicShortcuts && typeof dynamicShortcuts === 'object') {
      Object.keys(dynamicShortcuts).forEach(key => {
        if (dynamicShortcuts[key]) {
          shortcuts[key.trim().toLowerCase()] = dynamicShortcuts[key];
        }
      });
    }

    // 2.5. Register tailored cover letter shortcuts if present
    if (tailoredCoverLetter && tailoredCoverLetter.trim()) {
      const cleanCover = tailoredCoverLetter.trim();
      shortcuts['cover;'] = cleanCover;
      shortcuts['cl;'] = cleanCover;
    }

    // 3. Auto-map active profile fields
    if (activeProfile) {
      const fullName = (activeProfile.full_name || activeProfile.name || '').trim();
      const firstName = (activeProfile.first_name || fullName).trim().split(/\s+/)[0];
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
          const cleanDesc = exp.description
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^([-•*▪]|\d+\.)\s*/, '')) // Strip existing bullets
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

      // C2. Structural Certifications (cert1, cert2, certs;)
      const certs = (activeProfile.certifications || [])
        .map(c => typeof c === 'string' ? c.trim() : '')
        .filter(Boolean);
      certs.forEach((cert, idx) => {
        const num = idx + 1;
        shortcuts[`cert${num}`] = cert;
      });
      if (certs.length > 0) {
        shortcuts['certs;'] = certs.map(c => `- ${c}`).join('\n');
      }

      // D. Custom profileTriggers
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
        let val = activeProfile[profileKey];
        if (!val) {
          if (profileKey === 'first_name') val = firstName;
          else if (profileKey === 'last_name') val = fullName.split(/\s+/).slice(1).join(' ');
          else if (profileKey === 'full_name') val = fullName;
        }
        if (typeof val === 'string' && val.trim()) {
          const trigger = (profileTriggers[storeKey] || defaultTrigger).trim().toLowerCase();
          if (trigger) {
            shortcuts[trigger] = val.trim();
          }
        }
      });
    }

    // Persist to Chrome Local Storage and fallback to localStorage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const storageObj: any = { 
        clipstaff_shortcuts: shortcuts,
        clipstaff_active_profile: activeProfile
      };
      if (profiles && profiles.length > 0) {
        storageObj.clipstaff_profiles_list = profiles;
      }
      chrome.storage.local.set(storageObj);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clipstaff_shortcuts', JSON.stringify(shortcuts));
      if (activeProfile) {
        localStorage.setItem('clipstaff_active_profile', JSON.stringify(activeProfile));
      }
    }
  } catch (err) {
    console.error('ClipStaff: Sync Exception', err);
  }

  return shortcuts;
};
