---
phase: 40-page-redesigns
plan: "00"
subsystem: testing
tags: [vitest, react-testing-library, tdd, nyquist, wave-0]

# Dependency graph
requires:
  - phase: 37-design-system-propagation
    provides: AnalysesGrid, FadeIn, StaggerGroup components under test
  - phase: 38-onboarding-rebuild
    provides: ChatPage component under test
  - phase: 39-critical-handoffs
    provides: stable component interfaces for ProfileCard, AnalysesGrid

provides:
  - "Failing test scaffold for ProfileCard PG-01 (last-used date) and PG-02 (active ring, star removal)"
  - "Failing test scaffold for AnalysesGrid PG-05 (border-l-4 tier bar) and PG-06 (text-3xl score, no pill)"
  - "Failing tests for ChatPage PG-03 (splash heading) and PG-04 (FadeIn wrapper on summary card)"

affects:
  - 40-01
  - 40-02
  - 40-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 Nyquist scaffold: all implementation tests written RED before implementation begins"
    - "Lucide icon class selector: container.querySelector('svg.lucide-{name}') for icon presence tests"
    - "Static vs hover class filtering: split className on spaces and filter hover: prefixed entries for ring assertion"

key-files:
  created:
    - web/src/__tests__/profile-card.test.tsx
    - web/src/__tests__/analyses-grid.test.tsx
  modified:
    - web/src/__tests__/chat-page.test.tsx

key-decisions:
  - "Static ring check uses className.split(' ').filter(cls => !cls.startsWith('hover:')) to distinguish hover:ring-2 from static ring-2"
  - "FadeIn mock renders <div data-testid='fade-in'>{children}</div> so Plan 04 tests are implementation-agnostic"
  - "PreferenceSummaryCard mocked to <div data-testid='summary-card'/> — prevents heavy dependency chain in test"
  - "StaggerGroup/StaggerItem mocked as pass-through divs in analyses-grid.test to isolate Card rendering"

patterns-established:
  - "Wave 0 scaffold: RED tests written against intended interface shape, not current shape"
  - "chat-page.test.tsx extended by appending — existing passing tests must remain GREEN"

requirements-completed:
  - PG-01
  - PG-02
  - PG-03
  - PG-04
  - PG-05
  - PG-06

# Metrics
duration: 4min
completed: 2026-04-01
---

# Phase 40 Plan 00: Page Redesigns Wave 0 Summary

**RED test scaffolds for 6 Phase 40 requirements across 3 files — profile ring/date, analyses tier bar/score layout, chat splash heading/FadeIn wrapper**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T07:29:32Z
- **Completed:** 2026-04-01T07:33:01Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created profile-card.test.tsx with 4 tests: PG-01 last-used date label (RED), PG-02 active ring static class (RED), PG-02 inactive no ring (GREEN baseline), PG-02 star icon removed (RED)
- Created analyses-grid.test.tsx with 3 tests: PG-05 border-l-4 tier bar (RED), PG-06 text-3xl score (RED), PG-06 no rounded-full pill (RED)
- Extended chat-page.test.tsx with 2 new tests: PG-03 "Create a Profile" heading (RED), PG-04 FadeIn wrapper on summary card (RED)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create profile-card.test.tsx scaffold (PG-01, PG-02)** - `d99bd1b` (test)
2. **Task 2: Create analyses-grid.test.tsx scaffold (PG-05, PG-06)** - `9d68f06` (test)
3. **Task 3: Extend chat-page.test.tsx with PG-03 + PG-04 tests** - `3b408dc` (test)

## Files Created/Modified
- `web/src/__tests__/profile-card.test.tsx` - 4-test scaffold for ProfileCard PG-01/PG-02; mocks language-context, translations, open-in-flatfox-button, next/navigation
- `web/src/__tests__/analyses-grid.test.tsx` - 3-test scaffold for AnalysesGrid PG-05/PG-06; mocks next/link, translations, StaggerGroup/StaggerItem
- `web/src/__tests__/chat-page.test.tsx` - 2 new tests appended for PG-03/PG-04; added vi.mock for FadeIn and PreferenceSummaryCard

## Decisions Made
- Static ring check filters hover: prefixed classes — current Card has `hover:ring-2 hover:ring-primary/10` which would incorrectly satisfy `toContain('ring-2')` without filtering
- FadeIn mock uses `data-testid="fade-in"` for implementation-agnostic detection (Plan 04 only needs to wrap with FadeIn, not a specific variant)
- PreferenceSummaryCard mocked with `data-testid="summary-card"` to avoid deep dependency chain loading in jsdom
- StaggerGroup/StaggerItem pass-through mocks ensure AnalysesGrid tests are not blocked by motion library jsdom incompatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Active ring test strengthened to filter hover: classes**
- **Found during:** Task 1 (ProfileCard test verification)
- **Issue:** First iteration of PG-02 active ring test used plain `className.toContain('ring-2')` which passed GREEN incorrectly — the current Card has `hover:ring-2` which contains the substring `ring-2`
- **Fix:** Filter class list to exclude hover: prefixed classes before asserting static ring presence
- **Files modified:** web/src/__tests__/profile-card.test.tsx
- **Verification:** Test now correctly RED (failing) since no static ring-2 exists
- **Committed in:** d99bd1b (Task 1 commit, corrected before final commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test logic)
**Impact on plan:** Minor — test assertion corrected to accurately reflect intended RED state. No scope creep.

## Issues Encountered
None beyond the test logic correction above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 Phase 40 requirements (PG-01 through PG-06) have pre-written RED tests
- Wave 1 plans (40-01, 40-02, 40-03) can now proceed with confidence — each has a verify command
- Full test suite runs cleanly (30 files, no hangs or crashes)

## Self-Check: PASSED

All files exist and all task commits verified present.

---
*Phase: 40-page-redesigns*
*Completed: 2026-04-01*
