---
focus: arch
generated: 2026-03-27
---

# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                    │
│                                                      │
│  ┌─────────────────┐    ┌──────────────────────────┐ │
│  │ Chrome Extension │    │   Flatfox.ch (3rd-party) │ │
│  │  (WXT/React)    │    │   listing pages           │ │
│  │                 │◄───│   content script injects  │ │
│  │ popup/           │    │   FAB + badges            │ │
│  │ content/        │    └──────────────────────────┘ │
│  │ background      │                                  │
│  └────────┬────────┘                                  │
└───────────│───────────────────────────────────────────┘
            │ JWT + listing_id
            ▼
┌───────────────────────────┐
│  Supabase Edge Function   │
│  score-proxy (Deno/TS)    │
│  - JWT validation         │
│  - Profile resolution     │
│  - Analyses cache         │
└──────────────┬────────────┘
               │ user_id + profile_id + preferences
               ▼
┌──────────────────────────┐     ┌──────────────────┐
│  EC2 Backend (FastAPI)   │────►│  Anthropic Claude │
│  POST /score             │     │  (haiku scoring)  │
│  POST /chat              │     │  (sonnet chat)    │
│  GET  /listings          │     └──────────────────┘
│  GET  /geocode           │     ┌──────────────────┐
└──────────────┬───────────┘────►│  Apify / Google  │
               │                 │  Places (nearby) │
               │ save analysis   └──────────────────┘
               ▼
┌─────────────────────────┐
│  Supabase (Postgres)    │
│  - profiles table       │
│  - analyses table       │
│  - RLS enforced         │
└────────────▲────────────┘
             │
┌────────────┴────────────┐
│  Next.js Web App        │
│  (Vercel)               │
│  - Auth / onboarding    │
│  - Profile management   │
│  - AI chat builder      │
│  - Analysis history     │
│  - Extension download   │
└─────────────────────────┘
```

## Component Responsibilities

### Chrome Extension
- **content script** (`src/entrypoints/content/`): Injected on Flatfox.ch pages. Detects listing IDs from DOM, renders floating action button (FAB), triggers batch scoring, overlays score badges and summary panels on each listing card.
- **background** (`src/entrypoints/background.ts`): Service worker. Opens onboarding tab on first install. Handles extension lifecycle.
- **popup** (`src/entrypoints/popup/`): Toolbar popup. Shows login form or dashboard (connection status, active profile summary, on/off toggle, link to web app).

### Supabase Edge Function (`score-proxy`)
Acts as a secure API gateway between the extension and EC2 backend:
1. Validates user JWT via `supabase.auth.getUser()`
2. Resolves the user's active profile (`is_default=true`) via RLS-enforced query
3. Checks `analyses` table for a cached non-stale result → returns immediately on hit
4. Forwards to EC2 backend with resolved `user_id`, `profile_id`, and `preferences` (user never sends preferences directly — always server-resolved)
5. Returns score response with cache/staleness headers

### EC2 Backend (FastAPI)
Stateless scoring + chat service:
- **`/score`**: Full pipeline — fetch listing from Flatfox, scrape images, call Claude (haiku) with agentic tool loop, save result to Supabase, return `ScoreResponse`
- **`/chat`**: Multi-turn conversation with Claude (sonnet) for AI-assisted preference building
- **`/listings`**: Fetch Flatfox listing data
- **`/geocode`**: Address/location lookup (proxied by web app)

### Next.js Web App
Dashboard and onboarding surface:
- Authentication (sign up / sign in)
- AI chat for preference building
- Multi-profile management (create, rename, delete, switch default)
- Analysis history browser
- Per-listing analysis detail (score breakdown, summary, checklist)
- Extension download page

### Supabase DB
- `profiles`: One-to-many user→profiles, enforces single default per user via partial unique index. Stores preferences as JSONB.
- `analyses`: Cached scores keyed by `(user_id, listing_id, profile_id)`. Has `stale` column for cache invalidation when preferences change.

## Key Design Patterns

### Agentic Scoring Loop
Claude is given a `search_nearby_places` tool when the listing has coordinates AND preferences mention amenity/proximity keywords. The loop runs max 3 iterations: tool call → execute → final answer.

### Preference Staleness
When a user updates their profile, cached `analyses` rows for that profile are marked `stale=true`. The edge function checks for staleness and returns a `X-HomeMatch-Pref-Stale: true` header so the extension can show a "stale" indicator.

### Batch Scoring with Progressive UI
The extension scores multiple listings in parallel batches (concurrency=10). Each listing's badge updates independently as soon as its score returns via an `onResult` callback.

### Profile Security
User profiles are never sent from the client to the scoring endpoint. The edge function always resolves the active profile server-side via RLS, preventing users from scoring against other users' profiles.
