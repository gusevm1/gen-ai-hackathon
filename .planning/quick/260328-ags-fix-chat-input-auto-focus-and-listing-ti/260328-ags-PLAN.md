---
phase: quick
plan: 260328-ags
type: execute
wave: 1
depends_on: []
files_modified:
  - web/src/components/chat/chat-input.tsx
  - web/src/components/chat/chat-page.tsx
  - web/src/app/(dashboard)/analyses/page.tsx
  - backend/app/routers/scoring.py
autonomous: true
must_haves:
  truths:
    - "After AI response finishes in chat, the text input is automatically focused and ready to type"
    - "Analyses page shows descriptive listing titles instead of raw listing IDs"
    - "Analyses page shows address as secondary line under the title"
    - "Listings without title data gracefully fall back to 'Listing {id}'"
  artifacts:
    - path: "web/src/components/chat/chat-input.tsx"
      provides: "Auto-focus capability via forwarded ref or isLoading prop"
    - path: "web/src/app/(dashboard)/analyses/page.tsx"
      provides: "Two-line listing title display with fallback chain"
    - path: "backend/app/routers/scoring.py"
      provides: "Address metadata injected into breakdown JSONB"
  key_links:
    - from: "web/src/components/chat/chat-page.tsx"
      to: "web/src/components/chat/chat-input.tsx"
      via: "ref forwarding or isLoading prop for auto-focus trigger"
    - from: "backend/app/routers/scoring.py"
      to: "analyses.breakdown JSONB"
      via: "listing_address, listing_rooms, listing_object_type fields"
    - from: "web/src/app/(dashboard)/analyses/page.tsx"
      to: "analyses.breakdown JSONB"
      via: "extracting listing_title, listing_address from breakdown"
---

<objective>
Fix two UI issues in the Next.js web app: (1) auto-focus chat input after each AI response, and (2) show descriptive listing titles + addresses on the Analyses page instead of raw listing IDs.

Purpose: Improve UX — chat flow feels seamless, analyses page is scannable at a glance.
Output: Updated chat-input, chat-page, analyses page, and backend scoring router.
</objective>

<execution_context>
@/Users/prakhar/.claude/get-shit-done/workflows/execute-plan.md
@/Users/prakhar/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@web/src/components/chat/chat-input.tsx
@web/src/components/chat/chat-page.tsx
@web/src/app/(dashboard)/analyses/page.tsx
@backend/app/routers/scoring.py

<interfaces>
<!-- ChatInput current interface -->
From web/src/components/chat/chat-input.tsx:
```typescript
interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}
// Has internal textareaRef = useRef<HTMLTextAreaElement>(null)
```

<!-- ChatPage passes isTyping to ChatInput as disabled -->
From web/src/components/chat/chat-page.tsx:
```typescript
<ChatInput
  onSend={handleSendMessage}
  disabled={isTyping || phase === 'summarizing'}
/>
// isTyping is set false in finally{} block of callChatApi and fetchGreeting
```

<!-- Analyses page breakdown typing -->
From web/src/app/(dashboard)/analyses/page.tsx:
```typescript
const breakdown = analysis.breakdown as { match_tier?: string } | null
// Currently only extracts match_tier from breakdown
// breakdown JSONB also contains: listing_title (string|null)
// Backend scoring.py line 155-157 injects listing_title from listing fields
```

