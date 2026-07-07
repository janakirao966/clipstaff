---
title: Debugging Expansion Failure
slug: expansion-failure
status: complete
date: 2026-05-15
---

# Debug: Expansion Failure - RESOLVED

## Root Cause
The previous expansion logic relied on a volatile message-based sync between the background script and content script. If the background script was suspended or the message failed during a page load, the `shortcutCache` would be empty, causing expansion to fail.

## Fix Implemented
1. **Persistent Storage:** Replaced message-based sync with `chrome.storage.local`.
2. **Reactive Frontend Sync:** Created `lib/sync.ts` and integrated it into `App.tsx`. The extension now automatically compiles and persists a flat "Shortcuts Map" whenever the user makes a change in the sidebar.
3. **Low-Latency Content Script:** `content.ts` now reads directly from extension storage and reacts to storage changes instantly.
4. **Enhanced Feedback:** The Sync button now reports the exact count of synchronized shortcuts.

## Verification
- Sync button confirms shortcut count.
- `content.ts` logs cache load on every page initialization.
- Expansion logic in `content.ts` handles both standard inputs and `contenteditable` portals.
