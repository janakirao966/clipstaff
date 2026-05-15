# Plan Summary: 04-02 (Detection Logic)

## Objective
Implement the shortcut detection logic in the content script.

## Key Files Created/Modified
- `src/content.ts`: Added global `keydown` listener and `handleExpansion` helper.

## Verification Results
- `npm run build`: **PASSED**
- Event Delegation: **VERIFIED** (Targets only INPUT and TEXTAREA)
- Token Extraction: **VERIFIED** (Regex `/\/(\S+)$/` correctly identifies trailing slash-commands)

## Self-Check: PASSED
- [x] Keyboard monitor filters for Space and Enter
- [x] Parser uses `selectionStart` to accurately locate the shortcut before the cursor
- [x] Expansion check matches against the local `shortcutCache`
- [x] Performance remains high (synchronous check in content script)
