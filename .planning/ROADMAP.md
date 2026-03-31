# Roadmap: HomeMatch

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- ✅ **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- ✅ **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- ✅ **v3.0 Extension Download & Install** — Phase 17 (shipped 2026-03-17)
- ✅ **v4.0 Landing Page & Design System** — Phases 18-21 (shipped 2026-03-28)
- ✅ **v4.1 Landing Page v2 & Hackathon Credits** — Phases 22-23 (shipped 2026-03-29)
- 🔮 **v4.2 Dashboard Alignment & QA** — Phases TBD (deferred)
- ✅ **v5.0 Hybrid Scoring Engine** — Phases 27-34 (shipped 2026-03-31)
- 🚧 **v6.0 UX & Design System Overhaul** — Phases 35-40 (in progress)

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
<summary>✅ v5.0 Hybrid Scoring Engine (Phases 26-34) — SHIPPED 2026-03-31</summary>

- [x] Phase 26: Proximity Enhancements — Closest fallback + partial met scoring (completed 2026-03-29)
- [x] Phase 27: Data Model & Criterion Classifier — CriterionType enum, LLM classification at profile save (completed 2026-03-29)
- [x] Phase 28: Deterministic Scorer — Pure-function fulfillment formulas for price, distance, size, binary features (completed 2026-03-30)
- [x] Phase 29: Subjective Scorer (OpenRouter) — Batched OpenRouter call, SubjectiveResponse model, summary bullets (completed 2026-03-30)
- [x] Phase 30: Database & Infrastructure Prep — Migrations 005-007, EC2 env vars (completed 2026-03-30)
- [x] Phase 31: Hybrid Scorer & Router Integration — ListingProfile lookup, weighted aggregation, ScoreResponse v2 (completed 2026-03-30)
- [x] Phase 32: Frontend Consumers — FulfillmentBreakdown, schema_version branching, grey beta badge (completed 2026-03-30)
- [x] Phase 33: Dashboard Home & Nav Polish — Dashboard home page, profile creation chooser, download nav fix (completed 2026-03-30)
- [x] Phase 34: Onboarding & Tutorial System — WelcomeModal, checklist, driver.js tour, extension overlay (completed 2026-03-31)

</details>

### v6.0 UX & Design System Overhaul (In Progress)

**Milestone Goal:** Redesign the user experience end-to-end — state-aware dashboard, aligned design system, and fixed user journeys for both first-time and returning users so the product is foolproof, intuitive, and visually consistent with the landing page.

- [ ] **Phase 35: Navigation & IA** — Rename nav item, remove Download from primary nav, install banner, Settings link
- [ ] **Phase 36: State-Aware Dashboard** — New user explainer state, returning user workspace with active profile + recent analyses
- [ ] **Phase 37: Design System Propagation** — Token cleanup, Framer Motion entrance animations, tier colors, hover states
- [ ] **Phase 38: Onboarding Rebuild** — WelcomeModal with Shadcn, checklist completion state, Settings re-entry
- [ ] **Phase 39: Critical Handoffs** — Profile edit CTA + progress indicator, analyses empty state
- [ ] **Phase 40: Page Redesigns** — Profiles list, AI chat, analyses cards, settings download section

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
**Status:** Complete (2026-03-30)
**Plans:** 2/2 plans complete

Plans:
- [x] 29-01-PLAN.md — Pydantic models (SubjectiveCriterionResult, ClaudeSubjectiveResponse, BulletsOnlyResponse) + system prompt rewrite
- [x] 29-02-PLAN.md — Two-path score_listing() logic in claude.py + scoring router compatibility

**Success Criteria** (what must be TRUE):
  1. A `SubjectiveResponse` Pydantic model exists containing a list of `SubjectiveCriterionResult` entries (each with `criterion`, `fulfillment` 0.0-1.0, `reasoning`) and `summary_bullets`
  2. All subjective-type criteria are batched into a single OpenRouter call; model is configurable via `SUBJECTIVE_MODEL` env var (default: `google/gemini-2.5-flash-lite`); when zero subjective criteria exist, no call is made
  3. The prompt instructs the model to return fulfillment in 0.1 increments per criterion with reasoning; the model never produces an `overall_score` or category-level scores
  4. 3-5 natural-language `summary_bullets` in the user's preferred language are generated in the same OpenRouter call alongside subjective evaluation -- no separate call needed

### Phase 30: Database & Infrastructure Prep

