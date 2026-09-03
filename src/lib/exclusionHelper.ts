import { Profile } from '../types';
import { extractCompanyFromUrl } from './extractor';

export interface ExclusionCheckResult {
  isExcluded: boolean;
  reason?: 'experience' | 'candidate' | 'global';
  matchedCompany?: string;
  warningMessage?: string;
}

/**
 * Normalizes a company name for robust fuzzy and token matching.
 * Strips common legal and corporate designations (Inc, LLC, Corp, etc.).
 */
export function normalizeCompanyToken(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|llp|corp|corporation|ltd|limited|pvt|private|group|technologies|tech|solutions|services|consulting|holding|holdings|co|company)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Extracts all non-empty experience company names from a profile.
 */
export function getProfileExperienceCompanies(profile: Profile | null | undefined): string[] {
  if (!profile || !Array.isArray(profile.experience)) return [];
  const set = new Set<string>();
  profile.experience.forEach(exp => {
    const comp = exp?.company?.trim();
    if (comp) {
      set.add(comp);
    }
  });
  return Array.from(set);
}

/**
 * Checks if a job URL or company name matches a specific candidate company name.
 */
export function isCompanyMatching(urlOrCompany: string, candidateCompany: string): boolean {
  if (!urlOrCompany || !candidateCompany) return false;

  const targetNorm = normalizeCompanyToken(urlOrCompany);
  const candNorm = normalizeCompanyToken(candidateCompany);

  if (!targetNorm || !candNorm) return false;

  // Exact normalized match
  if (targetNorm === candNorm) return true;

  // Substring match if token is sufficiently distinct (length >= 4)
  if (candNorm.length >= 4) {
    if (targetNorm.includes(candNorm) || candNorm.includes(targetNorm)) {
      return true;
    }
  }

  // Check against URL extracted company and URL hostname/path
  if (urlOrCompany.startsWith('http://') || urlOrCompany.startsWith('https://') || urlOrCompany.includes('.')) {
    try {
      const extractedCompany = extractCompanyFromUrl(urlOrCompany);
      const extractedNorm = normalizeCompanyToken(extractedCompany);
      if (extractedNorm && (extractedNorm === candNorm || (candNorm.length >= 4 && extractedNorm.includes(candNorm)))) {
        return true;
      }

      const urlObj = new URL(urlOrCompany.startsWith('http') ? urlOrCompany : `https://${urlOrCompany}`);
      const host = urlObj.hostname.toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = urlObj.pathname.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (host.includes(candNorm) || (candNorm.length >= 4 && path.includes(candNorm))) {
        return true;
      }
    } catch {
      // Ignore URL parse errors
    }
  }

  return false;
}

/**
 * Checks if a given job URL or company name matches any profile experience companies,
 * candidate exclusions, or global exclusions.
 */
export function checkCompanyExclusion(params: {
  url: string;
  companyName?: string;
  profile?: Profile | null;
  candidateExclusions?: Record<string, string[]>;
  globalExclusions?: string[];
}): ExclusionCheckResult {
  const { url, companyName = '', profile, candidateExclusions = {}, globalExclusions = [] } = params;

  // 1. Check Profile Experience Companies (Highest Priority)
  const experienceCompanies = getProfileExperienceCompanies(profile);
  for (const expCompany of experienceCompanies) {
    if (
      isCompanyMatching(companyName, expCompany) || 
      (url && isCompanyMatching(url, expCompany))
    ) {
      return {
        isExcluded: true,
        reason: 'experience',
        matchedCompany: expCompany,
        warningMessage: `⚠️ Exclusion Warning: "${expCompany}" is in your profile work experience history. Do not apply!`
      };
    }
  }

  // 2. Check Candidate-Specific Exclusions (if configured for active candidate)
  const candidateName = profile?.name || profile?.full_name || '';
  const profileSpecificExclusions = candidateName ? (candidateExclusions[candidateName] || []) : [];
  for (const excludedComp of profileSpecificExclusions) {
    if (
      isCompanyMatching(companyName, excludedComp) || 
      (url && isCompanyMatching(url, excludedComp))
    ) {
      return {
        isExcluded: true,
        reason: 'candidate',
        matchedCompany: excludedComp,
        warningMessage: `⚠️ Candidate Exclusion: "${excludedComp}" is marked as excluded for ${candidateName}. Do not apply!`
      };
    }
  }

  // 3. Check Global Exclusions
  for (const globalComp of globalExclusions) {
    if (
      isCompanyMatching(companyName, globalComp) || 
      (url && isCompanyMatching(url, globalComp))
    ) {
      return {
        isExcluded: true,
        reason: 'global',
        matchedCompany: globalComp,
        warningMessage: `⚠️ Global Exclusion: "${globalComp}" is in your global exclusion list. Do not apply!`
      };
    }
  }

  return {
    isExcluded: false
  };
}
