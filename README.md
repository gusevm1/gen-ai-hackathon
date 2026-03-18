# HomeMatch

**AI-powered real estate advisor for the Swiss property market.**

HomeMatch scores Flatfox listings against your personal preferences in real-time using Claude AI with vision-based photo analysis and live neighborhood data from Apify's Google Places Crawler. Define your ideal home through a conversational AI chat, then browse Flatfox with instant scoring via our Chrome extension.

[Try it out](https://homematch-web.vercel.app/)

---

## How It Works

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Chrome Extension │────▶│ Supabase Edge Function│────▶│  FastAPI Backend     │
│ (Flatfox pages)  │     │ (Auth + Cache layer)  │     │  (AWS EC2)          │
└─────────────────┘     └──────────────────────┘     └────────┬────────────┘
                                                              │
                                                   ┌──────────┴──────────┐
                                                   │                     │
                                              ┌────▼─────┐    ┌─────────▼────────┐
                                              │ Claude AI │    │ Apify Google      │
                                              │ (Haiku)   │    │ Places Crawler    │
                                              │ + Vision  │◀──▶│ (tool use)        │
                                              └──────────┘    └──────────────────┘
```

1. **Browse Flatfox** with the Chrome extension installed
2. **Click score** on any listing to trigger AI analysis
3. **Backend fetches** listing data, images, and real prices from Flatfox
4. **Claude Haiku** analyzes the listing against your preferences, using vision to assess photos and calling Apify's Google Places Crawler as a tool to research nearby amenities
5. **Score (0-100)** with category breakdown appears as a badge on the listing

---

## Features

- **Conversational profile creation**: Claude Sonnet guides you through defining preferences (budget, location, dealbreakers, lifestyle priorities)
- **Multi-profile support**: Maintain separate searches (e.g. "downtown apartment" vs. "family house")
- **Vision-based photo analysis**: Claude analyzes listing images to assess property condition
- **Agentic neighborhood research**: Claude autonomously calls Apify's Google Places Crawler mid-scoring to look up nearby amenities, transit, and services
- **Intelligent dealbreaker filtering**: Properties that violate hard constraints are scored accordingly
- **Multilingual**: EN, DE, FR, IT
- **Caching**: Scores are cached per profile and invalidated when preferences change

---

## Architecture

| Component | Stack | Hosting |
|-----------|-------|---------|
| **Web App** | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui | Vercel |
| **Backend API** | FastAPI, Python, Anthropic SDK, httpx | AWS EC2 |
| **Chrome Extension** | WXT, React, TypeScript, Manifest V3, Shadow DOM | Browser (sideload) |
| **Database** | PostgreSQL with Row Level Security | Supabase |
| **Edge Functions** | Deno, TypeScript (auth proxy + cache) | Supabase |
| **AI Models** | Claude Haiku 4.5 (scoring), Claude Sonnet 4.6 (chat) | Anthropic API |
| **Data Enrichment** | Google Places Crawler (via tool use), Nominatim | Apify |

---

## Project Structure

```
gen-ai-hackathon/
├── backend/                    # FastAPI scoring + chat API
│   ├── app/
│   │   ├── main.py             # App entry, CORS, routers
│   │   ├── routers/
│   │   │   ├── scoring.py      # POST /score - scoring pipeline
│   │   │   ├── chat.py         # POST /chat - preference extraction
│   │   │   ├── listings.py     # Flatfox listing fetch
│   │   │   └── geocoding.py    # Location geocoding
│   │   ├── services/
│   │   │   ├── claude.py       # Claude scoring with tool use
│   │   │   ├── flatfox.py      # Flatfox API + HTML price scraping
│   │   │   ├── conversation.py # Multi-turn chat with Claude Sonnet
│   │   │   ├── places.py       # Apify Google Places integration
│   │   │   ├── apify.py        # Geocoding via Apify/Nominatim
│   │   │   └── supabase.py     # DB operations
│   │   ├── models/             # Pydantic schemas
│   │   └── prompts/            # System prompts for scoring + chat
│   └── requirements.txt
│
├── web/                        # Next.js web application
│   └── src/
│       ├── app/
│       │   ├── page.tsx                    # Auth landing page
│       │   ├── api/chat/route.ts           # Chat API proxy
│       │   ├── api/geocode/route.ts        # Geocode API proxy
│       │   └── (dashboard)/
│       │       ├── ai-search/page.tsx      # Chat interface
│       │       ├── profiles/page.tsx       # Profile management
│       │       ├── analyses/page.tsx       # Scoring history
│       │       ├── download/page.tsx       # Extension download
│       │       └── settings/page.tsx       # User settings
│       └── lib/                            # Supabase client, utils
│
├── extension/                  # Chrome extension (WXT + React)
│   └── src/
│       ├── entrypoints/
│       │   ├── content/App.tsx             # Flatfox page injection
│       │   ├── background.ts              # Service worker (auth)
│       │   └── popup/                      # Extension popup UI
│       ├── lib/
│       │   ├── api.ts                      # Score proxy calls
│       │   └── flatfox.ts                  # DOM listing extraction
│       └── components/                     # ScoreBadge, FAB, panels
│
├── supabase/
│   ├── functions/score-proxy/index.ts      # Edge function (auth + cache)
│   └── migrations/                         # DB schema (profiles, analyses)
│
└── SUBMISSION.md               # Hackathon submission narrative
```

---

## Scoring Pipeline

The scoring engine runs through these steps for each listing:

1. **Fetch listing** from Flatfox public API
2. **Scrape actual prices** from listing HTML (the API returns stale data)
3. **Collect images** (up to 5 per listing for vision analysis)
4. **Build prompt** with listing data, user preferences, and importance weights
5. **Claude Haiku** analyzes with an agentic loop:
   - Scores across 5 categories (location, price, size, features, condition)
   - Optionally calls `search_nearby_places` tool via Apify to research the neighborhood
   - Returns structured output via `messages.parse()` with Pydantic
6. **Cache result** in Supabase, scoped to the user's active profile

### Score Categories

| Category | What it evaluates |
|----------|------------------|
| **Location** | Neighborhood match, proximity to preferred areas, nearby amenities (via Apify) |
| **Price** | Budget fit, value for money, price per m2 |
| **Size** | Room count, living space, floor preference |
| **Features** | Balcony, garden, parking, cellar, etc. |
| **Condition** | Property condition assessed from listing photos (vision) |

### Match Tiers

- **90-100**: Excellent match
- **70-89**: Strong match
- **50-69**: Moderate match
- **30-49**: Weak match
- **0-29**: Poor match

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account
- Anthropic API key
- Apify API token

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, APIFY_TOKEN

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Web App

```bash
cd web
npm install
npm run dev
```

### Chrome Extension

```bash
cd extension
npm install
npm run dev     # Development with hot reload
npm run build   # Production build -> dist/chrome-mv3/
```

To install: open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select `extension/dist/chrome-mv3/`.

---

## Early Validation

We partnered with [Vera Lee Caflisch](https://www.linkedin.com/in/vera-lee-caflisch-2a5920201/), a real estate agent with 7 years of experience at Bellevia Immobilien. In early pilot testing with her junior agent, they reported a **40% increase in relevant properties identified** in the first day of use. This is based on a small sample size and we are actively collecting more data. We are in discussions to begin a formal pilot with Bellevia Immobilien.

---

## Team

Three builders based in Zurich:
- Two ambitious high school graduates starting Computer Science at ETH Zurich this fall
- One Machine Intelligence master's graduate, founder of [jobbmatch.ai](https://jobbmatch.ai) (1500+ users, 100+ paying customers)

Built over 4 focused coding sessions.

---

## Built With

Next.js, React, TypeScript, Tailwind CSS, FastAPI, Python, Supabase (Auth + Postgres + Edge Functions), Anthropic Claude API (Haiku 4.5, Sonnet 4.6), Apify (Google Places Crawler), WXT (Chrome Extension), AWS EC2, Vercel, Nominatim, Flatfox API

---

## License

This project was built for the [GenAI Zurich Hackathon 2026](https://genaizurich.devpost.com/).
