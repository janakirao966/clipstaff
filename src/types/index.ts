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
}

export interface VaultJob {
  id: string;
  profileName: string;
  company: string;
  role: string;
  url: string;
  status: 'not_applied' | 'applied' | 'skipped';
  dateAdded?: string;
}

export interface SheetTab {
  name: string;
  jobs: Job[];
}

