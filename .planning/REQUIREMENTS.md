# Requirements: HomeMatch v5.0 Hybrid Scoring Engine

**Milestone:** v5.0 Hybrid Scoring Engine
**Date:** 2026-03-29
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

### Subjective Scorer (Claude)

- [ ] **SS-01**: New `ClaudeSubjectiveResponse` Pydantic model returns a list of `SubjectiveCriterionResult` entries, each with `criterion: str`, `fulfillment: float` (0.0–1.0), and `reasoning: str`; fulfillment values rounded to 0.1 step post-receipt
- [ ] **SS-02**: All `subjective`-type criteria are batched into a single `messages.parse()` call; Claude call for criteria is skipped entirely if zero subjective criteria exist
- [ ] **SS-03**: Updated scoring system prompt instructs Claude to return `fulfillment ∈ {0.0, 0.1, ..., 1.0}` per criterion with reasoning; Claude must never produce an `overall_score` or category-level scores
- [ ] **SS-04**: Claude always generates 3–5 natural-language `summary_bullets` in the user's preferred language, even when all scored criteria are deterministic; a separate minimal call is made if no subjective criteria triggered a Claude call

### Hybrid Aggregation Engine

- [ ] **HA-01**: System computes final score via weighted average: `score = (Σ weight × fulfillment / Σ weights) × 100`, using the new CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weight scale
- [ ] **HA-02**: Criteria with missing data (None fulfillment) are excluded from both numerator and denominator in the weighted aggregation; score computed over available criteria only
- [ ] **HA-03**: Any CRITICAL-importance criterion with `fulfillment=0` forces `match_tier="poor"` and caps the numeric score at a maximum of 39
- [ ] **HA-04**: `ScoreResponse` v2 schema: `overall_score` computed in Python backend (not from Claude), `categories` list removed, `criteria_results: list[CriterionResult]` added, `schema_version: 2` field added; `overall_score`, `match_tier`, and `summary_bullets` field names preserved for backward compatibility

### Database & Cache

- [ ] **DB-01**: `schema_version` field added to the `breakdown` JSONB column in the `analyses` table; this migration deploys before any `ScoreResponse` schema changes reach production
- [ ] **DB-02**: Cache read logic checks `schema_version`; any cached analysis with `schema_version < 2` (or missing `schema_version`) triggers a re-score instead of returning the stale cached entry
- [ ] **DB-03**: `fulfillment_data` JSONB column added to `analyses` table (additive); existing `breakdown` column and `score` column retained for v1 backward compatibility

### Frontend Consumers

- [ ] **FE-01**: New `FulfillmentBreakdown` component renders on the analysis page, showing per-criterion name, fulfillment score, weight, and Claude reasoning for each criterion in `criteria_results`
- [ ] **FE-02**: `ChecklistSection` updated to derive met/partial/not-met display from fulfillment float thresholds: met (≥0.7), partial (0.3–0.69), not-met (<0.3)
- [ ] **FE-03**: Chrome extension TypeScript types updated to reflect new `ScoreResponse` v2 shape; changes are additive only — `overall_score`, `match_tier`, and `summary_bullets` field names unchanged
- [ ] **FE-04**: Frontend analysis page branches on `schema_version`: renders legacy category breakdown for v1 cached analyses and new per-criterion fulfillment breakdown for v2 responses

---

## Future Requirements (Deferred)

- Image-based condition scoring as a formal criterion — deferred (image analysis still occurs via summary bullets but not as a scored criterion)
- Criterion reclassification UI: allow users to override Claude's assigned `criterion_type` — deferred to v5.1
- Fulfillment threshold configuration: user-customizable met/partial/not-met thresholds — deferred
- v4.2 Dashboard Alignment & QA (phases 24-25) — deferred

## Out of Scope

- Removal of the old `Importance` model (per-category: location/price/size/features/condition) — kept through v5.0 for built-in field importance mapping; target removal in v6.0
- SQL data migration of existing cached analyses — additive strategy used instead (schema_version branching)
- Per-criterion Claude calls — single batched call enforced
- Regex-based criterion classifier — Claude LLM classification chosen per user decision
- New Python packages — stdlib + existing Pydantic + Anthropic SDK sufficient

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| DM-01 | Phase 27 | TBD |
| DM-02 | Phase 27 | TBD |
| DM-03 | Phase 27 | TBD |
| DS-01 | Phase 28 | TBD |
| DS-02 | Phase 28 | TBD |
| DS-03 | Phase 28 | TBD |
| DS-04 | Phase 28 | TBD |
| DS-05 | Phase 28 | TBD |
| DS-06 | Phase 28 | TBD |
| SS-01 | Phase 29 | TBD |
| SS-02 | Phase 29 | TBD |
| SS-03 | Phase 29 | TBD |
| SS-04 | Phase 29 | TBD |
| HA-01 | Phase 31 | TBD |
| HA-02 | Phase 31 | TBD |
| HA-03 | Phase 31 | TBD |
| HA-04 | Phase 31 | TBD |
| DB-01 | Phase 30 | TBD |
| DB-02 | Phase 31 | TBD |
| DB-03 | Phase 30 | TBD |
| FE-01 | Phase 32 | TBD |
| FE-02 | Phase 32 | TBD |
| FE-03 | Phase 32 | TBD |
| FE-04 | Phase 32 | TBD |
