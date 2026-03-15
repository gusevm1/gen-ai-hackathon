# Technology Stack

**Project:** HomeMatch v2.0 -- Smart Preferences & UX Polish
**Researched:** 2026-03-15

## Scope

This document covers stack ADDITIONS and CHANGES for the v2.0 milestone only. The existing validated stack is unchanged:

- Next.js 16.1.6 + React 19 + TypeScript 5 on Vercel
- shadcn/ui v4 (`base-nova` style) with Tailwind CSS v4
- Supabase auth + PostgreSQL + edge functions
- WXT Chrome extension (MV3, Shadow DOM)
- FastAPI on EC2 + Python `anthropic` SDK (AsyncAnthropic)
- Claude Haiku 4.5 for scoring
- `next-themes`, `react-hook-form`, `zod` v4, `lucide-react`

Research focuses on four new capabilities:

1. Chat-based preference discovery (frontend + backend routing)
2. Flatfox-esque UI theming (CSS variables only)
3. Parallel listing scoring (backend concurrency + extension API changes)
4. Chrome extension distribution (static content + CWS publishing)

---

## Recommended Stack Additions

### 1. Chat-Based Preference Discovery

#### Frontend: Vercel AI SDK (`useChat`)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ai` | ^6.x (latest 6.0.x) | AI SDK core -- streaming primitives, message types, `DefaultChatTransport`, `streamText`, `convertToModelMessages`, `generateObject` | De facto standard for AI chat UIs in Next.js. Over 20M monthly downloads. Handles SSE streaming, message state management, status machine. Built by Vercel for the Vercel platform we already deploy on. |
| `@ai-sdk/react` | ^3.x (latest 3.0.118) | React hooks: `useChat` for conversational UI | Provides `useChat` hook with built-in streaming state machine (`ready` / `submitted` / `streaming` / `error`), `sendMessage()`, `messages` array with typed parts, abort/regenerate, transport abstraction. Eliminates all custom SSE parsing and state management code. |
| `@ai-sdk/anthropic` | ^3.x (latest 3.0.58) | Anthropic provider for AI SDK server-side route handler | Unified provider wrapping the Anthropic Messages API. Supports Claude Haiku 4.5 (our scoring model) and all current Claude models. Works with `streamText()` and `generateObject()` for structured output extraction. |

**Confidence:** HIGH -- verified via official AI SDK docs at ai-sdk.dev (introduction, chatbot guide, useChat reference, Anthropic provider page, migration guide 6.0), npm registry version numbers, and Vercel AI SDK 6 release blog post.

**Why AI SDK instead of raw `fetch` + `EventSource`:**
- `useChat` manages message history, streaming state, error states, and abort -- all things we would hand-build otherwise
- `streamText()` server-side returns `toUIMessageStreamResponse()` purpose-built for the `useChat` transport
- `generateObject()` with a Zod schema provides type-safe structured preference extraction after the conversational turns
- The Anthropic provider wraps the same Claude API our backend uses, so zero surface gap
- Tight Next.js App Router integration (Route Handlers, RSC-compatible)

**Architecture: Next.js Route Handler, NOT Supabase Edge Function**

The chat endpoint lives as a Next.js API route (`app/api/chat/route.ts`) because:
- AI SDK's `streamText()` + `toUIMessageStreamResponse()` is designed for Next.js route handlers
- Vercel handles SSE streaming natively with configurable `maxDuration`
- The preference chat is a web-app-only feature (extension does not use it)
- Chat produces preferences saved directly to Supabase via the existing client -- no EC2 involvement needed
- Routing through FastAPI would add an unnecessary hop and require SSE infrastructure on EC2

**Usage pattern:**

Client component (`app/(dashboard)/profiles/[profileId]/chat/page.tsx`):
```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
```

Route handler (`app/api/chat/route.ts`):
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: 'You are a property preference assistant...',
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

