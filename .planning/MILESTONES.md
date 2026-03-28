# Milestones

## v4.0 Landing Page & Design System (Shipped: 2026-03-28)

**Phases completed:** 4 phases (18-21), 8 plans
**Timeline:** 2026-03-27 → 2026-03-28 (2 days)
**Files:** 56 changed, +9,420/−159 lines | Web TS LOC: 11,301

**Key accomplishments:**
- Framer Motion design system — motion tokens, FadeIn/StaggerGroup/CountUp animation primitives, teal color tokens
- 5-section landing page (Hero → Globe → Problem → Solution → CTA) replacing broken sticky-parallax chapters
- SectionGlobe with SVG pathLength draw-in animation and Switzerland teal highlight
- 7-chip ScoreBadge-style hero matching extension's TIER_COLORS visual language exactly (white/95 card, 40×40 circles)
- Scroll-driven Problem section highlights — `useInView` per-item, teal glow, `once: false` re-trigger
- Enlarged Solution browser demo (max-w-2xl, 360px), teal gradient bridge to CTA, radial glow CTA with scroll-retriggerable animation

**Known Gaps (deferred to v4.1):**
- LP-07: Mobile/tablet responsive design
- DS-02: Dark hero / light dashboard color split via CSS variables
- DS-03: Typography scale
- UI-02: Dashboard animations alignment
- Phases 22 (Dashboard UI Alignment) and 23 (Polish & QA) not started

**Archive:** `.planning/milestones/v4.0-ROADMAP.md`, `.planning/milestones/v4.0-REQUIREMENTS.md`

---

## v1.1 Demo-Ready + Multi-Profile (Shipped: 2026-03-15)

**Phases completed:** 6 phases (5-10), 13 plans
**Timeline:** 2026-03-13 → 2026-03-15 (3 days)

**Key accomplishments:**
- Multi-profile DB schema with atomic active-profile switching via Postgres RPC
- Profile-aware scoring pipeline: edge function resolves active profile server-side, backend stores profile attribution
- Canonical preferences schema unified across web, extension, and backend with structured importance levels
- Professional SaaS web UI: top navbar, dark/light mode, profile management with CRUD, preferences form with dealbreakers and importance chips
- Analysis page redesign with 2-column layout, category breakdown, and breadcrumb navigation
- Extension profile switcher: popup dropdown, stale badge detection on profile change, session health check, visual polish

**Known Gaps:**
- Phase 8 (UI Foundation) was never formally verified (missing VERIFICATION.md) — code works per summaries
- UI-05 (shimmer-button from 21st.dev) exists but is not visible in any active user-facing flow

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`

---

## v1.0 MVP (Shipped: 2026-03-13)

**Phases completed:** 4 phases (1-4), 12 plans
**Timeline:** 2026-03-05 → 2026-03-13 (8 days)

**Key accomplishments:**
- Supabase auth (email/password) shared across web app and Chrome extension
- Next.js preferences form with filters, soft criteria, and weight sliders
- FastAPI backend fetching listing data from Flatfox public API with image extraction
- Claude-powered LLM scoring with multi-modal evaluation (text + images) and structured output
- Chrome extension with Shadow DOM badge injection, FAB trigger, expandable summary panels
- Full analysis page on website with category breakdown and detailed reasoning

**Archive:** `.planning/milestones/v1.0-property-scraper/`

---