**Goal:** All database migrations are applied, env vars are configured on EC2, and the production infrastructure is ready for the hybrid scorer to ship -- before any Phase 31 code deploys.
**Depends on:** Phase 28
**Requirements:** INT-01, INT-02, DB-01, DB-03
**Status:** Complete (2026-03-30)
**Plans:** 1/1 plans complete

Plans:
- [x] 30-01-PLAN.md — Create migration 007 (fulfillment_data), apply migrations 005-007 to production, set EC2 env vars

**Success Criteria** (what must be TRUE):
  1. Supabase migration 005 (listing_profiles table with indexes) and migration 006 (research_json JSONB column) are applied to production
  2. The `analyses` table has a `schema_version` field in the `breakdown` JSONB column and a new `fulfillment_data` JSONB column; existing rows without these fields continue to read correctly
  3. EC2 environment has `OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK=false`, and `SUBJECTIVE_MODEL` env vars set in the backend `.env` file
  4. All migrations are verified deployed before any hybrid scorer code (Phase 31) ships

### Phase 31: Hybrid Scorer & Router Integration

**Goal:** The scoring router orchestrates the full pipeline: looks up pre-computed ListingProfile data, adapts it for the deterministic scorer, routes subjective criteria to OpenRouter, aggregates fulfillment into a weighted score, and returns a v2 response -- with graceful degradation when no enrichment data exists.
**Depends on:** Phase 29, Phase 30
**Requirements:** INT-03, INT-04, INT-05, HA-01, HA-02, HA-03, HA-04, DB-02
**Status:** Complete (2026-03-30)
**Plans:** 3/3 plans complete

Plans:
- [x] 31-01-PLAN.md — ScoreResponse v2 model + CriterionResult, profile_adapter.py, hybrid_scorer.py (aggregation engine)
- [x] 31-02-PLAN.md — Scoring router rewrite + ALLOW_CLAUDE_FALLBACK gating + OpenRouter model constant update
- [x] 31-03-PLAN.md — Cache version gating in backend get_analysis + edge function score-proxy + deploy

**Success Criteria** (what must be TRUE):
  1. The scoring router looks up a ListingProfile from Supabase; a `profile_adapter.py` module converts ListingProfile fields to FlatfoxListing-compatible format so the Phase 28 deterministic scorer runs unmodified
  2. The final score is computed as `(sum of weight * fulfillment) / (sum of weights) * 100` using CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weights; criteria with missing data (None fulfillment) are excluded from both numerator and denominator
  3. Any CRITICAL-importance criterion with `fulfillment=0` forces `match_tier="poor"` and caps the numeric score at 39
  4. The `ScoreResponse` includes `schema_version: 2`, `criteria_results` list, no `categories` list; `overall_score`, `match_tier`, and `summary_bullets` field names are preserved; cache reads reject entries with `schema_version < 2`; edge function cache also checks `schema_version`
  5. When `ALLOW_CLAUDE_FALLBACK=false` and no ListingProfile exists, the endpoint returns `enrichment_status="unavailable"` instead of calling Claude; the OpenRouter model constant is updated to `google/gemini-2.5-flash-lite`

### Phase 32: Frontend Consumers

**Goal:** The web app and Chrome extension display the new per-criterion fulfillment breakdown, with backward-compatible rendering for cached v1 analyses and a clear indicator for listings that lack enrichment data.
**Depends on:** Phase 31
**Requirements:** FE-01, FE-02, FE-03, FE-04, FE-05
**Status:** Complete (2026-03-30)
**Plans:** 2/2 plans complete

Plans:
- [x] 32-01-PLAN.md — Web app FulfillmentBreakdown component, fulfillment utilities, analysis page schema_version branching
- [x] 32-02-PLAN.md — Extension v2 ScoreResponse types, grey beta badge for unavailable enrichment

**Success Criteria** (what must be TRUE):
  1. A new `FulfillmentBreakdown` component on the analysis page shows each criterion's name, fulfillment score, weight, and reasoning from `criteria_results`
  2. The checklist displays met (fulfillment >= 0.7), partial (0.3-0.69), and not-met (< 0.3) states derived from fulfillment floats
  3. The Chrome extension TypeScript types include the v2 `ScoreResponse` shape; existing field names (`overall_score`, `match_tier`, `summary_bullets`) work without extension changes
  4. The analysis page branches on `schema_version`: v1 cached analyses render the legacy category breakdown, v2 responses render the new per-criterion fulfillment view
  5. The extension renders a grey "beta" badge for listings with `enrichment_status="unavailable"`, indicating scoring is not yet available for this listing's area

