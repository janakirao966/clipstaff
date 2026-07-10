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

export function extractCompanyFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.replace('www.', '');

    if (host.includes('greenhouse.io')) {
      const forParam = url.searchParams.get('for');
      if (forParam) return cleanString(forParam);
    }
    if (host.includes('myworkdayjobs.com')) {
      const parts = url.pathname.split('/');
      if (parts[1]) return cleanString(parts[1]);
    }
    if (host.includes('oraclecloud.com')) {
      return 'Oracle';
    }
    if (host.includes('applytojob.com')) {
      const parts = url.hostname.split('.');
      if (parts[0]) return cleanString(parts[0]);
    }
    if (host.includes('careerplug.com')) {
      const parts = url.hostname.split('.');
      if (parts[0]) return cleanString(parts[0]);
    }

    const parts = host.split('.');
    if (parts.length > 2) {
      const first = parts[0];
      const second = parts[1];
      if (['careers', 'jobs', 'ats', 'job-boards', 'apply', 'postings', 'www'].includes(first)) {
        return cleanString(second);
      }
      return cleanString(first);
    }
    return cleanString(parts[0]);
  } catch (e) {
    return 'Unknown Company';
  }
}

export function extractRoleFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length === 0) return 'Job Opportunity';

    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (/^\d+$/.test(segment) || segment.length < 5) continue;
      
      const cleanSeg = segment
        .split(/[?#]/)[0]
        .replace(/[-_]\d+$/, '')
        .replace(/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/, '');

      if (cleanSeg.includes('-') || cleanSeg.includes('_')) {
        return cleanString(cleanSeg);
      }
    }

    const lastSeg = segments[segments.length - 1];
    if (lastSeg && !/^\d+$/.test(lastSeg)) {
      return cleanString(lastSeg);
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

