# Phase 14: Chat UI & Navigation - Research

**Researched:** 2026-03-17
**Domain:** Next.js chat UI, React state management, Tailwind CSS layout patterns
**Confidence:** HIGH

## Summary

Phase 14 is a purely frontend phase: add an "AI-Powered Search" nav item and build an ephemeral chat page with a multi-state layout (centered pre-conversation, bottom-anchored post-conversation). All data is in-memory React state -- no backend calls, no DB writes. The tech stack is already established (Next.js 16, React 19, Tailwind v4, shadcn v4, lucide-react).

The main implementation challenge is the two-state layout transition: the input starts vertically centered on the page and shifts to the bottom once conversation begins. This is a standard CSS flex layout pattern. The secondary challenge is the AI avatar -- the FAB uses an inline SVG house icon on a brand-color circle, which needs to be replicated as a 32px avatar in the chat thread. No new dependencies are needed.

**Primary recommendation:** Build the entire chat page as a single `"use client"` component with `useState` managing conversation phase (idle / naming / chatting) and message array. Use native `<textarea>` with Tailwind for auto-resize. Mock AI responses with `setTimeout` to simulate latency and exercise the typing indicator.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "AI-Powered Search" is the first nav item -- nav order: AI-Powered Search | Profiles | Analyses | Settings
- Route path: `/ai-search`
- Icon: `Sparkles` from lucide-react
- Accent: nav item text uses `text-primary` always (not just on active); active state additionally gets `bg-primary/10` background
- Pre-conversation state: input vertically centered on page (flex col justify-center)
- After first message: input moves to bottom, messages thread above
- Max-width: `max-w-3xl mx-auto` for chat column
- Input: `<textarea>` with auto-resize, `min-h-[80px]`, rounded-xl border, full width within max-w-3xl
- Placeholder text: "Describe your ideal property -- location, budget, rooms, size, lifestyle, nearby amenities like train stations, schools, supermarkets, cafes..."
- "Start Creating Profile" button: large pill, `bg-primary text-primary-foreground`, below textarea in pre-conversation state
- Profile name prompt: inline card in chat area (not a modal), asks "What should we call this profile?" with text input and "Start Conversation ->" button
- Full-width messages (no bubbles) -- AI messages have `bg-muted/50` background, user messages no background
- AI messages left-aligned with avatar; user messages right-aligned with no avatar
- AI avatar: 32px circular image matching HomeMatch FAB icon (house icon on brand-color circle)
- Timestamps below each message in `text-xs text-muted-foreground`
- Typing indicator: three animated dots
- Ephemeral session: React `useState` only, no DB writes, refresh returns to empty state

### Claude's Discretion
- Exact animation timing for typing dots
- Whether to show a "New Conversation" button to reset state without refreshing
- Scroll-to-bottom behavior after new messages arrive
- Mobile keyboard handling for the textarea

### Deferred Ideas (OUT OF SCOPE)
- Streaming AI responses (real-time typing effect) -- deferred to future milestone
- Conversation history persistence -- explicitly out of scope
- "New Conversation" reset button -- Claude's discretion whether to include
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | "AI-Powered Search" nav item with pinkish-red accent color | Existing `navItems` array in `top-navbar.tsx` supports prepending; `text-primary` maps to `hsl(342 89% 40%)` |
| NAV-02 | Navigation order: Logo \| AI-Powered Search \| Profiles \| Analysis \| Settings | Simple array prepend in `top-navbar.tsx` |
| CHAT-01 | Minimal centered layout with large text input | Flex column with `justify-center` for pre-conversation, `justify-end` for active conversation |
| CHAT-02 | Input placeholder guides user on what to describe | Native textarea `placeholder` attribute |
| CHAT-03 | Large "Start Creating Profile" button shown on first message | Conditional render based on conversation phase state |
| CHAT-04 | Profile name prompt before conversation begins | Inline card component with text input, rendered between messages area and input |
| CHAT-05 | After naming, initial description sent as first message | State machine: idle -> naming -> chatting; on chatting entry, push user message to array |
| CHAT-06 | AI responses in scrollable chat thread with visual distinction | `overflow-y-auto` container, conditional `bg-muted/50` for AI messages |
| CHAT-07 | User can send follow-up messages | Standard send handler appending to messages array + mock AI response |
| CHAT-08 | Ephemeral conversation -- not persisted | Pure `useState`, no `useEffect` with DB calls |
| CHAT-09 | AI avatar matching HomeMatch extension FAB icon | Inline SVG house icon on circular `bg-primary` div, matching FAB.tsx pattern |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, file-based routing | Already project framework |
| React | 19.2.3 | UI rendering, useState/useRef/useEffect | Already installed |
| Tailwind CSS | v4 | Utility-first styling | Already project styling system |
| shadcn/ui | v4 | Button, Input, Avatar components | Already installed with base-ui primitives |
| lucide-react | 0.577.0 | Icons (Sparkles, Send, ArrowRight) | Already installed |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Variant-based component styling | Already used by Button component |
| cn() utility | - | Conditional class merging | Already in `@/lib/utils` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native textarea | shadcn Textarea | shadcn v4 does not include a Textarea component in this project -- use native `<textarea>` with Tailwind |
| Custom scroll management | react-scroll-to-bottom | Overkill for this use case -- `scrollIntoView` on a ref is sufficient |

