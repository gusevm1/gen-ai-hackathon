# Roadmap: HomeMatch v1.0

## Overview

HomeMatch v1.0 delivers a working Chrome extension on Homegate.ch that onboards users with a preference profile, fetches listing data in the background, scores each listing against the profile via Claude, and displays match score badges with transparent reasoning directly on search results. The build follows the core dependency chain: profile must exist before scoring, listing data must be extractable before LLM evaluation, and scores must exist before badge UI renders. Four phases deliver this chain vertically, each producing a testable, coherent capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Onboarding** - WXT scaffold, manifest, storage schema, full-page onboarding wizard, and preference profile persistence
- [ ] **Phase 2: Data Extraction & Backend** - Background fetch of Homegate listing detail pages, __INITIAL_STATE__ parsing, and EC2 Hono proxy setup
- [ ] **Phase 3: LLM Scoring Pipeline** - Claude-powered evaluation of listings against user profile with weighted categories and multilingual output
- [ ] **Phase 4: Score UI & Extension Polish** - Badge injection on search results, progressive loading, expandable breakdown panel, and extension popup dashboard

## Phase Details

### Phase 1: Foundation & Onboarding
**Goal**: Users can install the extension, complete a comprehensive preference wizard, and have their profile persist across browser sessions
**Depends on**: Nothing (first phase)
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, ONBD-07, ONBD-08, ONBD-09, ONBD-10, ONBD-11, ONBD-12, ONBD-13, ONBD-14
**Success Criteria** (what must be TRUE):
  1. User sees a full-page onboarding wizard automatically on first install, with steps for location, buy/rent, property type, budget, rooms, living area, year built, floor, availability, features, custom interests, and weight configuration
  2. User can configure importance weights per category via sliders and see them reflected in their saved profile
  3. User can add free-text custom soft-criteria (e.g., "near Bahnhof", "low taxes") during onboarding
  4. User's complete preference profile persists in chrome.storage.local and survives browser restarts
  5. Extension loads on Homegate.ch without errors and the WXT scaffold supports content script, background worker, popup, and onboarding page entrypoints
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md -- WXT scaffold, dependencies, profile schema, storage layer, tests
- [ ] 01-02-PLAN.md -- Step 1 Standard Filters form + Step 2 Soft Criteria form
- [ ] 01-03-PLAN.md -- Weight redistribution hook + Step 3 Weight Allocation form
- [ ] 01-04-PLAN.md -- Wizard shell wiring, popup dashboard, end-to-end verification

### Phase 2: Data Extraction & Backend
**Goal**: Extension can invisibly fetch listing detail pages and extract structured data, and a secure EC2 backend is ready to proxy LLM requests
**Depends on**: Phase 1
**Requirements**: EXTR-01, EXTR-02, EXTR-03, BACK-01, BACK-02, BACK-03
**Success Criteria** (what must be TRUE):
  1. Background service worker fetches Homegate listing detail pages without opening any visible tabs
  2. Listing data (description, specs, features) is correctly extracted from Homegate's __INITIAL_STATE__ JSON
  3. Concurrent fetches are throttled to 2-3 simultaneous requests to avoid rate limiting
  4. EC2 backend accepts listing data + user profile at POST /score and proxies to Claude API with keys stored server-side only
  5. Backend returns structured JSON response (percentage, categories, reasoning) to the extension
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: LLM Scoring Pipeline
**Goal**: Each listing on a Homegate search results page is evaluated by Claude against the user's weighted preference profile, with transparent reasoning and honest uncertainty
**Depends on**: Phase 1, Phase 2
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05
**Success Criteria** (what must be TRUE):
  1. Each listing receives a percentage match score with weighted category breakdown (location, budget, features, soft-criteria, etc.)
  2. Each category includes bullet-point reasoning that references specific text from the listing description
  3. Evaluation explicitly states "I don't know" for data points the listing does not provide rather than guessing
  4. Analysis is returned in the listing's language (DE, FR, or IT) matching the listing content
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Score UI & Extension Polish
**Goal**: Users see match score badges on every listing in Homegate search results, can expand detailed breakdowns, and can manage the extension via popup
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Score badge (percentage + match label) appears next to each listing on Homegate search results, rendered in Shadow DOM without CSS interference
  2. Loading skeleton badges appear immediately on page load while scores are being computed, and real scores replace them progressively as each LLM call resolves
  3. User can click a score badge to expand an inline analysis panel showing category breakdowns, bullet-point reasoning, and listing text citations
  4. Extension popup shows a profile summary, on/off toggle, and link to edit preferences (including weight adjustment)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Onboarding | 1/4 | In Progress | - |
| 2. Data Extraction & Backend | 0/? | Not started | - |
| 3. LLM Scoring Pipeline | 0/? | Not started | - |
| 4. Score UI & Extension Polish | 0/? | Not started | - |
