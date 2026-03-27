# Roadmap: HomeMatch

## Milestones

- :white_check_mark: **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- :white_check_mark: **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- :white_check_mark: **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- :white_check_mark: **v3.0 Extension Download & Install** — Phase 17
- **v4.0 Landing Page & Design System** — Phases 18-21 (in progress)
- **v5.0 Proximity-Aware Scoring** — Phases 22-24 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-13</summary>

- [x] **Phase 1: Infrastructure & Auth** - Scaffold all codebases, deploy, configure Supabase auth + DB
- [x] **Phase 2: Preferences & Data Pipeline** - Next.js preferences form + FastAPI Flatfox integration
- [x] **Phase 3: LLM Scoring Pipeline** - Claude-powered evaluation endpoint + Supabase edge function proxy
- [x] **Phase 4: Extension UI & Analysis Page** - Flatfox content script, FAB, badges, summary panel, full analysis page

</details>

<details>
<summary>v1.1 Demo-Ready + Multi-Profile (Phases 5-10) - SHIPPED 2026-03-15</summary>

- [x] **Phase 5: DB Schema Migration** - Profiles table, analyses FK, atomic profile switching RPC
- [x] **Phase 6: Backend + Edge Function Update** - Scoring pipeline becomes profile-aware end-to-end
- [x] **Phase 7: Preferences Schema Unification** - Canonical schema superset, updated Claude prompt
- [x] **Phase 8: UI Foundation** - Top navbar, dark mode, 21st.dev component integration
- [x] **Phase 9: Web Profile Management** - Profile CRUD, preferences form restructure, analysis page redesign
- [x] **Phase 10: Extension Profile Switcher** - Popup profile display, switcher, stale badge guard, session health

</details>

<details>
<summary>v2.0 Polish & AI Profile Creation (Phases 11-16) - SHIPPED 2026-03-17</summary>

- [x] **Phase 11: Score Caching** — Cache scores by listing+profile, invalidate on preference changes, manual re-score
- [x] **Phase 12-13: Parallel scoring + caching fixes** — Parallel listing scoring, price bug fix (Flatfox API stale data)
- [x] **Phase 14: Chat UI & Navigation** — AI-Powered Search nav item, chat page, profile name prompt, message thread
- [x] **Phase 15: AI Conversation Backend** — EC2 chat endpoint, multi-turn Claude preference extraction
- [x] **Phase 16: Summary & Profile Creation** — Summary card, inline editing, confirm-to-create, redirect to profile

</details>

### v3.0 Extension Download & Install

**Milestone Goal:** Add a "Download" page to the web app so users can download the Chrome extension and follow sideloading instructions.

- [x] **Phase 17: Download Page & Sideload Instructions** — Nav tab, zip download, step-by-step Chrome sideloading guide

**Requirements:** DL-01, DL-02, DL-03, DL-04, HOST-01

**Plans:** 1 plan

Plans:
- [x] 17-01-PLAN.md — Download nav item, extension zip hosting, download page with sideloading instructions

**Success Criteria:**
1. Authenticated user sees "Download" in top nav
2. Clicking "Download Extension" downloads the zip file
3. Instructions clearly guide user through unzip → chrome://extensions → Developer Mode → Load unpacked
4. Extension zip is up-to-date in public/ directory

### Phase 17: Download Page & Sideload Instructions

**Goal:** Add a "Download" page to the web app with a nav tab, zip download, and step-by-step Chrome sideloading guide so users can install the extension.

**Requirements:** DL-01, DL-02, DL-03, DL-04, HOST-01

### v4.0 Landing Page & Design System

**Milestone Goal:** Give HomeMatch a front door. A high-conversion landing page with Apple-inspired design, Hormozi-structured copy, and a live product demo animation — plus UI alignment across the dashboard.

**Branch:** `redesign/v4-landing` → PR → merge to main

- [ ] **Phase 18: Design System & Motion Foundation** — Framer Motion, typography scale, dark/light color split, animation primitives
- [ ] **Phase 19: Landing Page** — Hero with product demo animation, copy (EN/DE), features, CTA sections
- [ ] **Phase 20: Dashboard UI Alignment** — Propagate design language to dashboard, profiles, analysis pages
- [ ] **Phase 21: Polish & QA** — Mobile, performance (LCP/CLS), cross-browser, final copy pass

