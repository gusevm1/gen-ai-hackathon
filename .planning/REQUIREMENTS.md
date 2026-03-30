# Requirements: HomeMatch v5.0 Hybrid Scoring Engine

**Milestone:** v5.0 Hybrid Scoring Engine
**Date:** 2026-03-29 (updated 2026-03-30 — integration scope added)
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

---

## Milestone v5.0 Requirements

### Data Model & Classifier

- [x] **DM-01**: System assigns each DynamicField criterion exactly one of 6 criterion types: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective`
- [x] **DM-02**: Claude LLM classifies each DynamicField to one of the 6 criterion types at profile save time; result stored as `criterion_type` in JSONB; default falls back to `subjective` for ambiguous criteria
- [x] **DM-03**: Importance weight map updated to CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 (replaces legacy 90/70/50/30 scale)

### Deterministic Scorer

- [x] **DS-01**: System computes price fulfillment deterministically: `f=1.0` if `price ≤ budget`, else `f=exp(-2.5 × (price-budget) / budget)`; None/missing price guarded (skip criterion)
- [x] **DS-02**: System computes distance fulfillment deterministically: `f=1.0` if `actual ≤ target`, else `f=exp(-1.0 × (actual-target) / target)`; None/missing distance guarded (skip criterion)
- [x] **DS-03**: System computes size fulfillment deterministically: `f=min(1.0, (actual/target)^1.5)`; target=0 or None guard returns `f=1.0` or skip
- [x] **DS-04**: System computes binary feature fulfillment via slug set-membership check against Flatfox attributes, with a `FEATURE_ALIAS_MAP` for German synonym inputs; `f=1.0` if present, `f=0.0` if absent
- [x] **DS-05**: System computes proximity quality fulfillment via `f=min(1.0, exp(-1×Δ/r) + min(0.2, (rating-3)/10))`; fallback results (outside requested radius) use fallback distance in formula
- [x] **DS-06**: Built-in preference fields (budget, rooms, living_space) are synthesized as virtual `FulfillmentResult` entries using dealbreaker flags for importance mapping, without migrating them into `dynamic_fields`

### Subjective Scorer (OpenRouter)

- [x] **SS-01**: `SubjectiveCriterionResult` Pydantic model with `criterion: str`, `fulfillment: float` (0.0–1.0), and `reasoning: str`; `SubjectiveResponse` wraps list of results + `summary_bullets`
- [x] **SS-02**: All `subjective`-type criteria batched into a single OpenRouter call; model configurable via `SUBJECTIVE_MODEL` env var (default: `google/gemini-2.5-flash-lite`); call skipped entirely if zero subjective criteria exist
- [x] **SS-03**: Prompt instructs model to return `fulfillment ∈ {0.0, 0.1, ..., 1.0}` per criterion with reasoning; model must never produce an `overall_score` or category-level scores
- [x] **SS-04**: 3–5 natural-language `summary_bullets` in the user's preferred language included in the same OpenRouter call; no separate call needed — bullets generated alongside subjective evaluation

### Integration & Infrastructure

- [x] **INT-01**: Supabase migrations 005 (listing_profiles table) and 006 (research_json column) applied to production before hybrid scorer ships
- [x] **INT-02**: `OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK=false`, and `SUBJECTIVE_MODEL` env vars set on EC2
- [x] **INT-03**: Scoring router performs ListingProfile lookup from Supabase; adapter converts ListingProfile fields to FlatfoxListing-compatible format for deterministic scorer consumption without modifying Phase 28 code
- [ ] **INT-04**: When `ALLOW_CLAUDE_FALLBACK=false` and no ListingProfile exists, scoring endpoint returns a response with `enrichment_status="unavailable"` instead of calling Claude; old Claude path preserved behind the gate
- [ ] **INT-05**: OpenRouter model constant updated from deprecated `google/gemini-2.0-flash-001` to `google/gemini-2.5-flash-lite`

### Hybrid Aggregation Engine

- [x] **HA-01**: System computes final score via weighted average: `score = (Σ weight × fulfillment / Σ weights) × 100`, using the new CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weight scale
- [x] **HA-02**: Criteria with missing data (None fulfillment) are excluded from both numerator and denominator in the weighted aggregation; score computed over available criteria only
- [x] **HA-03**: Any CRITICAL-importance criterion with `fulfillment=0` forces `match_tier="poor"` and caps the numeric score at a maximum of 39
- [x] **HA-04**: `ScoreResponse` v2 schema: `overall_score` computed in Python backend (not from LLM), `categories` list removed, `criteria_results: list[CriterionResult]` added, `schema_version: 2` field added; `overall_score`, `match_tier`, and `summary_bullets` field names preserved for backward compatibility

### Database & Cache

- [x] **DB-01**: `schema_version` field added to the `breakdown` JSONB column in the `analyses` table; this migration deploys before any `ScoreResponse` schema changes reach production
- [ ] **DB-02**: Cache read logic checks `schema_version`; any cached analysis with `schema_version < 2` (or missing `schema_version`) triggers a re-score instead of returning the stale cached entry; edge function cache also updated
- [x] **DB-03**: `fulfillment_data` JSONB column added to `analyses` table (additive); existing `breakdown` column and `score` column retained for v1 backward compatibility

### Frontend Consumers

- [ ] **FE-01**: New `FulfillmentBreakdown` component renders on the analysis page, showing per-criterion name, fulfillment score, weight, and reasoning for each criterion in `criteria_results`
- [ ] **FE-02**: `ChecklistSection` updated to derive met/partial/not-met display from fulfillment float thresholds: met (≥0.7), partial (0.3–0.69), not-met (<0.3)
- [ ] **FE-03**: Chrome extension TypeScript types updated to reflect new `ScoreResponse` v2 shape; changes are additive only — `overall_score`, `match_tier`, and `summary_bullets` field names unchanged
- [ ] **FE-04**: Frontend analysis page branches on `schema_version`: renders legacy category breakdown for v1 cached analyses and new per-criterion fulfillment breakdown for v2 responses
- [ ] **FE-05**: Extension renders grey "beta" badge for listings with `enrichment_status="unavailable"`, indicating scoring is not yet available for this area

---

## Future Requirements (Deferred)

- Image-based condition scoring as a formal criterion — deferred (image analysis still occurs via summary bullets but not as a scored criterion)
- Criterion reclassification UI: allow users to override Claude's assigned `criterion_type` — deferred to v5.1
- Fulfillment threshold configuration: user-customizable met/partial/not-met thresholds — deferred
- v4.2 Dashboard Alignment & QA (phases 24-25) — deferred
- OpenRouter gap-fill in critical scoring path — deferred (HA-02 skip-missing-data approach used instead)
- Enrichment pipeline for zipcodes beyond 8051 — deferred to v5.1+

## Out of Scope

| Feature | Reason |
|---------|--------|
| Removal of old `Importance` model | Kept for built-in field importance mapping; target removal in v6.0 |
| SQL data migration of existing cached analyses | Additive strategy (schema_version branching) |
| Per-criterion LLM calls | Single batched call enforced |
| Regex-based criterion classifier | Claude LLM classification chosen per user decision |
| Chat service changes | Out of scope for v5.0 |
| OpenRouter gap-fill in scoring pipeline | HA-02 skip-missing-data is simpler; gap-fill kept as optional diagnostic |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DM-01 | Phase 27 | Complete |
| DM-02 | Phase 27 | Complete |
| DM-03 | Phase 27 | Complete |
| DS-01 | Phase 28 | Complete |
| DS-02 | Phase 28 | Complete |
| DS-03 | Phase 28 | Complete |
| DS-04 | Phase 28 | Complete |
| DS-05 | Phase 28 | Complete |
| DS-06 | Phase 28 | Complete |
| SS-01 | Phase 29 | Complete |
| SS-02 | Phase 29 | Complete |
| SS-03 | Phase 29 | Complete |
| SS-04 | Phase 29 | Complete |
| INT-01 | Phase 30 | Complete |
| INT-02 | Phase 30 | Complete |
| INT-03 | Phase 31 | Complete |
| INT-04 | Phase 31 | Pending |
| INT-05 | Phase 31 | Pending |
| DB-01 | Phase 30 | Complete |
| DB-02 | Phase 31 | Pending |
| DB-03 | Phase 30 | Complete |
| HA-01 | Phase 31 | Complete |
| HA-02 | Phase 31 | Complete |
| HA-03 | Phase 31 | Complete |
| HA-04 | Phase 31 | Complete |
| FE-01 | Phase 32 | Pending |
| FE-02 | Phase 32 | Pending |
| FE-03 | Phase 32 | Pending |
| FE-04 | Phase 32 | Pending |
| FE-05 | Phase 32 | Pending |

**Coverage:**
- v5.0 requirements: 30 total
- Complete: 9 (DM-01–03, DS-01–06)
- Pending: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-30 after integration scope adjustment (SS→OpenRouter, INT category added, FE-05 added)*