Preference extraction (`app/api/chat/extract/route.ts`):
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { conversationHistory } = await req.json();
  const result = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: z.object({
      generatedCriteria: z.array(z.object({
        label: z.string(),
        importance: z.enum(['critical', 'high', 'medium', 'low']),
        description: z.string(),
      })),
      suggestedLocation: z.string().optional(),
      suggestedBudgetMax: z.number().optional(),
      suggestedRoomsMin: z.number().optional(),
    }),
    prompt: `Extract structured preferences from: ${JSON.stringify(conversationHistory)}`,
  });
  return Response.json(result.object);
}
```

**What NOT to add:**
- Do NOT add `@anthropic-ai/sdk` to the web app -- the AI SDK Anthropic provider wraps it internally. Adding both creates version conflicts.
- Do NOT add `assistant-ui` or `@assistant-ui/react-ai-sdk` -- over-engineered for a single-purpose preference chat. Our UI is custom.
- Do NOT add `openai` or other AI providers -- we use Claude exclusively.
- Do NOT route chat through FastAPI -- the chat result is a preference object that goes directly to Supabase. Adding a FastAPI hop creates unnecessary latency (Next.js -> EC2 -> Claude -> EC2 -> Next.js -> Supabase vs. Next.js -> Claude -> Supabase).

---

### 2. Flatfox-esque UI Theming

#### No new packages needed -- CSS variable changes only

The theming overhaul is a pure CSS change to `globals.css` custom properties. The existing stack (Tailwind CSS v4, shadcn/ui with CSS variables, `next-themes` for dark mode) fully supports this without additions.

| What Changes | Current Value | New Value (Flatfox-esque) | Rationale |
|-------------|---------------|---------------------------|-----------|
| `--primary` | `hsl(342 89% 40%)` (rose/magenta) | `hsl(168 76% 36%)` (teal-green, approx `#16a085`) | Flatfox uses a teal/turquoise-green primary. DEPT Agency describes the brand as "light and agile" with "fresh, bold colors." |
| `--primary` (dark) | `hsl(342 89% 50%)` | `hsl(168 76% 46%)` | Lighter teal for dark mode contrast |
| `--ring` | Same rose | Same teal | Focus rings match primary |
| `--sidebar-primary` | Same rose | Same teal | Sidebar active states match |
| `--chart-*` | Purple/indigo spectrum | Teal/green spectrum | Score visualization colors match brand |

**Flatfox Visual Identity (MEDIUM confidence):**
Flatfox uses a teal/turquoise-green primary color with a clean, light interface. Their brand redesign by DEPT agency aimed for a "youthful appearance while maintaining seriousness and professionalism." Floor-plan-inspired shapes are a key brand element. The exact hex values are not publicly documented -- colors should be fine-tuned by visual comparison with the live site during implementation.

**Confidence on color values:** MEDIUM -- Flatfox has no public style guide or design tokens. Values are approximated from visual inspection and the DEPT case study description. The implementer should eyeball against flatfox.ch and adjust.

**Implementation approach:**
1. Update CSS custom properties in `globals.css` `:root` and `.dark` blocks
2. No component-level changes -- all shadcn/ui components read from CSS variables
3. Extension theming is NOT affected (extension has its own `tailwind.config.js` and Shadow DOM isolation)
4. Keep typography as system sans-serif (Flatfox uses custom fonts not worth importing)

**What NOT to add:**
- Do NOT import Flatfox CSS or fonts -- we are adopting their color palette, not cloning their design
- Do NOT add CSS-in-JS (styled-components, emotion) -- Tailwind + CSS variables is the correct approach
- Do NOT add a design token system (Style Dictionary, etc.) -- overkill for a single theme with ~15 variables

---

### 3. Parallel Listing Scoring

#### Backend: `asyncio.gather` + `asyncio.Semaphore` (Python stdlib, no new packages)

