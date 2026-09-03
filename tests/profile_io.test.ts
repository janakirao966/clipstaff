import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  inspectImportJSON, 
  executeProfileImport, 
  exportProfileBundleJSON,
  exportSystemBackupJSON,
  exportShortcutsJSON,
  exportApplicationsJSON 
} from '../src/lib/profileIO';
import { Profile, Snippet, Job } from '../src/types';

describe('Profile IO & Complete Export/Import System', () => {
  const mockProfile: Profile = {
    id: 'prof-1',
    user_id: 'user-1',
    name: 'Varun',
    full_name: 'Varun Kumar',
    first_name: 'Varun',
    middle_name: '',
    last_name: 'Kumar',
    email: 'varun@example.com',
    phone: '+1 555-0199',
    linkedin_url: 'https://linkedin.com/in/varun',
    portfolio_url: 'https://varun.dev',
    location: 'Dallas, TX',
    street_address: '123 Tech Blvd',
    city: 'Dallas',
    state: 'TX',
    pin_code: '75001',
    professional_subtitle: 'Senior Frontend Engineer',
    experience: [
      {
        company: 'Google',
        title: 'Staff Software Engineer',
        location: 'Mountain View, CA',
        start_date: 'Jan 2022',
        end_date: 'Present',
        description: '- Led frontend architecture\n- Optimized web performance'
      }
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        school: 'University of Texas at Dallas',
        location: 'Richardson, TX',
        start_year: '2016',
        end_year: '2020',
        field_of_study: 'Computer Science'
      }
    ],
    certifications: ['AWS Certified Solutions Architect'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z'
  };

  const mockSnippets: Snippet[] = [
    { id: 's1', user_id: 'user-1', shortcut: 'intro;', text: 'Hi, I am Varun...', category: 'Outreach', created_at: '2026-01-01T00:00:00Z', is_pinned: true },
    { id: 's2', user_id: 'user-1', shortcut: 'sal;', text: 'Desired salary: $150,000', category: 'General', created_at: '2026-01-02T00:00:00Z' }
  ];

  const mockJobs: Job[] = [
    { id: 'job-1', company: 'Google', role: 'Staff SWE', url: 'https://careers.google.com/jobs/1', status: 'applied', dateAdded: '08/20/2026', syncState: 'synced' },
    { id: 'job-2', company: 'Meta', role: 'Frontend Lead', url: 'https://metacareers.com/jobs/2', status: 'not_applied', dateAdded: '08/21/2026', syncState: 'pending' }
  ];

  describe('inspectImportJSON Engine', () => {
    it('should correctly inspect and diff a ClipStaff v2.0 Profile Bundle', () => {
      const bundleData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        type: 'clipstaff_profile_bundle',
        profile: mockProfile,
        resumeText: 'Summary\nExperienced engineer\n\nExperience\nGoogle | 2022\n- Bullet point',
        profileTriggers: { full_name: 'name;', email: 'email;' },
        snippets: [
          { shortcut: 'intro;', text: 'Updated intro text', category: 'Outreach' },
          { shortcut: 'newshort;', text: 'Brand new shortcut', category: 'General' }
        ],
        applications: [
          { company: 'Meta', role: 'Frontend Lead', url: 'https://metacareers.com/jobs/2', status: 'applied', dateAdded: '08/21/2026' },
          { company: 'Apple', role: 'UI Engineer', url: 'https://jobs.apple.com/us/3', status: 'not_applied', dateAdded: '08/22/2026' }
        ],
        rulesAndPreferences: {
          candidateExclusions: ['Amazon']
        }
      };

      const rawJson = JSON.stringify(bundleData);
      const report = inspectImportJSON(rawJson, mockSnippets, mockJobs);

      expect(report.isValid).toBe(true);
      expect(report.format).toBe('clipstaff_profile_bundle');
      expect(report.profileName).toBe('Varun Kumar');
      expect(report.profileFieldCount).toBeGreaterThan(10);
      expect(report.resumeText).toContain('Summary');
      expect(report.profileTriggers?.email).toBe('email;');

      // Shortcuts diff check
      expect(report.snippetsToImport.total).toBe(2);
      expect(report.snippetsToImport.newCount).toBe(1); // newshort;
      expect(report.snippetsToImport.updateCount).toBe(1); // intro;

      // Applications diff check
      expect(report.applicationsToImport.total).toBe(2);
      expect(report.applicationsToImport.newCount).toBe(1); // Apple
      expect(report.applicationsToImport.upgradeCount).toBe(1); // Meta (was not_applied, now applied)
    });

    it('should correctly parse Legacy Profile JSON format', () => {
      const legacyJson = JSON.stringify({
        sriharsha: {
          profile: {
            name: 'Sri Harsha',
            email: 'sri@example.com',
            phone: '1234567890',
            linkedin: 'https://linkedin.com/in/sri',
            education: [{ degree: 'M.S.', school: 'UT Austin', dates: '2019-2021' }]
          },
          text: 'Sri Harsha Resume Text'
        }
      });

      const report = inspectImportJSON(legacyJson);
      expect(report.isValid).toBe(true);
      expect(report.format).toBe('legacy_profile_json');
      expect(report.profileName).toBe('Sri Harsha');
      expect(report.profileData?.email).toBe('sri@example.com');
      expect(report.profileData?.education?.[0].school).toBe('UT Austin');
      expect(report.profileData?.education?.[0].start_year).toBe('2019');
      expect(report.resumeText).toBe('Sri Harsha Resume Text');
    });

    it('should correctly parse Key-Value Shortcuts Map format', () => {
      const kvJson = JSON.stringify({
        'addr;': '123 Main St, Austin, TX',
        'intro;': 'Hello there',
        'github;': 'https://github.com/myuser'
      });

      const report = inspectImportJSON(kvJson, mockSnippets);
      expect(report.isValid).toBe(true);
      expect(report.format).toBe('shortcuts_map');
      expect(report.snippetsToImport.total).toBe(3);
      expect(report.snippetsToImport.newCount).toBe(2); // addr, github
      expect(report.snippetsToImport.updateCount).toBe(1); // intro
    });

    it('should handle and report syntax errors gracefully', () => {
      const malformed = '{ name: "invalid json...';
      const report = inspectImportJSON(malformed);
      expect(report.isValid).toBe(false);
      expect(report.error).toContain('JSON Parse Error');
    });
  });

  describe('executeProfileImport Operations', () => {
    let saveProfileMock: any;
    let setResumeTextMock: any;
    let updateProfileTriggerMock: any;
    let createSnippetMock: any;
    let updateSnippetMock: any;
    let deleteSnippetMock: any;
    let importJobsBulkMock: any;

    beforeEach(() => {
      saveProfileMock = vi.fn().mockResolvedValue(true);
      setResumeTextMock = vi.fn();
      updateProfileTriggerMock = vi.fn();
      createSnippetMock = vi.fn().mockResolvedValue({ id: 's-new' });
      updateSnippetMock = vi.fn().mockResolvedValue({ id: 's-updated' });
      deleteSnippetMock = vi.fn().mockResolvedValue(undefined);
      importJobsBulkMock = vi.fn().mockResolvedValue(true);
    });

    it('should execute merge strategy cleanly without deleting existing non-conflicting items', async () => {
      const bundleData = {
        version: '2.0.0',
        type: 'clipstaff_profile_bundle',
        profile: {
          ...mockProfile,
          phone: '+1 555-9999' // Updated phone
        },
        resumeText: 'New resume text',
        profileTriggers: { phone: 'p;' },
        snippets: [
          { shortcut: 'intro;', text: 'Updated intro text' },
          { shortcut: 'brandnew;', text: 'New shortcut' }
        ],
        applications: [
          { company: 'Netflix', role: 'Staff UI', url: 'https://jobs.netflix.com/4', status: 'applied' }
        ]
      };

      const report = inspectImportJSON(JSON.stringify(bundleData), mockSnippets, mockJobs);
      const result = await executeProfileImport({
        report,
        strategy: 'merge',
        currentProfile: mockProfile,
        currentSnippets: mockSnippets,
        currentTriggers: { full_name: 'name;' },
        saveProfile: saveProfileMock,
        setResumeText: setResumeTextMock,
        updateProfileTrigger: updateProfileTriggerMock,
        createSnippet: createSnippetMock,
        updateSnippet: updateSnippetMock,
        deleteSnippet: deleteSnippetMock,
        importJobsBulk: importJobsBulkMock
      });

      expect(result.profileSaved).toBe(true);
      expect(saveProfileMock).toHaveBeenCalled();
      expect(setResumeTextMock).toHaveBeenCalledWith('New resume text');
      expect(updateProfileTriggerMock).toHaveBeenCalledWith('phone', 'p;');
      expect(updateSnippetMock).toHaveBeenCalledTimes(1); // intro;
      expect(createSnippetMock).toHaveBeenCalledTimes(1); // brandnew;
      expect(deleteSnippetMock).not.toHaveBeenCalled(); // No deletes in merge mode
      expect(importJobsBulkMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ company: 'Netflix' })
      ]));
    });

    it('should execute overwrite strategy deleting previous snippets if requested', async () => {
      const bundleData = {
        version: '2.0.0',
        type: 'clipstaff_profile_bundle',
        profile: mockProfile,
        snippets: [
          { shortcut: 'onlyone;', text: 'Only one left' }
        ],
        applications: []
      };

      const report = inspectImportJSON(JSON.stringify(bundleData), mockSnippets, mockJobs);
      const result = await executeProfileImport({
        report,
        strategy: 'overwrite',
        currentProfile: mockProfile,
        currentSnippets: mockSnippets,
        currentTriggers: {},
        saveProfile: saveProfileMock,
        setResumeText: setResumeTextMock,
        updateProfileTrigger: updateProfileTriggerMock,
        createSnippet: createSnippetMock,
        updateSnippet: updateSnippetMock,
        deleteSnippet: deleteSnippetMock,
        importJobsBulk: importJobsBulkMock
      });

      expect(result.profileSaved).toBe(true);
      // In overwrite mode, existing 2 snippets are deleted
      expect(deleteSnippetMock).toHaveBeenCalledTimes(2);
      expect(createSnippetMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export Filename Conventions', () => {
    it('should format bundle filename as [profile_name]_backup.json', async () => {
      // Mock global URL and document for browser download
      const clickedA: any = {};
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return {
            set href(val: string) { clickedA.href = val; },
            set download(val: string) { clickedA.download = val; },
            click: () => { clickedA.clicked = true; }
          } as any;
        }
        return origCreateElement(tag);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      await exportProfileBundleJSON({
        profile: mockProfile,
        resumeText: '...',
        snippets: mockSnippets,
        applications: mockJobs
      });

      expect(clickedA.download).toBe('varun_kumar_backup.json');

      await exportShortcutsJSON(mockSnippets, 'Varun');
      expect(clickedA.download).toBe('varun_shortcuts.json');

      await exportApplicationsJSON(mockJobs, 'Varun');
      expect(clickedA.download).toBe('varun_backup.json');
    });
  });
});

