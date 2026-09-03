import { describe, it, expect } from 'vitest';
import { buildCandidateProfileSummary } from '../src/lib/atsHelper';
import { Profile } from '../src/types';

describe('ATS Keyword & Skill Gap Analyzer Helper', () => {
  it('should synthesize candidate summary from structured profile fields when resume text is empty', () => {
    const profile: Profile = {
      id: 'p1',
      user_id: 'u1',
      name: 'Vamsi Krishna',
      full_name: 'Vamsi Krishna G',
      professional_subtitle: 'Senior Data Engineer & Cloud Architect',
      certifications: [
        'AWS Solutions Architect Professional',
        'GCP Data Engineer'
      ],
      experience: [
        {
          company: 'Amazon',
          title: 'Senior Data Engineer',
          start_date: '2021',
          end_date: 'Present',
          description: 'Designed petabyte-scale data pipelines with Spark and Airflow.'
        }
      ],
      education: [
        {
          school: 'Stanford',
          degree: 'Master of Science',
          field_of_study: 'Computer Science'
        }
      ],
      is_active: true
    };

    const summary = buildCandidateProfileSummary(profile, '');
    expect(summary).toContain('Vamsi Krishna G');
    expect(summary).toContain('Senior Data Engineer & Cloud Architect');
    expect(summary).toContain('AWS Solutions Architect Professional');
    expect(summary).toContain('Designed petabyte-scale data pipelines');
    expect(summary).toContain('Stanford');
  });

  it('should include custom resume text when provided along with profile fields', () => {
    const profile: Profile = {
      id: 'p2',
      user_id: 'u1',
      name: 'Pooja',
      full_name: 'Pooja Sharma',
      professional_subtitle: 'Full Stack Developer',
      is_active: true
    };

    const rawResume = 'Skilled in React, TypeScript, Node.js, and PostgreSQL with 5 years experience.';
    const summary = buildCandidateProfileSummary(profile, rawResume);

    expect(summary).toContain('Pooja Sharma');
    expect(summary).toContain('Full Stack Developer');
    expect(summary).toContain('Skilled in React, TypeScript, Node.js');
  });

  it('should handle empty profile and empty resume gracefully', () => {
    const summary = buildCandidateProfileSummary(null, '');
    expect(summary).toBe('No resume details provided.');
  });
});