The backend already uses `AsyncAnthropic` and `async def` route handlers. Parallel scoring requires only code changes -- zero new dependencies.

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| `asyncio.gather(*tasks)` | Wrap multiple `claude_scorer.score_listing()` calls | Run N scoring requests concurrently instead of sequentially |
| `asyncio.Semaphore(N)` | Limit concurrent Claude API calls | Respect Anthropic rate limits, prevent 429 errors |

**Concurrency limit: N=3 (recommended)**

Rationale based on verified Anthropic rate limits:

| Tier | RPM (Haiku 4.5) | ITPM | OTPM |
|------|-----------------|------|------|
| Tier 1 | 50 | 50,000 | 10,000 |
| Tier 2 | 1,000 | 450,000 | 90,000 |
| Tier 3 | 2,000 | 1,000,000 | 200,000 |

- A Flatfox search page shows up to ~20 listings
- Each scoring request: ~2,000-4,000 input tokens (listing data + images + preferences + system prompt)
- At N=3 concurrent: 20 listings complete in ~7 batches vs 20 sequential -- roughly 3x speedup
- N=3 stays safely within Tier 1 limits (3 concurrent << 50 RPM)
- Each request also downloads 3-5 listing images, adding I/O time. Higher concurrency amplifies this.
- Primary UX bottleneck is Claude response time (~2-4s per call), not connection overhead

**Why not N=5 or higher?**
- Risk of hitting concurrent connection limits on lower API tiers
- Diminishing returns: with ~3s per Claude call, N=3 already overlaps requests efficiently
- Can increase to N=5 after confirming API tier and monitoring 429 error rates

**New endpoint: `POST /score/batch`**

```python
@router.post("/batch", response_model=list[BatchScoreResult])
async def score_batch(request: BatchScoreRequest):
    """Score multiple listings in parallel with concurrency control."""
    semaphore = asyncio.Semaphore(3)

    async def score_one(listing_id: int) -> BatchScoreResult:
        async with semaphore:
            try:
                listing = await flatfox_client.get_listing(listing_id)
                preferences = UserPreferences.model_validate(request.preferences)
                image_urls = await flatfox_client.get_listing_image_urls(
                    listing.slug, listing.pk
                )
                result = await claude_scorer.score_listing(
                    listing, preferences, image_urls
                )
                await asyncio.to_thread(
                    supabase_service.save_analysis,
                    request.user_id, request.profile_id,
                    str(listing_id), result.model_dump()
                )
                return BatchScoreResult(
                    listing_id=listing_id, score=result, error=None
                )
            except Exception as e:
                return BatchScoreResult(
                    listing_id=listing_id, score=None, error=str(e)
                )

    tasks = [score_one(lid) for lid in request.listing_ids]
    results = await asyncio.gather(*tasks)
    return results
```

**Confidence:** HIGH -- `asyncio.gather` and `asyncio.Semaphore` are Python stdlib (no install). Rate limits verified from official docs at platform.claude.com/docs/en/api/rate-limits.

#### Supabase Edge Function: Extend or add batch proxy

Two options (implementation detail, not stack decision):

1. **New `score-batch-proxy` edge function** -- separate request/response shape, cleaner separation
2. **Extend existing `score-proxy`** -- accept `listing_ids` array alongside `listing_id`, branch internally

Either approach uses the same `@supabase/supabase-js` already in the project. No new packages.

#### Extension: Single batch request replaces sequential loop

The extension's `lib/api.ts` currently loops sequentially:
```typescript
// CURRENT: Sequential -- scores one at a time
for (const id of listingIds) {
  const result = await scoreListing(id, jwt);
  onResult?.(id, result);
}
```

Change to a single batch request:
```typescript
// NEW: Single batch request
export async function scoreListingsBatch(
  listingIds: number[],
  jwt: string,
): Promise<BatchScoreResult[]> {
  const res = await fetch(EDGE_FUNCTION_BATCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listing_ids: listingIds }),
  });
  return (await res.json()) as BatchScoreResult[];
}
```

