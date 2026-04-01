---
phase: 40-page-redesigns
plan: "02"
subsystem: web/analyses
tags: [card-redesign, tier-colors, ux, analyses-grid]
dependency_graph:
  requires: [40-00]
  provides: [PG-05, PG-06]
  affects: [web/src/components/analyses/AnalysesGrid.tsx]
tech_stack:
  added: []
  patterns: [border-l-4 tier color bar, two-column card layout, text-3xl score display]
key_files:
  modified:
    - web/src/components/analyses/AnalysesGrid.tsx
decisions:
  - TIER_STYLES extended with border property (border-teal/green/amber/red-500) alongside existing bg/text — minimal change to existing map structure
  - border-l-4 combined with tierStyle.border on Card className — Shadcn Card base border (1px all-around) is overridden only on the left side to 4px, intentional per design
  - Score moved from rounded-full pill to text-3xl span in two-column left column — makes tier + score the primary visual signals
  - Standalone tier label span (below old flex row) removed and relocated inside the left column alongside score
metrics:
  duration: "2 min"
  completed_date: "2026-04-01"
  tasks_completed: 1
  files_modified: 1
---

# Phase 40 Plan 02: Analysis Card Redesign Summary

**One-liner:** Two-column card layout with 4px left-edge tier color bar (border-l-4) and large text-3xl score number replacing the old rounded-full pill badge.

## What Was Built

Redesigned `AnalysesGrid.tsx` analysis cards from a "pill badge top-right" layout to a scannable two-column layout:

- Left column: large score number (`text-3xl font-bold`) + tier label below
- Right column: property title + address (unchanged content, new position)
- Left edge: 4px colored border bar using `border-l-4` + `tierStyle.border` (teal/green/amber/red per tier)
- Footer row (profile name + date) unchanged

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Two-column card layout with tier bar (PG-05, PG-06) | a8023c1 | web/src/components/analyses/AnalysesGrid.tsx |

## Verification Results

- analyses-grid.test.tsx: 3/3 tests GREEN (PG-05 border-l-4 + border-teal-500, PG-06 text-3xl score, PG-06 no rounded-full)
- TypeScript: no new errors introduced (pre-existing errors in unrelated test files)
- Full suite: 239 passed, 18 pre-existing failures (documented in Phase 38 decisions — not regressions)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `web/src/components/analyses/AnalysesGrid.tsx` exists and modified
- [x] Commit a8023c1 exists
- [x] All 3 analyses-grid tests GREEN
- [x] No rounded-full in card markup
- [x] border-l-4 and border-teal-500 present on Card for excellent tier
- [x] Score rendered as text-3xl in left column