**Installation:** No new packages needed. Everything is already installed.

## Architecture Patterns

### Recommended Project Structure
```
web/src/
├── app/(dashboard)/
│   └── ai-search/
│       └── page.tsx           # Chat page (client component)
├── components/
│   ├── chat/
│   │   ├── chat-page.tsx      # Main chat orchestrator component
│   │   ├── message-thread.tsx # Scrollable message list
│   │   ├── message-item.tsx   # Single message (user or AI)
│   │   ├── chat-input.tsx     # Textarea + send button
│   │   ├── profile-name-prompt.tsx  # Inline name card
│   │   ├── typing-indicator.tsx     # Animated dots
│   │   └── ai-avatar.tsx     # 32px circular house icon
│   └── top-navbar.tsx         # Updated with AI-Powered Search
```

### Pattern 1: Conversation State Machine
**What:** Manage chat page through three phases: `idle` (centered input), `naming` (profile name prompt), `chatting` (active thread)
**When to use:** Always -- this is the core state model
**Example:**
```typescript
type ConversationPhase = 'idle' | 'naming' | 'chatting';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const [phase, setPhase] = useState<ConversationPhase>('idle');
const [messages, setMessages] = useState<Message[]>([]);
const [profileName, setProfileName] = useState('');
const [pendingDescription, setPendingDescription] = useState('');
const [isTyping, setIsTyping] = useState(false);
```

### Pattern 2: Layout Transition (Centered -> Bottom-anchored)
**What:** Use flex layout that switches based on conversation phase
**When to use:** The main page container
**Example:**
```typescript
<div className={cn(
  "flex flex-col h-full max-w-3xl mx-auto",
  phase === 'idle' ? "justify-center" : "justify-end"
)}>
  {phase === 'chatting' && <MessageThread messages={messages} />}
  {phase === 'naming' && <ProfileNamePrompt />}
  <ChatInput phase={phase} />
</div>
```

### Pattern 3: Auto-resize Textarea
**What:** Native textarea that grows with content
**When to use:** The chat input
**Example:**
```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null);

const handleInput = () => {
  const el = textareaRef.current;
  if (el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
};

<textarea
  ref={textareaRef}
  onInput={handleInput}
  className="min-h-[80px] max-h-[200px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  placeholder="Describe your ideal property..."
/>
```

### Pattern 4: Mock AI Response
**What:** Simulate AI responses with setTimeout for UI development
**When to use:** Phase 14 only -- replaced by real backend in Phase 15
**Example:**
```typescript
const mockAIResponse = (userMessage: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("That sounds great! Could you tell me more about your budget range and preferred neighborhood?");
    }, 1500);
  });
};
```

### Pattern 5: Scroll-to-Bottom on New Messages
**What:** Auto-scroll to latest message when new messages arrive
**When to use:** After each message is appended
**Example:**
```typescript
const bottomRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isTyping]);

// In JSX, at the end of message thread:
<div ref={bottomRef} />
```

### Anti-Patterns to Avoid
- **Don't use useReducer for this:** The state is simple enough for multiple `useState` calls. A reducer adds indirection without benefit for 3-4 state variables.
- **Don't create a separate route group:** The `/ai-search` page lives inside the existing `(dashboard)` group to inherit the header/navbar layout.
- **Don't use CSS animations via keyframes in JS:** Use Tailwind's `animate-` utilities or inline `@keyframes` in globals.css for the typing dots.
- **Don't fetch anything server-side:** The page.tsx should be a thin wrapper that renders a client component. No server data needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional classes | String concatenation | `cn()` from `@/lib/utils` | Already standardized across codebase |
| Button styling | Custom button | shadcn `<Button>` with variant props | Consistent with rest of app |
| Avatar rendering | Custom div | shadcn `<Avatar>` + `<AvatarFallback>` with inline SVG | Already available, handles sizing |
| Icons | Custom SVGs | lucide-react icons (`Sparkles`, `Send`, `ArrowRight`) | Already installed, consistent sizing |
| Unique IDs for messages | Counter state | `crypto.randomUUID()` | Built into browser, no import needed |

