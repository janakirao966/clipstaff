# Phase 1: Technical Research

## Chrome MV3 + Vite + CRXJS
- Vite combined with `@crxjs/vite-plugin` provides HMR for Chrome Extensions.
- Need a `manifest.json` configured for MV3 with permissions: `activeTab`, `storage`, `clipboardWrite`, `scripting`.
- The sidebar UI can be implemented either via a `sidePanel` API (if we want Chrome's native side panel) or by injecting an iframe/div into the host page via a content script. The PRD says "Floating sidebar access" - usually, this implies injecting a React component into the host page's DOM via a content script, or using the new Chrome `sidePanel` API.
- For recruiters, `sidePanel` is very clean and doesn't conflict with host page CSS. We will use the `sidePanel` API (`chrome.sidePanel`) which requires the `sidePanel` permission.

## Supabase Auth
- `supabase-js` client required.
- Need to configure `supabase.auth` to persist session. In a Chrome extension, local storage isn't always reliable for background scripts, but since we are using `sidePanel`, `chrome.storage.local` is preferred.
- Supabase auth provides a custom storage adapter interface where we can plug in `chrome.storage.local`.

## Tailwind CSS
- standard PostCSS setup in Vite.

## Validation Architecture
- We need to verify the extension loads in Chrome without errors.
- Verify user can signup/login and the JWT is stored in `chrome.storage.local`.
