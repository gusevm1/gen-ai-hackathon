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

**Milestone Goal:** Give HomeMatch a front door. A high-conversion landing page with Apple-inspired design, Hormozi-structured copy, and a live product demo animation — plus UI alignment across the dashboard.

**Branch:** `redesign/v4-landing` → PR → merge to main

- [ ] **Phase 18: Design System & Motion Foundation** — Framer Motion, typography scale, dark/light color split, animation primitives
- [ ] **Phase 19: Landing Page** — Hero with product demo animation, copy (EN/DE), features, CTA sections
- [ ] **Phase 20: Dashboard UI Alignment** — Propagate design language to dashboard, profiles, analysis pages
- [ ] **Phase 21: Polish & QA** — Mobile, performance (LCP/CLS), cross-browser, final copy pass

**Requirements:** LP-01 → LP-08, DS-01 → DS-04, UI-01 → UI-03

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | Complete | 2026-03-17 |
| v3.0 Extension Download & Install | Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | In Progress | — |
