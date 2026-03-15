# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension + web app that helps users evaluate Flatfox.ch property listings against their personal preferences. Users manage multiple search profiles on a Next.js website (with dealbreaker/importance-based preferences), then the Chrome extension scores each listing on Flatfox — showing score badges, expandable summaries, and linking to full analysis pages. Scoring uses Claude with image analysis for comprehensive evaluation. Supports multiple profiles per user for B2B property management use cases.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Architecture

```
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js Frontend │───▶│   Supabase   │───▶│  EC2 FastAPI     │───▶│  Claude API  │
│ (Vercel)         │    │  Auth + Edge │    │  Backend         │    └──────────────┘
│ - Profile CRUD   │    │  Functions   │    │  - Flatfox fetch │
│ - Preferences    │    └──────┬───────┘    │  - Image extract │    ┌──────────────┐
│ - Analysis pages │          │            │  - LLM scoring   │───▶│ Flatfox API  │
└──────────────────┘           │            └──────────────────┘    │ /api/v1/flat/ │
                               │                                    └──────────────┘
┌──────────────────┐           │
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

### Active

(No active requirements — define in next milestone via `/gsd:new-milestone`)

### Out of Scope

- Other property sites beyond Flatfox — v1.x is Flatfox only
- Mobile app — web-first approach
- Historical price tracking or investment analysis
- Automatic scoring (user must trigger via FAB — Claude API cost control)
- Score caching by listing ID + profile hash
- Offline mode

## Context

**Shipped v1.1 Demo-Ready + Multi-Profile.** 13,153 LOC across TypeScript (extension + web) and Python (backend). Built in ~10 days.

- **Tech stack:** Next.js (Vercel) + FastAPI (EC2) + Supabase (auth/DB/edge) + WXT Chrome extension + Claude API
- **Target site:** Flatfox.ch — Swiss property portal with public API
- **Language:** DE/FR/IT — scoring matches listing language
- **Pilot target:** Vera Caflisch at Bellevia Immobilien GmbH, Thalwil ZH (B2B property management)
- **Known tech debt:** No score caching, `--no-verify-jwt` on edge function, orphaned app-sidebar.tsx and dashboard/actions.ts

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
| No score caching in v1 | Speed over optimization for hackathon | ⚠️ Revisit |
| `--no-verify-jwt` on edge function | Gateway rejects extension JWTs; function handles auth itself | ⚠️ Revisit |

---
*Last updated: 2026-03-15 after v1.1 milestone completion*
