import { Profile } from '../types';
import { extractCompanyFromUrl, extractRoleFromUrl } from './extractor';

/**
 * Extracts all unique placeholder names from a text string.
 * Example: "Hello {{name}}, welcome to {{company}}" -> ["name", "company"]
 */
export function getPlaceholders(text: string): string[] {
  const matches = text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g);
  const placeholders = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      placeholders.add(match[1].trim().toLowerCase());
    }
  }
  return Array.from(placeholders);
}

/**
 * Maps a placeholder key to a value in the profile object.
 */
function getProfileValue(key: string, profile: Partial<Profile>): string {
  const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
  
  switch (normalizedKey) {
    case 'name':
    case 'fullname':
      return profile.full_name || profile.name || '';
    case 'firstname':
      return profile.first_name || '';
    case 'middlename':
      return profile.middle_name || '';
    case 'lastname':
      return profile.last_name || '';
    case 'email':
      return profile.email || '';
    case 'phone':
    case 'phonenumber':
      return profile.phone || '';
    case 'linkedin':
    case 'linkedinurl':
      return profile.linkedin_url || '';
    case 'portfolio':
    case 'portfoliourl':
      return profile.portfolio_url || '';
    case 'location':
      return profile.location || '';
    case 'address':
    case 'streetaddress':
      return profile.street_address || '';
    case 'city':
      return profile.city || '';
    case 'state':
      return profile.state || '';
    case 'pincode':
    case 'zipcode':
    case 'zip':
    case 'pin':
      return profile.pin_code || '';
    case 'professionalsubtitle':
    case 'subtitle':
    case 'title':
      return profile.professional_subtitle || '';
    default:
      return '';
  }
}

/**
 * Resolves static profile variables and page metadata variables inside a template string.
 * Returns the resolved string along with any remaining unresolved dynamic variables.
 */
export function resolveTemplate(
  text: string,
  profile: Partial<Profile> | null,
  currentUrl?: string
): { resolvedText: string; unresolved: string[] } {
  let resolvedText = text;
  const unresolved: string[] = [];
  
  // Extract all placeholders
  const placeholders = getPlaceholders(text);
  
  for (const placeholder of placeholders) {
    const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(placeholder)}\\s*\\}\\}`, 'gi');
    
    // 1. Try resolving with active page metadata
    if (currentUrl && (placeholder === 'company' || placeholder === 'role')) {
      const metadataVal = placeholder === 'company' 
        ? extractCompanyFromUrl(currentUrl) 
        : extractRoleFromUrl(currentUrl);
      resolvedText = resolvedText.replace(regex, metadataVal);
      continue;
    }
    
    // 2. Try resolving with profile variables
    const isProfileField = [
      'name', 'fullname', 'firstname', 'middlename', 'lastname', 'email', 'phone',
      'phonenumber', 'linkedin', 'linkedinurl', 'portfolio', 'portfoliourl',
      'location', 'address', 'streetaddress', 'city', 'state', 'pincode', 'zipcode',
      'zip', 'pin', 'professionalsubtitle', 'subtitle', 'title'
    ].includes(placeholder.replace(/[\s_-]+/g, ''));
    
    if (isProfileField) {
      const val = profile ? getProfileValue(placeholder, profile) : '';
      resolvedText = resolvedText.replace(regex, val);
    } else {
      // 3. Mark as unresolved dynamic variable
      unresolved.push(placeholder);
    }
  }
  
  return { resolvedText, unresolved };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
