# Roadmap: HomeMatch

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-13)
- ✅ **v1.1 Demo-Ready + Multi-Profile** — Phases 5-10 (shipped 2026-03-15)
- ✅ **v2.0 Polish & AI Profile Creation** — Phases 11-16 (shipped 2026-03-17)
- ✅ **v3.0 Extension Download & Install** — Phase 17 (shipped 2026-03-17)
- ✅ **v4.0 Landing Page & Design System** — Phases 18-21 (shipped 2026-03-28)
- 📋 **v4.1 Landing Page v2 & Hackathon Credits** — Phases 22-23 (planned)
- 🔮 **v4.2 Dashboard Alignment & QA** — Phases TBD (deferred)

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

### 📋 v4.1 Landing Page v2 & Hackathon Credits (Planned)

**Milestone Goal:** Polish all 4 landing page sections based on UX review, add hackathon credits, and unify tier color system to traffic-light (green/yellow/red).

- [ ] **Phase 22: Landing Page Section Redesigns** — Hero cleanup (stats row, CTA centering, tier colors), Problem card slide-in + visual redesign, Solution enlargement + tier color fix, CTA dramatic entrance animation
- [ ] **Phase 23: Hackathon Credits Section** — ETH Zurich + Gen-AI Hackathon logos section above footer; global QA pass

### Phase 22: Landing Page Section Redesigns

**Goal:** Polish all 4 landing page sections — remove hero stats row and center CTA, redesign problem cards with left slide-in animation, enlarge solution browser demo and fix tier colors, dramatically upgrade CTA headline size and animation.

**Requirements:** HERO-01, HERO-02, HERO-03, PROB-01, PROB-02, PROB-03, SOLN-01, SOLN-02, SOLN-03, SOLN-04, CTA-01, CTA-02, CTA-03

**Plans:**
- [ ] 22-01-PLAN.md — Hero cleanup + tier color unification
- [ ] 22-02-PLAN.md — Problem section card redesign (slide-in animation)
- [ ] 22-03-PLAN.md — Solution enlargement + tier color fix; CTA dramatic entrance

**Success Criteria:**
1. Hero: stats row gone, CTA button centered on own line, poor tier = red (#ef4444)
2. Problem: decorative bg numbers removed; each card slides from x:-60→0 on scroll entry
3. Problem cards: visually elevated (card background, stronger typography, not plain list)
4. Solution: browser demo max-w-3xl+; step cards larger; scores show green/yellow/red by range
5. CTA: headline clamp(2.5rem, 6vw, 4.5rem); enters from y:60 with spring physics

### Phase 23: Hackathon Credits Section

**Goal:** Add a minimal ETH Zurich + Gen-AI Hackathon credits section to the landing page above the footer.

**Requirements:** CRED-01, CRED-02

**Plans:**
- [ ] 23-01-PLAN.md — Credits section component + integration

**Success Criteria:**
1. New SectionCredits component renders ETH Zurich logo + "Gen-AI Hackathon" branding
2. Section is minimal, consistent with landing page dark aesthetic
3. Placed below SectionCTA in LandingPageContent

### 🔮 v4.2 Dashboard Alignment & QA (Deferred)

**Milestone Goal:** Complete v4.0 deferred work — dashboard design language, mobile responsiveness, performance.

- [ ] **Phase 24: Dashboard UI Alignment** — Propagate landing design language to dashboard, profiles, analysis pages
- [ ] **Phase 25: Polish & QA** — Mobile/tablet responsiveness, LCP < 2.5s, cross-browser, final copy pass

## Progress

| Milestone | Status | Shipped |
|-----------|--------|---------|
| v1.0 MVP | ✅ Complete | 2026-03-13 |
| v1.1 Demo-Ready + Multi-Profile | ✅ Complete | 2026-03-15 |
| v2.0 Polish & AI Profile Creation | ✅ Complete | 2026-03-17 |
| v3.0 Extension Download & Install | ✅ Complete | 2026-03-17 |
| v4.0 Landing Page & Design System | ✅ Complete | 2026-03-28 |
| v4.1 Landing Page v2 & Hackathon Credits | 📋 Planned | — |
| v4.2 Dashboard Alignment & QA | 🔮 Deferred | — |
