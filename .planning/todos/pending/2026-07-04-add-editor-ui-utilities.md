---
created: 2026-07-04T04:00:00.000Z
title: Add Editor UI Utilities
area: ui
files:
  - src/components/ResumeBuilder.tsx:795
---

## Problem

The current resume builder editor is basic. It lacks the following user experience utilities found in the reference project:
1. Live word counter.
2. Template insertion chips (e.g. `[SUMMARY]`, `[SKILLS]`, `[EXPERIENCE]`) to format the input.
3. Edit undo/redo stack sync.
4. Profile JSON backup export/import buttons.

## Solution

1. Add word count indicator below the resume text editor.
2. Add clickable badge chips that insert section tags at the cursor position.
3. Hook up undo/redo button triggers to keep a simple state history array of the text changes.
4. Implement profile backup file exports.
