---
focus: arch
generated: 2026-03-27
---

# Directory Structure

## Root

```
gen-ai-hackathon/
├── extension/          Chrome browser extension (WXT + React + TypeScript)
├── backend/            FastAPI backend (Python, deployed on EC2)
├── web/                Next.js web app (deployed on Vercel)
├── supabase/           Supabase config, edge functions, and migrations
├── CLAUDE.md           Infrastructure & deployment runbook
├── README.md
└── SUBMISSION.md
```

## Extension (`extension/`)

```
extension/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts           Service worker: install handler, opens onboarding
│   │   ├── content/                Content script injected on Flatfox.ch
│   │   │   ├── index.tsx           Entry: mounts React app, detects listings
│   │   │   ├── App.tsx             Root component: auth check, score orchestration
│   │   │   ├── style.css           Content script styles
│   │   │   └── components/
│   │   │       ├── Fab.tsx         Floating action button (trigger scoring)
│   │   │       ├── ScoreBadge.tsx  Per-listing score overlay
│   │   │       ├── SummaryPanel.tsx  Detailed score breakdown panel
│   │   │       └── LoadingSkeleton.tsx
│   │   ├── popup/
│   │   │   ├── App.tsx             Popup root: login or dashboard
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   └── [onboarding/ removed — onboarding now in web app]
│   ├── components/
│   │   ├── popup/
│   │   │   ├── Dashboard.tsx       Active profile + toggle + link to web
│   │   │   ├── LoginForm.tsx       Supabase email/password auth
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── ProfileSection.tsx
│   │   └── ui/                     shadcn/ui components (button, card, input, etc.)
│   ├── hooks/
│   │   └── useWeightSliders.ts     Proportional weight slider logic
│   ├── lib/
│   │   ├── api.ts                  scoreListing / scoreListings (edge function client)
│   │   ├── flatfox.ts              Flatfox page parsing helpers
│   │   ├── supabase.ts             Supabase client (browser.storage.local for JWT)
│   │   ├── theme.ts                Dark mode toggle + storage
│   │   └── utils.ts                cn() class merger
│   ├── schema/
│   │   └── weights.ts              Zod schema for weight maps
│   ├── storage/
│   │   └── active-profile.ts       chrome.storage.local abstraction for profile
│   ├── types/
│   │   └── scoring.ts              ScoreResponse, CategoryScore TypeScript types
│   ├── utils/
│   │   └── weight-redistribution.ts  Proportional weight redistribution algorithm
│   ├── assets/styles/globals.css
│   └── public/                     Extension icons
├── src/__tests__/                  Vitest tests
├── wxt.config.ts                   WXT configuration (entrypoints, modules)
├── tailwind.config.js
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

**Add new extension features:**
- New content script component → `src/entrypoints/content/components/`
- New popup section → `src/components/popup/`
- New storage abstraction → `src/storage/`
- New API call to backend → `src/lib/api.ts`

## Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py                 FastAPI app factory, CORS, router registration, lifespan
│   ├── routers/
│   │   ├── listings.py         GET /listing/:id — fetch Flatfox listing
│   │   ├── scoring.py          POST /score — full scoring pipeline
│   │   ├── chat.py             POST /chat — AI preference builder conversation
│   │   └── geocoding.py        GET /geocode — location lookup
│   ├── services/
│   │   ├── claude.py           ClaudeScorer: async scoring with agentic tool loop
│   │   ├── conversation.py     Conversation service for multi-turn chat
│   │   ├── flatfox.py          FlatfoxClient: listing API + page scraping
│   │   ├── apify.py            Apify actor calls (Places, Geocoder)
│   │   ├── places.py           search_nearby_places — wraps Apify Places actor
│   │   └── supabase.py         SupabaseService: save/get analyses
│   ├── models/
│   │   ├── listing.py          FlatfoxListing Pydantic model
│   │   ├── preferences.py      UserPreferences Pydantic model
│   │   ├── scoring.py          ScoreRequest, ScoreResponse, CategoryScore models
│   │   └── chat.py             Chat request/response models
│   └── prompts/
│       ├── scoring.py          build_system_prompt, build_user_prompt, image blocks
│       └── conversation.py     Chat conversation prompts
├── tests/                      pytest tests
├── requirements.txt
└── pyproject.toml              pytest config (asyncio_mode=auto)
```

**Add new backend features:**
- New endpoint → new file in `routers/` + register in `main.py`
- New external service → new file in `services/`
- New data model → new file in `models/`

## Web App (`web/`)

```
web/
├── src/
│   ├── app/                        Next.js App Router
│   │   ├── page.tsx                Landing / home
│   │   ├── layout.tsx              Root layout (theme, auth)
│   │   ├── privacy-policy/
│   │   ├── api/
│   │   │   ├── chat/route.ts       Proxy to backend /chat
│   │   │   └── geocode/route.ts    Proxy to backend /geocode
│   │   └── (dashboard)/            Auth-protected dashboard layout
│   │       ├── layout.tsx          Sidebar + top navbar
│   │       ├── dashboard/          Main listings dashboard
│   │       ├── profiles/           Profile list + detail
│   │       ├── analyses/           Analysis history
│   │       ├── analysis/[listingId]  Per-listing score detail
│   │       ├── ai-search/          AI chat preference builder
│   │       ├── settings/
│   │       └── download/           Extension download page
│   ├── components/
│   │   ├── ui/                     shadcn/ui components
│   │   ├── chat/                   Chat UI components
│   │   ├── preferences/            Preference form sections
│   │   ├── profiles/               Profile management dialogs
│   │   ├── analyses/               Analysis list + filter bar
│   │   ├── analysis/               Score breakdown components
│   │   ├── app-sidebar.tsx
│   │   └── top-navbar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           Browser Supabase client
│   │   │   └── server.ts           Server Supabase client (SSR cookies)
│   │   ├── chat-preferences-mapper.ts  Map chat output → preferences schema
│   │   ├── schemas/preferences.ts  Zod schema for preferences
│   │   ├── flatfox-url.ts          Build Flatfox search URL from profile
│   │   ├── translations.ts         i18n strings
│   │   └── utils.ts
│   └── __tests__/                  Vitest tests
├── vitest.config.mts
├── next.config.ts
└── package.json
```

**Add new web features:**
- New page → new file/folder in `src/app/(dashboard)/`
- New component → `src/components/<feature-area>/`
- New API proxy route → `src/app/api/`

## Supabase (`supabase/`)

```
supabase/
├── functions/
│   └── score-proxy/
│       └── index.ts            Edge function: auth gateway for scoring
├── migrations/
│   ├── 001_initial_schema.sql  user_preferences + analyses + RLS (legacy)
│   ├── 002_profiles_schema.sql Multi-profile support (replaces 001 tables)
│   └── 003_add_stale_column.sql  stale flag for cache invalidation
└── config.toml
```
