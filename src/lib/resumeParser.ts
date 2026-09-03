/**
 * CVCraft & ClipStaff Modern ATS Resume Parser
 * Parses raw plain text resumes into structured, ATS-compliant JSON data model.
 */

export interface SkillCategory {
  category: string;
  list: string;
}

export interface ExperienceJob {
  company: string;
  location: string;
  role: string;
  dates: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  title?: string;
  tech?: string;
  tech_stack?: string;
  link?: string;
  url?: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  dates: string;
  location: string;
}

export interface NormalizedResumeData {
  name: string;
  subtitle: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  summary: string;
  skills: SkillCategory[];
  experience: ExperienceJob[];
  projects: ProjectItem[];
  education: EducationItem[];
  certs: string[];
}

// ── Legacy ParsedResume Interface ──
export interface ParsedResume {
  summary: string;
  skills: string;
  experience: string;
}

export function parseContent(raw: string): ParsedResume {
  const text = raw.replace(/\r\n/g, '\n');
  const boundaries = 'SUMMARY|PROFESSIONAL SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|PROJECTS|TECHNICAL PROJECTS|EDUCATION|CERTIFICATIONS';
  
  const summaryRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SUMMARY|PROFESSIONAL SUMMARY)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const skillsRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SKILLS|TECHNICAL SKILLS)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const experienceRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:EXPERIENCE|PROFESSIONAL EXPERIENCE)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');

  const get = (rx: RegExp) => { const m = text.match(rx); return m ? m[1].trim() : ''; };
  return { summary: get(summaryRx), skills: get(skillsRx), experience: get(experienceRx) };
}

/**
 * Splits combined strings like "Google LLC — Mountain View, CA" or "Tesla Motors, Austin TX"
 */
export function splitCompanyAndLocation(text: string): { company: string; location: string } {
  if (!text) return { company: '', location: '' };

  const clean = text.replace(/^\*+|\*+$/g, '').trim();

  // 1. Dash or Em-Dash separation (e.g. "Tesla Motors — Austin, TX")
  if (/[—–-]/.test(clean)) {
    const parts = clean.split(/\s*[—–-]\s*/);
    if (parts.length >= 2) {
      const comp = parts[0].trim();
      const loc = parts.slice(1).join(', ').trim();
      return { company: comp, location: loc };
    }
  }

  // 2. Comma separation with 2-letter state code or known country (e.g. "Amazon, Seattle, WA")
  const stateRegex = /,\s*([A-Z]{2}|USA|United States|UK|Canada|India)\b/i;
  if (stateRegex.test(clean)) {
    const lastCommaIdx = clean.lastIndexOf(',');
    if (lastCommaIdx > 0) {
      const prevText = clean.substring(0, lastCommaIdx);
      const secondCommaIdx = prevText.lastIndexOf(',');
      if (secondCommaIdx > 0) {
        return {
          company: clean.substring(0, secondCommaIdx).trim(),
          location: clean.substring(secondCommaIdx + 1).trim()
        };
      } else {
        return {
          company: clean.substring(0, lastCommaIdx).trim(),
          location: clean.substring(lastCommaIdx + 1).trim()
        };
      }
    }
  }

  return { company: clean, location: '' };
}

/**
 * Robust Resume Parser replicating CVCraft's full parsing pipeline.
 */
