import { useEffect, useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { 
  Loader2, Save, User, Mail, Phone, Linkedin, MapPin,
  Briefcase, GraduationCap, ChevronDown, ChevronUp,
  Plus, Trash2, AlignLeft, Calendar, X, CheckCircle2,
  Globe, Lock, Eye, EyeOff
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { Experience, Education } from '../types';
import { parseExperiencesFromResumeText } from '../lib/resumeParser';

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
    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
      activeSection === id ? 'bg-accent/5 border-accent/20' : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${activeSection === id ? 'bg-accent text-white' : 'bg-white/5 text-muted'}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{label}</span>
    </div>
    {activeSection === id ? <ChevronUp className="w-4 h-4 text-muted" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-muted" aria-hidden="true" />}
  </button>
);

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDrawer = ({ isOpen, onClose }: ProfileDrawerProps) => {
  const { fetchProfile, saveProfile } = useProfiles();
  const { profileTriggers, updateProfileTrigger, setResumeText } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'experience' | 'education' | 'certs'>('personal');
  
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

  const handleImportProfileJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Extract root object key (e.g., "sriharsha" or "maruthi")
        const rootKey = Object.keys(parsed)[0];
        const data = parsed[rootKey];

        if (!data || !data.profile) {
          toast.error('Invalid Profile Backup', {
            description: 'Provide a valid Profile Backup JSON file.'
          });
          return;
        }

        const p = data.profile;
        const resumeRawText = data.text || '';

        // Extract and map experiences from text using isolated utility
        const parsedExperiences = parseExperiencesFromResumeText(resumeRawText);

        const education = (p.education || []).map((edu: any) => ({
          degree: edu.degree || '',
          field_of_study: edu.field_of_study || '',
          school: edu.school || '',
          location: edu.location || '',
          start_year: edu.dates ? edu.dates.split(/[–-]/)[0]?.trim() || '' : edu.start_year || '',
          end_year: edu.dates ? edu.dates.split(/[–-]/)[1]?.trim() || '' : edu.end_year || ''
        }));

        setFormData({
          name: rootKey || p.name || '',
          full_name: p.name || '',
          first_name: p.first_name || '',
          middle_name: p.middle_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          phone: p.phone || '',
          linkedin_url: p.linkedin || '',
          portfolio_url: '',
          location: p.location || '',
          street_address: p.street_address || '',
          city: p.city || '',
          state: p.state || '',
          pin_code: p.pin_code || '',
          professional_subtitle: p.subtitle || '',
          password: p.password || '',
          experience: parsedExperiences,
          education: education,
          certifications: p.certs || []
        });

        // Set resumeText in the store so ResumeBuilder gets it and syncs experience shortcuts
        if (resumeRawText) {
          setResumeText(resumeRawText);
        }

        toast.success('Backup JSON Loaded', {
          description: 'Click Save to persist changes and update shortcuts.'
        });

        e.target.value = '';
      } catch (err) {
        toast.error('Load Failed', {
          description: 'Failed to parse the Profile Backup JSON file.'
        });
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfile().then((p) => {
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
            experience: p.experience || [],
            education: p.education || [],
            certifications: p.certifications || [],
          });
        }
        setLoading(false);
      });
    }
  }, [isOpen, fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile(formData as any);
      toast.success('Profile Saved');
    } catch {
      toast.error('Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, { company: '', title: '', location: '', start_date: '', end_date: '', description: '' }]
    });
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const newExp = [...formData.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    setFormData({ ...formData, experience: newExp });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: '', field_of_study: '', school: '', location: '', start_year: '', end_year: '' }]
    });
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const newEdu = [...formData.education];
    newEdu[index] = { ...newEdu[index], [field]: value };
    setFormData({ ...formData, education: newEdu });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-md bg-[#050505] border-l border-white/10 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#0A0A0A] border-b border-white/5">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">My Profile</h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="profile-json-import"
                accept=".json"
                className="hidden"
                onChange={handleImportProfileJSON}
              />
              <label
                htmlFor="profile-json-import"
                className="cursor-pointer px-3 py-1.5 bg-white/5 hover:bg-accent/10 border border-white/5 hover:border-accent/20 rounded-lg text-[9px] font-bold uppercase tracking-wider text-muted hover:text-accent transition-all"
              >
                Import JSON
              </label>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-20">
            {/* Contact Details */}
            <div className="space-y-4">
              <AccordionHeader id="personal" activeSection={activeSection} setActiveSection={setActiveSection} label="Contact Details" icon={User} />
              {activeSection === 'personal' && (
                <Card className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <InputField 
                    label="Full Name" 
                    value={formData.full_name} 
                    onChange={(v:any) => setFormData({...formData, full_name:v})} 
                    icon={User} 
                    trigger={profileTriggers.full_name} 
                    onTriggerChange={(v:string) => updateProfileTrigger('full_name', v)} 
                  />
                  <div className="grid grid-cols-3 gap-2">
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
                    label="Email" 
                    value={formData.email} 
                    onChange={(v:any) => setFormData({...formData, email:v})} 
                    type="email" 
                    icon={Mail} 
                    trigger={profileTriggers.email} 
                    onTriggerChange={(v:string) => updateProfileTrigger('email', v)} 
                  />
                  <InputField 
                    label="Phone" 
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
                    label="Portfolio URL" 
                    value={formData.portfolio_url} 
                    onChange={(v:any) => setFormData({...formData, portfolio_url:v})} 
                    icon={Globe} 
                    trigger={profileTriggers.portfolio_url} 
                    onTriggerChange={(v:string) => updateProfileTrigger('portfolio_url', v)} 
                  />
                  <InputField 
                    label="Location" 
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
                  <div className="grid grid-cols-3 gap-2">
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
                    label="Password" 
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
                    <Card key={index} className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 relative group">
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => {
                          const n = [...formData.experience]; n.splice(index, 1);
                          setFormData({ ...formData, experience: n });
                        }} className="p-2 text-muted hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Job Description (Bullets)</label>
                        <div className="relative group">
                          <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                          <textarea rows={5} placeholder="Paste bullet points..." className="w-full pl-12 pr-4 py-3 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                            value={exp.description} onChange={(e) => updateExperience(index, 'description', e.target.value)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="secondary" onClick={addExperience} icon={<Plus className="w-4 h-4" />} className="w-full py-3 bg-white/5 border-dashed border-white/10">
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
                    <Card key={index} className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 relative group">
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => {
                          const n = [...formData.education]; n.splice(index, 1);
                          setFormData({ ...formData, education: n });
                        }} className="p-2 text-muted hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
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
                  <Button type="button" variant="secondary" onClick={addEducation} icon={<Plus className="w-4 h-4" />} className="w-full py-3 bg-white/5 border-dashed border-white/10">
                    Add Education
                  </Button>
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="space-y-4">
              <AccordionHeader id="certs" activeSection={activeSection} setActiveSection={setActiveSection} label="Certifications" icon={CheckCircle2} />
              {activeSection === 'certs' && (
                <Card className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Certifications (One per line)</label>
                    <textarea rows={5} placeholder="AWS Certified Data Engineer..." className="w-full px-5 py-3 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                      value={formData.certifications.join('\n')} onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split('\n').filter(l => l.trim()) })} />
                  </div>
                </Card>
              )}
            </div>

            <Button type="submit" isLoading={saving} icon={<Save className="w-4 h-4" />} className="w-full py-4 text-sm font-bold tracking-widest mt-8">
              SAVE PROFILE
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
