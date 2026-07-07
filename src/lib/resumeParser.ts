// ── Section Parser (Robust for brackets or plain text) ──
export interface ParsedResume {
  summary: string;
  skills: string;
  experience: string;
}

export function parseContent(raw: string): ParsedResume {
  const text = raw.replace(/\r\n/g, '\n');
  
  // The lookahead checks for the next section header or end of string
  const boundaries = 'SUMMARY|PROFESSIONAL SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION';
  
  const summaryRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SUMMARY|PROFESSIONAL SUMMARY)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const skillsRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SKILLS|TECHNICAL SKILLS)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const experienceRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:EXPERIENCE|PROFESSIONAL EXPERIENCE)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');

  const get = (rx: RegExp) => { const m = text.match(rx); return m ? m[1].trim() : ''; };
  return { summary: get(summaryRx), skills: get(skillsRx), experience: get(experienceRx) };
}

// ── Profile Backup / Resume Experience Parser ──
export interface ParsedExperience {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

export function parseExperiencesFromResumeText(resumeRawText: string): ParsedExperience[] {
  const parsedExperiences: ParsedExperience[] = [];
  if (!resumeRawText) return parsedExperiences;

  const normalizedText = resumeRawText.replace(/\r\n/g, '\n');
  const boundaries = 'SUMMARY|PROFESSIONAL SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION';
  const experienceRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:EXPERIENCE|PROFESSIONAL EXPERIENCE)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const expMatch = normalizedText.match(experienceRx);
  
  if (expMatch && expMatch[1]) {
    const expBlock = expMatch[1].trim();
    const lines = expBlock.split('\n');
    let currentExp: any = null;
    let descLines: string[] = [];

    lines.forEach((line: string) => {
      const t = line.trim();
      if (t.includes('|') && !/^([-•*·]|\d+\.)/.test(t)) {
        if (currentExp) {
          currentExp.description = descLines.join('\n');
          parsedExperiences.push(currentExp);
        }
        const parts = t.split('|').map(x => x.trim());
        const company = parts[0] || '';
        const location = parts[1] || '';
        const title = parts[2] || '';
        const dates = parts[3] || '';

        let start_date = '';
        let end_date = '';
        if (dates) {
          const dateParts = dates.split(/[–-]/).map(d => d.trim());
          start_date = dateParts[0] || '';
          end_date = dateParts[1] || '';
        }

        currentExp = {
          company,
          title,
          location,
          start_date,
          end_date,
          description: ''
        };
        descLines = [];
      } else if (t) {
        descLines.push(t.replace(/^([-•*·]|\d+\.)\s*/, ''));
      }
    });

    if (currentExp) {
      currentExp.description = descLines.join('\n');
      parsedExperiences.push(currentExp);
    }
  }

  return parsedExperiences;
}
