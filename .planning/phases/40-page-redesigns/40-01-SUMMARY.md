---
phase: 40-page-redesigns
plan: "01"
subsystem: profiles
tags: [profile-card, ring, last-used, tdd, PG-01, PG-02]

# Dependency graph
requires:
  - phase: 40-page-redesigns
    plan: "00"
    provides: RED test scaffold for PG-01 and PG-02

provides:
  - "ProfileData interface with updated_at field"
  - "formatLastUsed() helper returning short month/day format"
  - "ProfileCard active ring (ring-2 ring-primary) replaces star icon"
  - "Last-used date row below CardDescription"
  - "Supabase query selects updated_at from profiles table"

affects:
  - "web/src/components/profiles/profile-card.tsx"
  - "web/src/app/(dashboard)/profiles/page.tsx"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cn() conditional className for active vs inactive ring state"
    - "formatLastUsed() using toLocaleDateString for short date format"

key-files:
  created: []
  modified:
    - web/src/components/profiles/profile-card.tsx
    - web/src/app/(dashboard)/profiles/page.tsx

key-decisions:
  - "cn() used for conditional ring className — cleaner than template string ternary"
  - "Star import removed entirely (not just conditionally hidden) — no dead code"
  - "Last-used date rendered as plain <p> (not CardDescription) to keep semantic structure"
  - "formatLastUsed placed above buildSummaryLine — both are pure formatting helpers"

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 40 Plan 01: Profile Card Redesign Summary

**Active ring border (ring-2 ring-primary) replaces star icon on active profile; all cards show "Last used [date]" below summary using new updated_at field plumbed from Supabase query**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T07:36:56Z
- **Completed:** 2026-04-01T07:38:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `updated_at: string` to `ProfileData` interface in profile-card.tsx
- Added `formatLastUsed()` pure helper function (toLocaleDateString, en-US, short month/day)
- Updated Supabase select in profiles/page.tsx to include `updated_at`
- Replaced static `hover:ring-2 hover:ring-primary/10` Card className with cn() conditional:
  - Active (is_default=true): `ring-2 ring-primary` (static, always visible)
  - Inactive (is_default=false): `hover:ring-2 hover:ring-primary/10` (hover-only)
- Removed `Star` import and star icon block from CardTitle entirely
- Added "Last used {date}" `<p>` row below `<CardDescription>` using `formatLastUsed(profile.updated_at)`
- Added `cn` import from `@/lib/utils`
- All 4 profile-card.test.tsx tests GREEN (PG-01: last-used date, PG-02: active ring, PG-02: inactive no ring, PG-02: star removed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update ProfileData interface and add updated_at to server query** - `0e774e4` (feat)
2. **Task 2: Redesign card visuals — active ring + last-used date row + remove star** - `b9e496f` (feat)

## Files Created/Modified

- `web/src/components/profiles/profile-card.tsx` — updated_at in interface, formatLastUsed helper, cn() conditional ring, star removed, last-used date row added
- `web/src/app/(dashboard)/profiles/page.tsx` — Supabase select now includes updated_at

## Decisions Made

- `cn()` from `@/lib/utils` used for conditional ring className — avoids messy template string ternary
- Star import removed entirely (not conditionally hidden) — no dead code in final file
- Last-used date rendered as plain `<p>` below `<CardDescription>` — preserves semantic card structure
- `formatLastUsed` placed above `buildSummaryLine` — both are pure formatting helpers, grouped logically

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing test failures in other files (analyses-grid, chat-page, landing-page, top-navbar) are intentional RED scaffolds from Phase 40 Wave 0 and earlier phases — not regressions from this plan.

## User Setup Required

None.

## Next Phase Readiness

- PG-01 and PG-02 requirements fulfilled and verified GREEN
- Plan 40-02 (AnalysesGrid tier bar) can proceed — no dependency on profile card changes

## Self-Check: PASSED

Files exist:
- web/src/components/profiles/profile-card.tsx: FOUND
- web/src/app/(dashboard)/profiles/page.tsx: FOUND

Commits exist:
- 0e774e4: FOUND (feat(40-01): add updated_at to ProfileData interface)
- b9e496f: FOUND (feat(40-01): redesign profile card)

---
*Phase: 40-page-redesigns*
*Completed: 2026-04-01*
