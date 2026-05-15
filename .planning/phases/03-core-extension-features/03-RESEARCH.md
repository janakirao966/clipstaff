# Phase 3: Core Extension Features - Research

## Standard Stack
- **Feedback:** `sonner` (Toast library).
- **Icons:** `Check`, `Copy` from `lucide-react`.
- **Extension API:** `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`, `chrome.scripting`.

## Architecture Patterns

### Message Proxy Pattern (Side Panel -> Content Script)
Side panels cannot communicate directly with content scripts. We must use the Background Service Worker as a proxy.
- **Flow:** `SidePanel` -> `runtime.sendMessage` -> `Background` -> `tabs.sendMessage` -> `ContentScript`.

### Clipboard Logic
- Use the modern `navigator.clipboard.writeText` API within the Side Panel.
- Since the side panel is a separate window/frame, ensure it doesn't lose focus during the copy operation.

### Content Script Injection
- Register the content script in `manifest.json` for `<all_urls>`.
- Use a "Ping/Pong" handshake to verify the script is injected and ready before attempting text expansion (in Phase 4).

## Don't Hand-Roll
- **Toast Notifications:** Use `sonner` instead of a custom CSS solution.
- **Tab Management:** Use `chrome.tabs.query({ active: true, currentWindow: true })` to identify the target tab reliably.

## Common Pitfalls
- **Missing Content Scripts on Refresh:** Content scripts need to be re-injected or wait for the page to load.
- **Z-Index with Modals:** Ensure `<Toaster />` is outside any high z-index containers if using modals.
- **CSP Issues:** Extensions have strict Content Security Policies; `sonner` is generally compliant as it doesn't use `eval()` or inline scripts by default.

## Code Examples

### Message Proxy (Background)
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'content-script') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message.data);
      }
    });
  }
});
```

---

*Phase: 03-core-extension-features*
*Research complete: 2026-05-15*
