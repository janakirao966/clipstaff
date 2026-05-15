# Development Conventions: ClipStaff

## UI & Styling
- **Theme:** Midnight Chrome (Luxury Dark Mode).
- **Styling:** Vanilla Tailwind CSS 3.4.
- **Components:** Functional React components with strictly typed props.
- **Icons:** Lucide React icons with consistent stroke-width (1.5 or 2).
- **Typography:** `Outfit` for display/headings, `Inter` for body/inputs.

## State Management
- **Global:** Zustand for active profiles, snippets, and user state.
- **Local:** React `useState` for transient UI states (modals, loading, etc.).

## Data & Backend
- **Provider:** Supabase (Auth, Postgres).
- **Hooks:** Use custom hooks (e.g., `useProfiles`, `useSnippets`) for all database interactions.
- **Security:** RLS must be enabled for all tables; queries must filter by `user_id`.

## Extension Specifics
- **Communication:** Use `chrome.runtime.sendMessage` for background-to-content and background-to-sidebar messaging.
- **Expansion:** dual-layer `execCommand` + `setRangeText`.
- **Shortcuts:** Word-based triggers on `Space` or `Enter`. No slash prefix.
