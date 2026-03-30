# Roadmap: HomeMatch

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- ✅ **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- ✅ **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- ✅ **v3.0 Extension Download & Install** — Phase 17 (shipped 2026-03-17)
- ✅ **v4.0 Landing Page & Design System** — Phases 18-21 (shipped 2026-03-28)
- ✅ **v4.1 Landing Page v2 & Hackathon Credits** — Phases 22-23 (shipped 2026-03-29)
- 🔮 **v4.2 Dashboard Alignment & QA** — Phases TBD (deferred)
- 🚧 **v5.0 Hybrid Scoring Engine** — Phases 27-32 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-13</summary>

- [x] Phase 1: Infrastructure & Auth — Scaffold all codebases, deploy, configure Supabase auth + DB
- [x] Phase 2: Preferences & Data Pipeline — Next.js preferences form + FastAPI Flatfox integration
- [x] Phase 3: LLM Scoring Pipeline — Claude-powered evaluation endpoint + Supabase edge function proxy
- [x] Phase 4: Extension UI & Analysis Page — Flatfox content script, FAB, badges, summary panel, full analysis page

</details>

<details>
<summary>✅ v1.1 Demo-Ready + Multi-Profile (Phases 5-10) — SHIPPED 2026-03-15</summary>

- [x] Phase 5: DB Schema Migration — Profiles table, analyses FK, atomic profile switching RPC
- [x] Phase 6: Backend + Edge Function Update — Scoring pipeline becomes profile-aware end-to-end
- [x] Phase 7: Preferences Schema Unification — Canonical schema superset, updated Claude prompt
- [x] Phase 8: UI Foundation — Top navbar, dark mode, 21st.dev component integration
- [x] Phase 9: Web Profile Management — Profile CRUD, preferences form restructure, analysis page redesign
- [x] Phase 10: Extension Profile Switcher — Popup profile display, switcher, stale badge guard, session health

</details>

<details>
<summary>✅ v2.0 Polish & AI Profile Creation (Phases 11-16) — SHIPPED 2026-03-17</summary>

- [x] Phase 11: Score Caching — Cache scores by listing+profile, invalidate on preference changes, manual re-score
- [x] Phase 12-13: Parallel scoring + caching fixes — Parallel listing scoring, price bug fix (Flatfox API stale data)
- [x] Phase 14: Chat UI & Navigation — AI-Powered Search nav item, chat page, profile name prompt, message thread
- [x] Phase 15: AI Conversation Backend — EC2 chat endpoint, multi-turn Claude preference extraction
- [x] Phase 16: Summary & Profile Creation — Summary card, inline editing, confirm-to-create, redirect to profile

</details>

<details>
<summary>✅ v3.0 Extension Download & Install (Phase 17) — SHIPPED 2026-03-17</summary>

- [x] Phase 17: Download Page & Sideload Instructions — Nav tab, zip download, step-by-step Chrome sideloading guide

</details>

<details>
<summary>✅ v4.0 Landing Page & Design System (Phases 18-21) — SHIPPED 2026-03-28</summary>

- [x] Phase 18: Design System & Motion Foundation — Framer Motion, motion tokens, FadeIn/StaggerGroup/CountUp primitives (completed 2026-03-27)
- [x] Phase 19: Landing Page v1 — Initial landing page scaffold; superseded by Phase 20 redesign (completed 2026-03-27)
- [x] Phase 20: Landing Page Redesign — 5-section whileInView landing page: Hero, Globe (SVG draw-in), Problem, Solution (3 steps), CTA (completed 2026-03-28)
- [x] Phase 21: Landing Page Polish v2 — Extension-matched score badges, scroll-driven problem highlights, cinematic demo improvements, CTA transition (completed 2026-03-28)

</details>

<details>
<summary>✅ v4.1 Landing Page v2 & Hackathon Credits (Phases 22-23) — SHIPPED 2026-03-29</summary>

- [x] Phase 22: Landing Page Section Redesigns — Hero cleanup, Problem card slide-in + visual redesign, Solution enlargement + tier color fix, CTA dramatic entrance animation (completed 2026-03-28)
- [x] Phase 23: Hackathon Credits Section — ETH Zurich + Gen-AI Hackathon logos section, Zurich cityscape photo across hero, credits, and auth page (completed 2026-03-29)

</details>

<details>
<summary>Phase 26: Proximity Enhancements (Standalone)</summary>

### Phase 26: Proximity Enhancements — Closest Fallback + Partial Met Scoring

