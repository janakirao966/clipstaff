---
created: 2026-07-04T04:00:00.000Z
title: Add AI Prompt Refinement Assistant
area: ui
files:
  - src/components/ResumeBuilder.tsx:850
---

## Problem

The current resume builder in ClipStaff lacks the AI Assistant dropdown and prompt generator of the reference project. Users cannot easily copy role-specific prompt templates structured with their active profile details (name, email, phone, location, education, certifications, and experience) to iterate on their resumes using external models like ChatGPT or Gemini.

## Solution

1. Port the prompt templates (e.g. Software Engineer, Python Developer, DevOps, etc.) from `resume_prompts/` in the reference project.
2. Add an "AI Prompt Refinement" section in the sidebar editor with a template dropdown selector.
3. Build a preview container that formats the template by embedding the candidate's active profile and current experience.
4. Add a "Copy AI Prompt" button to quickly copy the generated prompt to the clipboard.
