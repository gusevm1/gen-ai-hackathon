---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Landing Page v2 & Hackathon Credits
status: planning
stopped_at: Completed 27-01 (CriterionType enum + test_classifier scaffold)
last_updated: "2026-03-29T22:31:36.218Z"
last_activity: 2026-03-29 -- Roadmap created for v5.0 (Phases 27-32)
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 11
  completed_plans: 9
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v5.0 -- Phase 27 ready to plan

## Current Position

Phase: 27 of 32 (Data Model & Criterion Classifier)
Plan: 01 COMPLETE (27-01: CriterionType enum + test scaffold)
Status: In Progress
Last activity: 2026-03-29 -- 27-01 complete: CriterionType enum, v5.0 weight scale, test_classifier scaffold

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3 minutes
- Total execution time: 3 minutes

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 27    | 01   | 3 min    | 2     | 3     |

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

### Blockers/Concerns

- None

## Session Continuity

Last session: 2026-03-29T22:31:36.215Z
Stopped at: Completed 27-01 (CriterionType enum + test_classifier scaffold)
Resume file: .planning/phases/27-data-model-criterion-classifier/27-01-SUMMARY.md
