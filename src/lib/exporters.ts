import { parseContent } from './resumeParser';

// Dynamic helper for file downloads
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
      // Fallback using dynamic file-saver import
      import('file-saver')
        .then((module) => {
          const saveAs = module.saveAs || module.default;
          saveAs(blob, filename);
          resolve(true);
        })
        .catch(reject);
    }
  });
}

export async function exportResumeToPdf(
  resumeText: string,
  fontFamily: string,
  P: any,
  filenamePrefix: string
): Promise<void> {
  // Dynamic import of jspdf
  const { default: jsPDF } = await import('jspdf');

  const { summary, skills, experience } = parseContent(resumeText);
  const fontName = fontFamily === 'serif' ? 'times' : 'helvetica';

  // Letter: 8.5x11in = 612x792pt. Use 32pt padding (0.5in inner margin)
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  const pageW = 612;
  const pageH = 792;
  const margin = 32;
  const contentW = pageW - margin * 2;
  let y = margin;
  const lineH = 11 * 1.15;

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

  // Name
  y += 4;
  drawText(P.name, margin, 14, 'bold', contentW, 'center');
  y += 4;

  // Subtitle
  if (P.subtitle) {
    drawText(P.subtitle, margin, 11, 'bold', contentW, 'center');
    y += 6;
  }

  // Contact
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

  // Section Header
  const sectionHeader = (title: string) => {
    y += 10;
    checkPage(24);
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title.toUpperCase(), margin, y);
    y += 3;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y);
    y += lineH;
  };

  // Summary
  if (summary) {
    sectionHeader('Professional Summary');
    drawText(summary, margin, 11, 'normal', contentW);
  }

  // Skills
  if (skills) {
    sectionHeader('Technical Skills');
    skills.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
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
      y += 2;
    });
  }

  // Experience
  if (experience) {
    sectionHeader('Professional Experience');
    experience.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      const t = line.trim();
      if (/^[-\u2022*]/.test(t)) {
        const bulletText = t.replace(/^[-\u2022*]\s*/, '');
        y += 2;
        checkPage(lineH);
        pdf.setFont(fontName, 'normal');
        pdf.setFontSize(11);
        pdf.text('\u2022', margin, y);
        const bulletLines = pdf.splitTextToSize(bulletText, contentW - 8);
        bulletLines.forEach((bl: string, i: number) => {
          if (i > 0) {
            y += lineH;
            checkPage(lineH);
          }
          pdf.text(bl, margin + 8, y);
        });
        y += lineH;
        y += 2;
      } else if (t.includes('|')) {
        const parts = t.split('|').map((p) => p.trim());
        if (parts.length >= 4) {
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

  // Education
  if (P.education.length > 0) {
    sectionHeader('Education');
    P.education.forEach((e: any) => {
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

  // Certifications
  const activeCerts = P.certifications.map((c: string) => c.trim()).filter(Boolean);
  if (activeCerts.length > 0) {
    sectionHeader('Certifications');
    activeCerts.forEach((c: string) => {
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

  const fileName = filenamePrefix + '_Resume.pdf';
  const pdfBlob = pdf.output('blob');
  await chromeDownload(pdfBlob, fileName);
}

export async function exportResumeToDocx(
  resumeText: string,
  fontFamily: string,
  P: any,
  filenamePrefix: string
): Promise<void> {
  // Dynamic import of docx
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ExternalHyperlink,
    AlignmentType,
    BorderStyle,
    TabStopType,
    LevelFormat,
  } = docx;

  const { summary, skills, experience } = parseContent(resumeText);
  const selectedFont = fontFamily === 'serif' ? 'Times New Roman' : 'Arial';

  function sectionHead(text: string) {
    return new Paragraph({
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 } },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 22,
          font: selectedFont,
          color: '000000',
        }),
      ],
    });
  }

  function bullet(text: string) {
    return new Paragraph({
      spacing: { before: 30, after: 30 },
      indent: { left: 240, hanging: 240 },
      tabStops: [{ type: TabStopType.LEFT, position: 240 }],
      children: [
        new TextRun({ text: '•\t', font: selectedFont, size: 22, color: '000000' }),
        new TextRun({ text, font: selectedFont, size: 22, color: '000000' }),
      ],
    });
  }

  function skillsDocx(rawSkills: string) {
    if (!rawSkills) return [];
    return rawSkills
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const cleanLine = line.trim().replace(/^[-•*–—\u2013\u2014\u2022]\s*/, '');
        const idx = cleanLine.indexOf(':');
        if (idx > -1) {
          return new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({
                text: cleanLine.substring(0, idx + 1),
                bold: true,
                font: selectedFont,
                size: 22,
                color: '000000',
              }),
              new TextRun({
                text: cleanLine.substring(idx + 1),
                font: selectedFont,
                size: 22,
                color: '000000',
              }),
            ],
          });
        }
        return new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [new TextRun({ text: cleanLine, font: selectedFont, size: 22, color: '000000' })],
        });
      });
  }

  function expDocx(rawExp: string) {
    if (!rawExp) return [];
    return rawExp
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const t = line.trim();
        if (/^[-•*–—\u2013\u2014\u2022]/.test(t)) {
          return bullet(t.replace(/^[-•*–—\u2013\u2014\u2022]\s*/, ''));
        }
        if (t.includes('|')) {
          const parts = t.split('|').map((p) => p.trim());
          const rows = [];
          if (parts.length >= 4) {
            rows.push(
              new Paragraph({
                spacing: { before: 180, after: 40 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({
                    text: parts[0],
                    bold: true,
                    font: selectedFont,
                    size: 22,
                    color: '000000',
                  }),
                  new TextRun({ text: '\t' }),
                  new TextRun({
                    text: parts[3],
                    bold: true,
                    font: selectedFont,
                    size: 22,
                    color: '000000',
                  }),
                ],
              })
            );
            rows.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({ text: parts[2], font: selectedFont, size: 22, color: '000000' }),
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: parts[1], font: selectedFont, size: 22, color: '000000' }),
                ],
              })
            );
          } else if (parts.length === 3) {
            rows.push(
              new Paragraph({
                spacing: { before: 180, after: 40 },
                tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
                children: [
                  new TextRun({
                    text: parts[0],
                    bold: true,
                    font: selectedFont,
                    size: 22,
                    color: '000000',
                  }),
                  new TextRun({ text: '\t' }),
                  new TextRun({
                    text: parts[2],
                    bold: true,
                    font: selectedFont,
                    size: 22,
                    color: '000000',
                  }),
                ],
              })
            );
            rows.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [new TextRun({ text: parts[1], font: selectedFont, size: 22, color: '000000' })],
              })
            );
          }
          return rows;
        }
        return new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: t, font: selectedFont, size: 22, color: '000000' })],
        });
      })
      .flat();
  }

  const summaryParagraphs = [];
  if (summary) {
    summaryParagraphs.push(sectionHead('Professional Summary'));
    summaryParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: summary, font: selectedFont, size: 22, color: '000000' })],
      })
    );
  }

  const eduParagraphs = [sectionHead('Education')];
  P.education.forEach((e: any) => {
    eduParagraphs.push(
      new Paragraph({
        spacing: { before: 180, after: 40 },
        tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
        children: [
          new TextRun({ text: e.degree, bold: true, font: selectedFont, size: 22, color: '000000' }),
          new TextRun({ text: '\t' }),
          new TextRun({ text: e.dates, bold: true, font: selectedFont, size: 22, color: '000000' }),
        ],
      })
    );
    eduParagraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: `${e.school}${e.location ? ', ' + e.location : ''}`,
            font: selectedFont,
            size: 22,
            color: '000000',
          }),
        ],
      })
    );
  });

  const certParagraphs = [];
  const activeCerts = P.certifications.map((c: string) => c.trim()).filter(Boolean);
  if (activeCerts.length) {
    certParagraphs.push(sectionHead('Certifications'));
    activeCerts.forEach((c: string) => {
      certParagraphs.push(bullet(c));
    });
  }

  const contactChildren: any[] = [];
  const textSeparator = () =>
    new TextRun({ text: '  |  ', font: selectedFont, size: 22, color: '000000' });

  const contactParts = [];
  if (P.location) contactParts.push(P.location);
  if (P.phone) contactParts.push(P.phone);
  if (contactParts.length > 0) {
    contactChildren.push(
      new TextRun({ text: contactParts.join('  |  '), font: selectedFont, size: 22, color: '000000' })
    );
  }

  if (P.email) {
    if (contactChildren.length > 0) contactChildren.push(textSeparator());
    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({ text: P.email, font: selectedFont, size: 22, color: '0000ff', underline: {} }),
        ],
        link: `mailto:${P.email}`,
      })
    );
  }

  if (P.linkedin) {
    if (contactChildren.length > 0) contactChildren.push(textSeparator());
    const rawLinkedin = P.linkedin.trim();
    const hrefLinkedin = rawLinkedin.startsWith('http') ? rawLinkedin : `https://${rawLinkedin}`;
    const displayLinkedin = rawLinkedin.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: displayLinkedin,
            font: selectedFont,
            size: 22,
            color: '0000ff',
            underline: {},
          }),
        ],
        link: hrefLinkedin,
      })
    );
  }

  const contactParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: contactChildren,
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: { default: { document: { run: { font: selectedFont, size: 22, color: '000000' } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80 },
            children: [
              new TextRun({
                text: P.name || '',
                bold: true,
                font: selectedFont,
                size: 28,
                color: '000000',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: P.subtitle || '',
                bold: true,
                font: selectedFont,
                size: 22,
                color: '000000',
              }),
            ],
          }),
          contactParagraph,
          ...summaryParagraphs,
          sectionHead('Technical Skills'),
          ...skillsDocx(skills),
          sectionHead('Professional Experience'),
          ...expDocx(experience),
          ...eduParagraphs,
          ...certParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = filenamePrefix + '_Resume.docx';
  await chromeDownload(blob, fileName);
}
