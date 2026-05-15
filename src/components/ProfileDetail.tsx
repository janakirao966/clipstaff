import React, { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { X, Loader2, Save, Fingerprint } from 'lucide-react';

interface ProfileDetailProps {
  profile?: any;
  onClose: () => void;
}

export const ProfileDetail: React.FC<ProfileDetailProps> = ({ profile, onClose }) => {
  const { createProfile, updateProfile } = useProfiles();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    linkedin_url: profile?.linkedin_url || '',
    portfolio_url: profile?.portfolio_url || '',
    location: profile?.location || '',
    visa_status: profile?.visa_status || '',
    notice_period: profile?.notice_period || '',
    is_active: profile?.is_active || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (profile) {
        await updateProfile(profile.id, formData);
      } else {
        await createProfile(formData);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, field, type = 'text', placeholder = '' }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder:text-muted/30 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all"
        value={(formData as any)[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col w-full max-w-[450px] mx-auto bg-[#0A0A0A] border-x border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-10 pb-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/20">
              <Fingerprint className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black tracking-tight text-white">
                {profile ? 'Modify Identity' : 'Establish Identity'}
              </h3>
              <p className="text-[9px] font-mono text-muted uppercase tracking-widest">Vault Record Encryption: Enabled</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5 text-muted" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <Input label="Vault Identifier" field="name" placeholder="e.g. Senior Recruiter" />
            
            <div className="h-px bg-white/5 my-4" />
            
            <Input label="Legal Full Name" field="full_name" />
            <Input label="Professional Email" field="email" type="email" />
            <Input label="Contact Terminal" field="phone" />
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Visa Class" field="visa_status" placeholder="H1-B / L1" />
              <Input label="Activation Delta" field="notice_period" placeholder="Immediate" />
            </div>

            <Input label="LinkedIn Directory" field="linkedin_url" type="url" />

            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 mt-4">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </div>
              <span className="text-xs font-bold text-white tracking-tight">Active Identity Sync</span>
            </div>
          </div>

          <div className="p-6 bg-[#0A0A0A] border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="w-full group bg-accent hover:bg-accent-light text-white py-4 rounded-2xl font-display font-black tracking-tight text-lg shadow-accent-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Commit to Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
