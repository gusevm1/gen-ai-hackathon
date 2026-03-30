---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: in-progress
stopped_at: Completed 31-01-PLAN.md (scoring building blocks)
last_updated: "2026-03-30T15:18:30Z"
last_activity: 2026-03-30 — Completed Phase 31 Plan 01 (scoring building blocks)
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 15
  completed_plans: 14
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Phase 31 in progress — Hybrid Scorer & Router Integration (Plan 01 of 03 complete)

## Current Position

Phase: 31 of 32 (Hybrid Scorer & Router Integration)
Plan: 1 of 3 in current phase (complete)
Status: In progress
Last activity: 2026-03-30 — Completed Phase 31 Plan 01 (scoring building blocks)

Progress: [█████████░] 94% (phases 27-31 in progress, 33 complete out-of-band)

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (27: 3 plans, 28: 2 plans, 33: 2 plans, 29: 2 plans, 30: 1 plan, 31: 1 plan)
- Average duration: ~5min
- Total execution time: --

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 29    | 01   | 5min     | 2     | 4     |
| 29    | 02   | 4min     | 2     | 4     |
| 30    | 01   | 5min     | 3     | 3     |
| 31    | 01   | 2min     | 3     | 3     |

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
- Kept ClaudeScorer class name for minimal router diff; Phase 31 renames to SubjectiveScorer
- Router builds temp ScoreResponse with overall_score=0 for v1 backward compat until Phase 31
- criterion_type=None treated as subjective (Phase 27 design)

### Phase 31 Plan 01 Decisions

- CriterionResult model added to scoring.py with criterion_name, fulfillment, importance, weight, reasoning
- ScoreResponse v2: schema_version=2 default, criteria_results list, enrichment_status field; categories/checklist default to empty list
- summary_bullets max_length raised from 5 to 7 for flexibility
- profile_adapter: ListingProfile -> FlatfoxListing with type coercions (attributes list[str]->FlatfoxAttribute, rooms float->str)
- hybrid_scorer: weighted aggregation (HA-01), None exclusion (HA-02), CRITICAL cap at 39 (HA-03)
- Pre-computed amenity data always is_fallback=False in proximity_data format

### Phase Ordering

- Phase 29 and 30 can run in parallel (no dependency between them)
- Phase 31 depends on BOTH 29 and 30
- Phase 32 depends on 31

### Blockers/Concerns

- Gemini 2.5 Flash Lite structured output support untested -- verify during Phase 29
- 164 pre-enriched listings in production (zipcode 8051) -- Phase 31 must still handle "no ListingProfile" gracefully for other zipcodes

### Phase 30 Infrastructure Decisions

- Migrations 005-007 applied to production Supabase (listing_profiles, research_json, fulfillment_data)
- DB-01 (schema_version) is a JSONB key in breakdown column, not a DDL column -- Phase 31 writes at application level
- OPENROUTER_API_KEY already existed on EC2 from batch enrichment; added ALLOW_CLAUDE_FALLBACK=false and SUBJECTIVE_MODEL
- 164 listing profiles in production (from batch enrichment of zipcode 8051)
- Migration tracking registered in supabase_migrations.schema_migrations for 005, 006, 007

## Session Continuity

Last session: 2026-03-30T15:18:30Z
Stopped at: Completed 31-01-PLAN.md (scoring building blocks)
Resume file: None
