# Roadmap: HomeMatch

## Milestones

- :white_check_mark: **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- :white_check_mark: **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- **v2.0 Polish & History** — Phases 11-13 (in progress)
- **v3.0 AI-Powered Conversational Profile Creation** — Phases 14-16 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-13</summary>

- [x] **Phase 1: Infrastructure & Auth** — Scaffold all codebases, deploy, configure Supabase auth + DB (3/3 plans)
- [x] **Phase 2: Preferences & Data Pipeline** — Next.js preferences form + FastAPI Flatfox integration (2/2 plans)
- [x] **Phase 3: LLM Scoring Pipeline** — Claude-powered evaluation endpoint + Supabase edge function proxy (2/2 plans)
- [x] **Phase 4: Extension UI & Analysis Page** — Flatfox content script, FAB, badges, summary panel, full analysis page (5/5 plans)

</details>

<details>
<summary>v1.1 Demo-Ready + Multi-Profile (Phases 5-10) — SHIPPED 2026-03-15</summary>

- [x] **Phase 5: DB Schema Migration** — Profiles table, analyses FK, atomic profile switching RPC (1/1 plan)
- [x] **Phase 6: Backend + Edge Function Update** — Scoring pipeline becomes profile-aware end-to-end (1/1 plan)
- [x] **Phase 7: Preferences Schema Unification** — Canonical schema superset, updated Claude prompt (2/2 plans)
- [x] **Phase 8: UI Foundation** — Top navbar, dark mode, 21st.dev component integration (2/2 plans)
- [x] **Phase 9: Web Profile Management** — Profile CRUD, preferences form restructure, analysis page redesign (4/4 plans)
- [x] **Phase 10: Extension Profile Switcher** — Popup profile display, switcher, stale badge guard, session health (3/3 plans)

</details>

### v2.0 Polish & History (Phases 11-13)

**Milestone Goal:** Fix deferred v1.1 items -- score caching to reduce Claude API costs, duplicate profile UX, cross-profile analysis history, and JWT security hardening.

- [x] **Phase 11: Score Caching** — Cache scores by listing+profile, invalidate on preference changes, allow manual re-score (completed 2026-03-17)
- [ ] **Phase 12: UX Polish & History** — Duplicate profile rename modal, cross-profile analysis history page
- [ ] **Phase 13: Security Hardening** — Enable edge function JWT verification, fix extension token flow

### v3.0 AI-Powered Conversational Profile Creation (Phases 14-16)

**Milestone Goal:** Introduce a conversational AI interface that lets users describe their dream property in natural language and have the system extract and create a structured profile -- making profile creation feel like talking to a property advisor.

- [x] **Phase 14: Chat UI & Navigation** — Nav item, chat page layout, input UX, profile name prompt, message thread, AI avatar (completed 2026-03-17)
- [ ] **Phase 15: AI Conversation Backend** — New EC2 endpoint, multi-turn Claude integration, preference extraction, follow-up questions, summary signal
- [ ] **Phase 16: Summary & Profile Creation** — Structured summary card, inline editing, confirm-to-create via existing API, redirect to profile

## Phase Details

### Phase 11: Score Caching
**Goal**: Users get instant cached scores for previously-scored listings, reducing wait time and Claude API costs
**Depends on**: Phase 10 (v1.1 complete)
**Requirements**: CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. Scoring a listing that was already scored for the active profile returns the cached result instantly (no Claude API call)
  2. After saving updated preferences for a profile, re-scoring a listing produces a fresh result (not the old cached one)
  3. User can click a "re-score" option in the extension FAB to force a fresh evaluation even when a cached score exists
  4. Cached vs fresh scores are indistinguishable in the UI -- badges and analysis pages look identical
**Plans:** 3/3 plans complete
Plans:
- [x] 11-01-PLAN.md — DB migration (stale column) + backend upsert update
- [x] 11-02-PLAN.md — Edge function cache check + web stale-marking + extension API force_rescore
- [x] 11-03-PLAN.md — FAB long-press re-score UX + stale display styling

