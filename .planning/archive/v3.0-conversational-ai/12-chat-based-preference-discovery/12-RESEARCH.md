# Phase 12: Chat-Based Preference Discovery - Research

**Researched:** 2026-03-15
**Domain:** AI chat UI (Vercel AI SDK + Anthropic Claude + Next.js App Router + structured extraction)
**Confidence:** HIGH

## Summary

Phase 12 adds a conversational AI interface to the profile preferences page, allowing users to discover and define their property preferences through a multi-turn chat instead of (or in addition to) manual form entry. The chat extracts structured `dynamicFields` (name, value, importance) from the conversation, presents them for user review/editing, and merges them into the existing profile via the existing `saveProfilePreferences` server action.

The standard approach for building AI chat in Next.js is the Vercel AI SDK (`ai` + `@ai-sdk/react` + `@ai-sdk/anthropic`). It provides `useChat` on the client for streaming message state and `streamText` on the server for token-by-token streaming. After the conversation, a separate `generateText` + `Output.object()` call extracts structured dynamicFields from the full conversation history using a Zod schema. The web app currently has no ANTHROPIC_API_KEY -- this must be added as a server-side environment variable in both `.env.local` (development) and Vercel dashboard (production). The existing backend (EC2) is not involved; chat runs entirely within the Next.js server via an API route handler at `app/api/chat/route.ts`.

**Primary recommendation:** Use Vercel AI SDK 6 with `@ai-sdk/anthropic` provider. Build a `ChatPanel` client component on the profile edit page with `useChat` for streaming. Create a Next.js route handler (`/api/chat`) for the conversation stream and a server action for structured extraction. Use `sessionStorage` keyed by profileId for conversation persistence across navigation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can open a chat interface from their profile to discover preferences | ChatPanel component on profile edit page, toggled via button; uses existing page layout |
| CHAT-02 | AI chat engages in multi-turn conversation to understand what user is looking for | `useChat` + `streamText` with system prompt tailored to Swiss property preference discovery; multi-turn by default |
| CHAT-03 | Chat extracts structured preference fields with priorities from the conversation | `generateText` + `Output.object()` with dynamicField Zod schema after conversation; separate extraction step |
| CHAT-04 | User can view, edit, add, and delete AI-generated preference fields before saving | Reuse existing `DynamicFieldsSection` component; extracted fields shown in review state before save |
| CHAT-05 | Chat-generated fields saved via JSONB merge preserving standard fields | Merge into existing form state (react-hook-form `setValue`), save via existing `saveProfilePreferences` action |
| CHAT-06 | Chat conversation persists in sessionStorage across page navigation | `sessionStorage.getItem/setItem` keyed by `chat-${profileId}`; restore messages on mount |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | ^6.0 | AI SDK core: `streamText`, `generateText`, `Output.object()`, `convertToModelMessages` | Official Vercel toolkit for Next.js AI features; streaming, structured output, provider abstraction |
| @ai-sdk/react | ^3.0 | `useChat` hook for client-side chat state | Official React integration; manages messages, status, streaming automatically |
| @ai-sdk/anthropic | ^3.0 | Anthropic Claude provider for AI SDK | Direct Claude API access; uses `ANTHROPIC_API_KEY` env var automatically |
| zod | 4.3.6 | Schema definition for structured extraction | Already in use; AI SDK 6 supports Zod 4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.71.2 | Form state for review/edit step | Already in use; merge extracted fields into existing form |
| lucide-react | 0.577.0 | Icons for chat UI (MessageSquare, Send, etc.) | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AI SDK `useChat` | Raw `fetch` + `ReadableStream` | useChat handles reconnection, message state, error recovery; raw fetch requires manual stream parsing |
| Direct Anthropic provider | Vercel AI Gateway | Gateway adds abstraction but requires separate API key config; direct provider is simpler for single-provider setup |
| Next.js API route for chat | Supabase Edge Function | API route keeps chat logic in same codebase; edge function would add deployment complexity for no benefit |
| sessionStorage | Supabase persistence | sessionStorage is explicitly specified in requirements (CHAT-06); Supabase persistence is deferred to CHAT-07 (v2.1+) |

