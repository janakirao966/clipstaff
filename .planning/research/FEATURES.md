# Features Research

**Domain:** Productivity Browser Extension
**Researched:** 2026-05-15
**Confidence:** HIGH

## Feature Categories

### Table Stakes (Must Have)
- **User Authentication**: Secure login/signup to sync data.
- **Profile Management**: Store structured personal/professional info.
- **Snippet Management**: Create custom abbreviations that expand to longer text.
- **Click-to-Copy**: Easy manual fallback to copy data to clipboard.
- **Floating Sidebar**: Accessible from any page to view data.
- **Keyboard Shortcuts**: Global shortcut to open sidebar or trigger expansion.

### Differentiators (Competitive Advantage)
- **Multi-Profile Support**: Quickly toggle between different "personas" (e.g., Java Dev vs Data Analyst).
- **Recruiter-Specific Fields**: Built-in support for Visa status, bench sales notes, rate requirements.
- **Smart Shortcut Expansion**: Typing `mgm` and hitting Tab auto-expands in active input fields without needing the sidebar.

### Anti-Features (Do Not Build)
- **Full Page Autofill**: Existing tools fail on complex React/iframe forms. Stick to manual copy and text expansion.
- **Heavy Analytics**: Avoid tracking user's browsing history to respect privacy and maintain extension store approval.
- **Mobile Support**: The target workflow (applying to portals, updating ATS) is desktop-centric.

## Complexity & Dependencies

| Feature | Complexity | Dependencies |
|---------|------------|--------------|
| Authentication | Low | Supabase Auth |
| Snippet Expansion | High | Content scripts, DOM event listeners |
| Floating Sidebar | Medium | Chrome Side Panel API or injected iframe |
| Multi-Profile | Medium | Profile Management, State store |

---
*Features research for: Productivity Browser Extension*
*Researched: 2026-05-15*
