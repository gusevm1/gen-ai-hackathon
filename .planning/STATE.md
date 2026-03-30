---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Landing Page v2 & Hackathon Credits
status: executing
stopped_at: "Completed 28-01: Deterministic scorer TDD scaffold"
last_updated: "2026-03-30T06:17:21.257Z"
last_activity: "2026-03-29 -- 27-03 complete: criterionType on dynamicFieldSchema, classify-criteria injected in saveProfilePreferences + createProfileWithPreferences"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 13
  completed_plans: 13
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v5.0 -- Phase 27 ready to plan

## Current Position

Phase: 28 of 32 (Deterministic Scorer)
Plan: 01 COMPLETE (28-01: TDD scaffold — 6 test classes, 41 test methods for DS-01 through DS-06)
Status: In Progress
Last activity: 2026-03-30 -- 28-01 complete: test_deterministic_scorer.py scaffold committed (6 classes, 41 methods)

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5 minutes
- Total execution time: ~15 minutes

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 27    | 01   | 3 min    | 2     | 3     |
| 27    | 02   | 8 min    | 2     | 4     |
| 27    | 03   | 7 min    | 2     | 3     |
| Phase 28 P02 | 4 min | 3 tasks | 2 files |
| Phase 28 P01 | 5 | 1 tasks | 1 files |

## Accumulated Context

### Key decisions carried from v4.1

- Framer Motion (motion/react v12) -- whileInView + useInView patterns established
- TIER_COLORS defined locally in SectionHero (not imported cross-workspace)
- scoreColor helper: green #10b981 (>=80), yellow #f59e0b (60-79), red #ef4444 (<60)
- Poor tier = red (#ef4444) unified across landing and extension

### v5.0 Architecture Decisions

- Hybrid scoring: deterministic formulas (price/distance/size/binary) + Claude subjective only
- Claude must never generate an overall_score or category scores -- only fulfillment values + reasoning
- Weights: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1
- CRITICAL f=0 forces match_tier="poor", caps score at 39
- Missing data: skip criterion in aggregation (not f=0.5)
- Criterion type stored on DynamicField at profile save (not per-score-call)
- DB-01 (schema_version) must deploy BEFORE hybrid scorer ships (Phase 30 before Phase 31)
- ScoreResponse v2: categories removed, per-criterion fulfillment added, field names preserved

### Phase 27 Decisions (27-01)

- CriterionType enum uses snake_case member names matching string values (BINARY_FEATURE='binary_feature') for natural Python usage
- criterion_type is Optional[CriterionType]=None for backward compatibility with existing DynamicField JSONB records in Supabase
- IMPORTANCE_WEIGHT_MAP confirmed at 5/3/2/1 (matches v5.0 architecture decision above)

### Phase 27 Decisions (27-02)

- CLASSIFIER_MODEL uses its own env var (CLASSIFIER_MODEL) separate from CLAUDE_MODEL for independent model selection
- Unmatched criterion names default to CriterionType.SUBJECTIVE via dict.get() fallback (safe, not error)
- New DynamicField instances returned from classify_fields (not mutated in-place)

### Phase 27 Decisions (27-03)

- criterionTypeSchema is .optional() for backward compat with existing Supabase JSONB records that lack criterionType
- Classification failures are silently caught — profile save must always succeed regardless of EC2/classifier health (DM-02)
- EC2_API_URL used without NEXT_PUBLIC_ prefix — server actions only, never exposed to client bundle
- res.json() cast to { dynamicFields: typeof validated.dynamicFields } to satisfy TypeScript strict mode without loosening types

### Phase 28 Decisions (28-01)

- score_distance receives actual_km as explicit kwarg (not derived from listing coords) — keeps function pure and testable
- FulfillmentResult validates fulfillment in [0, 1] range via Pydantic field constraint — rejects values > 1.0
- proximity_data passed as dict keyed by field_name to score_proximity_quality (matches Phase 31 aggregator contract)
- criterion_name field on FulfillmentResult used as lookup key for budget/rooms/living_space built-in entries

### Blockers/Concerns

- None

## Session Continuity

Last session: 2026-03-30T06:17:21.253Z
Stopped at: Completed 28-01: Deterministic scorer TDD scaffold
Resume file: None