### Phase 33: Dashboard Home, Nav Polish, Profile Creation Flow, and Analyses Titles Fix

**Goal:** Deliver four UX improvements: a proper dashboard home page with welcome text and profile-creation cards, Home nav item in TopNavbar, two-card profile creation chooser (Manual vs AI), download page nav fix, and English-first analysis titles.
**Requirements:** HOME-01, HOME-02, NAV-01, PROF-01, DOWN-01, ANA-01
**Depends on:** Phase 32
**Status:** Complete (2026-03-30)
**Plans:** 2/2 plans complete

Plans:
- [x] 33-01-PLAN.md — Dashboard home page with welcome text + profile-creation cards, Home nav item, translations
- [x] 33-02-PLAN.md — Profile chooser in profiles page, download page nav fix, backend title priority fix

**Success Criteria** (what must be TRUE):
  1. Authenticated user lands on a dashboard home page (not a redirect) with welcome text and profile-creation cards
  2. Top navbar contains a "Home" link that navigates to the dashboard
  3. Profiles page shows a two-card chooser: "Create with AI" (recommended) and "Create manually"
  4. Download page is accessible via the nav without getting lost
  5. Analysis page titles prioritize English listing title over address fallback

### Phase 34: Onboarding & Tutorial System

**Goal:** Design and implement a guided onboarding system that drives first-time users to core product value (first property analysis) as quickly as possible, spanning web app and Chrome extension with shared state coordination via Supabase.
**Requirements:** OB-01, OB-02, OB-03, OB-04, OB-05, OB-06, OB-07, OB-08, OB-STATE, OB-REPLAY, OB-CHECKLIST, OB-EXT-STATE
**Depends on:** Phase 33
**Status:** Complete (2026-03-31)
**Plans:** 2/2 plans complete

Plans:
- [x] 34-01-PLAN.md — Supabase RPC + web app onboarding (driver.js tour Steps 1-3, Step 8, checklist, "Take a quick tour")
- [x] 34-02-PLAN.md — Extension onboarding overlay (custom spotlight Steps 4-7, background state handlers)

**Success Criteria** (what must be TRUE):
  1. First-time user sees onboarding flow automatically after login, guiding them through install extension, create profile, open Flatfox
  2. Extension detects active onboarding on Flatfox and guides user through login, analyze, understand results, redirect back
  3. Post-analysis tooltips (Step 8) show feature awareness on web app return
  4. "Take a quick tour" in profile dropdown restarts onboarding from Step 1
  5. Skip/Exit available at every step; progress indicator shown
  6. Onboarding state persists in Supabase profiles.preferences JSONB, accessible by both web app and extension

### Phase 35: Navigation & IA

**Goal:** Users navigate a cleaner information architecture — "New Profile" replaces the ambiguous "AI-Powered Search" label, Download is demoted from primary nav to Settings, and users without confirmed extension installs see a contextual install prompt.
**Depends on:** Phase 34
**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04
**Plans:** 2 plans

Plans:
- [ ] 35-01-PLAN.md — Nav rename (New Profile) + remove Download item + extension install banner on dashboard
- [ ] 35-02-PLAN.md — Settings page Download Extension section

**Success Criteria** (what must be TRUE):
  1. User sees "New Profile" in the top navbar where "AI-Powered Search" previously appeared
  2. User does not see "Download" as a standalone primary nav item; the page remains accessible via Settings
  3. User who has not confirmed extension install sees a banner or prompt on the dashboard directing them to install
  4. User can navigate to the Download Extension page directly from the Settings page

### Phase 36: State-Aware Dashboard

**Goal:** The dashboard home page responds to user state — first-time users see a guided 3-step explainer with two profile creation paths, returning users see their active profile, recent analyses, and a direct path to Flatfox.
**Depends on:** Phase 35
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. New user (0 profiles) sees a 3-step product explainer and two profile creation cards on the dashboard home
  2. AI profile creation card is visually distinguished as the recommended primary path (badge + primary button styling); manual creation card is secondary (outline style)
  3. Returning user (1+ profiles) sees their active profile name, last-used date, and "Open Flatfox" CTA without scrolling
  4. Returning user sees their 3 most recent analyses (score, tier, address) on the home page
  5. Returning user can switch active profile or start a new one directly from the dashboard home without navigating to the Profiles page

### Phase 37: Design System Propagation

