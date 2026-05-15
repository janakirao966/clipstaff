# Phase 4: Shortcut Engine - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the keyboard-driven text expansion engine. This phase involves monitoring user input in real-time, detecting slash-commands (shortcuts), and instantly replacing them with the corresponding snippet or profile data. This is the primary productivity feature of the extension.

</domain>

<decisions>
## Implementation Decisions

### Expansion Mechanism
- **D-01: Trigger Keys:** Expansion occurs when the user presses **Space** or **Enter** immediately following a valid shortcut (e.g., `/name `).
- **D-02: Target Scope:** Focus on standard `<input>` and `<textarea>` elements for v1.0. `contenteditable` support is deferred to future updates.
- **D-03: Cursor Management:** After expansion, the cursor must be placed at the end of the newly inserted text.

### Data Synchronization
- **D-04: Local Cache:** The content script will request a full data sync (active profile fields + all snippets) from the background script upon initialization and whenever the sidebar is updated.
- **D-05: Minimal Latency:** Perform expansion logic entirely within the content script to meet the < 150ms performance requirement.

### Conflict Handling
- **D-06: Silent Non-Matches:** If a string starting with `/` does not match any known shortcut, the engine remains silent and allows normal typing.
- **D-07: Escape Hatch:** Users can type `//` to avoid expansion if they specifically need to type a leading slash.

### the agent's Discretion
- Regex patterns for tokenization (e.g. `/\w+`).
- Handling of "undo" behavior (e.g. if the user wants to revert the expansion).

</decisions>

<canonical_refs>
## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `EXPN-01`, `EXPN-02`, and `PERF-01`.

### UI Spec
- `.planning/phases/02-data-management/02-UI-SPEC.md` — Defines the profile fields (name, email, etc.).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content.ts`: Existing listener for PING/PONG and message handling.
- `src/background.ts`: Existing proxy for data fetching.

### Integration Points
- **Message Bridge:** Use the bridge created in Phase 3 to sync data slices to the content script.

</code_context>

<deferred>
## Deferred Ideas

- **Rich Text Editor (RTE) Support:** Gmail/LinkedIn message boxes often use RTEs. Deferred to v1.1.
- **Dynamic Variable Injection:** (e.g. "Hello {company}") deferred to v2.0.

</deferred>

---

*Phase: 04-shortcut-engine*
*Context gathered: 2026-05-15*
