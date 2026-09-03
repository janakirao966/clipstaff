/**
 * CVCraft & ClipStaff Modern ATS Resume Exporters
 * Exports lossless OpenXML Word (.docx) documents and vector-accurate PDF (.pdf) files.
 */

import { parseResumePlainText, NormalizedResumeData } from './resumeParser';

// Helper for triggering browser file downloads
function chromeDownload(blob: Blob, filename: string): Promise<any> {
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
      reader.readAsDataURL(blob);
    } else {
      import('file-saver')
        .then((module) => {
          const saveAs = module.saveAs || module.default;
          saveAs(blob, filename);
          resolve(true);
        })
        .catch(() => {
          // Direct DOM fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          resolve(true);
        });
    }
  });
}

function sanitizeBulletText(t: string): string {
  if (!t) return '';
  return String(t)
    .replace(/^[\s\u2022\u25cf\u25aa\u25b6\-\*▪·]+/, '')
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .trim();
}

function toTitleCase(s: string): string {
  if (!s) return '';
  return s.replace(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Builds OpenXML Word Document (.docx) matching CVCraft's exact ATS structure.
 */
export async function generateDocxBlob(
  data: NormalizedResumeData,
  fontFamily: string = 'serif'
): Promise<Blob> {
  const docxLib: any = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ExternalHyperlink,
    AlignmentType,
    HeadingLevel,
    BorderStyle,
    TabStopType
  } = docxLib;

  const selectedFont = fontFamily === 'sans' ? 'Calibri' : (fontFamily === 'arial' ? 'Arial' : 'Times New Roman');
  const docChildren: any[] = [];

  // Section Heading Builder using native HeadingLevel.HEADING_1 with bottom border
  const sectionHead = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 180, after: 50 },
      keepNext: true,
      keepLines: true,
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6, // 0.75 pt
          color: '000000',
          space: 2
        }
      },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 21, // 10.5 pt
          font: selectedFont,
          color: '000000'
        })
      ]
    });

  // 2-Column Pure Paragraph Helper using Right Tab Stop (position 10800)
  const createTwoColumnRow = (leftText: string, rightText: string, isBold: boolean = true) => {
    const tabType = TabStopType && TabStopType.RIGHT ? TabStopType.RIGHT : 'right';
    return new Paragraph({
      spacing: { before: 60, after: 20 },
      keepNext: true,
      keepLines: true,
      tabStops: [
        {
          type: tabType,
          position: 10800 // Exact right margin (12240 - 720 - 720)
        }
      ],
      children: [
        new TextRun({
          text: leftText,
          bold: isBold,
          font: selectedFont,
          size: 20, // 10 pt
          color: '000000'
        }),
        new TextRun({
          text: '\t' + (rightText || ''),
          bold: isBold,
          font: selectedFont,
          size: 20,
          color: '000000'
        })
      ]
    });
  };

  // Bullet Point Builder using clean Word hanging indent
  const bullet = (text: string) => {
    const cleanText = sanitizeBulletText(text);
    return new Paragraph({
      indent: { left: 360, hanging: 240 }, // Clean Word list hanging indent
      spacing: { before: 20, after: 25, line: 276 },
      keepLines: true,
      children: [
        new TextRun({ text: '•\t', font: selectedFont, size: 20, color: '000000' }),
        new TextRun({ text: cleanText, font: selectedFont, size: 20, color: '000000' })
      ]
    });
  };

  // 1. Header: Candidate Name
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      keepNext: true,
      keepLines: true,
      children: [
        new TextRun({
          text: toTitleCase(data.name || 'Alexander Morgan'),
          bold: true,
          font: selectedFont,
          size: 28, // 14 pt
          color: '000000'
        })
      ]
    })
  );

  // Candidate Subtitle
  if (data.subtitle) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 50 },
        keepNext: true,
        keepLines: true,
        children: [
          new TextRun({
            text: data.subtitle.replace(/\s*\/\s*/g, ' & '),
            bold: true,
            font: selectedFont,
            size: 21, // 10.5 pt
            color: '000000'
          })
        ]
      })
    );
  }

  // Contact Information Bar
  const contactChildren: any[] = [];
  const parts: string[] = [];
  if (data.location) parts.push(data.location);
  if (data.phone) parts.push(data.phone);

  if (parts.length > 0) {
    contactChildren.push(
      new TextRun({ text: parts.join(' | '), font: selectedFont, size: 19, color: '000000' })
    );
  }

  if (data.email) {
    if (contactChildren.length > 0) {
      contactChildren.push(new TextRun({ text: ' | ', font: selectedFont, size: 19, color: '000000' }));
    }
    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({ text: data.email, font: selectedFont, size: 19, color: '0000cc', underline: true })
        ],
        link: `mailto:${data.email}`
      })
    );
  }

  if (data.linkedin) {
    if (contactChildren.length > 0) {
      contactChildren.push(new TextRun({ text: ' | ', font: selectedFont, size: 19, color: '000000' }));
    }
    const cleanLink = data.linkedin.replace(/^https?:\/\//i, '');
    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({ text: cleanLink, font: selectedFont, size: 19, color: '0000cc', underline: true })
        ],
        link: `https://${cleanLink}`
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
      keepNext: true,
      keepLines: true,
      children: contactChildren
    })
  );

  // 2. Professional Summary
  if (data.summary) {
    docChildren.push(sectionHead('Professional Summary'));
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 30, after: 60, line: 276 },
        keepLines: true,
        children: [
          new TextRun({
            text: data.summary,
            font: selectedFont,
            size: 20, // 10 pt
            color: '000000'
          })
        ]
      })
    );
  }

  // 3. Technical Skills
  if (data.skills && data.skills.length > 0) {
    docChildren.push(sectionHead('Technical Skills'));
    data.skills.forEach((s, idx) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 20, after: 20, line: 276 },
          keepNext: idx === 0,
          keepLines: true,
          children: [
            new TextRun({
              text: `${s.category}: `,
              bold: true,
              font: selectedFont,
              size: 20,
              color: '000000'
            }),
            new TextRun({
              text: s.list,
              font: selectedFont,
              size: 20,
              color: '000000'
            })
          ]
        })
      );
    });
  }

  // 4. Professional Experience
  if (data.experience && data.experience.length > 0) {
    docChildren.push(sectionHead('Professional Experience'));

    data.experience.forEach((exp) => {
      const cleanComp = (exp.company || '').trim();
      const cleanLoc = (exp.location || '').trim();
      const compLoc = cleanLoc && !cleanComp.includes(cleanLoc) ? `${cleanComp} — ${cleanLoc}` : cleanComp;

      docChildren.push(createTwoColumnRow(compLoc, exp.dates || '', true));

      if (exp.role) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 0, after: 20 },
            keepNext: true,
            keepLines: true,
            children: [
              new TextRun({
                text: exp.role,
                italics: true,
                font: selectedFont,
                size: 20,
                color: '000000'
              })
            ]
          })
        );
      }

      (exp.bullets || []).forEach((b) => {
        if (b && b.trim()) {
          docChildren.push(bullet(b));
        }
      });
    });
  }

  // 5. Technical Projects
  if (data.projects && data.projects.length > 0) {
    docChildren.push(sectionHead('Technical Projects'));

    data.projects.forEach((proj) => {
      const pTitle = (proj.name || proj.title || 'Technical Project').trim();
      const pTechDates = (proj.tech || proj.tech_stack || '').trim();

      docChildren.push(createTwoColumnRow(pTitle, pTechDates, true));

      // Project links or subline
      const linkTxt = (proj.link || proj.url || '').trim();
      if (linkTxt) {
        const cleanLink = linkTxt.replace(/^https?:\/\//i, '');
        docChildren.push(
          new Paragraph({
            spacing: { before: 0, after: 20 },
            keepNext: true,
            keepLines: true,
            children: [
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: cleanLink,
                    font: selectedFont,
                    size: 19,
                    color: '0284c7',
                    underline: true
                  })
                ],
                link: linkTxt.startsWith('http') ? linkTxt : `https://${cleanLink}`
              })
            ]
          })
        );
      }

      (proj.bullets || []).forEach((b) => {
        if (b && b.trim()) {
          docChildren.push(bullet(b));
        }
      });
    });
  }

  // 6. Education
  if (data.education && data.education.length > 0) {
    docChildren.push(sectionHead('Education'));

    data.education.forEach((edu) => {
      docChildren.push(createTwoColumnRow(edu.degree, edu.dates || '', true));

      const cleanSchool = (edu.school || '').trim();
      const cleanLoc = (edu.location || '').trim();
      const schoolLoc = cleanLoc && !cleanSchool.includes(cleanLoc) ? `${cleanSchool} — ${cleanLoc}` : cleanSchool;

      if (schoolLoc) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 0, after: 30 },
            keepNext: true,
            keepLines: true,
            children: [
              new TextRun({
                text: schoolLoc,
                italics: true,
                font: selectedFont,
                size: 20,
                color: '000000'
              })
            ]
          })
        );
      }
    });
  }

  // 7. Certifications
  if (data.certs && data.certs.length > 0) {
    docChildren.push(sectionHead('Certifications'));
    data.certs.forEach((cert) => {
      if (cert && cert.trim()) {
        docChildren.push(bullet(cert));
      }
    });
  }

  // Document Container with US Letter dimensions (8.5 x 11 in) and 0.5 in margins (720 dxa)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240, // 8.5 inches in dxa
              height: 15840 // 11.0 inches in dxa
            },
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: docChildren
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Main export trigger for Word (.docx).
 */
