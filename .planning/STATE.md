---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Landing Page v2 & Hackathon Credits
status: executing
stopped_at: Phase 28 context gathered
last_updated: "2026-03-30T05:03:39.924Z"
last_activity: "2026-03-29 -- 27-03 complete: criterionType on dynamicFieldSchema, classify-criteria injected in saveProfilePreferences + createProfileWithPreferences"
progress:
  total_phases: 9
  completed_phases: 6
  total_plans: 11
  completed_plans: 11
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v5.0 -- Phase 27 ready to plan

## Current Position

Phase: 27 of 32 (Data Model & Criterion Classifier)
Plan: 03 COMPLETE (27-03: criterionType Zod schema + classify-criteria server action injection)
Status: In Progress
Last activity: 2026-03-29 -- 27-03 complete: criterionType on dynamicFieldSchema, classify-criteria injected in saveProfilePreferences + createProfileWithPreferences

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

### Blockers/Concerns

- None

## Session Continuity

Last session: 2026-03-30T05:03:39.909Z
Stopped at: Phase 28 context gathered
Resume file: .planning/phases/28-deterministic-scorer/28-CONTEXT.md