**Key insight:** This phase requires zero new dependencies. The existing stack (Tailwind + shadcn + lucide) covers every UI need.

## Common Pitfalls

### Pitfall 1: Textarea Height Not Resetting After Send
**What goes wrong:** After sending a message and clearing the textarea value, the height stays at the expanded size.
**Why it happens:** Setting `value=""` doesn't trigger the `onInput` event that recalculates height.
**How to avoid:** After clearing value, explicitly reset `el.style.height = 'auto'` followed by `el.style.height = `${el.scrollHeight}px`` in the send handler.
**Warning signs:** Textarea stays tall after sending a message.

### Pitfall 2: Scroll Position Jumps During Layout Transition
**What goes wrong:** When transitioning from centered (idle) to bottom-anchored (chatting) layout, the page jumps visually.
**Why it happens:** Flex justify-center to justify-end is an abrupt layout shift.
**How to avoid:** The transition happens during the naming phase, so by the time chatting starts, the layout is already at the bottom. Ensure naming phase already uses bottom-anchored layout.
**Warning signs:** Visual jank when first message is sent.

### Pitfall 3: Mobile Keyboard Pushing Layout Up
**What goes wrong:** On mobile, focusing the textarea causes the virtual keyboard to push the entire layout up, hiding messages.
**Why it happens:** Default mobile browser behavior with `position: fixed` or flex layouts.
**How to avoid:** Use `dvh` (dynamic viewport height) units instead of `vh` for the container height: `h-[calc(100dvh-3.5rem)]` (subtracting the 56px header). This ensures the layout adjusts to the visible viewport when the keyboard opens.
**Warning signs:** Messages scroll out of view when typing on mobile.

### Pitfall 4: Enter Key Submitting vs Newline
**What goes wrong:** Pressing Enter submits the message instead of creating a newline, or vice versa.
**Why it happens:** Textarea default is newline on Enter.
**How to avoid:** Use `Enter` to send (matching chat UX convention), `Shift+Enter` for newline. Handle in `onKeyDown`.
**Warning signs:** Users can't create multi-line messages, or messages send unexpectedly.

### Pitfall 5: Nav Item Special Styling Breaking Active State Logic
**What goes wrong:** The AI-Powered Search nav item has `text-primary` always, but existing nav logic applies different active/inactive text colors.
**Why it happens:** The current `navItems.map()` applies `text-muted-foreground` when inactive and `text-accent-foreground` when active.
**How to avoid:** Add an optional `alwaysAccent` flag to the nav item or handle the AI-Powered Search item with a conditional className override within the map.
**Warning signs:** AI-Powered Search loses its red text when not active, or other nav items get red text.

## Code Examples

### Nav Item Update (top-navbar.tsx)
```typescript
// Source: existing top-navbar.tsx pattern
import { User, BarChart3, Settings, Sparkles } from "lucide-react"

const navItems = [
  { title: "AI-Powered Search", url: "/ai-search", icon: Sparkles, accent: true },
  { title: "Profiles", url: "/profiles", icon: User },
  { title: "Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

// In the map render:
<Link
  key={item.title}
  href={item.url}
  className={cn(
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    item.accent
      ? cn("text-primary", isActive && "bg-primary/10")
      : isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
  )}
>
```

### AI Avatar Component
```typescript
// Source: extension FAB.tsx house SVG + brand color
function AIAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
      <svg className="size-4 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    </div>
  );
}
```

### Typing Indicator
```typescript
// Three animated dots
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}
```

