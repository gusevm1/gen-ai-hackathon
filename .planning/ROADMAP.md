# Roadmap: HomeMatch

## Milestones

- :white_check_mark: **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- :white_check_mark: **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- :white_check_mark: **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- :white_check_mark: **v3.0 Extension Download & Install** — Phase 17
- **v4.0 Landing Page & Design System** — Phases 18–21 (in progress)

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

**Milestone Goal:** Give HomeMatch a front door. A high-conversion landing page with clean SaaS design, polished scroll-triggered animations, and bilingual EN/DE copy — plus UI alignment across the dashboard.

**Branch:** `redesign/v4-landing` → PR → merge to main

- [x] **Phase 18: Design System & Motion Foundation** — Framer Motion, typography scale, dark/light color split, animation primitives
- [x] **Phase 19: Landing Page v1** — Initial landing page (superseded by Phase 20 redesign)
- [x] **Phase 20: Landing Page Redesign** — 5-section whileInView landing page: Hero, Globe (SVG draw-in), Problem, Solution (3 steps), CTA; replaces broken sticky-parallax chapters (completed 2026-03-28)
- [ ] **Phase 21: Dashboard UI Alignment** — Propagate design language to dashboard, profiles, analysis pages
- [ ] **Phase 22: Polish & QA** — Mobile, performance (LCP/CLS), cross-browser, final copy pass

**Requirements:** LP-01 → LP-08, DS-01 → DS-04, UI-01 → UI-03

### Phase 20: Landing Page Redesign

**Goal:** Replace the broken 7-chapter sticky-parallax landing page with a clean, complete 5-section scroll-triggered entry experience that feels polished and authentic.

**Requirements:** LP-01, LP-02, LP-03, LP-04, LP-05, LP-06

**Plans:** 3/3 plans complete

Plans:
- [ ] 20-01-PLAN.md — Replace chapter translation keys with 5-section key set (EN + DE); fix landing-translations.test.ts
- [ ] 20-02-PLAN.md — Delete Chapter/IsometricHome files; create SectionHero and SectionGlobe
- [ ] 20-03-PLAN.md — Create SectionProblem, SectionSolution, SectionCTA; rewrite LandingPageContent; update tests

**Success Criteria:**
1. Landing page at / renders all 5 sections: Hero → Globe → Problem → Solution → CTA
2. All animations fire on scroll using whileInView (no sticky-parallax, no useScroll)
3. Hero animates on mount; globe draws in via pathLength; problem/solution stagger in
4. Full test suite green; TypeScript compiles without errors
5. Bilingual EN/DE — all text via translations.ts keys

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | Complete | 2026-03-17 |
| v3.0 Extension Download & Install | Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | In Progress | — |
