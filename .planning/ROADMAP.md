# Roadmap: HomeMatch

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- ✅ **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- ✅ **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- ✅ **v3.0 Extension Download & Install** — Phase 17 (shipped 2026-03-17)
- ✅ **v4.0 Landing Page & Design System** — Phases 18-21 (shipped 2026-03-28)
- 📋 **v4.1 Landing Page v2 & Hackathon Credits** — Phases 22-23 (planned)
- 🔮 **v4.2 Dashboard Alignment & QA** — Phases TBD (deferred)
- 📋 **v5.0 Hybrid Scoring Engine** — Phases 27-32 (planned)

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

### v4.1 Landing Page v2 & Hackathon Credits (Planned)

**Milestone Goal:** Polish all 4 landing page sections based on UX review, add hackathon credits, and unify tier color system to traffic-light (green/yellow/red).

- [x] **Phase 22: Landing Page Section Redesigns** — Hero cleanup (stats row, CTA centering, tier colors), Problem card slide-in + visual redesign, Solution enlargement + tier color fix, CTA dramatic entrance animation (completed 2026-03-28)
- [x] **Phase 23: Hackathon Credits Section** — ETH Zurich + Gen-AI Hackathon logos section above footer; Zurich cityscape photo across hero, credits, and auth page (completed 2026-03-29)

### Phase 22: Landing Page Section Redesigns

**Goal:** Polish all 4 landing page sections — remove hero stats row and center CTA, redesign problem cards with left slide-in animation, enlarge solution browser demo and fix tier colors, dramatically upgrade CTA headline size and animation.

**Requirements:** HERO-01, HERO-02, HERO-03, PROB-01, PROB-02, PROB-03, SOLN-01, SOLN-02, SOLN-03, SOLN-04, CTA-01, CTA-02, CTA-03

**Plans:**
3/3 plans complete
- [ ] 22-02-PLAN.md — Problem section card redesign (slide-in animation)
- [ ] 22-03-PLAN.md — Solution enlargement + tier color fix; CTA dramatic entrance

