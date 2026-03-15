---
phase: 07-preferences-schema-unification
plan: 02
subsystem: api
tags: [claude-prompt, importance-levels, dealbreaker, scoring, pydantic]

# Dependency graph
requires:
  - phase: 07-preferences-schema-unification
    plan: 01
    provides: Canonical Pydantic UserPreferences with ImportanceLevel enum and IMPORTANCE_WEIGHT_MAP
provides:
  - Claude system prompt with DEALBREAKER RULES and IMPORTANCE LEVELS sections
  - Claude user prompt with human-readable importance labels and HARD LIMIT flags
  - Helper functions for importance formatting and dealbreaker section generation
affects: [08-layout-navigation, 09-preferences-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [importance-level labels in Claude prompt, conditional dealbreaker sections, range formatting helpers]

key-files:
  created: []
  modified:
    - backend/app/prompts/scoring.py
    - backend/tests/test_prompts.py

key-decisions:
  - "Inline DEALBREAKER label on budget/rooms/living-space lines plus separate HARD LIMIT section for thresholds"
  - "Dealbreaker line omitted when toggle is True but threshold value is None"
  - "Importance levels emitted as uppercase labels (CRITICAL/HIGH/MEDIUM/LOW) in user prompt"

patterns-established:
  - "_format_importance_section helper renders importance as uppercase enum labels"
  - "_format_dealbreakers_section conditionally emits HARD LIMIT block only when dealbreakers are active with thresholds"
  - "_fmt_range helper for consistent None-safe numeric range formatting"

requirements-completed: [PREF-14]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 7 Plan 02: Claude Prompt Update Summary

**Claude scoring prompts rewritten with DEALBREAKER RULES (score 0 + poor tier), IMPORTANCE LEVELS (critical=90/high=70/medium=50/low=30), and HARD LIMIT flags replacing numeric weights**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T14:53:38Z
- **Completed:** 2026-03-13T14:56:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- System prompt includes DEALBREAKER RULES section instructing Claude to score 0 and set "poor" tier on dealbreaker violations
- System prompt includes IMPORTANCE LEVELS section with weight mapping (critical=90, high=70, medium=50, low=30)
- User prompt emits importance levels as human-readable CRITICAL/HIGH/MEDIUM/LOW labels instead of numeric weights
- User prompt conditionally shows HARD LIMIT dealbreaker section only when dealbreakers are active with thresholds
- User prompt includes floor preference and availability fields
- Full regression: 76 backend tests + 38 web tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for importance levels and dealbreaker prompts** - `721d9d3` (test)
2. **Task 1 (GREEN): Update Claude prompts with importance levels and dealbreaker semantics** - `16aaacd` (feat)
3. **Task 2: Endpoint tests and full regression** - no changes needed (all tests pass with existing code)

_Task 1 followed TDD flow: RED (7 failing tests) -> GREEN (implementation passing all 16 tests)._

## Files Created/Modified
- `backend/app/prompts/scoring.py` - Rewritten system prompt with DEALBREAKER RULES and IMPORTANCE LEVELS; rewritten user prompt with importance labels, HARD LIMIT flags, floor preference, availability; new helpers _fmt_range, _format_importance_section, _format_dealbreakers_section
- `backend/tests/test_prompts.py` - 7 new tests for dealbreaker rules, importance levels, HARD LIMIT flags, floor preference, availability, no-numeric-weights, budget-no-max edge case

## Decisions Made
- **Inline + section approach for dealbreakers:** Budget/rooms/living-space lines get "(DEALBREAKER)" inline label, plus a separate "Dealbreakers (score 0 if violated)" section lists thresholds with "(HARD LIMIT)". This gives Claude both context and explicit rules.
- **Skip dealbreaker line when no threshold:** If budget_dealbreaker=True but budget_max is None, the budget HARD LIMIT line is omitted since there is no enforceable threshold.
- **Uppercase importance labels:** Importance levels are emitted as uppercase strings (CRITICAL, HIGH, MEDIUM, LOW) for maximum visibility to Claude.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scoring pipeline fully updated: prompts consume importance levels and dealbreaker toggles from the canonical schema
- Phase 8 (layout/navigation) and Phase 9 (preferences UI) can proceed
- Web app UI components (weight-sliders.tsx, soft-criteria.tsx) still reference old schema fields -- Phase 9 will rebuild these

## Self-Check: PASSED

All 2 modified files verified on disk. Both task commits (721d9d3, 16aaacd) verified in git log. No old "Category weights (0-100" format remains in scoring.py. DEALBREAKER, IMPORTANCE LEVELS, HARD LIMIT, Floor preference, Availability all present.

---
*Phase: 07-preferences-schema-unification*
*Completed: 2026-03-13*
