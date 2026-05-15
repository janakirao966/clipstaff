---
title: UI Overhaul v2 & Bug Audit
slug: ui-v2-bug-audit
status: in-progress
date: 2026-05-15
---

# Plan: UI Overhaul v2 & Bug Audit

## Objective
The user found the previous redesign "poor." This task aims to move beyond generic aesthetics into a truly "Elite" and "High-End" interface while simultaneously fixing core functionality bugs reported by the user.

## Proposed Changes
### 1. "Aether Dark" Design System (UI v2)
- **Concept:** Switch from "Midnight Chrome" (generic glass) to **"Aether Dark"** (Solid architectural blacks, ultra-thin borders, and high-tracking typography).
- **Typography:** Force **Outfit** for all numbers and headers; **Inter** for dense data.
- **Micro-animations:** Add CSS-only spring animations for expansion and button clicks.
- **Consistency:** Unify every screen with a single cohesive "Carbon Fiber & Obsidian" look.

### 2. Expansion Engine Fix (Functional)
- **Issue:** User reports expansion "not working."
- **Audit:** 
    - Check `content.ts` for event listener conflicts.
    - Verify `execCommand` success rates.
    - Implement a more robust "Text Node Injection" fallback if `execCommand` fails.
    - Ensure cache sync happens instantly on login.

### 3. Latency Audit
- Review `Zustand` store for unnecessary re-renders.
- Optimize Supabase query patterns to minimize wait times.

## Verification
- **UAT:** Test expansion on 3 different sites (LinkedIn, Indeed, generic form).
- **Visual Audit:** 6-pillar visual audit against `UI/UX Pro Max` skill.
- **Build:** `npm run build` must pass.
