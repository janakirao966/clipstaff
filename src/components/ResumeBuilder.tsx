import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  FileText, Download, ClipboardPaste, CheckCircle2, Type
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink,
  AlignmentType, BorderStyle, TabStopType, LevelFormat
} from 'docx';
import jsPDF from 'jspdf';

// Chrome extension safe download using Base64 Data URL + chrome.downloads API
function chromeDownload(blob: Blob, filename: string) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(downloadId);
          }
        });
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    } else {
      // Fallback for non-extension environment
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }
  });
}

// ── Section Parser (Robust for brackets or plain text) ──
function parseContent(raw: string) {
  const text = raw.replace(/\r\n/g, '\n');
  
  // The lookahead checks for the next section header or end of string
  const boundaries = 'SUMMARY|PROFESSIONAL SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION';
  
  const summaryRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SUMMARY|PROFESSIONAL SUMMARY)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const skillsRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:SKILLS|TECHNICAL SKILLS)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');
  const experienceRx = new RegExp(`(?:^|\\n)\\s*(?:\\[?(?:EXPERIENCE|PROFESSIONAL EXPERIENCE)\\]?)\\s*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\[?(?:${boundaries})\\]?)\\s*\\n|$)`, 'i');

  const get = (rx: RegExp) => { const m = text.match(rx); return m ? m[1].trim() : ''; };
  return { summary: get(summaryRx), skills: get(skillsRx), experience: get(experienceRx) };
}

