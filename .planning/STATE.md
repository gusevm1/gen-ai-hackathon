---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Fresh start after Flatfox pivot
stopped_at: Phase 1 context gathered (post-Flatfox pivot)
last_updated: "2026-03-10T12:35:36.235Z"
last_activity: 2026-03-10 -- Roadmap rewrite
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.
**Current focus:** Phase 1 - Infrastructure & Auth

## Current Position

Phase: 1 of 4 (Infrastructure & Auth) -- NOT STARTED
Plan: 0 of ? complete
Status: Fresh start after Flatfox pivot
Last activity: 2026-03-10 -- Roadmap rewrite

Progress: [░░░░░░░░░░] 0%

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

### Pending Todos

None yet.

### Blockers/Concerns

- Flatfox API endpoint structure needs live verification (found `/api/v1/flat/` from reverse engineering, needs confirmation)
- Claude API account tier should be checked before Phase 3 testing
- Existing Phase 1 extension code (Homegate wizard) will be replaced -- may want to archive

## Session Continuity

Last session: 2026-03-10T12:35:36.233Z
Stopped at: Phase 1 context gathered (post-Flatfox pivot)
Resume file: .planning/phases/01-foundation-onboarding/01-CONTEXT.md
