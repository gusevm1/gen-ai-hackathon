---
status: partial
phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix
source: [33-VERIFICATION.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual layout — two-card chooser on /dashboard
expected: Two cards side-by-side (stacked on mobile): left card shows ClipboardList icon + "Manual profile creation" + description; right card shows Sparkles icon + "AI-guided profile creation" + description. Both cards have visible hover states (border + shadow).
result: [pending]

### 2. Manual profile creation flow from /dashboard
expected: Clicking Manual card opens name dialog; entering a name and clicking Create closes the dialog and navigates directly to /profiles/[new-id] edit page — not to the profiles list.
result: [pending]

### 3. Download page shows full TopNavbar at /download
expected: Full TopNavbar visible with 6 items (Home, AI-Powered Search, Profiles, Analyses, Download, Settings); Download item highlighted as active.
result: [pending]

### 4. English listing titles on new analyses
expected: After scoring a Flatfox listing that has both German description_title and English short_title, the analysis card in /analyses shows the English short_title.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
