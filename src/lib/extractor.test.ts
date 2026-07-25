import { describe, it, expect } from 'vitest';
import { normalizeUrl, getJobId, compareUrls, extractCompanyFromUrl, extractRoleFromUrl, normalizeDateStr } from './extractor';

describe('URL Normalization', () => {
  it('should lowercase the hostname', () => {
    expect(normalizeUrl('https://GOOGLE.COM/jobs')).toBe('https://google.com/jobs');
  });

  it('should strip common tracking parameters', () => {
    expect(normalizeUrl('https://google.com/jobs?utm_source=linkedin&ref=123')).toBe('https://google.com/jobs');
  });

  it('should strip fragments and hashes', () => {
    expect(normalizeUrl('https://google.com/jobs#section-2')).toBe('https://google.com/jobs');
  });

  it('should trim trailing slashes from path', () => {
    expect(normalizeUrl('https://google.com/jobs/')).toBe('https://google.com/jobs');
  });

  it('should not trim trailing slash from root domain', () => {
    expect(normalizeUrl('https://google.com/')).toBe('https://google.com/');
  });

  it('should sort remaining query parameters alphabetically', () => {
    expect(normalizeUrl('https://google.com/jobs?z=1&a=2&b=3')).toBe('https://google.com/jobs?a=2&b=3&z=1');
  });

  it('should prepend https protocol if missing', () => {
    expect(normalizeUrl('google.com/jobs')).toBe('https://google.com/jobs');
  });
});

describe('Deterministic Job IDs', () => {
  it('should generate same ID for identical normalized URLs', () => {
    const id1 = getJobId('https://google.com/jobs?utm_source=linkedin');
    const id2 = getJobId('google.com/jobs?ref=123');
    expect(id1).toBe(id2);
  });

  it('should append index deterministically if provided', () => {
    const idWithIdx = getJobId('https://google.com/jobs', 3);
    expect(idWithIdx).toContain('-idx-3');
  });
});

describe('URL Comparison', () => {
  it('should return true for matching normalized URLs', () => {
    expect(compareUrls('https://google.com/jobs/', 'google.com/jobs?utm_campaign=winter')).toBe(true);
  });

  it('should return false for different URLs', () => {
    expect(compareUrls('https://google.com/jobs', 'https://yahoo.com/jobs')).toBe(false);
  });
});

describe('Metadata Extraction', () => {
  describe('Company Extraction', () => {
    it('should extract correct company from Workday subdomains and pathnames', () => {
      expect(extractCompanyFromUrl('https://bakerhughes.wd5.myworkdayjobs.com/en-US/bakerhughes/job/US-TX/Apply')).toBe('Baker Hughes');
      expect(extractCompanyFromUrl('https://jm.wd103.myworkdayjobs.com/en-US/External/job/Cleburne-TX/Apply')).toBe('Johns Manville');
    });

    it('should extract correct company from Greenhouse URLs', () => {
      expect(extractCompanyFromUrl('https://job-boards.greenhouse.io/embed/job_app?for=etechgroup')).toBe('Etech Group');
      expect(extractCompanyFromUrl('https://boards.greenhouse.io/etechgroup/jobs/4820129004')).toBe('Etech Group');
    });

    it('should extract correct company from Lever URLs', () => {
      expect(extractCompanyFromUrl('https://jobs.lever.co/google/1a87e5b1-7bc9-4c8d-b0df-0bfa7c5c2d3a/apply')).toBe('Google');
    });

    it('should extract correct company from UKG/Ultipro URLs using pathname fallback', () => {
      expect(extractCompanyFromUrl('https://recruiting2.ultipro.com/CAR1002CARR/JobBoard/56d0bb2b/OpportunityDetail?opportunityId=73')).toBe('Car1002carr');
    });

    it('should extract correct company from Oracle Cloud candidate sites', () => {
      expect(extractCompanyFromUrl('https://elcn.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/112737')).toBe('Elcn');
    });

    it('should extract correct company from Paylocity URLs', () => {
      expect(extractCompanyFromUrl('https://recruiting.paylocity.com/recruiting/jobs/Apply/3855760/Hyper-Solutions-Inc/Applications-Engineer')).toBe('Hyper Solutions Inc');
    });

    it('should extract correct company from JobDiva URLs', () => {
      expect(extractCompanyFromUrl('https://www1.jobdiva.com/portal?a=123')).toBe('JobDiva');
    });
  });

  describe('Role Extraction', () => {
    it('should skip generic filenames and return fallback', () => {
      expect(extractRoleFromUrl('https://msengr.hrmdirect.com/employment/job-opening.php?req=3757076')).toBe('Job Opportunity');
      expect(extractRoleFromUrl('https://career2.successfactors.eu/portalcareer')).toBe('Job Opportunity');
    });

    it('should parse actual roles containing hyphens or underscores', () => {
      expect(extractRoleFromUrl('https://bakerhughes.wd5.myworkdayjobs.com/job/Field-Service-Electrical-Engineer_R160331/apply')).toBe('Field Service Electrical Engineer R160331');
    });

    it('should parse single-word role titles', () => {
      expect(extractRoleFromUrl('https://jobs.lever.co/google/Developer/apply')).toBe('Developer');
      expect(extractRoleFromUrl('https://caterpillar.myworkdayjobs.com/en-US/careers/job/Peoria-IL/Manager')).toBe('Manager');
    });
  });

  describe('Date String Normalization', () => {
    it('should format long JavaScript Date strings into MM/DD/YYYY', () => {
      expect(normalizeDateStr('Sat Jul 11 2026 05:30:00 GMT+0530 (India Standard Time)')).toBe('07/11/2026');
    });

    it('should pad single digit month/day values in MM/DD/YYYY', () => {
      expect(normalizeDateStr('7/12/2026')).toBe('07/12/2026');
      expect(normalizeDateStr('07/12/2026')).toBe('07/12/2026');
    });

    it('should convert hyphen separated formats YYYY-MM-DD and MM-DD-YYYY', () => {
      expect(normalizeDateStr('2026-07-11')).toBe('07/11/2026');
      expect(normalizeDateStr('07-11-2026')).toBe('07/11/2026');
    });
  });
});
