# Phase 14: Chat UI & Navigation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add "AI-Powered Search" as the first nav item in the top navbar (before Profiles), then build the entire chat page UI: minimal centered layout with guided large text input, "Start Creating Profile" button on first message, inline profile name prompt, scrollable message thread with AI avatar matching the HomeMatch FAB icon, and ephemeral session behavior. No backend integration in this phase — AI responses can be stubbed/mocked to unblock UI development.

</domain>

<decisions>
## Implementation Decisions

### Navigation
- "AI-Powered Search" is the first nav item — nav order: AI-Powered Search | Profiles | Analyses | Settings
- Route path: `/ai-search`
- Icon: `Sparkles` from lucide-react (represents AI/magic)
- Accent: nav item text uses `text-primary` (brand pinkish-red `hsl(342 89% 40%)`) always — not just on active — to visually distinguish it as a key feature; active state additionally gets `bg-primary/10` background
- The existing navItems array in `top-navbar.tsx` is updated with the new entry prepended

### Chat Page Layout
- Pre-conversation state: input is vertically centered on the page (flex col justify-center), full-page empty state
- After first message is sent: input moves to the bottom of the page (standard chat layout), messages thread above
- Max-width: `max-w-3xl mx-auto` for the chat column — centered on wide screens
- Background: default page background (no special treatment)
- Input: `<textarea>` with auto-resize, `min-h-[80px]`, rounded-xl border, full width within the max-w-3xl container

### Input Placeholder
- Placeholder text: "Describe your ideal property — location, budget, rooms, size, lifestyle, nearby amenities like train stations, schools, supermarkets, cafés..."
- Placeholder disappears on focus (standard behavior)

### "Start Creating Profile" Button (first message only)
- Large pill button labeled "Start Creating Profile" with `bg-primary text-primary-foreground` styling
- Sits below the textarea in the pre-conversation centered state
- After first message is sent (button pressed), it is replaced by a standard small send button (arrow icon) for subsequent messages

### Profile Name Prompt
- After pressing "Start Creating Profile": an inline prompt appears in the chat area (not a modal)
- Appears as a system/UI card above the input, asking: "What should we call this profile?" with a text input and a "Start Conversation →" button
- User must enter a non-empty name before conversation begins
- Once name is submitted, the profile name card disappears and the user's original description is sent as the first user message in the thread

### Message Thread & Styling
- Full-width messages (no bubbles) — AI messages have a subtle `bg-muted/50` background, user messages have no background
- AI messages left-aligned with avatar; user messages right-aligned with no avatar
- AI avatar: 32px circular image using the HomeMatch FAB icon (the house/teal circle logo from the extension) — use a static asset or SVG that matches
- Timestamp displayed below each message in `text-xs text-muted-foreground`
- Typing indicator: three animated dots shown while waiting for AI response

### Ephemeral Session
- Conversation state lives entirely in React `useState` — no DB writes
- Page refresh returns to the empty pre-conversation state
- No "resume" affordance

### Claude's Discretion
- Exact animation timing for typing dots
- Whether to show a "New Conversation" button to reset state without refreshing
- Scroll-to-bottom behavior after new messages arrive
- Mobile keyboard handling for the textarea

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `top-navbar.tsx` — `navItems` array + Link rendering; prepend new AI-Powered Search entry
- `cn()` utility from `@/lib/utils` — for conditional class names
- `bg-primary`, `text-primary` CSS variables — brand pinkish-red `hsl(342 89% 40%)` already in globals.css
- Existing dashboard layout (`(dashboard)/layout.tsx`) wraps all pages; new `/ai-search` route just needs a page file in `web/src/app/(dashboard)/ai-search/page.tsx`
- Lucide-react already installed — use `Sparkles`, `Send`, `ArrowRight` icons

### Established Patterns
- Client components use `"use client"` directive; server components fetch from Supabase directly
- Route naming: kebab-case directories under `(dashboard)/`
- Styling: Tailwind utility classes + shadcn/ui components (Button, Input, etc. from `web/src/components/ui/`)
- Theme: `dark:` variants for dark mode; `text-muted-foreground` for secondary text

### Integration Points
- `top-navbar.tsx`: add AI-Powered Search as first item with `text-primary` accent treatment
- New file: `web/src/app/(dashboard)/ai-search/page.tsx` — the chat page (client component)
- FAB icon asset: check `extension/src/assets/` or `extension/public/` for the HomeMatch circular logo to reuse as AI avatar
- The chat page will call a backend `/chat` endpoint (Phase 15) — stub the API call in this phase with a mock response

</code_context>

<specifics>
## Specific Ideas

- "AI-Powered Search" nav item should always show pinkish-red text (not just on active) — the user explicitly called it out as "a key feature" that should visually stand out
- AI avatar must look exactly like the HomeMatch extension FAB button — same circular shape, same logo, same teal/brand colors — user was very specific about this
- The "Start Creating Profile" button is large and prominent on the pre-conversation landing, not a small icon — it sets the tone that this is a deliberate action
- Profile name is collected inline within the chat flow (not a modal) — keeps users in the conversation context

</specifics>

<deferred>
## Deferred Ideas

- Streaming AI responses (real-time typing effect) — deferred to future milestone
- Conversation history persistence — explicitly out of scope per v3.0 decision
- "New Conversation" reset button — Claude's discretion whether to include

</deferred>
