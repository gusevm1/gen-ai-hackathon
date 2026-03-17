# Roadmap: HomeMatch

## Milestones

- :white_check_mark: **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- :white_check_mark: **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- **v2.0 Polish & History** — Phases 11-13 (in progress)

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
- [ ] 11-01-PLAN.md — DB migration (stale column) + backend upsert update
- [ ] 11-02-PLAN.md — Edge function cache check + web stale-marking + extension API force_rescore
- [ ] 11-03-PLAN.md — FAB long-press re-score UX + stale display styling

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
| 11. Score Caching | 3/3 | Complete    | 2026-03-17 | - |
| 12. UX Polish & History | v2.0 | 0/0 | Not started | - |
| 13. Security Hardening | v2.0 | 0/0 | Not started | - |
