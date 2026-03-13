# Project Research Summary

**Project:** HomeMatch v1.1 — UI Overhaul + Multi-Profile Support
**Domain:** AI-powered property scoring SaaS with Chrome extension + multi-profile management
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

HomeMatch v1.1 is a focused enhancement milestone on top of a working v1.0 product: it adds a professional SaaS-grade UI (sidebar layout, navbar, dark mode), multi-profile management (users can maintain multiple named search profiles for different property searches), and a structural improvement to the preferences UX that directly improves Claude scoring quality. The stack is already in place — Next.js 16.1.6 + React 19 + shadcn v4 (Base UI primitives, not Radix) + Supabase + FastAPI + WXT Chrome extension. The only new library required is `next-themes` for dark mode. All other additions are shadcn component installs via CLI. The architecture is well-understood from direct codebase analysis.

The recommended implementation sequence is schema-first: the `profiles` table and `analyses.profile_id` FK must land before any UI or backend changes. The multi-profile feature touches 6 separate layers (DB, edge function, FastAPI backend, web app, Chrome extension popup), and each layer has a clear dependency on the one before. The scoring path's critical change is in the Supabase edge function `score-proxy`: it must resolve the active profile server-side (by `is_default = true`) rather than relying on any profile ID passed from the extension. This server-authoritative pattern eliminates an entire class of stale-state bugs.

The top risk is a known schema divergence between the web app and Chrome extension preference schemas: the extension has richer fields (`radiusKm`, `floorPreference`, `yearBuiltMin/Max`) that the backend silently ignores today. This must be resolved during the preferences form restructure phase before the B2B demo. Additional critical risks are the `analyses` unique constraint (must be changed before multi-profile scoring is wired up) and Base UI migration gotchas (`asChild` removal, Accordion `defaultValue` string type requirement). All have clear prevention steps documented in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The existing stack requires no structural changes for v1.1. The project already runs on Next.js 16.1.6 + React 19 + TypeScript 5 on Vercel, with shadcn v4 using the `base-nova` style (Base UI primitives via `@base-ui/react`), TailwindCSS v4, Supabase auth + PostgreSQL + edge functions, and a WXT MV3 Chrome extension. The only new dependency is `next-themes@0.4.6` for dark mode. All new UI components are added via `npx shadcn@latest add` which reads `components.json` and installs Base UI variants automatically.

**Core new additions:**
- `shadcn Sidebar component` — collapsible app layout with SidebarFooter profile switcher slot built in; `globals.css` already has all sidebar CSS variables pre-defined
- `next-themes@0.4.6` — dark/light mode; canonical solution for Next.js; 2-line integration; handles SSR flash and `localStorage` persistence automatically
- `search_profiles` Supabase table (pure SQL migration, no new packages) — replaces single-row `user_preferences` with a one-to-many profile table per user; partial unique index enforces single active profile at DB level
- `shadcn DropdownMenu`, `Avatar`, `Tooltip`, `Dialog` — supporting components for profile switcher, user avatar, collapsed sidebar tooltips, and profile CRUD modals

**What not to use:** Radix UI primitives for any new components (project is on Base UI), `framer-motion` (use `tw-animate-css` already installed), `react-query`/`swr` for profile fetching (server components + server actions are sufficient), CSS-in-JS, or storing `active_profile_id` on `auth.users` (locked auth schema).

### Expected Features

**Must have for v1.1 demo (P1):**
- Navbar with user identity anchor + profile switcher dropdown — professional baseline; without it the app looks like a hackathon prototype
- Profiles list page with profile cards (name, key criteria summary, active badge) — landing page after login
- Create / rename / delete profile with confirmation dialog — core CRUD; guarded delete required; disable delete on last remaining profile
- Set active profile — drives extension scoring; must update `is_default` atomically in DB via Postgres RPC
- Preferences form restructured with dealbreaker vs. weighted preference distinction — direct improvement to Claude prompt quality, not just UX polish
- Profile summary preview (live natural-language summary on form) — builds user trust, catches errors before scoring
- Extension popup shows active profile name — prevents scoring-against-wrong-profile during demo