export async function exportResumeToDocx(
  resumeText: string,
  fontFamily: string = 'serif',
  P: any = null,
  filenamePrefix: string = 'My_Resume'
): Promise<void> {
  const normalizedData = parseResumePlainText(resumeText, P);
  const blob = await generateDocxBlob(normalizedData, fontFamily);
  const fileName = (filenamePrefix || 'My_Resume').replace(/[^a-zA-Z0-9_-]/g, '_') + '.docx';
  await chromeDownload(blob, fileName);
}

/**
 * Modern Vector PDF Exporter matching exact layout and spacing.
 */
export async function exportResumeToPdf(
  resumeText: string,
  fontFamily: string = 'serif',
  P: any = null,
  filenamePrefix: string = 'My_Resume'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const data = parseResumePlainText(resumeText, P);
  const fontName = fontFamily === 'serif' ? 'times' : 'helvetica';

  // Letter: 8.5x11in = 612x792pt. Use 36pt padding (0.5in inner margin)
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  const pageW = 612;
  const pageH = 792;
  const margin = 36;
  const contentW = pageW - margin * 2;
  let y = margin;
  const lineH = 12;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const drawText = (
    text: string,
    x: number,
    fontSize: number,
    style: string,
    maxW: number,
    align?: string
  ) => {
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

  const sectionHeader = (title: string) => {
    y += 10;
    checkPage(30);
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title.toUpperCase(), margin, y);
    
    // Position underline comfortably below the text baseline with generous breathing room
    const lineY = y + 4.5;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.75);
    pdf.line(margin, lineY, pageW - margin, lineY);
    
    // Advance Y past the line to give clear separation before content
    y = lineY + 10;
  };

  // Set PDF Document Metadata
  pdf.setProperties({
    title: `${data.name || 'Candidate'} - Resume`,
    subject: `Professional ATS Resume - ${data.subtitle || 'Candidate'}`,
    author: data.name || 'Candidate',
    keywords: 'Resume, ATS, CVCraft, OpenXML, Professional, Career',
    creator: 'ClipStaff Resume Studio (CVCraft Engine)'
  });

  // 1. Candidate Name
  y += 4;
  drawText(toTitleCase(data.name || 'Alexander Morgan'), margin, 15, 'bold', contentW, 'center');
  y += 2;

  // Subtitle
  if (data.subtitle) {
    drawText(data.subtitle.replace(/\s*\/\s*/g, ' & '), margin, 10.5, 'bold', contentW, 'center');
    y += 4;
  }

  // Contact line with interactive hyperlinks
  const contactItems: { text: string; isLink?: boolean; url?: string }[] = [];
  if (data.location) contactItems.push({ text: data.location });
  if (data.phone) contactItems.push({ text: data.phone });
  if (data.email) {
    contactItems.push({ text: data.email, isLink: true, url: `mailto:${data.email}` });
  }
  if (data.linkedin) {
    const rawUrl = data.linkedin.trim();
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const display = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
    contactItems.push({ text: display, isLink: true, url: href });
  }

  if (contactItems.length > 0) {
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(9.5);
    const sep = '  |  ';
    const sepWidth = pdf.getTextWidth(sep);

    let totalWidth = 0;
    contactItems.forEach((item, idx) => {
      totalWidth += pdf.getTextWidth(item.text);
      if (idx < contactItems.length - 1) totalWidth += sepWidth;
    });

    let startX = margin + (contentW - totalWidth) / 2;
    contactItems.forEach((item, idx) => {
      const itemW = pdf.getTextWidth(item.text);
      if (item.isLink && item.url) {
        pdf.setTextColor(0, 0, 238);
        pdf.textWithLink(item.text, startX, y, { url: item.url });
        pdf.setTextColor(0, 0, 0);
      } else {
        pdf.setTextColor(0, 0, 0);
        pdf.text(item.text, startX, y);
      }
      startX += itemW;
      if (idx < contactItems.length - 1) {
        pdf.setTextColor(0, 0, 0);
        pdf.text(sep, startX, y);
        startX += sepWidth;
      }
    });
    y += 10;
  }

  // 2. Summary
  if (data.summary) {
    sectionHeader('Professional Summary');
    drawText(data.summary, margin, 10, 'normal', contentW);
  }

  // 3. Technical Skills
  if (data.skills && data.skills.length > 0) {
    sectionHeader('Technical Skills');
    data.skills.forEach((s) => {
      checkPage(lineH);
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(10);
      const label = `${s.category}: `;
      pdf.text(label, margin, y);
      const labelW = pdf.getTextWidth(label);
      pdf.setFont(fontName, 'normal');
      const restLines = pdf.splitTextToSize(s.list, contentW - labelW);
      pdf.text(restLines[0] || '', margin + labelW, y);
      y += lineH;
      for (let i = 1; i < restLines.length; i++) {
        checkPage(lineH);
        pdf.text(restLines[i], margin, y);
        y += lineH;
      }
    });
  }

  // 4. Professional Experience
  if (data.experience && data.experience.length > 0) {
    sectionHeader('Professional Experience');
    data.experience.forEach((exp) => {
      const cleanComp = (exp.company || '').trim();
      const cleanLoc = (exp.location || '').trim();
      const compLoc = cleanLoc && !cleanComp.includes(cleanLoc) ? `${cleanComp} — ${cleanLoc}` : cleanComp;

      y += 3;
      checkPage(lineH * 2);
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(10);
      pdf.text(compLoc, margin, y);
      pdf.text(exp.dates || '', pageW - margin, y, { align: 'right' });
      y += lineH;

      if (exp.role) {
        pdf.setFont(fontName, 'italic');
        pdf.text(exp.role, margin, y);
        y += lineH;
      }

      (exp.bullets || []).forEach((b) => {
        const cleanB = sanitizeBulletText(b);
        if (cleanB) {
          checkPage(lineH);
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(10);
          pdf.text('•', margin + 4, y);
          const bLines = pdf.splitTextToSize(cleanB, contentW - 16);
          pdf.text(bLines[0] || '', margin + 14, y);
          y += lineH;
          for (let i = 1; i < bLines.length; i++) {
            checkPage(lineH);
            pdf.text(bLines[i], margin + 14, y);
            y += lineH;
          }
        }
      });
    });
  }

  // 5. Technical Projects
  if (data.projects && data.projects.length > 0) {
    sectionHeader('Technical Projects');
    data.projects.forEach((proj) => {
      const pTitle = (proj.name || proj.title || 'Technical Project').trim();
      const pTech = (proj.tech || proj.tech_stack || '').trim();

      y += 3;
      checkPage(lineH * 2);
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(10);
      pdf.text(pTitle, margin, y);
      pdf.text(pTech, pageW - margin, y, { align: 'right' });
      y += lineH;

      if (proj.link) {
        pdf.setFont(fontName, 'italic');
        pdf.setTextColor(2, 132, 199);
        pdf.text(proj.link, margin, y);
        pdf.setTextColor(0, 0, 0);
        y += lineH;
      }

      (proj.bullets || []).forEach((b) => {
        const cleanB = sanitizeBulletText(b);
        if (cleanB) {
          checkPage(lineH);
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(10);
          pdf.text('•', margin + 4, y);
          const bLines = pdf.splitTextToSize(cleanB, contentW - 16);
          pdf.text(bLines[0] || '', margin + 14, y);
          y += lineH;
          for (let i = 1; i < bLines.length; i++) {
            checkPage(lineH);
            pdf.text(bLines[i], margin + 14, y);
            y += lineH;
          }
        }
      });
    });
  }

  // 6. Education
  if (data.education && data.education.length > 0) {
    sectionHeader('Education');
    data.education.forEach((edu) => {
      y += 3;
      checkPage(lineH * 2);
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(10);
      pdf.text(edu.degree, margin, y);
      pdf.text(edu.dates || '', pageW - margin, y, { align: 'right' });
      y += lineH;

      const cleanSchool = (edu.school || '').trim();
      const cleanLoc = (edu.location || '').trim();
      const schoolLoc = cleanLoc && !cleanSchool.includes(cleanLoc) ? `${cleanSchool} — ${cleanLoc}` : cleanSchool;

      if (schoolLoc) {
        pdf.setFont(fontName, 'italic');
        pdf.text(schoolLoc, margin, y);
        y += lineH;
      }
    });
  }

  // 7. Certifications
  if (data.certs && data.certs.length > 0) {
    sectionHeader('Certifications');
    data.certs.forEach((cert) => {
      const cleanC = sanitizeBulletText(cert);
      if (cleanC) {
        checkPage(lineH);
        pdf.setFont(fontName, 'normal');
        pdf.setFontSize(10);
        pdf.text('•', margin + 4, y);
        pdf.text(cleanC, margin + 14, y);
        y += lineH;
      }
    });
  }

  const fileName = (filenamePrefix || 'My_Resume').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
  const pdfBlob = pdf.output('blob');
  await chromeDownload(pdfBlob, fileName);
}
