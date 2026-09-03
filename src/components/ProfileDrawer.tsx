import { useEffect, useState, useRef } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { useSnippets } from '../hooks/useSnippets';
import { useAuth } from '../hooks/useAuth';
import { 
  Loader2, Save, User, Mail, Phone, Linkedin, MapPin,
  Briefcase, GraduationCap, ChevronDown, ChevronUp,
  Plus, Trash2, AlignLeft, Calendar, X, CheckCircle2,
  Globe, Lock, Eye, EyeOff, Download, Upload, ShieldCheck, KeyRound, HelpCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { Experience, Education, ImportAuditReport, ImportStrategy } from '../types';
import { exportProfileBundleJSON, inspectImportJSON, executeProfileImport } from '../lib/profileIO';
import { getAllJobs, importJobsBulk, clearAllJobs } from '../lib/db';
import { ImportAuditModal } from './vault/ImportAuditModal';
import {
  SECURITY_QUESTIONS_PRESETS,
  CUSTOM_QUESTION_TRIGGER,
  saveUserSecurityQuestion,
  changeUserPasswordDirect
} from '../lib/securityQuestions';

// Stable sub-components (outside to prevent focus loss)
const InputField = ({ label, value, onChange, type = 'text', placeholder = '', icon: Icon, trigger, onTriggerChange }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const displayType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1 gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-ash truncate flex-1" title={label}>{label}</label>
        {trigger !== undefined && onTriggerChange && (
          <div className="flex items-center gap-1 bg-carbon px-1.5 py-0.5 rounded border border-graphite shrink-0">
            <span className="text-[8px] font-medium text-ash uppercase tracking-wider">Shortcut:</span>
            <input
              type="text"
              className="w-12 bg-transparent border-none text-[9px] text-accent font-semibold focus:outline-none p-0 text-right"
              value={trigger}
              onChange={(e) => onTriggerChange(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />}
        <input
          type={displayType}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-12' : 'px-4'} ${isPassword ? 'pr-12' : 'pr-4'} py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-mist transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const AccordionHeader = ({ id, activeSection, setActiveSection, label, icon: Icon }: any) => (
  <button
    type="button"
    role="tab"
    aria-expanded={activeSection === id}
    onClick={() => setActiveSection(activeSection === id ? '' : id)}
    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
      activeSection === id ? 'bg-accent/10 border-accent/30 text-white' : 'bg-carbon border-graphite hover:border-smoke text-ash hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${activeSection === id ? 'bg-accent text-void' : 'bg-void text-ash border border-graphite'}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
    {activeSection === id ? <ChevronUp className="w-4 h-4 text-accent" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-ash" aria-hidden="true" />}
  </button>
);

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDrawer = ({ isOpen, onClose }: ProfileDrawerProps) => {
  const { user } = useAuth();
  const { saveProfile, clearActiveProfile } = useProfiles();
  const { createSnippet, updateSnippet, deleteSnippet } = useSnippets();
  const profileTriggers = useStore(state => state.profileTriggers);
  const updateProfileTrigger = useStore(state => state.updateProfileTrigger);
  const resumeText = useStore(state => state.resumeText);
  const setResumeText = useStore(state => state.setResumeText);
  const snippets = useStore(state => state.snippets);
  const activeProfile = useStore(state => state.activeProfile);
  const candidateExclusions = useStore(state => state.candidateExclusions);
  const tailoredBullets = useStore(state => state.tailoredBullets);
  const tailoredCoverLetter = useStore(state => state.tailoredCoverLetter);
  const setProfiles = useStore(state => state.setProfiles);
  const setActiveProfile = useStore(state => state.setActiveProfile);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'experience' | 'education' | 'certs' | 'security'>('personal');
  
  // Security & Password States
  const [newAccPassword, setNewAccPassword] = useState('');
  const [confirmAccPassword, setConfirmAccPassword] = useState('');
  const [showAccPassword, setShowAccPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [selectedSecQuestion, setSelectedSecQuestion] = useState<string>(SECURITY_QUESTIONS_PRESETS[0]);
  const [customSecQuestion, setCustomSecQuestion] = useState('');
  const [secAnswer, setSecAnswer] = useState('');
  const [savingSecQuestion, setSavingSecQuestion] = useState(false);

  // Import Audit Modal State
  const [auditReport, setAuditReport] = useState<ImportAuditReport | null>(null);
  const [auditFileName, setAuditFileName] = useState<string>('');
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [certsInput, setCertsInput] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    portfolio_url: '',
    location: '',
    street_address: '',
    city: '',
    state: '',
    pin_code: '',
    professional_subtitle: '',
    password: '',
    experience: [] as Experience[],
    education: [] as Education[],
    certifications: [] as string[],
  });

  const handleExportProfile = async () => {
    setExporting(true);
    const toastId = toast.loading('Exporting complete Profile JSON bundle...');
    try {
      const allJobs = await getAllJobs().catch(() => []);

      const profileToExport = activeProfile || {
        ...formData,
        id: 'local-profile',
        user_id: 'local-user',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const candidateKey = formData.name || formData.full_name || 'default';
      const profileExclusions = candidateExclusions[candidateKey] || [];

      await exportProfileBundleJSON({
        profile: profileToExport as any,
        resumeText,
        profileTriggers,
        snippets,
        applications: allJobs,
        rulesAndPreferences: {
          candidateExclusions: profileExclusions,
          tailoredBullets,
          tailoredCoverLetter
        }
      });

      toast.dismiss(toastId);
      toast.success('Profile JSON Exported', {
        description: `Exported complete profile, ${snippets.length} shortcuts, and ${allJobs.length} application records.`
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Export Failed', { description: err.message || 'Could not generate Profile JSON.' });
    } finally {
      setExporting(false);
    }
  };

  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const currentJobs = await getAllJobs().catch(() => []);
        const report = inspectImportJSON(text, snippets, currentJobs);

        if (!report.isValid) {
          toast.error('Invalid JSON Format', { description: report.error });
          return;
        }

        setAuditReport(report);
        setAuditFileName(file.name);
        setShowAuditModal(true);
      } catch (err: any) {
        toast.error('Failed to parse file', { description: err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async (strategy: ImportStrategy) => {
    if (!auditReport) return;
    const toastId = toast.loading(`Importing data with ${strategy === 'merge' ? 'Merge & Sync' : 'Fresh Overwrite'}...`);

    try {
      const result = await executeProfileImport({
        report: auditReport,
        strategy,
        currentProfile: activeProfile,
        currentSnippets: snippets,
        currentTriggers: profileTriggers,
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
      });

      // Update local form fields
      if (auditReport.profileData) {
        const p = auditReport.profileData;
        const newCerts = Array.isArray(p.certifications) ? p.certifications : [];
        setFormData(prev => ({
          ...prev,
          name: p.name ?? prev.name,
          full_name: p.full_name ?? prev.full_name,
          first_name: p.first_name ?? prev.first_name,
          middle_name: p.middle_name ?? prev.middle_name,
          last_name: p.last_name ?? prev.last_name,
          email: p.email ?? prev.email,
          phone: p.phone ?? prev.phone,
          linkedin_url: p.linkedin_url ?? prev.linkedin_url,
          portfolio_url: p.portfolio_url ?? prev.portfolio_url,
          location: p.location ?? prev.location,
          street_address: p.street_address ?? prev.street_address,
          city: p.city ?? prev.city,
          state: p.state ?? prev.state,
          pin_code: p.pin_code ?? prev.pin_code,
          professional_subtitle: p.professional_subtitle ?? prev.professional_subtitle,
          password: p.password ?? prev.password,
          experience: p.experience !== undefined ? p.experience : prev.experience,
          education: p.education !== undefined ? p.education : prev.education,
          certifications: p.certifications !== undefined ? newCerts : prev.certifications,
        }));
        if (p.certifications !== undefined) {
          setCertsInput(newCerts.join('\n'));
        }
      }

      toast.dismiss(toastId);
      toast.success('Import Successful', {
        description: `Imported profile, ${result.snippetsImported} new / ${result.snippetsUpdated} updated shortcuts, and ${result.jobsImported} application records.`
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Import Failed', { description: err.message || 'An error occurred during import.' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      const p = activeProfile;
      if (p) {
        setFormData({
          name: p.name || '',
          full_name: p.full_name || '',
          first_name: p.first_name || '',
          middle_name: p.middle_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          phone: p.phone || '',
          linkedin_url: p.linkedin_url || '',
          portfolio_url: p.portfolio_url || '',
          location: p.location || '',
          street_address: p.street_address || '',
          city: p.city || '',
          state: p.state || '',
          pin_code: p.pin_code || '',
          professional_subtitle: p.professional_subtitle || '',
          password: p.password || '',
          experience: Array.isArray(p.experience) ? [...p.experience] : [],
          education: Array.isArray(p.education) ? [...p.education] : [],
          certifications: Array.isArray(p.certifications) ? [...p.certifications] : [],
        });
        setCertsInput(Array.isArray(p.certifications) ? p.certifications.join('\n') : '');
      }

      // Check if user has security question in metadata
      if (user?.user_metadata?.security_question) {
        const q = user.user_metadata.security_question;
        if (SECURITY_QUESTIONS_PRESETS.includes(q as any)) {
          setSelectedSecQuestion(q);
        } else {
          setSelectedSecQuestion(CUSTOM_QUESTION_TRIGGER);
          setCustomSecQuestion(q);
        }
      }
      setLoading(false);
    }
  }, [isOpen, activeProfile, user]);

  const handleChangeAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newAccPassword !== confirmAccPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeUserPasswordDirect(newAccPassword);
      if (res.success) {
        toast.success(res.message);
        setNewAccPassword('');
        setConfirmAccPassword('');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveSecurityQuestionSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveQuestion = selectedSecQuestion === CUSTOM_QUESTION_TRIGGER ? customSecQuestion.trim() : selectedSecQuestion;
    
    if (!effectiveQuestion) {
      toast.error('Please select or specify a security question');
      return;
    }

    if (!secAnswer.trim()) {
      toast.error('Please enter an answer to your security question');
      return;
    }

    setSavingSecQuestion(true);
    try {
      const res = await saveUserSecurityQuestion(effectiveQuestion, secAnswer, user?.email);
      if (res.success) {
        toast.success(res.message);
        setSecAnswer('');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save security question');
    } finally {
      setSavingSecQuestion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedCerts = certsInput
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      await saveProfile({
        ...formData,
        certifications: parsedCerts,
        is_active: activeProfile?.is_active ?? true
      });
      toast.success('Profile Saved', {
        description: 'Profile details and auto-shortcuts updated successfully.'
      });
      onClose();
    } catch (err: any) {
      toast.error('Failed to save profile', {
        description: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearProfile = () => {
    if (confirm('Are you sure you want to clear all profile details?')) {
      clearActiveProfile();
      setFormData({
        name: '',
        full_name: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        portfolio_url: '',
        location: '',
        street_address: '',
        city: '',
        state: '',
        pin_code: '',
        professional_subtitle: '',
        password: '',
        experience: [],
        education: [],
        certifications: [],
      });
      setCertsInput('');
      toast.info('Profile Cleared');
    }
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: '', title: '', location: '', start_date: '', end_date: '', description: '', is_current: false }
      ]
    }));
  };

  const updateExperience = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newExp = [...prev.experience];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, experience: newExp };
    });
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { school: '', degree: '', field_of_study: '', location: '', start_year: '', end_year: '' }
      ]
    }));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newEdu = [...prev.education];
      newEdu[index] = { ...newEdu[index], [field]: value };
      return { ...prev, education: newEdu };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-void border-l border-graphite h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-graphite flex items-center justify-between bg-carbon">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent text-void">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-paper">Candidate Profile</h2>
              <p className="text-[10px] text-ash">Manage details, resume tokens, credentials & security</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export JSON Bundle Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isLoading={exporting}
              onClick={handleExportProfile}
              icon={<Download className="w-3.5 h-3.5" />}
              className="text-[10px] font-bold uppercase tracking-wider text-ash hover:text-accent bg-white/5 border border-white/5 hover:border-accent/30"
              title="Export complete Profile & Shortcuts bundle as JSON"
            >
              Export JSON
            </Button>

            {/* Import JSON Bundle Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSelectImportFile}
              accept=".json"
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-3.5 h-3.5" />}
              className="text-[10px] font-bold uppercase tracking-wider text-ash hover:text-accent bg-white/5 border border-white/5 hover:border-accent/30"
              title="Import Profile & Shortcuts JSON bundle"
            >
              Import JSON
            </Button>

            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-ash hover:text-white hover:bg-white/5 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Personal Details */}
            <div className="space-y-4">
              <AccordionHeader id="personal" activeSection={activeSection} setActiveSection={setActiveSection} label="Personal & Contact Information" icon={User} />
              {activeSection === 'personal' && (
                <Card className="bg-carbon border-graphite p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <InputField 
                    label="Profile Nickname (Label)" 
                    value={formData.name} 
                    onChange={(v:any) => setFormData({...formData, name:v})} 
                    placeholder="e.g. John's Primary Profile" 
                  />
                  <InputField 
                    label="Full Name" 
                    value={formData.full_name} 
                    onChange={(v:any) => setFormData({...formData, full_name:v})} 
                    icon={User} 
                    trigger={profileTriggers.full_name} 
                    onTriggerChange={(v:string) => updateProfileTrigger('full_name', v)} 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <InputField 
                      label="First Name" 
                      value={formData.first_name} 
                      onChange={(v:any) => setFormData({...formData, first_name:v})} 
                      trigger={profileTriggers.first_name} 
                      onTriggerChange={(v:string) => updateProfileTrigger('first_name', v)} 
                    />
                    <InputField 
                      label="Middle Name" 
                      value={formData.middle_name} 
                      onChange={(v:any) => setFormData({...formData, middle_name:v})} 
                      trigger={profileTriggers.middle_name} 
                      onTriggerChange={(v:string) => updateProfileTrigger('middle_name', v)} 
                    />
                    <InputField 
                      label="Last Name" 
                      value={formData.last_name} 
                      onChange={(v:any) => setFormData({...formData, last_name:v})} 
                      trigger={profileTriggers.last_name} 
                      onTriggerChange={(v:string) => updateProfileTrigger('last_name', v)} 
                    />
                  </div>
                  <InputField 
                    label="Email Address" 
                    value={formData.email} 
                    onChange={(v:any) => setFormData({...formData, email:v})} 
                    type="email" 
                    icon={Mail} 
                    trigger={profileTriggers.email} 
                    onTriggerChange={(v:string) => updateProfileTrigger('email', v)} 
                  />
                  <InputField 
                    label="Phone Number" 
                    value={formData.phone} 
                    onChange={(v:any) => setFormData({...formData, phone:v})} 
                    icon={Phone} 
                    trigger={profileTriggers.phone} 
                    onTriggerChange={(v:string) => updateProfileTrigger('phone', v)} 
                  />
                  <InputField 
                    label="LinkedIn URL" 
                    value={formData.linkedin_url} 
                    onChange={(v:any) => setFormData({...formData, linkedin_url:v})} 
                    icon={Linkedin} 
                    trigger={profileTriggers.linkedin_url} 
                    onTriggerChange={(v:string) => updateProfileTrigger('linkedin_url', v)} 
                  />
                  <InputField 
                    label="Portfolio / Website URL" 
                    value={formData.portfolio_url} 
                    onChange={(v:any) => setFormData({...formData, portfolio_url:v})} 
                    icon={Globe} 
                    trigger={profileTriggers.portfolio_url} 
                    onTriggerChange={(v:string) => updateProfileTrigger('portfolio_url', v)} 
                  />
                  <InputField 
                    label="Location (City, Country)" 
                    value={formData.location} 
                    onChange={(v:any) => setFormData({...formData, location:v})} 
                    icon={MapPin} 
                    trigger={profileTriggers.location} 
                    onTriggerChange={(v:string) => updateProfileTrigger('location', v)} 
                  />
                  <InputField 
                    label="Street Address" 
                    value={formData.street_address} 
                    onChange={(v:any) => setFormData({...formData, street_address:v})} 
                    icon={MapPin} 
                    trigger={profileTriggers.street_address} 
                    onTriggerChange={(v:string) => updateProfileTrigger('street_address', v)} 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <InputField 
                      label="City" 
                      value={formData.city} 
                      onChange={(v:any) => setFormData({...formData, city:v})} 
                      trigger={profileTriggers.city} 
                      onTriggerChange={(v:string) => updateProfileTrigger('city', v)} 
                    />
                    <InputField 
                      label="State" 
                      value={formData.state} 
                      onChange={(v:any) => setFormData({...formData, state:v})} 
                      trigger={profileTriggers.state} 
                      onTriggerChange={(v:string) => updateProfileTrigger('state', v)} 
                    />
                    <InputField 
                      label="Pin Code" 
                      value={formData.pin_code} 
                      onChange={(v:any) => setFormData({...formData, pin_code:v})} 
                      trigger={profileTriggers.pin_code} 
                      onTriggerChange={(v:string) => updateProfileTrigger('pin_code', v)} 
                    />
                  </div>
                  <InputField 
                    label="Professional Subtitle" 
                    value={formData.professional_subtitle} 
                    onChange={(v:any) => setFormData({...formData, professional_subtitle:v})} 
                    placeholder="e.g. Python | SQL | Azure Data Factory" 
                    icon={AlignLeft} 
                    trigger={profileTriggers.professional_subtitle} 
                    onTriggerChange={(v:string) => updateProfileTrigger('professional_subtitle', v)} 
                  />
                  <InputField 
                    label="Job Application Form Password" 
                    value={formData.password} 
                    onChange={(v:any) => setFormData({...formData, password:v})} 
                    type="password" 
                    icon={Lock} 
                    trigger={profileTriggers.password} 
                    onTriggerChange={(v:string) => updateProfileTrigger('password', v)} 
                  />
                </Card>
              )}
            </div>

            {/* Work Experience */}
            <div className="space-y-4">
              <AccordionHeader id="experience" activeSection={activeSection} setActiveSection={setActiveSection} label="Work Experience" icon={Briefcase} />
              {activeSection === 'experience' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {formData.experience.map((exp, index) => (
                    <Card key={index} className="bg-carbon border-graphite p-5 space-y-4 relative group">
                      <div className="absolute right-4 top-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => {
                          const n = [...formData.experience]; n.splice(index, 1);
                          setFormData({ ...formData, experience: n });
                        }} className="p-2 text-ash hover:text-coral-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest">Experience #{index + 1}</p>
                      <InputField label="Company Name" value={exp.company} onChange={(v:any) => updateExperience(index, 'company', v)} icon={Briefcase} />
                      <InputField label="Job Title" value={exp.title} onChange={(v:any) => updateExperience(index, 'title', v)} />
                      <InputField label="Location" value={exp.location} onChange={(v:any) => updateExperience(index, 'location', v)} icon={MapPin} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Start Date" value={exp.start_date} onChange={(v:any) => updateExperience(index, 'start_date', v)} placeholder="Sep 2024" icon={Calendar} />
                        <InputField label="End Date" value={exp.end_date} onChange={(v:any) => updateExperience(index, 'end_date', v)} placeholder="Present" icon={Calendar} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ash ml-1">Job Description (Bullets)</label>
                        <div className="relative group">
                          <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                          <textarea rows={5} placeholder="Paste bullet points..." className="w-full pl-12 pr-4 py-3 bg-void border border-graphite rounded-xl text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                            value={exp.description} onChange={(e) => updateExperience(index, 'description', e.target.value)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="secondary" onClick={addExperience} icon={<Plus className="w-4 h-4" />} className="w-full py-3 bg-white/5 border-dashed border-graphite hover:border-accent/40">
                    Add Work Experience
                  </Button>
                </div>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <AccordionHeader id="education" activeSection={activeSection} setActiveSection={setActiveSection} label="Education" icon={GraduationCap} />
              {activeSection === 'education' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {formData.education.map((edu, index) => (
                    <Card key={index} className="bg-carbon border-graphite p-5 space-y-4 relative group">
                      <div className="absolute right-4 top-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => {
                          const n = [...formData.education]; n.splice(index, 1);
                          setFormData({ ...formData, education: n });
                        }} className="p-2 text-ash hover:text-coral-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <InputField label="University Name" value={edu.school} onChange={(v:any) => updateEducation(index, 'school', v)} icon={GraduationCap} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Degree" value={edu.degree} onChange={(v:any) => updateEducation(index, 'degree', v)} />
                        <InputField label="Field of Study" value={edu.field_of_study || ''} onChange={(v:any) => updateEducation(index, 'field_of_study', v)} />
                      </div>
                      <InputField label="Location" value={edu.location} onChange={(v:any) => updateEducation(index, 'location', v)} icon={MapPin} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Start Year" value={edu.start_year} onChange={(v:any) => updateEducation(index, 'start_year', v)} icon={Calendar} />
                        <InputField label="Graduation Year" value={edu.end_year} onChange={(v:any) => updateEducation(index, 'end_year', v)} icon={Calendar} />
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="secondary" onClick={addEducation} icon={<Plus className="w-4 h-4" />} className="w-full py-3 bg-white/5 border-dashed border-graphite hover:border-accent/40">
                    Add Education
                  </Button>
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="space-y-4">
              <AccordionHeader id="certs" activeSection={activeSection} setActiveSection={setActiveSection} label="Certifications" icon={CheckCircle2} />
              {activeSection === 'certs' && (
                <Card className="bg-carbon border-graphite p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ash">Certifications (One per line)</label>
                      {certsInput.trim() && (
                        <button
                          type="button"
                          onClick={() => setCertsInput('')}
                          className="text-[9px] font-bold text-coral-red hover:underline uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <textarea 
                      rows={5} 
                      placeholder="AWS Certified Solutions Architect&#10;Google Cloud Professional Data Engineer&#10;Azure Fundamentals" 
                      className="w-full px-5 py-3 bg-void border border-graphite rounded-xl text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed font-mono"
                      value={certsInput} 
                      onChange={(e) => setCertsInput(e.target.value)} 
                    />
                    <p className="text-[9px] text-ash/80 ml-1">
                      Each line auto-creates a quick shortcut (<code className="text-accent">cert1</code>, <code className="text-accent">cert2</code>) and bulleted list (<code className="text-accent">certs;</code>).
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Security & Password Management (New Section) */}
            <div className="space-y-4">
              <AccordionHeader id="security" activeSection={activeSection} setActiveSection={setActiveSection} label="Security & Password Management" icon={ShieldCheck} />
              {activeSection === 'security' && (
                <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                  {/* Direct Password Update */}
                  <Card className="bg-carbon border-graphite p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-graphite/60 pb-3">
                      <KeyRound className="w-4 h-4 text-accent" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Change Account Password</h4>
                        <p className="text-[10px] text-ash">Directly update your account login password without security questions</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-ash ml-1">New Password</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                          <input
                            type={showAccPassword ? 'text' : 'password'}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-12 pr-12 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all"
                            value={newAccPassword}
                            onChange={(e) => setNewAccPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAccPassword(!showAccPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-mist transition-colors"
                          >
                            {showAccPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-ash ml-1">Confirm New Password</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                          <input
                            type={showAccPassword ? 'text' : 'password'}
                            placeholder="Repeat new password"
                            className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all"
                            value={confirmAccPassword}
                            onChange={(e) => setConfirmAccPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        isLoading={changingPassword}
                        onClick={handleChangeAccountPassword}
                        icon={<KeyRound className="w-3.5 h-3.5" />}
                        className="w-full py-2.5 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Update Account Password
                      </Button>
                    </div>
                  </Card>

                  {/* Security Question Setup & Recovery Config */}
                  <Card className="bg-carbon border-graphite p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-graphite/60 pb-3">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Security Question Setup</h4>
                        <p className="text-[10px] text-ash">Configure a question to easily reset your password if you ever forget it</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-ash ml-1">Select Recovery Question</label>
                        <select
                          value={selectedSecQuestion}
                          onChange={(e) => setSelectedSecQuestion(e.target.value)}
                          className="w-full px-3 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist focus:outline-none focus:border-accent/40 transition-all cursor-pointer"
                        >
                          {SECURITY_QUESTIONS_PRESETS.map((q, idx) => (
                            <option key={idx} value={q} className="bg-carbon text-mist">
                              {q}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedSecQuestion === CUSTOM_QUESTION_TRIGGER && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-ash ml-1">Custom Question</label>
                          <input
                            type="text"
                            placeholder="e.g. What was your childhood dream job?"
                            className="w-full px-3 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all"
                            value={customSecQuestion}
                            onChange={(e) => setCustomSecQuestion(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-ash ml-1">Security Answer</label>
                        <div className="relative group">
                          <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                          <input
                            type="text"
                            placeholder="Enter your security answer"
                            className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all"
                            value={secAnswer}
                            onChange={(e) => setSecAnswer(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        isLoading={savingSecQuestion}
                        onClick={handleSaveSecurityQuestionSetup}
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        className="w-full py-2.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/30 text-mist hover:text-accent"
                      >
                        Save Security Question
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleClearProfile}
                className="px-4 py-4 text-xs font-bold tracking-wider text-ash hover:text-coral-red bg-white/5 border border-white/5 hover:border-coral-red/30 transition-colors shrink-0"
              >
                Clear Profile
              </Button>
              <Button type="submit" isLoading={saving} icon={<Save className="w-4 h-4" />} className="flex-1 py-4 text-xs font-bold tracking-widest shadow-lg shadow-accent/10">
                SAVE PROFILE
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Import Audit Modal */}
      <ImportAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        report={auditReport}
        fileName={auditFileName}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
};
