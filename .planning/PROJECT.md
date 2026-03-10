# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension + web app combo that helps real estate professionals evaluate Flatfox.ch listings against their personal preferences. Users set up their property criteria (location, budget, rooms, soft criteria, importance weights) on a dedicated website, and the Chrome extension scores each listing on Flatfox — showing a score badge with key match/mismatch points and linking to a full analysis page on the website.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Current Milestone: v1.0 HomeMatch MVP

**Goal:** A working Chrome extension on Flatfox.ch + a Next.js preferences website + an EC2 scoring backend that together let users set preferences, trigger on-demand scoring, and see match scores with explanations.

**Target features:**
- Next.js website for setting preferences (filters, soft criteria, weights)
- Supabase auth (email/password) in both website and extension
- Chrome extension with floating "Score" button on Flatfox search results
- On-demand LLM scoring via EC2 FastAPI backend
- Score badges with 3-5 bullet summary, "See full analysis" links to website

## Architecture

```
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js Frontend │───▶│   Supabase   │───▶│  EC2 FastAPI     │───▶│  Claude API  │
│ (Vercel)         │    │  Auth + Edge │    │  Backend         │    └──────────────┘
│ - Preferences UI │    │  Functions   │    │  - Flatfox fetch │
│ - Full analysis  │    └──────┬───────┘    │  - LLM scoring   │    ┌──────────────┐
└──────────────────┘           │            │  - Returns scores │───▶│ Flatfox API  │
                               │            └──────────────────┘    │ /api/v1/flat/ │
┌──────────────────┐           │                                    └──────────────┘
│ Chrome Extension │───────────┘
│ (Flatfox)        │
│ - Score badges   │
│ - FAB trigger    │
│ - Quick summary  │
└──────────────────┘
```

**Data flow:**
1. User signs up / logs in on Next.js site (Supabase auth)
2. User sets preferences on website → saved to Supabase PostgreSQL
3. User installs Chrome extension, logs in via extension popup
4. User browses Flatfox, sees floating "Score listings" button
5. User clicks → extension extracts listing IDs from page
6. Extension calls Supabase edge function → proxies to EC2 FastAPI
7. Backend fetches listing details from Flatfox API (`/api/v1/flat/`)
8. Backend loads user preferences from Supabase
9. Backend sends preferences + listing data to Claude for scoring
10. Scores returned to extension → badges with 3-5 bullets rendered
11. "See full analysis" button redirects to Next.js website

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Next.js website with preferences form (location, buy/rent, property type, budget, rooms, living space, soft criteria, weights)
- [ ] Supabase auth (email/password) for website and extension
- [ ] User preferences stored in Supabase PostgreSQL
- [ ] Chrome extension on Flatfox.ch with floating action button for on-demand scoring
- [ ] Backend fetches listing data from Flatfox public API
- [ ] LLM-powered evaluation of listing data against user preferences
- [ ] Score badges (0-100) injected next to each listing on Flatfox search results
- [ ] Expandable 3-5 bullet summary panel on badge click
- [ ] "See full analysis" button redirects to website for detailed breakdown
- [ ] Full analysis page on website with category breakdown, weights, reasoning
- [ ] EC2 FastAPI backend called via Supabase edge functions
- [ ] Honest "I don't know" for data points the listing doesn't provide

### Out of Scope

- Other property sites beyond Flatfox — v1 is Flatfox only
- Multiple client profiles (broker multi-profile) — future milestone
- Mobile app
- Image analysis of listing photos — text-only evaluation for v1
- Historical price tracking or investment analysis
- Automatic scoring (user must trigger via FAB — Claude API calls are expensive)
- Database optimization, logging infrastructure, advanced monitoring — later milestone

## Context

- **Hackathon:** Gen AI hackathon, ~1 week build window. Demo story: a real estate professional piloting the extension closes more deals by quickly identifying best-match listings.
- **Inspiration:** JobRight.ai — shows match percentage badges next to job listings with key reasons. Same UX pattern applied to real estate.
- **Target site:** Flatfox.ch — Swiss property portal with a public API at `/api/v1/flat/`. No scraping needed.
- **User feedback:** Real estate agent confirmed Flatfox is her most-used platform.
- **Reference project:** jobbmatch (React frontend + FastAPI backend + Supabase) — reuse deployment patterns and backend architecture.
- **Language:** Flatfox serves DE/FR/IT. LLM analysis matches the listing language.
- **Soft criteria:** Beyond hard filters — distance to Bahnhof, tax rates, school quality, etc. Features (balcony, parking, etc.) are presented as reusable soft criteria suggestions rather than a separate checklist.
- **Solo developer** building this.

## Constraints

- **Timeline**: ~1 week hackathon window — speed matters
- **Frontend**: Next.js on Vercel
- **Extension**: Chrome extension (Manifest V3) via WXT
- **Backend**: Python FastAPI on EC2 (Docker)
- **Auth**: Supabase (email/password)
- **Storage**: Supabase PostgreSQL for preferences + analysis results
- **LLM**: Claude API (called from EC2 backend)
- **Target site**: Flatfox.ch only for v1
- **Scoring**: On-demand via floating action button (not automatic)
- **Edge functions**: Supabase edge functions proxy calls to EC2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flatfox over Homegate | Real estate agent feedback + public API available | Decided |
| Separate Next.js website for preferences | Complex preference setup needs space, extension popup too cramped | Decided |
| Supabase auth from day 1 | Clean user identity across website and extension | Decided |
| On-demand scoring (not automatic) | Claude API calls are expensive, user controls when to score | Decided |
| Edge functions as proxy | Keeps EC2 URL private, adds auth validation layer | Decided |
| Python FastAPI backend | Matches jobbmatch reference project, rich LLM ecosystem | Decided |
| Backend calls Flatfox API | Clean separation, backend has all data for scoring | Decided |
| 3-5 bullet summary in extension | Quick view in extension, full analysis on website | Decided |
| Features as soft criteria suggestions | Reusable preset suggestions instead of separate checkbox list | Decided |
| Fresh start (no Phase 1 reuse) | Architecture changed significantly, cleaner to rebuild | Decided |
| Minimal UI design | Functionality first, redesign later | Decided |
| Single-page preferences with sections | Faster to build, can reorganize later | Decided |

---
*Last updated: 2026-03-10 after pivot to Flatfox + separate frontend*
