---
status: complete
---

# Summary: Remove Certification Bullets

## Results
- **Certifications**: Completely removed bullets and dashes from the Certifications section.
- **Formatting**:
    - **DOCX**: Removed `- ` prefix and the hanging indentation. Certifications now appear as clean, aligned text.
    - **HTML/PDF**: Replaced the `.rb-bullet` class with `.rb-text` and removed the left margin. This eliminates the dash symbol and the extra space.
- **Consistency**: The experience section still maintains its simple dash bullets for structure, while certifications are now plain text as requested.

## Verification
- Verified that `ResumeBuilder.tsx` no longer adds symbols to certification strings.
- Verified that the `Paragraph` object in `docx` generation no longer has an indent or prefix for certifications.
