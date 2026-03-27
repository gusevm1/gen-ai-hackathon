---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Extension Download & Install
status: verifying
last_updated: "2026-03-27T23:45:52.142Z"
last_activity: 2026-03-27
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.
**Current focus:** Phase 24 — Prompt Injection & Scoring Rules

## Current Position

Phase: 24 (Prompt Injection & Scoring Rules) — EXECUTING
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-03-27

Progress: [██████████] 100%

## Accumulated Context

### Decisions

- [v5.0]: Backend-only change (FastAPI on EC2) — no frontend or extension changes
- [v5.0]: Apify Google Places pre-fetched before Claude scoring, not via tool-calling
- [v5.0]: nearby_places_cache table added to Supabase (new, does not modify existing tables)
- [v5.0]: Proximity pipeline is conditional — no-op when no proximity requirements in dynamic_fields
- [v5.0]: Graceful degradation on every failure path (missing coords, Apify error, empty results)
- [Phase 22-database-coordinate-resolution]: Migration file created (004_add_nearby_places_cache.sql); DB push requires manual Studio SQL execution due to missing personal access token
- [Phase 22-database-coordinate-resolution]: TYPE_CHECKING guard used in apify.py for FlatfoxListing import to prevent circular import at module load
- [Phase 22-database-coordinate-resolution]: Coordinate resolution at step 1a (after listing fetch, before preferences) ensures ClaudeScorer sees resolved lat/lon; geocoding failure never propagates to 502 handler
- [Phase 23]: Import _AMENITY_KEYWORDS from claude.py into proximity.py to avoid duplication without touching claude.py prompts
- [Phase 23]: Cache TTL computed in Python datetime arithmetic for supabase-py compatibility
- [Phase 23]: nearby_places stored in analyses.breakdown JSONB (not ScoreResponse schema) for Phase 24 consumption without API changes
- [Phase 24]: _AMENITY_KEYWORDS relocated to proximity.py so import direction is proximity->claude (not circular)
- [Phase 24]: score_listing() simplified to single messages.parse() call — no agentic loop, no tool_choice
- [Phase 24]: nearby_data or None used at router boundary so empty dict never injects an empty prompt section

### Blockers/Concerns

- Migration 004 not yet applied to DB: requires Supabase personal access token (sbp_...) or manual Studio SQL application at https://supabase.com/dashboard/project/mlhtozdtiorkemamzjjc/sql/new
