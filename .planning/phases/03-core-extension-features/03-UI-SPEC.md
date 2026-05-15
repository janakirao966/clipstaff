---
phase: 3
slug: core-extension-features
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-15
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for clipboard and notification features.

---

## Design System

| Property | Value |
|----------|-------|
| Notification Tool | Sonner |
| Icon library | Lucide React |

---

## Typography (Feedback)

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Toast Title | 14px | 600 | 1.2 |
| Toast Body | 12px | 400 | 1.4 |

---

## Color (Feedback)

| Role | Value | Usage |
|------|-------|-------|
| Success Toast | #10B981 | Confirmation of copy |
| Info Toast | #3B82F6 | System messages |
| Warning Toast | #F59E0B | Connection issues |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Copy Confirmation | {Field Name} copied to clipboard! |
| Error Toast | Failed to copy. Try again. |
| Connection Info | Connected to active tab. |

---

## Interaction Contract

### Click-to-copy
1. **Trigger:** Click on any profile field value or the copy icon.
2. **Local Feedback:**
   - Swap icon to `Check` (color: #10B981).
   - Duration: 2000ms before swapping back to `Copy`.
3. **Global Feedback:**
   - Display Sonner toast at bottom-center.
   - Message: "{Field} copied!"

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS

**Approval:** pending 2026-05-15
