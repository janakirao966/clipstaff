# Roadmap: ClipStaff

**Defined:** 2026-05-15
**Goal:** A fast, minimal, keyboard-first tool that eliminates repetitive typing across job application workflows through shortcuts and smart clipboard access without relying on complex full-form autofill.

## Phases

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation | 2/2 | Complete   | 2026-05-14 |
| 2 | Data Management | 2/3 | Complete   | 2026-06-15 |
| 3 | Core Extension Features | Click-to-copy, clipboard writing, toast notifications, and basic content script structure | Complete | 2026-06-30 |
| 4 | Shortcut Engine | 0/3 | Complete    | 2026-07-04 |
| 5 | Persistent Job Tracking | Capture tab URLs directly, context menus, keyboard triggers, IndexedDB local database | Complete | 2026-07-07 |

## Phase Details

### Phase 1: Foundation
**Goal:** Basic extension setup, sidebar UI, and user authentication
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, SIDE-01
**UI hint:** yes
**Success criteria:**
1. Extension can be installed locally and sidebar toggled on any page.
2. User can sign up, log in, and log out from the sidebar.
3. User session persists after reloading the active tab.

### Phase 2: Data Management
**Goal:** Profile and Snippet CRUD operations within the sidebar
**Requirements:** PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, SNIP-01, SNIP-02, SNIP-03, SNIP-04, SNIP-05, SIDE-02, SIDE-03, SIDE-04
**UI hint:** yes
**Success criteria:**
1. User can create, edit, delete, and switch active profiles in the sidebar.
2. User can create, edit, delete, search, and categorize snippets.
3. Sidebar displays current active profile details and list of snippets accurately.

### Phase 3: Core Extension Features
**Goal:** Click-to-copy, clipboard writing, toast notifications, and basic content script structure
**Requirements:** ACTN-01, ACTN-02
**UI hint:** yes
**Success criteria:**
1. Clicking a field in the sidebar instantly copies the value to the system clipboard.
2. A non-obtrusive toast notification appears confirming the copy action.

### Phase 4: Shortcut Engine
**Goal:** Content script text replacement engine mapping user shortcuts to active inputs
**Requirements:** ACTN-03, ACTN-04
**UI hint:** no
**Success criteria:**
1. Typing a snippet shortcut and pressing Tab expands the shortcut into the full snippet text in a standard textarea.
2. Shortcut expansion successfully triggers necessary input events so modern React/Angular forms detect the value change.

### Phase 5: Persistent Job Tracking
**Goal:** Local persistent tracking of job application URLs using IndexedDB with keyboard shortcuts and context menus
**Requirements:** APP-01, APP-02, APP-03, APP-04
**UI hint:** yes
**Success criteria:**
1. Jobs can be stored in and retrieved from a local IndexedDB database.
2. Users can save the current page URL directly using a context menu option or keyboard shortcut (`Alt+Shift+S`).
3. Webpage-level toasts display confirmation feedback to users upon saving.
4. Google Sheet synced jobs can be imported to the local IndexedDB database.

---
*Roadmap defined: 2026-05-15*