**Installation:**
```bash
cd web && pnpm add ai @ai-sdk/react @ai-sdk/anthropic
```

## Architecture Patterns

### Recommended Project Structure
```
web/src/
  app/
    api/
      chat/
        route.ts              # POST handler: streamText with Claude
    (dashboard)/
      profiles/
        [profileId]/
          page.tsx             # Add ChatPanel alongside PreferencesForm
          actions.ts           # Add extractPreferences server action (new)
  components/
    chat/
      chat-panel.tsx           # Main chat UI container (toggle open/close)
      chat-messages.tsx        # Message list rendering
      chat-input.tsx           # Input bar with send button
      extracted-fields-review.tsx  # Review/edit extracted dynamicFields before save
  lib/
    chat/
      system-prompt.ts         # System prompt for preference discovery
      extraction-schema.ts     # Zod schema for structured extraction
```

### Pattern 1: Streaming Chat Route Handler
**What:** Next.js App Router API route that streams Claude responses via AI SDK.
**When to use:** For the `/api/chat` endpoint consumed by `useChat`.

```typescript
// web/src/app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { CHAT_SYSTEM_PROMPT } from '@/lib/chat/system-prompt';

export const maxDuration = 60; // Vercel Fluid Compute

export async function POST(req: Request) {
  // Auth check: ensure user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

### Pattern 2: Client-Side Chat with useChat
**What:** React component using `useChat` for streaming chat UI.
**When to use:** In the ChatPanel component on the profile edit page.

```typescript
// web/src/components/chat/chat-panel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';

interface ChatPanelProps {
  profileId: string;
  onExtracted: (fields: DynamicField[]) => void;
}

export function ChatPanel({ profileId, onExtracted }: ChatPanelProps) {
  const storageKey = `chat-${profileId}`;

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');

  // Restore from sessionStorage on mount (CHAT-06)
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, [storageKey, setMessages]);

  // Persist to sessionStorage on message change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  return (
    // Chat UI rendering...
  );
}
```

### Pattern 3: Structured Extraction via Server Action
**What:** After conversation, extract structured dynamicFields using `generateText` + `Output.object()`.
**When to use:** When user clicks "Extract Preferences" button after chatting.

```typescript
// Server action for extraction
'use server';

import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const extractionSchema = z.object({
  fields: z.array(z.object({
    name: z.string().describe('Short name for the preference criterion'),
    value: z.string().describe('Specific details or requirements'),
    importance: z.enum(['critical', 'high', 'medium', 'low'])
      .describe('How important this is: critical = must-have, low = nice-to-have'),
  })),
});

export async function extractPreferences(conversationText: string) {
  const { output } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    output: Output.object({ schema: extractionSchema }),
    prompt: `Extract structured property preference fields from this conversation.
For each preference mentioned, determine:
- name: a short descriptive label (e.g., "Near public transport", "Quiet neighborhood")
- value: specific details if mentioned (e.g., "within 500m of train station", "max 2 floors")
- importance: how important the user indicated this is

Conversation:
${conversationText}`,
  });

  return output?.fields ?? [];
}
```

### Pattern 4: JSONB Merge via Form State
**What:** Merge extracted dynamicFields into existing form state without overwriting standard fields.
**When to use:** When user accepts extracted fields and saves.

```typescript
// In the profile page component:
function handleAcceptFields(extractedFields: DynamicField[]) {
  // Get current dynamic fields from form
  const current = form.getValues('dynamicFields') || [];
  // Merge: append extracted fields to existing ones
  form.setValue('dynamicFields', [...current, ...extractedFields], {
    shouldDirty: true,
  });
  // Standard fields (location, budget, rooms) remain untouched
  // Save via existing form submit handler
}
```

### Pattern 5: sessionStorage Persistence (CHAT-06)
**What:** Persist chat messages in sessionStorage keyed by profileId.
**When to use:** On every message update and on component mount.

```typescript
const STORAGE_KEY = (profileId: string) => `chat-${profileId}`;

