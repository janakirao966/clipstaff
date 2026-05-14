# ClipStaff

## What This Is

ClipStaff is a lightweight browser extension designed for recruiters, staffing professionals, and job applicants who repeatedly enter the same information across job portals and application forms. It provides reusable profile storage, shortcut-based text expansion, quick clipboard copy, and multi-profile management to speed up application workflows.

## Core Value

A fast, minimal, keyboard-first tool that eliminates repetitive typing across job application workflows through shortcuts and smart clipboard access without relying on complex full-form autofill.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] User authentication (Signup, login, logout, JWT/session)
- [ ] Profile management (CRUD profiles, switch active profile, specific fields)
- [ ] Snippet/Shortcut manager (CRUD shortcuts, categorize, search)
- [ ] Floating sidebar (Toggle, search, one-click copy, switch profile)
- [ ] One-click copy (Auto-copy on click, success toast, keyboard support)
- [ ] Shortcut expansion (Detect input field, detect keywords, dynamic text replacement)
- [ ] Multi-profile support (Create, switch, duplicate profiles)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- [Resume AI parsing] — Scheduled for Phase 2
- [LinkedIn import] — Scheduled for Phase 2
- [Cloud sync & Team workspaces] — Scheduled for Phase 2
- [Smart field detection & AI autofill] — Scheduled for Phase 3
- [Mobile support] — MVP focuses solely on desktop browser workflows

## Context

- Target audience primarily includes bench sales recruiters, staffing professionals, and job applicants.
- Built to solve the problem of repetitive manual typing causing fatigue and errors.
- Existing tools are often too complex, rely heavily on full autofill (which breaks on complex React/iframe forms), and lack recruiter-specific workflows.
- Relies on Chrome Manifest V3 APIs: Storage, Clipboard, Commands, Content Scripts, and Side Panel.

## Constraints

- **Tech Stack**: Chrome Extension Manifest V3 — Required for modern Chrome extension development.
- **Backend Stack**: Node.js/Express + PostgreSQL or Supabase — For robust data management and authentication.
- **Performance**: Sidebar must open in < 300ms, copy in < 100ms, and shortcut expansion in < 150ms — Crucial for a fast, low-friction UX.
- **Security**: Must use minimal extension permissions (activeTab, storage, scripting, clipboardWrite), secure token handling, and HTTPS-only API calls.
- **UX Boundaries**: Minimal, fast, keyboard-first workflow with one-click actions.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual copy & shortcuts > autofill | Avoids technical risks with websites blocking script injection or complex controlled inputs | — Pending |
| Chrome Extension MV3 | Industry standard and required by Chrome Web Store | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-15 after initialization*
