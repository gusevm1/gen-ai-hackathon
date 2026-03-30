---
phase: 31-hybrid-scorer-router-integration
plan: 02
subsystem: api
tags: [fastapi, scoring-router, hybrid-pipeline, openrouter, deterministic-scoring]

# Dependency graph
requires:
  - phase: 31-hybrid-scorer-router-integration
    plan: 01
    provides: "profile_adapter, hybrid_scorer, CriterionResult model, ScoreResponse v2"
  - phase: 28-deterministic-scoring-engine
    provides: "FulfillmentResult, score_price/distance/size/binary/proximity functions, synthesize_builtin_results"
  - phase: 29-subjective-scorer-openrouter
    provides: "ClaudeScorer (OpenRouter-based) returning FulfillmentResults + summary_bullets"
  - phase: 30-database-infrastructure-prep
    provides: "listing_profiles table, fulfillment_data column (migration 007)"
provides:
  - "Full hybrid scoring pipeline in scoring router: profile lookup -> deterministic + subjective -> aggregate -> ScoreResponse v2"
  - "ALLOW_CLAUDE_FALLBACK env var gating for graceful degradation"
  - "enrichment_status=unavailable response when no ListingProfile and no fallback"
  - "Updated OpenRouter model constant to google/gemini-2.5-flash-lite"
affects: [31-03, 32-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [hybrid-pipeline-orchestration, env-var-gated-fallback, fire-and-forget-save]

key-files:
  created: []
  modified:
    - backend/app/routers/scoring.py
    - backend/app/services/openrouter.py

key-decisions:
  - "Fallback pipeline also uses hybrid aggregation (deterministic + subjective) not just Claude alone"
  - "enrichment_status='fallback' for Claude fallback path to distinguish from 'available' (profile-based)"
  - "Analysis save uses asyncio.create_task for fire-and-forget (non-blocking)"
  - "Distance resolution matches field name words against proximity_data keys (word-in-key matching)"

patterns-established:
  - "Pipeline orchestration: router delegates to _score_with_profile (happy) vs _fallback_claude_pipeline (degraded)"
  - "Fire-and-forget save: asyncio.create_task wraps the DB write so scoring response returns immediately"
  - "Three enrichment_status values: 'available' (profile), 'fallback' (Claude), 'unavailable' (no data)"

requirements-completed: [INT-03, INT-04, INT-05]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 31 Plan 02: Scoring Router & OpenRouter Model Update Summary

**Hybrid scoring router orchestrating profile lookup, deterministic + subjective scoring, weighted aggregation, and graceful degradation via ALLOW_CLAUDE_FALLBACK env var**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T15:21:03Z
- **Completed:** 2026-03-30T15:23:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated OPENROUTER_MODEL constant from google/gemini-2.0-flash-001 to google/gemini-2.5-flash-lite (Gemini 2.0 deprecated June 2026)
- Rewrote scoring router with full hybrid pipeline: cache check -> ListingProfile lookup -> adapt -> deterministic scoring (built-in + dynamic fields) -> subjective scoring (OpenRouter) -> weighted aggregation -> ScoreResponse v2
- Added graceful degradation: enrichment_status="unavailable" when no ListingProfile and ALLOW_CLAUDE_FALLBACK=false (INT-04)
- Preserved old Claude pipeline behind ALLOW_CLAUDE_FALLBACK=true gate, also upgraded to use hybrid aggregation

## Task Commits

Each task was committed atomically:

1. **Task 1: Update OpenRouter model constant** - `92334a8` (chore)
2. **Task 2: Rewrite scoring router for hybrid pipeline** - `ee4645c` (feat)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified
- `backend/app/services/openrouter.py` - Updated OPENROUTER_MODEL from google/gemini-2.0-flash-001 to google/gemini-2.5-flash-lite
- `backend/app/routers/scoring.py` - Complete rewrite: hybrid pipeline with _score_with_profile(), _fallback_claude_pipeline(), _resolve_distance_km(), _save_analysis_fire_and_forget()

## Decisions Made
- Fallback pipeline also runs hybrid aggregation (deterministic + subjective + weighted score) rather than the old placeholder overall_score=0. This means even fallback responses get proper scores.
- Used three distinct enrichment_status values: "available" (profile-based happy path), "fallback" (Claude fallback path), "unavailable" (no data, no fallback). This gives the frontend visibility into scoring quality.
- Analysis save moved to asyncio.create_task fire-and-forget pattern instead of inline await, so the scoring response returns immediately without waiting for the DB write.
- Distance resolution helper matches words from field name against proximity_data keys (e.g., "supermarket" in field name matches "supermarket" key in proximity data).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scoring router fully wired to all Plan 01 building blocks (profile_adapter, hybrid_scorer, deterministic_scorer)
- Ready for Plan 03 (edge function cache + schema_version filtering)
- ALLOW_CLAUDE_FALLBACK=false already set on EC2 (Phase 30)
- 164 listing profiles in production ready for testing

## Self-Check: PASSED

All 2 modified files verified present on disk. All 2 task commits verified in git log.

---
*Phase: 31-hybrid-scorer-router-integration*
*Completed: 2026-03-30*