// Save messages
useEffect(() => {
  if (messages.length > 0) {
    sessionStorage.setItem(STORAGE_KEY(profileId), JSON.stringify(messages));
  }
}, [messages, profileId]);

// Restore messages on mount
useEffect(() => {
  const saved = sessionStorage.getItem(STORAGE_KEY(profileId));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setMessages(parsed);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY(profileId));
    }
  }
}, [profileId]);
```

### Anti-Patterns to Avoid
- **Calling Claude from the client:** Never expose `ANTHROPIC_API_KEY` to the browser. All LLM calls go through the Next.js API route (server-side only).
- **Using the EC2 backend for chat:** The backend is for listing scoring with Flatfox data. Chat is a web-only feature with no backend involvement.
- **Persisting chat in Supabase:** Explicitly out of scope (CHAT-07 is deferred to v2.1+). Use sessionStorage only.
- **Replacing existing form fields with chat output:** Chat generates `dynamicFields` only. Standard fields (location, budget, rooms) are untouched. Merge, don't replace.
- **Streaming structured extraction:** Use non-streaming `generateText` + `Output.object()` for extraction. Streaming partial JSON objects adds complexity with no UX benefit for a one-shot extraction.
- **Using `generateObject` (deprecated):** AI SDK 6 deprecates `generateObject`. Use `generateText` with `Output.object()` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat streaming | Manual fetch + ReadableStream + SSE parsing | `useChat` + `streamText` | Handles reconnection, message ordering, error states, abort |
| Message state management | Custom useState + reducer for messages | `useChat` hook | Manages messages array, optimistic updates, status tracking |
| Structured data extraction | Regex parsing or manual JSON extraction from chat | `generateText` + `Output.object()` with Zod | Schema-validated, type-safe, handles edge cases |
| Provider abstraction | Direct Anthropic SDK HTTP calls | `@ai-sdk/anthropic` provider | Unified API, automatic token counting, proper error handling |
| Session persistence | Custom IndexedDB or cookie-based storage | `sessionStorage` API | Requirements specify sessionStorage (CHAT-06); simpler than alternatives |

**Key insight:** The Vercel AI SDK eliminates most of the complexity of building a chat interface. The `useChat` + `streamText` combination handles streaming, message state, abort, and error recovery in under 50 lines of code total.

## Common Pitfalls

### Pitfall 1: Missing ANTHROPIC_API_KEY in Vercel
**What goes wrong:** Chat works in development but fails in production with 500 errors.
**Why it happens:** The `ANTHROPIC_API_KEY` env var exists in `.env.local` but was never added to the Vercel dashboard.
**How to avoid:** Add `ANTHROPIC_API_KEY` to Vercel project settings (Settings > Environment Variables) for Production + Preview environments. Do NOT prefix with `NEXT_PUBLIC_` -- it must stay server-side only.
**Warning signs:** 500 errors on `/api/chat` in production; "missing API key" in function logs.

### Pitfall 2: Route Handler Auth Bypass
**What goes wrong:** Unauthenticated users can call `/api/chat` directly and consume Claude API credits.
**Why it happens:** Route handlers don't automatically inherit the dashboard layout's auth check.
**How to avoid:** Add explicit auth check in the route handler: create Supabase client, call `getUser()`, return 401 if no user.
**Warning signs:** Unexpected Claude API charges; requests from non-authenticated contexts.

### Pitfall 3: sessionStorage Not Available in SSR
**What goes wrong:** `sessionStorage is not defined` error during server-side rendering.
**Why it happens:** The profile page is a server component that renders `ChatPanel` (client component). If sessionStorage access isn't guarded behind `useEffect` or a `typeof window` check, it fails on the server.
**How to avoid:** Only access sessionStorage inside `useEffect` hooks (which only run on the client). Never access it at module scope or during render.
**Warning signs:** Hydration errors or "sessionStorage is not defined" in server logs.

### Pitfall 4: Extraction Fails on Short Conversations
**What goes wrong:** User sends 1-2 messages, clicks "Extract," and gets empty or nonsensical fields.
**Why it happens:** Too little conversation context for the LLM to extract meaningful preferences.
**How to avoid:** Require a minimum of 2-3 assistant responses before enabling the "Extract Preferences" button. Show a helpful message like "Keep chatting to discover more preferences before extracting."
**Warning signs:** Users report empty extraction results; dynamicFields array is consistently empty.

### Pitfall 5: Duplicate Fields on Re-extraction
**What goes wrong:** User extracts fields, continues chatting, extracts again, and gets duplicates.
**Why it happens:** Extraction from the full conversation includes previously extracted preferences.
**How to avoid:** Two options: (a) Replace previous extracted fields entirely on re-extraction (simpler), or (b) deduplicate by name before merging. Recommend option (a) for simplicity -- the extraction includes all conversation context, so re-extraction produces a superset.
**Warning signs:** Users see "Near public transport" listed 3 times after multiple extraction cycles.

### Pitfall 6: Vercel Function Timeout on Long Conversations
**What goes wrong:** Streaming response cuts off mid-sentence after 10 seconds.
**Why it happens:** Default Vercel function timeout is 10 seconds on the free plan.
**How to avoid:** Set `export const maxDuration = 60` in the route handler. Vercel Fluid Compute allows up to 60 seconds on the free plan for streaming responses. Claude Haiku responses typically complete in 5-15 seconds.
**Warning signs:** Responses end abruptly; "FUNCTION_INVOCATION_TIMEOUT" in Vercel logs.

### Pitfall 7: Zod 4 + AI SDK Schema Conversion
**What goes wrong:** `Output.object()` fails with schema conversion errors when using Zod 4 schemas.
**Why it happens:** AI SDK 6 supports Zod 4 but some edge cases with complex schemas may surface. The `zodSchema()` helper provides explicit conversion control.
**How to avoid:** Use simple, flat Zod schemas for extraction. If issues arise, wrap with `zodSchema()` from the `ai` package. Test extraction in development before deploying.
**Warning signs:** "Invalid schema" or JSON schema conversion errors at runtime.

## Code Examples

### System Prompt for Preference Discovery Chat
```typescript
// web/src/lib/chat/system-prompt.ts
export const CHAT_SYSTEM_PROMPT = `You are a friendly Swiss property search assistant helping a user discover what they're looking for in a home.

Your goal: Through natural conversation, understand the user's property preferences beyond the basics (budget, rooms, location -- those are handled separately). Focus on lifestyle, must-haves, deal-breakers, and nice-to-haves.

CONVERSATION STYLE:
- Be warm, conversational, and curious
- Ask follow-up questions to clarify vague preferences
- Suggest common preferences the user might not have thought of
- Group related topics (e.g., neighborhood feel, commute, outdoor space)
- After 3-4 exchanges, summarize what you've learned and ask if anything is missing

TOPICS TO EXPLORE (if not yet covered):
- Neighborhood character (quiet, lively, family-friendly, urban)
- Commute and transport access
- Natural light and orientation
- Outdoor space (balcony, garden, terrace)
- Storage and practical spaces
- Noise sensitivity and floor preference
- Building condition and renovation state
- Pet-friendliness
- View preferences
- Community and building amenities

IMPORTANT:
- Do NOT ask about budget, number of rooms, or location -- those are set in the standard form
- Respond in the same language the user writes in (German, French, Italian, or English)
- Keep responses concise (2-4 sentences per turn plus a question)
- When the user seems satisfied, tell them they can click "Extract Preferences" to save what you discussed`;
```

### Extraction Schema
```typescript
// web/src/lib/chat/extraction-schema.ts
import { z } from 'zod';

