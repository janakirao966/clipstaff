export function cleanString(str: string): string {
  try {
    const result = decodeURIComponent(str)
      .replace(/[-_]+/g, ' ')
      .trim();
    
    return result
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  } catch (e) {
    return str;
  }
}

const companyMappings: Record<string, string> = {
  'bakerhughes': 'Baker Hughes',
  'smartrecruiters': 'SmartRecruiters',
  'trccompanies': 'TRC Companies',
  'etechgroup': 'Etech Group',
  'selinc': 'SEL',
  'jm': 'Johns Manville',
  'astspacemobile': 'AST SpaceMobile',
  'colossalbiosciences': 'Colossal Biosciences',
  'allencontrolsystems': 'Allen Control Systems',
  'championx': 'ChampionX',
  'jobdiva': 'JobDiva',
  'mottmac': 'Mott MacDonald',
  'controlpanelsusa': 'Control Panels USA',
  'qualityai': 'Quality AI',
  'paylocity': 'Paylocity',
  'successfactors': 'SuccessFactors',
  'archkey': 'ArchKey',
  'lcra': 'LCRA',
  'oracle': 'Oracle'
};

function getRawCompanyFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const pathParts = url.pathname.split('/').filter(Boolean);

    // 1. Workday specific
    if (host.includes('myworkdayjobs.com')) {
      const hostParts = host.split('.');
      if (hostParts[0] && !['careers', 'jobs', 'www', 'myworkdayjobs'].includes(hostParts[0])) {
        return cleanString(hostParts[0]);
      }
      if (pathParts[0]) {
        if (/^[a-z]{2}-[a-z]{2}$/i.test(pathParts[0]) || ['external', 'jobs'].includes(pathParts[0].toLowerCase())) {
          if (pathParts[1]) return cleanString(pathParts[1]);
        }
        return cleanString(pathParts[0]);
      }
    }

    // 2. Greenhouse specific
    if (host.includes('greenhouse.io')) {
      const forParam = url.searchParams.get('for');
      if (forParam) return cleanString(forParam);
      const companyIndex = pathParts.indexOf('embed') !== -1 ? pathParts.indexOf('embed') + 1 : 0;
      if (pathParts[companyIndex] && !['job_app', 'job_board', 'jobs'].includes(pathParts[companyIndex].toLowerCase())) {
        return cleanString(pathParts[companyIndex]);
      }
      if (pathParts[companyIndex + 1]) {
        return cleanString(pathParts[companyIndex + 1]);
      }
    }

    // 3. Lever specific
    if (host.includes('lever.co')) {
      if (pathParts[0] && !['embed', 'jobs'].includes(pathParts[0].toLowerCase())) {
        return cleanString(pathParts[0]);
      }
      if (pathParts[1]) return cleanString(pathParts[1]);
    }

    // 4. UKG / Ultimate Software specific
    if (host.includes('ukg.net') || host.includes('ultipro.com')) {
      if (pathParts[0] && !['rec', 'pro', 'jobboard', 'opportunitydetail'].includes(pathParts[0].toLowerCase())) {
        return cleanString(pathParts[0]);
      }
      const hostParts = host.split('.');
      if (hostParts[0] && !['rec', 'pro', 'www', 't', 'e', 'recruiting2', 'recruiting'].includes(hostParts[0])) {
        return cleanString(hostParts[0]);
      }
    }

    // 5. Oracle Cloud specific
    if (host.includes('oraclecloud.com')) {
      const hostParts = host.split('.');
      if (hostParts[0] && !['fa', 'hcm', 'www'].includes(hostParts[0])) {
        return cleanString(hostParts[0]);
      }
      return 'Oracle';
    }

    // 6. ADP specific
    if (host.includes('adp.com')) {
      if (pathParts[0] && pathParts[0] !== 'cx') return cleanString(pathParts[0]);
      if (pathParts[1] && pathParts[1] !== 'cx') return cleanString(pathParts[1]);
    }

    // 7. SmartRecruiters specific
    if (host.includes('smartrecruiters.com')) {
      const companyIdx = pathParts.indexOf('company');
      if (companyIdx !== -1 && pathParts[companyIdx + 1]) {
        return cleanString(pathParts[companyIdx + 1]);
      }
    }

    // 8. SuccessFactors specific
    if (host.includes('successfactors.')) {
      const companyParam = url.searchParams.get('company') || url.searchParams.get('companyId');
      if (companyParam) return cleanString(companyParam);
      const hostParts = host.split('.');
      if (hostParts[0] && !/^career\d*$/i.test(hostParts[0]) && !/^www\d*$/i.test(hostParts[0])) {
        return cleanString(hostParts[0]);
      }
    }

    // 9. Paylocity specific
    if (host.includes('paylocity.com')) {
      const applyIdx = pathParts.findIndex(p => p.toLowerCase() === 'apply');
      if (applyIdx !== -1 && pathParts[applyIdx + 2]) {
        return cleanString(pathParts[applyIdx + 2]);
      }
    }

    // 10. General fallback logic
    const cleanHost = host.replace('www.', '');
    const parts = cleanHost.split('.');
    if (parts.length > 2) {
      const first = parts[0];
      const second = parts[1];
      if (/^www\d*$/.test(first) || /^career\d*$/.test(first) || ['careers', 'jobs', 'ats', 'job-boards', 'apply', 'postings', 'recruiting', 'external'].includes(first)) {
        return cleanString(second);
      }
      return cleanString(first);
    }
    return cleanString(parts[0]);
  } catch (e) {
    return 'Unknown Company';
  }
}

