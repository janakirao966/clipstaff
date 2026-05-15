import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useProfiles } from '../hooks/useProfiles';
import { copyToClipboard } from '../lib/clipboard';
import { 
  User, Plus, Edit2, Trash2, CheckCircle2, Loader2, 
  Mail, Phone, Linkedin, Globe, MapPin 
} from 'lucide-react';
import { ProfileDetail } from './ProfileDetail';

export const ProfileList = () => {
  const { profiles } = useStore();
  const { fetchProfiles, deleteProfile, toggleActiveProfile } = useProfiles();
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const activeProfile = profiles.find(p => p.is_active);

  useEffect(() => {
    fetchProfiles().finally(() => setLoading(false));
  }, []);

  const handleCopy = async (text: string | null | undefined, label: string) => {
    await copyToClipboard(text, label);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Primary Identity Display */}
      <div className="bg-gradient-to-b from-[#0A0A0A] to-black border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
          <User className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 bg-accent/20 border border-accent/20 rounded-full">
              <span className="text-[10px] font-mono font-black text-accent-light uppercase tracking-[0.2em]">Primary Persona</span>
            </div>
          </div>
          
          <h2 className="text-4xl font-display font-black tracking-tight text-white mb-2 leading-none">
            {activeProfile?.full_name || 'Anonymous'}
          </h2>
          <p className="text-muted text-sm font-medium tracking-wide opacity-60">
            {activeProfile?.title || 'System Identity Restricted'}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-8">
            {[
              { label: 'Email', value: activeProfile?.email, icon: Mail },
              { label: 'Phone', value: activeProfile?.phone, icon: Phone },
              { label: 'LinkedIn', value: activeProfile?.linkedin_url, icon: Linkedin },
              { label: 'Portfolio', value: activeProfile?.portfolio_url, icon: Globe },
            ].filter(f => f.value).map((field) => (
              <button
                key={field.label}
                onClick={() => handleCopy(field.value, field.label)}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all text-left group/field"
              >
                <div className="p-2 rounded-lg bg-black/50 group-hover/field:bg-accent/20 transition-colors">
                  <field.icon className="w-3.5 h-3.5 text-muted group-hover/field:text-accent-light" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted group-hover/field:text-accent-light/70 leading-none mb-1">{field.label}</span>
                  <span className="text-[10px] font-bold text-slate-200 truncate">{field.value}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Identity Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Identity Vault</h3>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-xl border border-white/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Persona</span>
          </button>
        </div>

        <div className="grid gap-3">
          {profiles.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-muted">
              <User className="w-12 h-12 opacity-10 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">Vault Empty</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className={`group p-5 rounded-[1.5rem] border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                  profile.is_active 
                    ? 'bg-accent/5 border-accent/30 shadow-accent-glow' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
                onClick={() => toggleActiveProfile(profile.id)}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      profile.is_active ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-muted group-hover:text-white'
                    }`}>
                      {profile.is_active ? <CheckCircle2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-white tracking-tight leading-tight">{profile.full_name}</h4>
                      <p className="text-[11px] text-muted font-medium opacity-60">{profile.title || 'No title set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(profile);
                      }}
                      className="p-2.5 text-muted hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Archive identity "${profile.full_name}"?`)) {
                          deleteProfile(profile.id);
                        }
                      }}
                      className="p-2.5 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {(isAdding || editingProfile) && (
        <ProfileDetail
          profile={editingProfile}
          onClose={() => {
            setIsAdding(false);
            setEditingProfile(null);
          }}
        />
      )}
    </div>
  );
};
