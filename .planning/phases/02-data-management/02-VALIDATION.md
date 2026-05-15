---
phase: 2
slug: data-management
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Created in Wave 0) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` to check types
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DB-INIT | T-02-01 | Supabase tables created | integration | `npx supabase db dump` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | RLS-POL | T-02-02 | RLS denies unauthorized | integration | `npx supabase db dump` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PROF-CRUD | — | Profile CRUD methods work | unit | `npm test src/lib/profiles.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | SNIP-CRUD | — | Snippet CRUD methods work | unit | `npm test src/lib/snippets.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` and `@vitest/ui` installed
- [ ] `src/lib/__tests__/` directory created
- [ ] Stubs for `profiles.test.ts` and `snippets.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar Navigation | SIDE-04 | Visual layout | Open sidebar, click "Profiles" and "Snippets" tabs. |
| Inline Editing | SIDE-03 | Interaction | Click a field, edit value, click away, verify persistence. |
| Snippet Search | SNIP-04 | Search latency/UI | Type in search bar, verify list filters instantly. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-15
