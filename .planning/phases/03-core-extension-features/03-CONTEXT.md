# Phase 3: Core Extension Features - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the core clipboard interaction loop. This includes click-to-copy functionality for profile fields, global toast notifications for user feedback, and the foundational content script architecture for cross-context communication. This phase bridges the sidebar UI with the user's system clipboard and prepares for the Phase 4 shortcut engine.

</domain>

<decisions>
## Implementation Decisions

### Toast System
- **D-01:** Use **Sonner** for toast notifications. It provides a premium, low-friction UX that aligns with the "fast and minimal" core value.
- **D-02:** Toasts should appear at the bottom of the sidebar for high visibility without blocking field access.

### Clipboard Interaction
- **D-03:** Clicking any profile field value (Email, Phone, etc.) instantly copies it to the system clipboard.
- **D-04:** **Auto-trimming:** All values must be trimmed of leading/trailing whitespace before being written to the clipboard.
- **D-05:** **Dual Feedback:** When a field is copied, the icon for that field will temporarily change to a "Check" icon, and a global toast will confirm the action (e.g., "Email copied!").

### Content Script Architecture
- **D-06:** Register a basic content script in `manifest.json`.
- **D-07:** Implement a **Message Bridge**: The sidebar will "Ping" the content script upon opening to verify communication. This foundation is required for the Phase 4 text expansion engine.

### the agent's Discretion
- Exact toast duration (recommended: 2000ms).
- Transition animations for the "Check" icon swap.
- Layout of the "Copy" buttons in the Profile view (integrated vs floating).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `ACTN-01` and `ACTN-02`.

### Tech Stack
- `GEMINI.md` — Manifest V3 constraints and React environment.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/App.tsx`: Header and layout structure where the Toast container will be mounted.
- `src/components/ProfileList.tsx`: The primary surface where click-to-copy actions will be triggered.

### Established Patterns
- **Lucide React:** Use `Copy` and `Check` icons for feedback.
- **Zustand Store:** Use the `activeProfile` state to determine which fields are available for copying.

### Integration Points
- **Manifest V3:** Need to add the `content_scripts` entry to `manifest.json`.

</code_context>

<deferred>
## Deferred Ideas

- **Shortcut Expansion:** The actual logic for replacing text in inputs is deferred to Phase 4.
- **Multi-select Copy:** Out of scope for v1.0; focus on single-field copy.

</deferred>

---

*Phase: 03-core-extension-features*
*Context gathered: 2026-05-15*
