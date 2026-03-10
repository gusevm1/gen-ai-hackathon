# Roadmap: HomeMatch v1.0

## Overview

HomeMatch v1.0 delivers a Chrome extension on Flatfox.ch paired with a Next.js preferences website and an EC2 FastAPI scoring backend. Users set preferences on the website, then score listings on-demand via a floating button in the extension. The backend fetches listing data from Flatfox's public API and evaluates each listing against the user's weighted preferences using Claude. Scores appear as badges with 3-5 bullet summaries; full analysis lives on the website.

The build follows a dependency chain: infrastructure must exist before preferences can be stored, listing data must be fetchable before scoring, and scores must exist before badge UI renders. Within this chain, frontend and backend work is parallelized where possible.

## Architecture

```
Next.js (Vercel) ──▶ Supabase (Auth + DB + Edge Functions) ──▶ EC2 FastAPI ──▶ Claude API
                                    ▲                                    ──▶ Flatfox API
Chrome Extension (WXT) ────────────┘
```

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure & Auth** - Scaffold all codebases, deploy, configure Supabase auth + DB
- [ ] **Phase 2: Preferences & Data Pipeline** - Next.js preferences form + FastAPI Flatfox integration (parallel tracks)
- [ ] **Phase 3: LLM Scoring Pipeline** - Claude-powered evaluation endpoint + Supabase edge function proxy
- [ ] **Phase 4: Extension UI & Analysis Page** - Flatfox content script, FAB, badges, summary panel, full analysis page

## Phase Details

### Phase 1: Infrastructure & Auth
**Goal**: All codebases scaffolded, deployed, and connected via Supabase auth. Developer can log in on both website and extension, and the EC2 backend is reachable via edge functions.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, INFRA-01, INFRA-02, INFRA-03
**Parallelization**: Next.js scaffold, FastAPI scaffold, extension scaffold, and Supabase setup can all proceed in parallel — they only converge when wiring auth.
**Success Criteria** (what must be TRUE):
  1. Next.js app is deployed on Vercel with a landing page and Supabase login/signup flow
  2. FastAPI backend is deployed on EC2 via Docker with a health check endpoint
  3. Chrome extension (WXT) is scaffolded with a popup that has Supabase email/password login
  4. Supabase project has auth configured, database tables for preferences and analyses, and at least one edge function that can reach the EC2 backend
  5. User can sign up on the website and log in with the same credentials in the extension
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold all codebases (extension, web, backend, supabase) + database migrations
- [ ] 01-02-PLAN.md — Next.js auth flow (login/signup/dashboard) + Vercel deployment
- [ ] 01-03-PLAN.md — Extension popup auth + FastAPI EC2 deploy + edge function deploy

### Phase 2: Preferences & Data Pipeline
**Goal**: Users can set and save their property preferences on the website, and the backend can fetch + parse listing data from Flatfox's API
**Depends on**: Phase 1
**Requirements**: PREF-01, PREF-02, PREF-03, PREF-04, PREF-05, PREF-06, PREF-07, PREF-08, PREF-09, PREF-10, DATA-01, DATA-02
**Parallelization**: Frontend preferences form and backend Flatfox integration are independent — can be built in parallel. They share the Supabase preferences table schema as their contract.
**Success Criteria** (what must be TRUE):
  1. Next.js site has a single-page preferences form with collapsible sections for: standard filters (location, buy/rent, property type, budget, rooms, living space), soft criteria (free-text + reusable feature suggestions), and category weight sliders
  2. Preferences are saved to Supabase PostgreSQL and load correctly on page refresh
  3. FastAPI backend can fetch listing details from Flatfox API given a listing ID/URL
  4. Backend parses Flatfox API response into a structured listing object (price, rooms, address, description, features, images, coordinates)
  5. Backend has a test endpoint that accepts a listing ID and returns the parsed listing data
**Plans**: TBD

Plans:
- [ ] 02-01: TBD (frontend preferences)
- [ ] 02-02: TBD (backend Flatfox integration)

### Phase 3: LLM Scoring Pipeline
**Goal**: Backend can score a Flatfox listing against a user's weighted preferences via Claude, returning a structured score with category breakdown and reasoning
**Depends on**: Phase 2
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05
**Success Criteria** (what must be TRUE):
  1. POST /score endpoint accepts listing IDs + user ID, fetches listing from Flatfox API and preferences from Supabase, sends to Claude for evaluation
  2. Response includes a 0-100 overall score, per-category scores with weights applied, and 3-5 bullet-point reasoning per category
  3. Evaluation explicitly states "I don't know" for data points the listing does not provide
  4. Analysis is returned in the listing's language (DE/FR/IT)
  5. Supabase edge function proxies POST /score requests from extension to EC2 backend with auth validation
  6. Analysis results are stored in Supabase for retrieval by the website's full analysis page
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Extension UI & Analysis Page
**Goal**: Users see score badges on Flatfox listings triggered by a floating action button, can read 3-5 bullet summaries, and can click through to full analysis on the website
**Depends on**: Phase 3
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, EXT-07, EXT-08, WEB-01, WEB-02, WEB-03
**Parallelization**: Extension UI work and website analysis page can proceed in parallel — they share the scoring API as their contract.
**Success Criteria** (what must be TRUE):
  1. Extension content script activates on Flatfox.ch search results pages
  2. Floating action button appears and triggers scoring for all visible listings when clicked
  3. Extension extracts listing IDs from Flatfox search results DOM and sends them to backend via edge function
  4. Score badges (0-100 + match label) are injected next to each listing, rendered in Shadow DOM
  5. Clicking a badge expands a panel showing 3-5 key bullet points and a "See full analysis" link
  6. "See full analysis" opens the Next.js website's analysis page for that listing
  7. Full analysis page on Next.js shows complete category breakdown with weights, reasoning, and listing citations
  8. Extension popup shows login state, profile summary, and link to preferences website
  9. Loading skeleton/spinner shown while scores are being computed
**Plans**: TBD

Plans:
- [ ] 04-01: TBD (extension content script + badges)
- [ ] 04-02: TBD (website analysis page)

## Parallelization Strategy

```
Phase 1: ┌─ Next.js scaffold ──┐
          ├─ FastAPI scaffold ──┤──▶ Wire auth + edge functions
          ├─ Extension scaffold ┤
          └─ Supabase setup ────┘

Phase 2: ┌─ Preferences form (frontend) ─┐──▶ Integration test
          └─ Flatfox API integration (backend) ─┘

Phase 3: Sequential (scoring pipeline builds on both Phase 2 outputs)

Phase 4: ┌─ Extension UI (badges, FAB, summary) ─┐──▶ E2E test
          └─ Analysis page (website) ─────────────┘
```

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4
Within phases, parallel tracks execute simultaneously where marked.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Auth | 0/3 | Planned | - |
| 2. Preferences & Data Pipeline | 0/? | Not started | - |
| 3. LLM Scoring Pipeline | 0/? | Not started | - |
| 4. Extension UI & Analysis Page | 0/? | Not started | - |
