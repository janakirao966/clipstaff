import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  FileText, Download, ClipboardPaste, Type, Sparkles,
  Maximize2, Minimize2, Eye, Edit3, Layers, Copy, Check,
  RotateCcw, CheckCircle2, Minus, Plus, Scan, Wand2,
  PlusCircle, FileCode, Trash2, Clock, CheckCheck
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import { parseResumePlainText, NormalizedResumeData, ExperienceJob } from '../lib/resumeParser';
import { exportResumeToPdf, exportResumeToDocx } from '../lib/exporters';

function escHtml(str: string) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SAMPLE_ATS_RESUME = `Alexander Morgan
Senior Controls & Automation Engineer
Dallas, TX | +1 (555) 019-2834 | alex.morgan@email.com | linkedin.com/in/alexmorgan

[PROFESSIONAL SUMMARY]
Controls and Automation Engineer with 7+ years of experience engineering automated manufacturing systems using Studio 5000, Ignition SCADA, and Python across automotive and aerospace environments. Reduced system commissioning downtime by 35% through standardized PLC modular architecture.

[TECHNICAL SKILLS]
PLC & Automation: Allen-Bradley ControlLogix, Siemens S7-1500, TIA Portal, Studio 5000
SCADA & HMI: Ignition, FactoryTalk View SE/ME, Wonderware System Platform
Languages & DB: Python, Structured Text, Ladder Logic, SQL, C#
Industrial Networks: EtherNet/IP, Profinet, Modbus TCP/IP, OPC UA

[PROFESSIONAL EXPERIENCE]
Tesla Motors — Austin, TX | Senior Controls Engineer | 03/2022 – Present
- Architected PLC logic for battery pack assembly lines utilizing Studio 5000 and Safety GuardLogix controllers.
- Engineered real-time Ignition SCADA telemetry dashboards tracking 120+ active line metrics with sub-second latency.
- Integrated 18 Fanuc 6-axis robotic cells over EtherNet/IP, decreasing cycle time by 4.2 seconds per unit.

Boeing — Seattle, WA | Controls Engineer | 06/2019 – 02/2022
- Developed and tested safety interlock PLC routines for automated riveting gantries adhering to OSHA standards.
- Standardized factory-wide Allen-Bradley add-on instructions (AOIs) reducing new machine integration time by 25%.

[TECHNICAL PROJECTS]
Automated SCADA Fleet Telemetry | Python, Ignition | https://github.com/alexmorgan/scada-telemetry
- Engineered distributed MQTT broker pipeline handling 10,000 tag writes per second.
- Deployed Grafana visualizations for real-time robotic cell temperature monitoring.

[EDUCATION]
Bachelor of Science in Electrical Engineering | Purdue University | 05/2019 | West Lafayette, IN

[CERTIFICATIONS]
- Certified Automation Professional (CAP) — ISA
- Ignition 8.1 Core Certified — Inductive Automation`;

