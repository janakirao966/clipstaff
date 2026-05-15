<!-- GSD:project-start source:PROJECT.md -->
## Project

**ClipStaff**

ClipStaff is a lightweight browser extension designed for recruiters, staffing professionals, and job applicants who repeatedly enter the same information across job portals and application forms. It provides reusable profile storage, shortcut-based text expansion, quick clipboard copy, and multi-profile management to speed up application workflows.

**Core Value:** A fast, minimal, keyboard-first tool that eliminates repetitive typing across job application workflows through shortcuts and smart clipboard access without relying on complex full-form autofill.

### Constraints

- **Tech Stack**: Chrome Extension Manifest V3 — Required for modern Chrome extension development.
- **Backend Stack**: Node.js/Express + PostgreSQL or Supabase — For robust data management and authentication.
- **Performance**: Sidebar must open in < 300ms, copy in < 100ms, and shortcut expansion in < 150ms — Crucial for a fast, low-friction UX.
- **Security**: Must use minimal extension permissions (activeTab, storage, scripting, clipboardWrite), secure token handling, and HTTPS-only API calls.
- **UX Boundaries**: Minimal, fast, keyboard-first workflow with one-click actions.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Chrome MV3 | 3.0 | Browser extension API | Required by Chrome Web Store; improved security and performance. |
| React | 18.2 | UI framework | Fast rendering for the sidebar, rich ecosystem, easy component state. |
| Tailwind CSS | 3.4 | Styling | Rapid UI development, minimal bundle size when purged, no class name conflicts. |
| Supabase | JS 2.39 | Backend / DB / Auth | Provides instant Postgres, Auth, and APIs without managing a Node server. Perfect for MVP. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CRXJS Vite Plugin | 2.0 | Build tool for MV3 | Vite is much faster than Webpack for extension development. CRXJS simplifies MV3 routing. |
| Lucide React | 0.3 | Icon set | Minimal, clean SVG icons ideal for a recruiter's sidebar UI. |
| Zustand | 4.5 | State Management | Lighter and less boilerplate than Redux. Perfect for managing active profile and snippets. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Bundler | Fast HMR (Hot Module Replacement) during development. |
| TypeScript | Type safety | Prevents runtime errors, better autocomplete for Chrome APIs. |
## Installation
# Core
# Supporting
# Dev dependencies
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase | Node.js + Express + Postgres | Use if you need complex custom backend logic beyond simple CRUD, or have strict data privacy requirements requiring custom hosting. |
| React | Vanilla JS | Use if the extension UI is extremely simple (e.g., just a button). Our sidebar requires complex state (profiles, snippets) justifying React. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manifest V2 | Deprecated by Google | Manifest V3 |
| Redux | Overkill for a simple extension, large bundle size | Zustand or React Context |
| Heavy UI libraries (MUI) | Causes slow sidebar open times (>300ms) | Tailwind CSS + headless components |
## Stack Patterns by Variant
- Use Node.js + Express for backend instead of Supabase client-side directly
- Because it allows better separation of concerns and custom API versioning.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @crxjs/vite-plugin@2.0 | vite@5.x | Vite 5 support requires the latest beta of CRXJS plugin. |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Conventions

Refer to [CONVENTIONS.md](./CONVENTIONS.md) for detailed UI, state, and development patterns.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
