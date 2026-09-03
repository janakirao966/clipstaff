export interface Experience {
  company: string;
  title: string;
  location: string;
  start_date: string; // Month/Year
  end_date: string;   // Month/Year
  description: string;
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  start_year: string;
  end_year: string;
  field_of_study?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  professional_subtitle: string | null;
  experience: Experience[];
  education: Education[];
  certifications: string[];
  password?: string | null;

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
  is_pinned?: boolean;
}

export interface UserContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  url: string;
  dateAdded?: string;
  status: 'not_applied' | 'applied' | 'skipped';
  syncState?: 'pending' | 'synced' | 'error';
  lastSyncedAt?: number;
  retryCount?: number;
  lastRetryAt?: number;
  version?: number;
  createdAt?: number;
  updatedAt?: number;
  appliedAt?: number;
  rowIndex?: number;
}

export interface VaultJob {
  id: string;
  profileName: string;
  company: string;
  role: string;
  url: string;
  status: 'not_applied' | 'applied' | 'skipped';
  dateAdded?: string;
  createdAt?: number;
  updatedAt?: number;
  appliedAt?: number;
  rowIndex?: number;
}

export interface SheetTab {
  name: string;
  jobs: Job[];
}

export interface ProfileRulesAndPreferences {
  candidateExclusions?: string[];
  tailoredBullets?: string[];
  tailoredCoverLetter?: string;
  lastEligibilityResult?: any;
}

export interface ProfileBundleJSON {
  version: string;
  exportedAt: string;
  app: 'ClipStaff';
  type: 'clipstaff_profile_bundle';
  profile: Profile;
  resumeText?: string;
  profileTriggers?: Record<string, string>;
  snippets?: Snippet[];
  applications?: Job[];
  rulesAndPreferences?: ProfileRulesAndPreferences;
}

export interface SystemBackupJSON {
  version: string;
  exportedAt: string;
  app: 'ClipStaff';
  type: 'clipstaff_system_backup';
  activeProfileId?: string;
  profiles: Profile[];
  profileTriggers?: Record<string, string>;
  resumeText?: string;
  snippets: Snippet[];
  applications: Job[];
  vaultJobs?: VaultJob[];
  sheetTabs?: SheetTab[];
  globalExclusions?: string[];
  sectorExclusions?: string[];
  candidateExclusions?: Record<string, string[]>;
  spreadsheetUrl?: string;
  googleWebAppUrl?: string;
}

export type DetectedImportFormat = 
  | 'clipstaff_profile_bundle'
  | 'clipstaff_system_backup'
  | 'legacy_profile_json'
  | 'snippets_array'
  | 'shortcuts_map'
  | 'jobs_array'
  | 'unknown';

export type ImportStrategy = 'merge' | 'overwrite';

export interface ImportAuditReport {
  format: DetectedImportFormat;
  version?: string;
  exportedAt?: string;
  isValid: boolean;
  error?: string;
  warnings: string[];
  
  // Profile Summary
  profileData?: Partial<Profile> | null;
  allProfiles?: Profile[];
  profileName?: string;
  profileFieldCount: number;
  
  // Triggers & Text
  profileTriggers?: Record<string, string>;
  resumeText?: string;
  
  // Snippets/Shortcuts Summary
  snippetsToImport: {
    total: number;
    newCount: number;
    updateCount: number;
    items: { shortcut: string; text: string; category?: string; is_pinned?: boolean }[];
  };
  
  // Applications Summary
  applicationsToImport: {
    total: number;
    newCount: number;
    upgradeCount: number;
    items: Job[];
  };
  
  // Rules & Extras
  rulesAndPreferences?: ProfileRulesAndPreferences;
  systemBackupData?: Partial<SystemBackupJSON>;
}
