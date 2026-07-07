---
status: incomplete
---

# Audit-Fix: Remove Bullets from Certifications

## Objective
Remove all bullet characters and styling from the Certifications section in all formats (DOCX, HTML Preview, PDF).

## Audit Results
- **DOCX**: `ResumeBuilder.tsx` adds `- ` to each certification.
- **HTML Preview**: `ResumeBuilder.tsx` uses `.rb-bullet` class which adds a `-` via CSS.
- **PDF Download**: `ResumeBuilder.tsx` uses `.rb-bullet` class in internal CSS.

## Fix Strategy
1.  **ResumeBuilder.tsx (DOCX)**: Remove `- ` prefix and indentation from certification paragraphs.
2.  **ResumeBuilder.tsx (HTML/PDF)**: Change class from `rb-bullet` to a new `rb-cert` class for certifications.
3.  **CSS (index.css & ResumeBuilder.tsx)**: Add `rb-cert` style without bullets.

## Verification
- [ ] Verify no bullets in Certifications section in Sidebar.
- [ ] Verify no bullets in Certifications section in DOCX.
- [ ] Verify no bullets in Certifications section in PDF.
