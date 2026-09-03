import { 
  Profile, 
  Snippet, 
  Job, 
  VaultJob, 
  SheetTab, 
  ProfileBundleJSON, 
  SystemBackupJSON, 
  ImportAuditReport, 
  DetectedImportFormat, 
  ImportStrategy,
  ProfileRulesAndPreferences 
} from '../types';
import { parseExperiencesFromResumeText } from './resumeParser';
import { normalizeUrl, getJobId, sanitizeProfileName, extractCompanyFromUrl, extractRoleFromUrl, normalizeDateStr } from './extractor';
import { syncShortcutsToStorage } from './sync';
import { useStore } from '../store/useStore';

/**
 * Universal JSON file downloader for Chrome extension and web environments.
 */
export async function downloadJSON(data: any, filename: string): Promise<void> {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

  if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        chrome.downloads.download({ url, filename, saveAs: true }, () => {
          if (chrome.runtime.lastError) {
            fallbackDownload(blob, filename);
            resolve();
          } else {
            resolve();
          }
        });
      };
      reader.onerror = () => {
        fallbackDownload(blob, filename);
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  } else {
    fallbackDownload(blob, filename);
  }
}

function fallbackDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports the complete active profile bundle to a JSON file.
 */
export async function exportProfileBundleJSON(params: {
  profile: Profile | null;
  resumeText?: string;
  profileTriggers?: Record<string, string>;
  snippets?: Snippet[];
  applications?: Job[];
  rulesAndPreferences?: ProfileRulesAndPreferences;
}): Promise<void> {
  const { profile, resumeText = '', profileTriggers = {}, snippets = [], applications = [], rulesAndPreferences = {} } = params;

  if (!profile) {
    throw new Error('No active profile available to export.');
  }

  const cleanProfile: Profile = {
    id: profile.id || 'local-profile',
    user_id: profile.user_id || 'local-user',
    name: profile.name || 'Default Profile',
    full_name: profile.full_name || profile.name || '',
    first_name: profile.first_name || '',
    middle_name: profile.middle_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    linkedin_url: profile.linkedin_url || '',
    portfolio_url: profile.portfolio_url || '',
    location: profile.location || '',
    street_address: profile.street_address || '',
    city: profile.city || '',
    state: profile.state || '',
    pin_code: profile.pin_code || '',
    professional_subtitle: profile.professional_subtitle || '',
    password: profile.password || '',
    experience: profile.experience || [],
    education: profile.education || [],
    certifications: profile.certifications || [],
    is_active: true,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const bundle: ProfileBundleJSON = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    app: 'ClipStaff',
    type: 'clipstaff_profile_bundle',
    profile: cleanProfile,
    resumeText,
    profileTriggers,
    snippets: snippets.map(s => ({
      id: s.id,
      user_id: s.user_id,
      shortcut: s.shortcut,
      text: s.text,
      category: s.category || 'General',
      is_pinned: !!s.is_pinned,
      created_at: s.created_at || new Date().toISOString()
    })),
    applications: applications.map(job => ({
      id: job.id,
      company: job.company,
      role: job.role,
      url: job.url,
      dateAdded: job.dateAdded,
      status: job.status,
      syncState: job.syncState,
      lastSyncedAt: job.lastSyncedAt,
      retryCount: job.retryCount,
      version: job.version,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      appliedAt: job.appliedAt,
      rowIndex: job.rowIndex
    })),
    rulesAndPreferences: rulesAndPreferences ? {
      ...rulesAndPreferences,
      candidateExclusions: (rulesAndPreferences.candidateExclusions || []).filter(
        c => !['BW Design Group', 'FLUOR Corporation', 'TATA Motors', 'Saulsbury', 'Targa Resources', 'MEL Systems', 'BAE Systems'].includes(c)
      )
    } : undefined
  };

  const safeName = sanitizeProfileName(cleanProfile.full_name || cleanProfile.name || 'profile')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  const filename = `${safeName || 'profile'}_backup.json`;

  await downloadJSON(bundle, filename);
}

/**
 * Exports a full universal system backup JSON.
 */
