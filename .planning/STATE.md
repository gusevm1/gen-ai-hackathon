---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Smart Preferences & UX Polish
status: in-progress
stopped_at: Completed 12-02-PLAN.md
last_updated: "2026-03-16T17:38:30Z"
last_activity: 2026-03-16 -- Completed 12-02 (Chat conversation UI)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.
**Current focus:** Phase 12 - Chat-Based Preference Discovery

## Current Position

Phase: 12 of 14 (Chat-Based Preference Discovery)
Plan: 2 of 3 complete
Status: In Progress
Last activity: 2026-03-16 -- Completed 12-02 (Chat conversation UI)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (v2.0)
- Average duration: 3.75min
- Total execution time: 15min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 2/2 | 7min | 3.5min |
| 12 | 2/3 | 8min | 4min |

## Accumulated Context

### Decisions

- (11-01) Keep softCriteria field in both schemas for backward compat; migration adds dynamicFields alongside it
- (11-01) Use pre-parse migratePreferences() function (web) rather than Zod transform to avoid default/transform ordering issues
- (11-01) DynamicField rejects empty names at validation time rather than silently filtering
- [Phase 11]: Dynamic fields in prompt use conditional rendering: importance-grouped section when present, soft_criteria fallback when absent
- [Phase 11]: System prompt uses 'custom criterion' terminology to match dynamic fields framing
- [Phase 11]: DynamicFieldsSection uses useFieldArray from react-hook-form for robust array management
- (12-01) extractPreferencesFromChat added to profiles/actions.ts (not [profileId]/actions.ts) since saveProfilePreferences already lives there
- (12-01) Used claude-haiku-4-5-20251001 for both chat and extraction per research recommendation
- (12-01) Merge utility uses pure append strategy; replace-vs-append logic deferred to call site
- (12-02) AI SDK v6 useChat returns sendMessage (not handleSubmit); input state managed locally
- (12-02) Persistence extracted to lib/chat/persistence.ts for direct unit testing
- (12-02) ChatPanel renders inline above form (not modal) for simultaneous visibility

### Blockers/Concerns

- No score caching (re-scores every FAB click) -- deferred beyond v2.0
- `--no-verify-jwt` on edge function -- revisit security
- Orphaned code: app-sidebar.tsx, dashboard/actions.ts (savePreferences/loadPreferences)
- Phase 12 needs research pass on chat conversation design (single-shot vs multi-turn)

## Session Continuity

Last session: 2026-03-16T17:38:30Z
Stopped at: Completed 12-02-PLAN.md
Resume file: None
