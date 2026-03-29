---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: Defining requirements
last_updated: "2026-03-29"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.
**Current focus:** Milestone v5.0 — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-29 — Milestone v5.0 started

## Accumulated Context

### Key decisions carried from v4.1

- Framer Motion (motion/react v12) — whileInView + useInView patterns established
- TIER_COLORS defined locally in SectionHero (not imported cross-workspace)
- scoreColor helper: green #10b981 (≥80), yellow #f59e0b (60-79), red #ef4444 (<60)
- Poor tier = red (#ef4444) unified across landing and extension

### v5.0 Architecture Decisions

- Hybrid scoring: deterministic formulas (price/distance/size/binary) + Claude subjective only
- Claude must never generate an overall_score or category scores — only fulfillment ∈ {0.0…1.0} + reasoning for subjective criteria
- Weights: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 (replaces old 90/70/50/30 scale)
- CRITICAL f=0 → force match_tier="poor" (no formula change, just tier override)
- Missing data → skip criterion in aggregation (not f=0.5)
- Criterion type stored on DynamicField at profile save (not classified per-score-call)
- proximity_quality: hybrid formula f = min(1.0, exp(-1×Δ/r) + min(0.2, (rating-3)/10))
- Binary features: normalized mapping layer first, Claude fallback for fuzzy match only
- ScoreResponse schema changes: categories list removed, per-criterion fulfillment added
- Score cache version bump required on deploy

### Blockers/Concerns

- None