function escHtml(str: string) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export const ResumeBuilder = () => {
  const { 
    activeProfile, 
    setDynamicShortcuts, 
    dynamicShortcuts,
    resumeText,
    setResumeText
  } = useStore();
  const [generating, setGenerating] = useState(false);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-generate experience shortcuts (exp1, exp2, etc.) with a 500ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const { experience } = parseContent(resumeText);
      if (!experience) {
        setDynamicShortcuts({});
        return;
      }

      const lines = experience.split('\n');
      const dynamic: Record<string, string> = {};
      let expCount = 0;
      let currentBlock: string[] = [];

      lines.forEach(line => {
        const t = line.trim();
        // Detect a header line (contains | and is NOT a bullet/list item)
        if (t.includes('|') && !/^([-•*·]|\d+\.)/.test(t)) {
          if (currentBlock.length > 0) {
            expCount++;
            // Join with newline and ensure each line starts with a standard dash bullet
            dynamic[`exp${expCount}`] = currentBlock.map(line => `- ${line}`).join('\n');
          }
          currentBlock = []; // START NEW BLOCK - DO NOT include the header line
        } else if (t) {
          // STRIP THE ORIGINAL BULLET SYMBOL first to clean it up
          currentBlock.push(t.replace(/^([-•*·]|\d+\.)\s*/, ''));
        }
      });

      if (currentBlock.length > 0) {
        expCount++;
        dynamic[`exp${expCount}`] = currentBlock.map(line => `- ${line}`).join('\n');
      }

      setDynamicShortcuts(dynamic);
    }, 500);

    return () => clearTimeout(timer);
  }, [resumeText, setDynamicShortcuts]);

  // Detect which sections are present
  const sections = useMemo(() => {
    const { summary, skills, experience } = parseContent(resumeText);
    return [
      { label: 'Summary', found: !!summary },
      { label: 'Skills', found: !!skills },
      { label: 'Experience', found: !!experience }
    ];
  }, [resumeText]);

  // Build the profile object from stored data
  const P = useMemo(() => ({
    name: activeProfile?.full_name || 'Your Name',
    subtitle: activeProfile?.professional_subtitle || '',
    email: activeProfile?.email || '',
    phone: activeProfile?.phone || '',
    location: (activeProfile?.location || '').replace(/\s+,/, ',').replace(/united states/i, 'United States').trim(),
    linkedin: activeProfile?.linkedin_url || '',
    education: (activeProfile?.education || []).map(e => ({
      degree: e.degree || e.school,
      dates: `${e.start_year} – ${e.end_year}`,
      school: e.school,
      location: e.location
    })),
    certifications: activeProfile?.certifications || []
  }), [activeProfile]);

  // Build preview HTML (same format as the standalone builder)
  const previewHtml = useMemo(() => {
    if (!resumeText.trim()) return '';
    const { summary, skills, experience } = parseContent(resumeText);
    let html = '';

    // Header
    html += `<div class="rb-name">${escHtml(P.name)}</div>`;
    if (P.subtitle) html += `<div class="rb-subtitle">${escHtml(P.subtitle)}</div>`;
    
    const contactParts = [];
    if (P.location) contactParts.push(escHtml(P.location));
    if (P.phone) contactParts.push(escHtml(P.phone));
    if (P.email) {
      contactParts.push(`<a href="mailto:${escHtml(P.email)}" style="color:#0000ff;text-decoration:underline;">${escHtml(P.email)}</a>`);
    }
    if (P.linkedin) {
      const rawUrl = P.linkedin.trim();
      const hrefUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      const display = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
      contactParts.push(`<a href="${escHtml(hrefUrl)}" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">${escHtml(display)}</a>`);
    }
    
    html += `<div class="rb-contact">${contactParts.join(' &nbsp;|&nbsp; ')}</div>`;

    // Summary
    if (summary) {
      html += `<div class="rb-section-head">PROFESSIONAL SUMMARY:</div>`;
      html += `<div class="rb-text">${escHtml(summary)}</div>`;
    }

    // Skills
    if (skills) {
      html += `<div class="rb-section-head">TECHNICAL SKILLS:</div>`;
      skills.split('\n').filter(l => l.trim()).forEach(line => {
        const cleanLine = line.trim().replace(/^[-•*]\s*/, '');
        const idx = cleanLine.indexOf(':');
        if (idx > -1) {
          html += `<div class="rb-skill-line"><strong>${escHtml(cleanLine.substring(0, idx+1))}</strong>${escHtml(cleanLine.substring(idx+1))}</div>`;
        } else {
          html += `<div class="rb-skill-line">${escHtml(cleanLine)}</div>`;
        }
      });
    }

    // Experience
    if (experience) {
      html += `<div class="rb-section-head">PROFESSIONAL EXPERIENCE:</div>`;
      experience.split('\n').filter(l => l.trim()).forEach(line => {
        const t = line.trim();
        if (/^([-•*]|\d+\.)\s*/.test(t)) {
          html += `<div class="rb-bullet">${escHtml(t.replace(/^([-•*]|\d+\.)\s*/, ''))}</div>`;
        } else if (t.includes('|')) {
          const parts = t.split('|').map(p => p.trim());
          if (parts.length >= 4) {
            html += `
              <div class="rb-exp-header">
                <span>${escHtml(parts[0])}</span>
                <span>${escHtml(parts[3])}</span>
              </div>
              <div class="rb-exp-header" style="font-weight: normal; margin-top: 0; margin-bottom: 4pt;">
                <span style="font-weight: normal;">${escHtml(parts[2])}</span>
                <span style="font-weight: normal;">${escHtml(parts[1])}</span>
              </div>
            `;
          } else if (parts.length === 3) {
            html += `
              <div class="rb-exp-header">
                <span>${escHtml(parts[0])}</span>
                <span>${escHtml(parts[2])}</span>
              </div>
              <div class="rb-exp-role">${escHtml(parts[1])}</div>
            `;
          } else {
            html += `<div class="rb-exp-header"><span>${escHtml(t)}</span></div>`;
          }
        } else {
          html += `<div class="rb-text" style="margin-top: 4px;">${escHtml(t)}</div>`;
        }
      });
    }

    // Education
    if (P.education.length > 0) {
      html += `<div class="rb-section-head">EDUCATION:</div>`;
      P.education.forEach(e => {
        html += `
          <div class="rb-edu-row">
            <span>${escHtml(e.degree)}</span>
            <span>${escHtml(e.dates)}</span>
          </div>
          <div class="rb-edu-school">${escHtml(e.school)}${e.location ? ', ' + escHtml(e.location) : ''}</div>
        `;
      });
    }

    // Certifications
    if (P.certifications.length > 0) {
      html += `<div class="rb-section-head">CERTIFICATIONS:</div>`;
      P.certifications.forEach(c => {
        const cleanC = c.replace(/^([-•*·]|\d+\.)\s*/, '');
        html += `<div class="rb-bullet">${escHtml(cleanC)}</div>`;
      });
    }

    return html;
  }, [resumeText, P]);

  React.useEffect(() => {
    if (previewRef.current) {
      previewRef.current.innerHTML = previewHtml;
    }
  }, [previewHtml]);

  // Get safe file name from profile
  const getFileName = () => {
    const name = activeProfile?.full_name || 'Resume';
    return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  };

  // Paste from clipboard (multi-strategy for Chrome extension context)
  const pasteFromClipboard = async () => {
    let text = '';

    // Strategy 1: navigator.clipboard API (requires focus + user gesture)
    try {
      text = await navigator.clipboard.readText();
    } catch {
      // Strategy 2: execCommand('paste') with hidden textarea (works with clipboardRead permission)
      try {
        const hiddenArea = document.createElement('textarea');
        hiddenArea.style.position = 'fixed';
        hiddenArea.style.left = '-9999px';
        hiddenArea.style.top = '-9999px';
        hiddenArea.style.opacity = '0';
        document.body.appendChild(hiddenArea);
        hiddenArea.focus();
        document.execCommand('paste');
        text = hiddenArea.value;
        document.body.removeChild(hiddenArea);
      } catch {
        // Both strategies failed
      }
    }

    if (text?.trim()) {
      text = text.replace(/^(\d+\.)(?!\d)\s*/gm, '- ');
      setResumeText(text);
      toast.success('Resume content pasted!');
    } else {
      toast.error('Could not read clipboard. Copy your resume text first, then try again.');
      textareaRef.current?.focus();
    }
  };

  // Handle textarea input with sanitization
  const handleTextChange = (val: string) => {
    const sanitized = val.replace(/^(\d+\.)(?!\d)\s*/gm, '- ');
    setResumeText(sanitized);
  };

  // PDF download — programmatic jsPDF generation (same pattern as DOCX generator)
  const downloadPdf = async () => {
    if (!resumeText.trim()) { toast.error('Paste your resume content first'); return; }
    setGenerating(true);

    try {
      const { summary, skills, experience } = parseContent(resumeText);
      const fontName = fontFamily === 'serif' ? 'times' : 'helvetica';

      // Letter: 8.5×11in = 612×792pt. Reference uses 32pt padding (matching Word 0.5in inner margin)
      const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const pageW = 612;
      const pageH = 792;
      const margin = 32;
      const contentW = pageW - margin * 2;
      let y = margin;
      const lineH = 11 * 1.15; // 11pt font × 1.15 line-height = 12.65pt

      // Auto page-break
      const checkPage = (needed: number) => {
        if (y + needed > pageH - margin) { pdf.addPage(); y = margin; }
      };

      // Word-wrapped text block
      const drawText = (text: string, x: number, fontSize: number, style: string, maxW: number, align?: string) => {
        pdf.setFont(fontName, style);
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        const lines = pdf.splitTextToSize(text, maxW);
        const lh = fontSize * 1.15;
        for (const line of lines) {
          checkPage(lh);
          if (align === 'center') {
            pdf.text(line, pageW / 2, y, { align: 'center' });
          } else {
            pdf.text(line, x, y);
          }
          y += lh;
        }
      };

      // ── NAME (14pt bold, centered, margin: 4pt top/bottom) ──
      y += 4;
      drawText(P.name, margin, 14, 'bold', contentW, 'center');
      y += 4;

      // ── SUBTITLE (11pt bold, centered, margin-bottom: 6pt) ──
      if (P.subtitle) {
        drawText(P.subtitle, margin, 11, 'bold', contentW, 'center');
        y += 6;
      }

      // ── CONTACT (11pt, centered, margin-bottom: 12pt) ──
      const cParts: string[] = [];
      if (P.location) cParts.push(P.location);
      if (P.phone) cParts.push(P.phone);
      if (P.email) cParts.push(P.email);
      if (P.linkedin) {
        const display = P.linkedin.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
        cParts.push(display);
      }
      if (cParts.length > 0) {
        drawText(cParts.join('  |  '), margin, 11, 'normal', contentW, 'center');
      }
      y += 12;

      // ── SECTION HEADER (11pt bold upper, 12pt top margin, line, then content gap) ──
      const sectionHeader = (title: string) => {
        y += 10;
        checkPage(24);
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title.toUpperCase(), margin, y);
        y += 3; // padding-bottom: space between text baseline and line
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageW - margin, y);
        y += lineH; // CRITICAL: advance full line-height after the line so next text baseline clears it
      };

      // ── SUMMARY (11pt, margin-bottom: 6pt) ──
      if (summary) {
        sectionHeader('Professional Summary');
        drawText(summary, margin, 11, 'normal', contentW);
      }

      // ── SKILLS (11pt, margin-bottom: 2pt per line) ──
      if (skills) {
        sectionHeader('Technical Skills');
        skills.split('\n').filter(l => l.trim()).forEach(line => {
          const cleanLine = line.trim().replace(/^[-\u2022*]\s*/, '');
          const idx = cleanLine.indexOf(':');
          if (idx > -1) {
            checkPage(lineH);
            pdf.setFont(fontName, 'bold');
            pdf.setFontSize(11);
            const label = cleanLine.substring(0, idx + 1);
            pdf.text(label, margin, y);
            const labelW = pdf.getTextWidth(label);
            pdf.setFont(fontName, 'normal');
            const rest = cleanLine.substring(idx + 1);
            const restLines = pdf.splitTextToSize(rest, contentW - labelW);
            pdf.text(restLines[0] || '', margin + labelW, y);
            y += lineH;
            for (let i = 1; i < restLines.length; i++) {
              checkPage(lineH);
              pdf.text(restLines[i], margin, y);
              y += lineH;
            }
          } else {
            drawText(cleanLine, margin, 11, 'normal', contentW);
          }
          y += 2; // small gap between skill lines
        });
      }

      // ── EXPERIENCE ──
      if (experience) {
        sectionHeader('Professional Experience');
        experience.split('\n').filter(l => l.trim()).forEach(line => {
          const t = line.trim();
          if (/^[-\u2022*]/.test(t)) {
            // Bullet: padding-left: 8pt, margin: 2pt top/bottom
            const bulletText = t.replace(/^[-\u2022*]\s*/, '');
            y += 2;
            checkPage(lineH);
            pdf.setFont(fontName, 'normal');
            pdf.setFontSize(11);
            pdf.text('\u2022', margin, y);
            const bulletLines = pdf.splitTextToSize(bulletText, contentW - 8);
            bulletLines.forEach((bl: string, i: number) => {
              if (i > 0) { y += lineH; checkPage(lineH); }
              pdf.text(bl, margin + 8, y);
            });
            y += lineH;
            y += 2;
          } else if (t.includes('|')) {
            const parts = t.split('|').map(p => p.trim());
            if (parts.length >= 4) {
              // Company | Location | Role | Dates
              y += 8;
              checkPage(lineH * 2 + 2);
              pdf.setFont(fontName, 'bold');
              pdf.setFontSize(11);
              pdf.text(parts[0], margin, y);
              pdf.text(parts[3], pageW - margin, y, { align: 'right' });
              y += lineH;
              pdf.setFont(fontName, 'normal');
              pdf.text(parts[2], margin, y);
              pdf.text(parts[1], pageW - margin, y, { align: 'right' });
              y += lineH;
              y += 2;
            } else if (parts.length === 3) {
              y += 8;
              checkPage(lineH * 2 + 2);
              pdf.setFont(fontName, 'bold');
              pdf.setFontSize(11);
              pdf.text(parts[0], margin, y);
              pdf.text(parts[2], pageW - margin, y, { align: 'right' });
              y += lineH;
              pdf.setFont(fontName, 'normal');
              pdf.text(parts[1], margin, y);
              y += lineH;
              y += 2;
            } else {
              y += 8;
              checkPage(lineH);
              pdf.setFont(fontName, 'bold');
              pdf.setFontSize(11);
              pdf.text(t, margin, y);
              y += lineH;
            }
          } else {
            drawText(t, margin, 11, 'normal', contentW);
          }
        });
      }

      // ── EDUCATION ──
      if (P.education.length > 0) {
        sectionHeader('Education');
        P.education.forEach(e => {
          y += 6;
          checkPage(lineH * 2 + 2);
          pdf.setFont(fontName, 'bold');
          pdf.setFontSize(11);
          pdf.text(e.degree, margin, y);
          pdf.text(e.dates, pageW - margin, y, { align: 'right' });
          y += lineH;
          pdf.setFont(fontName, 'normal');
          pdf.text(`${e.school}${e.location ? ', ' + e.location : ''}`, margin, y);
          y += lineH;
          y += 2;
        });
      }

      // ── CERTIFICATIONS ──
      const activeCerts = P.certifications.map(c => c.trim()).filter(Boolean);
      if (activeCerts.length > 0) {
        sectionHeader('Certifications');
        activeCerts.forEach(c => {
          const cleanC = c.replace(/^[-\u2022*\u00b7]\s*/, '').replace(/^\d+\.\s*/, '');
          y += 2;
          checkPage(lineH);
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(11);
          pdf.text('\u2022', margin, y);
          pdf.text(cleanC, margin + 8, y);
          y += lineH;
          y += 2;
        });
      }

      // Generate blob and download
      const fileName = getFileName() + '_Resume.pdf';
      const pdfBlob = pdf.output('blob');
      await chromeDownload(pdfBlob, fileName);
      toast.success(`${fileName} downloaded!`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('PDF generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // DOCX generation (exact same format as the HTML file)
  const downloadDocx = async () => {
    if (!resumeText.trim()) { toast.error('Paste your resume content first'); return; }
    setGenerating(true);
    
    try {
      const { summary, skills, experience } = parseContent(resumeText);
      const selectedFont = fontFamily === 'serif' ? 'Times New Roman' : 'Arial';

      function sectionHead(text: string) {
        return new Paragraph({
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 } },
          children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: selectedFont, color: '000000' })]
        });
      }

      function bullet(text: string) {
        return new Paragraph({
          spacing: { before: 30, after: 30 },
          indent: { left: 240, hanging: 240 },
          tabStops: [{ type: TabStopType.LEFT, position: 240 }],
          children: [
            new TextRun({ text: "•\t", font: selectedFont, size: 22, color: '000000' }),
            new TextRun({ text, font: selectedFont, size: 22, color: '000000' })
          ]
        });
      }

      function skillsDocx(rawSkills: string) {
        if (!rawSkills) return [];
        return rawSkills.split('\n').filter(l => l.trim()).map(line => {
          const cleanLine = line.trim().replace(/^[-•*–—\u2013\u2014\u2022]\s*/, '');
          const idx = cleanLine.indexOf(':');
          if (idx > -1) {
            return new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: cleanLine.substring(0, idx+1), bold: true, font: selectedFont, size: 22, color: '000000' }),
                new TextRun({ text: cleanLine.substring(idx+1), font: selectedFont, size: 22, color: '000000' })
              ]
            });
          }
          return new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [new TextRun({ text: cleanLine, font: selectedFont, size: 22, color: '000000' })]
          });
        });
      }

      function expDocx(rawExp: string) {
        if (!rawExp) return [];
        return rawExp.split('\n').filter(l => l.trim()).map(line => {
          const t = line.trim();
          if (/^[-•*–—\u2013\u2014\u2022]/.test(t)) return bullet(t.replace(/^[-•*–—\u2013\u2014\u2022]\s*/, ''));
          if (t.includes('|')) {
            const parts = t.split('|').map(p => p.trim());
            const rows = [];
            if (parts.length >= 4) {
              rows.push(new Paragraph({
                spacing: { before: 180, after: 40 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({ text: parts[0], bold: true, font: selectedFont, size: 22, color: '000000' }),
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: parts[3], bold: true, font: selectedFont, size: 22, color: '000000' })
                ]
              }));
              rows.push(new Paragraph({
                spacing: { before: 0, after: 60 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({ text: parts[2], font: selectedFont, size: 22, color: '000000' }),
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: parts[1], font: selectedFont, size: 22, color: '000000' })
                ]
              }));
            } else if (parts.length === 3) {
              rows.push(new Paragraph({
                spacing: { before: 180, after: 40 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({ text: parts[0], bold: true, font: selectedFont, size: 22, color: '000000' }),
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: parts[2], bold: true, font: selectedFont, size: 22, color: '000000' })
                ]
              }));
              rows.push(new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [new TextRun({ text: parts[1], font: selectedFont, size: 22, color: '000000' })]
              }));
            }
            return rows;
          }
          return new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: t, font: selectedFont, size: 22, color: '000000' })]
          });
        }).flat();
      }

      const summaryParagraphs = [];
      if (summary) {
        summaryParagraphs.push(sectionHead('Professional Summary'));
        summaryParagraphs.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: summary, font: selectedFont, size: 22, color: '000000' })]
        }));
      }

      const eduParagraphs = [sectionHead('Education')];
      P.education.forEach(e => {
        eduParagraphs.push(new Paragraph({
          spacing: { before: 180, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
          children: [
            new TextRun({ text: e.degree, bold: true, font: selectedFont, size: 22, color: '000000' }),
            new TextRun({ text: '\t' }),
            new TextRun({ text: e.dates, bold: true, font: selectedFont, size: 22, color: '000000' })
          ]
        }));
        eduParagraphs.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: `${e.school}${e.location ? ', ' + e.location : ''}`, font: selectedFont, size: 22, color: '000000' })]
        }));
      });

      const certParagraphs = [];
      const activeCerts = P.certifications.map(c => c.trim()).filter(Boolean);
      if (activeCerts.length) {
        certParagraphs.push(sectionHead('Certifications'));
        activeCerts.forEach(c => {
          certParagraphs.push(bullet(c));
        });
      }

      const contactChildren = [];
      const textSeparator = () => new TextRun({ text: '  |  ', font: selectedFont, size: 22, color: '000000' });
      
      const contactParts = [];
      if (P.location) contactParts.push(P.location);
      if (P.phone) contactParts.push(P.phone);
      if (contactParts.length > 0) {
        contactChildren.push(new TextRun({ text: contactParts.join('  |  '), font: selectedFont, size: 22, color: '000000' }));
      }
      
      if (P.email) {
        if (contactChildren.length > 0) contactChildren.push(textSeparator());
        contactChildren.push(new ExternalHyperlink({
          children: [
            new TextRun({ text: P.email, font: selectedFont, size: 22, color: '0000ff', underline: {} })
          ],
          link: `mailto:${P.email}`
        }));
      }
      
      if (P.linkedin) {
        if (contactChildren.length > 0) contactChildren.push(textSeparator());
        const rawLinkedin = P.linkedin.trim();
        const hrefLinkedin = rawLinkedin.startsWith('http') ? rawLinkedin : `https://${rawLinkedin}`;
        const displayLinkedin = rawLinkedin.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
        
        contactChildren.push(new ExternalHyperlink({
          children: [
            new TextRun({ text: displayLinkedin, font: selectedFont, size: 22, color: '0000ff', underline: {} })
          ],
          link: hrefLinkedin
        }));
      }
      
      const contactParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: contactChildren
      });

      const doc = new Document({
        numbering: { config:[{ reference:'bullets', levels:[{ level:0, format:LevelFormat.BULLET, text:'•', alignment:AlignmentType.LEFT, style:{ paragraph:{ indent: { left: 360, hanging: 360 } } } }] }] },
        styles: { default: { document: { run:{ font:selectedFont, size:22, color:'000000' } } } },
        sections:[{
          properties:{
            page:{
              size:{width:12240,height:15840},
              margin:{top:720,right:720,bottom:720,left:720}
            }
          },
          children:[
            new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80}, children:[new TextRun({text:P.name || '', bold:true, font:selectedFont, size:28, color:'000000'})] }),
            new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:120}, children:[new TextRun({text:P.subtitle || '', bold:true, font:selectedFont, size:22, color:'000000'})] }),
            contactParagraph,
            ...summaryParagraphs,
            sectionHead('Technical Skills'),
            ...skillsDocx(skills),
            sectionHead('Professional Experience'),
            ...expDocx(experience),
            ...eduParagraphs,
            ...certParagraphs
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const fileName = getFileName() + '_Resume.docx';
      await chromeDownload(blob, fileName);
      toast.success(`${fileName} downloaded!`);

    } catch (err: any) {
      console.error(err);
      toast.error('DOCX generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const hasContent = resumeText.trim().length > 0;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Profile Status */}
      {activeProfile ? (
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-accent uppercase tracking-widest">Profile Connected</p>
            <p className="text-xs text-white font-bold">{activeProfile.full_name || 'Set your name in Profile'}</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">⚠ Save your Profile first</p>
        </div>
      )}

      {/* Instructions */}
      <div className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ash mb-1">Paste Resume Content</h3>
          <p className="text-[9px] text-fog leading-relaxed">
            Use tags: <code className="bg-accent/10 text-accent px-1 rounded text-[8px]">[SUMMARY]</code> &nbsp;
            <code className="bg-accent/10 text-accent px-1 rounded text-[8px]">[SKILLS]</code> &nbsp;
            <code className="bg-accent/10 text-accent px-1 rounded text-[8px]">[EXPERIENCE]</code>
          </p>
        </div>
        
        {/* Font Selector */}
        <div className="flex bg-carbon rounded-md p-0.5 border border-graphite">
          <button 
            onClick={() => setFontFamily('serif')}
            className={`p-1.5 rounded-md transition-all ${fontFamily === 'serif' ? 'bg-accent text-void' : 'text-ash hover:text-mist'}`}
            title="Serif Font (Classic)"
          >
            <Type className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setFontFamily('sans')}
            className={`p-1.5 rounded-md transition-all ${fontFamily === 'sans' ? 'bg-accent text-void' : 'text-ash hover:text-mist'}`}
            title="Sans-Serif Font (Modern)"
          >
            <span className="text-[10px] font-sans font-bold leading-none">Ag</span>
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={8}
        placeholder={"[PROFESSIONAL SUMMARY]\nSenior Engineer with 5+ years...\n\n[TECHNICAL SKILLS]\nPLC: Siemens S7-1200/1500\n\n[PROFESSIONAL EXPERIENCE]\nCompany | Location | Title | Dec 2023 – Present\n- Developed automated systems..."}
        className="w-full px-4 py-3 bg-carbon border border-graphite rounded-md text-xs text-white placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
        value={resumeText}
        onChange={(e) => handleTextChange(e.target.value)}
      />

      {/* Dynamic Shortcuts Indicator */}
      {Object.keys(dynamicShortcuts).length > 0 && (
        <div className="bg-accent/5 border border-accent/10 rounded-md p-3">
          <p className="text-[9px] font-bold text-accent uppercase tracking-widest mb-2">Live Experience Shortcuts</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(dynamicShortcuts).map(key => (
              <span key={key} className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[10px] font-mono border border-accent/20">
                {key}
              </span>
            ))}
          </div>
          <p className="text-[8px] text-fog mt-2">Type these in any job application field to paste the experience block.</p>
        </div>
      )}

      {/* Section Detection Chips */}
      {resumeText.trim() && (
        <div className="flex gap-2 flex-wrap">
          {sections.map(s => (
            <span key={s.label} className={`text-[9px] font-bold px-3 py-1 rounded-full border ${
              s.found 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-red-500/5 text-red-400/60 border-red-500/10'
            }`}>
              {s.found ? '✓' : '○'} {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Paste Button */}
      <Button variant="secondary" onClick={pasteFromClipboard} icon={<ClipboardPaste className="w-4 h-4" />} className="w-full py-3">
        Paste from Clipboard
      </Button>

      {/* Download Buttons */}
      {hasContent && (
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={downloadPdf} icon={<FileText className="w-4 h-4" />} className="py-3 text-xs bg-red-600 hover:bg-red-700 border-red-600">
            Download PDF
          </Button>
          <Button onClick={downloadDocx} isLoading={generating} icon={<Download className="w-4 h-4" />} className="py-3 text-xs">
            Download DOCX
          </Button>
        </div>
      )}

      {/* Company Copy Buttons */}
      {hasContent && <CompanyCopySection resumeText={resumeText} />}

      {/* Resume Preview */}
      {hasContent && (
        <>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Resume Preview</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div 
            ref={previewRef}
            className="bg-white rounded-lg p-6 text-black shadow-2xl shadow-black/40"
            style={{ fontFamily: "'Cambria', Georgia, serif", fontSize: '11px', lineHeight: '1.45' }}
          />
        </>
      )}
    </div>
  );
};

// ── Company Copy Sub-Component ──
const CompanyCopySection = ({ resumeText }: { resumeText: string }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const companies = useMemo(() => {
    const { experience } = parseContent(resumeText);
    if (!experience) return [];
    const lines = experience.split('\n').filter(l => l.trim());
    const result: { name: string; bullets: string[] }[] = [];
    let current: { name: string; bullets: string[] } | null = null;

    lines.forEach(line => {
      const t = line.trim();
      if (t.includes('|') && !/^([-•*·]|\d+\.)/.test(t)) {
        const parts = t.split('|').map(p => p.trim());
        current = { name: parts[0], bullets: [] };
        result.push(current);
      } else if (t && current) {
        // STRIP THE ORIGINAL BULLET and store clean text
        current.bullets.push(t.replace(/^([-•*·]|\d+\.)\s*/, ''));
      }
    });
    return result;
  }, [resumeText]);

  if (companies.length === 0) return null;

  const copyCompany = async (idx: number) => {
    // PREPEND standard dash bullets when copying
    const text = companies[idx].bullets.map(b => `- ${b}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="border border-white/5 rounded-2xl p-4 bg-[#0A0A0A] space-y-3">
      <p className="text-[9px] font-bold text-accent uppercase tracking-widest">📂 Copy Experience by Company</p>
      {companies.map((c, i) => (
        <button
          key={i}
          onClick={() => copyCompany(i)}
          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all ${
            copiedIdx === i
              ? 'border-green-500/30 text-green-400 bg-green-500/5'
              : 'border-white/5 text-white hover:border-accent/30 hover:bg-accent/5'
          }`}
        >
          <span>{c.name} Experience</span>
          <span className="text-[9px] font-normal text-muted">{copiedIdx === i ? '✓ Copied!' : 'Click to copy'}</span>
        </button>
      ))}
    </div>
  );
};
