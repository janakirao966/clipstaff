# Phase 2: Data Management - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Profile and Snippet CRUD operations within the sidebar. This includes database schema definition in Supabase, RLS policies for user data isolation, and a React-based UI for managing these entities. This phase focuses on data management; the shortcut expansion engine is deferred to Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Data Schema (Profiles)
- **D-01:** Profiles table will include: `id`, `user_id` (FK), `name` (profile label), `full_name`, `email`, `phone`, `linkedin_url`, `portfolio_url`, `location`, `visa_status`, `notice_period`, `is_active` (boolean).
- **D-02:** Only one profile can be marked `is_active: true` at a time per user.

### Data Schema (Snippets)
- **D-03:** Snippets table will include: `id`, `user_id` (FK), `shortcut` (unique within user), `text` (expansion content), `category` (string/tag), `created_at`.

### Security (RLS)
- **D-04:** Enable Row Level Security (RLS) on both tables. Policies will restrict CRUD operations to the owner (`auth.uid() = user_id`).

### State Management
- **D-05:** Use Zustand for global state management of the `activeProfile` and `snippets` list to ensure fast, reactive UI updates.

### UI/UX Pattern
- **D-06:** Use a **List-Detail pattern** for both profiles and snippets.
- **D-07:** **Inline editing** for quick updates to individual fields. **Modals** for "Create New" flows to keep the sidebar clean.
- **D-08:** Search bar at the top of the snippets list for real-time filtering.

### the agent's Discretion
- Exact Tailwind styling for the list items (e.g., hover effects, icons).
- Search algorithm for snippets (simple substring match vs fuzzy).
- Form validation error messaging details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `PROF-01` to `PROF-05` and `SNIP-01` to `SNIP-05`.

### Tech Stack
- `GEMINI.md` — Project conventions and tech stack (React, Tailwind, Supabase, Zustand).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase.ts`: Use the pre-configured Supabase client with the Chrome storage adapter.
- `src/contexts/AuthContext.tsx`: Use `useAuth` hook to get the current `user_id` for queries.

### Established Patterns
- **Tailwind-first styling:** Follow the spacing and color scale defined in `src/index.css`.
- **Lucide React:** Use for all iconography as established in `src/App.tsx`.

### Integration Points
- `src/App.tsx`: The "MainContent" will be updated to include navigation between Profiles and Snippets views.

</code_context>

<deferred>
## Deferred Ideas

- **Snippet Trash/Recovery:** Deletions are permanent for MVP.
- **Shortcut Expansion Engine:** Deferred to Phase 4 (content script logic).
- **Profile Image Upload:** Out of scope for v1.0.

</deferred>

---

*Phase: 02-data-management*
*Context gathered: 2026-05-15*
