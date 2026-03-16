---
phase: 12-chat-based-preference-discovery
verified: 2026-03-17T00:10:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "End-to-end chat-to-form flow in running app"
    expected: "Chat panel opens, Claude streams responses, extract button appears after 2+ assistant turns, review UI shows editable fields, accepting merges them into Custom Criteria section of the form"
    why_human: "Live streaming AI interaction, UI rendering, and real form state mutation cannot be verified programmatically"
---

# Phase 12: Chat-Based Preference Discovery Verification Report

**Phase Goal:** Conversational AI interface for natural-language preference capture with extraction and form merge
**Verified:** 2026-03-17T00:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

#### Plan 01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Chat API route streams Claude responses to authenticated users | VERIFIED | `web/src/app/api/chat/route.ts` — POST handler calls `streamText` with `anthropic('claude-haiku-4-5-20251001')` and returns `result.toUIMessageStreamResponse()` |
| 2 | Extraction action returns structured DynamicField[] from conversation text | VERIFIED | `extractPreferencesFromChat` in `profiles/actions.ts` — calls `generateText` with `Output.object({ schema: extractionResultSchema })`, returns `output?.fields ?? []` |
| 3 | Merge utility appends extracted fields to existing dynamicFields without overwriting standard form fields | VERIFIED | `mergeExtractedFields` in `merge-fields.ts` — pure `[...existing, ...extracted]` append; 5 tests passing |
| 4 | Unauthenticated requests to /api/chat return 401 | VERIFIED | `route.ts` lines 9-18 — Supabase `getUser()` check, returns `Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })` if no user |

#### Plan 02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | User can see a chat toggle button on the profile edit page | VERIFIED | `chat-panel.tsx` renders `<Button>Chat with AI</Button>` with `MessageSquare` icon when `isOpen === false`; wired via `ProfileEditClient` in `page.tsx` |
| 6 | Clicking the toggle opens a chat panel with message history and input | VERIFIED | `isOpen` state toggled on button click; panel renders `ChatMessages` + `ChatInput` with header "Preference Discovery Chat" |
| 7 | User can type and send messages that stream Claude responses | VERIFIED | `useChat` with `DefaultChatTransport({ api: '/api/chat' })`; `sendMessage({ text })` used on form submit; `status` drives `isLoading` |
| 8 | Chat messages persist in sessionStorage keyed by profileId | VERIFIED | `saveMessages(profileId, messages)` called on messages change; `loadMessages(profileId)` called on mount; key pattern `chat-${profileId}`; 5 persistence tests passing |
| 9 | Navigating away and back restores the conversation | VERIFIED | `useEffect` on mount restores from sessionStorage; `saveMessages` skips empty arrays to avoid clearing on initial render |

#### Plan 03 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 10 | User sees an "Extract Preferences" button after at least 2 assistant responses | VERIFIED | `chat-panel.tsx` — `canExtract = assistantMessageCount >= 2`; button conditionally rendered with `{canExtract && <Button>Extract Preferences</Button>}` |
| 11 | Clicking extract shows a loading state, then displays structured fields with name, value, importance | VERIFIED | `isExtracting` state drives `<Loader2 animate-spin>` and "Extracting..." text; `setExtractedFields(fields)` triggers `ExtractedFieldsReview` view-swap |
| 12 | User can edit any extracted field's name, value, or importance before saving | VERIFIED | `ExtractedFieldsReview` — local `editableFields` state; `Input` for name/value, `<select>` for importance; `updateField` updates on change; 7 tests passing |
| 13 | User can delete individual extracted fields before saving | VERIFIED | `removeField(index)` filters out field by index; X `Button` per field triggers it |
| 14 | Accepting extracted fields merges them into the form's dynamicFields without overwriting standard fields | VERIFIED | `ProfileEditClient.handleFieldsExtracted` — `form.getValues('dynamicFields')`, `mergeExtractedFields(current, fields)`, `form.setValue('dynamicFields', merged, { shouldDirty: true })`; `form` instance is shared with `PreferencesForm` |

**Score: 14/14 truths verified**