**Success Criteria:**
1. Hero: stats row gone, CTA button centered on own line, poor tier = red (#ef4444)
2. Problem: decorative bg numbers removed; each card slides from x:-60→0 on scroll entry
3. Problem cards: visually elevated (card background, stronger typography, not plain list)
4. Solution: browser demo max-w-3xl+; step cards larger; scores show green/yellow/red by range
5. CTA: headline clamp(2.5rem, 6vw, 4.5rem); enters from y:60 with spring physics

### Phase 23: Hackathon Credits Section

**Goal:** Add ETH Zurich + Gen-AI Hackathon credits section to the landing page and auth page, with a Zurich cityscape photo as visual theme across the hero (dimmed scroll-fade), credits section (full-bleed photo background), and auth page (full-screen background).

**Requirements:** CRED-01, CRED-02

**Plans:**
1/1 plans complete
- [ ] 23-01-PLAN.md — Zurich photo assets + SectionCredits component + hero/auth photo integration

**Success Criteria:**
1. New SectionCredits component renders ETH Zurich logo + "GenAI Zurich Hackathon 2026" badge with "A project from" label
2. SectionCredits placed between SectionCTA and LandingFooter; uses Zurich photo as full-section background
3. Hero section has Zurich cityscape dimmed to ~25% opacity, fades to 0 as user scrolls
4. Auth page shows full-screen Zurich photo, login card floats over it, credits strip at bottom
5. TypeScript build passes — translation key parity maintained

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

### v4.2 Dashboard Alignment & QA (Deferred)

**Milestone Goal:** Complete v4.0 deferred work — dashboard design language, mobile responsiveness, performance.

- [ ] **Phase 24: Dashboard UI Alignment** — Propagate landing design language to dashboard, profiles, analysis pages
- [ ] **Phase 25: Polish & QA** — Mobile/tablet responsiveness, LCP < 2.5s, cross-browser, final copy pass

### v5.0 Hybrid Scoring Engine (Planned)

**Milestone Goal:** Replace the all-Claude scoring system with a hybrid deterministic + AI architecture where Claude handles only subjective evaluation and never generates numeric scores.

- [x] **Phase 27: Data Model & Criterion Classifier** — CriterionType enum, LLM classification at profile save, updated importance weight map (completed 2026-03-29)
- [x] **Phase 28: Deterministic Scorer** — Pure-function fulfillment formulas for price, distance, size, binary features, proximity quality, and built-in fields (completed 2026-03-30)
- [ ] **Phase 29: Subjective Scorer (Claude Refactor)** — New Pydantic response model, batched subjective-only Claude call, fulfillment-based prompt, summary bullets
- [ ] **Phase 30: Database Schema Prep** — schema_version field in JSONB breakdown, fulfillment_data column; deployed before hybrid scorer ships
- [ ] **Phase 31: Hybrid Scorer & Router Integration** — Weighted aggregation engine, CRITICAL override, missing-data handling, ScoreResponse v2, cache version gating
- [ ] **Phase 32: Frontend Consumers** — FulfillmentBreakdown component, checklist threshold update, extension types, schema_version branching

### Phase 27: Data Model & Criterion Classifier

**Goal:** Every user criterion is classified into one of 6 types so the scoring pipeline knows which scorer to route it to.
**Depends on:** Phase 26
**Requirements:** DM-01, DM-02, DM-03
**Plans:** 3/3 plans complete

Plans:
- [ ] 27-01-PLAN.md — CriterionType enum + DynamicField extension + IMPORTANCE_WEIGHT_MAP update + test scaffold
- [ ] 27-02-PLAN.md — CriterionClassifier service + POST /classify-criteria FastAPI endpoint
- [ ] 27-03-PLAN.md — Zod criterionType schema + server action /classify-criteria injection

**Success Criteria** (what must be TRUE):
  1. Each DynamicField in a saved profile has a `criterion_type` value persisted in its JSONB entry, set to one of: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective`
  2. Saving or updating a profile triggers an LLM classification call that assigns criterion types; ambiguous criteria default to `subjective`
  3. The importance weight map uses CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 everywhere scoring references importance

### Phase 28: Deterministic Scorer

**Goal:** All non-subjective criteria produce fulfillment scores (0.0-1.0) via deterministic Python formulas -- no LLM calls needed for price, distance, size, binary features, or proximity quality.
**Depends on:** Phase 27
**Requirements:** DS-01, DS-02, DS-03, DS-04, DS-05, DS-06
**Success Criteria** (what must be TRUE):
  1. Given a listing with price above budget, the scorer returns a fulfillment value following `f=exp(-2.5 * (price-budget)/budget)` -- at-or-under budget returns `f=1.0`; missing price skips the criterion
  2. Distance and size criteria produce fulfillment via their respective decay/power formulas, with guard behavior for missing or zero values
  3. Binary feature criteria (e.g., "balcony", "lift") resolve against Flatfox attribute slugs via set-membership check, with `FEATURE_ALIAS_MAP` handling German synonym inputs; present=1.0, absent=0.0
  4. Proximity quality criteria produce fulfillment combining distance decay and rating bonus per the hybrid formula; fallback results use fallback distance
  5. Built-in preferences (budget, rooms, living_space) appear as virtual `FulfillmentResult` entries using dealbreaker flags for importance, without being migrated into `dynamic_fields`
**Plans:** 2/2 plans complete

Plans:
- [ ] 28-01-PLAN.md — TDD test scaffold: failing tests for all DS-01 through DS-06 scorer functions
- [ ] 28-02-PLAN.md — Full deterministic_scorer.py implementation: FulfillmentResult + FEATURE_ALIAS_MAP + 5 scorer functions + built-in synthesizer

### Phase 29: Subjective Scorer (Claude Enhancement)

**Goal:** Enhance the Claude scoring prompt so Claude evaluates only genuinely subjective criteria, returning per-criterion fulfillment values instead of category scores, while preserving all existing prompt logic that works correctly today.
**Depends on:** Phase 27
**Requirements:** SS-01, SS-02, SS-03, SS-04
**Preserved prompt logic (must NOT be removed):**
  - Sale vs rent price distinction (SALE = total purchase price, RENT = monthly rent — never confuse them)
  - Language rules (respond entirely in user's preferred language, ignore input language)
  - Image analysis guidance (evaluate condition/finish from photos when provided)
  - Proximity data section format (evaluate from verified nearby_places only, never guess)
  - "Not specified" handling for missing listing fields
**Success Criteria** (what must be TRUE):
  1. Claude returns a `ClaudeSubjectiveResponse` with a list of `SubjectiveCriterionResult` entries, each containing `criterion`, `fulfillment` (0.0-1.0 rounded to 0.1), and `reasoning`
  2. When a profile has zero subjective criteria, no Claude scoring call is made; when subjective criteria exist, they are batched into a single `messages.parse()` call
  3. Claude's system prompt instructs it to return fulfillment values only for subjective criteria -- it never produces an `overall_score` or category-level scores
  4. The response always includes 3-5 natural-language `summary_bullets` in the user's preferred language, even when all criteria were deterministic (a separate minimal Claude call is made if needed)
  5. Sale vs rent price interpretation, language output rules, and image/proximity evaluation guidance are preserved in the updated prompt
**Plans:** 3 plans

Plans:
- [ ] 29-01-PLAN.md — TDD test scaffold: failing tests for SS-01 through SS-04
- [ ] 29-02-PLAN.md — New Pydantic models (SubjectiveCriterionResult, ClaudeSubjectiveResponse, BulletsOnlyResponse) + rewritten scoring prompts
- [ ] 29-03-PLAN.md — Two-path ClaudeScorer.score_listing() implementation + router update

### Phase 30: Database Schema Prep

**Goal:** The database schema is ready to store v2 scoring data before the hybrid scorer ships, ensuring backward-compatible storage and no data loss.
**Depends on:** Phase 27
**Requirements:** DB-01, DB-03
**Success Criteria** (what must be TRUE):
  1. The `analyses` table `breakdown` JSONB column accepts a `schema_version` field; existing rows without it continue to read correctly
  2. A new `fulfillment_data` JSONB column exists on the `analyses` table (additive); the existing `breakdown` and `score` columns are untouched
  3. This migration is deployed to production before any Phase 31 (hybrid scorer) code ships
**Plans**: TBD

### Phase 31: Hybrid Scorer & Router Integration

**Goal:** The scoring pipeline routes each criterion to the correct scorer (deterministic or subjective), aggregates fulfillment into a final score, and returns a v2 response shape that preserves backward compatibility.
**Depends on:** Phase 28, Phase 29, Phase 30
**Requirements:** HA-01, HA-02, HA-03, HA-04, DB-02
**Success Criteria** (what must be TRUE):
  1. The final score is computed as `(sum of weight * fulfillment) / (sum of weights) * 100` using CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weights -- not from Claude
  2. Criteria with missing data (None fulfillment) are excluded from both numerator and denominator; the score reflects only available information
  3. Any CRITICAL-importance criterion with `fulfillment=0` forces `match_tier="poor"` and caps the numeric score at 39
  4. The `ScoreResponse` includes `schema_version: 2`, `criteria_results` list (per-criterion name/fulfillment/weight/reasoning), no `categories` list; `overall_score`, `match_tier`, and `summary_bullets` field names are unchanged
  5. Cache reads reject entries with `schema_version < 2` (or missing), triggering a fresh re-score instead of returning stale v1 data
**Plans**: TBD

### Phase 32: Frontend Consumers

**Goal:** The web app and Chrome extension display the new per-criterion fulfillment breakdown, with backward-compatible rendering for cached v1 analyses.
**Depends on:** Phase 31
**Requirements:** FE-01, FE-02, FE-03, FE-04
**Success Criteria** (what must be TRUE):
  1. A new `FulfillmentBreakdown` component on the analysis page shows each criterion's name, fulfillment score, weight, and reasoning from `criteria_results`
  2. The checklist displays met (fulfillment >= 0.7), partial (0.3-0.69), and not-met (< 0.3) states derived from fulfillment floats
  3. The Chrome extension TypeScript types include the v2 `ScoreResponse` shape; existing field names (`overall_score`, `match_tier`, `summary_bullets`) work without extension changes
  4. The analysis page branches on `schema_version`: v1 cached analyses render the legacy category breakdown, v2 responses render the new per-criterion fulfillment view
**Plans**: TBD

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | ✅ Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | ✅ Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | ✅ Complete | 2026-03-17 |
| v3.0 Extension Download & Install | ✅ Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | ✅ Complete | 2026-03-28 |
| v4.1 Landing Page v2 & Hackathon Credits | 📋 Planned | -- |
| v4.2 Dashboard Alignment & QA | 🔮 Deferred | -- |
| v5.0 Hybrid Scoring Engine | 📋 Planned | -- |
