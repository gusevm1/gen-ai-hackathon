# Roadmap: HomeMatch

## Milestones

- :white_check_mark: **v1.0 MVP** - Phases 1-4 (shipped 2026-03-13)
- :construction: **v1.1 Demo-Ready + Multi-Profile** - Phases 5-10 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-13</summary>

- [x] **Phase 1: Infrastructure & Auth** - Scaffold all codebases, deploy, configure Supabase auth + DB
- [x] **Phase 2: Preferences & Data Pipeline** - Next.js preferences form + FastAPI Flatfox integration
- [x] **Phase 3: LLM Scoring Pipeline** - Claude-powered evaluation endpoint + Supabase edge function proxy
- [x] **Phase 4: Extension UI & Analysis Page** - Flatfox content script, FAB, badges, summary panel, full analysis page

</details>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (5.1, 5.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 5: DB Schema Migration** - Profiles table, analyses FK, clean-slate drop, atomic profile switching RPC
- [ ] **Phase 6: Backend + Edge Function Update** - Scoring pipeline becomes profile-aware end-to-end
- [ ] **Phase 7: Preferences Schema Unification** - Canonical schema superset, updated Claude prompt with structured importance
- [ ] **Phase 8: UI Foundation** - Sidebar layout, navbar, dark mode, 21st.dev component integration
- [ ] **Phase 9: Web Profile Management** - Profile CRUD, preferences form restructure, analysis page redesign
- [ ] **Phase 10: Extension Profile Switcher** - Popup profile display, switcher, stale badge guard, session health

## Phase Details

### Phase 5: DB Schema Migration
**Goal**: Database fully supports multiple profiles per user with atomic switching via clean-slate migration (drop legacy tables, create new schema)
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: PROF-07
**Success Criteria** (what must be TRUE):
  1. Legacy `user_preferences` and `analyses` tables are dropped (clean slate -- only test data existed)
  2. The `profiles` table enforces at most one active profile per user at the database level (partial unique index on `is_default`)
  3. Calling the `set_active_profile()` RPC function atomically deactivates the old profile and activates the new one in a single transaction
  4. The `analyses` table has a `profile_id` foreign key and its unique constraint is `(user_id, listing_id, profile_id)`, allowing per-profile analysis history
**Plans:** 1 plan

Plans:
- [x] 05-01-PLAN.md -- Write and deploy profiles schema migration (profiles table, analyses FK, RLS, set_active_profile RPC)

### Phase 6: Backend + Edge Function Update
**Goal**: The scoring pipeline reads preferences from the profiles table, resolves the active profile server-side, and stores profile attribution on every analysis
**Depends on**: Phase 5
**Requirements**: (enables PROF-05 end-to-end; no standalone requirement -- infrastructure phase)
**Success Criteria** (what must be TRUE):
  1. FastAPI backend queries the `profiles` table (not `user_preferences`) to load preferences for scoring
  2. The Supabase edge function resolves the active profile server-side by querying `profiles WHERE is_default = true` using the authenticated JWT -- never trusting a profile ID from the extension
  3. Every new analysis row is saved with the `profile_id` that was used for scoring
  4. Scoring a listing with one active profile, then switching active profile and re-scoring, produces two separate analysis records
**Plans:** 1 plan

Plans:
- [x] 06-01-PLAN.md -- Update backend + edge function for profile-aware scoring pipeline (ScoreRequest, save_analysis, edge function profile resolution)

### Phase 7: Preferences Schema Unification
**Goal**: Web app, extension, and backend all share a single canonical preferences schema, and the Claude prompt uses structured importance levels for better scoring quality
**Depends on**: Phase 6
**Requirements**: PREF-13, PREF-14
**Success Criteria** (what must be TRUE):
  1. A single canonical preferences schema defines all fields (including extension-only fields like `radiusKm`, `floorPreference`, `yearBuiltMin/Max`) and is used by the web app, extension, and backend
  2. The backend Pydantic model accepts and passes all canonical fields to the Claude prompt -- no fields are silently dropped
  3. The Claude scoring prompt uses structured importance levels (`critical`, `high`, `medium`, `low`) instead of floating-point weight decimals
  4. Scoring a listing that involves previously-ignored fields (e.g., floor preference) now produces reasoning that references those fields
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md -- Define canonical Zod schema + rewrite Pydantic model with backward-compatible parsing
- [ ] 07-02-PLAN.md -- Update Claude system/user prompts with importance levels and dealbreaker semantics

### Phase 8: UI Foundation
**Goal**: The web app has a professional SaaS layout shell with sidebar navigation, navbar with user identity, and dark/light mode -- ready for profile pages to be built inside it
**Depends on**: Phase 5 (needs profiles table for navbar profile display)
**Requirements**: UI-01, UI-02, UI-03, UI-05
**Success Criteria** (what must be TRUE):
  1. The app has a collapsible sidebar with navigation links that persists across all pages
  2. The navbar displays the logged-in user's identity, the active profile name, and a profile switcher dropdown
  3. Dark/light mode toggle works and respects system preference on first load, with the choice persisting across sessions
  4. At least one 21st.dev component is integrated via research-first workflow (agent checks GitHub usage/quality before installing)
  5. No CSS variable conflicts or Base UI migration regressions (asChild removed, Accordion defaultValue as string array)
**Plans:** 2 plans

Plans:
- [ ] 08-01-PLAN.md -- Install dependencies, fix dark mode CSS, create ThemeProvider, restructure into route groups
- [ ] 08-02-PLAN.md -- Build sidebar + navbar + theme toggle + user menu + 21st.dev component + placeholder pages

### Phase 9: Web Profile Management
**Goal**: Users can fully manage multiple search profiles from the web app, with a restructured preferences form that distinguishes dealbreakers from weighted preferences, and a redesigned analysis page ready for demo presentations
**Depends on**: Phase 7 (canonical schema), Phase 8 (layout shell)
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PREF-11, PREF-12, PREF-15, UI-04
**Success Criteria** (what must be TRUE):
  1. User can create, rename, duplicate, and delete profiles from a profile list page showing cards with name, key criteria summary, and active badge
  2. User can set a profile as active from the profile list, and the active profile is reflected in the navbar immediately
  3. Deleting the last remaining profile is blocked with an explanation
  4. The preferences form distinguishes dealbreakers (hard constraints) from weighted soft preferences using importance chips (Low/Medium/High/Critical) instead of sliders for non-numeric criteria
  5. A live profile summary preview on the preferences form shows the user a natural-language description of what the profile is looking for
  6. The analysis page has a professional layout suitable for demo presentations with clear category breakdown and visual hierarchy
**Plans**: TBD

### Phase 10: Extension Profile Switcher
**Goal**: The Chrome extension displays the active profile, allows quick switching, guards against stale scores, and maintains session health for reliable demo presentations
**Depends on**: Phase 9 (profile management must be stable)
**Requirements**: EXT-09, EXT-10, EXT-11, EXT-12, EXT-13
**Success Criteria** (what must be TRUE):
  1. The extension popup shows the active profile name immediately on open
  2. A profile switcher dropdown in the popup lets the user change active profile without leaving Flatfox
  3. When the active profile changes mid-session, existing score badges on the page show a visual stale indicator
  4. Clicking the FAB performs a session health check and the popup shows a "Connected" indicator when the session is valid
  5. Score badges and summary panels have an improved, polished design consistent with the web app's visual language
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7 -> 8 -> 9 -> 10
Note: Phase 8 depends on Phase 5 (not 7), so it could theoretically parallel 6-7, but sequential execution avoids merge conflicts in shared files.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure & Auth | v1.0 | 3/3 | Complete | 2026-03-13 |
| 2. Preferences & Data Pipeline | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. LLM Scoring Pipeline | v1.0 | 2/2 | Complete | 2026-03-10 |
| 4. Extension UI & Analysis Page | v1.0 | 5/5 | Complete | 2026-03-13 |
| 5. DB Schema Migration | v1.1 | 1/1 | Complete | 2026-03-13 |
| 6. Backend + Edge Function Update | v1.1 | 1/1 | Complete | 2026-03-13 |
| 7. Preferences Schema Unification | v1.1 | 0/2 | Not started | - |
| 8. UI Foundation | v1.1 | 0/2 | Not started | - |
| 9. Web Profile Management | v1.1 | 0/? | Not started | - |
| 10. Extension Profile Switcher | v1.1 | 0/? | Not started | - |