**Should have (P2 — add post-demo when validated):**
- Duplicate profile — high B2B value (property manager workflow), low implementation cost
- Analysis history filtered by profile — needs `profile_id` FK on analyses, already planned in migration
- Profile name as Claude prompt context — one-line prompt change; validate impact on scoring quality first

**Defer to v2+:**
- Team / organization model with RBAC — only if B2B pilot proves out with Bellevia Immobilien
- Profile templates for common searches — broker onboarding feature
- Score caching per profile and new listing notifications — requires server-side monitoring infrastructure

**Key UX finding on preferences form:** Structured inputs materially outperform freeform text for LLM consumption. Replace weight sliders with a two-tier system (dealbreakers as hard constraints + importance chips Low/Medium/High/Critical for soft preferences). Keep sliders only for numeric ranges (budget, sqm). Pass importance to Claude as labeled levels (`"critical"`, `"must_not_exceed"`) not floating-point decimals.

### Architecture Approach

The architecture is an incremental migration from single-profile to multi-profile across 6 layers with clear dependency ordering. The foundational insight is that active profile resolution belongs server-side: the edge function queries `profiles WHERE is_default = true` using the authenticated JWT, and never trusts a `profile_id` passed from the extension. The extension is a thin scoring client — it does not own profile state. A PostgreSQL partial unique index enforces the "at most one default profile per user" invariant at the DB level, eliminating application-layer enforcement bugs.

**Major components and responsibilities:**
1. `profiles` DB table — stores N profiles per user; `is_default` boolean + partial unique index enforces single active profile; preferences stored as JSONB (same shape as old `user_preferences`)
2. `score-proxy` edge function (modified) — resolves active profile server-side; adds `profile_id` to backend proxy payload; returns 404 if no profile exists (guides new users)
3. FastAPI `SupabaseService` (modified) — queries `profiles` table by `profile_id`; saves `profile_id` on each analysis row
4. Web dashboard + `/profiles/[id]` routes (new) — full profile CRUD via Next.js server actions; reuses existing `PreferencesForm` wrapped in `ProfileForm` to avoid duplication
5. Extension popup profile switcher (new) — fetches profiles from Supabase REST on every popup open (always-fresh, no stale cache); switches active profile via Supabase RPC for atomic default swap
6. `analyses` table (modified) — adds `profile_id` FK; unique constraint changes from `(user_id, listing_id)` to `(user_id, listing_id, profile_id)` enabling per-profile analysis history

**Build order is strictly:** DB migration → FastAPI backend → edge function → web dashboard → extension popup → analysis page polish. Each step is independently testable before the next.

### Critical Pitfalls

1. **`analyses` unique(user_id, listing_id) constraint silently overwrites analyses under multi-profile** — Add `profile_id` FK to `analyses`, change unique constraint to `(user_id, listing_id, profile_id)`, backfill existing rows with the default profile ID before dropping the old constraint. Must land in the DB migration phase, before multi-profile scoring is wired up.

2. **Web/extension preference schema divergence causes rich extension criteria to be silently ignored by backend** — The extension schema has `radiusKm`, `yearBuiltMin/Max`, `floorPreference`, `availability` that the backend `UserPreferences` Pydantic model drops silently. Define a canonical superset schema before v1.1 demo; update backend Python models and Claude prompt to use new fields.

3. **shadcn Base UI migration breaks existing patterns without errors** — Two specific silent failures: (a) `asChild` prop silently ignored — use `render` prop instead; grep `web/src/` for all `asChild` usage post-migration; (b) Accordion `defaultValue` must be a string array matching explicit `AccordionItem value` props — numeric indices silently collapse all sections.

4. **Tailwind v4 + shadcn globals.css CSS variable double-definition corrupts theme colors** — `create-next-app` scaffolded CSS variables conflict with shadcn init's `@theme inline` block. Clear the default Next.js `--background`/`--foreground` variables from `globals.css` before running `npx shadcn init`. Verify exactly one `:root {}` block in the final file.

