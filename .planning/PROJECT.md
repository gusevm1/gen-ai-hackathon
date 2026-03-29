# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension + web app that helps users evaluate Flatfox.ch property listings against their personal preferences. Users manage multiple search profiles on a polished Next.js marketing site (with a high-conversion landing page, Framer Motion animations, bilingual EN/DE copy), then the Chrome extension scores each listing on Flatfox — showing score badges, expandable summaries, and linking to full analysis pages. Scoring uses Claude with image analysis for comprehensive evaluation. Supports multiple profiles per user for B2B property management use cases.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Architecture

```
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js Frontend │───▶│   Supabase   │───▶│  EC2 FastAPI     │───▶│  Claude API  │
│ (Vercel)         │    │  Auth + Edge │    │  Backend         │    └──────────────┘
│ - Landing page   │    │  Functions   │    │  - Flatfox fetch │
│ - Profile CRUD   │    └──────┬───────┘    │  - Image extract │    ┌──────────────┐
│ - Preferences    │          │            │  - LLM scoring   │───▶│ Flatfox API  │
│ - Analysis pages │          │            │  - AI chat       │    │ /api/v1/flat/ │
└──────────────────┘          │            └──────────────────┘    └──────────────┘

┌──────────────────┐          │
│ Chrome Extension │───────────┘
│ (Flatfox.ch)     │
│ - Shadow DOM     │
│ - Score badges   │
│ - Profile switch │
│ - Stale detect   │
└──────────────────┘
```

## Requirements

### Validated

- ✓ Supabase auth (email/password) for website and extension — v1.0
- ✓ User preferences stored in Supabase PostgreSQL — v1.0
- ✓ Chrome extension on Flatfox.ch with FAB for on-demand scoring — v1.0
- ✓ Backend fetches listing data from Flatfox public API — v1.0
- ✓ LLM-powered evaluation with image analysis — v1.0
- ✓ Score badges (0-100) injected via Shadow DOM next to listings — v1.0
- ✓ Expandable summary panel on badge click — v1.0
- ✓ Full analysis page with category breakdown and reasoning — v1.0
- ✓ Multi-profile DB schema with atomic active-profile switching — v1.1
- ✓ Profile CRUD (create, rename, duplicate, delete) from web app — v1.1
- ✓ Professional SaaS web UI with navbar, dark/light mode — v1.1
- ✓ Preferences form with dealbreakers and importance chips — v1.1
- ✓ Canonical preferences schema unified across web/extension/backend — v1.1
- ✓ Claude prompt using structured importance levels — v1.1
- ✓ Extension popup with profile switcher and session health — v1.1
- ✓ Stale badge detection when active profile changes — v1.1
- ✓ Analysis page redesigned for demo presentations — v1.1
- ✓ Score caching by listing+profile (CACHE-01, CACHE-02, CACHE-03) — v2.0
- ✓ FAB re-score UX: long-press, stale visual states, brand teal styling — v2.0
- ✓ AI-Powered Search nav + chat interface — v2.0
- ✓ Multi-turn conversational AI backend (Claude on EC2) — v2.0
- ✓ Summary card with inline editing, confirm-to-create profile — v2.0
- ✓ Download page with extension zip + sideloading instructions — v3.0
- ✓ LP-01: Public landing page at `/` replaces redirect — v4.0
- ✓ LP-02: Hero section with animated product demo — v4.0
- ✓ LP-03: Problem/Solution sections with Hormozi-structured copy (EN/DE bilingual) — v4.0
- ✓ LP-04: Features section showcasing scoring, profiles, and analysis — v4.0
- ✓ LP-05: Clear primary CTA funneling to auth — v4.0
- ✓ LP-06: Secondary CTA for existing users — v4.0
- ✓ LP-08: Page LCP < 2.5s, no layout shift from animations — v4.0
- ✓ DS-01: Framer Motion installed and animation primitives defined — v4.0
- ✓ DS-04: Single teal accent — no competing secondary colors — v4.0
- ✓ UI-01: Dashboard pages updated to align with landing page design language — v4.0
- ✓ UI-03: Bilingual EN/DE copy propagated to all user-facing surfaces — v4.0

### Active

- [ ] HERO-01: Stats row removed from SectionHero
- [ ] HERO-02: CTA button centered on its own row
- [ ] HERO-03: Poor tier color updated to red across landing + extension
- [ ] PROB-01: Decorative background numbers removed from problem cards
- [ ] PROB-02: Problem cards slide in from left on scroll
- [ ] PROB-03: Problem cards visually redesigned — elevated, engaging
- [ ] SOLN-01: Browser demo enlarged (max-w-3xl+)
- [ ] SOLN-02: Step cards enlarged with more presence
- [ ] SOLN-03: Score display uses full tier color system (green/yellow/red)
- [ ] CTA-01: Headline font size increased to clamp(2.5rem, 6vw, 4.5rem)
- [ ] CTA-02: Headline dramatic bottom-up entrance animation
- [ ] CRED-01: ETH + Gen-AI Hackathon credits section added

