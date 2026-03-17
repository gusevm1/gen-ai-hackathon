# Phase 16: Summary & Profile Creation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

When the backend signals `ready_to_summarize: true`, the chat page transitions to show a structured, editable preference summary card in the conversation thread. The user can edit any field inline (click-to-edit), then confirm to create a real HomeMatch profile via a new server action. After creation, the user is navigated to their new profile's detail page.

</domain>

<decisions>
## Implementation Decisions

### Summary Card Presentation
- Summary card appears as a special message in the chat thread, below the AI's last message — stays in conversation flow, no overlay
- Container: `Card` from shadcn/ui (rounded-xl, border, bg-card) — consistent with existing UI components
- All fields shown; empty/null fields render as "Not specified" in muted text — still editable inline
- Card header: "Your Preference Summary" title + profile name as subtitle; "Confirm & Create Profile" button at the bottom of the card

### Inline Editing UX
- Click-to-edit: clicking a field value turns it into an editable input (pencil icon visible on hover)
- Edits save on blur (clicking elsewhere) — all edits held in local React state until Confirm is pressed
- Importance dropdowns shown in card: `<Select>` for each category (location, price, size, features, condition) — user can tune before confirming
- Dealbreaker checkboxes shown next to budget, rooms, and living space — labeled "Hard limit"

### Backend→Frontend Data Mapping
- Pure frontend utility: `mapExtractedPreferences(extracted)` in `web/src/lib/chat-preferences-mapper.ts`
- `object_types` mapping: single type → APARTMENT/HOUSE enum; multiple or empty → ANY
- `offer_type` mapping: "rent" → "RENT", "buy" → "SALE"
- Unextracted optional fields (floor, size, rooms, amenities): filled via `preferencesSchema.parse(mappedData)` which applies schema defaults
- Essential fields (budget, location, offer type, property type) that are null after mapping render as editable empty placeholders — user can edit before confirming; no additional backend prompting needed since backend already validates sufficiency before sending `ready_to_summarize: true`

### Profile Creation Integration
- New server action `createProfileWithPreferences(name: string, preferences: Preferences)` in `web/src/app/(dashboard)/profiles/actions.ts` — single DB insert with provided preferences, no extra round-trip
- Auto-activate logic: same as existing `createProfile` — only set `is_default: true` if it's the user's first profile
- Post-creation navigation: `router.push(\`/profiles/${newProfileId}\`)` — lands on new profile's detail page
- Loading state: Confirm button shows spinner + "Creating profile..." text while pending
- Error state: errors shown inline below the Confirm button within the summary card

### Claude's Discretion
- Exact animation/transition when summary card appears in the thread
- Whether to dim/disable the chat input while the summary card is shown
- Exact field ordering within the summary card
- Whether to add a "Back to chat" escape hatch if user wants to continue conversing instead of confirming

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat-page.tsx` — already handles `ready_to_summarize` + `extracted_preferences` from backend; has `// Phase 16 will add: transition to summary card view` stub at line ~60; `ConversationPhase` type needs `'summarizing'` state added
- `createProfile()` server action in `web/src/app/(dashboard)/profiles/actions.ts` — contains the `isFirst`/`is_default` logic to replicate; new `createProfileWithPreferences` goes in same file
- `preferencesSchema` + `Preferences` type in `web/src/lib/schemas/preferences.ts` — the target type for mapping; `preferencesSchema.parse()` fills all defaults
- `Card`, `Select`, `Button`, `Input`, `Checkbox` — all available from `web/src/components/ui/`
- `cn()` utility — available from `@/lib/utils`
- `useRouter` from `next/navigation` — for post-creation redirect

### Established Patterns
- Server actions use `'use server'` directive, import `createClient` from `@/lib/supabase/server`, validate auth first
- Client components use `"use client"`, `useState` for local state, `useRouter` for navigation
- Loading states: button disabled + spinner while pending (see existing profile management components)
- Form validation: Zod schema `.parse()` throws on invalid data — wrap in try/catch for user-facing errors
- Styling: Tailwind classes + shadcn/ui; `text-muted-foreground` for secondary/placeholder text

### Integration Points
- `web/src/components/chat/chat-page.tsx`: add `'summarizing'` to `ConversationPhase`, store `extractedPreferences` in state, render `<PreferenceSummaryCard>` in the thread when phase is `'summarizing'`
- New file: `web/src/components/chat/preference-summary-card.tsx` — the summary card component
- New file: `web/src/lib/chat-preferences-mapper.ts` — `mapExtractedPreferences()` utility
- `web/src/app/(dashboard)/profiles/actions.ts` — add `createProfileWithPreferences(name, preferences)` action

</code_context>

<specifics>
## Specific Ideas

- The mapper should handle the `object_types` array intelligently: `["apartment"]` → APARTMENT, `["house"]` → HOUSE, `["apartment","house"]` or `[]` → ANY — respects explicit user intent
- Essential fields that remain null/empty after mapping render as clearly editable placeholders ("Click to add location", etc.) so the user knows they need to fill them in before confirming
- The `createProfileWithPreferences` action is a clean extension of the existing `createProfile` pattern — same auth validation, same isFirst logic, but inserts with the AI-extracted preferences instead of schema defaults

</specifics>

<deferred>
## Deferred Ideas

- Prompting user mid-summary if essential fields are missing (complex flow) — deferred; inline editing in the card handles this
- Additional "Back to chat" button to continue the conversation — Claude's discretion
- Streaming the summary card fields in one by one — deferred to future milestone

</deferred>
