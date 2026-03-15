# Milestones

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