Note: The truth "Re-extraction replaces previously extracted fields" from Plan 03 is implemented as replace at the `extractedFields` state level in `chat-panel.tsx` (new extraction overwrites `extractedFields` state) but append at the form merge level. This matches the research recommendation and plan intent.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/lib/chat/system-prompt.ts` | Exports `CHAT_SYSTEM_PROMPT` | VERIFIED | 29 lines, substantive Swiss property chat prompt, exports correct constant |
| `web/src/lib/chat/extraction-schema.ts` | Exports `extractedFieldSchema`, `extractionResultSchema`, `ExtractionResult` | VERIFIED | All 3 exports present, Zod schemas with `.describe()` annotations |
| `web/src/lib/chat/merge-fields.ts` | Exports `mergeExtractedFields` | VERIFIED | 15 lines, pure append implementation |
| `web/src/lib/chat/persistence.ts` | Exports `saveMessages`, `loadMessages` | VERIFIED | Created as part of Plan 02 (deviation from plan: extracted to own file for testability); correct key prefix `chat-` |
| `web/src/app/api/chat/route.ts` | Exports `POST`, `maxDuration` | VERIFIED | `maxDuration = 60`, `POST` handler with auth guard + streaming |
| `web/src/app/(dashboard)/profiles/actions.ts` | Exports `extractPreferencesFromChat` | VERIFIED | Added to existing actions file (correct deviation from plan — the `[profileId]/actions.ts` path didn't exist); all prior exports preserved |
| `web/src/components/chat/chat-panel.tsx` | Exports `ChatPanel` | VERIFIED | 182 lines, useChat + sessionStorage + extraction trigger + review swap |
| `web/src/components/chat/chat-messages.tsx` | Exports `ChatMessages` | VERIFIED | Role-based message bubbles, auto-scroll, empty state |
| `web/src/components/chat/chat-input.tsx` | Exports `ChatInput` | VERIFIED | Input + send button, loading state |
| `web/src/components/chat/extracted-fields-review.tsx` | Exports `ExtractedFieldsReview` | VERIFIED | 112 lines, inline edit/delete/accept/cancel |
| `web/src/app/(dashboard)/profiles/[profileId]/profile-edit-client.tsx` | Client wrapper with functional `onFieldsExtracted` | VERIFIED | Lifts `useForm`, `mergeExtractedFields` wired in `handleFieldsExtracted` |
| `web/src/app/(dashboard)/profiles/[profileId]/page.tsx` | Renders `ProfileEditClient` | VERIFIED | Server component passes data to `ProfileEditClient` |
| `web/src/components/preferences/preferences-form.tsx` | Accepts optional `form` prop | VERIFIED | `form?: UseFormReturn<Preferences>`; uses `externalForm ?? internalForm` |
| `web/src/__tests__/extraction-schema.test.ts` | 6+ extraction schema tests | VERIFIED | 6 tests, all passing |
| `web/src/__tests__/chat-merge.test.ts` | 5+ merge tests | VERIFIED | 5 tests, all passing |
| `web/src/__tests__/chat-panel.test.tsx` | 4+ panel toggle tests | VERIFIED | 4 tests, all passing |
| `web/src/__tests__/chat-persistence.test.ts` | 5+ persistence tests | VERIFIED | 5 tests, all passing |
| `web/src/__tests__/extracted-fields-review.test.tsx` | 7+ review tests | VERIFIED | 7 tests, all passing |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `web/src/app/api/chat/route.ts` | `web/src/lib/chat/system-prompt.ts` | `import CHAT_SYSTEM_PROMPT` | WIRED | Line 4 imports, line 24 uses as `system:` param |
| `web/src/app/(dashboard)/profiles/actions.ts` | `web/src/lib/chat/extraction-schema.ts` | `import extractionResultSchema` | WIRED | Line 8 imports, line 193 uses in `Output.object({ schema: extractionResultSchema })` |
| `web/src/components/chat/chat-panel.tsx` | `/api/chat` | `DefaultChatTransport({ api: '/api/chat' })` | WIRED | Line 5 imports `DefaultChatTransport`, line 28 instantiates with `api: '/api/chat'` |
| `web/src/components/chat/chat-panel.tsx` | `sessionStorage` | `saveMessages`/`loadMessages` via `lib/chat/persistence.ts` | WIRED | Lines 11, 44, 52 — import + restore on mount + save on messages change |
| `web/src/app/(dashboard)/profiles/[profileId]/page.tsx` | `chat-panel.tsx` | `ChatPanel` via `ProfileEditClient` | WIRED | Line 7 imports `ProfileEditClient`, line 53 renders it passing `profileId` |
| `web/src/components/chat/chat-panel.tsx` | `profiles/actions.ts` | `extractPreferencesFromChat` call | WIRED | Line 12 imports, line 87 calls `await extractPreferencesFromChat(conversationText)` |
| `web/src/app/(dashboard)/profiles/[profileId]/profile-edit-client.tsx` | `web/src/lib/chat/merge-fields.ts` | `mergeExtractedFields` call on accept | WIRED | Line 8 imports, lines 32-33 call `mergeExtractedFields` and `form.setValue('dynamicFields', merged, ...)` |
| `web/src/app/(dashboard)/profiles/[profileId]/profile-edit-client.tsx` | `react-hook-form setValue` | `form.setValue('dynamicFields', merged)` | WIRED | Line 33: `form.setValue('dynamicFields', merged, { shouldDirty: true })` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAT-01 | 12-02 | User can open a chat interface from their profile to discover preferences | SATISFIED | Chat toggle button in `ChatPanel`, rendered on profile edit page via `ProfileEditClient`; 4 panel tests |
| CHAT-02 | 12-01 | AI chat engages in multi-turn conversation to understand what user is looking for | SATISFIED | `streamText` with `CHAT_SYSTEM_PROMPT` (multi-turn via `messages: convertToModelMessages(messages)`), chat route maintains conversation history |
| CHAT-03 | 12-01 | Chat extracts structured preference fields with priorities from the conversation | SATISFIED | `extractPreferencesFromChat` server action uses `generateText + Output.object` with `extractionResultSchema`; returns typed `DynamicField[]` |
| CHAT-04 | 12-03 | User can view, edit, add, and delete AI-generated preference fields before saving | SATISFIED | `ExtractedFieldsReview` component with inline name/value/importance editing, per-field delete, accept/cancel; 7 tests |
| CHAT-05 | 12-01, 12-03 | Chat-generated fields saved via JSONB merge preserving standard fields (location, budget, rooms) | SATISFIED | `mergeExtractedFields` (pure append to `dynamicFields` only); `saveProfilePreferences` validates via `preferencesSchema` which preserves all standard fields; 5 merge tests |
| CHAT-06 | 12-02 | Chat conversation persists in sessionStorage across page navigation within session | SATISFIED | `saveMessages`/`loadMessages` in `lib/chat/persistence.ts` with key `chat-${profileId}`; restore-on-mount in `ChatPanel`; 5 persistence tests |

All 6 requirements satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

No blocking anti-patterns detected.

Patterns that triggered grep but are benign:
- `return []` in `persistence.ts` — correct error-handling return values, not stubs
- `return null` in `chat-messages.tsx` — filters messages with no text parts (correct)
- `placeholder=` in `chat-input.tsx` and `extracted-fields-review.tsx` — HTML input placeholder attributes, not stub markers

---

### Human Verification Required

#### 1. End-to-End Chat Flow

**Test:** Navigate to a profile edit page in the running app. Click "Chat with AI". Send several messages discussing property preferences (e.g., quiet neighborhood, south-facing balcony). Verify Claude streams responses. After 2+ assistant responses, click "Extract Preferences". Edit one field, delete another, click "Add to Profile". Confirm fields appear in the Custom Criteria accordion. Save and reload to confirm persistence.

**Expected:** Full pipeline — chat streams, extract button appears conditionally, review UI shows editable fields, accepting merges into form, saving persists to Supabase. Standard fields (location, budget, rooms) are unaffected.

**Why human:** Live Anthropic API call with streaming output, real-time React state mutation across shared form instances, and actual Supabase write cannot be verified programmatically. Requires `ANTHROPIC_API_KEY` to be set.

Note: Per the Plan 03 summary, a human checkpoint was already completed and approved by the user during execution (Task 2 of Plan 03). This verification documents it as a human item for completeness.

---

### Test Suite Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| `extraction-schema.test.ts` | 6 | All passing |
| `chat-merge.test.ts` | 5 | All passing |
| `chat-persistence.test.ts` | 5 | All passing |
| `chat-panel.test.tsx` | 4 | All passing |
| `extracted-fields-review.test.tsx` | 7 | All passing |
| Full suite (90 tests) | 90 | All passing, zero regressions |

---

### Summary

Phase 12 goal is fully achieved. All server-side chat infrastructure (system prompt, extraction schema, streaming route, extraction server action, merge utility) is substantive and wired. All three UI components (`ChatPanel`, `ChatMessages`, `ChatInput`) and the review component (`ExtractedFieldsReview`) are implemented with real logic — no stubs. The profile edit page is correctly restructured via `ProfileEditClient` to share a `useForm` instance between `ChatPanel` (for merge) and `PreferencesForm` (for rendering). All 6 CHAT requirements are satisfied. 27 new tests pass, full 90-test suite is green.

One notable deviation from the original plan: `extractPreferencesFromChat` lives in `profiles/actions.ts` (not a non-existent `[profileId]/actions.ts`), which is the correct location and where all other profile server actions already reside.

---

_Verified: 2026-03-17T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
