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

export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const cleanUrl = urlStr.trim();
    const url = new URL(cleanUrl);
    
    // Normalize hostname
    const host = url.hostname.toLowerCase();
    
    // Normalize pathname (strip trailing slash if it's not a root slash)
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // Filter out common tracking query parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'origin', 'fbclid', 'gclid', 'msclkid', 'spm', 'clicks'
    ];
    
    const searchParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (!trackingParams.includes(key.toLowerCase())) {
        searchParams.set(key, value);
      }
    });
    
    const search = searchParams.toString();
    
    // Return normalized format
    return `${url.protocol}//${host}${path}${search ? '?' + search : ''}`;
  } catch (e) {
    return urlStr.trim();
  }
}

export const getJobId = (url: string, index: number = 0): string => {
  const normUrl = normalizeUrl(url);
  let hash = 0;
  for (let i = 0; i < normUrl.length; i++) {
    const char = normUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `job-${Math.abs(hash)}-${index || Math.floor(Math.random() * 1000)}`;
};

export function isValidJobUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const url = new URL(urlStr);
    
    // Block internal Chrome or extension schemes
    if (['chrome:', 'chrome-extension:', 'about:', 'file:'].includes(url.protocol)) {
      return false;
    }

    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    // Block Google Workspace documents
    if (host.includes('docs.google.com') || host.includes('drive.google.com')) {
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

    // Block other generic non-job portals
    const blockedHosts = [
      'gmail.com',
      'outlook.live.com',
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'netflix.com',
      'spotify.com'
    ];
    if (blockedHosts.some(h => host === h || host.endsWith('.' + h))) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

