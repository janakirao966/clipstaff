---
status: incomplete
---

# Audit-Fix: Persistence for Resume Text

## Objective
Ensure that the pasted resume text and other UI states are persisted across extension close/reopen.

## Audit Results
- `useStore.ts` uses a standard Zustand store without any persistence middleware.
- Closing the side panel destroys the React root and all in-memory state.

## Fix Strategy
1.  Implement `persist` middleware in `useStore.ts`.
2.  Use `localStorage` as the storage engine (standard for side panels).
3.  Whitelist `resumeText`, `activeProfile`, and `searchTerm` for persistence.

## Verification
- [ ] Verify `useStore.ts` changes.
- [ ] Run build.
- [ ] Test persistence by reloading state.
