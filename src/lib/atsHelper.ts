/**
 * ATS Keyword & Skill Gap Analyzer Helper
 */

import { Profile } from '../types';

export interface KeywordCategory {
  matched: string[];
  missing: string[];
}

export interface KeywordBreakdown {
  coreSkills: KeywordCategory;
  toolsAndFrameworks: KeywordCategory;
  domainAndCertifications: KeywordCategory;
}

export interface EligibilityResult {
  eligibility: 'Eligible' | 'Not Eligible';
  reasoning: {
    company: 'Triggered' | 'Not Triggered';
    sector: 'Triggered' | 'Not Triggered';
    requirement: 'Triggered' | 'Not Triggered';
    notes?: string;
  };
  userStatus: Record<string, 'Eligible' | 'Not Eligible'>;
  atsScore: number;
  matchSummary?: string;
  keywordBreakdown?: KeywordBreakdown;
  missingKeywordsSummary?: string[];
  tailoredBullets?: string[];
  coverLetter?: string;
}

/**
 * Synthesizes a comprehensive candidate profile summary from structured profile fields
 * and raw resume text so ATS analysis always has rich context.
 */
export function buildCandidateProfileSummary(profile: Profile | null, rawResumeText: string): string {
  const parts: string[] = [];

  if (rawResumeText?.trim()) {
    parts.push(`--- CANDIDATE RESUME TEXT ---\n${rawResumeText.trim()}`);
  }

  if (profile) {
    const profileParts: string[] = [];
    
    if (profile.full_name || profile.name) {
      profileParts.push(`Name: ${profile.full_name || profile.name}`);
    }
    if (profile.professional_subtitle) {
      profileParts.push(`Title / Headline: ${profile.professional_subtitle}`);
    }
    if (profile.certifications && profile.certifications.length > 0) {
      profileParts.push(`Certifications: ${profile.certifications.join(', ')}`);
    }
    if (profile.experience && profile.experience.length > 0) {
      profileParts.push(`Work Experience:`);
      profile.experience.forEach((exp, i) => {
        profileParts.push(`  ${i + 1}. ${exp.title || 'Role'} at ${exp.company || 'Company'} (${exp.start_date || ''} - ${exp.end_date || 'Present'}): ${exp.description || ''}`);
      });
    }
    if (profile.education && profile.education.length > 0) {
      profileParts.push(`Education:`);
      profile.education.forEach((edu, i) => {
        profileParts.push(`  ${i + 1}. ${edu.degree || 'Degree'} in ${edu.field_of_study || 'Field'} from ${edu.school || 'School'}`);
      });
    }

    if (profileParts.length > 0) {
      parts.push(`--- STRUCTURED PROFILE BACKGROUND ---\n${profileParts.join('\n')}`);
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No resume details provided.';
}

/**
 * Extracts all unique missing keywords from a keyword breakdown.
 */
export function extractAllMissingKeywords(breakdown?: KeywordBreakdown): string[] {
  if (!breakdown) return [];
  const set = new Set<string>();
  (breakdown.coreSkills?.missing || []).forEach(k => k.trim() && set.add(k.trim()));
  (breakdown.toolsAndFrameworks?.missing || []).forEach(k => k.trim() && set.add(k.trim()));
  (breakdown.domainAndCertifications?.missing || []).forEach(k => k.trim() && set.add(k.trim()));
  return Array.from(set);
}
