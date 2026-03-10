---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Completed 03-02-PLAN.md
last_updated: "2026-03-10T15:57:06.125Z"
last_activity: 2026-03-10 -- Phase 3 Plan 2 checkpoint approved, scoring pipeline verified end-to-end
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 7
  completed_plans: 8
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.
**Current focus:** Phase 4 - Extension UI & Analysis Page

## Current Position

Phase: 3 of 4 (LLM Scoring Pipeline) -- COMPLETE
Plan: 2 of 2 complete
Status: Phase 3 complete. Ready to begin Phase 4 (Extension UI & Analysis Page).
Last activity: 2026-03-10 -- Phase 3 Plan 2 checkpoint approved, scoring pipeline verified end-to-end

Progress: [=========-] 85%

## Architecture Pivot (2026-03-10)

**What changed:**
- Target site: Homegate → Flatfox (has public API, agent-validated)
- Preferences: Extension onboarding wizard → Separate Next.js website on Vercel
- Auth: None → Supabase (email/password) from day 1
- Backend: Node.js Hono → Python FastAPI (matches jobbmatch reference)
- Data extraction: DOM scraping / __INITIAL_STATE__ → Flatfox public API
- Scoring trigger: Automatic → On-demand via floating action button
- Analysis: All in extension → Quick summary in extension, full analysis on website
- Storage: chrome.storage.local → Supabase PostgreSQL
- API routing: Direct → Supabase edge functions as proxy

**What stayed:**
- Chrome extension (Manifest V3, WXT)
- EC2 backend for LLM calls
- Claude API for scoring
- Weighted category preferences with soft criteria
- "I don't know" over guessing philosophy

## Performance Metrics

**Velocity:**
- Previous milestone (Homegate Phase 1): 4 plans in 0.77 hours
- Current milestone: Starting fresh

## Accumulated Context

### Decisions

- [Pivot]: Flatfox over Homegate -- real estate agent feedback + public API
- [Architecture]: Next.js (Vercel) + FastAPI (EC2) + Supabase (auth/DB) + WXT extension
- [Auth]: Supabase email/password from day 1
- [Scoring]: On-demand via FAB (not automatic -- Claude API calls expensive)
- [Data]: Backend calls Flatfox API (not extension-side scraping)
- [UI]: Minimal design, function over form, redesign later
- [Preferences]: Single page with collapsible sections (not multi-step wizard)
- [Features]: Presented as reusable soft criteria suggestions (not separate checklist)
- [Analysis]: 3-5 bullets in extension, full analysis page on website
- [Edge functions]: Supabase edge functions proxy to EC2
- [Phase 02]: Used /api/v1/public-listing/{pk}/ endpoint (NOT /api/v1/flat/ which returns 404)
- [Phase 02]: Singleton FlatfoxClient with lazy httpx.AsyncClient init and 30s timeout
- [Phase 02]: number_of_rooms stored as Optional[str] matching Flatfox convention (Swiss 3.5 rooms)
- [Phase 02-01]: Scaffolded Next.js app from scratch (Phase 1 not re-executed after Flatfox pivot)
- [Phase 02-01]: shadcn/ui v4 uses Base UI primitives (not Radix) -- different Accordion/Slider API
- [Phase 02-01]: Zod v4 nested defaults need explicit values (not auto-applied from inner schemas)
- [Phase 02-01]: zodResolver needs cast as Resolver<T> for Zod v4 type compatibility with RHF v7
- [Phase 02-01]: watch/setValue pattern for string array form fields (not useFieldArray)
- [Phase 02]: Scaffolded Next.js app from scratch (Phase 1 not re-executed after Flatfox pivot)
- [Phase 03-01]: alias_generator=to_camel with populate_by_name=True for UserPreferences camelCase JSONB support
- [Phase 03-01]: Claude model default: claude-haiku-4-5-20250514 via CLAUDE_MODEL env var
- [Phase 03-01]: SupabaseService uses synchronous client (wrap with asyncio.to_thread in async endpoints)
- [Phase 03-01]: messages.parse(output_format=ScoreResponse) for guaranteed valid structured output
- [Phase 03-01]: match_tier uses Literal type (excellent/good/fair/poor) for compile-time validation
- [Phase 03]: alias_generator=to_camel with populate_by_name=True for UserPreferences camelCase JSONB support
- [Phase 03]: messages.parse(output_format=ScoreResponse) for guaranteed valid structured Claude output
- [Phase 03-02]: asyncio.to_thread wraps synchronous SupabaseService calls in scoring endpoint
- [Phase 03-02]: save_analysis is fire-and-forget (log error, don't fail response)
- [Phase 03-02]: Edge function injects authenticated user_id from JWT into backend request body
- [Phase 03-02]: Edge function uses npm:@supabase/supabase-js@2 import for Deno compatibility

### Pending Todos

None yet.

### Blockers/Concerns

- Flatfox API endpoint structure needs live verification (found `/api/v1/flat/` from reverse engineering, needs confirmation)
- Claude API account tier should be checked before Phase 3 testing
- Existing Phase 1 extension code (Homegate wizard) will be replaced -- may want to archive

## Session Continuity

Last session: 2026-03-10T15:57:06.123Z
Stopped at: Completed 03-02-PLAN.md
Resume file: None
