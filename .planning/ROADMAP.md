# Roadmap: ClipStaff

**Defined:** 2026-05-15
**Goal:** A fast, minimal, keyboard-first tool that eliminates repetitive typing across job application workflows through shortcuts and smart clipboard access without relying on complex full-form autofill.

## Phases

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation | 2/2 | Complete   | 2026-05-14 |
| 2 | Data Management | 2/3 | In Progress|  |
| 3 | Core Extension Features | Click-to-copy, clipboard writing, toast notifications, and basic content script structure | ACTN-01, ACTN-02 | Pending |
| 4 | Shortcut Engine | 0/3 | Planned    |  |

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

---
*Roadmap defined: 2026-05-15*