5. **Extension scores against stale active profile when `activeProfileId` is cached in component state** — Never store `activeProfileId` in React state or local variables in the content script. Read fresh from `browser.storage.local` at the moment the FAB is clicked. The edge function also resolves the active profile server-side, so scoring correctness is maintained even if popup display is stale.

6. **Demo session expiry causes blank scoring at the pilot meeting** — Supabase JWT expires after 1 hour; background service worker refresh cycle stops after 30s idle. Add a session health check on FAB click; display a "Connected" indicator in popup; re-authenticate 30 minutes before the Bellevia Immobilien demo; pre-score demo listings as a fallback.

---

## Implications for Roadmap

Based on research, the build has strict dependency ordering and naturally decomposes into 6 phases. The first three phases are infrastructure/schema with no visible UI changes and must complete before frontend work begins.

### Phase 1: DB Schema Migration

**Rationale:** Nothing else works without the correct schema. The `user_preferences` unique(user_id) constraint and the `analyses` unique(user_id, listing_id) constraint are both actively hostile to multi-profile. Must land first, before any backend or frontend change. The `set_active_profile` Postgres RPC function should be written here too as a critical path item used by both the backend and extension.
**Delivers:** `profiles` table with `is_default` partial unique index + RLS policies + `user_id` index; `analyses.profile_id` FK + updated unique constraint + backfill of existing analysis rows; data backfill from `user_preferences` to `profiles`; `set_active_profile()` Postgres RPC function for atomic default swap
**Addresses:** Foundation for all P1 features
**Avoids:** Pitfall 1 (analyses constraint overwrite), Pitfall 6 (user_preferences unique constraint blocks multi-profile row insert)

### Phase 2: Backend + Edge Function Update

**Rationale:** Backend must accept `profile_id` before the edge function changes; edge function must resolve active profile from the new table before any UI drives scoring. These two layers deploy together as a tested unit.
**Delivers:** FastAPI `SupabaseService` queries `profiles` table; edge function resolves active profile server-side (`is_default = true`); `profile_id` stored on analysis rows; scoring is end-to-end multi-profile-aware; `profile_id` ownership validated in edge function (security)
**Addresses:** Set active profile (scoring side), analysis attribution to profile
**Avoids:** Pitfall 4 (stale profile ID in scoring path), security mistake of unvalidated `profile_id` from extension

### Phase 3: Preferences Schema Unification

**Rationale:** The web/extension schema divergence means rich extension fields are silently dropped by the backend today. This must be resolved before the preferences form restructure because both form and Claude prompt must reference the same canonical schema. Failing to unify before the demo means all preferences UX improvements have no effect on actual scoring quality.
**Delivers:** Canonical superset preferences schema; updated Pydantic models in FastAPI; Claude prompt updated to use `radiusKm`, `floorPreference`, `yearBuiltMin/Max`; structured importance levels (`critical`/`high`/`medium`/`low`) replace floating-point weight decimals in Claude prompt
**Addresses:** Better Claude prompt quality (prerequisite for dealbreaker vs. preference distinction)
**Avoids:** Pitfall 5 (web/extension schema divergence)

### Phase 4: UI Foundation (Layout + Dark Mode)

**Rationale:** Before building profile-specific UI, the app needs its permanent layout shell. The shadcn Sidebar + next-themes integration happens once and affects all subsequent pages. Base UI migration gotchas (asChild, Accordion, CSS variables) must be resolved here before more components are added on top.
**Delivers:** shadcn Sidebar layout with `SidebarProvider`; navbar with user identity + active profile display + dark/light toggle; `next-themes` ThemeProvider in root layout; all Base UI migration fixes (asChild grep-and-fix, Accordion defaultValue strings, globals.css cleanup); `cache()` deduplication for navbar auth fetch
**Uses:** `shadcn sidebar`, `shadcn dropdown-menu`, `shadcn avatar`, `shadcn tooltip`, `next-themes@0.4.6`, chosen 21st.dev navbar component
**Avoids:** Pitfall 3 (CSS variable double-definition), Pitfall 7 (navbar auth waterfall), Pitfall 8 (asChild removal)

### Phase 5: Web Profile Management

