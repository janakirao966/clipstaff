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

<!-- graph-rules-start -->
## 🧠 Mandatory Rule: Knowledge Graphs First (Graphify & Code-Review-Graph)

**ALWAYS use `graphify` and `code-review-graph` before making any code fixes, debugging issues, or modifying existing features.** The knowledge graph is fast, token-efficient, and provides structural context (callers, callees, affected flows, community boundaries) that blind text searching or broad file inspection misses.

### 1. Before Any Fix or Code Change
- **Architecture & Relationship Inspection**:
  - Run `graphify query "<question or symbol>"` (or use `query_graph_tool` / `semantic_search_nodes_tool`) to locate relevant symbols, call hierarchies, and cross-module dependencies.
  - Run `graphify path "<Source>" "<Target>"` when tracing data/call flows between components.
  - Run `graphify explain "<Node>"` for high-level semantic context.
  - Review [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) and [graphify-out/graph.json](./graphify-out/graph.json) for god nodes, hubs, and community clusters.
- **Impact Radius & Blast Radius**:
  - Use `get_impact_radius_tool` and `get_affected_flows_tool` to understand which downstream components or UI workflows are affected.
  - Use `query_graph_tool` with `callers_of`, `callees_of`, `imports_of`, and `tests_for` to locate dependent test cases and callers.

### 2. Verify in the Exact Source
- Use graph outputs to narrow scope, then view and verify the exact implementation lines in the source before applying fixes.
- If the graph and source disagree, the source is always authoritative.

### 3. Review & Post-Fix Synchronization
- **Code Review**: Use `detect_changes_tool` + `get_review_context_tool` to review changes and perform risk-scored analysis.
- **Update Graph**: After modifying code files, run `graphify update .` to keep the persistent knowledge graph in sync.

### Key Tools Quick Reference

| Tool / Command | Use When |
| --- | --- |
| `graphify query "<query>"` | Finding related components, functions, or architectural connections |
| `graphify path "<A>" "<B>"` | Tracing execution paths or dependencies between two modules |
| `graphify explain "<node>"` | Getting context and relationships for a specific component/function |
| `graphify update .` | Re-indexing AST and syncing the knowledge graph after code edits |
| `detect_changes_tool` | Reviewing code changes with risk-scored analysis |
| `get_review_context_tool` | Token-efficient source snippet review |
| `get_impact_radius_tool` | Understanding the blast radius before modifying shared logic |
| `get_affected_flows_tool` | Identifying affected execution paths across extension/UI flows |
| `query_graph_tool` | Tracing callers, callees, imports, tests, and dependencies |
| `semantic_search_nodes_tool` | Locating functions, classes, or symbols by name or semantic intent |
<!-- graph-rules-end -->