export function parseResumePlainText(rawText: string, baseContext?: Partial<NormalizedResumeData>): NormalizedResumeData {
  const result: NormalizedResumeData = {
    name: '',
    subtitle: '',
    location: '',
    phone: '',
    email: '',
    linkedin: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certs: []
  };

  if (!rawText || !rawText.trim()) {
    if (baseContext) {
      return {
        name: baseContext.name || 'Alexander Morgan',
        subtitle: baseContext.subtitle || 'Senior Controls & Automation Engineer',
        location: baseContext.location || 'Dallas, TX',
        phone: baseContext.phone || '+1 (555) 019-2834',
        email: baseContext.email || 'alex.morgan@email.com',
        linkedin: baseContext.linkedin || 'linkedin.com/in/alexmorgan',
        summary: baseContext.summary || '',
        skills: baseContext.skills || [],
        experience: baseContext.experience || [],
        projects: baseContext.projects || [],
        education: baseContext.education || [],
        certs: baseContext.certs || []
      };
    }
    return result;
  }

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = normalized.split('\n');

  // Step 1: Detect Header & Section Boundaries
  const sectionLines: {
    header: string[];
    summary: string[];
    skills: string[];
    experience: string[];
    projects: string[];
    education: string[];
    certs: string[];
  } = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certs: []
  };

  let currentSec = 'header';

  const isSecHeader = (line: string): string | null => {
    const t = line.trim().replace(/^\[|\]$/g, '').replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').toUpperCase();
    if (!t) return null;

    if (/^(PROFESSIONAL SUMMARY|SUMMARY|CAREER SUMMARY|PROFILE|EXECUTIVE SUMMARY|ABOUT ME)$/i.test(t)) return 'summary';
    if (/^(TECHNICAL SKILLS|SKILLS|CORE COMPETENCIES|AREAS OF EXPERTISE|TECHNOLOGIES)$/i.test(t)) return 'skills';
    if (/^(PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY|CAREER HISTORY)$/i.test(t)) return 'experience';
    if (/^(TECHNICAL PROJECTS|PROJECTS|KEY PROJECTS|NOTABLE PROJECTS|FEATURED PROJECTS)$/i.test(t)) return 'projects';
    if (/^(EDUCATION|ACADEMIC BACKGROUND|EDUCATION & QUALIFICATIONS|EDUCATION AND TRAINING)$/i.test(t)) return 'education';
    if (/^(CERTIFICATIONS|LICENSES & CERTIFICATIONS|CERTIFICATIONS & LICENSES|CERTIFICATES)$/i.test(t)) return 'certs';
    return null;
  };

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i];
    const detected = isSecHeader(rawLine);
    if (detected) {
      currentSec = detected;
      continue;
    }
    (sectionLines as any)[currentSec].push(rawLine);
  }

  // Step 2: Parse Header (Name, Subtitle, Contact details)
  const headerLines = sectionLines.header.map(l => l.trim()).filter(Boolean);
  let nameFound = false;
  let subtitleFound = false;

  headerLines.forEach(line => {
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !result.email) result.email = emailMatch[0];

    const phoneMatch = line.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch && !result.phone) result.phone = phoneMatch[0];

    const liMatch = line.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    if (liMatch && !result.linkedin) result.linkedin = liMatch[0].replace(/^https?:\/\//i, '');

    // Check for Location or pipe-separated parts
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      parts.forEach(p => {
        if (!result.email && p.includes('@')) result.email = p;
        else if (!result.linkedin && p.toLowerCase().includes('linkedin')) result.linkedin = p.replace(/^https?:\/\//i, '');
        else if (!result.phone && /(?:\+?\d{1,3})?[\d\s-()]{7,}/.test(p) && /\d{3}/.test(p)) result.phone = p;
        else if (!result.location && /[A-Za-z]+,\s*[A-Za-z]{2}/.test(p)) result.location = p;
        else if (!nameFound && !p.includes('@') && !/\d/.test(p) && p.length < 40) {
          result.name = p;
          nameFound = true;
        }
      });
      return;
    }

    if (!nameFound && !line.includes('@') && !line.includes('http') && !/\d/.test(line) && line.length < 50) {
      result.name = line.replace(/^\*+|\*+$/g, '').trim();
      nameFound = true;
    } else if (!subtitleFound && nameFound && !line.includes('@') && !line.includes('http') && !/\d{3}/.test(line) && line.length < 80) {
      result.subtitle = line.replace(/^\*+|\*+$/g, '').trim();
      subtitleFound = true;
    } else if (!result.location && /[A-Za-z]+,\s*[A-Za-z]{2}/.test(line)) {
      result.location = line.replace(/^\*+|\*+$/g, '').trim();
    }
  });

  // Step 3: Parse Summary
  result.summary = sectionLines.summary
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');

  // Step 4: Parse Technical Skills
  const skillLines = sectionLines.skills.map(l => l.trim()).filter(Boolean);
  skillLines.forEach(line => {
    const cleanLine = line.replace(/^[-•*·]\s*/, '').replace(/^\*+|\*+$/g, '').trim();
    if (!cleanLine) return;

    if (cleanLine.includes(':')) {
      const idx = cleanLine.indexOf(':');
      const category = cleanLine.substring(0, idx).trim();
      const list = cleanLine.substring(idx + 1).trim();
      if (category && list) {
        result.skills.push({ category, list });
      }
    } else if (cleanLine.includes('–') || cleanLine.includes('—')) {
      const parts = cleanLine.split(/[–—]/);
      if (parts.length >= 2) {
        result.skills.push({ category: parts[0].trim(), list: parts.slice(1).join(', ').trim() });
      }
    } else {
      result.skills.push({ category: 'Key Competencies', list: cleanLine });
    }
  });

  // Step 5: Parse Experience
  const expLines = sectionLines.experience.map(l => l.trim()).filter(Boolean);
  let currentJob: ExperienceJob | null = null;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const isBullet = /^[-•*·▪]\s+/.test(line);

    // Check for 4-part pipe format: Company | Location | Role | Dates
    if (line.includes('|') && !isBullet) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        if (currentJob) result.experience.push(currentJob);

        if (parts.length >= 4) {
          currentJob = {
            company: parts[0],
            location: parts[1],
            role: parts[2],
            dates: parts[3],
            bullets: []
          };
        } else {
          // Company — Location | Role | Dates
          const split = splitCompanyAndLocation(parts[0]);
          currentJob = {
            company: split.company,
            location: split.location,
            role: parts[1],
            dates: parts[2],
            bullets: []
          };
        }
        continue;
      }
    }

    // Check for 2-column Company Header and Role line
    const dateMatch = line.match(/(?:0?[1-9]|1[0-2])\/\d{4}\s*[-–—]\s*(?:Present|Current|(?:0?[1-9]|1[0-2])\/\d{4}|\d{4})|\b(?:19|20)\d{2}\s*[-–—]\s*(?:Present|Current|\b(?:19|20)\d{2}\b)/i);
    
    if (!isBullet && line.length < 90 && (dateMatch || (i + 1 < expLines.length && !expLines[i + 1].startsWith('-') && !expLines[i + 1].startsWith('•')))) {
      if (dateMatch) {
        if (currentJob) result.experience.push(currentJob);
        const datesStr = dateMatch[0];
        const rest = line.replace(datesStr, '').replace(/[\s|—–-]+$/, '').trim();
        const split = splitCompanyAndLocation(rest);

        currentJob = {
          company: split.company,
          location: split.location,
          role: '',
          dates: datesStr,
          bullets: []
        };
        continue;
      } else if (currentJob && !currentJob.role) {
        currentJob.role = line.replace(/^\*+|\*+$/g, '').trim();
        continue;
      } else if (!currentJob) {
        const split = splitCompanyAndLocation(line);
        currentJob = {
          company: split.company,
          location: split.location,
          role: '',
          dates: '',
          bullets: []
        };
        continue;
      }
    }

    // Bullet point
    if (isBullet) {
      const bulletText = line
        .replace(/^[-•*·▪]\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/^\*+|\*+$/g, '')
        .trim();
      if (bulletText) {
        if (!currentJob) {
          currentJob = {
            company: 'Professional Project',
            location: '',
            role: result.subtitle || 'Senior Specialist',
            dates: 'Present',
            bullets: []
          };
        }
        currentJob.bullets.push(bulletText);
      }
      continue;
    }

    // Continuation line
    if (currentJob && currentJob.bullets.length > 0) {
      currentJob.bullets[currentJob.bullets.length - 1] += ' ' + line.replace(/^\*+|\*+$/g, '');
    }
  }

  if (currentJob) {
    result.experience.push(currentJob);
  }

  // Step 6: Parse Technical Projects
  const projLines = sectionLines.projects.map(l => l.trim()).filter(Boolean);
  let currentProj: ProjectItem | null = null;

  projLines.forEach(line => {
    const isBullet = /^[-•*·▪]\s+/.test(line);
    if (!isBullet && line.length < 100) {
      if (currentProj) result.projects.push(currentProj);

      let pTitle = line.replace(/^\*+|\*+$/g, '').trim();
      let pTech = '';
      let pLink = '';

      if (pTitle.includes('|')) {
        const parts = pTitle.split('|').map(p => p.trim());
        pTitle = parts[0];
        pTech = parts[1] || '';
        pLink = parts[2] || '';
      }

      currentProj = {
        name: pTitle,
        title: pTitle,
        tech: pTech,
        tech_stack: pTech,
        link: pLink,
        url: pLink,
        bullets: []
      };
    } else if (isBullet && currentProj) {
      const bText = line.replace(/^[-•*·▪]\s*/, '').replace(/^\*+|\*+$/g, '').trim();
      if (bText) currentProj.bullets.push(bText);
    }
  });

  if (currentProj) {
    result.projects.push(currentProj);
  }

  // Step 7: Parse Education
  const eduLines = sectionLines.education.map(l => l.trim()).filter(Boolean);
  let currentEdu: EducationItem | null = null;

  eduLines.forEach(eLine => {
    const cleanLine = eLine.replace(/^[-•*·▪]\s*/, '').replace(/\*\*/g, '').trim();
    if (!cleanLine) return;

    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map(p => p.trim());
      if (currentEdu) result.education.push(currentEdu);

      currentEdu = {
        degree: parts[0] || 'Bachelor of Science',
        school: parts[1] || '',
        dates: parts[2] || '',
        location: parts[3] || ''
      };
      return;
    }

    const isDegree = /(?:Bachelor|Master|B\.Sc|B\.Tech|B\.E\.|M\.Sc|M\.Tech|Diploma|Doctor|Ph\.D|Associate|High\s+School)/i.test(cleanLine);
    const dateMatch = cleanLine.match(/(?:0?[1-9]|1[0-2])\/\d{4}|\b(?:19|20)\d{2}\b/);

    if (isDegree) {
      if (currentEdu) result.education.push(currentEdu);
      const dStr = dateMatch ? dateMatch[0] : '';
      const deg = dateMatch ? cleanLine.replace(dateMatch[0], '').replace(/[\s|—–-]+$/, '').trim() : cleanLine;

      currentEdu = {
        degree: deg,
        school: '',
        dates: dStr,
        location: ''
      };
    } else if (currentEdu) {
      if (cleanLine.includes('—') || cleanLine.includes(' - ')) {
        const sParts = cleanLine.split(/\s*(?:—|-)\s*/);
        currentEdu.school = sParts[0].trim();
        currentEdu.location = sParts[1] ? sParts[1].trim() : '';
      } else {
        if (!currentEdu.school) currentEdu.school = cleanLine;
        else currentEdu.school += ' — ' + cleanLine;
      }
      if (dateMatch && !currentEdu.dates) currentEdu.dates = dateMatch[0];
    } else {
      result.education.push({
        degree: cleanLine,
        school: '',
        dates: dateMatch ? dateMatch[0] : '',
        location: ''
      });
    }
  });

  if (currentEdu) {
    result.education.push(currentEdu);
  }

  // Step 8: Parse Certifications
  const certLines = sectionLines.certs.map(l => l.trim()).filter(Boolean);
  certLines.forEach(cLine => {
    const cleanLine = cLine.replace(/^[-•*·▪]\s*/, '').replace(/\*\*/g, '').trim();
    if (cleanLine) {
      result.certs.push(cleanLine);
    }
  });

  // Step 9: Baseline Context Fallbacks
  if (baseContext) {
    if ((!result.name || result.name === 'Candidate Name') && baseContext.name) result.name = baseContext.name;
    if ((!result.subtitle || result.subtitle === 'Professional Role') && baseContext.subtitle) result.subtitle = baseContext.subtitle;
    if (!result.location && baseContext.location) result.location = baseContext.location;
    if (!result.phone && baseContext.phone) result.phone = baseContext.phone;
    if (!result.email && baseContext.email) result.email = baseContext.email;
    if (!result.linkedin && baseContext.linkedin) result.linkedin = baseContext.linkedin;
    if ((!result.education || result.education.length === 0) && baseContext.education && baseContext.education.length > 0) {
      result.education = [...baseContext.education];
    }
    if ((!result.certs || result.certs.length === 0) && baseContext.certs && baseContext.certs.length > 0) {
      result.certs = [...baseContext.certs];
    }
    if ((!result.projects || result.projects.length === 0) && baseContext.projects && baseContext.projects.length > 0) {
      result.projects = [...baseContext.projects];
    }
  }

  // Fallback defaults
  if (!result.name) result.name = 'Alexander Morgan';
  if (!result.subtitle) result.subtitle = 'Senior Automation & Controls Engineer';
  if (!result.location) result.location = 'Dallas, TX';
  if (!result.phone) result.phone = '+1 (555) 019-2834';
  if (!result.email) result.email = 'alex.morgan@email.com';

  return result;
}

// ── Legacy ParsedExperience ──
export interface ParsedExperience {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

export function parseExperiencesFromResumeText(resumeRawText: string): ParsedExperience[] {
  const normalized = parseResumePlainText(resumeRawText);
  return normalized.experience.map(j => {
    let start_date = '';
    let end_date = '';
    if (j.dates) {
      const parts = j.dates.split(/[–—\-]/).map(d => d.trim());
      start_date = parts[0] || '';
      end_date = parts[1] || '';
    }
    return {
      company: j.company,
      title: j.role,
      location: j.location,
      start_date,
      end_date,
      description: j.bullets.map(b => `- ${b}`).join('\n')
    };
  });
}
