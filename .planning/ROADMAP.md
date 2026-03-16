# Roadmap: HomeMatch

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-03-13)
- v1.1 Demo-Ready + Multi-Profile - Phases 5-10 (shipped 2026-03-15)
- **v2.0 Smart Preferences & UX Polish** - Phases 11-14 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-13</summary>

- [x] **Phase 1: Infrastructure & Auth** - Scaffold all codebases, deploy, configure Supabase auth + DB (3/3 plans)
- [x] **Phase 2: Preferences & Data Pipeline** - Next.js preferences form + FastAPI Flatfox integration (2/2 plans)
- [x] **Phase 3: LLM Scoring Pipeline** - Claude-powered evaluation endpoint + Supabase edge function proxy (2/2 plans)
- [x] **Phase 4: Extension UI & Analysis Page** - Flatfox content script, FAB, badges, summary panel, full analysis page (5/5 plans)

</details>

<details>
<summary>v1.1 Demo-Ready + Multi-Profile (Phases 5-10) - SHIPPED 2026-03-15</summary>

- [x] **Phase 5: DB Schema Migration** - Profiles table, analyses FK, atomic profile switching RPC (1/1 plan)
- [x] **Phase 6: Backend + Edge Function Update** - Scoring pipeline becomes profile-aware end-to-end (1/1 plan)
- [x] **Phase 7: Preferences Schema Unification** - Canonical schema superset, updated Claude prompt (2/2 plans)
- [x] **Phase 8: UI Foundation** - Top navbar, dark mode, 21st.dev component integration (2/2 plans)
- [x] **Phase 9: Web Profile Management** - Profile CRUD, preferences form restructure, analysis page redesign (4/4 plans)
- [x] **Phase 10: Extension Profile Switcher** - Popup profile display, switcher, stale badge guard, session health (3/3 plans)

</details>

### v2.0 Smart Preferences & UX Polish

**Milestone Goal:** Replace manual preference forms with AI chat-driven discovery, overhaul UI design, and enable parallel listing scoring.

**Phase Numbering:**
- Integer phases (11, 12, 13, 14): Planned milestone work
- Decimal phases (12.1, 12.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 11: Dynamic Preference Schema** - Add structured dynamic fields with importance levels across all layers (completed 2026-03-15)
- [x] **Phase 12: Chat-Based Preference Discovery** - AI chat interface that generates editable preference fields (completed 2026-03-16)
- [ ] **Phase 13: Parallel Scoring** - Score all visible listings from a single FAB click with progress tracking
- [ ] **Phase 14: UI Redesign & Extension Distribution** - Flatfox-inspired color palette and Chrome Web Store distribution

## Phase Details

### Phase 11: Dynamic Preference Schema
**Goal**: Users' preference profiles support structured AI-generated fields with importance levels, scored correctly by the backend
**Depends on**: Nothing (first phase of v2.0; builds on v1.1 schema)
**Requirements**: SCHM-01, SCHM-02, SCHM-03, SCHM-04, SCHM-05
**Success Criteria** (what must be TRUE):
  1. User can see dynamicFields with name, value, and importance (critical/high/medium/low) stored on their preference profile in Supabase
  2. Backend scoring prompt renders dynamic fields as a weighted "Custom Criteria" section where critical fields carry more weight than low fields
  3. Existing profiles with softCriteria data are automatically migrated to dynamicFields format without data loss
  4. Zod schema (web), Pydantic model (backend), and scoring prompt all accept and correctly process dynamic fields end-to-end
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md -- DynamicField types in Zod + Pydantic schemas, backward-compat migration, tests
- [x] 11-02-PLAN.md -- Scoring prompt with importance weighting, DynamicFieldsSection UI, migration wiring

### Phase 12: Chat-Based Preference Discovery
**Goal**: Users can discover and define their preferences through a conversational AI interface instead of manual form entry
**Depends on**: Phase 11 (dynamic fields must exist in backend before chat generates them)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06
**Success Criteria** (what must be TRUE):
  1. User can open a chat interface from their profile page and have a multi-turn conversation about what they want in a property
  2. After chatting, user sees AI-extracted preference fields with importance levels displayed for review
  3. User can edit, add, or delete any AI-generated field before saving to their profile
  4. Saving chat-generated fields preserves existing standard fields (location, budget, rooms) via JSONB merge
  5. Chat conversation survives page navigation within the same browser session
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md -- AI SDK install, lib/chat layer (system prompt, extraction schema, merge utility), chat API route, extraction server action, tests
- [x] 12-02-PLAN.md -- Chat UI components (ChatPanel, ChatMessages, ChatInput), profile page integration, sessionStorage persistence
- [x] 12-03-PLAN.md -- ExtractedFieldsReview component, extraction trigger + merge wiring, full-flow human verification checkpoint

### Phase 13: Parallel Scoring
**Goal**: Users can score all visible Flatfox listings at once instead of one at a time, with clear progress feedback
**Depends on**: Nothing (independent of Phases 11-12; uses existing scoring pipeline)
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04
**Success Criteria** (what must be TRUE):
  1. User clicks FAB once and all visible Flatfox listings begin scoring simultaneously
  2. FAB displays live progress counter showing "N of M scored" during batch scoring
  3. Backend handles concurrent Claude API and Flatfox fetch calls without rate limit errors (semaphore-bounded)
  4. Individual badges appear progressively as each listing finishes scoring (not all-at-once at the end)
**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

### Phase 14: UI Redesign & Extension Distribution
**Goal**: The product looks polished with a Flatfox-inspired color palette and users can install the Chrome extension without developer-mode sideloading
**Depends on**: Nothing (independent; recommended after Phases 11-12 to avoid visual regressions during active feature development)
**Requirements**: UIDX-01, UIDX-02, UIDX-03, UIDX-04
**Success Criteria** (what must be TRUE):
  1. Web app uses a teal/green color palette inspired by Flatfox across all pages (navbar, buttons, accents, badges)
  2. Web app presents a professional, polished SaaS appearance with consistent styling
  3. Website has an extension install page with download link and step-by-step setup instructions
  4. Chrome extension is available as an Unlisted Chrome Web Store listing that users can install with one click
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14
Note: Phases 13 and 14 are independent of 11-12 and could execute in any order. The hard dependency is Phase 11 before Phase 12.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure & Auth | v1.0 | 3/3 | Complete | 2026-03-13 |
| 2. Preferences & Data Pipeline | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. LLM Scoring Pipeline | v1.0 | 2/2 | Complete | 2026-03-10 |
| 4. Extension UI & Analysis Page | v1.0 | 5/5 | Complete | 2026-03-13 |
| 5. DB Schema Migration | v1.1 | 1/1 | Complete | 2026-03-13 |
| 6. Backend + Edge Function Update | v1.1 | 1/1 | Complete | 2026-03-13 |
| 7. Preferences Schema Unification | v1.1 | 2/2 | Complete | 2026-03-13 |
| 8. UI Foundation | v1.1 | 2/2 | Complete | 2026-03-13 |
| 9. Web Profile Management | v1.1 | 4/4 | Complete | 2026-03-15 |
| 10. Extension Profile Switcher | v1.1 | 3/3 | Complete | 2026-03-15 |
| 11. Dynamic Preference Schema | v2.0 | 2/2 | Complete | 2026-03-15 |
| 12. Chat-Based Preference Discovery | v2.0 | Complete    | 2026-03-16 | 2026-03-17 |
| 13. Parallel Scoring | v2.0 | 0/TBD | Not started | - |
| 14. UI Redesign & Extension Distribution | v2.0 | 0/TBD | Not started | - |