**Why single batch request over N parallel edge function calls?**
- 1 HTTP request instead of 20 from the extension
- Backend controls concurrency (Semaphore), not the client
- Better error aggregation (partial failures in one response)
- Fewer cold starts on the edge function

**Progressive rendering consideration:** With a single batch request, results arrive all-at-once (not progressively as they do today). Two approaches:
1. **Accept all-at-once:** Simpler. Loading skeletons show for all badges, then all populate when batch completes. For ~20 listings at N=3 concurrency, total wait is ~20-25 seconds.
2. **Server-Sent Events from backend:** Stream individual results as they complete. Better UX but more complex. Requires `StreamingResponse` on FastAPI and SSE parsing in the edge function/extension.

Recommendation: Start with approach 1, upgrade to SSE if wait time proves frustrating in testing.

**No new npm packages needed in extension.**

**Confidence:** HIGH -- standard JavaScript/Python patterns, no new dependencies.

---

### 4. Chrome Extension Distribution

#### No new packages needed -- static content + Chrome Web Store

| Approach | Recommendation | Why |
|----------|---------------|-----|
| Chrome Web Store (Unlisted) | PRIMARY | Unlisted extensions get a CWS install URL but do not appear in search. Users install via direct link shared on our website. One-time $5 developer registration fee. Same review process as public (1-3 business days). |
| Developer mode sideloading | FALLBACK | For hackathon demo or users who cannot wait for CWS review. Requires enabling developer mode, downloading ZIP, loading unpacked. Instruction page on website. |
| Self-hosted CRX | DO NOT USE | Chrome blocks CRX installs from non-CWS sources on Windows and macOS. Only works on Linux. Not viable for B2B pilot (target user likely on Windows/macOS). |

**Website implementation:**
- New page at `app/(marketing)/extension/page.tsx` or `app/(dashboard)/download/page.tsx`
- Static content: hero section, feature bullets, install instructions, CWS link button
- No new npm packages -- use existing shadcn/ui components (Button, Card, etc.)
- Include a "For Developers" accordion/section with sideloading instructions as fallback
- Optionally host the `.zip` file in `public/` for direct download (sideloading fallback)

**CWS Publishing workflow:**
1. `cd extension && pnpm run zip` -- WXT produces uploadable `.zip` in `dist/`
2. Upload to Chrome Web Store Developer Dashboard
3. Set visibility to "Unlisted"
4. Submit for review (1-3 business days)
5. Receive direct install URL, embed on website download page

**Confidence:** HIGH -- CWS unlisted publishing documented at developer.chrome.com. WXT `zip` command produces the correct format.

---

## Summary: What to Install

### Web App (Next.js)

```bash
cd /Users/maximgusev/workspace/gen-ai-hackathon/web

# Chat-based preference discovery (3 packages, 1 feature)
pnpm add ai @ai-sdk/react @ai-sdk/anthropic
```

That is the ONLY install needed across the entire project.

### Backend (FastAPI)

```bash
# No new packages
# asyncio.gather and asyncio.Semaphore are Python stdlib
```

### Extension (WXT)

```bash
# No new packages
# API client changes are code-only
```

### Supabase Edge Functions

```bash
# No new packages
# New/modified edge function uses same @supabase/supabase-js
```

---

## New Environment Variables

### Vercel (web app) -- NEW

| Variable | Value | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Same API key used on EC2 backend | AI SDK Anthropic provider reads this automatically. Required for the chat route handler. |

**Important note:** The web app currently has NO direct Anthropic API key -- it communicates with Claude only through the EC2 backend (via Supabase edge function proxy). The chat feature introduces a direct Claude connection from the Vercel-hosted Next.js route handler. This is architecturally correct because:
- Chat generates preferences (saved to Supabase), not scores (saved via backend)
- No listing data or images involved (unlike scoring)
- Vercel route handlers support streaming natively

### Existing (unchanged)

