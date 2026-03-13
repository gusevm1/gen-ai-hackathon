# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension + web app that helps users evaluate Flatfox.ch property listings against their personal preferences. Users configure criteria on a Next.js website, then the Chrome extension scores each listing on Flatfox — showing score badges with match/mismatch bullets, expandable summary panels, and linking to a full analysis page. Scoring uses Claude with image analysis for comprehensive evaluation.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Architecture

```
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js Frontend │───▶│   Supabase   │───▶│  EC2 FastAPI     │───▶│  Claude API  │
│ (Vercel)         │    │  Auth + Edge │    │  Backend         │    └──────────────┘
│ - Preferences UI │    │  Functions   │    │  - Flatfox fetch │
│ - Full analysis  │    └──────┬───────┘    │  - Image extract │    ┌──────────────┐
└──────────────────┘           │            │  - LLM scoring   │───▶│ Flatfox API  │
                               │            └──────────────────┘    │ /api/v1/flat/ │
┌──────────────────┐           │                                    └──────────────┘
│ Chrome Extension │───────────┘
│ (Flatfox.ch)     │
│ - Shadow DOM     │
│ - Score badges   │
│ - FAB trigger    │
│ - Summary panels │
└──────────────────┘
```

## Requirements

### Validated

- ✓ Next.js website with preferences form (filters, soft criteria, weights) — v1.0
- ✓ Supabase auth (email/password) for website and extension — v1.0
- ✓ User preferences stored in Supabase PostgreSQL — v1.0
- ✓ Chrome extension on Flatfox.ch with FAB for on-demand scoring — v1.0
- ✓ Backend fetches listing data from Flatfox public API — v1.0
- ✓ LLM-powered evaluation with image analysis — v1.0
- ✓ Score badges (0-100) injected via Shadow DOM next to listings — v1.0
- ✓ Expandable 3-5 bullet summary panel on badge click — v1.0
- ✓ "See full analysis" link to website — v1.0
- ✓ Full analysis page with category breakdown, weights, reasoning — v1.0
- ✓ EC2 FastAPI backend via Supabase edge functions — v1.0
- ✓ Honest "I don't know" for unavailable data points — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Other property sites beyond Flatfox — v1 is Flatfox only
- Multiple client profiles (broker multi-profile) — future milestone
- Mobile app
- Historical price tracking or investment analysis
- Automatic scoring (user must trigger via FAB — Claude API calls are expensive)
- Score caching by listing ID + profile hash
- Database optimization, logging, advanced monitoring

## Context

**Shipped v1.0 MVP.** 9,600 LOC across TypeScript (extension + web) and Python (backend). Built in ~8 days during Gen AI hackathon.

- **Tech stack:** Next.js (Vercel) + FastAPI (EC2) + Supabase (auth/DB/edge) + WXT Chrome extension + Claude API
- **Target site:** Flatfox.ch — Swiss property portal with public API
- **Language:** DE/FR/IT — scoring matches listing language
- **Known issues:** No score caching (re-scores on each FAB click), pre-existing TS type errors in StepFilters.tsx

## Constraints

- **Frontend**: Next.js on Vercel
- **Extension**: Chrome MV3 via WXT, Shadow DOM for style isolation
- **Backend**: Python FastAPI on EC2 (systemd service)
- **Auth**: Supabase (email/password)
- **Storage**: Supabase PostgreSQL for preferences + analyses
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
| Custom events for cross-root communication | Stale closure fix for Shadow DOM React roots | ✓ Good |
| Image-enhanced scoring | Visual aspects (condition, views) improve evaluation | ✓ Good |
| No score caching in v1 | Speed over optimization for hackathon | ⚠️ Revisit |
| `--no-verify-jwt` on edge function | Gateway rejects extension JWTs; function handles auth itself | ⚠️ Revisit |

---
*Last updated: 2026-03-13 after v1.0 milestone*
