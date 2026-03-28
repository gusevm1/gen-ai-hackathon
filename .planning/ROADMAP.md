# Roadmap: HomeMatch

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- ✅ **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- ✅ **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- ✅ **v3.0 Extension Download & Install** — Phase 17 (shipped 2026-03-17)
- ✅ **v4.0 Landing Page & Design System** — Phases 18-21 (shipped 2026-03-28)
- 📋 **v4.1 Dashboard Polish & QA** — Phases 22-23 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-13</summary>

- [x] Phase 1: Infrastructure & Auth — Scaffold all codebases, deploy, configure Supabase auth + DB
- [x] Phase 2: Preferences & Data Pipeline — Next.js preferences form + FastAPI Flatfox integration
- [x] Phase 3: LLM Scoring Pipeline — Claude-powered evaluation endpoint + Supabase edge function proxy
- [x] Phase 4: Extension UI & Analysis Page — Flatfox content script, FAB, badges, summary panel, full analysis page

</details>

<details>
<summary>✅ v1.1 Demo-Ready + Multi-Profile (Phases 5-10) — SHIPPED 2026-03-15</summary>

- [x] Phase 5: DB Schema Migration — Profiles table, analyses FK, atomic profile switching RPC
- [x] Phase 6: Backend + Edge Function Update — Scoring pipeline becomes profile-aware end-to-end
- [x] Phase 7: Preferences Schema Unification — Canonical schema superset, updated Claude prompt
- [x] Phase 8: UI Foundation — Top navbar, dark mode, 21st.dev component integration
- [x] Phase 9: Web Profile Management — Profile CRUD, preferences form restructure, analysis page redesign
- [x] Phase 10: Extension Profile Switcher — Popup profile display, switcher, stale badge guard, session health

</details>

<details>
<summary>✅ v2.0 Polish & AI Profile Creation (Phases 11-16) — SHIPPED 2026-03-17</summary>

- [x] Phase 11: Score Caching — Cache scores by listing+profile, invalidate on preference changes, manual re-score
- [x] Phase 12-13: Parallel scoring + caching fixes — Parallel listing scoring, price bug fix (Flatfox API stale data)
- [x] Phase 14: Chat UI & Navigation — AI-Powered Search nav item, chat page, profile name prompt, message thread
- [x] Phase 15: AI Conversation Backend — EC2 chat endpoint, multi-turn Claude preference extraction
- [x] Phase 16: Summary & Profile Creation — Summary card, inline editing, confirm-to-create, redirect to profile

</details>

<details>
<summary>✅ v3.0 Extension Download & Install (Phase 17) — SHIPPED 2026-03-17</summary>

- [x] Phase 17: Download Page & Sideload Instructions — Nav tab, zip download, step-by-step Chrome sideloading guide

</details>

<details>
<summary>✅ v4.0 Landing Page & Design System (Phases 18-21) — SHIPPED 2026-03-28</summary>

- [x] Phase 18: Design System & Motion Foundation — Framer Motion, motion tokens, FadeIn/StaggerGroup/CountUp primitives (completed 2026-03-27)
- [x] Phase 19: Landing Page v1 — Initial landing page scaffold; superseded by Phase 20 redesign (completed 2026-03-27)
- [x] Phase 20: Landing Page Redesign — 5-section whileInView landing page: Hero, Globe (SVG draw-in), Problem, Solution (3 steps), CTA (completed 2026-03-28)
- [x] Phase 21: Landing Page Polish v2 — Extension-matched score badges, scroll-driven problem highlights, cinematic demo improvements, CTA transition (completed 2026-03-28)

</details>

### 📋 v4.1 Dashboard Polish & QA (Planned)

**Milestone Goal:** Complete the v4.0 deferred work — mobile responsiveness, dashboard design alignment, performance, and QA.

- [ ] **Phase 22: Dashboard UI Alignment** — Propagate design language to dashboard, profiles, analysis pages
- [ ] **Phase 23: Polish & QA** — Mobile, performance (LCP/CLS), cross-browser, final copy pass

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | ✅ Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | ✅ Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | ✅ Complete | 2026-03-17 |
| v3.0 Extension Download & Install | ✅ Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | ✅ Complete | 2026-03-28 |
| v4.1 Dashboard Polish & QA | 📋 Planned | — |
