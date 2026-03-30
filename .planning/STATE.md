---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: executing
stopped_at: Roadmap adjusted for phases 29-32 (OpenRouter + ListingProfile integration)
last_updated: "2026-03-30"
last_activity: 2026-03-30
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Phase 29 — Subjective Scorer (OpenRouter) [ready to plan]

## Current Position

Phase: 29 of 32 (Subjective Scorer — OpenRouter)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-30 — Roadmap adjusted, phases 27-28 marked complete, 29-32 updated

Progress: [###-------] 33% (phases 27-28 complete, 33 complete out-of-band)

## Performance Metrics

**Velocity:**
- Total plans completed: 7 (27: 3 plans, 28: 2 plans, 33: 2 plans)
- Average duration: --
- Total execution time: --

## Accumulated Context

### v5.0 Architecture Decisions

- Hybrid scoring: deterministic formulas (price/distance/size/binary) + OpenRouter subjective
- **Phase 29 uses OpenRouter (not Claude messages.parse())** -- configurable via SUBJECTIVE_MODEL env var
- SubjectiveResponse model + batched OpenRouter call + summary_bullets in same call
- Claude must never generate an overall_score or category scores
- Weights: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1
- CRITICAL f=0 forces match_tier="poor", caps score at 39
- Missing data: skip criterion in aggregation (not f=0.5)
- DB-01 (schema_version) must deploy BEFORE hybrid scorer ships (Phase 30 before Phase 31)
- ScoreResponse v2: categories removed, per-criterion fulfillment added, field names preserved
- ALLOW_CLAUDE_FALLBACK=false by default; old Claude path preserved behind gate
- ListingProfile lookup + profile_adapter.py bridges to FlatfoxListing format (Phase 28 scorer unmodified)
- OpenRouter model constant: google/gemini-2.5-flash-lite (Gemini 2.0 Flash deprecated June 2026)
- Edge function cache must also check schema_version (pitfall from research)

### Phase Ordering

- Phase 29 and 30 can run in parallel (no dependency between them)
- Phase 31 depends on BOTH 29 and 30
- Phase 32 depends on 31

### Blockers/Concerns

- Gemini 2.5 Flash Lite structured output support untested -- verify during Phase 29
- Only 27 pre-enriched listings (zipcode 8051) -- Phase 31 must handle "no ListingProfile" gracefully

## Session Continuity

Last session: 2026-03-30
Stopped at: Roadmap adjusted for v5.0 phases 29-32
Resume file: None
