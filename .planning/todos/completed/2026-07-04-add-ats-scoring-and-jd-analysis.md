---
created: 2026-07-04T04:00:00.000Z
title: Add ATS Scoring and JD Analysis
area: ui
files:
  - src/components/ResumeBuilder.tsx:850
---

## Problem

The current resume builder in ClipStaff does not have the ability to calculate an ATS compatibility score or highlight matching/missing keywords against a target job description. This is a primary differentiator in the reference `resume_builder_app` project.

## Solution

1. Integrate a Job Description textarea with a collapsible accordion layout in the sidebar editor.
2. Setup a supabase edge function or local proxy endpoint to call Gemini/OpenRouter with the target JD and resume content using the reference project's system prompts.
3. Render the scoring badges (Overall, ATS, Recruiter, Technical), keyword tags checklist, and gap explanations note below the editor.
