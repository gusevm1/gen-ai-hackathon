---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: AI-Powered Conversational Profile Creation
status: defining_requirements
stopped_at: Milestone v3.0 started — requirements defined, roadmap pending
last_updated: "2026-03-17T00:00:00.000Z"
last_activity: 2026-03-17 -- Milestone v3.0 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v3.0 -- Defining requirements and roadmap

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-17 — Milestone v3.0 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [v2.0 Phase 11]: Migration 003 not applied to prod -- Supabase CLI not authenticated locally. Must apply via SQL editor or after supabase login.
- [v2.0 Phase 11-02]: Cache query fetches both stale and non-stale rows; signals via X-HomeMatch-Pref-Stale header
- [v2.0 Phase 11-03]: FAB restyled with brand teal, house icon, black dial, hover tooltip
- [v3.0]: Conversational AI backend runs on EC2 FastAPI, calls Claude via ANTHROPIC_API_KEY
- [v3.0]: Chat conversations are ephemeral (not persisted to DB)
- [v3.0]: Post-conversation summary uses inline editing (not redirect to existing form)
- [v3.0]: v2.0 phases 12-13 (UX polish, JWT hardening) remain pending and will be addressed separately

### Blockers/Concerns

- Orphaned code: app-sidebar.tsx, dashboard/actions.ts -- not addressed in current scope
- Supabase CLI auth needed to apply DB migrations (use SQL editor as workaround)
