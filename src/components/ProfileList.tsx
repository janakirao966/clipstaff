import { useEffect, useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { 
  Loader2, Save, User, Mail, Phone, Linkedin, MapPin,
  Briefcase, GraduationCap, ChevronDown, ChevronUp,
  Plus, Trash2, AlignLeft, Calendar, CheckCircle2
} from 'lucide-react';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { Experience, Education } from '../types';

// Moved outside to prevent focus loss during state updates
const InputField = ({ label, value, onChange, type = 'text', placeholder = '', icon: Icon }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />}
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-12' : 'px-5'} pr-4 py-3 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const SectionHeader = ({ id, activeSection, setActiveSection, label, icon: Icon }: any) => (
  <button
    type="button"
    onClick={() => setActiveSection(activeSection === id ? '' as any : id)}
    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
      activeSection === id ? 'bg-accent/5 border-accent/20' : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${activeSection === id ? 'bg-accent text-white' : 'bg-white/5 text-muted'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{label}</span>
    </div>
    {activeSection === id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
  </button>
);

export const ProfileList = () => {
  const { fetchProfile, saveProfile } = useProfiles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'experience' | 'education' | 'certs'>('personal');
  
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    portfolio_url: '',
    location: '',
    professional_subtitle: '',
    experience: [] as Experience[],
    education: [] as Education[],
    certifications: [] as string[],
  });

  useEffect(() => {
    fetchProfile().then((p) => {
      if (p) {
        setFormData({
          name: p.name || '',
          full_name: p.full_name || '',
          email: p.email || '',
          phone: p.phone || '',
          linkedin_url: p.linkedin_url || '',
          portfolio_url: p.portfolio_url || '',
          location: p.location || '',
          professional_subtitle: p.professional_subtitle || '',
          experience: p.experience || [],
          education: p.education || [],
          certifications: p.certifications || [],
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile(formData as any);
      toast.success('Profile Saved', {
        description: 'Resume-aligned sections updated.'
      });
    } catch (err) {
      toast.error('Save Failed', {
        description: 'Check your database connection.'
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <SectionHeader id="personal" activeSection={activeSection} setActiveSection={setActiveSection} label="Contact Details" icon={User} />
          {activeSection === 'personal' && (
            <Card className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <InputField label="Full Name" value={formData.full_name} onChange={(v:any) => setFormData({...formData, full_name:v})} icon={User} />
              <InputField label="Email" value={formData.email} onChange={(v:any) => setFormData({...formData, email:v})} type="email" icon={Mail} />
              <InputField label="Phone" value={formData.phone} onChange={(v:any) => setFormData({...formData, phone:v})} icon={Phone} />
              <InputField label="LinkedIn URL" value={formData.linkedin_url} onChange={(v:any) => setFormData({...formData, linkedin_url:v})} icon={Linkedin} />
              <InputField label="Location" value={formData.location} onChange={(v:any) => setFormData({...formData, location:v})} icon={MapPin} />
              <InputField label="Professional Subtitle" value={formData.professional_subtitle} onChange={(v:any) => setFormData({...formData, professional_subtitle:v})} placeholder="e.g. Python | SQL | Azure Data Factory" icon={AlignLeft} />
            </Card>
          )}
        </div>

        {/* Experience Section */}
        <div className="space-y-4">
          <SectionHeader id="experience" activeSection={activeSection} setActiveSection={setActiveSection} label="Work Experience" icon={Briefcase} />
          {activeSection === 'experience' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              {formData.experience.map((exp, index) => (
                <Card key={index} className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => {
                      const newExp = [...formData.experience];
                      newExp.splice(index, 1);
                      setFormData({ ...formData, experience: newExp });
                    }} className="p-2 text-muted hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[9px] font-black text-accent uppercase tracking-widest">Experience Entry #{index + 1}</p>
                  <InputField label="Company Name" value={exp.company} onChange={(v:any) => updateExperience(index, 'company', v)} icon={Briefcase} />
                  <InputField label="Job Title" value={exp.title} onChange={(v:any) => updateExperience(index, 'title', v)} />
                  <InputField label="Location" value={exp.location} onChange={(v:any) => updateExperience(index, 'location', v)} icon={MapPin} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Start Date" value={exp.start_date} onChange={(v:any) => updateExperience(index, 'start_date', v)} placeholder="e.g. Sep 2024" icon={Calendar} />
                    <InputField label="End Date" value={exp.end_date} onChange={(v:any) => updateExperience(index, 'end_date', v)} placeholder="e.g. Present" icon={Calendar} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Job Description (Bullet Points)</label>
                    <div className="relative group">
                      <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
                      <textarea
                        rows={5}
                        placeholder="Paste your bullet points from resume..."
                        className="w-full pl-12 pr-4 py-3 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                        value={exp.description}
                        onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      />
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

        {/* Education Section */}
        <div className="space-y-4">
          <SectionHeader id="education" activeSection={activeSection} setActiveSection={setActiveSection} label="Education" icon={GraduationCap} />
          {activeSection === 'education' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              {formData.education.map((edu, index) => (
                <Card key={index} className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => {
                      const newEdu = [...formData.education];
                      newEdu.splice(index, 1);
                      setFormData({ ...formData, education: newEdu });
                    }} className="p-2 text-muted hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

        {/* Certifications Section */}
        <div className="space-y-4">
          <SectionHeader id="certs" activeSection={activeSection} setActiveSection={setActiveSection} label="Certifications" icon={CheckCircle2} />
          {activeSection === 'certs' && (
            <Card className="bg-[#0A0A0A] border-white/5 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">Certifications (One per line)</label>
                <textarea
                  rows={5}
                  placeholder="AWS Certified Data Engineer..."
                  className="w-full px-5 py-3 bg-black border border-white/5 rounded-xl text-sm text-white placeholder:text-muted/10 focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
                  value={formData.certifications.join('\n')}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split('\n').filter(l => l.trim()) })}
                />
              </div>
            </Card>
          )}
        </div>

        <Button
          type="submit"
          isLoading={saving}
          icon={<Save className="w-4 h-4" />}
          className="w-full py-4 text-sm font-bold tracking-widest mt-8"
        >
          SAVE ALL DETAILS
        </Button>
      </form>
    </div>
  );
};
