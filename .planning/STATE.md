---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Polish & History
status: completed
last_updated: "2026-03-17T08:15:47.718Z"
last_activity: 2026-03-17 -- Completed 16-02-PLAN.md (human-verify approved)
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website they're already on.
**Current focus:** Milestone v3.0 -- Phase 16 complete

## Current Position

Phase: 16 of 16 (Summary & Profile Creation)
Plan: 2 of 2 in current phase (Plan 02 complete, human-verified)
Status: Phase 16 complete -- all plans and checkpoints done
Last activity: 2026-03-17 -- Completed 16-02-PLAN.md (human-verify approved)

Progress: [██████████] 100%

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
- [Phase 12]: Lifted useForm to ProfileEditClient so ChatPanel callback and PreferencesForm share the same form instance
- [Phase 12]: PreferencesForm accepts optional external form prop (Option A) for backward compatibility
- [Phase 12]: ExtractedFieldsReview swaps chat view (replaces messages+input) rather than overlaying

- [v2.0 Phase 11]: Migration 003 not applied to prod -- Supabase CLI not authenticated locally. Must apply via SQL editor or after supabase login.
- [v3.0]: Conversational AI backend runs on EC2 FastAPI, calls Claude via ANTHROPIC_API_KEY
- [v3.0]: Chat conversations are ephemeral (not persisted to DB)
- [v3.0]: Post-conversation summary uses inline editing (not redirect to existing form)
- [v3.0]: v2.0 phases 12-13 (UX polish, JWT hardening) remain pending and will be addressed separately
- [v3.0 Phase 14]: Accent nav items use always-on text-primary class with conditional bg-primary/10 for active state
- [v3.0 Phase 14]: Chat state is fully ephemeral using React useState -- no DB writes, no Supabase imports
- [v3.0 Phase 14]: Mock AI response with 1.5s delay in chat-page.tsx for UI testing without backend
- [Phase 14]: Fixed chat-page tests: placeholder queries, scrollIntoView mock, Enter key submission
- [Phase 15]: Used regex sentinel tag <preferences_ready> for structured extraction from conversational responses
- [Phase 15]: Added from __future__ import annotations to claude.py for Python 3.9 compat
- [Phase 15]: Error messages shown inline as assistant messages for conversational UX continuity
- [Phase 16]: Mapper delegates entirely to preferencesSchema.parse() since backend already provides camelCase keys
- [Phase 16]: Test file placed in src/__tests__/ to match vitest include pattern instead of src/lib/__tests__/
- [Phase 16]: Summary card renders inside chat thread scroll area, not as overlay
- [Phase 16]: Chat input disabled during summarizing phase to maintain focus on summary card

### Blockers/Concerns

- Orphaned code: app-sidebar.tsx, dashboard/actions.ts -- not addressed in current scope
- Supabase CLI auth needed to apply DB migrations (use SQL editor as workaround)
