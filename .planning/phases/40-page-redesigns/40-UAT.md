---
status: testing
phase: 40-page-redesigns
source: 40-01-SUMMARY.md, 40-02-SUMMARY.md, 40-03-SUMMARY.md
started: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 9
name: Analyses Empty State CTA
expected: |
  When there are 0 analyses, the Analyses page shows a primary "Open Flatfox →" button and a secondary "Download extension" link. The filter bar (all/newest dropdowns) is hidden.
awaiting: user response

## Tests

### 1. New Profile button → chooser dialog
expected: Clicking "New Profile" in the top navbar opens a dialog with two cards — AI-Powered (Recommended) and Manual. AI → navigates to chat. Manual → opens a name input dialog.
result: pass

### 2. Navbar order — Home, Top Matches, New Profile, Profiles, Analyses, Settings
expected: The top navbar items appear in this left-to-right order: Home, Top Matches, New Profile, Profiles, Analyses, Settings.
result: pass

### 3. Profile Card Last-Used Date
expected: On the Profiles page, each profile card shows a "Last used [date]" line below the profile description (e.g. "Last used Apr 1"). The date should appear for all cards — active and inactive.
result: pass

### 4. Profile Card Active Ring (no star icon)
expected: The currently active/default profile card has a visible colored ring border around the entire card at all times. Inactive cards have no ring (or a subtle ring only on hover). There is no star icon anywhere on any profile card.
result: pass

### 5. Analysis Cards — Colored Score Circle
expected: On the Analyses page, each analysis card shows a colored filled circle with the score number inside (matching the extension — red for Poor, amber for Fair, blue for Good, emerald for Excellent). The tier label below the circle is colored to match. No pill badge or left-edge bar.
result: pass

### 6. Chat Empty State Splash Heading
expected: When opening the chat page before sending any message, a centered "Create a Profile" heading is visible in the message area. Once a message is sent and appears, the splash heading disappears.
result: pass

### 7. Dashboard — Returning User View
expected: A user with existing profiles sees their active profile name, last-used date, and an "Open Flatfox" CTA on the home page. Recent analyses and top matches summaries are also visible.
result: pass

### 8. Dashboard — Animations
expected: On the dashboard home page, the ActiveProfileCard, top matches summary, and recent analyses sections fade in sequentially on page load (not on scroll).
result: pass

### 9. Analyses page empty state CTA
expected: When there are no analyses, the analyses page shows an "Open Flatfox →" primary button and a secondary "Download extension" link.
result: [pending]

### 10. Profile edit — Save & Open Flatfox button
expected: On the profile edit/preferences page, a full-width "Save & Open in Flatfox →" button is visible at the bottom of the form.
result: [pending]

## Summary

total: 10
passed: 1
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
