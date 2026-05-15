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
    <div className="flex flex-col h-full bg-white">
      {/* Active Profile Quick Copy */}
      {activeProfile && (
        <div className="p-md bg-accent/5 border-b border-accent/10">
          <div className="flex items-center gap-2 mb-md">
            <div className="p-1.5 bg-accent text-white rounded-md">
              <User className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Active: {activeProfile.name}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Full Name', value: activeProfile.full_name, icon: User },
              { label: 'Email', value: activeProfile.email, icon: Mail },
              { label: 'Phone', value: activeProfile.phone, icon: Phone },
              { label: 'LinkedIn', value: activeProfile.linkedin_url, icon: Linkedin },
              { label: 'Portfolio', value: activeProfile.portfolio_url, icon: Globe },
              { label: 'Location', value: activeProfile.location, icon: MapPin },
              { label: 'Visa', value: activeProfile.visa_status, icon: CreditCard },
              { label: 'Notice', value: activeProfile.notice_period, icon: Clock },
            ].filter(f => f.value).map((field) => (
              <button
                key={field.label}
                onClick={() => handleCopy(field.value, field.label)}
                className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg hover:border-accent hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <field.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent flex-shrink-0" />
                  <span className="text-[11px] font-medium text-slate-600 truncate">{field.label}</span>
                </div>
                {copiedField === field.label ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-300 group-hover:text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-md border-b border-slate-100 bg-white">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">All Profiles</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1 text-slate-400 hover:text-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-xl text-center space-y-sm">
            <User className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">No profiles created yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center justify-between p-md hover:bg-slate-50 transition-colors group ${
                  profile.is_active ? 'bg-slate-50/50' : ''
                }`}
              >
                <div className="flex items-center gap-md">
                  <button
                    onClick={() => toggleActiveProfile(profile.id)}
                    className="flex-shrink-0"
                    title={profile.is_active ? "Active" : "Set Active"}
                  >
                    {profile.is_active ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${profile.is_active ? 'text-accent' : 'text-slate-700'}`}>
                      {profile.name}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">
                      {profile.full_name || 'No name set'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingProfile(profile)}
                    className="p-1.5 text-slate-400 hover:text-accent hover:bg-white rounded-md transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete profile "${profile.name}"?`)) {
                        deleteProfile(profile.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-destructive hover:bg-white rounded-md transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
