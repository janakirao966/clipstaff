# Graph Report - clipstaff-main  (2026-09-02)

## Corpus Check
- 364 files · ~222,199 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 758 nodes · 1507 edges · 47 communities (26 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Main UI & App Component
- Job List & Portal Feed
- Office Document Pack Engine
- Chrome Extension Manifest
- Background Service Worker
- Core UI Dependencies
- Build Tools & Linter Config
- Content Script & Expansion Handler
- DOCX Merge & Run Formatting
- ESLint Configuration
- TypeScript Compiler Configuration
- Design System Generator
- Resume Builder & Formatter
- Design System Markdown Output
- UI Reasoning & Row Blending
- BM25 Search Core
- LibreOffice Shim & Environment
- Supabase Test Client
- Vite Node Configuration
- Swagger CJS Schema Fetcher
- Swagger JS Schema Fetcher
- Company Exclusion Logic
- BM25 Tokenizer & Scorer
- React Error Boundary
- Page Override Generator
- Parser & URL Test Utility
- Chrome Mock Test Setup
- SheetJS Workbook Test
- Vite Environment Types
- Test Suite Polluter Finder

## God Nodes (most connected - your core abstractions)
1. `useStore` - 29 edges
2. `BaseSchemaValidator` - 26 edges
3. `Job` - 26 edges
4. `useJobsDb()` - 25 edges
5. `extractCompanyFromUrl()` - 24 edges
6. `normalizeUrl()` - 23 edges
7. `initDB()` - 22 edges
8. `extractRoleFromUrl()` - 22 edges
9. `getJobId()` - 22 edges
10. `JobList()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ProfileDrawer()` --indirect_call--> `importJobsBulk()`  [INFERRED]
  src/components/ProfileDrawer.tsx → src/lib/db.ts
- `ImportExportManager()` --indirect_call--> `importJobsBulk()`  [INFERRED]
  src/components/vault/ImportExportManager.tsx → src/lib/db.ts
- `_generate_intelligent_overrides()` --calls--> `search()`  [EXTRACTED]
  .agents/skills/ui-ux-pro-max/scripts/design_system.py → .agents/skills/ui-ux-pro-max/scripts/core.py
- `MainContent()` --indirect_call--> `autofillForm()`  [INFERRED]
  src/App.tsx → src/lib/autofill.ts
- `handleSaveJob()` --calls--> `checkCompanyExclusion()`  [EXTRACTED]
  src/background.ts → src/lib/exclusionHelper.ts

## Import Cycles
- None detected.

## Communities (47 total, 4 thin omitted)

### Community 0 - "Main UI & App Component"
Cohesion: 0.06
Nodes (67): App(), EligibilityChecker, MainContent(), Auth(), EligibilityChecker(), ProfileDrawer(), ProfileDrawerProps, SnippetDetail() (+59 more)

### Community 1 - "Job List & Portal Feed"
Cohesion: 0.06
Nodes (52): RFC-4180, JobList, fetchViaBackground(), JobList(), SheetTab, ConfirmAppliedModal(), ConfirmAppliedModalProps, CountdownBanner() (+44 more)

### Community 2 - "Office Document Pack Engine"
Cohesion: 0.05
Nodes (16): _condense_xml(), pack(), Path, Pack a directory into a DOCX, PPTX, or XLSX file. Validates with auto-repair,…, _run_validation(), main(), Command line tool to validate Office document XML files against XSD schemas and…, BaseSchemaValidator (+8 more)

### Community 3 - "Chrome Extension Manifest"
Cohesion: 0.04
Nodes (44): action, default_icon, background, service_worker, type, commands, save-current-job, content_scripts (+36 more)

### Community 4 - "Background Service Worker"
Cohesion: 0.14
Nodes (39): acquireSyncLock(), broadcastSyncStatus(), fetchWithTimeout(), getActiveTabWithTimeout(), getPersistedStore(), handleBatchPushUpload(), handleSaveJob(), handleSheetSyncPoll() (+31 more)

### Community 5 - "Core UI Dependencies"
Cohesion: 0.05
Nodes (40): framer-motion, lucide-react, dependencies, docx, exceljs, file-saver, framer-motion, jspdf (+32 more)

### Community 6 - "Build Tools & Linter Config"
Cohesion: 0.05
Nodes (39): autoprefixer, @crxjs/vite-plugin, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom, devDependencies, autoprefixer (+31 more)

### Community 7 - "Content Script & Expansion Handler"
Cohesion: 0.09
Nodes (26): handleInstantExpansion(), handleTriggerExpansion(), initApplicationSubmittedDetector(), insertTextIntoElement(), ParsedShortcut, performExpansion(), shortcutCache, showApplicationSubmittedPrompt() (+18 more)

### Community 8 - "DOCX Merge & Run Formatting"
Cohesion: 0.11
Nodes (33): _can_merge(), _consolidate_text(), _find_elements(), _first_child_run(), _get_child(), _get_children(), _is_adjacent(), _is_run() (+25 more)

### Community 9 - "ESLint Configuration"
Cohesion: 0.07
Nodes (28): env, browser, es2021, node, extends, globals, chrome, ignorePatterns (+20 more)

### Community 10 - "TypeScript Compiler Configuration"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+16 more)

### Community 11 - "Design System Generator"
Cohesion: 0.14
Nodes (11): DesignSystemGenerator, Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation. variance/motion/density are…, Bucket a 1-10 dial value into its tier config. Returns None if value is None., Generates design system recommendations from aggregated searches. (+3 more)

### Community 12 - "Resume Builder & Formatter"
Cohesion: 0.21
Nodes (13): ResumeBuilder, CompanyCopySection(), escHtml(), ResumeBuilder(), chromeDownload(), exportResumeToDocx(), bullet(), expDocx() (+5 more)

### Community 13 - "Design System Markdown Output"
Cohesion: 0.17
Nodes (16): ansi_ljust(), format_ascii_box(), format_markdown(), format_master_md(), generate_design_system(), hex_to_ansi(), persist_design_system(), Convert hex color to ANSI True Color swatch (██) with fallback. (+8 more)

### Community 14 - "UI Reasoning & Row Blending"
Cohesion: 0.29
Nodes (13): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+5 more)

