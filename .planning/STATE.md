---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: executing
stopped_at: Completed 29-01-PLAN.md (subjective models and prompts)
last_updated: "2026-03-30"
last_activity: 2026-03-30
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 9
  completed_plans: 8
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Phase 29 — Subjective Scorer (OpenRouter) [executing]

## Current Position

Phase: 29 of 32 (Subjective Scorer — OpenRouter)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-03-30 — Completed Plan 01 (subjective models & prompts)

Progress: [####------] 38% (phases 27-28 complete, 33 complete out-of-band, 29 plan 1/2)

## Performance Metrics

**Velocity:**
- Total plans completed: 8 (27: 3 plans, 28: 2 plans, 33: 2 plans, 29: 1 plan)
- Average duration: --
- Total execution time: --

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 29    | 01   | 5min     | 2     | 4     |

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
- Named model SubjectiveResponse (not ClaudeSubjectiveResponse) since provider is OpenRouter
- JSON schema embedded in system prompt for OpenRouter (no auto-schema injection like Anthropic SDK)
- Bullets-only prompt pattern for cases with no subjective criteria

### Phase Ordering

- Phase 29 and 30 can run in parallel (no dependency between them)
- Phase 31 depends on BOTH 29 and 30
- Phase 32 depends on 31

### Blockers/Concerns

- Gemini 2.5 Flash Lite structured output support untested -- verify during Phase 29
- Only 27 pre-enriched listings (zipcode 8051) -- Phase 31 must handle "no ListingProfile" gracefully

## Session Continuity

Last session: 2026-03-30
Stopped at: Completed 29-01-PLAN.md (subjective models & prompts)
Resume file: None