**Rationale:** Primary profile management surface for the demo. Replaces the single-form `/dashboard` with a profile list + per-profile edit routes. Depends on Phase 4 layout shell being in place and Phase 3 preferences schema being canonical.
**Delivers:** `/dashboard` rewritten as profile list with profile cards; `/profiles/[id]` edit route reusing existing `PreferencesForm` wrapped in `ProfileForm`; create/rename/delete/set-active profile via server actions; preferences form restructured with dealbreakers + category labels + importance chips + profile summary preview; empty state for new users
**Addresses:** All P1 must-have features for web app; P2 duplicate profile
**Avoids:** Anti-pattern of duplicating `PreferencesForm`; Pitfall 2 (Accordion defaultValue after migration); freeform text as primary input (use structured form with optional notes supplement)

### Phase 6: Extension Profile Switcher + Demo Preparation

**Rationale:** Extension changes are the final integration layer. All server-side profile state must be stable before adding the popup UI. Demo preparation (session health check, pre-scoring, rehearsal) is bundled here as a hard dependency on demo day.
**Delivers:** Extension popup shows active profile name on open; profile switcher dropdown in popup; `getProfiles` + `setActiveProfile` message handlers in background service worker (using Supabase RPC for atomic swap); stale badge indicator when profile switches mid-session; session health check on FAB click; "Connected" indicator in popup; active profile name on FAB tooltip
**Addresses:** Extension popup active profile display (P1); stale badge UX guard
**Avoids:** Pitfall 4 (stale `activeProfileId` in content script — read fresh at FAB click time), Pitfall 9 (profile switch shows stale badges without visual warning), Pitfall 10 (expired session on demo day)

### Phase Ordering Rationale

- DB migration is strictly first because the unique constraints actively corrupt multi-profile data if not changed before any profile rows are written
- Backend before edge function: edge function starts forwarding `profile_id` downstream, which the backend must already accept
- Schema unification before preferences form restructure: form and Claude prompt changes must reference the same field names or the UX improvements have no effect on scoring
- Layout shell before profile pages: profile pages inherit the sidebar layout; building them without the shell creates throwaway work
- Web before extension: web is the authoritative profile management surface; extension popup is a secondary display and quick-switch UI
- Demo prep bundled with extension phase: session health check and stale-badge guard are both extension-layer concerns; rehearsal gates the entire milestone

### Research Flags

Phases needing deeper investigation during planning:
- **Phase 3 (Preferences Schema Unification):** The exact delta between web and extension schemas requires a line-by-line audit of `web/src/lib/schemas/preferences.ts` vs `extension/src/schema/profile.ts` vs `backend/app/models/preferences.py`. The Claude prompt changes require empirical testing to verify measurable scoring improvement. May surface additional fields the current form does not expose at all.
- **Phase 6 (Extension Profile Switcher):** The stale-badge notification pathway (background → content script) has edge cases around tab enumeration (which tabs to notify) and cross-tab consistency. The `setActiveProfile` RPC call error-handling path needs explicit specification.

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (DB Migration):** SQL migration fully specified in ARCHITECTURE.md and STACK.md with exact DDL. Standard Supabase migration workflow with `supabase migration new`.
- **Phase 2 (Backend + Edge Function):** FastAPI Pydantic model changes are minor additions. Edge function pattern is established in existing `score-proxy`. Fully specified in ARCHITECTURE.md.
- **Phase 4 (UI Foundation):** shadcn sidebar + next-themes is a well-documented standard pattern. Installation commands and integration code are fully specified in STACK.md. asChild grep-and-fix is mechanical.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official changelogs and docs; `components.json` and `globals.css` verified from codebase directly; version compatibility confirmed for March 2026 |
| Features | MEDIUM-HIGH | UI patterns well-documented; LLM structured-input research is solid (multiple concordant sources); B2B multi-profile specifics inferred from analogous SaaS tools (Google Analytics, Salesforce) rather than Swiss real estate-specific precedent |
| Architecture | HIGH | Based on direct codebase analysis; schema, data flows, and component boundaries derived from actual running code; all integration points verified against existing code paths |
| Pitfalls | HIGH | 7 of 10 pitfalls verified directly from codebase (schema files, migration SQL, Supabase functions); 3 pitfalls verified against official shadcn changelogs and GitHub issues with specific issue numbers and reproducible error conditions |