### Community 15 - "BM25 Search Core"
Cohesion: 0.21
Nodes (12): detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search stack-specific guidelines, search() (+4 more)

### Community 16 - "LibreOffice Shim & Environment"
Cohesion: 0.24
Nodes (12): _ensure_shim(), get_soffice_env(), _needs_shim(), Path, Helper for running LibreOffice (soffice) in environments where AF_UNIX sockets…, run_soffice(), has_gtimeout(), main() (+4 more)

### Community 17 - "Supabase Test Client"
Cohesion: 0.17
Nodes (10): { createClient }, envContent, envPath, fs, key, keyMatch, path, supabase (+2 more)

### Community 18 - "Vite Node Configuration"
Cohesion: 0.20
Nodes (9): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict (+1 more)

### Community 19 - "Swagger CJS Schema Fetcher"
Cohesion: 0.20
Nodes (8): envContent, envPath, fs, key, keyMatch, path, url, urlMatch

### Community 20 - "Swagger JS Schema Fetcher"
Cohesion: 0.20
Nodes (8): envContent, envPath, fs, key, keyMatch, path, url, urlMatch

### Community 21 - "Company Exclusion Logic"
Cohesion: 0.38
Nodes (8): PersistedState, checkCompanyExclusion(), ExclusionCheckResult, getProfileExperienceCompanies(), isCompanyMatching(), normalizeCompanyToken(), ProfileSlice, Profile

### Community 22 - "BM25 Tokenizer & Scorer"
Cohesion: 0.28
Nodes (5): BM25, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query

### Community 23 - "React Error Boundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 24 - "Page Override Generator"
Cohesion: 0.33
Nodes (6): _detect_page_type(), format_page_override_md(), _generate_intelligent_overrides(), Format a page-specific override file with intelligent AI-generated content., Generate intelligent overrides based on page type using layered search. Uses…, Detect page type from context and search results.

### Community 27 - "Chrome Mock Test Setup"
Cohesion: 0.50
Nodes (3): chromeMock, storageListeners, store

## Knowledge Gaps
- **193 isolated node(s):** `find-polluter.sh script`, `browser`, `es2021`, `node`, `chrome` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 302 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useStore` connect `Main UI & App Component` to `Job List & Portal Feed`, `Resume Builder & Formatter`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `find-polluter.sh script`, `browser`, `es2021` to the rest of the system?**
  _193 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Main UI & App Component` be split into smaller, more focused modules?**
  _Cohesion score 0.0594059405940594 - nodes in this community are weakly interconnected._
- **Should `Job List & Portal Feed` be split into smaller, more focused modules?**
  _Cohesion score 0.06049213943950786 - nodes in this community are weakly interconnected._
- **Should `Office Document Pack Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05443371378402107 - nodes in this community are weakly interconnected._
- **Should `Chrome Extension Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.04343971631205674 - nodes in this community are weakly interconnected._
- **Should `Background Service Worker` be split into smaller, more focused modules?**
  _Cohesion score 0.1393939393939394 - nodes in this community are weakly interconnected._