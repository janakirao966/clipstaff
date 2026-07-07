import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  FileText, Download, ClipboardPaste, CheckCircle2, Type
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import { parseContent } from '../lib/resumeParser';
import { exportResumeToPdf, exportResumeToDocx } from '../lib/exporters';

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

  // PDF download — programmatic PDF generation
  const downloadPdf = async () => {
    if (!resumeText.trim()) {
      toast.error('Paste your resume content first');
      return;
    }
    setGenerating(true);

    try {
      await exportResumeToPdf(resumeText, fontFamily, P, getFileName());
      toast.success('PDF download complete!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('PDF generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // DOCX download — programmatic DOCX generation
  const downloadDocx = async () => {
    if (!resumeText.trim()) {
      toast.error('Paste your resume content first');
      return;
    }
    setGenerating(true);

    try {
      await exportResumeToDocx(resumeText, fontFamily, P, getFileName());
      toast.success('DOCX download complete!');
    } catch (err: any) {
      console.error('DOCX generation error:', err);
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
