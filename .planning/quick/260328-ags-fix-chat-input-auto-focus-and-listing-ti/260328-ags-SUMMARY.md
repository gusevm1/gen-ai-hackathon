---
phase: quick
plan: 260328-ags
subsystem: web-frontend, backend-scoring
tags: [ux, chat, analyses, auto-focus, listing-display]
dependency_graph:
  requires: []
  provides:
    - chat-input-auto-focus
    - analyses-rich-listing-titles
  affects:
    - chat-page-ux
    - analyses-page-display
    - scoring-breakdown-jsonb
tech_stack:
  added: []
  patterns:
    - forwardRef + useImperativeHandle for imperative focus control
    - Fallback chain pattern for graceful data degradation
key_files:
  created: []
  modified:
    - web/src/components/chat/chat-input.tsx
    - web/src/components/chat/chat-page.tsx
    - web/src/app/(dashboard)/analyses/page.tsx
    - backend/app/routers/scoring.py
decisions:
  - Used forwardRef + useImperativeHandle over isLoading prop for cleaner separation of concerns
  - 50ms setTimeout before focus to ensure disabled prop clears first
  - Added shrink-0 to score badge to prevent truncation when title is long
metrics:
  duration: 2m 36s
  completed: 2026-03-28T06:39:00Z
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 260328-ags: Fix Chat Input Auto-Focus and Listing Titles Summary

**One-liner:** Auto-focus chat textarea after AI response via forwardRef, plus two-line rich listing titles on Analyses page with address/rooms/type fallback chain.

## What Was Done

### Task 1: Auto-focus chat input after AI response
- Wrapped `ChatInput` with `forwardRef` and exposed a `focus()` method via `useImperativeHandle`
- Added `ChatInputHandle` interface export for type-safe ref usage
- Added `useEffect` in `ChatPage` watching `isTyping` -- when it transitions to `false`, focuses the textarea after a 50ms delay (ensures `disabled` prop has cleared)
- Passed `ref={chatInputRef}` to `ChatInput`
- **Commit:** `8860a8f`

### Task 2: Inject listing address metadata and display rich titles
- **Backend:** Added `listing_address` (street + zipcode + city), `listing_rooms`, and `listing_object_type` to the `score_data` dict before saving to Supabase `analyses.breakdown` JSONB
- **Frontend:** Updated breakdown type cast to include new fields; built fallback chain: `listing_title` > constructed title (rooms + type + city) > `listing_address` > `"Listing {id}"`
- Secondary address line shown in muted text when available and different from primary title
- Changed flex alignment from `items-center` to `items-start` for proper multi-line layout
- Added `shrink-0` to score badge so it never gets compressed by long titles
- **Commit:** `210ca2a`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: No errors in modified files (pre-existing test-only errors unrelated)
- Python syntax: AST parse passes for scoring.py
- Manual verification pending: chat auto-focus and analyses page display require browser testing

## Self-Check: PASSED

All 4 modified files exist. Both task commits (8860a8f, 210ca2a) verified in git log.
