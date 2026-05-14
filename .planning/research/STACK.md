# Stack Research

**Domain:** Browser Extension
**Researched:** 2026-05-15
**Confidence:** HIGH

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

```bash
# Core
npm install react react-dom @supabase/supabase-js

# Supporting
npm install lucide-react zustand

# Dev dependencies
npm install -D vite @crxjs/vite-plugin tailwindcss postcss autoprefixer typescript @types/react @types/chrome
```

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

**If team size grows or complex CI/CD is needed:**
- Use Node.js + Express for backend instead of Supabase client-side directly
- Because it allows better separation of concerns and custom API versioning.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @crxjs/vite-plugin@2.0 | vite@5.x | Vite 5 support requires the latest beta of CRXJS plugin. |

---
*Stack research for: Browser Extension*
*Researched: 2026-05-15*