### Phase 12: UX Polish & History
**Goal**: Users can review all past analyses across profiles and get a smoother duplicate-profile experience
**Depends on**: Phase 11
**Requirements**: PROF-08, HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. Clicking "Duplicate" on a profile opens a rename modal pre-filled with "[Name] (copy)" that the user can edit before confirming
  2. An analysis history page shows all past analyses across all profiles, each labeled with its profile name
  3. User can click any entry in the analysis history to navigate to its full analysis view
**Plans**: TBD

### Phase 13: Security Hardening
**Goal**: Edge function verifies JWT tokens end-to-end, closing the security gap from v1.1
**Depends on**: Phase 12
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. Edge function is deployed without the `--no-verify-jwt` flag and rejects requests with invalid or missing tokens
  2. Extension scoring flow works end-to-end with JWT verification enabled (user can score listings as before)
  3. Web app analysis page requests work end-to-end with JWT verification enabled
**Plans**: TBD

### Phase 14: Chat UI & Navigation
**Goal**: Users can navigate to an AI-powered chat page, describe their ideal property in a large text input, name their future profile, and have a multi-turn conversation rendered in a clean chat thread
**Depends on**: Phase 13 (v2.0 complete)
**Requirements**: NAV-01, NAV-02, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09
**Success Criteria** (what must be TRUE):
  1. User sees "AI-Powered Search" in the top navbar with pinkish-red accent color, positioned before Profiles/Analysis/Settings
  2. Clicking the nav item opens a minimal centered chat page with a large text input whose placeholder guides the user on what to describe
  3. After typing their first message and pressing "Start Creating Profile", the user is prompted to name the profile before the conversation begins
  4. User and AI messages appear in a scrollable thread with clear visual distinction, AI messages show a circular HomeMatch avatar, and follow-up messages can be sent freely
  5. Refreshing the page starts a clean session (conversation is not persisted)
**Plans:** 3/3 plans complete
Plans:
- [x] 14-01-PLAN.md — Test scaffolds (Wave 0) + AI-Powered Search nav item
- [ ] 14-02-PLAN.md — Chat page components, state machine, route entry point
- [ ] 14-03-PLAN.md — Full test suite verification + visual checkpoint

### Phase 15: AI Conversation Backend
**Goal**: The EC2 backend hosts a conversation endpoint where Claude extracts structured preferences from natural language, asks smart follow-up questions, and signals when it has enough information
**Depends on**: Phase 14
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. A new FastAPI endpoint on EC2 accepts multi-turn conversation history and returns Claude's next response
  2. Claude extracts structured preferences (location, budget, type, rooms, size, lifestyle, amenities, importance levels) from the user's natural language description
  3. When the user's description is vague or missing key fields, Claude asks targeted follow-up questions rather than guessing
  4. Claude infers importance levels from language cues (e.g. "must have" becomes dealbreaker, "nice to have" becomes low importance)
  5. Claude signals readiness to generate a summary once sufficient preferences have been collected
**Plans**: TBD

### Phase 16: Summary & Profile Creation
**Goal**: Users see a structured, editable preference summary card in the chat and can confirm it to create a real HomeMatch profile that works identically to manually-created ones
**Depends on**: Phase 15
**Requirements**: SUMM-01, SUMM-02, SUMM-03, SUMM-04, PROF-09, PROF-10, PROF-11
**Success Criteria** (what must be TRUE):
  1. When the AI signals readiness, a structured preference summary card appears in the chat thread (not raw JSON) with fields matching the existing HomeMatch preference schema
  2. User can edit any field in the summary card inline before confirming
  3. Clicking confirm creates a standard HomeMatch profile via the existing profile creation API -- the created profile is structurally identical to manually-created profiles
  4. After profile creation, user is automatically navigated to the new profile's detail page
  5. The AI-created profile works with the existing scoring pipeline (extension can score listings against it without any modification)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
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
| 11. Score Caching | v2.0 | 3/3 | Complete | 2026-03-17 |
| 12. UX Polish & History | v2.0 | 0/0 | Not started | - |
| 13. Security Hardening | v2.0 | 0/0 | Not started | - |
| 14. Chat UI & Navigation | 3/3 | Complete   | 2026-03-17 | - |
| 15. AI Conversation Backend | v3.0 | 0/0 | Not started | - |
| 16. Summary & Profile Creation | v3.0 | 0/0 | Not started | - |
