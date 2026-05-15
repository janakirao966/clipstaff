import React, { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { X, Save, Loader2 } from 'lucide-react';

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
      alert('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-2 duration-200">
      <header className="flex items-center justify-between p-md border-b border-slate-100">
        <h3 className="text-lg font-bold text-accent">
          {profile ? 'Edit Profile' : 'New Profile'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-md space-y-md">
          <div className="space-y-xs">
            <label className="text-label text-slate-500">Profile Label (e.g. "Software Engineer")</label>
            <input
              required
              className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-md">
            <div className="space-y-xs">
              <label className="text-label text-slate-500">Full Name</label>
              <input
                className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label text-slate-500">Email Address</label>
              <input
                type="email"
                className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-label text-slate-500">LinkedIn URL</label>
            <input
              type="url"
              className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-label text-slate-500">Visa Status</label>
              <input
                className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
                value={formData.visa_status}
                onChange={(e) => setFormData({ ...formData, visa_status: e.target.value })}
                placeholder="H1-B, GC, etc."
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label text-slate-500">Notice Period</label>
              <input
                className="w-full px-sm py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-accent outline-none"
                value={formData.notice_period}
                onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                placeholder="Immediate, 30 days"
              />
            </div>
          </div>

          <div className="flex items-center gap-sm pt-sm">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 accent-accent"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Set as active profile
            </label>
          </div>
        </div>

        <div className="p-md border-t border-slate-100 bg-slate-50">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-sm bg-accent text-white py-2 rounded-md font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
