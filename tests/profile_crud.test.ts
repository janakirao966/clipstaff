import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../src/store/useStore';
import { syncShortcutsToStorage } from '../src/lib/sync';
import { Profile } from '../src/types';

describe('Profile Add / Update / Delete & Certification Operations (CRUD Audit)', () => {
  beforeEach(() => {
    useStore.getState().resetStore();
  });

  it('should add a fresh profile with certifications, experience, and education', () => {
    const profile: Profile = {
      id: 'profile-vamsi',
      user_id: 'local-user',
      name: 'Vamsi Krishna',
      full_name: 'Vamsi Krishna G',
      email: 'vamsi@example.com',
      phone: '+1 555-0199',
      certifications: [
        'AWS Certified Solutions Architect',
        'Google Cloud Professional Data Engineer',
        'HashiCorp Certified: Terraform Associate'
      ],
      experience: [
        { company: 'Meta', title: 'Senior Data Engineer', start_date: '2022', end_date: 'Present' }
      ],
      education: [
        { school: 'Stanford University', degree: 'MS', field_of_study: 'Computer Science' }
      ],
      is_active: true
    };

    useStore.getState().setProfiles([profile]);
    useStore.getState().setActiveProfile(profile);

    const active = useStore.getState().activeProfile;
    expect(active).not.toBeNull();
    expect(active?.certifications).toHaveLength(3);
    expect(active?.certifications[0]).toBe('AWS Certified Solutions Architect');

    // Test shortcut generation
    const shortcuts = syncShortcutsToStorage([], {}, active, {});
    expect(shortcuts['cert1']).toBe('AWS Certified Solutions Architect');
    expect(shortcuts['cert2']).toBe('Google Cloud Professional Data Engineer');
    expect(shortcuts['cert3']).toBe('HashiCorp Certified: Terraform Associate');
    expect(shortcuts['certs;']).toContain('AWS Certified Solutions Architect');
    expect(shortcuts['certs;']).toContain('Google Cloud Professional Data Engineer');
  });

  it('should update certifications by deleting one item and preserving remaining ones', () => {
    const initialProfile: Profile = {
      id: 'profile-vamsi',
      user_id: 'local-user',
      name: 'Vamsi Krishna',
      full_name: 'Vamsi Krishna G',
      certifications: [
        'AWS Certified Solutions Architect',
        'Google Cloud Professional Data Engineer',
        'HashiCorp Certified: Terraform Associate'
      ],
      is_active: true
    };

    useStore.getState().setActiveProfile(initialProfile);

    // User removes "Google Cloud Professional Data Engineer"
    const updatedCerts = [
      'AWS Certified Solutions Architect',
      'HashiCorp Certified: Terraform Associate'
    ];

    const updatedProfile: Profile = {
      ...initialProfile,
      certifications: updatedCerts,
      updated_at: new Date().toISOString()
    };

    useStore.getState().updateProfileInStore(updatedProfile);

    const active = useStore.getState().activeProfile;
    expect(active?.certifications).toHaveLength(2);
    expect(active?.certifications).not.toContain('Google Cloud Professional Data Engineer');
    expect(active?.certifications).toContain('AWS Certified Solutions Architect');
    expect(active?.certifications).toContain('HashiCorp Certified: Terraform Associate');

    const shortcuts = syncShortcutsToStorage([], {}, active, {});
    expect(shortcuts['cert1']).toBe('AWS Certified Solutions Architect');
    expect(shortcuts['cert2']).toBe('HashiCorp Certified: Terraform Associate');
    expect(shortcuts['cert3']).toBeUndefined();
    expect(shortcuts['certs;']).not.toContain('Google Cloud Professional Data Engineer');
  });

  it('should cleanly delete all certifications and not revert to old data', () => {
    const initialProfile: Profile = {
      id: 'profile-1',
      user_id: 'local-user',
      name: 'Test Candidate',
      certifications: ['Certification A', 'Certification B'],
      is_active: true
    };

    useStore.getState().setActiveProfile(initialProfile);

    // User clears all certifications
    const clearedProfile: Profile = {
      ...initialProfile,
      certifications: [],
      updated_at: new Date().toISOString()
    };

    useStore.getState().updateProfileInStore(clearedProfile);

    const active = useStore.getState().activeProfile;
    expect(active?.certifications).toEqual([]);

    const shortcuts = syncShortcutsToStorage([], {}, active, {});
    expect(shortcuts['cert1']).toBeUndefined();
    expect(shortcuts['cert2']).toBeUndefined();
    expect(shortcuts['certs;']).toBeUndefined();
  });

  it('should support adding, editing, and deleting experience and education entries', () => {
    const profile: Profile = {
      id: 'profile-exp-test',
      user_id: 'local-user',
      name: 'Varun',
      experience: [
        { company: 'Company A', title: 'Software Engineer' },
        { company: 'Company B', title: 'Senior Engineer' }
      ],
      education: [
        { school: 'University 1', degree: 'BS' },
        { school: 'University 2', degree: 'MS' }
      ],
      is_active: true
    };

    useStore.getState().setActiveProfile(profile);

    // Delete first experience, add a new education
    const modifiedProfile: Profile = {
      ...profile,
      experience: [{ company: 'Company B', title: 'Lead Architect' }],
      education: [
        { school: 'University 1', degree: 'BS' },
        { school: 'University 2', degree: 'MS' },
        { school: 'University 3', degree: 'PhD' }
      ]
    };

    useStore.getState().updateProfileInStore(modifiedProfile);

    const active = useStore.getState().activeProfile;
    expect(active?.experience).toHaveLength(1);
    expect(active?.experience[0].title).toBe('Lead Architect');
    expect(active?.education).toHaveLength(3);
    expect(active?.education[2].degree).toBe('PhD');

    const shortcuts = syncShortcutsToStorage([], {}, active, {});
    expect(shortcuts['cp1']).toBe('Company B');
    expect(shortcuts['rl1']).toBe('Lead Architect');
    expect(shortcuts['cp2']).toBeUndefined();
    expect(shortcuts['edu3']).toBe('University 3');
    expect(shortcuts['deg3']).toBe('PhD');
  });

  it('should delete a profile from store and switch active profile safely', () => {
    const profile1: Profile = { id: 'p1', user_id: 'u1', name: 'Profile One', is_active: true };
    const profile2: Profile = { id: 'p2', user_id: 'u1', name: 'Profile Two', is_active: false };

    useStore.getState().setProfiles([profile1, profile2]);
    useStore.getState().setActiveProfile(profile1);

    expect(useStore.getState().profiles).toHaveLength(2);
    expect(useStore.getState().activeProfile?.id).toBe('p1');

    // Delete active profile
    useStore.getState().deleteProfileFromStore('p1');

    expect(useStore.getState().profiles).toHaveLength(1);
    expect(useStore.getState().profiles[0].id).toBe('p2');
    expect(useStore.getState().activeProfile).toBeNull();
  });
});
