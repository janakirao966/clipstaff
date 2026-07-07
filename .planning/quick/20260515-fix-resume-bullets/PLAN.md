---
status: incomplete
---

# Plan: Fix Resume Bullets for Workday & LinkedIn Link

## Context
The user reports that bullets are being parsed as "1. bullet" (numbered) in Workday. Additionally, certification bullets are too large/complex, and the LinkedIn link is hardcoded to "linkedin".

## Tasks
- [ ] Simplify DOCX bullets: Use literal "• " text instead of DOCX numbering XML feature to prevent Workday from auto-numbering.
- [ ] Simplify Certification bullets: Match the new simple style.
- [ ] Fix LinkedIn Header: Display the actual profile handle/URL instead of "linkedin".
- [ ] Cleanup Location: Ensure "Connecticut, United States" formatting (remove extra space, capitalize States).

## Verification
- [ ] Verify `ResumeBuilder.tsx` changes.
- [ ] Verify `docx` generation logic.
