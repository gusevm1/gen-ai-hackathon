---
focus: tech
generated: 2026-03-27
---

# External Integrations

## Anthropic Claude API

- **Used by:** Backend (`backend/app/services/claude.py`, `backend/app/services/conversation.py`)
- **Models:** `claude-haiku-4-5-20251001` (scoring), `claude-sonnet-4-6` (chat)
- **Auth:** `ANTHROPIC_API_KEY` env var (read automatically by SDK)
- **Scoring flow:** Agentic loop — Claude receives listing text + images, optionally calls `search_nearby_places` tool, then returns structured `ScoreResponse` via `messages.parse()` with Pydantic model
- **Chat flow:** Conversational profile builder — multi-turn dialogue to extract user preferences from natural language

## Supabase

- **Auth:** Email/password via Supabase Auth; JWT stored in `browser.storage.local` (MV3-compatible)
- **DB tables:** `profiles` (multi-profile per user, one `is_default`), `analyses` (cached scores keyed by user+listing+profile)
- **RLS:** All tables enforce row-level security — users can only read/write their own rows
- **RPC:** `set_active_profile(uuid)` — atomic profile-switching function (SECURITY DEFINER)
- **Edge Function:** `score-proxy` — validates JWT, resolves active profile, proxies to EC2 backend
- **Web client:** `@supabase/ssr` for Next.js server/client components
- **Extension client:** `@supabase/supabase-js` direct client

## Flatfox (Property Listings)

- **Used by:** Backend (`backend/app/services/flatfox.py`)
- **API:** Flatfox public REST API (`https://flatfox.ch/api/v1/listing/<pk>/`)
- **Scraping:** HTTP fetch of listing HTML page to extract images and accurate prices (API returns stale price data)
- **Data used:** Listing details (title, rooms, area, price, coordinates), image URLs, web-scraped prices

## Apify

- **Used by:** Backend (`backend/app/services/apify.py`)
- **Actors:**
  - `compass~crawler-google-places` — Google Places proximity search (nearby amenities)
  - `gusevm1~homematch-geocoder` — Custom geocoder actor
- **Auth:** `APIFY_API_TOKEN` env var
- **Purpose:** Powers the `search_nearby_places` tool used by Claude when scoring proximity-based criteria

## Google Places / Geocoding

- **Used by:** Backend (`backend/app/services/places.py`) and Web App (`web/src/app/api/geocode/`)
- **Purpose:** Location search / address autocomplete for the web onboarding flow
- **Fallback:** Nominatim (OpenStreetMap) for geocoding when Google is unavailable

## End-to-End Scoring Data Flow

```
User on Flatfox.ch
      │
      ▼
Extension content script (detects listing IDs on page)
      │  POST listing_id + JWT
      ▼
Supabase Edge Function: score-proxy
  - Validates JWT via supabase.auth.getUser()
  - Resolves active profile (is_default=true) via RLS
  - Checks analyses cache → returns hit if fresh
      │  POST listing_id + user_id + profile_id + preferences
      ▼
EC2 Backend: POST /score
  - Fetches listing from Flatfox API
  - Scrapes listing page for images + accurate prices
  - Calls Claude (haiku) with agentic loop
    - Claude may call search_nearby_places → Apify/Google Places
  - Saves ScoreResponse to Supabase analyses table
  - Returns ScoreResponse
      │
      ▼
score-proxy returns response to extension
      │
      ▼
Extension renders score badge + summary panel on Flatfox page
```

## Chat / Profile Building Data Flow

```
Web App chat UI (web/src/components/chat/)
      │  POST /api/chat
      ▼
Next.js API route (web/src/app/api/chat/route.ts)
      │  Proxies to backend
      ▼
EC2 Backend: POST /chat
  - Multi-turn conversation via Claude sonnet
  - Extracts structured preferences from dialogue
  - Returns assistant message + extracted preferences JSON
      │
      ▼
Web App saves preferences to Supabase profiles table
```

## Auth Flow

```
User signs up/in on web app or extension popup
      │
      ▼
Supabase Auth (email/password)
  → Returns JWT access_token + refresh_token
      │
Extension: stores JWT in browser.storage.local
Web App:   @supabase/ssr handles cookies server-side
      │
All API calls include: Authorization: Bearer <jwt>
Edge function validates JWT on every scoring request
```
