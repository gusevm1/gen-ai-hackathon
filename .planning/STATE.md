---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Hybrid Scoring Engine
status: completed
stopped_at: Completed 34-02-PLAN.md
last_updated: "2026-03-30T19:04:57.675Z"
last_activity: 2026-03-30 — Completed Phase 34 Plan 01 (web onboarding system with driver.js, checklist, Supabase state)
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 19
  completed_plans: 19
  percent: 97
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Phase 34 Plan 01 complete — Onboarding Tutorial System (web side)

## Current Position

Phase: 34 of 34 (Onboarding Tutorial System)
Plan: 2 of 2 in current phase (plan 02 complete)
Status: Phase 34 complete — all plans done
Last activity: 2026-03-30 — Completed Phase 34 Plan 02 (extension onboarding overlay steps 4-7 with spotlight UI)

Progress: [██████████] 97% (phases 27-33 complete, 34 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 15 (27: 3 plans, 28: 2 plans, 33: 2 plans, 29: 2 plans, 30: 1 plan, 31: 3 plans, 32: 2 plans)
- Average duration: ~5min
- Total execution time: --

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 29    | 01   | 5min     | 2     | 4     |
| 29    | 02   | 4min     | 2     | 4     |
| 30    | 01   | 5min     | 3     | 3     |
| 31    | 01   | 2min     | 3     | 3     |
| 31    | 02   | 2min     | 2     | 2     |
| 31    | 03   | 1min     | 2     | 2     |
| 32    | 01   | 3min     | 2     | 5     |
| 32    | 02   | 3min     | 2     | 4     |
| 34    | 01   | 9min     | 2     | 11    |
| Phase 34 P02 | 8min | 2 tasks | 6 files |

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

### Phase 31 Plan 02 Decisions

- Scoring router rewritten as hybrid pipeline orchestrator: cache -> profile lookup -> adapt -> deterministic + subjective -> aggregate -> ScoreResponse v2
- Fallback pipeline also uses hybrid aggregation (not just Claude alone), returns enrichment_status="fallback"
- Three enrichment_status values: "available" (profile), "fallback" (Claude), "unavailable" (no data)
- Analysis save uses asyncio.create_task fire-and-forget pattern for non-blocking response
- OPENROUTER_MODEL updated to google/gemini-2.5-flash-lite in openrouter.py (Layer 3 gap-fill client)

### Phase 31 Plan 03 Decisions

- Default schema_version to 0 when missing -- treats all legacy v1 entries as stale in both cache layers
- Both cache layers (backend Python + edge function TypeScript) use identical gating logic

### Phase 32 Plan 01 Decisions

- Schema version branching uses >= 2 (not === 2) for forward compatibility with future schema versions
- Null-fulfillment criteria rendered in separate "Data unavailable" section to prevent NaN% display
- deriveFulfillmentChecklist includes null-fulfillment items with met=null for ChecklistSection "Unknown" rendering
- Importance displayed as labels (Critical/High/Medium/Low) not raw weights (5/3/2/1)

### Phase 32 Plan 02 Decisions

- All v2 fields optional on ScoreResponse to preserve v1 backward compatibility with cached responses
- Grey beta badge uses early-return before tierColor assignment for enrichment_status=unavailable
- SummaryPanel unavailable state still renders summary_bullets under "What we know" header with grey dots
- Used snake_case field names in TypeScript matching existing extension conventions

### Phase 34 Plan 01 Decisions

- Migration file (008_onboarding_rpc.sql) used for update_onboarding_state RPC instead of direct CLI deploy (no Supabase access token on this machine)
- OnboardingProvider wraps full dashboard layout (header + main) so NavUser can access onboarding context without a separate wrapper
- Step 3->4 Supabase write is atomic before opening Flatfox to prevent extension reading stale onboarding_step=3
- Auto-start tour only for true first-timers: step=1 + active=false + completed=false; active tour resumes via driver.js on pathname change
- driver.js onDestroyStarted calls skip() so ESC/overlay click properly deactivates onboarding
- Onboarding DOM target IDs: install-extension-cta (download), create-profile-section (dashboard), open-flatfox-cta (dashboard step 3), profile-switcher (layout header)

### Phase 34 Plan 02 Decisions

- SVG mask cutout overlay for extension onboarding; avoids driver.js Shadow DOM conflicts
- OnboardingOverlay renders inside FAB shadow root; fixed positioning is viewport-relative so it covers full screen correctly
- Step 5 auto-advance implemented via setOnboardingState callback in handleScore (avoids stale closure)
- Step 4 verifies auth via existing getSession message before advancing
- Supabase writes in onboarding helpers are fire-and-forget (no await blocking UI transitions)
- nextLabel: null for step 5 falls back to 'Next' button as manual fallback if auto-advance fails

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

Last session: 2026-03-30T19:04:57.670Z
Stopped at: Completed 34-02-PLAN.md
Resume file: None