export function extractCompanyFromUrl(urlStr: string): string {
  const raw = getRawCompanyFromUrl(urlStr);
  const key = raw.toLowerCase().replace(/[-_\s]+/g, '');
  if (companyMappings[key]) {
    return companyMappings[key];
  }
  return raw;
}

export function extractRoleFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length === 0) return 'Job Opportunity';

    const genericKeywords = [
      'apply', 'job-opening', 'job_opening', 'job-details', 'job_details',
      'opportunitydetail', 'portalcareer', 'portal', 'index', 'home',
      'confirm', 'confirmation', 'jobs', 'careers', 'applytojob',
      'jobpost', 'job_post', 'jobposting', 'job_posting', 'job-app',
      'job_app', 'jobapp', 'submit', 'application', 'employment',
      'external', 'autofillwithresume', 'opportunity', 'detail', 'details'
    ];

    for (let i = segments.length - 1; i >= 0; i--) {
      let cleanSeg = segments[i].split(/[?#]/)[0];
      cleanSeg = cleanSeg.replace(/\.(php|html|htm|aspx|jsp)$/i, '');

      const cleanLower = cleanSeg.toLowerCase().trim();
      
      // Skip if generic, numeric, or too short
      if (genericKeywords.includes(cleanLower) || /^\d+$/.test(cleanSeg) || cleanSeg.length < 3) {
        continue;
      }

      // Skip UUIDs
      if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(cleanSeg)) {
        continue;
      }

      // Skip location or tenant segments that exactly match the company name
      const companyVal = extractCompanyFromUrl(urlStr).toLowerCase().replace(/\s+/g, '');
      if (cleanLower.replace(/[-_]/g, '') === companyVal) {
        continue;
      }

      cleanSeg = cleanSeg.replace(/[-_]\d+$/, '');
      return cleanString(cleanSeg);
    }

    return 'Job Opportunity';
  } catch (e) {
    return 'Job Opportunity';
  }
}

/**
 * Normalizes a URL string by ensuring a valid protocol, lowercasing the hostname,
 * removing trailing slashes from the path (except for the domain root), stripping
 * fragments/hashes, removing all common and custom tracking parameters, and sorting
 * the remaining query parameters alphabetically.
 *
 * This ensures that identical job listings with different tracking tokens are matched
 * consistently.
 */
