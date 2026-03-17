# Phase 4: Extension UI & Analysis Page - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

User-facing layer: Chrome extension content script on Flatfox.ch (FAB, score badges, summary panels) + website full analysis page. Also includes adding listing image analysis to the Claude scoring prompt. Does NOT include backend scoring changes (Phase 3 complete) except for the image enhancement.

</domain>

<prior_phases>
## What Exists (Phases 1-3 Complete)

### Infrastructure
- **EC2 backend**: `63.176.136.105:8000` — FastAPI running with uvicorn, `.env` auto-loaded via `load_dotenv()`
- **Vercel website**: `homematch-web` — Next.js app, root directory `web/`, auto-deploys on push to main
- **Supabase**: Project `mlhtozdtiorkemamzjjc`, auth (email/password, no email confirm), tables: `user_preferences`, `analyses`
- **Edge function**: `score-proxy` deployed — validates JWT, extracts user_id, proxies POST to EC2 backend
- **Edge function secret**: `BACKEND_URL=http://63.176.136.105:8000`

### Scoring Pipeline (fully tested end-to-end with real API)
- `POST /score` accepts `{listing_id: int, user_id: string}`, returns `ScoreResponse`
- Fetches listing from Flatfox API (`/api/v1/public-listing/{pk}/`)
- Loads preferences from Supabase `user_preferences` table
- Sends text-only prompt to Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), ~$0.007/call
- Returns structured response via `messages.parse(output_format=ScoreResponse)`
- Saves analysis to Supabase `analyses` table (fire-and-forget)
- Cost: ~$0.007 per listing (Haiku 4.5)

### ScoreResponse structure (single response serves both extension and website)
```python
class ScoreResponse(BaseModel):
    overall_score: int          # 0-100 — for badge number
    match_tier: Literal["excellent", "good", "fair", "poor"]  # for badge color
    summary_bullets: list[str]  # 3-5 bullets — for extension summary panel
    categories: list[CategoryScore]  # 5 categories with reasoning — for website detail page
    checklist: list[ChecklistItem]   # soft criteria evaluations — for website detail page
    language: str               # de/fr/it/en

class CategoryScore(BaseModel):
    name: str       # location, price, size, features, condition
    score: int      # 0-100
    weight: int     # 0-100 user importance
    reasoning: list[str]  # 1-5 bullets with listing data citations

class ChecklistItem(BaseModel):
    criterion: str
    met: bool | None  # True/False/None(unknown)
    note: str
```

### Extension (from Phase 1 — needs updating)
- WXT-based Chrome extension with Manifest V3
- Popup dashboard exists (`extension/src/components/popup/Dashboard.tsx`) — uses local storage profile, NOT Supabase auth
- Content script placeholder at `extension/src/entrypoints/content.ts` — currently matches `*://*.homegate.ch/*` (needs to change to flatfox.ch)
- Onboarding wizard exists but is for the old Homegate flow — preferences now live on the Next.js website
- Has shadcn/ui components, Tailwind CSS, dark mode support

### Website
- Login/signup at root (`web/src/app/page.tsx`)
- Dashboard with preferences form at `/dashboard` (`web/src/app/dashboard/page.tsx`)
- Server actions for save/load preferences (`web/src/app/dashboard/actions.ts`)
- Supabase SSR client (`web/src/lib/supabase/server.ts`) and browser client (`web/src/lib/supabase/client.ts`)
- No analysis page exists yet

### Supabase `analyses` table schema
```sql
create table analyses (
  id uuid primary key,
  user_id uuid references auth.users(id),
  listing_id text not null,
  score numeric not null,
  breakdown jsonb not null default '{}',  -- full ScoreResponse stored here
  summary text,                           -- joined summary_bullets
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);
```

### Key API endpoints
- `GET /health` — health check
- `GET /listings/{pk}` — fetch parsed Flatfox listing
- `POST /score` — full scoring pipeline (listing_id + user_id → ScoreResponse)
- Edge function: `https://mlhtozdtiorkemamzjjc.supabase.co/functions/v1/score-proxy` — POST with Bearer JWT