export const ResumeBuilder = () => {
  const activeProfile = useStore(state => state.activeProfile);
  const setDynamicShortcuts = useStore(state => state.setDynamicShortcuts);
  const dynamicShortcuts = useStore(state => state.dynamicShortcuts);
  const resumeText = useStore(state => state.resumeText);
  const setResumeText = useStore(state => state.setResumeText);

  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'snippets'>('preview');
  const [generating, setGenerating] = useState(false);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'arial' | 'georgia'>('serif');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [testedShortcut, setTestedShortcut] = useState<string | null>(null);

  // Premium Zoom Engine: 'auto' (Fit) or explicit numerical percentage (30% – 150%)
  const [zoomPercent, setZoomPercent] = useState<number | 'auto'>('auto');
  const [fitScalePercent, setFitScalePercent] = useState<number>(55);

  // Dynamic real-height tracking for perfect, overlap-free scaling
  const [page1Height, setPage1Height] = useState<number>(1056);
  const [page2Height, setPage2Height] = useState<number>(1056);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previewPage1Ref = useRef<HTMLDivElement>(null);
  const previewPage2Ref = useRef<HTMLDivElement>(null);

  // Responsive Fit Scale Calculation (ResizeObserver)
  useEffect(() => {
    const updateFitScale = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth || 400;
        // 816px is standard letter paper width at 96 DPI
        const scale = Math.min(1.2, Math.max(0.35, (clientWidth - 28) / 816));
        setFitScalePercent(Math.round(scale * 100));
      }
    };

    updateFitScale();
    window.addEventListener('resize', updateFitScale);
    const ro = new ResizeObserver(updateFitScale);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateFitScale);
      ro.disconnect();
    };
  }, []);

  const currentDisplayPercent = useMemo(() => {
    if (zoomPercent === 'auto') {
      return fitScalePercent;
    }
    return zoomPercent;
  }, [zoomPercent, fitScalePercent]);

  const effectiveScale = useMemo(() => {
    return currentDisplayPercent / 100;
  }, [currentDisplayPercent]);

  const handleZoomIn = () => {
    const current = currentDisplayPercent;
    const next = Math.min(150, Math.round((current + 10) / 5) * 5);
    setZoomPercent(next);
  };

  const handleZoomOut = () => {
    const current = currentDisplayPercent;
    const next = Math.max(30, Math.round((current - 10) / 5) * 5);
    setZoomPercent(next);
  };

  const handleFitWidth = () => {
    setZoomPercent('auto');
  };

  // Build the profile baseline context
  const baseProfileContext = useMemo(() => ({
    name: activeProfile?.full_name || 'Alexander Morgan',
    subtitle: activeProfile?.professional_subtitle || 'Senior Automation & Controls Engineer',
    email: activeProfile?.email || 'alex.morgan@email.com',
    phone: activeProfile?.phone || '+1 (555) 019-2834',
    location: (activeProfile?.location || 'Dallas, TX').replace(/\s+,/, ',').trim(),
    linkedin: activeProfile?.linkedin_url || 'linkedin.com/in/alexmorgan',
    education: (activeProfile?.education || []).map(e => ({
      degree: e.degree || e.school || 'Bachelor of Science',
      dates: `${e.start_year || ''} – ${e.end_year || ''}`.trim().replace(/^–|–$/g, ''),
      school: e.school || '',
      location: e.location || ''
    })),
    certs: activeProfile?.certifications || []
  }), [activeProfile]);

  // Parse structured data from resume text + profile fallbacks
  const normalizedData: NormalizedResumeData = useMemo(() => {
    return parseResumePlainText(resumeText, baseProfileContext);
  }, [resumeText, baseProfileContext]);

  // Auto-generate experience shortcuts (exp1, exp2, etc.) with 500ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!normalizedData.experience || normalizedData.experience.length === 0) {
        setDynamicShortcuts({});
        return;
      }

      const dynamic: Record<string, string> = {};
      normalizedData.experience.forEach((job, idx) => {
        if (job.bullets && job.bullets.length > 0) {
          dynamic[`exp${idx + 1}`] = job.bullets.map(b => `- ${b}`).join('\n');
        }
      });

      setDynamicShortcuts(dynamic);
    }, 500);

    return () => clearTimeout(timer);
  }, [normalizedData, setDynamicShortcuts]);

  // Total experience bullets
  const totalBullets = useMemo(() => {
    return (normalizedData.experience || []).reduce((acc, j) => acc + (j.bullets ? j.bullets.length : 0), 0);
  }, [normalizedData.experience]);

  // Detect which sections are present
  const sections = useMemo(() => {
    return [
      { id: 'summary', tag: '[PROFESSIONAL SUMMARY]', label: 'Summary', found: !!normalizedData.summary, count: normalizedData.summary ? '1' : '0' },
      { id: 'skills', tag: '[TECHNICAL SKILLS]', label: 'Skills', found: normalizedData.skills.length > 0, count: `${normalizedData.skills.length}` },
      { id: 'experience', tag: '[PROFESSIONAL EXPERIENCE]', label: 'Experience', found: normalizedData.experience.length > 0, count: `${normalizedData.experience.length}` },
      { id: 'projects', tag: '[TECHNICAL PROJECTS]', label: 'Projects', found: normalizedData.projects.length > 0, count: `${normalizedData.projects.length}` },
      { id: 'education', tag: '[EDUCATION]', label: 'Education', found: normalizedData.education.length > 0, count: `${normalizedData.education.length}` },
      { id: 'certs', tag: '[CERTIFICATIONS]', label: 'Certs', found: normalizedData.certs.length > 0, count: `${normalizedData.certs.length}` }
    ];
  }, [normalizedData]);

  const activeSectionsCount = useMemo(() => {
    return sections.filter(s => s.found).length;
  }, [sections]);

  // Multi-page content decision logic matching CVCraft
  const hasPage2 = useMemo(() => {
    const jobs = normalizedData.experience || [];
    return (jobs.length >= 2 && (totalBullets > 8 || normalizedData.skills?.length > 3)) ||
           (normalizedData.projects?.length > 0) ||
           (normalizedData.education?.length > 0) ||
           (normalizedData.certs?.length > 0);
  }, [normalizedData, totalBullets]);

  // Split jobs between Page 1 and Page 2
  const { page1Jobs, page2Jobs } = useMemo(() => {
    const jobs = normalizedData.experience || [];
    if (!hasPage2) {
      return { page1Jobs: jobs, page2Jobs: [] };
    }
    const p1Cut = (jobs.length >= 3 && totalBullets <= 16) ? 2 : 1;
    return {
      page1Jobs: jobs.slice(0, p1Cut),
      page2Jobs: jobs.slice(p1Cut)
    };
  }, [normalizedData.experience, hasPage2, totalBullets]);

  // Helper to render job HTML
  const renderJobItemHtml = (job: ExperienceJob) => {
    const cleanComp = (job.company || '').trim();
    const cleanLoc = (job.location || '').trim();
    const compLoc = cleanLoc && !cleanComp.includes(cleanLoc) ? `${cleanComp} — ${cleanLoc}` : cleanComp;

    return `
      <div class="modern-job-item">
        <div class="modern-exp-header">
          <span class="modern-exp-comp">${escHtml(compLoc)}</span>
          <span class="modern-exp-dates">${escHtml(job.dates || '')}</span>
        </div>
        ${job.role ? `<div class="modern-exp-role">${escHtml(job.role)}</div>` : ''}
        ${(job.bullets || []).map(b => `<div class="modern-bullet">${escHtml(b)}</div>`).join('')}
      </div>
    `;
  };

  // Page 1 HTML
  const page1Html = useMemo(() => {
    const d = normalizedData;
    let html = '';

    // Header
    html += `<div class="modern-header">`;
    html += `  <div class="modern-name">${escHtml(d.name)}</div>`;
    if (d.subtitle) {
      html += `  <div class="modern-subtitle">${escHtml(d.subtitle.replace(/\s*\/\s*/g, ' & '))}</div>`;
    }
    
    const contactParts: string[] = [];
    if (d.location) contactParts.push(escHtml(d.location));
    if (d.phone) contactParts.push(escHtml(d.phone));
    if (d.email) {
      contactParts.push(`<a href="mailto:${escHtml(d.email)}">${escHtml(d.email)}</a>`);
    }
    if (d.linkedin) {
      const rawUrl = d.linkedin.trim();
      const hrefUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      const display = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
      contactParts.push(`<a href="${escHtml(hrefUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(display)}</a>`);
    }
    
    html += `  <div class="modern-contact">${contactParts.join(' &nbsp;|&nbsp; ')}</div>`;
    html += `</div>`;

    // Professional Summary
    if (d.summary) {
      html += `<div class="modern-section-head">PROFESSIONAL SUMMARY</div>`;
      html += `<div class="modern-text">${escHtml(d.summary)}</div>`;
    }

    // Technical Skills
    if (d.skills && d.skills.length > 0) {
      html += `<div class="modern-section-head">TECHNICAL SKILLS</div>`;
      html += `<div class="modern-skills-list">`;
      d.skills.forEach(s => {
        html += `<div class="modern-skill-line"><strong>${escHtml(s.category)}:</strong> ${escHtml(s.list)}</div>`;
      });
      html += `</div>`;
    }

    // Professional Experience Part 1
    if (page1Jobs.length > 0) {
      html += `<div class="modern-section-head">PROFESSIONAL EXPERIENCE</div>`;
      page1Jobs.forEach(j => {
        html += renderJobItemHtml(j);
      });
    }

    // If single page, append projects, education, certs directly here
    if (!hasPage2) {
      if (d.projects && d.projects.length > 0) {
        html += `<div class="modern-section-head">TECHNICAL PROJECTS</div>`;
        d.projects.forEach(p => {
          const pTitle = p.name || p.title || 'Technical Project';
          const pTech = p.tech || p.tech_stack || '';
          const pLink = (p.link || p.url || '').trim();
          const hrefLink = pLink.startsWith('http') ? pLink : `https://${pLink}`;

          html += `
            <div class="modern-proj-item modern-job-item">
              <div class="modern-proj-header modern-exp-header">
                <span class="modern-proj-title modern-exp-comp">${escHtml(pTitle)}</span>
                <span class="modern-proj-dates modern-exp-dates">${escHtml(pTech)}</span>
              </div>
              ${pLink ? `<div class="modern-proj-links modern-exp-role"><a href="${escHtml(hrefLink)}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;text-decoration:underline;">${escHtml(pLink)}</a></div>` : ''}
              ${(p.bullets || []).map(b => `<div class="modern-bullet">${escHtml(b)}</div>`).join('')}
            </div>
          `;
        });
      }

      if (d.education && d.education.length > 0) {
        html += `<div class="modern-section-head">EDUCATION</div>`;
        d.education.forEach(edu => {
          const cleanSchool = (edu.school || '').trim();
          const cleanLoc = (edu.location || '').trim();
          const schoolLoc = cleanLoc && !cleanSchool.includes(cleanLoc) ? `${cleanSchool} — ${cleanLoc}` : cleanSchool;

          html += `
            <div class="modern-edu-item">
              <div class="modern-edu-header">
                <span class="modern-edu-degree">${escHtml(edu.degree)}</span>
                <span class="modern-edu-dates">${escHtml(edu.dates || '')}</span>
              </div>
              ${schoolLoc ? `<div class="modern-edu-school">${escHtml(schoolLoc)}</div>` : ''}
            </div>
          `;
        });
      }

      if (d.certs && d.certs.length > 0) {
        html += `<div class="modern-section-head">CERTIFICATIONS</div>`;
        d.certs.forEach(cert => {
          html += `<div class="modern-bullet">${escHtml(cert)}</div>`;
        });
      }
    }

    return html;
  }, [normalizedData, page1Jobs, hasPage2]);

  // Page 2 HTML
  const page2Html = useMemo(() => {
    if (!hasPage2) return '';
    const d = normalizedData;
    let html = '';

    // Experience Part 2 (flows cleanly without redundant continuation header)
    if (page2Jobs.length > 0) {
      page2Jobs.forEach(j => {
        html += renderJobItemHtml(j);
      });
    }

    // Technical Projects
    if (d.projects && d.projects.length > 0) {
      html += `<div class="modern-section-head">TECHNICAL PROJECTS</div>`;
      d.projects.forEach(p => {
        const pTitle = p.name || p.title || 'Technical Project';
        const pTech = p.tech || p.tech_stack || '';
        const pLink = (p.link || p.url || '').trim();
        const hrefLink = pLink.startsWith('http') ? pLink : `https://${pLink}`;

        html += `
          <div class="modern-proj-item modern-job-item">
            <div class="modern-proj-header modern-exp-header">
              <span class="modern-proj-title modern-exp-comp">${escHtml(pTitle)}</span>
              <span class="modern-proj-dates modern-exp-dates">${escHtml(pTech)}</span>
            </div>
            ${pLink ? `<div class="modern-proj-links modern-exp-role"><a href="${escHtml(hrefLink)}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;text-decoration:underline;">${escHtml(pLink)}</a></div>` : ''}
            ${(p.bullets || []).map(b => `<div class="modern-bullet">${escHtml(b)}</div>`).join('')}
          </div>
        `;
      });
    }

    // Education
    if (d.education && d.education.length > 0) {
      html += `<div class="modern-section-head">EDUCATION</div>`;
      d.education.forEach(edu => {
        const cleanSchool = (edu.school || '').trim();
        const cleanLoc = (edu.location || '').trim();
        const schoolLoc = cleanLoc && !cleanSchool.includes(cleanLoc) ? `${cleanSchool} — ${cleanLoc}` : cleanSchool;

        html += `
          <div class="modern-edu-item">
            <div class="modern-edu-header">
              <span class="modern-edu-degree">${escHtml(edu.degree)}</span>
              <span class="modern-edu-dates">${escHtml(edu.dates || '')}</span>
            </div>
            ${schoolLoc ? `<div class="modern-edu-school">${escHtml(schoolLoc)}</div>` : ''}
          </div>
        `;
      });
    }

    // Certifications
    if (d.certs && d.certs.length > 0) {
      html += `<div class="modern-section-head">CERTIFICATIONS</div>`;
      d.certs.forEach(cert => {
        html += `<div class="modern-bullet">${escHtml(cert)}</div>`;
      });
    }

    return html;
  }, [normalizedData, page2Jobs, hasPage2]);

  // Measure dynamic real heights to eliminate any overlap or unnatural gap
  useLayoutEffect(() => {
    if (activeTab !== 'preview') return;
    const updateHeights = () => {
      if (previewPage1Ref.current) {
        const h1 = Math.max(1056, previewPage1Ref.current.scrollHeight, previewPage1Ref.current.offsetHeight);
        setPage1Height(h1);
      }
      if (previewPage2Ref.current) {
        const h2 = Math.max(1056, previewPage2Ref.current.scrollHeight, previewPage2Ref.current.offsetHeight);
        setPage2Height(h2);
      }
    };

    updateHeights();
    const timer = setTimeout(updateHeights, 50);
    return () => clearTimeout(timer);
  }, [page1Html, page2Html, fontFamily, effectiveScale, activeTab]);

  // Safe file name
  const getFileName = () => {
    const name = normalizedData.name || activeProfile?.full_name || 'My_Resume';
    return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  };

  // Clipboard Paste Helper
  const pasteFromClipboard = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
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
      } catch {}
    }

    if (text?.trim()) {
      text = text.replace(/^(\d+\.)(?!\d)\s*/gm, '- ');
      setResumeText(text);
      setActiveTab('preview');
      toast.success('Resume pasted & parsed successfully!');
    } else {
      toast.error('Could not read clipboard. Copy your resume text first, then try again.');
      textareaRef.current?.focus();
    }
  };

  const handleCopyFullText = async () => {
    await navigator.clipboard.writeText(resumeText || SAMPLE_ATS_RESUME);
    setCopiedFullText(true);
    toast.success('Resume text copied to clipboard!');
    setTimeout(() => setCopiedFullText(false), 2000);
  };

  const loadSampleResume = () => {
    setResumeText(SAMPLE_ATS_RESUME);
    toast.success('Loaded CVCraft Modern ATS Sample Resume!');
  };

  const clearResumeText = () => {
    if (!resumeText) return;
    setResumeText('');
    toast.info('Resume editor cleared.');
  };

  // Format & Standardize Resume Text (Beautifier)
  const formatResumeText = () => {
    if (!resumeText || !resumeText.trim()) {
      toast.error('No resume content to format.');
      return;
    }

    let text = resumeText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Standardize bullet points to clean "- "
    text = text.replace(/^[ \t]*[•*][ \t]+/gm, '- ');
    text = text.replace(/^[ \t]*\d+\.[ \t]+/gm, '- ');

    // Standardize section headers
    const sectionMap: Record<string, string> = {
      'PROFESSIONAL SUMMARY': '[PROFESSIONAL SUMMARY]',
      'SUMMARY': '[PROFESSIONAL SUMMARY]',
      'TECHNICAL SKILLS': '[TECHNICAL SKILLS]',
      'SKILLS': '[TECHNICAL SKILLS]',
      'PROFESSIONAL EXPERIENCE': '[PROFESSIONAL EXPERIENCE]',
      'WORK EXPERIENCE': '[PROFESSIONAL EXPERIENCE]',
      'EXPERIENCE': '[PROFESSIONAL EXPERIENCE]',
      'TECHNICAL PROJECTS': '[TECHNICAL PROJECTS]',
      'PROJECTS': '[TECHNICAL PROJECTS]',
      'EDUCATION': '[EDUCATION]',
      'CERTIFICATIONS': '[CERTIFICATIONS]',
      'CERTIFICATES': '[CERTIFICATIONS]'
    };

    Object.keys(sectionMap).forEach(key => {
      const regex = new RegExp(`^[ \\t]*(?:\\[?)${key}(?:\\]?)[ \\t]*$`, 'gim');
      text = text.replace(regex, sectionMap[key]);
    });

    // Clean up trailing whitespace per line
    text = text.split('\n').map(l => l.trimEnd()).join('\n');

    // Collapse multiple empty lines
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    setResumeText(text);
    toast.success('Formatted & standardized bullets and headings!');
  };

  // Insert template or jump to section
  const insertSectionTemplate = (sectionId: string) => {
    const templates: Record<string, string> = {
      summary: `\n\n[PROFESSIONAL SUMMARY]\nResults-driven professional with expertise in systems architecture and automation. Proven track record of optimizing operations and scaling reliable workflows.`,
      skills: `\n\n[TECHNICAL SKILLS]\nCore Competencies: Architecture, Distributed Systems, Cloud Infrastructure\nTools & Frameworks: React, TypeScript, Node.js, Python, SQL\nDevOps & CI/CD: Docker, GitHub Actions, AWS, Terraform`,
      experience: `\n\n[PROFESSIONAL EXPERIENCE]\nCompany Name — City, ST | Job Title | 01/2022 – Present\n- Engineered high-throughput data processing pipeline reducing latency by 40%.\n- Standardized modular components accelerating sprint velocity across 4 cross-functional teams.`,
      projects: `\n\n[TECHNICAL PROJECTS]\nScalable Telemetry Platform | Python, TypeScript | https://github.com/user/telemetry\n- Architected distributed event stream handling 10,000+ real-time writes per second.`,
      education: `\n\n[EDUCATION]\nBachelor of Science in Computer Science | University Name | 05/2020 | City, ST`,
      certs: `\n\n[CERTIFICATIONS]\n- AWS Certified Solutions Architect — Amazon Web Services\n- Professional Scrum Master (PSM I) — Scrum.org`
    };

    const targetTemplate = templates[sectionId];
    if (!targetTemplate) return;

    if (!resumeText) {
      setResumeText(targetTemplate.trim());
    } else {
      setResumeText(`${(resumeText || '').trim()}${targetTemplate}`);
    }

    toast.success(`Added ${sectionId.toUpperCase()} template!`);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        textareaRef.current.focus();
      }
    }, 50);
  };

  // Quick insert snippets at cursor
  const insertTextAtCursor = (template: string) => {
    if (!textareaRef.current) {
      setResumeText(resumeText ? `${resumeText}\n${template}` : template);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart || el.value.length;
    const end = el.selectionEnd || el.value.length;
    const val = el.value;
    const nextVal = val.substring(0, start) + template + val.substring(end);
    setResumeText(nextVal);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + template.length;
    }, 10);
  };

  // Scroll sync between line numbers gutter and textarea
  const handleEditorScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const editorLines = useMemo(() => {
    return (resumeText || '').split('\n');
  }, [resumeText]);

  const downloadPdf = async () => {
    setGenerating(true);
    const toastId = toast.loading('Generating Vector ATS PDF...');
    try {
      await exportResumeToPdf(resumeText || SAMPLE_ATS_RESUME, fontFamily, baseProfileContext, getFileName());
      toast.dismiss(toastId);
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('PDF export failed', { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocx = async () => {
    setGenerating(true);
    const toastId = toast.loading('Generating OpenXML Word (.docx)...');
    try {
      await exportResumeToDocx(resumeText || SAMPLE_ATS_RESUME, fontFamily, baseProfileContext, getFileName());
      toast.dismiss(toastId);
      toast.success('Word document (.docx) downloaded successfully!');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('DOCX export failed', { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const getFontFamilyCss = () => {
    switch (fontFamily) {
      case 'sans': return "'Calibri', 'Segoe UI', Arial, sans-serif";
      case 'arial': return "Arial, Helvetica, sans-serif";
      case 'georgia': return "Georgia, serif";
      default: return "'Times New Roman', Times, serif";
    }
  };

  const wordCount = useMemo(() => {
    if (!resumeText) return 0;
    return resumeText.trim().split(/\s+/).filter(Boolean).length;
  }, [resumeText]);

  const readingTimeMin = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Trackpad / Ctrl+Scroll desktop zoom handler
  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      const current = currentDisplayPercent;
      const next = Math.min(150, Math.max(30, current + delta));
      setZoomPercent(next);
    }
  };

  const copyShortcutValue = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setTestedShortcut(key);
    toast.success(`Copied shortcut expansion for ${key}!`);
    setTimeout(() => setTestedShortcut(null), 2000);
  };

  return (
    <div className="space-y-3 pb-8" ref={containerRef}>
      {/* ── Studio Top Header (Clean 2-Row Layout, Zero Overlapping) ── */}
      <div className="bg-carbon/90 border border-graphite p-3 rounded-2xl backdrop-blur-md shadow-sm space-y-2">
        {/* Row 1: Title, Status Badge, and Fullscreen Expand */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide truncate">Resume Studio</h2>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {hasPage2 ? '2-Page ATS' : '1-Page ATS'}
            </span>
          </div>

          <button
            onClick={() => setIsFullscreen(true)}
            title="Expand to Fullscreen View"
            className="p-1.5 rounded-xl bg-void hover:bg-obsidian border border-graphite text-ash hover:text-white transition-all shadow-sm shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Row 2: Subtitle & Font Selector */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-graphite/40">
          <p className="text-[10px] text-ash tracking-normal truncate">Word & Workday ATS Standard</p>

          <div className="relative flex items-center bg-void/90 px-2 py-1 rounded-xl border border-graphite hover:border-accent/30 transition-all shrink-0">
            <Type className="w-3 h-3 text-accent shrink-0 mr-1.5" />
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as any)}
              aria-label="Typography font"
              className="bg-transparent text-[10px] font-semibold text-mist focus:outline-none cursor-pointer pr-1"
            >
              <option value="serif" className="bg-void text-mist">Times New Roman</option>
              <option value="sans" className="bg-void text-mist">Calibri</option>
              <option value="arial" className="bg-void text-mist">Arial</option>
              <option value="georgia" className="bg-void text-mist">Georgia</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Segmented Navigation (Clean & Compact) ── */}
      <div className="flex items-center p-1 bg-void/90 rounded-xl border border-graphite gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'preview'
              ? 'bg-carbon text-accent shadow-sm border border-graphite'
              : 'text-ash hover:text-mist hover:bg-carbon/40'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'editor'
              ? 'bg-carbon text-accent shadow-sm border border-graphite'
              : 'text-ash hover:text-mist hover:bg-carbon/40'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>

        <button
          onClick={() => setActiveTab('snippets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'snippets'
              ? 'bg-carbon text-accent shadow-sm border border-graphite'
              : 'text-ash hover:text-mist hover:bg-carbon/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Snippets</span>
          {Object.keys(dynamicShortcuts).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-accent/20 text-accent font-bold">
              {Object.keys(dynamicShortcuts).length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: DOCUMENT PREVIEW ── */}
      {activeTab === 'preview' && (
        <div className="space-y-2.5">
          {/* ── Studio Toolbar: Export Actions (Left) & Premium Zoom Stepper (Right) ── */}
          <div className="flex items-center justify-between gap-2 p-2 bg-carbon/80 border border-graphite rounded-xl shadow-sm flex-wrap">
            {/* Left: Quick Export Buttons */}
            <div className="flex items-center gap-1.5">
              <Button 
                variant="primary"
                size="sm"
                onClick={downloadDocx} 
                isLoading={generating} 
                icon={<Download className="w-3.5 h-3.5" />} 
                className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500 border-blue-400/40 text-white font-semibold shadow-md shadow-blue-900/30"
              >
                DOCX
              </Button>

              <Button 
                variant="secondary"
                size="sm"
                onClick={downloadPdf} 
                isLoading={generating}
                icon={<FileText className="w-3.5 h-3.5 text-coral-red" />} 
                className="text-xs py-1.5 px-2.5 bg-void border-graphite hover:border-coral-red/40 text-mist"
              >
                PDF
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyFullText}
                icon={copiedFullText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                className="text-xs py-1.5 px-2 bg-void border-graphite hover:border-accent/40 text-mist"
              >
                {copiedFullText ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Right: Premium Interactive Zoom Stepper Dock */}
            <div className="flex items-center gap-1 bg-void/90 p-1 rounded-xl border border-graphite shadow-sm">
              <button
                onClick={handleZoomOut}
                disabled={currentDisplayPercent <= 30}
                title="Zoom Out (-10%)"
                className="p-1 rounded-lg text-ash hover:text-white hover:bg-carbon disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span 
                className="px-1 text-[10px] font-mono font-bold text-mist min-w-[36px] text-center select-none"
                title={zoomPercent === 'auto' ? 'Auto-Fit to Width' : 'Custom Zoom'}
              >
                {currentDisplayPercent}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={currentDisplayPercent >= 150}
                title="Zoom In (+10%)"
                className="p-1 rounded-lg text-ash hover:text-white hover:bg-carbon disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-graphite mx-0.5" />

              <button
                onClick={handleFitWidth}
                title="Reset to Fit Width"
                className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 ${
                  zoomPercent === 'auto'
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-ash hover:text-white hover:bg-carbon'
                }`}
              >
                <Scan className="w-3 h-3" />
                <span>Fit</span>
              </button>
            </div>
          </div>

          {/* ── Realistic Document Canvas Stage (Trackpad & Wheel Zoom Supported) ── */}
          <div 
            onWheel={handleCanvasWheel}
            className="relative w-full bg-[#080c16] rounded-2xl border border-graphite p-3 overflow-hidden shadow-2xl flex flex-col items-center select-none"
          >
            {/* Ambient Lighting Accents */}
            <div className="absolute top-0 left-1/4 w-96 h-32 bg-accent/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />

            <div className="w-full flex flex-col items-center gap-4 py-2 overflow-x-auto custom-scrollbar">
              {/* PAGE 1 FRAME */}
              <div 
                className="page-frame relative flex flex-col items-center"
                style={{
                  width: `${816 * effectiveScale}px`,
                  height: `${(page1Height * effectiveScale) + 24}px`,
                  transition: 'width 0.15s ease, height 0.15s ease'
                }}
              >
                {/* Page Badge */}
                <div className="w-full flex justify-between items-center mb-1 px-1">
                  <span className="text-[10px] font-bold text-ash/90 uppercase tracking-widest">
                    {hasPage2 ? 'Page 1 of 2' : 'Page 1 of 1'}
                  </span>
                  <span className="text-[9px] text-fog font-mono">8.5 × 11 in · Letter</span>
                </div>

                <div 
                  style={{
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top center',
                    width: '816px',
                    minHeight: '1056px',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                  className="rounded-none bg-white text-left select-text"
                >
                  <div
                    ref={previewPage1Ref}
                    className="modern-resume-page"
                    style={{ fontFamily: getFontFamilyCss() }}
                    dangerouslySetInnerHTML={{ __html: page1Html }}
                  />
                </div>
              </div>

              {/* PAGE 2 FRAME (if multi-page content exists) */}
              {hasPage2 && (
                <div 
                  className="page-frame relative flex flex-col items-center mt-2"
                  style={{
                    width: `${816 * effectiveScale}px`,
                    height: `${(page2Height * effectiveScale) + 24}px`,
                    transition: 'width 0.15s ease, height 0.15s ease'
                  }}
                >
                  <div className="w-full flex justify-between items-center mb-1 px-1">
                    <span className="text-[10px] font-bold text-ash/90 uppercase tracking-widest">Page 2 of 2</span>
                    <span className="text-[9px] text-fog font-mono">8.5 × 11 in · Letter</span>
                  </div>

                  <div 
                    style={{
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: 'top center',
                      width: '816px',
                      minHeight: '1056px',
                      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)'
                    }}
                    className="rounded-none bg-white text-left select-text"
                  >
                    <div
                      ref={previewPage2Ref}
                      className="modern-resume-page"
                      style={{ fontFamily: getFontFamilyCss() }}
                      dangerouslySetInnerHTML={{ __html: page2Html }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: REDESIGNED STUDIO EDITOR ── */}
      {activeTab === 'editor' && (
        <div className="space-y-3">
          {/* 1. Studio Quick Actions Bar */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-carbon/90 border border-graphite rounded-2xl shadow-sm flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button 
                variant="primary" 
                size="sm"
                onClick={pasteFromClipboard} 
                icon={<ClipboardPaste className="w-3.5 h-3.5" />} 
                className="text-xs py-1.5 px-3 bg-accent text-obsidian font-bold shadow-md shadow-accent/20"
              >
                Paste Clipboard
              </Button>

              <button
                onClick={formatResumeText}
                title="Standardize bullets and section headings"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-mist hover:text-white bg-void hover:bg-obsidian border border-graphite hover:border-accent/40 transition-all shadow-sm"
              >
                <Wand2 className="w-3.5 h-3.5 text-accent" />
                <span>Format & Clean</span>
              </button>

              <button
                onClick={loadSampleResume}
                title="Reload CVCraft Modern ATS Template"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium text-ash hover:text-white bg-void hover:bg-obsidian border border-graphite transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sample</span>
              </button>
            </div>

            {/* Clear button */}
            {resumeText && (
              <button
                onClick={clearResumeText}
                title="Clear resume editor"
                className="p-1.5 rounded-xl text-ash hover:text-coral-red bg-void hover:bg-coral-red/10 border border-graphite hover:border-coral-red/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. ATS Health & Document Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-void/80 border border-graphite flex flex-col justify-between">
              <span className="text-[10px] text-ash font-medium uppercase tracking-wider">ATS Sections</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-sm font-bold font-mono ${activeSectionsCount === 6 ? 'text-emerald-400' : 'text-accent'}`}>
                  {activeSectionsCount}/6
                </span>
                <span className="text-[10px] text-fog">Detected</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-void/80 border border-graphite flex flex-col justify-between">
              <span className="text-[10px] text-ash font-medium uppercase tracking-wider">Length</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold font-mono text-white">{wordCount}</span>
                <span className="text-[10px] text-fog">Words</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-void/80 border border-graphite flex flex-col justify-between">
              <span className="text-[10px] text-ash font-medium uppercase tracking-wider">Experience</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold font-mono text-white">{normalizedData.experience.length}</span>
                <span className="text-[10px] text-fog">Roles · {totalBullets} pts</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-void/80 border border-graphite flex flex-col justify-between">
              <span className="text-[10px] text-ash font-medium uppercase tracking-wider">Read Time</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-accent shrink-0" />
                <span className="text-sm font-bold font-mono text-white">~{readingTimeMin} min</span>
              </div>
            </div>
          </div>

          {/* 3. Interactive Section Quick-Jump & Template Inserter Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Section Assistant</span>
              <span className="text-[9px] text-fog">Click to insert template</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => insertSectionTemplate(s.id)}
                  title={s.found ? `${s.label} is detected (${s.count}). Click to add another block.` : `Click to insert ${s.label} section`}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 ${
                    s.found
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-void text-ash border-graphite hover:text-white hover:border-accent/40 hover:bg-carbon'
                  }`}
                >
                  {s.found ? (
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <PlusCircle className="w-3 h-3 text-accent" />
                  )}
                  <span>{s.label}</span>
                  {s.found && <span className="text-[9px] opacity-70 font-mono">({s.count})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 4. IDE-Grade Editor Window with Synchronized Line Numbers */}
          <div className="space-y-1">
            {/* Mini Window Title Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-carbon/90 rounded-t-xl border-t border-x border-graphite text-[10px] font-mono text-ash select-none">
              <div className="flex items-center gap-1.5">
                <FileCode className="w-3 h-3 text-accent" />
                <span className="text-white font-semibold">resume.ats.txt</span>
                <span className="text-fog">· Plain Text OpenXML Parser</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
                <span className="text-fog">{editorLines.length} lines</span>
              </div>
            </div>

            {/* Editor Canvas with Gutter */}
            <div className="relative flex rounded-b-xl border border-graphite bg-[#070a13] overflow-hidden shadow-2xl focus-within:border-accent/60 transition-all">
              {/* Line Numbers Gutter */}
              <div 
                ref={gutterRef}
                className="py-3 pl-2.5 pr-2 select-none text-right font-mono text-[11px] text-fog/40 bg-[#060810] border-r border-graphite/40 shrink-0 overflow-hidden leading-[1.65]"
                style={{ minWidth: '38px' }}
              >
                {editorLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                onScroll={handleEditorScroll}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={`Paste your plain text resume here...

[PROFESSIONAL SUMMARY]
Controls & Automation Engineer with 7+ years of experience engineering automated systems...

[TECHNICAL SKILLS]
PLC & Automation: Allen-Bradley, Siemens S7-1500, Studio 5000
SCADA & HMI: Ignition, FactoryTalk View SE/ME
Languages: Python, Structured Text, SQL

[PROFESSIONAL EXPERIENCE]
Tesla Motors — Austin, TX | Senior Controls Engineer | 03/2022 – Present
- Architected PLC logic for battery pack assembly lines utilizing Studio 5000.
- Integrated 18 Fanuc 6-axis robotic cells over EtherNet/IP.

[TECHNICAL PROJECTS]
Automated SCADA Fleet Telemetry | Python, Ignition | github.com/user/telemetry
- Developed telemetry dashboard tracking 120+ active metrics.`}
                className="flex-1 w-full h-96 bg-transparent p-3 text-xs font-mono text-mist placeholder:text-fog/30 focus:outline-none resize-y leading-[1.65] custom-scrollbar selection:bg-accent/30 selection:text-white"
              />
            </div>
          </div>

          {/* 5. Quick Insert Formatting Palette */}
          <div className="flex items-center justify-between gap-1.5 p-2 bg-carbon/50 border border-graphite rounded-xl flex-wrap">
            <span className="text-[10px] text-ash font-semibold px-1">Quick Add:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => insertTextAtCursor('\nCompany — Location | Job Role | 01/2023 – Present\n- Key accomplishment with metric.\n- Scaled architecture and reduced latency.')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-void hover:bg-obsidian border border-graphite hover:border-accent/40 text-mist hover:text-white transition-all"
              >
                + Job Role
              </button>

              <button
                onClick={() => insertTextAtCursor('\nSkills Category: Skill 1, Skill 2, Skill 3, Skill 4')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-void hover:bg-obsidian border border-graphite hover:border-accent/40 text-mist hover:text-white transition-all"
              >
                + Skill Line
              </button>

              <button
                onClick={() => insertTextAtCursor('\nProject Name | Tech Stack | https://github.com/link\n- Core deliverable and impact.')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-void hover:bg-obsidian border border-graphite hover:border-accent/40 text-mist hover:text-white transition-all"
              >
                + Project
              </button>

              <button
                onClick={() => insertTextAtCursor('\n- ')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-void hover:bg-obsidian border border-graphite hover:border-accent/40 text-mist hover:text-white transition-all font-mono"
              >
                + Bullet (•)
              </button>
            </div>
          </div>

          {/* 6. Live Shortcuts Integration Panel */}
          {Object.keys(dynamicShortcuts).length > 0 && (
            <div className="bg-carbon/70 border border-graphite rounded-2xl p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide">Live Experience Shortcuts</span>
                </div>
                <span className="text-[10px] text-ash font-mono">{Object.keys(dynamicShortcuts).length} active</span>
              </div>
              <p className="text-[10px] text-ash">Type any shortcut (e.g. <code className="text-accent font-bold">exp1</code>) into any application or job portal form field to auto-expand bullets.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {Object.entries(dynamicShortcuts).map(([k, val]) => (
                  <button
                    key={k}
                    onClick={() => copyShortcutValue(k, val)}
                    title={`Click to copy expansion for ${k}`}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all ${
                      testedShortcut === k
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-graphite bg-void hover:bg-obsidian hover:border-accent/40 text-mist'
                    }`}
                  >
                    <span className="font-mono font-bold text-accent">{k}</span>
                    <span className="text-[9px] text-ash">
                      {testedShortcut === k ? '✓ Copied' : `${val.split('\n').length} bullets`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PORTAL SNIPPETS & COMPANY COPY ── */}
      {activeTab === 'snippets' && (
        <div className="space-y-3">
          <CompanyCopySection experience={normalizedData.experience} />
        </div>
      )}

      {/* ── FULLSCREEN EXPANSION MODAL ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-graphite shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{normalizedData.name || 'Resume'} — Full Preview</h3>
                <p className="text-[10px] text-ash">100% US Letter Standard · {hasPage2 ? '2 Pages' : '1 Page'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadPdf}
                icon={<FileText className="w-3.5 h-3.5 text-coral-red" />}
                className="text-xs py-1.5 bg-carbon border-graphite"
              >
                PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={downloadDocx}
                icon={<Download className="w-3.5 h-3.5" />}
                className="text-xs py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                DOCX
              </Button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 rounded-xl bg-carbon hover:bg-obsidian border border-graphite text-ash hover:text-white transition-all ml-2"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Stage */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center gap-8 py-4 bg-[#090d16] rounded-2xl border border-graphite p-6">
            {/* Modal Page 1 */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-ash/80 mb-2 uppercase tracking-widest">
                {hasPage2 ? 'Page 1 of 2' : 'Page 1 of 1'}
              </span>
              <div 
                className="modern-resume-page bg-white shadow-2xl" 
                style={{ fontFamily: getFontFamilyCss() }}
                dangerouslySetInnerHTML={{ __html: page1Html }}
              />
            </div>

            {/* Modal Page 2 */}
            {hasPage2 && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-ash/80 mb-2 uppercase tracking-widest">Page 2 of 2</span>
                <div 
                  className="modern-resume-page bg-white shadow-2xl" 
                  style={{ fontFamily: getFontFamilyCss() }}
                  dangerouslySetInnerHTML={{ __html: page2Html }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Exact CVCraft Modern CSS Styles (100% Word & Print Match) ── */}
      <style>{`
        .modern-resume-page {
          width: 816px;
          min-height: 1056px;
          background: #ffffff;
          padding: 48px; /* 0.5 inch margins */
          box-sizing: border-box;
          line-height: 1.15;
          color: #000000;
          text-align: left;
        }
        .modern-header {
          text-align: center;
          margin-bottom: 6pt;
        }
        .modern-name {
          font-size: 15pt;
          font-weight: bold;
          color: #000000;
          margin-bottom: 2pt;
          line-height: 1.1;
          letter-spacing: 0.2px;
          text-transform: capitalize;
        }
        .modern-subtitle {
          font-size: 10.5pt;
          font-weight: bold;
          color: #000000;
          margin-bottom: 3pt;
          line-height: 1.15;
        }
        .modern-contact {
          font-size: 10pt;
          color: #000000;
          line-height: 1.2;
        }
        .modern-contact a {
          color: #0000ee;
          text-decoration: none;
        }
        .modern-contact a:hover {
          text-decoration: underline;
        }
        .modern-section-head {
          font-size: 10.5pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #000000;
          margin: 9pt 0 4pt 0;
          text-align: left;
          border-bottom: 0.75pt solid #000000;
          padding-bottom: 3pt;
          letter-spacing: 0.2px;
        }
        .modern-text {
          font-size: 10pt;
          color: #000000;
          margin-bottom: 3pt;
          line-height: 1.15;
          text-align: justify;
        }
        .modern-skill-line {
          font-size: 10pt;
          color: #000000;
          margin-bottom: 2pt;
          line-height: 1.15;
          text-align: left;
        }
        .modern-skill-line strong {
          font-weight: bold;
          color: #000000;
        }
        .modern-exp-header, .modern-proj-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-weight: bold;
          font-size: 10pt;
          color: #000000;
          margin-top: 5pt;
          margin-bottom: 1pt;
        }
        .modern-exp-role, .modern-proj-links {
          font-size: 10pt;
          font-style: italic;
          color: #000000;
          margin-bottom: 2pt;
        }
        .modern-job-item, .modern-proj-item {
          margin-bottom: 6pt;
        }
        .modern-bullet {
          font-size: 10pt;
          color: #000000;
          padding-left: 12pt;
          margin-top: 1.5pt;
          margin-bottom: 1.5pt;
          line-height: 1.15;
          text-align: left;
          position: relative;
        }
        .modern-bullet::before {
          content: "•";
          position: absolute;
          left: 1pt;
          font-weight: bold;
        }
        .modern-edu-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-weight: bold;
          font-size: 10pt;
          color: #000000;
          margin-top: 5pt;
          margin-bottom: 1pt;
        }
        .modern-edu-school {
          font-size: 10pt;
          font-style: italic;
          color: #000000;
          margin-bottom: 2pt;
        }
      `}</style>
    </div>
  );
};

// ── Company Copy Sub-Component ──
const CompanyCopySection = ({ experience }: { experience: NormalizedResumeData['experience'] }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!experience || experience.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-graphite rounded-xl bg-carbon/20">
        <p className="text-xs text-ash">No experience parsed yet. Paste your resume in the Editor tab to unlock 1-click company snippets.</p>
      </div>
    );
  }

  const copyCompany = async (idx: number) => {
    const job = experience[idx];
    const text = (job.bullets || []).map(b => `- ${b}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(`Copied bullets for ${job.company || 'Role'}!`);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="border border-graphite rounded-2xl p-4 bg-carbon/70 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white tracking-wide">📂 Application Portal Snippets</p>
          <p className="text-[10px] text-ash">Copy entire experience bullet blocks for job application forms with 1 click</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent/10 text-accent font-semibold">
          {experience.length} Companies
        </span>
      </div>

      <div className="space-y-2">
        {experience.map((c, i) => (
          <button
            key={i}
            onClick={() => copyCompany(i)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
              copiedIdx === i
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-graphite bg-void text-mist hover:text-white hover:border-accent/40 hover:bg-obsidian'
            }`}
          >
            <div className="min-w-0 pr-2">
              <span className="truncate block font-bold text-white">{c.company || `Company #${i + 1}`}</span>
              <span className="text-[10px] text-ash truncate block">{c.role || 'Position'} {c.dates ? `· ${c.dates}` : ''}</span>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {copiedIdx === i ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Copied
                </span>
              ) : (
                <span className="text-[10px] font-normal text-ash group-hover:text-mist flex items-center gap-1">
                  <Copy className="w-3 h-3" /> {c.bullets?.length || 0} bullets
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