<!-- Backend scoring router — what's injected into score_data before save -->
From backend/app/routers/scoring.py:
```python
score_data["listing_title"] = (
    listing.description_title or listing.public_title or listing.short_title or None
)
# listing also has: street, zipcode, city, number_of_rooms, object_type, object_category
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auto-focus chat input after AI response</name>
  <files>web/src/components/chat/chat-input.tsx, web/src/components/chat/chat-page.tsx</files>
  <action>
In chat-input.tsx:
- Import `forwardRef` and `useImperativeHandle` from React.
- Export a `ChatInputHandle` interface with a `focus(): void` method.
- Wrap the component with `forwardRef<ChatInputHandle, ChatInputProps>`.
- Use `useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }))` to expose the focus method through the forwarded ref.

In chat-page.tsx:
- Import `ChatInputHandle` from `./chat-input`.
- Create `const chatInputRef = useRef<ChatInputHandle>(null)`.
- Add a new `useEffect` that triggers on `[isTyping]`: when `isTyping` transitions to `false`, call `chatInputRef.current?.focus()`. Use a short `setTimeout(() => ..., 50)` to ensure the DOM has updated and the textarea `disabled` prop has cleared before focusing.
- Pass `ref={chatInputRef}` to the `<ChatInput>` component.

Do NOT change any other behavior — just add the auto-focus wiring.
  </action>
  <verify>
    <automated>cd /Users/prakhar/Desktop/GenAI_hackathon/gen-ai-hackathon/web && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>After every AI response completes (isTyping goes false), the chat textarea is automatically focused so the user can immediately start typing without clicking.</done>
</task>

<task type="auto">
  <name>Task 2: Inject listing address metadata into breakdown and display rich titles on Analyses page</name>
  <files>backend/app/routers/scoring.py, web/src/app/(dashboard)/analyses/page.tsx</files>
  <action>
**Backend change** in backend/app/routers/scoring.py:

After line 157 (where `listing_title` is injected into `score_data`), also inject:
```python
score_data["listing_address"] = " ".join(filter(None, [
    listing.street,
    str(listing.zipcode) if listing.zipcode else None,
    listing.city,
]))  or None
score_data["listing_rooms"] = listing.number_of_rooms
score_data["listing_object_type"] = listing.object_type
```

This ensures newly-scored listings store address info in the breakdown JSONB. Existing analyses will still work via the fallback chain below.

**Frontend change** in web/src/app/(dashboard)/analyses/page.tsx:

1. Update the breakdown type cast to include more fields:
```typescript
const breakdown = analysis.breakdown as {
  match_tier?: string
  listing_title?: string
  listing_address?: string
  listing_rooms?: string
  listing_object_type?: string
} | null
```

2. Build a two-line title with this fallback chain:
```typescript
// Primary line: descriptive title
// Prefer listing_title from breakdown. If missing, construct from rooms + type + city.
// Final fallback: address, then "Listing {id}"
const rawTitle = breakdown?.listing_title
const constructedTitle = breakdown?.listing_rooms && breakdown?.listing_object_type && breakdown?.listing_address
  ? `${breakdown.listing_rooms} rooms - ${breakdown.listing_object_type.replace(/_/g, ' ').toLowerCase()} - ${breakdown.listing_address.split(' ').pop()}`
  : null
const primaryTitle = rawTitle || constructedTitle || breakdown?.listing_address || `${t(lang, 'analyses_listing')} ${analysis.listing_id}`

// Secondary line: full address (only show if we have it AND it differs from primary)
const secondaryAddress = breakdown?.listing_address && breakdown.listing_address !== primaryTitle
  ? breakdown.listing_address
  : null
```

3. Replace the current single-line listing ID display (the `<span>` on lines 113-115) with:
```tsx
<div className="flex-1 min-w-0 mr-2">
  <span className="text-sm font-medium text-foreground block truncate">
    {primaryTitle}
  </span>
  {secondaryAddress && (
    <span className="text-xs text-muted-foreground block truncate">
      {secondaryAddress}
    </span>
  )}
</div>
```

4. Remove the `items-center` from the parent flex div (line 112's `flex items-center justify-between`) and replace with `items-start` so the badge aligns to the top when the title is two lines.

This handles all cases:
- New listings: shows title + address
- Existing listings with listing_title in breakdown: shows title, no address (since it was not stored before)
- Old listings with no title data: falls back to "Listing {id}"
  </action>
  <verify>
    <automated>cd /Users/prakhar/Desktop/GenAI_hackathon/gen-ai-hackathon/web && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Analyses page shows descriptive listing titles (bold, primary) with full addresses underneath (muted, smaller) when available, falling back gracefully to "Listing {id}" for old data.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `cd web && npx tsc --noEmit`
2. Backend Python syntax valid: `cd backend && python -c "import app.routers.scoring"`
3. Manual: Open chat, send a message, confirm input auto-focuses after response
4. Manual: Open /analyses page, confirm listing cards show titles instead of raw IDs
</verification>

<success_criteria>
- Chat input automatically receives focus after every AI response (no click needed)
- Analyses page cards show human-readable listing titles as primary line
- Analyses page cards show address as secondary muted line when available
- Old analyses without title/address data gracefully show "Listing {id}" fallback
- No TypeScript or Python errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260328-ags-fix-chat-input-auto-focus-and-listing-ti/260328-ags-SUMMARY.md`
</output>
