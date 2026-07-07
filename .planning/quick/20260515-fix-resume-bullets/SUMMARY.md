---
status: complete
---

# Summary: Fix Resume Bullets & LinkedIn Link

## Results
- **Workday Compatibility**: Replaced DOCX numbering styles with literal bullets (`• `) and indentation. This prevents Workday's parser from auto-numbering bullets as "1. bullet".
- **Simplified Certifications**: Updated certification bullets to match the new simple style.
- **LinkedIn Link**: Updated the header to display the actual LinkedIn handle (e.g., `venkata-vamsi`) instead of a hardcoded "linkedin" string.
- **Location Formatting**: Added auto-cleanup to remove extra spaces before commas and ensure "United States" is properly capitalized.

## Verification
- Code changes verified in `ResumeBuilder.tsx`.
- The logic for `docx` generation now uses text-based bullets which are much more robust for third-party parsers like Workday.