| Service | Variables |
|---------|-----------|
| EC2 Backend | `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| Supabase Edge | `BACKEND_URL`, auto-set `SUPABASE_URL`, auto-set `SUPABASE_ANON_KEY` |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Chat UI framework | AI SDK `useChat` | Raw `fetch` + `EventSource` | Manual SSE parsing, state management, error handling, abort controller -- reinventing what `useChat` provides. ~200 lines of custom code replaced by ~10 lines. |
| Chat UI framework | AI SDK `useChat` | `@assistant-ui/react-ai-sdk` | Full-featured chat component library with pre-built UI. Over-abstracted for our use case -- we need a custom preference-specific chat UI, not a generic chatbot. |
| Chat backend | Next.js Route Handler | FastAPI endpoint | No streaming infrastructure on EC2, adds unnecessary network hop, chat result goes to Supabase not EC2. |
| Chat model | Claude Haiku 4.5 | Claude Sonnet 4.x | Preference extraction is conversational NLU, not complex reasoning. Haiku is ~10x cheaper and faster. Sonnet only if Haiku quality proves insufficient. |
| Chat SDK | AI SDK | LangChain.js | Overkill for multi-turn chat. Massive dependency tree. AI SDK is purpose-built for this exact use case and far lighter. |
| Parallel scoring | `asyncio.gather` + Semaphore | Celery / RQ job queue | Massive overkill. Scoring 20 listings is a 30-second burst, not a long-running job. No Redis, worker processes, or persistence needed. |
| Parallel scoring | Single batch endpoint | N parallel edge function calls | 1 HTTP request better than 20. Backend controls concurrency. Simpler error handling. Fewer cold starts. |
| Extension distribution | CWS Unlisted | Self-hosted CRX | Chrome blocks non-CWS installs on Windows/macOS. Not viable for B2B pilot. |
| Extension distribution | CWS Unlisted | CWS Public | Extension is niche (Flatfox.ch only, requires HomeMatch account). Public listing invites irrelevant installs and support burden. |
| Theming | CSS variable update in globals.css | New design system / design tokens | Over-engineering. shadcn/ui already uses CSS variables. Changing ~15 values accomplishes the entire rebrand. |

---

## Version Compatibility Matrix

| Package | Version | Requires | Compatible With |
|---------|---------|----------|-----------------|
| `ai` | ^6.x | Node 18+ | Next.js 16.1.6 (current), React 19.2.3 (current) |
| `@ai-sdk/react` | ^3.x | `ai` ^6.x, React 18+ | React 19.2.3 (current), Next.js 16 App Router |
| `@ai-sdk/anthropic` | ^3.x | `ai` ^6.x | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), all current Claude models |
| `zod` | ^4.x | -- | Already at ^4.3.6 -- `generateObject` schema parameter compatible |

**No conflicts with existing dependencies.** The AI SDK packages are purely additive. They do not overlap with or replace any existing package. The `@ai-sdk/anthropic` provider uses `@anthropic-ai/sdk` internally but does not expose it as a peer dependency.

---

## Integration Points

### Chat Output -> Existing Preferences Schema

The chat produces AI-generated criteria that extend the existing preference model. Schema evolution approach:

**Current `softCriteria` field:**
```typescript
softCriteria: z.array(z.string()).default([])
// e.g., ["quiet neighborhood", "near park"]
```

**New `generatedCriteria` field (replaces softCriteria for chat-created profiles):**
```typescript
generatedCriteria: z.array(z.object({
  label: z.string(),                    // e.g., "Quiet neighborhood"
  importance: importanceLevelSchema,    // critical/high/medium/low
  description: z.string(),             // e.g., "Away from main roads"
})).default([])
```

Both fields coexist during migration. Old profiles keep `softCriteria`. New chat-created profiles use `generatedCriteria`. The backend `UserPreferences` model gains the same field with a `model_validator` for backward compatibility (same pattern as the existing `migrate_legacy_format` validator).

### Batch Scoring -> Existing Score Pipeline

The batch endpoint reuses `claude_scorer.score_listing()` unchanged. No modifications to scoring logic, prompts, or `ScoreResponse` model. The batch wrapper only adds:
- `asyncio.gather` for concurrent execution
- `asyncio.Semaphore` for rate limiting
- Per-listing error isolation (one failure does not abort the batch)

### Extension Batch -> Existing Content Script

The content script's `handleScore()` in `App.tsx` currently calls `scoreListings()`. The change:
1. Replace with `scoreListingsBatch()` (single batch request)
2. On response, iterate results and call `renderBadge()` for each
3. Loading skeleton injection happens before the batch call (unchanged)
4. Error handling: batch failure cleans all skeletons; individual listing failures show error badges

### Extension Distribution -> Existing Build Pipeline

`wxt zip` already produces the correct `.zip` for CWS upload. The website download page is a new static page that links to the CWS install URL. No build pipeline changes.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@anthropic-ai/sdk` in web app | AI SDK's `@ai-sdk/anthropic` wraps it. Installing both creates version conflicts and bundle bloat. | `@ai-sdk/anthropic` (includes SDK internally) |
| `assistant-ui` / chatbot component kits | Generic chat UIs do not match our preference-discovery flow (greeting -> questions -> extraction -> review). | Custom chat component built with `useChat` hook |
| Celery / RQ / background job queues | Scoring 20 listings takes 20-30s with concurrency. Not a background job. Adds Redis, workers, monitoring. | `asyncio.gather` + `asyncio.Semaphore` in FastAPI |
| WebSocket for scoring results | Adds connection lifecycle management, reconnection logic, WS server support. HTTP is sufficient. | Single batch HTTP request (SSE as future optimization) |
| `framer-motion` for chat animations | Heavy dependency (~50 KB) for simple fade/slide animations. | CSS transitions via `tw-animate-css` (already installed) |
| Self-hosted CRX files | Chrome blocks non-CWS CRX on Windows/macOS. | Chrome Web Store Unlisted |
| Multiple AI providers / model abstraction | We use Claude exclusively. Provider abstraction adds complexity for zero benefit. | Direct `anthropic()` provider calls |