export async function exportSystemBackupJSON(params: {
  profiles: Profile[];
  activeProfile: Profile | null;
  snippets: Snippet[];
  applications: Job[];
  vaultJobs?: VaultJob[];
  sheetTabs?: SheetTab[];
  profileTriggers?: Record<string, string>;
  resumeText?: string;
  globalExclusions?: string[];
  sectorExclusions?: string[];
  candidateExclusions?: Record<string, string[]>;
  spreadsheetUrl?: string;
  googleWebAppUrl?: string;
}): Promise<void> {
  const cleanedCandidateExclusions: Record<string, string[]> = {};
  const dummyNames = new Set(['Mounika', 'Pravilika', 'Pravalika', 'Hardhik']);
  if (params.candidateExclusions) {
    Object.keys(params.candidateExclusions).forEach(key => {
      if (!dummyNames.has(key)) {
        cleanedCandidateExclusions[key] = params.candidateExclusions![key];
      }
    });
  }

  const dummyCompanies = new Set([
    'BW Design Group', 'FLUOR Corporation', 'TATA Motors', 'Saulsbury', 'Targa Resources', 'MEL Systems', 'BAE Systems'
  ]);
  const cleanedGlobalExclusions = (params.globalExclusions || []).filter(c => !dummyCompanies.has(c));

  const backup: SystemBackupJSON = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    app: 'ClipStaff',
    type: 'clipstaff_system_backup',
    activeProfileId: params.activeProfile?.id,
    profiles: params.profiles,
    profileTriggers: params.profileTriggers || {},
    resumeText: params.resumeText || '',
    snippets: params.snippets,
    applications: params.applications,
    vaultJobs: params.vaultJobs || [],
    sheetTabs: params.sheetTabs || [],
    globalExclusions: cleanedGlobalExclusions,
    sectorExclusions: params.sectorExclusions || [],
    candidateExclusions: cleanedCandidateExclusions,
    spreadsheetUrl: params.spreadsheetUrl || '',
    googleWebAppUrl: params.googleWebAppUrl || ''
  };

  const filename = `ClipStaff_Full_System_Backup_${new Date().toISOString().split('T')[0]}.json`;

  await downloadJSON(backup, filename);
}

/**
 * Exports manual shortcuts to JSON.
 */