export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    let cleanUrl = urlStr.trim();
    // Ensure protocol is present
    if (!/^[a-zA-Z]+:\/\//.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const url = new URL(cleanUrl);
    
    // Normalize hostname to lowercase
    const host = url.hostname.toLowerCase();
    
    // Normalize pathname: strip trailing slash if it's not the root path
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // Strip fragments/hash (visual anchors on the page)
    url.hash = '';
    
    // Tracking parameters check patterns (covers common UTM and marketing parameters)
    const trackingPatterns = [
      /^utm_/i,
      /^ref/i,
      /^source/i,
      /^origin/i,
      /^fbclid/i,
      /^gclid/i,
      /^msclkid/i,
      /^spm/i,
      /^clicks/i,
      /^_ga/i,
      /^_gl/i,
      /^mc_eid/i,
      /^campaignid/i,
      /^adgroupid/i,
      /^adid/i,
      /^gclsrc/i,
      /^otn/i,
      /^ot/i
    ];
    
    // Filter and sort query parameters alphabetically
    const paramsList: { key: string; value: string }[] = [];
    url.searchParams.forEach((value, key) => {
      const keyLower = key.toLowerCase();
      const isTracking = trackingPatterns.some(pattern => pattern.test(keyLower));
      if (!isTracking) {
        paramsList.push({ key, value });
      }
    });
    
    paramsList.sort((a, b) => a.key.localeCompare(b.key));
    
    const searchParams = new URLSearchParams();
    paramsList.forEach(p => searchParams.set(p.key, p.value));
    const search = searchParams.toString();
    
    return `${url.protocol}//${host}${path}${search ? '?' + search : ''}`;
  } catch (e) {
    return urlStr.trim();
  }
}

/**
 * Generates a deterministic 32-bit FNV-1a hash of a normalized URL.
 * The same URL will ALWAYS generate the same ID.
 */
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const getJobId = (url: string, index?: number): string => {
  const normUrl = normalizeUrl(url);
  const hashVal = fnv1a(normUrl);
  if (index !== undefined && index !== null && index !== 0) {
    return `job-${hashVal}-idx-${index}`;
  }
  return `job-${hashVal}`;
};

/**
 * Compares two URLs by normalizing both and returning whether they match.
 */
export function compareUrls(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

export function isValidJobUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const url = new URL(urlStr);
    
    // Block internal Chrome or extension schemes
    if (['chrome:', 'chrome-extension:', 'about:', 'file:', 'edge:'].includes(url.protocol)) {
      return false;
    }

    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    // Block Google Workspace documents, mail, and meet
    if (
      host.includes('docs.google.com') || 
      host.includes('drive.google.com') ||
      host.includes('mail.google.com') ||
      host.includes('meet.google.com')
    ) {
      return false;
    }

    // Block Zoom and Microsoft Teams
    if (host.includes('zoom.us') || host.includes('teams.microsoft.com') || host.includes('teams.live.com')) {
      return false;
    }

    // Block common non-job domains / pages
    if (host === 'google.com') {
      if (path === '/' || path.startsWith('/maps') || path.startsWith('/mail') || path.startsWith('/search')) {
        return false;
      }
    }

    // Block search engines general page
    if (host === 'bing.com' || host === 'yahoo.com' || host === 'duckduckgo.com') {
      if (path === '/' || path.includes('search')) return false;
    }

    // Block social media feeds
    if (host.includes('linkedin.com') && (path === '/' || path.startsWith('/feed') || path.startsWith('/mynetwork') || path.startsWith('/messaging') || path.startsWith('/in/'))) {
      return false;
    }

    // Block other generic non-job portals and chat apps
    const blockedHosts = [
      'gmail.com',
      'outlook.live.com',
      'outlook.office.com',
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'netflix.com',
      'spotify.com',
      'whatsapp.com',
      'web.whatsapp.com',
      'slack.com',
      'discord.com',
      'telegram.org',
      't.me'
    ];
    if (blockedHosts.some(h => host === h || host.endsWith('.' + h))) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitizes a profile name to be safe for sheet tabs and file paths.
 */
export const sanitizeProfileName = (name: string | null | undefined): string => {
  if (!name) return 'Default_Profile';
  return name
    .replace(/[\\\/?:*\[\]]/g, '_')
    .slice(0, 31)
    .trim() || 'Default_Profile';
};

export function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const mm = parts[0].padStart(2, '0');
    const dd = parts[1].padStart(2, '0');
    return `${mm}/${dd}/${parts[2]}`;
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const mm = parts[0].padStart(2, '0');
    const dd = parts[1].padStart(2, '0');
    return `${mm}/${dd}/${parts[2]}`;
  }
  
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    }
  } catch {}
  return trimmed;
}