---

## Sources

- [AI SDK Documentation -- Introduction](https://ai-sdk.dev/docs/introduction) -- SDK overview, packages, capabilities
- [AI SDK -- Chatbot Guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) -- full `useChat` example with route handler, `DefaultChatTransport`, `sendMessage`, message parts
- [AI SDK -- useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) -- hook API: `messages`, `sendMessage`, `status`, `onToolCall`, `regenerate`, `stop`
- [AI SDK -- Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- setup, model IDs, `generateObject` support
- [AI SDK 6 Release Blog](https://vercel.com/blog/ai-sdk-6) -- breaking changes, `ModelMessage` replaces `CoreMessage`
- [AI SDK Migration Guide 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) -- `convertToModelMessages` is async, codemod available
- [@ai-sdk/react on npm](https://www.npmjs.com/package/@ai-sdk/react) -- version 3.0.118, published 2026-03-05
- [@ai-sdk/anthropic on npm](https://www.npmjs.com/package/@ai-sdk/anthropic) -- version 3.0.58, published 2026-03-06
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) -- RPM/ITPM/OTPM by tier for Haiku 4.5
- [DEPT Agency -- Flatfox Redesign](https://www.deptagency.com/de-dach/case/upgrades-fuer-die-groesste-schweizer-immobilienplattform/) -- brand: "light and agile," "fresh, bold colors"
- [Chrome Extension Distribution](https://developer.chrome.com/docs/extensions/how-to/distribute) -- distribution options
- [Chrome Web Store Distribution Settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) -- unlisted/private/public visibility
- [FastAPI Concurrency Docs](https://fastapi.tiangolo.com/async/) -- async/await patterns
- [Python asyncio Semaphore](https://docs.python.org/3/library/asyncio-sync.html) -- stdlib concurrency control

---

*Stack research for: HomeMatch v2.0 -- Smart Preferences & UX Polish*
*Researched: 2026-03-15*
