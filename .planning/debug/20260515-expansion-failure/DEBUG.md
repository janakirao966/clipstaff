---
title: Debugging Expansion Failure
slug: expansion-failure
status: in-progress
date: 2026-05-15
---

# Debug: Expansion Failure

## Symptom
User reports shortcuts are not expanding in the "application" (likely a web form) even after the UI overhaul.

## Potential Root Causes
1. **Empty Cache:** `content.ts` is failing to sync with `background.ts` on load.
2. **Selector Failure:** The logic in `handleExpansion` is failing to find the shortcut in the input `value`.
3. **Event Hijacking:** Site-specific JS (e.g. React/LinkedIn) is consuming the `Space` keydown before we get it.
4. **Auth Disconnect:** Background script doesn't see the user as "Logged In" and returns `{}` shortcuts.

## Investigation Steps
1. **Audit `background.ts`:** Verify if `handleDataSync` is actually fetching and returning data.
2. **Audit `content.ts`:** Add aggressive logging to trace the `keydown` -> `match` -> `expand` flow.
3. **Verify Messaging:** Ensure `chrome.runtime.sendMessage` isn't erroring out.
4. **Check Sidebar Sync:** Does clicking "Sync" in the sidebar actually reach the content script?

## Proposed Fixes
- Move shortcut storage to `chrome.storage.local` so it survives across script restarts and is accessible to `content.ts` even if messaging fails.
- Implement a "Broadcast Sync" from the sidebar that pushes data to ALL tabs.
