# Phase 4: Shortcut Engine - Research

## Standard Stack
- **Event Monitoring:** `keydown` (capture Space/Enter) + `input` (capture changes).
- **Text Manipulation:** `setRangeText()` (standard for modern browsers).
- **Framework Compatibility:** `dispatchEvent(new Event('input', { bubbles: true }))`.

## Architecture Patterns

### Tokenization at Cursor
To perform expansion, we must reliably identify the "word" immediately preceding the cursor when a trigger key (Space/Enter) is pressed.
- **Logic:**
  1. Detect `Space` or `Enter`.
  2. Get `selectionStart`.
  3. Extract text from start of current line/paragraph up to `selectionStart`.
  4. Use Regex (e.g. `/\/\S+$/`) to find the trailing shortcut token.

### Native Expansion Logic
```javascript
function expand(element, shortcutLength, expandedText) {
  const start = element.selectionStart - shortcutLength;
  const end = element.selectionStart;
  
  element.setRangeText(expandedText, start, end, 'end');
  
  // Critical for sites like LinkedIn/Indeed (React/Vue)
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### Data Synchronization
The content script needs a local cache of shortcuts to avoid async latency.
- **Trigger:** Sidebar "Ready" message or page load.
- **Method:** `chrome.runtime.sendMessage({ type: 'GET_DATA' })`.
- **Storage:** Simple in-memory object `const cache = { "/name": "..." }`.

## Don't Hand-Roll
- **Cursor Positioning:** Don't use manual `value = start + insert + end` string concatenation; `setRangeText` is safer and preserves history/undo where possible.
- **Event Listeners:** Don't add listeners to every input individually; use **Event Delegation** on `document` and check `event.target`.

## Common Pitfalls
- **Losing Focus:** Ensure the element remains focused during replacement.
- **Undo History:** Programmatic value changes can break the browser's native Undo (Ctrl+Z). While `setRangeText` is better, some sites with custom state management (Redux) might still revert the change if the `input` event isn't bubbled correctly.
- **Double Slashing:** Ensure `/` typed naturally (e.g. in a date) doesn't trigger expansion if it doesn't match a shortcut exactly.

---

*Phase: 04-shortcut-engine*
*Research complete: 2026-05-15*
