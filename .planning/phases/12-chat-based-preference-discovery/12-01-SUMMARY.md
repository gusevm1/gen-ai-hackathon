---
phase: 12-chat-based-preference-discovery
plan: 01
subsystem: api
tags: [ai-sdk, anthropic, claude, streaming, zod, structured-extraction, chat]

# Dependency graph
requires:
  - phase: 11-dynamic-preference-schema
    provides: dynamicFields schema and DynamicField type in preferences.ts
provides:
  - AI SDK packages (ai, @ai-sdk/react, @ai-sdk/anthropic) installed
  - System prompt for Swiss property preference chat
  - Zod extraction schema for structured field output
  - Streaming chat API route at /api/chat with auth guard
  - extractPreferencesFromChat server action
  - mergeExtractedFields utility for dynamic field append
affects: [12-02-PLAN, 12-03-PLAN]

# Tech tracking
tech-stack:
  added: [ai@6.0.116, "@ai-sdk/react@3.0.118", "@ai-sdk/anthropic@3.0.58"]
  patterns: [streamText for chat route, generateText + Output.object for extraction, pure append merge]

key-files:
  created:
    - web/src/lib/chat/system-prompt.ts
    - web/src/lib/chat/extraction-schema.ts
    - web/src/lib/chat/merge-fields.ts
    - web/src/app/api/chat/route.ts
    - web/src/__tests__/extraction-schema.test.ts
    - web/src/__tests__/chat-merge.test.ts
  modified:
    - web/package.json
    - web/pnpm-lock.yaml
    - web/src/app/(dashboard)/profiles/actions.ts
    - web/.env.local

key-decisions:
  - "Added extractPreferencesFromChat to profiles/actions.ts (not [profileId]/actions.ts) since that is where saveProfilePreferences already lives"
  - "Used claude-haiku-4-5-20251001 for both chat and extraction per research recommendation"
  - "Merge utility uses pure append strategy; replace-vs-append logic deferred to call site"

patterns-established:
  - "AI SDK streaming: streamText + toUIMessageStreamResponse for chat routes"
  - "AI SDK extraction: generateText + Output.object with Zod schema for structured output"
  - "Auth guard pattern: Supabase getUser() check in both route handlers and server actions"

requirements-completed: [CHAT-02, CHAT-03, CHAT-05]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 12 Plan 01: Server-Side Chat Infrastructure Summary

**AI SDK streaming chat route with Claude Haiku, structured extraction via Zod schema, and dynamic field merge utility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T17:27:40Z
- **Completed:** 2026-03-16T17:31:36Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed AI SDK packages (ai, @ai-sdk/react, @ai-sdk/anthropic) for streaming chat
- Built complete server-side chat layer: system prompt, extraction schema, streaming route, extraction action, merge utility
- 11 unit tests covering extraction schema validation and merge behavior, all passing
- Full test suite (74 tests) green with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK + create lib/chat layer + extraction schema tests** - `2243061` (feat)
2. **Task 2: Chat API route + extraction action + merge utility + merge tests** - `ffa0e3f` (feat)

## Files Created/Modified
- `web/src/lib/chat/system-prompt.ts` - Swiss property chat system prompt (CHAT_SYSTEM_PROMPT)
- `web/src/lib/chat/extraction-schema.ts` - Zod schema for structured extraction (extractedFieldSchema, extractionResultSchema)
- `web/src/lib/chat/merge-fields.ts` - Pure append merge for dynamic fields (mergeExtractedFields)
- `web/src/app/api/chat/route.ts` - POST handler streaming Claude responses via AI SDK
- `web/src/app/(dashboard)/profiles/actions.ts` - Added extractPreferencesFromChat server action
- `web/src/__tests__/extraction-schema.test.ts` - 6 tests for extraction schema validation
- `web/src/__tests__/chat-merge.test.ts` - 5 tests for merge utility
- `web/package.json` - Added ai, @ai-sdk/react, @ai-sdk/anthropic dependencies
- `web/.env.local` - Added ANTHROPIC_API_KEY placeholder (not committed)

## Decisions Made
- Added extractPreferencesFromChat to `profiles/actions.ts` (the file where `saveProfilePreferences` lives) rather than creating a new `[profileId]/actions.ts` -- the plan referenced a path that didn't exist, but the intent was clear
- Used `claude-haiku-4-5-20251001` for both chat streaming and extraction per research recommendation
- Merge utility is intentionally simple (pure append) -- call site decides replace-vs-append strategy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted extractPreferencesFromChat location**
- **Found during:** Task 2 (extraction action)
- **Issue:** Plan specified `web/src/app/(dashboard)/profiles/[profileId]/actions.ts` which did not exist. The existing actions file with `saveProfilePreferences` is at `web/src/app/(dashboard)/profiles/actions.ts`.
- **Fix:** Added extractPreferencesFromChat to the existing `profiles/actions.ts` file where all profile server actions already live.
- **Files modified:** web/src/app/(dashboard)/profiles/actions.ts
- **Verification:** Function exports correctly, all existing exports preserved.
- **Committed in:** ffa0e3f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** File path correction. No scope creep. All existing exports preserved.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration:**
- **ANTHROPIC_API_KEY**: Add to Vercel Dashboard (Project Settings > Environment Variables > Production + Preview)
  - Source: [Anthropic Console](https://console.anthropic.com/settings/keys) > API Keys > Create Key
  - Do NOT prefix with `NEXT_PUBLIC_` -- must stay server-side only
  - Verification: Deploy to Vercel, POST to `/api/chat` with auth should stream response

## Next Phase Readiness
- Server-side chat infrastructure complete; Plan 02 (ChatPanel UI component) can proceed
- Plan 03 (extraction review UI) has extractPreferencesFromChat and mergeExtractedFields ready
- ANTHROPIC_API_KEY must be set before production chat works (placeholder added to .env.local)

## Self-Check: PASSED

All 6 created files verified present on disk. Both task commits (2243061, ffa0e3f) verified in git log.

---
*Phase: 12-chat-based-preference-discovery*
*Completed: 2026-03-16*
