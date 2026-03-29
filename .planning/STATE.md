---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: Ready to plan
last_updated: "2026-03-29"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v5.0 -- Phase 27 ready to plan

## Current Position

Phase: 27 of 32 (Data Model & Criterion Classifier)
Plan: --
Status: Ready to plan
Last activity: 2026-03-29 -- Roadmap created for v5.0 (Phases 27-32)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: --
- Total execution time: --

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

### Blockers/Concerns

- None

## Session Continuity

Last session: 2026-03-29
Stopped at: Roadmap created for v5.0 milestone
Resume file: None
