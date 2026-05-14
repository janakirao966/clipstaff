# Research Summary

**Domain:** Browser Extension
**Synthesized:** 2026-05-15

## Key Findings

**Stack:** 
- Chrome MV3 (Required for extension)
- React + Tailwind CSS (Fast, maintainable UI)
- Supabase (Backend/DB/Auth)
- Zustand (State management)

**Table Stakes:**
- User Authentication
- Profile Management
- Snippet Management
- Click-to-Copy
- Floating Sidebar
- Keyboard Shortcuts

**Watch Out For:**
- Text Replacement Failing on Modern Web Apps: Direct `.value` changes fail on React/Angular forms. Use event dispatching.
- Extension Store Rejection: Minimize permissions, avoid broad `<all_urls>` unless justified.
- Sidebar State Desync: Use `chrome.storage.local` as the single source of truth to sync across React sidebar, background scripts, and content scripts.
- Background Script Sleeping: Do not rely on variables in memory for background scripts; persist them immediately.

---
*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