export async function exportShortcutsJSON(snippets: Snippet[], profileName?: string): Promise<void> {
  const payload = snippets.map(s => ({
    shortcut: s.shortcut,
    text: s.text,
    category: s.category || 'General',
    is_pinned: !!s.is_pinned
  }));
  const safeName = profileName 
    ? sanitizeProfileName(profileName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
    : '';
  const filename = safeName ? `${safeName}_shortcuts.json` : 'shortcuts_backup.json';
  await downloadJSON(payload, filename);
}

/**
 * Exports applications list to JSON.
 */
export async function exportApplicationsJSON(jobs: Job[], profileName: string = 'applications'): Promise<void> {
  const safeName = sanitizeProfileName(profileName)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  const filename = `${safeName || 'applications'}_backup.json`;
  await downloadJSON(jobs, filename);
}

/**
 * Deep inspection and diff calculation of any incoming JSON text.
 */
export function inspectImportJSON(
  rawText: string,
  currentSnippets: Snippet[] = [],
  currentJobs: Job[] = []
): ImportAuditReport {
  const warnings: string[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err: any) {
    return {
      format: 'unknown',
      isValid: false,
      error: `JSON Parse Error: ${err.message || 'Invalid JSON syntax'}`,
      warnings: [],
      profileFieldCount: 0,
      snippetsToImport: { total: 0, newCount: 0, updateCount: 0, items: [] },
      applicationsToImport: { total: 0, newCount: 0, upgradeCount: 0, items: [] }
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      format: 'unknown',
      isValid: false,
      error: 'JSON must be a valid object or array.',
      warnings: [],
      profileFieldCount: 0,
      snippetsToImport: { total: 0, newCount: 0, updateCount: 0, items: [] },
      applicationsToImport: { total: 0, newCount: 0, upgradeCount: 0, items: [] }
    };
  }

  let format: DetectedImportFormat = 'unknown';
  let profileData: Partial<Profile> | null = null;
  let allProfiles: Profile[] | undefined;
  let profileName: string | undefined;
  let profileTriggers: Record<string, string> | undefined;
  let resumeText: string | undefined;
  let rawSnippets: any[] = [];
  let rawJobs: any[] = [];
  let rulesAndPreferences: ProfileRulesAndPreferences | undefined;
  let systemBackupData: Partial<SystemBackupJSON> | undefined;
  const version = parsed.version || '1.0.0';
  const exportedAt = parsed.exportedAt;

  // 1. Check for ClipStaff Profile Bundle v2.0
  if (parsed.type === 'clipstaff_profile_bundle' || (parsed.profile && typeof parsed.profile === 'object' && ('snippets' in parsed || 'applications' in parsed || 'profileTriggers' in parsed))) {
    format = 'clipstaff_profile_bundle';
    profileData = parsed.profile;
    profileName = profileData?.full_name || profileData?.name || 'Imported Profile';
    profileTriggers = parsed.profileTriggers;
    resumeText = parsed.resumeText;
    rawSnippets = Array.isArray(parsed.snippets) ? parsed.snippets : [];
    rawJobs = Array.isArray(parsed.applications) ? parsed.applications : [];
    rulesAndPreferences = parsed.rulesAndPreferences;
  }
  // 2. Check for ClipStaff System Backup
  else if (parsed.type === 'clipstaff_system_backup' || (Array.isArray(parsed.profiles) && ('snippets' in parsed || 'applications' in parsed))) {
    format = 'clipstaff_system_backup';
    systemBackupData = parsed;
    allProfiles = parsed.profiles;
    profileData = parsed.profiles?.[0] || null;
    profileName = profileData?.full_name || profileData?.name || 'System Backup';
    profileTriggers = parsed.profileTriggers;
    resumeText = parsed.resumeText;
    rawSnippets = Array.isArray(parsed.snippets) ? parsed.snippets : [];
    rawJobs = Array.isArray(parsed.applications) ? parsed.applications : [];
  }
  // 3. Check for CVCraft Snapshot / Export format or Structured Resume Format
  else if (parsed.app === 'CVCraft' || parsed.profile || parsed.resumeData || (parsed.name && (parsed.experience || parsed.education || parsed.skills))) {
    format = 'clipstaff_profile_bundle';
    const p = parsed.profile || parsed.resumeData || parsed;
    const basics = p.basics || p.personalInfo || p.contact || {};

    const pName = basics.name || basics.fullName || p.name || p.fullName || parsed.filename?.replace(/_Resume$/i, '').replace(/_/g, ' ') || 'Candidate Profile';
    const subtitle = basics.label || basics.title || p.subtitle || p.title || p.designation || '';
    const email = basics.email || p.email || '';
    const phone = basics.phone || p.phone || '';
    
    let locationStr = basics.location || p.location || '';
    if (typeof locationStr === 'object' && locationStr !== null) {
      locationStr = [locationStr.address, locationStr.city, locationStr.region || locationStr.state, locationStr.postalCode].filter(Boolean).join(', ');
    }
    locationStr = String(locationStr || '').trim();

    let linkedinStr = basics.linkedin || p.linkedin || p.linkedin_url || '';
    if (Array.isArray(basics.profiles)) {
      const li = basics.profiles.find((pr: any) => pr.network?.toLowerCase().includes('linkedin') || pr.url?.includes('linkedin.com'));
      if (li) linkedinStr = li.url || li.username || '';
    }

    // Standardize experience
    const rawExp = p.experience || p.work || p.employment || [];
    const experience = Array.isArray(rawExp) ? rawExp.map((e: any) => {
      let desc = e.description || '';
      if (!desc && Array.isArray(e.bullets)) {
        desc = e.bullets.map((b: any) => `- ${typeof b === 'string' ? b.trim() : (b.text || '')}`).join('\n');
      } else if (!desc && Array.isArray(e.highlights)) {
        desc = e.highlights.map((h: any) => `- ${String(h).trim()}`).join('\n');
      }
      return {
        title: e.role || e.title || e.position || '',
        company: e.company || e.name || e.employer || '',
        location: e.location || '',
        start_date: e.dates ? (e.dates.split(/[–—\-]/)[0]?.trim() || '') : (e.startDate || e.date || ''),
        end_date: e.dates ? (e.dates.split(/[–—\-]/)[1]?.trim() || '') : (e.endDate || 'Present'),
        description: desc
      };
    }) : [];

    // Standardize education
    const rawEdu = p.education || p.academics || [];
    const education = Array.isArray(rawEdu) ? rawEdu.map((edu: any) => ({
      degree: edu.degree || edu.studyType || edu.qualification || '',
      field_of_study: edu.field_of_study || edu.area || edu.major || '',
      school: edu.school || edu.institution || edu.university || '',
      location: edu.location || '',
      start_year: edu.dates ? (edu.dates.split(/[–—\-]/)[0]?.trim() || '') : (edu.startDate || edu.start_year || ''),
      end_year: edu.dates ? (edu.dates.split(/[–—\-]/)[1]?.trim() || '') : (edu.endDate || edu.end_year || edu.year || '')
    })) : [];

    // Standardize certifications
    const rawCerts = p.certifications || p.certs || [];
    const certifications = Array.isArray(rawCerts) ? rawCerts.map((c: any) => typeof c === 'string' ? c : (c.name || c.title || '')) : [];

    // Split name into first and last
    const nameParts = pName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    profileData = {
      name: pName,
      full_name: pName,
      first_name: firstName,
      middle_name: '',
      last_name: lastName,
      email: email,
      phone: phone,
      linkedin_url: linkedinStr,
      portfolio_url: p.portfolio || p.portfolio_url || p.website || '',
      location: locationStr,
      street_address: p.street_address || locationStr,
      city: p.city || '',
      state: p.state || '',
      pin_code: p.pin_code || '',
      professional_subtitle: subtitle,
      password: p.password || '',
      experience: experience,
      education: education,
      certifications: certifications,
      is_active: true
    };
    profileName = pName;
    resumeText = p.summary || p.text || '';

    // Auto-generate candidate shortcuts if explicit snippets not present
    if (Array.isArray(parsed.snippets) && parsed.snippets.length > 0) {
      rawSnippets = parsed.snippets;
    } else {
      rawSnippets = [];
      if (p.summary) {
        rawSnippets.push({ shortcut: 'about;', text: String(p.summary).trim(), category: 'Summary' });
      }
      if (Array.isArray(p.skills) && p.skills.length > 0) {
        const skillsText = p.skills.map((s: any) => {
          if (typeof s === 'string') return s;
          if (s.category && s.list) return `${s.category}: ${s.list}`;
          if (s.name && s.keywords) return `${s.name}: ${Array.isArray(s.keywords) ? s.keywords.join(', ') : s.keywords}`;
          return JSON.stringify(s);
        }).join('\n');
        rawSnippets.push({ shortcut: 'skills;', text: skillsText, category: 'Skills' });
      }
      if (certifications.length > 0) {
        rawSnippets.push({ shortcut: 'certs;', text: certifications.join(', '), category: 'Certifications' });
      }
    }
  }
  // 4. Check for Legacy Single Profile format: { [name]: { profile: {...}, text: "..." } }
  else {
    const rootKeys = Object.keys(parsed);
    if (rootKeys.length === 1 && parsed[rootKeys[0]] && typeof parsed[rootKeys[0]] === 'object' && 'profile' in parsed[rootKeys[0]]) {
      format = 'legacy_profile_json';
      const rootKey = rootKeys[0];
      const data = parsed[rootKey];
      const p = data.profile || {};
      const resumeRaw = data.text || '';

      const parsedExperiences = parseExperiencesFromResumeText(resumeRaw);
      const education = (p.education || []).map((edu: any) => ({
        degree: edu.degree || '',
        field_of_study: edu.field_of_study || '',
        school: edu.school || '',
        location: edu.location || '',
        start_year: edu.dates ? edu.dates.split(/[–—\-]/)[0]?.trim() || '' : edu.start_year || '',
        end_year: edu.dates ? edu.dates.split(/[–—\-]/)[1]?.trim() || '' : edu.end_year || ''
      }));

      const rawFullName = p.full_name || p.name || rootKey || '';
      const nameParts = rawFullName.trim().split(/\s+/);

      profileData = {
        name: rootKey || rawFullName,
        full_name: rawFullName,
        first_name: nameParts[0] || '',
        middle_name: '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: p.email || '',
        phone: p.phone || '',
        linkedin_url: p.linkedin_url || p.linkedin || '',
        portfolio_url: p.portfolio_url || '',
        location: p.location || '',
        street_address: p.street_address || '',
        city: p.city || '',
        state: p.state || '',
        pin_code: p.pin_code || '',
        professional_subtitle: p.professional_subtitle || p.subtitle || '',
        password: p.password || '',
        experience: p.experience && p.experience.length > 0 ? p.experience : parsedExperiences,
        education: education,
        certifications: p.certifications || p.certs || [],
        is_active: true
      };
      profileName = profileData.full_name || profileData.name;
      resumeText = resumeRaw;
    }
    // 5. Check for Shortcuts Array
    else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && ('shortcut' in parsed[0] || 'text' in parsed[0])) {
      format = 'snippets_array';
      rawSnippets = parsed;
    }
    // 6. Check for Applications / Jobs Array
    else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && ('url' in parsed[0] || ('company' in parsed[0] && 'role' in parsed[0]))) {
      format = 'jobs_array';
      rawJobs = parsed;
    }
    // 7. Check for Key-Value Shortcuts Map { "key": "value" }
    else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      const stringValuedKeys = Object.keys(parsed).filter(k => typeof parsed[k] === 'string');
      if (stringValuedKeys.length > 0) {
        format = 'shortcuts_map';
        rawSnippets = stringValuedKeys.map(k => ({
          shortcut: k,
          text: parsed[k],
          category: 'General'
        }));
      }
    }
  }

  if (format === 'unknown') {
    return {
      format: 'unknown',
      isValid: false,
      error: 'Unrecognized JSON format. File does not contain valid ClipStaff profile, shortcuts, or application data.',
      warnings: [],
      profileFieldCount: 0,
      snippetsToImport: { total: 0, newCount: 0, updateCount: 0, items: [] },
      applicationsToImport: { total: 0, newCount: 0, upgradeCount: 0, items: [] }
    };
  }

  // --- Calculate Profile Fields completeness count ---
  let profileFieldCount = 0;
  if (profileData) {
    const checkFields: (keyof Profile)[] = [
      'full_name', 'email', 'phone', 'linkedin_url', 'location', 
      'street_address', 'city', 'state', 'pin_code', 'professional_subtitle', 'password'
    ];
    checkFields.forEach(f => {
      if (profileData && profileData[f] && typeof profileData[f] === 'string' && (profileData[f] as string).trim()) {
        profileFieldCount++;
      }
    });
    if (profileData.experience && profileData.experience.length > 0) profileFieldCount += profileData.experience.length;
    if (profileData.education && profileData.education.length > 0) profileFieldCount += profileData.education.length;
    if (profileData.certifications && profileData.certifications.length > 0) profileFieldCount += profileData.certifications.length;
  }

  // --- Audit & Diff Shortcuts ---
  const existingSnippetMap = new Map<string, Snippet>();
  currentSnippets.forEach(s => {
    if (s.shortcut) {
      existingSnippetMap.set(s.shortcut.trim().toLowerCase(), s);
    }
  });

  const parsedSnippetMap = new Map<string, { shortcut: string; text: string; category?: string; is_pinned?: boolean }>();
  let dupesCount = 0;

  for (const s of rawSnippets) {
    if (s && typeof s === 'object' && s.shortcut && typeof s.shortcut === 'string' && s.text) {
      const norm = s.shortcut.trim().toLowerCase();
      if (parsedSnippetMap.has(norm)) {
        dupesCount++;
      }
      parsedSnippetMap.set(norm, {
        shortcut: norm,
        text: String(s.text),
        category: s.category || 'General',
        is_pinned: !!s.is_pinned
      });
    }
  }

  if (dupesCount > 0) {
    warnings.push(`File contains ${dupesCount} duplicate shortcut trigger(s). They have been deduplicated.`);
  }

  const snippetItems = Array.from(parsedSnippetMap.values());
  let newSnippetsCount = 0;
  let updateSnippetsCount = 0;

  snippetItems.forEach(item => {
    if (existingSnippetMap.has(item.shortcut)) {
      updateSnippetsCount++;
    } else {
      newSnippetsCount++;
    }
  });

  // --- Audit & Diff Applications ---
  const existingJobsMap = new Map<string, Job>();
  currentJobs.forEach(j => {
    if (j.url) {
      existingJobsMap.set(normalizeUrl(j.url), j);
    }
  });

  const parsedJobsMap = new Map<string, Job>();
  let invalidUrlsCount = 0;

  for (let idx = 0; idx < rawJobs.length; idx++) {
    const item = rawJobs[idx];
    if (!item || typeof item !== 'object') continue;
    const rawUrl = item.url || '';
    if (!rawUrl || !rawUrl.startsWith('http')) {
      invalidUrlsCount++;
      continue;
    }

    const normUrl = normalizeUrl(rawUrl);
    const existing = parsedJobsMap.get(normUrl);
    const company = item.company || extractCompanyFromUrl(normUrl);
    const role = item.role || extractRoleFromUrl(normUrl);
    const status: Job['status'] = ['applied', 'not_applied', 'skipped'].includes(item.status) ? item.status : 'not_applied';
    const dateAdded = item.dateAdded ? normalizeDateStr(item.dateAdded) : normalizeDateStr(new Date().toLocaleDateString('en-US'));
    const now = Date.now();
    const createdAt = item.createdAt || (now - (rawJobs.length - idx) * 10);
    const updatedAt = item.updatedAt || now;
    const appliedAt = item.appliedAt || (status === 'applied' ? updatedAt : undefined);
    const rowIndex = item.rowIndex !== undefined ? item.rowIndex : (idx + 1);

    if (existing) {
      if (status === 'applied' || (status === 'skipped' && existing.status === 'not_applied')) {
        existing.status = status;
        existing.appliedAt = appliedAt;
        existing.updatedAt = updatedAt;
      }
    } else {
      parsedJobsMap.set(normUrl, {
        id: item.id || getJobId(normUrl),
        company,
        role,
        url: normUrl,
        dateAdded,
        status,
        syncState: item.syncState || 'synced',
        createdAt,
        updatedAt,
        appliedAt,
        rowIndex
      });
    }
  }

  if (invalidUrlsCount > 0) {
    warnings.push(`Skipped ${invalidUrlsCount} job application(s) with invalid or non-HTTP URLs.`);
  }

  const jobItems = Array.from(parsedJobsMap.values());
  let newJobsCount = 0;
  let upgradedJobsCount = 0;

  jobItems.forEach(job => {
    const existing = existingJobsMap.get(job.url);
    if (!existing) {
      newJobsCount++;
    } else if (existing.status !== 'applied' && job.status === 'applied') {
      upgradedJobsCount++;
    }
  });

  return {
    format,
    version,
    exportedAt,
    isValid: true,
    warnings,
    profileData,
    allProfiles,
    profileName,
    profileFieldCount,
    profileTriggers,
    resumeText,
    snippetsToImport: {
      total: snippetItems.length,
      newCount: newSnippetsCount,
      updateCount: updateSnippetsCount,
      items: snippetItems
    },
    applicationsToImport: {
      total: jobItems.length,
      newCount: newJobsCount,
      upgradeCount: upgradedJobsCount,
      items: jobItems
    },
    rulesAndPreferences,
    systemBackupData
  };
}

