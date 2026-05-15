import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useProfiles } from '../hooks/useProfiles';
import { copyToClipboard } from '../lib/clipboard';
import { 
  User, Plus, Edit2, Trash2, CheckCircle2, Circle, Loader2, 
  Mail, Phone, Linkedin, Globe, MapPin, CreditCard, Clock, Copy, Check 
} from 'lucide-react';
import { ProfileDetail } from './ProfileDetail';

export const ProfileList = () => {
  const { profiles } = useStore();
  const { fetchProfiles, deleteProfile, toggleActiveProfile } = useProfiles();
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeProfile = profiles.find(p => p.is_active);

  useEffect(() => {
    fetchProfiles().finally(() => setLoading(false));
  }, []);

  const handleCopy = async (text: string | null | undefined, label: string) => {
    const success = await copyToClipboard(text, label);
    if (success) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Active Profile Banner */}
      {activeProfile && (
        <div className="mx-4 mt-6 p-5 bg-accent/10 border border-accent/20 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-4 mb-5 relative z-10">
            <div className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center shadow-accent-glow">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-light mb-0.5">Active Persona</h3>
              <p className="text-base font-display font-bold text-white tracking-tight">{activeProfile.name}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 relative z-10">
            {[
              { label: 'Name', value: activeProfile.full_name, icon: User },
              { label: 'Email', value: activeProfile.email, icon: Mail },
              { label: 'Phone', value: activeProfile.phone, icon: Phone },
              { label: 'LinkedIn', value: activeProfile.linkedin_url, icon: Linkedin },
              { label: 'Portfolio', value: activeProfile.portfolio_url, icon: Globe },
              { label: 'Location', value: activeProfile.location, icon: MapPin },
            ].filter(f => f.value).map((field) => (
              <button
                key={field.label}
                onClick={() => handleCopy(field.value, field.label)}
                className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all duration-300 text-left group/field"
              >
                <div className="p-1.5 rounded-lg bg-surface group-hover/field:bg-accent/20 transition-colors">
                  <field.icon className="w-3 h-3 text-muted group-hover/field:text-accent-light" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-muted group-hover/field:text-accent-light/70">{field.label}</span>
                  <span className="text-[10px] font-medium text-slate-200 truncate">{field.value}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">All Vaults</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="w-8 h-8 flex items-center justify-center bg-accent/10 text-accent-light rounded-lg hover:bg-accent hover:text-white transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 space-y-2">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-4 border border-white/5">
              <User className="w-8 h-8 text-muted/30" />
            </div>
            <p className="text-sm font-medium text-muted">Initialize your first persona</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 cursor-pointer ${
                profile.is_active 
                  ? 'bg-accent/5 border-accent/20 shadow-lg shadow-accent/5' 
                  : 'bg-surface/40 border-white/5 hover:border-white/20 hover:bg-surface/60'
              }`}
              onClick={() => toggleActiveProfile(profile.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  profile.is_active ? 'bg-accent text-white shadow-accent-glow' : 'bg-surface-lighter text-muted group-hover:text-white'
                }`}>
                  {profile.is_active ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-display font-bold tracking-tight transition-colors ${profile.is_active ? 'text-white' : 'text-slate-300'}`}>
                    {profile.name}
                  </span>
                  <span className="text-[10px] font-medium text-muted">
                    {profile.full_name || 'Empty Profile'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingProfile(profile); }}
                  className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Archive persona "${profile.name}"?`)) {
                      deleteProfile(profile.id);
                    }
                  }}
                  className="p-2 text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
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