**Overall confidence:** HIGH

### Gaps to Address

- **Canonical preferences schema superset:** The exact list of extension fields to add to the web form and backend is not enumerated in research. Requires side-by-side comparison of `web/src/lib/schemas/preferences.ts` vs `extension/src/schema/profile.ts` vs `backend/app/models/preferences.py` as the first task in Phase 3.
- **21st.dev navbar component selection:** Research identified 43 navbar components on 21st.dev but the specific one to use has not been chosen. Must browse `21st.dev/s/navbar` and select before Phase 4 implementation begins. Risk is LOW — all components install via the same shadcn CLI pattern and land as editable source files.
- **B2B profile count soft cap:** Research recommends 5-10 profiles but the right number for the Bellevia Immobilien pilot is unknown. Validate with Vera Caflisch at the demo and enforce the limit post-pilot.
- **`set_active_profile` Postgres RPC function testing:** The RPC function is specified in ARCHITECTURE.md but not yet written. Write and test it during Phase 1 alongside the migration; it is a critical path item for both Phase 2 (backend) and Phase 6 (extension).

---

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Changelog — January 2026 Base UI](https://ui.shadcn.com/docs/changelog/2026-01-base-ui) — Base UI component availability confirmed
- [shadcn/ui Migration Guide: Radix to Base UI — GitHub Discussion #9562](https://github.com/shadcn-ui/ui/discussions/9562) — `asChild` removal and `render` prop migration confirmed
- [Base UI Accordion `asChild` removed — GitHub Issue #9049](https://github.com/shadcn-ui/ui/issues/9049) — confirms silent failure mode
- [shadcn/ui Tailwind v4 Guide + GitHub Issue #4845](https://ui.shadcn.com/docs/tailwind-v4) — CSS variable double-definition bug pattern confirmed
- [shadcn/ui Sidebar Docs + Blocks](https://ui.shadcn.com/docs/components/radix/sidebar) — SidebarFooter + DropdownMenu profile switcher pattern
- [next-themes GitHub v0.4.6](https://github.com/pacocoursey/next-themes) — Next.js 16 + Tailwind v4 compatibility confirmed
- [Supabase RLS and RPC docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — `auth.uid()` policy pattern; RLS performance index requirement confirmed
- Direct codebase analysis: `supabase/migrations/001_initial_schema.sql`, `web/src/lib/schemas/preferences.ts`, `extension/src/schema/profile.ts`, `backend/app/models/preferences.py`, `web/components.json`, `web/src/app/globals.css`, `supabase/functions/score-proxy/index.ts` — schema gaps, constraint structure, and integration points confirmed

### Secondary (MEDIUM confidence)
- [From Prompts to Parameters — Medium/DevOps AI](https://medium.com/devops-ai/from-prompts-to-parameters-the-case-for-structured-inputs-0fda3b69609f) — structured inputs vs. freeform for LLM consumption
- [Baymard Institute — Slider UX](https://baymard.com/blog/slider-interfaces) — chip selectors preferred over sliders for importance levels
- [B2B SaaS UX Design 2026 — Onething Design](https://www.onething.design/post/b2b-saas-ux-design) — multi-persona profile switching patterns
- [Mastering CRUD Operations UX — Medium/Design Bootcamp](https://medium.com/design-bootcamp/mastering-crud-operations-a-framework-for-seamless-product-design-2630affbc1e5) — confirmation dialog patterns for destructive actions
- [Managing Supabase Auth State — DEV Community](https://dev.to/jais_mukesh/managing-supabase-auth-state-across-server-client-components-in-nextjs-2h2b) — `cache()` deduplication for navbar auth fetch

### Tertiary (LOW confidence — inferred from analogous domains)
- B2B profile count cap (5-10) — inferred from analogous SaaS tools; validate with actual pilot user
- Profile template feature value for broker onboarding — inferred; needs pilot validation before building

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