export const extractedFieldSchema = z.object({
  name: z.string().describe('Short descriptive label for the criterion, e.g. "Near public transport"'),
  value: z.string().describe('Specific details or requirements, e.g. "within 10 min walk of S-Bahn"'),
  importance: z.enum(['critical', 'high', 'medium', 'low'])
    .describe('How important: critical = absolute must-have, high = strongly preferred, medium = nice to have, low = minor preference'),
});

export const extractionResultSchema = z.object({
  fields: z.array(extractedFieldSchema)
    .describe('All property preference criteria discovered in the conversation'),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
```

### Chat Route Handler (Complete)
```typescript
// web/src/app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { CHAT_SYSTEM_PROMPT } from '@/lib/chat/system-prompt';

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

### Extraction Server Action (Complete)
```typescript
// web/src/app/(dashboard)/profiles/[profileId]/actions.ts (new file or add to existing)
'use server';

import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { extractionResultSchema } from '@/lib/chat/extraction-schema';
import { createClient } from '@/lib/supabase/server';

export async function extractPreferencesFromChat(conversationText: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { output } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    output: Output.object({ schema: extractionResultSchema }),
    prompt: `Extract all property preference criteria from this conversation between a user and a property search assistant.

For each preference mentioned by the user:
- name: a short descriptive label
- value: specific details or requirements (empty string if not specified)
- importance: infer from the user's language. Words like "must", "absolutely", "deal-breaker" → critical. "Really want", "important" → high. General mentions → medium. "Would be nice", "bonus" → low.

Only include preferences the USER expressed (not suggestions the assistant made that the user didn't confirm).

Conversation:
${conversationText}`,
  });

  return output?.fields ?? [];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` | `generateText()` + `Output.object()` | AI SDK 6 (Jan 2026) | Unified API; generateObject deprecated |
| `useChat({ api })` string config | `useChat({ transport: new DefaultChatTransport({ api }) })` | AI SDK 6 (Jan 2026) | Transport-based configuration |
| Zod 3 only | Zod 3 + Zod 4 support | AI SDK 5.1+ / 6 | Zod 4 works with AI SDK 6 |
| Manual message format | `UIMessage` + `convertToModelMessages()` | AI SDK 5+ | Type-safe message conversion |

**Deprecated/outdated:**
- `generateObject()` / `streamObject()`: Use `generateText` + `Output.object()` instead
- `useChat({ api: '/path' })` string shorthand: Use `transport` option with `DefaultChatTransport`
- `message.content` string: Use `message.parts` array (parts have `type` and `text` properties)

## Open Questions

1. **Claude model choice for chat: Haiku vs Sonnet?**
   - What we know: Backend uses `claude-haiku-4-5-20251001` for scoring. Haiku is faster and cheaper. Chat is conversational, not scoring.
   - What's unclear: Whether Haiku produces good enough conversational quality for preference discovery.
   - Recommendation: Use Haiku for both chat and extraction. It is sufficient for conversational Q&A and structured extraction. If quality is poor, upgrade to Sonnet later -- the model string is the only change needed.

2. **Chat UI placement: inline on profile page vs modal/drawer?**
   - What we know: The profile edit page has a form with accordion sections. Adding a chat panel needs to coexist with the form.
   - What's unclear: Best UX for the interaction between chat panel and preferences form.
   - Recommendation: Use a side panel or collapsible section above the form. When open, chat takes the top portion; the form is still visible below. On mobile, chat could be a full-screen overlay. This is a UI decision the planner can finalize.

3. **Should extraction happen automatically or on user action?**
   - What we know: CHAT-04 says "user can view, edit, add, and delete AI-generated fields before saving," implying a review step.
   - What's unclear: Whether extraction should auto-run after N messages or require a button click.
   - Recommendation: Require explicit user action ("Extract Preferences" button). Auto-extraction would be confusing and expensive (API call on every message). The button should only be enabled after the assistant has responded at least twice.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x + @testing-library/react |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && npx vitest run src/__tests__/chat*.test.ts` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Chat panel renders on profile page with toggle | unit | `cd web && npx vitest run src/__tests__/chat-panel.test.tsx` | Wave 0 |
| CHAT-02 | Chat sends messages and renders streaming responses | integration | Manual -- requires live API | manual-only (mocked in unit test) |
| CHAT-03 | Extraction schema validates correctly; extraction returns structured fields | unit | `cd web && npx vitest run src/__tests__/extraction-schema.test.ts` | Wave 0 |
| CHAT-04 | Extracted fields render in review UI with edit/delete capability | unit | `cd web && npx vitest run src/__tests__/extracted-fields-review.test.tsx` | Wave 0 |
| CHAT-05 | Merge preserves standard fields and appends dynamic fields | unit | `cd web && npx vitest run src/__tests__/chat-merge.test.ts` | Wave 0 |
| CHAT-06 | sessionStorage saves/restores messages by profileId | unit | `cd web && npx vitest run src/__tests__/chat-persistence.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run src/__tests__/chat*.test.ts src/__tests__/extraction*.test.ts`
- **Per wave merge:** `cd web && npx vitest run`
- **Phase gate:** Full web test suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/extraction-schema.test.ts` -- covers CHAT-03 (Zod schema validation)
- [ ] `web/src/__tests__/chat-merge.test.ts` -- covers CHAT-05 (JSONB merge logic)
- [ ] `web/src/__tests__/chat-persistence.test.ts` -- covers CHAT-06 (sessionStorage save/restore)
- [ ] `web/src/__tests__/chat-panel.test.tsx` -- covers CHAT-01 (render + toggle)
- [ ] `web/src/__tests__/extracted-fields-review.test.tsx` -- covers CHAT-04 (review UI)

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - All source files read directly:
  - `web/src/lib/schemas/preferences.ts` (existing Zod schema with dynamicFields)
  - `web/src/components/preferences/dynamic-fields-section.tsx` (existing dynamic fields UI)
  - `web/src/components/preferences/preferences-form.tsx` (existing form structure)
  - `web/src/app/(dashboard)/profiles/[profileId]/page.tsx` (profile edit page)
  - `web/src/app/(dashboard)/profiles/actions.ts` (save preferences action)
  - `web/src/lib/supabase/server.ts` and `client.ts` (Supabase client setup)
  - `web/package.json` (current dependencies: zod 4.3.6, react-hook-form 7.71.2, Next.js 16.1.6)
  - `web/.env.local` (currently only SUPABASE vars; NO ANTHROPIC_API_KEY)
  - `backend/app/services/claude.py` (uses claude-haiku-4-5-20251001)
- **AI SDK official documentation** (ai-sdk.dev):
  - [Chatbot guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - useChat hook, message format, transport
  - [Getting Started: Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - route handler setup
  - [Structured Data Generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Output.object() pattern
  - [Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - setup, API key, model names
  - [Migration Guide 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) - generateObject deprecation
  - [zodSchema reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema) - Zod 4 compatibility

### Secondary (MEDIUM confidence)
- [Vercel Academy: Structured Data Extraction](https://vercel.com/academy/ai-sdk/structured-data-extraction) - extraction pattern with Output.object()
- [AI SDK 6 blog post](https://vercel.com/blog/ai-sdk-6) - unified generateText + Output.object(), deprecated generateObject
- [Vercel function duration docs](https://vercel.com/docs/functions/configuring-functions/duration) - maxDuration limits by plan

### Tertiary (LOW confidence)
- Zod 4 + AI SDK 6 compatibility: Official AI SDK Twitter confirmed support, but GitHub issue #10014 (filed against SDK 5) may have residual edge cases. Test extraction schema in development.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AI SDK is the official Vercel toolkit; direct provider integration documented
- Architecture: HIGH - follows standard useChat + streamText pattern from official docs; extraction via generateText + Output.object() is documented pattern
- Pitfalls: HIGH - identified from Vercel limits documentation, codebase analysis, and known AI SDK issues
- Zod 4 compat: MEDIUM - officially supported in SDK 6, but edge cases reported in SDK 5; test early

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (AI SDK releases frequently; check for breaking changes)
