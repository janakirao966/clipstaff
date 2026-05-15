---
phase: 2
slug: data-management
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-15
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for frontend phases.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Tailwind) |
| Preset | not applicable |
| Component library | none |
| Icon library | Lucide React |
| Font | Inter |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 500 | 1.2 |
| Heading | 18px | 600 | 1.3 |
| Display | 24px | 700 | 1.1 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #FFFFFF | Background, surfaces |
| Secondary (30%) | #F8FAFC | Cards, sidebar list area |
| Accent (10%) | #0F172A | Primary buttons, active indicators |
| Destructive | #EF4444 | Delete buttons, error icons |

Accent reserved for: Primary CTA buttons, Active profile indicator, Search icon focus state.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Create Profile / Save Snippet |
| Empty state heading | No active profile / No snippets found |
| Empty state body | Add your first recruitment profile to start. / Create your first snippet or adjust your search. |
| Error state | Unable to save: Please check your connection and try again. |
| Destructive confirmation | Delete Snippet: Are you sure? This cannot be undone. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Lucide | Layout, User, Plus, Search, Trash, Edit | not required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** pending 2026-05-15
