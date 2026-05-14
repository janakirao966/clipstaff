# Pitfalls Research

**Domain:** Browser Extension
**Researched:** 2026-05-15
**Confidence:** HIGH

## Critical Mistakes & Prevention

### 1. Text Replacement Failing on Modern Web Apps (React/Angular)
- **Warning Sign**: Text expands visibly but disappears when the user submits the form.
- **Prevention**: When replacing text in a content script, simply setting `input.value = newText` is not enough. You must dispatch `input` and `change` events, and sometimes simulate keystrokes or use `document.execCommand('insertText')` to ensure frameworks register the change.
- **Phase**: Phase 3 (Extension Features - Content Script)

### 2. Extension Store Rejection for Permissions
- **Warning Sign**: Requesting `"<all_urls>"` or `tabs` permissions without a clear justification.
- **Prevention**: Use `activeTab` where possible. Limit `scripting` and `clipboardWrite` to explicit user actions. Avoid requesting permissions for features not yet built.
- **Phase**: Phase 1 (Foundation)

### 3. Sidebar State Desync
- **Warning Sign**: User updates a snippet in the sidebar, but the content script still uses the old snippet.
- **Prevention**: Use the Chrome Storage API (`chrome.storage.local`) as the source of truth across the extension. When the sidebar updates Supabase, it should also update `chrome.storage`, and content scripts should listen to `chrome.storage.onChanged`.
- **Phase**: Phase 2 (Core Data Management)

### 4. Background Script Service Worker Sleeping
- **Warning Sign**: MV3 background scripts go to sleep after 30 seconds of inactivity. If state is stored in variables, it gets lost.
- **Prevention**: Do not rely on global variables in `background.js`. Always read/write state to `chrome.storage.session` or `chrome.storage.local`.
- **Phase**: Phase 1 & 3

### 5. Slow Sidebar Open Time
- **Warning Sign**: Clicking the extension icon takes >500ms to open the UI.
- **Prevention**: Avoid heavy initialization in the React `index.js`. Lazy load components. Use a minimal CSS framework (Tailwind) rather than heavy component libraries (like Material UI).
- **Phase**: Phase 4 (Polish)

---
*Pitfalls research for: Browser Extension*
*Researched: 2026-05-15*