**Goal:** Add 2x-radius closest-fallback search to the proximity pipeline and importance-based partial-met scoring rules to the LLM prompt, with corresponding amber "partial" state in the frontend checklist UI.

**Requirements:** D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-12, D-13, D-14

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 26-01-PLAN.md — Backend closest-fallback logic in proximity.py + LLM partial-met scoring rules in scoring.py
- [ ] 26-02-PLAN.md — Frontend "partial" met state in ChecklistSection.tsx (amber indicator)

**Success Criteria:**
1. When no places found within requested radius, a 2x radius fallback search returns the single nearest result tagged is_fallback=True
2. LLM prompt instructs scorer to output met="partial" for fallback results when importance is not critical, met=false when critical
3. ChecklistSection renders met="partial" with amber AlertTriangle icon, own badge count, sorted between met and unmet

</details>

### v4.2 Dashboard Alignment & QA (Deferred)

**Milestone Goal:** Complete v4.0 deferred work — dashboard design language, mobile responsiveness, performance.

- [ ] **Phase 24: Dashboard UI Alignment** — Propagate landing design language to dashboard, profiles, analysis pages
- [ ] **Phase 25: Polish & QA** — Mobile/tablet responsiveness, LCP < 2.5s, cross-browser, final copy pass

### v5.0 Hybrid Scoring Engine (In Progress)

**Milestone Goal:** Replace the all-Claude scoring system with a hybrid deterministic + AI architecture. Pre-computed ListingProfiles feed deterministic formulas. OpenRouter handles subjective criteria. Claude fallback is gated behind an env var. Frontend renders per-criterion fulfillment breakdowns.

- [x] **Phase 27: Data Model & Criterion Classifier** — CriterionType enum, LLM classification at profile save, updated importance weight map (completed 2026-03-29)
- [x] **Phase 28: Deterministic Scorer** — Pure-function fulfillment formulas for price, distance, size, binary features, proximity quality, and built-in fields (completed 2026-03-30)
- [x] **Phase 29: Subjective Scorer (OpenRouter)** — SubjectiveResponse model, batched OpenRouter call for subjective criteria + summary bullets, configurable model via SUBJECTIVE_MODEL env var (completed 2026-03-30)
- [x] **Phase 30: Database & Infrastructure Prep** — Migrations 005/006, schema_version + fulfillment_data columns, OPENROUTER_API_KEY + ALLOW_CLAUDE_FALLBACK + SUBJECTIVE_MODEL env vars on EC2 (completed 2026-03-30)
- [x] **Phase 31: Hybrid Scorer & Router Integration** — ListingProfile lookup + adapter, weighted aggregation engine, CRITICAL override, ScoreResponse v2, cache version gating, ALLOW_CLAUDE_FALLBACK gating, OpenRouter model constant update (completed 2026-03-30)
- [ ] **Phase 32: Frontend Consumers** — FulfillmentBreakdown component, checklist threshold update, extension types, schema_version branching, grey "beta" badge for non-enriched listings

**Phase ordering:** 29 and 30 can run in parallel. 31 depends on both 29 and 30. 32 depends on 31.

## Phase Details

### Phase 27: Data Model & Criterion Classifier

**Goal:** Every user criterion is classified into one of 6 types so the scoring pipeline knows which scorer to route it to.
**Depends on:** Phase 26
**Requirements:** DM-01, DM-02, DM-03
**Status:** Complete (2026-03-29)
**Plans:** 3/3 plans complete

Plans:
- [x] 27-01-PLAN.md — CriterionType enum + DynamicField extension + IMPORTANCE_WEIGHT_MAP update + test scaffold
- [x] 27-02-PLAN.md — CriterionClassifier service + POST /classify-criteria FastAPI endpoint
- [x] 27-03-PLAN.md — Zod criterionType schema + server action /classify-criteria injection

