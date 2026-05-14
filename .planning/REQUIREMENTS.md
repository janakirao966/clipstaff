# Requirements: ClipStaff

**Defined:** 2026-05-15
**Core Value:** A fast, minimal, keyboard-first tool that eliminates repetitive typing across job application workflows through shortcuts and smart clipboard access without relying on complex full-form autofill.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can log out
- [ ] **AUTH-04**: User session persists securely using JWT

### Profile Management

- [ ] **PROF-01**: User can create a new professional profile
- [ ] **PROF-02**: User can edit an existing profile's fields (Name, Email, Phone, LinkedIn, etc.)
- [ ] **PROF-03**: User can delete a profile
- [ ] **PROF-04**: User can set a profile as the "active" profile
- [ ] **PROF-05**: User can duplicate an existing profile

### Snippet Management

- [ ] **SNIP-01**: User can create a custom snippet mapping a shortcut to replacement text
- [ ] **SNIP-02**: User can edit existing snippets
- [ ] **SNIP-03**: User can delete snippets
- [ ] **SNIP-04**: User can search snippets by keyword
- [ ] **SNIP-05**: User can categorize snippets

### Sidebar UI

- [ ] **SIDE-01**: User can toggle the floating sidebar from any webpage
- [ ] **SIDE-02**: User can view their active profile's personal, experience, and education details
- [ ] **SIDE-03**: User can view a list of all their snippets in the sidebar
- [ ] **SIDE-04**: User can switch the active profile directly from the sidebar

### Extension Actions

- [ ] **ACTN-01**: User can click a field in the sidebar to copy its value to the clipboard
- [ ] **ACTN-02**: User receives a visual toast notification when text is copied
- [ ] **ACTN-03**: User can type a snippet shortcut followed by 'Tab', 'Enter', or 'Ctrl+Space' to expand it into the full text within active input/textarea fields
- [ ] **ACTN-04**: System correctly replaces text in modern web frameworks (React/Angular forms) by dispatching input events

## v2 Requirements

### Advanced Automation

- **AUTO-01**: System parses resume PDF to automatically populate profile fields
- **AUTO-02**: System can extract profile data directly from LinkedIn

### Collaboration

- **COLL-01**: Users can create team workspaces
- **COLL-02**: Users can share snippet libraries with team members
- **COLL-03**: Users can sync profiles and snippets to the cloud

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI autofill and Smart Field Detection | Too complex and unreliable for v1 MVP; stick to manual text expansion |
| Mobile Support | Workflow is heavily desktop-focused for recruiters |
| Voice Commands | Unnecessary complication for keyboard-first workflow MVP |
| Portal Templates | Defer to later phases once basic text expansion proves useful |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SIDE-01 | Phase 1 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| PROF-05 | Phase 2 | Pending |
| SNIP-01 | Phase 2 | Pending |
| SNIP-02 | Phase 2 | Pending |
| SNIP-03 | Phase 2 | Pending |
| SNIP-04 | Phase 2 | Pending |
| SNIP-05 | Phase 2 | Pending |
| SIDE-02 | Phase 2 | Pending |
| SIDE-03 | Phase 2 | Pending |
| SIDE-04 | Phase 2 | Pending |
| ACTN-01 | Phase 3 | Pending |
| ACTN-02 | Phase 3 | Pending |
| ACTN-03 | Phase 4 | Pending |
| ACTN-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-15 after definition*