### Page File (thin server wrapper)
```typescript
// web/src/app/(dashboard)/ai-search/page.tsx
import { ChatPage } from "@/components/chat/chat-page"

export default function AISearchPage() {
  return <ChatPage />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shadcn v0 with Radix primitives | shadcn v4 with base-ui primitives | 2025 | Button, Avatar, Input use `@base-ui/react` not `@radix-ui` |
| Tailwind v3 with config file | Tailwind v4 with CSS-first config | 2025 | `@theme inline` in globals.css, no tailwind.config.js |
| `100vh` for full-height layouts | `100dvh` for mobile-aware layouts | Widely adopted | Prevents mobile keyboard from breaking layout |

**Deprecated/outdated:**
- `@radix-ui/react-avatar`: This project uses `@base-ui/react/avatar` via shadcn v4. Don't import from Radix directly.

## Open Questions

1. **FAB icon as static asset vs inline SVG?**
   - What we know: The FAB uses an inline SVG house icon (`<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />`). The extension `public/` has PNG icons but they are the brand-colored house on transparent background.
   - What's unclear: Whether to use the PNG from extension/public or recreate as inline SVG in the web app.
   - Recommendation: Use inline SVG matching the FAB pattern. It's 2 lines of code, scales perfectly, and avoids cross-package asset dependencies. The `extension/public/icon-48.png` is brand-colored (not white-on-primary like the FAB renders it), so inline SVG on a `bg-primary` circle is the correct match.

2. **"New Conversation" reset button?**
   - What we know: User marked this as Claude's discretion.
   - Recommendation: Include it. A small "New Conversation" button in the header area once a conversation is active is low-effort and prevents users from having to refresh. Can be a ghost button with a `RotateCcw` or `Plus` icon.

3. **Scroll behavior after new messages?**
   - What we know: User marked this as Claude's discretion.
   - Recommendation: Always auto-scroll to bottom when a new message is added (user or AI). Use `scrollIntoView({ behavior: 'smooth' })`. Don't implement "scroll-aware" logic (only scroll if near bottom) -- this is a simple chat, not a Slack clone.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | AI-Powered Search nav item renders with text-primary class | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -t "AI-Powered Search" --reporter=verbose` | No -- Wave 0 |
| NAV-02 | Nav items render in correct order | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -t "nav order" --reporter=verbose` | No -- Wave 0 |
| CHAT-01 | Chat page renders centered layout in idle state | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "centered layout" --reporter=verbose` | No -- Wave 0 |
| CHAT-02 | Textarea placeholder contains guidance text | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "placeholder" --reporter=verbose` | No -- Wave 0 |
| CHAT-03 | "Start Creating Profile" button visible in idle state, hidden after | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "Start Creating Profile" --reporter=verbose` | No -- Wave 0 |
| CHAT-04 | Profile name prompt appears after pressing Start | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "profile name" --reporter=verbose` | No -- Wave 0 |
| CHAT-05 | Initial description sent as first message after naming | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "first message" --reporter=verbose` | No -- Wave 0 |
| CHAT-06 | Messages render with AI/user visual distinction | unit | `cd web && npx vitest run src/__tests__/message-item.test.tsx -t "visual distinction" --reporter=verbose` | No -- Wave 0 |
| CHAT-07 | Follow-up messages can be sent | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "follow-up" --reporter=verbose` | No -- Wave 0 |
| CHAT-08 | State is in-memory only (no DB calls) | manual-only | N/A -- verify no Supabase imports in chat components | N/A |
| CHAT-09 | AI avatar renders house icon in circular primary-colored container | unit | `cd web && npx vitest run src/__tests__/ai-avatar.test.tsx --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd web && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/top-navbar.test.tsx` -- update existing file with NAV-01, NAV-02 tests (file exists but tests TopNavbar indirectly via navbar.test.tsx which tests NavUser/ProfileSwitcher)
- [ ] `web/src/__tests__/chat-page.test.tsx` -- covers CHAT-01 through CHAT-05, CHAT-07
- [ ] `web/src/__tests__/message-item.test.tsx` -- covers CHAT-06
- [ ] `web/src/__tests__/ai-avatar.test.tsx` -- covers CHAT-09

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `top-navbar.tsx`, `layout.tsx`, `globals.css`, `Fab.tsx`, `avatar.tsx`, `button.tsx`, `input.tsx`
- Codebase inspection: `package.json` for exact dependency versions
- Codebase inspection: `vitest.config.mts` and existing test files for test patterns
- Codebase inspection: `extension/public/icon-48.png` -- confirmed house icon asset

### Secondary (MEDIUM confidence)
- Tailwind v4 `dvh` unit support -- standard CSS feature, supported in all modern browsers
- `crypto.randomUUID()` -- available in all modern browsers and Node 19+

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, versions verified from package.json
- Architecture: HIGH -- follows existing codebase patterns (dashboard routes, client components, Tailwind styling)
- Pitfalls: HIGH -- based on well-known React/CSS behaviors and direct codebase analysis

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no fast-moving dependencies)
