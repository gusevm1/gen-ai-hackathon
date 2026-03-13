---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Demo-Ready + Multi-Profile
status: active
stopped_at: null
last_updated: "2026-03-13T12:00:00.000Z"
last_activity: 2026-03-13 -- Milestone v1.1 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.
**Current focus:** Milestone v1.1 — Demo-Ready + Multi-Profile

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-13 — Milestone v1.1 started

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
- [Phase 02-01]: shadcn/ui v4 uses Base UI primitives (not Radix) -- different Accordion/Slider API
- [Phase 02-01]: Zod v4 nested defaults need explicit values (not auto-applied from inner schemas)
- [Phase 02-01]: zodResolver needs cast as Resolver<T> for Zod v4 type compatibility with RHF v7
- [Phase 03-01]: alias_generator=to_camel with populate_by_name=True for UserPreferences camelCase JSONB support
- [Phase 03-01]: Claude model default: claude-haiku-4-5-20250514 via CLAUDE_MODEL env var
- [Phase 03-01]: messages.parse(output_format=ScoreResponse) for guaranteed valid structured output
- [Phase 03-02]: Edge function injects authenticated user_id from JWT into backend request body
- [Phase 04-04]: Max 5 images per listing (~6700 tokens) for Claude token cost control
- [Phase 04-04]: URL-based image content blocks (not base64) to leverage Claude URL fetching
- [Phase 04]: Per-badge Shadow DOM via createShadowRootUi position inline (locked decision for Flatfox CSS isolation)
- [Phase 04]: Custom DOM event homematch:panel-toggle for cross-shadow-root panel coordination

### Pending Todos

None yet.

### Blockers/Concerns

- Preferences divergence: extension wizard has richer schema than web app; backend reads web app format only — v1.1 should unify
- No score caching (re-scores every FAB click) — revisit in future milestone
- `--no-verify-jwt` on edge function — revisit security

## Session Continuity

Last session: 2026-03-13
Stopped at: null
Resume file: None