**Requirements:** LP-01 → LP-08, DS-01 → DS-04, UI-01 → UI-03

### v5.0 Proximity-Aware Scoring

**Milestone Goal:** Replace Claude's unreliable tool-calling for place lookup with a deterministic pre-fetch pipeline. Apify fetches nearby places before scoring, results are cached in Supabase, and injected as structured data into the Claude prompt.

- [x] **Phase 22: Database & Coordinate Resolution** — nearby_places_cache table + listing coordinate resolution with geocoding fallback (completed 2026-03-27)
- [x] **Phase 23: Proximity Extraction & Apify Integration** — Parse proximity requirements from preferences, call Apify Google Places, cache results in Supabase (completed 2026-03-27)
- [x] **Phase 24: Prompt Injection & Scoring Rules** — Inject verified nearby data into Claude prompt, remove tool references, update scoring rules (completed 2026-03-27)

**Requirements:** COORD-01, COORD-02, COORD-03, PROX-01, PROX-02, PROX-03, APIFY-01, APIFY-02, APIFY-03, CACHE-04, CACHE-05, CACHE-06, PROMPT-01, PROMPT-02, PROMPT-03, SCORE-01, SCORE-02

## Phase Details

### Phase 22: Database & Coordinate Resolution
**Goal**: Listings have verified coordinates before scoring, with a cache table ready for proximity data
**Depends on**: Nothing (first phase of v5.0; backend-only, independent of v4.0)
**Requirements**: CACHE-04, COORD-01, COORD-02, COORD-03
**Success Criteria** (what must be TRUE):
  1. nearby_places_cache table exists in Supabase with columns: id, lat, lon, query, radius_km, response_json, created_at
  2. Scoring pipeline checks listing lat/lon before proximity evaluation
  3. When coordinates are missing, system attempts geocoding and uses the result
  4. When geocoding fails, scoring proceeds without proximity evaluation and does not crash
**Plans**: 1 plan

Plans:
- [x] 22-01-PLAN.md — Cache table migration & coordinate resolution with geocoding fallback

### Phase 23: Proximity Extraction & Apify Integration
**Goal**: System identifies what places the user cares about, fetches verified nearby data from Google Places via Apify, and caches results to avoid duplicate API calls
**Depends on**: Phase 22
**Requirements**: PROX-01, PROX-02, PROX-03, APIFY-01, APIFY-02, APIFY-03, CACHE-05, CACHE-06
**Success Criteria** (what must be TRUE):
  1. System extracts place-based requirements (query, radius_km, importance) from user preferences dynamic_fields
  2. When no proximity requirements exist, Apify is never called and scoring proceeds normally
  3. For each proximity requirement, Apify returns nearby places with name, distance, rating, review count, and address
  4. Apify results are cached by (lat, lon, query, radius_km) — duplicate requests return cached data without API call
  5. On Apify failure, system treats result as empty and scoring continues without crashing
**Plans**: 1 plan

Plans:
- [x] 23-01-PLAN.md — Proximity extraction, Apify Google Places client, Supabase cache integration

### Phase 24: Prompt Injection & Scoring Rules
**Goal**: Claude receives verified nearby data as structured input and scores proximity based only on provided evidence, never guessing
**Depends on**: Phase 23
**Requirements**: PROMPT-01, PROMPT-02, PROMPT-03, SCORE-01, SCORE-02
**Success Criteria** (what must be TRUE):
  1. When nearby data exists, Claude prompt includes a "Nearby Places Data (Verified)" section with structured results
  2. When no proximity requirements exist, the nearby places section is omitted entirely from the prompt
  3. All search_nearby_places tool references are removed from Claude prompts and tool definitions
  4. Claude evaluates amenity proximity only on provided data — if an amenity is not in the data, it is treated as "not found"
**Plans**: 1 plan

Plans:
- [x] 24-01-PLAN.md — Prompt injection, tool removal, scoring rules update

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | Complete | 2026-03-17 |
| v3.0 Extension Download & Install | Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | In Progress | — |
| v5.0 Proximity-Aware Scoring | Not Started | — |

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Database & Coordinate Resolution | v5.0 | 1/1 | Complete   | 2026-03-27 |
| 23. Proximity Extraction & Apify Integration | v5.0 | 1/1 | Complete   | 2026-03-27 |
| 24. Prompt Injection & Scoring Rules | v5.0 | 1/1 | Complete   | 2026-03-27 |
