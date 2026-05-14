# Architecture Research

**Domain:** Browser Extension
**Researched:** 2026-05-15
**Confidence:** HIGH

## Component Boundaries

1. **Background Service Worker (`background.js`)**
   - Manages extension lifecycle.
   - Handles global keyboard shortcuts (Commands API).
   - Manages communication between content scripts and Supabase.
   - Toggles the side panel.

2. **Content Script (`content.js`)**
   - Injected into every webpage.
   - Listens for keydown events to detect snippet shortcuts.
   - Performs text replacement in active input/textarea fields.
   - Communicates with Background script to fetch snippets if not cached.

3. **Side Panel / Sidebar UI (`index.html`)**
   - The main React application.
   - Displays profiles, snippets, and settings.
   - Handles authentication UI.
   - Communicates with the background script to sync state.

4. **Backend (Supabase)**
   - Postgres Database (Users, Profiles, Snippets).
   - Authentication (JWT generation and validation).

## Data Flow

1. **Auth Flow**: User logs in via Sidebar -> Supabase returns JWT -> Sidebar stores session -> Sends message to Background script to cache auth state.
2. **Snippet Expansion Flow**: User types in webpage -> Content script detects `shortcut + Tab` -> Content script looks up replacement from local cache -> Updates DOM -> Triggers input events to notify React/Angular forms.
3. **Copy Flow**: User clicks field in Sidebar -> React writes to `navigator.clipboard` -> Shows toast notification.

## Build Order (Suggested)

1. **Phase 1: Foundation**
   - Setup Vite + CRXJS.
   - Implement Supabase Auth in the Sidebar.
   - Define Postgres schemas.

2. **Phase 2: Core Data Management**
   - Build Profile CRUD UI.
   - Build Snippet CRUD UI.
   - Implement Multi-profile switching state.

3. **Phase 3: Extension Features**
   - Implement click-to-copy in the Sidebar.
   - Build Content Script for shortcut detection.
   - Build text replacement engine.

4. **Phase 4: Polish**
   - Keyboard navigation in Sidebar.
   - Toast notifications.
   - Performance optimizations (caching snippets locally).

---
*Architecture research for: Browser Extension*
*Researched: 2026-05-15*