**Success Criteria** (what must be TRUE):
  1. Each DynamicField in a saved profile has a `criterion_type` value persisted in its JSONB entry, set to one of: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective`
  2. Saving or updating a profile triggers an LLM classification call that assigns criterion types; ambiguous criteria default to `subjective`
  3. The importance weight map uses CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 everywhere scoring references importance

### Phase 28: Deterministic Scorer

**Goal:** All non-subjective criteria produce fulfillment scores (0.0-1.0) via deterministic Python formulas -- no LLM calls needed for price, distance, size, binary features, or proximity quality.
**Depends on:** Phase 27
**Requirements:** DS-01, DS-02, DS-03, DS-04, DS-05, DS-06
**Status:** Complete (2026-03-30)
**Plans:** 2/2 plans complete

Plans:
- [x] 28-01-PLAN.md — TDD test scaffold: failing tests for all DS-01 through DS-06 scorer functions
- [x] 28-02-PLAN.md — Full deterministic_scorer.py implementation: FulfillmentResult + FEATURE_ALIAS_MAP + 5 scorer functions + built-in synthesizer

**Success Criteria** (what must be TRUE):
  1. Given a listing with price above budget, the scorer returns a fulfillment value following `f=exp(-2.5 * (price-budget)/budget)` -- at-or-under budget returns `f=1.0`; missing price skips the criterion
  2. Distance and size criteria produce fulfillment via their respective decay/power formulas, with guard behavior for missing or zero values
  3. Binary feature criteria (e.g., "balcony", "lift") resolve against Flatfox attribute slugs via set-membership check, with `FEATURE_ALIAS_MAP` handling German synonym inputs; present=1.0, absent=0.0
  4. Proximity quality criteria produce fulfillment combining distance decay and rating bonus per the hybrid formula; fallback results use fallback distance
  5. Built-in preferences (budget, rooms, living_space) appear as virtual `FulfillmentResult` entries using dealbreaker flags for importance, without being migrated into `dynamic_fields`

### Phase 29: Subjective Scorer (OpenRouter)

**Goal:** Subjective criteria (those that cannot be scored deterministically) are evaluated via a single batched OpenRouter call that returns per-criterion fulfillment values and natural-language summary bullets -- no Claude API calls in the scoring path.
**Depends on:** Phase 28
**Requirements:** SS-01, SS-02, SS-03, SS-04
**Success Criteria** (what must be TRUE):
  1. A `SubjectiveResponse` Pydantic model exists containing a list of `SubjectiveCriterionResult` entries (each with `criterion`, `fulfillment` 0.0-1.0, `reasoning`) and `summary_bullets`
  2. All subjective-type criteria are batched into a single OpenRouter call; model is configurable via `SUBJECTIVE_MODEL` env var (default: `google/gemini-2.5-flash-lite`); when zero subjective criteria exist, no call is made
  3. The prompt instructs the model to return fulfillment in 0.1 increments per criterion with reasoning; the model never produces an `overall_score` or category-level scores
  4. 3-5 natural-language `summary_bullets` in the user's preferred language are generated in the same OpenRouter call alongside subjective evaluation -- no separate call needed
**Plans:** 2/2 plans complete

Plans:
- [x] 29-01-PLAN.md — Pydantic models (SubjectiveCriterionResult, ClaudeSubjectiveResponse, BulletsOnlyResponse) + system prompt rewrite
- [x] 29-02-PLAN.md — Two-path score_listing() logic in claude.py + scoring router compatibility

### Phase 30: Database & Infrastructure Prep

**Goal:** All database migrations are applied, env vars are configured on EC2, and the production infrastructure is ready for the hybrid scorer to ship -- before any Phase 31 code deploys.
**Depends on:** Phase 28
**Requirements:** INT-01, INT-02, DB-01, DB-03
**Success Criteria** (what must be TRUE):
  1. Supabase migration 005 (listing_profiles table with indexes) and migration 006 (research_json JSONB column) are applied to production
  2. The `analyses` table has a `schema_version` field in the `breakdown` JSONB column and a new `fulfillment_data` JSONB column; existing rows without these fields continue to read correctly
  3. EC2 environment has `OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK=false`, and `SUBJECTIVE_MODEL` env vars set in the backend `.env` file
  4. All migrations are verified deployed before any hybrid scorer code (Phase 31) ships
**Plans:** 1/1 plans complete

Plans:
- [x] 30-01-PLAN.md — Create migration 007 (fulfillment_data), apply migrations 005-007 to production, set EC2 env vars

### Phase 31: Hybrid Scorer & Router Integration

**Goal:** The scoring router orchestrates the full pipeline: looks up pre-computed ListingProfile data, adapts it for the deterministic scorer, routes subjective criteria to OpenRouter, aggregates fulfillment into a weighted score, and returns a v2 response -- with graceful degradation when no enrichment data exists.
**Depends on:** Phase 29, Phase 30
**Requirements:** INT-03, INT-04, INT-05, HA-01, HA-02, HA-03, HA-04, DB-02
**Success Criteria** (what must be TRUE):
  1. The scoring router looks up a ListingProfile from Supabase; a `profile_adapter.py` module converts ListingProfile fields to FlatfoxListing-compatible format so the Phase 28 deterministic scorer runs unmodified
  2. The final score is computed as `(sum of weight * fulfillment) / (sum of weights) * 100` using CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weights; criteria with missing data (None fulfillment) are excluded from both numerator and denominator
  3. Any CRITICAL-importance criterion with `fulfillment=0` forces `match_tier="poor"` and caps the numeric score at 39
  4. The `ScoreResponse` includes `schema_version: 2`, `criteria_results` list, no `categories` list; `overall_score`, `match_tier`, and `summary_bullets` field names are preserved; cache reads reject entries with `schema_version < 2`; edge function cache also checks `schema_version`
  5. When `ALLOW_CLAUDE_FALLBACK=false` and no ListingProfile exists, the endpoint returns `enrichment_status="unavailable"` instead of calling Claude; the OpenRouter model constant is updated to `google/gemini-2.5-flash-lite`
**Plans:** 3/3 plans complete

Plans:
- [x] 31-01-PLAN.md — ScoreResponse v2 model + CriterionResult, profile_adapter.py, hybrid_scorer.py (aggregation engine)
- [x] 31-02-PLAN.md — Scoring router rewrite + ALLOW_CLAUDE_FALLBACK gating + OpenRouter model constant update
- [x] 31-03-PLAN.md — Cache version gating in backend get_analysis + edge function score-proxy + deploy

### Phase 32: Frontend Consumers

**Goal:** The web app and Chrome extension display the new per-criterion fulfillment breakdown, with backward-compatible rendering for cached v1 analyses and a clear indicator for listings that lack enrichment data.
**Depends on:** Phase 31
**Requirements:** FE-01, FE-02, FE-03, FE-04, FE-05
**Success Criteria** (what must be TRUE):
  1. A new `FulfillmentBreakdown` component on the analysis page shows each criterion's name, fulfillment score, weight, and reasoning from `criteria_results`
  2. The checklist displays met (fulfillment >= 0.7), partial (0.3-0.69), and not-met (< 0.3) states derived from fulfillment floats
  3. The Chrome extension TypeScript types include the v2 `ScoreResponse` shape; existing field names (`overall_score`, `match_tier`, `summary_bullets`) work without extension changes
  4. The analysis page branches on `schema_version`: v1 cached analyses render the legacy category breakdown, v2 responses render the new per-criterion fulfillment view
  5. The extension renders a grey "beta" badge for listings with `enrichment_status="unavailable"`, indicating scoring is not yet available for this listing's area
**Plans:** 2 plans

Plans:
- [ ] 32-01-PLAN.md — Web app FulfillmentBreakdown component, fulfillment utilities, analysis page schema_version branching
- [ ] 32-02-PLAN.md — Extension v2 ScoreResponse types, grey beta badge for unavailable enrichment

### Phase 33: Dashboard Home, Nav Polish, Profile Creation Flow, and Analyses Titles Fix

**Goal:** Deliver four UX improvements: a proper dashboard home page with welcome text and profile-creation cards, Home nav item in TopNavbar, two-card profile creation chooser (Manual vs AI), download page nav fix, and English-first analysis titles.
**Requirements:** HOME-01, HOME-02, NAV-01, PROF-01, DOWN-01, ANA-01
**Depends on:** Phase 32
**Status:** Complete (2026-03-30)
**Plans:** 2/2 plans complete

Plans:
- [x] 33-01-PLAN.md — Dashboard home page with welcome text + profile-creation cards, Home nav item, translations
- [x] 33-02-PLAN.md — Profile chooser in profiles page, download page nav fix, backend title priority fix

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | ✅ Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | ✅ Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | ✅ Complete | 2026-03-17 |
| v3.0 Extension Download & Install | ✅ Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | ✅ Complete | 2026-03-28 |
| v4.1 Landing Page v2 & Hackathon Credits | ✅ Complete | 2026-03-29 |
| v4.2 Dashboard Alignment & QA | 🔮 Deferred | -- |
| v5.0 Hybrid Scoring Engine | 🚧 In Progress | -- |

| Phase | Status | Completed |
|-------|--------|-----------|
| 27. Data Model & Criterion Classifier | ✅ Complete | 2026-03-29 |
| 28. Deterministic Scorer | ✅ Complete | 2026-03-30 |
| 29. Subjective Scorer (OpenRouter) | ✅ Complete | 2026-03-30 |
| 30. Database & Infrastructure Prep | ✅ Complete | 2026-03-30 |
| 31. Hybrid Scorer & Router Integration | ✅ Complete | 2026-03-30 |
| 32. Frontend Consumers | Not started | - |
| 33. Dashboard Home & Nav Polish | ✅ Complete | 2026-03-30 |