</prior_phases>

<decisions>
## Implementation Decisions

### Extension content script
- Must match `*://*.flatfox.ch/*` (NOT homegate.ch)
- Extract listing IDs from Flatfox search results DOM
- Floating action button (FAB) triggers scoring for visible listings
- Score badges injected next to each listing in Shadow DOM (style isolation)

### Badge display
- Color-coded number (0-100) + match_tier label
- Color palette should be modern/attractive, NOT traffic light green/yellow/red
- match_tier from ScoreResponse determines color: excellent/good/fair/poor

### Extension ↔ Backend communication
- Extension calls Supabase edge function `score-proxy` with JWT Bearer token
- Edge function validates auth, injects user_id, proxies to EC2 backend
- Extension does NOT call EC2 directly

### Dual display from single response
- **Extension (simple)**: `overall_score`, `match_tier`, `summary_bullets` — badge + expandable panel
- **Website (extensive)**: Full `categories` breakdown with per-category reasoning, `checklist` items, all bullets — dedicated analysis page

### Extension popup changes needed
- Current popup uses local chrome.storage profile (Phase 1 Homegate flow)
- Needs to switch to Supabase auth — show login state, link to preferences website
- "Edit Preferences" should open the Next.js website, not the onboarding wizard

### Image analysis (new in Phase 4)
- Flatfox API returns image URLs in listing data
- Pass listing images to Claude as image content blocks alongside text
- Enables evaluation of: condition, view quality, interior finishes, natural light
- Separate plan (04-03) to avoid blocking the core extension work

</decisions>

<specifics>
## User's Vision (from architecture diagram)

Key flows from the user's system diagram:
1. User sets preferences on website → saves to Supabase
2. User browses Flatfox with extension installed
3. Extension extracts listing IDs from Flatfox page
4. Extension sends ID request to backend (via edge function)
5. Backend fetches Flatfox data + preferences, scores with Claude
6. Simple analysis displayed on Flatfox page (badges + bullets)
7. Clicking badge routes to detailed analysis view on website
8. Detailed analysis saved to Supabase for website retrieval
9. Extension popup: authenticate via popup or redirect to website
10. Prefilter routing for Flatfox: NICE TO HAVE, not necessary

Compromises should be front-and-center in both views.

</specifics>

<code_context>
## Key Files to Modify/Create

### Extension (modify existing)
- `extension/src/entrypoints/content.ts` — Replace Homegate placeholder with Flatfox content script
- `extension/src/entrypoints/popup/App.tsx` — Rewire to use Supabase auth instead of local storage
- `extension/src/components/popup/Dashboard.tsx` — Update for Supabase auth, link to website

### Extension (create new)
- Content script components: FAB button, score badge, summary panel
- Supabase auth integration for extension (browser client)
- API service to call edge function with JWT

### Website (create new)
- `web/src/app/analysis/[listingId]/page.tsx` — Full analysis page
- Components for category breakdown, checklist, score visualization

### Backend (modify for images)
- `backend/app/services/claude.py` — Add image content blocks to message
- `backend/app/prompts/scoring.py` — Update prompt for image analysis context
- `backend/app/services/flatfox.py` — Ensure image URLs are available in listing model

### Established Patterns
- Pydantic models for backend request/response
- Singleton service pattern with lazy init
- FastAPI router with prefix and tags
- Next.js App Router with server components + server actions
- Supabase SSR for server-side, createBrowserClient for client-side
- WXT for extension with Tailwind + shadcn/ui
- Shadow DOM for injected extension UI (style isolation from host page)

</code_context>

<deferred>
## Deferred Ideas

- Prefilter routing for Flatfox (load Flatfox with user's filters pre-applied) — nice to have
- Batch scoring optimization (score multiple listings in parallel)
- Score caching (don't re-score same listing if preferences haven't changed)
- Extension badge animations / transitions

</deferred>

---

*Phase: 04-extension-ui-analysis-page*
*Context gathered: 2026-03-11*