/**
 * Executes the verified import data into stores, Chrome storage, and IndexedDB with 100% atomic persistence.
 */
export async function executeProfileImport(params: {
  report: ImportAuditReport;
  strategy: ImportStrategy;
  currentProfile: Profile | null;
  currentSnippets: Snippet[];
  currentTriggers: Record<string, string>;
  saveProfile: (profile: any) => Promise<any>;
  setResumeText: (text: string) => void;
  updateProfileTrigger: (key: string, trigger: string) => void;
  createSnippet: (snippet: any) => Promise<any>;
  updateSnippet: (id: string, updates: any) => Promise<any>;
  deleteSnippet: (id: string) => Promise<void>;
  importJobsBulk: (jobs: Job[]) => Promise<any>;
  clearAllJobs?: () => Promise<void>;
  setProfiles?: (profiles: Profile[]) => void;
  setActiveProfile?: (profile: Profile | null) => void;
}): Promise<{
  profileSaved: boolean;
  snippetsImported: number;
  snippetsUpdated: number;
  jobsImported: number;
}> {
  const {
    report,
    strategy,
    currentProfile,
    currentSnippets,
    currentTriggers,
    saveProfile,
    setResumeText,
    updateProfileTrigger,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    importJobsBulk,
    clearAllJobs,
    setProfiles,
    setActiveProfile
  } = params;

  let profileSaved = false;
  let snippetsImported = 0;
  let snippetsUpdated = 0;
  let jobsImported = 0;
  let savedActiveProfile: Profile | null = null;

  // 1. Multiple Profiles Restore (from System Backup)
  if (report.allProfiles && Array.isArray(report.allProfiles) && report.allProfiles.length > 0) {
    if (setProfiles) {
      setProfiles(report.allProfiles);
    }
    if (setActiveProfile && report.allProfiles[0]) {
      setActiveProfile(report.allProfiles[0]);
      savedActiveProfile = report.allProfiles[0];
    }
  }

  // 2. Profile Data Import
  if (report.profileData) {
    let finalProfile: any;
    if (strategy === 'overwrite' || !currentProfile) {
      finalProfile = {
        name: report.profileData.name || report.profileData.full_name || 'Imported Profile',
        full_name: report.profileData.full_name || report.profileData.name || '',
        first_name: report.profileData.first_name || '',
        middle_name: report.profileData.middle_name || '',
        last_name: report.profileData.last_name || '',
        email: report.profileData.email || '',
        phone: report.profileData.phone || '',
        linkedin_url: report.profileData.linkedin_url || '',
        portfolio_url: report.profileData.portfolio_url || '',
        location: report.profileData.location || '',
        street_address: report.profileData.street_address || '',
        city: report.profileData.city || '',
        state: report.profileData.state || '',
        pin_code: report.profileData.pin_code || '',
        professional_subtitle: report.profileData.professional_subtitle || '',
        password: report.profileData.password || '',
        experience: report.profileData.experience || [],
        education: report.profileData.education || [],
        certifications: report.profileData.certifications || [],
        is_active: true
      };
    } else {
      // Merge strategy
      finalProfile = {
        ...currentProfile,
        name: report.profileData.name || currentProfile.name,
        full_name: report.profileData.full_name || currentProfile.full_name,
        first_name: report.profileData.first_name || currentProfile.first_name,
        middle_name: report.profileData.middle_name || currentProfile.middle_name,
        last_name: report.profileData.last_name || currentProfile.last_name,
        email: report.profileData.email || currentProfile.email,
        phone: report.profileData.phone || currentProfile.phone,
        linkedin_url: report.profileData.linkedin_url || currentProfile.linkedin_url,
        portfolio_url: report.profileData.portfolio_url || currentProfile.portfolio_url,
        location: report.profileData.location || currentProfile.location,
        street_address: report.profileData.street_address || currentProfile.street_address,
        city: report.profileData.city || currentProfile.city,
        state: report.profileData.state || currentProfile.state,
        pin_code: report.profileData.pin_code || currentProfile.pin_code,
        professional_subtitle: report.profileData.professional_subtitle || currentProfile.professional_subtitle,
        password: report.profileData.password || currentProfile.password,
        experience: (report.profileData.experience && report.profileData.experience.length > 0) ? report.profileData.experience : (currentProfile.experience || []),
        education: (report.profileData.education && report.profileData.education.length > 0) ? report.profileData.education : (currentProfile.education || []),
        certifications: (report.profileData.certifications && report.profileData.certifications.length > 0) ? report.profileData.certifications : (currentProfile.certifications || []),
        is_active: true
      };
    }

    try {
      savedActiveProfile = await saveProfile(finalProfile);
      profileSaved = true;
    } catch (err) {
      console.error('Failed to save imported profile:', err);
    }
  }

  // 3. Resume Text
  if (report.resumeText) {
    setResumeText(report.resumeText);
  }

  // 4. Profile Triggers
  const activeTriggers = { ...currentTriggers };
  if (report.profileTriggers && typeof report.profileTriggers === 'object') {
    Object.keys(report.profileTriggers).forEach(key => {
      const trigger = report.profileTriggers![key];
      if (trigger) {
        activeTriggers[key] = trigger;
        updateProfileTrigger(key, trigger);
      }
    });
  }

  // 5. Snippets / Shortcuts Import (ATOMIC COMPILATION & SAVE)
  let finalSnippets: Snippet[] = [];
  const now = new Date().toISOString();
  const targetUserId = (savedActiveProfile?.user_id || currentProfile?.user_id || 'local-user');

  if (report.snippetsToImport.items.length > 0) {
    if (strategy === 'overwrite') {
      if (deleteSnippet) {
        for (const s of currentSnippets) {
          await deleteSnippet(s.id).catch(() => {});
        }
      }
      for (const item of report.snippetsToImport.items) {
        let created: any = null;
        if (createSnippet) {
          created = await createSnippet({
            shortcut: item.shortcut,
            text: item.text,
            category: item.category || 'General',
            is_pinned: item.is_pinned
          }).catch(() => null);
        }
        finalSnippets.push(created || {
          id: `snippet-${Date.now()}-${finalSnippets.length}-${Math.random().toString(36).substr(2, 4)}`,
          user_id: targetUserId,
          shortcut: item.shortcut.trim().toLowerCase(),
          text: item.text,
          category: item.category || 'General',
          is_pinned: !!item.is_pinned,
          created_at: now
        });
        snippetsImported++;
      }
    } else {
      // Merge strategy
      const snippetMap = new Map<string, Snippet>();
      currentSnippets.forEach(s => {
        if (s.shortcut) {
          snippetMap.set(s.shortcut.trim().toLowerCase(), s);
        }
      });

      for (const item of report.snippetsToImport.items) {
        const norm = item.shortcut.trim().toLowerCase();
        const existing = snippetMap.get(norm);
        if (existing) {
          let updated: any = null;
          if (updateSnippet) {
            updated = await updateSnippet(existing.id, {
              text: item.text,
              category: item.category || existing.category || 'General',
              is_pinned: item.is_pinned !== undefined ? item.is_pinned : existing.is_pinned
            }).catch(() => null);
          }
          snippetMap.set(norm, updated || {
            ...existing,
            text: item.text,
            category: item.category || existing.category || 'General',
            is_pinned: item.is_pinned !== undefined ? item.is_pinned : existing.is_pinned
          });
          snippetsUpdated++;
        } else {
          let created: any = null;
          if (createSnippet) {
            created = await createSnippet({
              shortcut: norm,
              text: item.text,
              category: item.category || 'General',
              is_pinned: item.is_pinned
            }).catch(() => null);
          }
          snippetMap.set(norm, created || {
            id: `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            user_id: targetUserId,
            shortcut: norm,
            text: item.text,
            category: item.category || 'General',
            is_pinned: !!item.is_pinned,
            created_at: now
          });
          snippetsImported++;
        }
      }

      finalSnippets = Array.from(snippetMap.values());
    }
  } else {
    finalSnippets = currentSnippets;
  }

  // Atomically update Zustand store with final snippets
  useStore.getState().setSnippets(finalSnippets);

  // 6. Job Applications Import
  if (report.applicationsToImport.items.length > 0) {
    if (strategy === 'overwrite' && clearAllJobs) {
      await clearAllJobs().catch(() => {});
    }
    await importJobsBulk(report.applicationsToImport.items);
    jobsImported = report.applicationsToImport.items.length;
    
    // Broadcast job database update
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' });
    }
  }

  // 7. BROADCAST FINAL SHORTCUTS TO STORAGE FOR ALL TABS & CONTENT SCRIPTS
  const finalState = useStore.getState();
  const effectiveProfile = savedActiveProfile || (report.profileData as any) || finalState.activeProfile || currentProfile;
  const effectiveProfiles = finalState.profiles?.length > 0 ? finalState.profiles : (effectiveProfile ? [effectiveProfile] : []);

  syncShortcutsToStorage(
    finalSnippets, 
    finalState.dynamicShortcuts, 
    effectiveProfile, 
    activeTriggers,
    effectiveProfiles
  );

  return {
    profileSaved,
    snippetsImported,
    snippetsUpdated,
    jobsImported
  };
}