**Goal:** The codebase has no hardcoded color values for brand colors — only CSS tokens remain; all dashboard-area pages gain Framer Motion entrance animations matching the landing page quality; tier colors and card hover states are consistent everywhere.
**Depends on:** Phase 35
**Requirements:** DS-01, DS-02, DS-03, DS-04
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. No `rose-500` class appears anywhere in the web app codebase — all instances are replaced with the `primary` CSS token
  2. Dashboard home, profiles list, and analyses list pages animate in on mount (FadeIn) with list items staggered, matching the landing page motion language
  3. Tier color labels across all web pages use the unified palette: excellent=teal, good=green, fair=amber, poor=red — no emerald, blue, or gray variants
  4. All interactive cards across the web app respond to hover with a consistent lift effect (shadow + translate-y) matching the landing page card style

### Phase 38: Onboarding Rebuild

**Goal:** The WelcomeModal is rebuilt on Shadcn primitives and is dark-mode aware; the onboarding checklist has a proper completion state instead of silently disappearing; and users can re-access the tour from Settings.
**Depends on:** Phase 35
**Requirements:** ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06, ONB-07
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. WelcomeModal renders using Shadcn Dialog/Card components with zero hardcoded inline styles; it looks correct in both light and dark mode
  2. WelcomeModal CTA button uses the brand primary color token; modal includes one sentence explaining what HomeMatch does before prompting user to begin
  3. Onboarding checklist groups steps 5-8 under a visible "In the extension" section label so users understand context
  4. When all checklist steps complete, the checklist morphs into a success state reading "You're all set — start scoring on Flatfox" with a direct Flatfox link (it does not disappear)
  5. User can re-launch the onboarding tour from the Settings page after previously dismissing the checklist

### Phase 39: Critical Handoffs

**Goal:** The profile edit page gives users a clear, always-visible path to Flatfox after saving and shows them where they are in a multi-step form; the analyses page guides users to take action when empty instead of showing a dead end.
**Depends on:** Phase 36
**Requirements:** HND-01, HND-02, HND-03, HND-04
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. After saving preferences on the profile edit page, user sees a full-width primary button "Save & Open in Flatfox →" at the bottom of the page — it is always visible without scrolling
  2. Profile edit page displays a section progress indicator (e.g. "Step 2 of 5 — Budget") so the user knows how far through the form they are
  3. Analyses page with 0 analyses shows a primary "Open Flatfox →" CTA and a secondary "Download extension" link — no filter bar is rendered
  4. Analyses page filter bar is only rendered when at least 1 analysis exists

### Phase 40: Page Redesigns

**Goal:** Profiles list, AI chat, analyses cards, and Settings pages receive targeted visual upgrades that make key information scannable, context clear, and user journeys complete.
**Depends on:** Phase 37, Phase 38, Phase 39
**Requirements:** PG-01, PG-02, PG-03, PG-04, PG-05, PG-06, PG-07
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. Profile cards in the profiles list show the active profile badge, total analysis count, and last-used date; the active profile is visually prominent (highlighted border or pin indicator)
  2. AI chat page shows a context heading above the chat explaining what the conversation does and what will be created
  3. Transition from chat conversation to summary card is animated — the swap does not appear abrupt or jarring
  4. Analysis cards show a left-edge colored bar in the tier color (teal/green/amber/red) and a large, left-aligned score number — scannable at a glance
  5. Settings page contains a "Download Extension" section with the download button and sideloading instructions link

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 27. Data Model & Criterion Classifier | 3/3 | Complete | 2026-03-29 |
| 28. Deterministic Scorer | 2/2 | Complete | 2026-03-30 |
| 29. Subjective Scorer (OpenRouter) | 2/2 | Complete | 2026-03-30 |
| 30. Database & Infrastructure Prep | 1/1 | Complete | 2026-03-30 |
| 31. Hybrid Scorer & Router Integration | 3/3 | Complete | 2026-03-30 |
| 32. Frontend Consumers | 2/2 | Complete | 2026-03-30 |
| 33. Dashboard Home & Nav Polish | 2/2 | Complete | 2026-03-30 |
| 34. Onboarding & Tutorial System | 2/2 | Complete | 2026-03-31 |
| 35. Navigation & IA | 0/2 | Not started | - |
| 36. State-Aware Dashboard | 0/TBD | Not started | - |
| 37. Design System Propagation | 0/TBD | Not started | - |
| 38. Onboarding Rebuild | 0/TBD | Not started | - |
| 39. Critical Handoffs | 0/TBD | Not started | - |
| 40. Page Redesigns | 0/TBD | Not started | - |
