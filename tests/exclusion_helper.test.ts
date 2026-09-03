import { describe, it, expect } from 'vitest';
import { 
  getProfileExperienceCompanies, 
  normalizeCompanyToken, 
  isCompanyMatching, 
  checkCompanyExclusion 
} from '../src/lib/exclusionHelper';
import { Profile } from '../src/types';

describe('Experience Company Exclusion Engine (exclusionHelper)', () => {
  const mockProfileWithExperience: Profile = {
    id: 'prof-1',
    user_id: 'user-1',
    name: 'Varun',
    full_name: 'Varun Kumar',
    experience: [
      {
        company: 'Google LLC',
        title: 'Staff Software Engineer',
        location: 'Mountain View, CA',
        start_date: '2022',
        end_date: 'Present'
      },
      {
        company: 'Tata Consultancy Services',
        title: 'Systems Engineer',
        location: 'Austin, TX',
        start_date: '2019',
        end_date: '2022'
      },
      {
        company: 'Fluor Corporation',
        title: 'Lead Architect',
        location: 'Dallas, TX',
        start_date: '2016',
        end_date: '2019'
      }
    ],
    is_active: true
  };

  it('should extract unique experience companies from profile', () => {
    const companies = getProfileExperienceCompanies(mockProfileWithExperience);
    expect(companies).toHaveLength(3);
    expect(companies).toContain('Google LLC');
    expect(companies).toContain('Tata Consultancy Services');
    expect(companies).toContain('Fluor Corporation');
  });

  it('should normalize company names removing corporate suffixes', () => {
    expect(normalizeCompanyToken('Google LLC')).toBe('google');
    expect(normalizeCompanyToken('Tata Consultancy Services Pvt Ltd')).toBe('tataconsultancy');
    expect(normalizeCompanyToken('Fluor Corporation')).toBe('fluor');
    expect(normalizeCompanyToken('Amazon.com Inc.')).toBe('amazoncom');
  });

  it('should match company names and URLs against experience companies', () => {
    // Exact & suffix matches
    expect(isCompanyMatching('Google', 'Google LLC')).toBe(true);
    expect(isCompanyMatching('Fluor Corp', 'Fluor Corporation')).toBe(true);
    expect(isCompanyMatching('TATA Motors', 'Tata Consultancy Services')).toBe(false);

    // URL matches
    expect(isCompanyMatching('https://careers.google.com/jobs/results/123', 'Google LLC')).toBe(true);
    expect(isCompanyMatching('https://fluor.wd1.myworkdayjobs.com/Fluor_Careers/job/1', 'Fluor Corporation')).toBe(true);
    expect(isCompanyMatching('https://apple.com/jobs/us', 'Google LLC')).toBe(false);
  });

  it('should trigger experience company exclusion and return warning message', () => {
    const result = checkCompanyExclusion({
      url: 'https://careers.google.com/jobs/12345',
      companyName: 'Google',
      profile: mockProfileWithExperience
    });

    expect(result.isExcluded).toBe(true);
    expect(result.reason).toBe('experience');
    expect(result.matchedCompany).toBe('Google LLC');
    expect(result.warningMessage).toContain('Google LLC');
    expect(result.warningMessage).toContain('in your profile work experience');
  });

  it('should trigger experience exclusion by URL alone without company name provided', () => {
    const result = checkCompanyExclusion({
      url: 'https://careers.google.com/jobs/apply/frontend-engineer',
      profile: mockProfileWithExperience
    });

    expect(result.isExcluded).toBe(true);
    expect(result.reason).toBe('experience');
    expect(result.matchedCompany).toBe('Google LLC');
  });

  it('should not exclude valid companies not in the experience list', () => {
    const result = checkCompanyExclusion({
      url: 'https://netflix.com/jobs/apply/1234',
      companyName: 'Netflix',
      profile: mockProfileWithExperience
    });

    expect(result.isExcluded).toBe(false);
  });

  it('should support candidate-specific and global exclusions as fallbacks', () => {
    const resultGlobal = checkCompanyExclusion({
      url: 'https://amazon.jobs/en/jobs/123',
      companyName: 'Amazon',
      profile: mockProfileWithExperience,
      globalExclusions: ['Amazon', 'Deloitte']
    });

    expect(resultGlobal.isExcluded).toBe(true);
    expect(resultGlobal.reason).toBe('global');

    const resultCandidate = checkCompanyExclusion({
      url: 'https://meta.com/careers',
      companyName: 'Meta',
      profile: mockProfileWithExperience,
      candidateExclusions: {
        'Varun': ['Meta']
      }
    });

    expect(resultCandidate.isExcluded).toBe(true);
    expect(resultCandidate.reason).toBe('candidate');
  });
});
