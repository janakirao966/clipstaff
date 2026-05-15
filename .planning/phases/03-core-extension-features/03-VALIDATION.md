---
phase: 3
slug: core-extension-features
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Verification of clipboard content

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TOAST-INST | — | Sonner installed and working | smoke | `npm run build` | ✅ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | ACTN-01 | T-03-01 | Values are trimmed before copy | unit | `npm test src/lib/clipboard.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | CONT-STRUC | T-03-02 | Content script injected | smoke | `ls dist/assets/content.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Click-to-copy Toast | ACTN-02 | Visual confirmation | Click a field, verify toast appears at bottom. |
| Dual Icon Feedback | SIDE-03 | Animation/Visual | Click copy, verify icon swaps to Check and back. |
| Background Proxy | CONT-STRUC | IPC Verification | Check console log for "Ping/Pong" message. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-15
