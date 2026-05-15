# Phase 2: Data Management - Research

## Standard Stack
- **Database:** Supabase (PostgreSQL)
- **State Management:** Zustand (Slice Pattern)
- **Persistence:** `chrome.storage.local` (for session)
- **UI Components:** Lucide React for icons, Tailwind CSS for layout.

## Architecture Patterns

### Database Schema & RLS
- **Profiles Table:** Focus on recruitment-specific fields. Index `user_id` and `is_active` for performance.
- **Snippets Table:** Index `user_id` and `shortcut`.
- **RLS Policy:** Standard "Owner Access Only" policy: `auth.uid() = user_id`.

### Zustand Slice Pattern
Organize state into slices to keep the store manageable:
```typescript
interface ProfileSlice {
  profiles: Profile[];
  activeProfile: Profile | null;
  setProfiles: (profiles: Profile[]) => void;
  // ... CRUD actions
}

interface SnippetSlice {
  snippets: Snippet[];
  searchTerm: string;
  setSnippets: (snippets: Snippet[]) => void;
  // ... CRUD actions
}

const useStore = create<ProfileSlice & SnippetSlice>()((...a) => ({
  ...createProfileSlice(...a),
  ...createSnippetSlice(...a),
}))
```

### UI Interaction: List-Detail
- Sidebar width is limited (~300-400px).
- **List View:** Compact rows with "active" indicator and quick-action icons (Edit/Delete).
- **Detail View:** Slides in or replaces the list when an item is selected.
- **Creation Flow:** Use a modal or a dedicated "Add" screen to avoid cluttering the list.

## Don't Hand-Roll
- **Authentication Persistence:** Use the custom adapter we already built for `chrome.storage.local`.
- **Form Validation:** Use standard HTML5 validation or simple regex for email/URL; don't bring in heavy libraries like Zod/Formik unless complexity increases significantly.

## Common Pitfalls
- **Zustand Over-renders:** Always use selectors.
- **Supabase Connection Latency:** Show loading states (skeletons) for every data fetch.
- **RLS Silent Failures:** If RLS is misconfigured, queries might return empty arrays instead of errors. Always verify data existence after a "successful" query.
- **Concurrency:** Ensure `is_active: true` is only set for one profile. Use a Supabase RPC function or a controlled client-side transaction logic.

## Code Examples

### RLS SQL
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own profiles"
ON profiles FOR ALL
USING (auth.uid() = user_id);
```

### Zustand Selector Hook
```typescript
export const useActiveProfile = () => useStore((state) => state.activeProfile);
```

---

*Phase: 02-data-management*
*Research complete: 2026-05-15*