### Out of Scope

- Other property sites beyond Flatfox — v4.x is Flatfox only
- Mobile app — web-first approach
- Historical price tracking or investment analysis
- Automatic scoring — user must trigger via FAB (Claude API cost control)
- Offline mode
- Conversation persistence — ephemeral sessions chosen for v3.0 simplicity
- PROF-08: Duplicate profile rename modal — deferred
- HIST-01/02: Analysis history across profiles — deferred
- SEC-01/02: Edge function JWT verification — deferred (auth handled at function level)

## Current Milestone: v5.0 Hybrid Scoring Engine

**Goal:** Replace the LLM-driven scoring system with a hybrid deterministic + AI architecture where Claude handles only subjective evaluation and never generates numeric scores.

**Target features:**
- Deterministic fulfillment formulas for price, distance, size, and binary_feature criteria
- Proximity quality hybrid formula (distance decay + rating bonus)
- Claude-only subjective evaluation returning fulfillment ∈ {0.0…1.0} + reasoning
- Criterion type classification stored on DynamicField at profile save time
- Weighted aggregation formula (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1) replacing Claude's overall_score
- CRITICAL f=0 → force match_tier="poor" (dealbreaker semantics)
- Missing data → skip criterion in weighted aggregation
- Binary features normalized mapping layer (deterministic; Claude fallback for fuzzy match)
- Updated ScoreResponse schema (fulfillment-based, category scores removed)
- Frontend consumers updated: analysis page, score badge, checklist
- Score cache version bump for schema migration

## Context

**Shipped v4.0 Landing Page & Design System.** 11,301 LOC TypeScript (web), ~2,400 LOC Python (backend).

- **Tech stack:** Next.js (Vercel) + FastAPI (EC2) + Supabase (auth/DB/edge) + WXT Chrome extension + Claude API + Framer Motion
- **Landing page:** 5-section scroll-triggered (Hero → Globe → Problem → Solution → CTA), bilingual EN/DE, teal design language
- **Target site:** Flatfox.ch — Swiss property portal with public API
- **Language:** DE/FR/IT — scoring matches listing language
- **Pilot target:** Vera Caflisch at Bellevia Immobilien GmbH, Thalwil ZH (B2B property management)
- **Known tech debt:** `--no-verify-jwt` on edge function; no score caching invalidation on listing updates

## Constraints

- **Frontend**: Next.js on Vercel
- **Extension**: Chrome MV3 via WXT, Shadow DOM for style isolation
- **Backend**: Python FastAPI on EC2
- **Auth**: Supabase (email/password)
- **Storage**: Supabase PostgreSQL (profiles + analyses tables)
- **LLM**: Claude API with multi-modal (text + images)
- **Target site**: Flatfox.ch only
- **Scoring**: On-demand via FAB (not automatic)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flatfox over Homegate | Agent feedback + public API | ✓ Good |
| Separate website for preferences | Complex setup needs space | ✓ Good |
| Supabase auth from day 1 | Shared identity across apps | ✓ Good |
| On-demand scoring via FAB | Claude API cost control | ✓ Good |
| Edge functions as proxy | Private EC2 URL + auth layer | ✓ Good |
| Shadow DOM for badges | Style isolation from Flatfox CSS | ✓ Good |
| Image-enhanced scoring | Visual aspects improve evaluation | ✓ Good |
| Clean-slate DB migration | Only test data existed, simpler than ALTER | ✓ Good |
| Server-authoritative profile resolution | Edge function resolves active profile, never trusts extension | ✓ Good |
| Structured importance levels over float weights | Better Claude prompt quality | ✓ Good |
| Horizontal top navbar over sidebar | User preference after visual review | ✓ Good |
| Native `<select>` in extension popup | Avoids portal/iframe issues with Radix | ✓ Good |
| 5-section landing page over 7-chapter sticky-parallax | Phase 20 redesign — sticky-parallax broke; whileInView simpler and more reliable | ✓ Good |
| Framer Motion (motion/react v12) for animations | Spring physics + scroll-triggered; established as standard | ✓ Good |
| TIER_COLORS local to SectionHero | Avoids cross-workspace import coupling with extension | ✓ Good |
| `useInView` not `whileInView` for Problem items | Avoids Framer Motion conflict with per-item `animate` prop | ✓ Good |
| Gradient bridge in LandingPageContent | Keeps section components self-contained | ✓ Good |
| `--no-verify-jwt` on edge function | Gateway rejects extension JWTs; function handles auth itself | ⚠️ Revisit |
| No score caching in v1 | Speed over optimization for hackathon | ⚠️ Revisit |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 — Milestone v5.0 Hybrid Scoring Engine started*
