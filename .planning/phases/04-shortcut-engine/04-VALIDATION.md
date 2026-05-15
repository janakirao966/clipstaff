---
phase: 4
slug: shortcut-engine
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for the shortcut expansion engine.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `npm test -- --run` |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After logic implementation:** Run `npm test` for the expansion parser.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | EXPN-DATA | — | Sync logic correctly populates cache | unit | `npm test src/lib/sync.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | EXPN-01 | T-04-01 | Parser correctly identifies `/name` | unit | `npm test src/lib/parser.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | EXPN-02 | T-04-02 | Expansion occurs in < 150ms | smoke | `npm run build` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Space Trigger | EXPN-01 | DOM Interaction | Type `/email` then SPACE in a Google form. |
| Enter Trigger | EXPN-01 | DOM Interaction | Type `/phone` then ENTER in a textarea. |
| Framework Compatibility | EXPN-02 | Third-party state | Verify expansion works in a React-based input (e.g. Indeed). |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-15
