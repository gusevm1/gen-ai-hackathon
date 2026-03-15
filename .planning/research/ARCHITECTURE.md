# Architecture Patterns: v2.0 Integration

**Domain:** Chat-based preferences, dynamic schema, parallel scoring, extension distribution
**Researched:** 2026-03-15
**Confidence:** HIGH (direct codebase analysis + verified API documentation)

---

## Current Architecture (v1.1 Baseline)

```
Extension (WXT)                 Supabase                    EC2 Backend
+-----------------+      +--------------------+      +------------------+
| Content Script  |      | Edge Function:     |      | POST /score      |
|  FAB --------->-|----->| score-proxy        |----->|  1. flatfox API  |
|  Badges (Shadow)|      |  - JWT verify      |      |  2. image fetch  |
|  Summary Panels |      |  - resolve profile |      |  3. Claude call  |
| Popup           |      |  - proxy to EC2    |      |  4. save analysis|
|  ProfileSwitcher|      +--------------------+      +------------------+
+-----------------+      | DB (PostgreSQL)    |
                         |  profiles (JSONB)  |      Next.js (Vercel)
                         |  analyses          |      +------------------+
                         |  RPC: set_active_  |      | /profiles/[id]   |
                         |    profile         |<-----| PreferencesForm  |
                         +--------------------+      | /analysis/[id]   |
                                                     +------------------+
```

### Key Data Flow for Scoring (current)

1. User clicks FAB on Flatfox.ch
2. Content script calls `scoreListings()` -- **sequentially**, one listing at a time
3. Each call: Extension -> score-proxy edge function (JWT auth, resolve active profile, read preferences JSONB) -> EC2 `/score`
4. Backend: fetch listing from Flatfox API, fetch images, call Claude `messages.parse()`, save to `analyses` table
5. Badge rendered per listing as each result arrives

### Key Data for Preferences (current)

```
Zod schema (frontend)  <-->  JSONB in profiles.preferences  <-->  Pydantic model (backend)

Fixed fields: location, offerType, objectCategory, budgetMin/Max, roomsMin/Max,
              livingSpaceMin/Max, budgetDealbreaker, roomsDealbreaker, livingSpaceDealbreaker,
              floorPreference, availability, features[], softCriteria[], importance{}, language
```

The `softCriteria` field is a `list[str]` of free-text tags the user adds manually. The `features` field is a `list[str]` of predefined feature toggles (balcony, elevator, etc.). The `importance` field maps 5 fixed categories to importance levels.

---

## Integration 1: Chat-Based Preference Discovery

### What Changes

Replace the manual `softCriteria` free-text tags and partially the `features` checkboxes with an AI-powered chat that generates structured preference fields from natural language conversation.

### Architecture Decision: Where to Run the Chat LLM

**Use the Vercel AI SDK on the Next.js frontend, calling Claude directly from server actions.** Do NOT route chat through the EC2 backend.

Rationale:
- The chat is a **web-only** feature (users set preferences on the website, not the extension)
- Vercel AI SDK v6 provides `streamText` + `useChat` with built-in Anthropic provider, streaming, and structured output
- The EC2 backend is purpose-built for the scoring pipeline (Flatfox fetch + image extraction + Claude scoring); adding a chat endpoint would couple unrelated concerns
- Server actions eliminate the need for API route boilerplate

### New Component: Chat Preferences Flow

```
Next.js Frontend                                    Claude API
+----------------------------------+                (via Vercel AI SDK)
| /profiles/[id]/chat  (NEW PAGE) |
|                                  |
| ChatInterface component         |     streamText()
|   useChat() hook  ------------->|---> anthropic('claude-haiku-4-5')
|   - User describes needs        |     System prompt: extract preferences
|   - AI asks clarifying Qs       |     Multi-turn conversation
|   - AI generates structured     |<--- Streamed response
|     preference fields           |
|                                  |
| PreferenceReview component (NEW) |
|   - Shows AI-generated fields   |
|   - User can edit/remove/add    |
|   - User confirms and saves     |
|                                  |
| On save: merge with standard    |
|   fields -> update profiles     |
|   .preferences JSONB            |
+----------------------------------+
```

### Implementation Details

**Server Action for Chat (new file: `web/src/app/(dashboard)/profiles/[profileId]/chat/actions.ts`)**

```typescript
'use server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createStreamableValue } from 'ai/rsc'

export async function chatWithPreferences(messages: Message[]) {
  const stream = createStreamableValue()

  ;(async () => {
    const result = streamText({
      model: anthropic('claude-haiku-4-5'),
      system: PREFERENCE_DISCOVERY_SYSTEM_PROMPT,
      messages,
    })
    // pipe stream to client
  })()

  return { output: stream.value }
}
```

**Alternatively, use the API route + useChat pattern (simpler):**

```typescript
// web/src/app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: PREFERENCE_DISCOVERY_PROMPT,
    messages,
  })
  return result.toDataStreamResponse()
}

// Client: useChat({ api: '/api/chat' })
```

**Preference Extraction (structured output at end of conversation):**

When the user indicates they are done chatting, a final call uses `generateObject` with a Zod schema to extract structured preferences:

```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const dynamicPreferenceSchema = z.object({
  fields: z.array(z.object({
    label: z.string(),           // "Natural light"
    description: z.string(),     // "Lots of windows, south-facing"
    importance: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.enum(['location', 'features', 'condition', 'lifestyle', 'other']),
  })),
  suggestedFeatures: z.array(z.string()),  // Map to existing features list
  suggestedLocation: z.string().optional(),
  suggestedBudget: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
  }).optional(),
})
```

### Schema Evolution: Dynamic Preferences

**Current schema** has fixed `softCriteria: string[]` -- unstructured free text.

**New schema** replaces `softCriteria` with `dynamicFields`:

```typescript
// Added to preferences schema (both Zod and Pydantic)
dynamicFields: z.array(z.object({
  id: z.string(),               // UUID for stable identity
  label: z.string(),            // Human-readable name
  description: z.string(),      // What the user means
  importance: importanceLevelSchema,  // critical/high/medium/low
  category: z.string(),         // grouping for UI/prompt
})).default([])
```

**Migration path:** Keep `softCriteria` as an alias. The backend Pydantic model validator already handles migration (see `migrate_legacy_format`). Add a new validator that converts old `softCriteria` strings into `dynamicFields` with `importance: 'medium'`.

**Impact on scoring prompt:** The `build_user_prompt()` function in `backend/app/prompts/scoring.py` currently formats `softCriteria` as:
```
**Soft criteria:** criterion1, criterion2
```

This changes to format each dynamic field with its importance:
```
**Custom Criteria:**
- Natural light (HIGH): Lots of windows, south-facing
- Quiet neighborhood (CRITICAL): No busy roads nearby
- Modern kitchen (MEDIUM): Recently renovated kitchen
```

### New Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `ai` (Vercel AI SDK) | web | `streamText`, `generateObject`, `useChat` |
| `@ai-sdk/anthropic` | web | Claude provider for AI SDK |

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Vercel (web) | Claude API for chat (separate from EC2 backend key) |

### Files Changed

| File | Change Type | What |
|------|-------------|------|
| `web/src/lib/schemas/preferences.ts` | MODIFY | Add `dynamicFields` to Zod schema |
| `web/src/app/api/chat/route.ts` | NEW | API route for streaming chat |
| `web/src/app/(dashboard)/profiles/[profileId]/chat/page.tsx` | NEW | Chat page |
| `web/src/components/chat/chat-interface.tsx` | NEW | Chat UI with `useChat` |
| `web/src/components/chat/preference-review.tsx` | NEW | Review/edit extracted prefs |
| `web/src/lib/prompts/preference-discovery.ts` | NEW | System prompt for chat |
| `backend/app/models/preferences.py` | MODIFY | Add `dynamic_fields`, migration |
| `backend/app/prompts/scoring.py` | MODIFY | Format dynamic fields in prompt |

---

## Integration 2: Parallel Listing Scoring

### What Changes

Currently `scoreListings()` in `extension/src/lib/api.ts` scores listings **sequentially** in a `for` loop. Change to parallel execution with concurrency control.

### Architecture Decision: Where to Parallelize

**Parallelize at both the extension client AND the backend.**

**Extension side:** Send N requests to the edge function concurrently (with concurrency limit).
**Backend side:** No changes needed -- FastAPI is already async. Each request is handled independently. The `claude_scorer.score_listing()` already uses `AsyncAnthropic` with `await`, so multiple concurrent requests naturally parallelize.

The edge function is stateless and handles each request independently, so concurrent calls from the extension work without modification.

### Rate Limit Analysis

The backend uses `claude-haiku-4-5` (configurable via `CLAUDE_MODEL` env var).

Claude Haiku 4.5 rate limits (from official docs):
- **Tier 1:** 50 RPM, 50K ITPM, 10K OTPM
- **Tier 2:** 1,000 RPM, 450K ITPM, 90K OTPM

A typical scoring request: ~2-3K input tokens (listing data + preferences + images), ~1-2K output tokens (ScoreResponse). So at Tier 1, scoring 50 listings concurrently is feasible within RPM but may hit ITPM limits (50 x 3K = 150K > 50K ITPM). A concurrency limit of 5-10 is safe for Tier 1.

**Recommendation: Default concurrency of 5, configurable.** This stays well within Tier 1 limits and provides ~5x speedup over sequential.

### Client-Side Changes (Extension)

```typescript
// extension/src/lib/api.ts -- MODIFIED

const DEFAULT_CONCURRENCY = 5;

export async function scoreListings(
  listingIds: number[],
  jwt: string,
  onResult?: (id: number, result: ScoreResponse) => void,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<Map<number, ScoreResponse>> {
  const results = new Map<number, ScoreResponse>();

  // Process in batches of `concurrency`
  for (let i = 0; i < listingIds.length; i += concurrency) {
    const batch = listingIds.slice(i, i + concurrency);
    const promises = batch.map(async (id) => {
      try {
        const result = await scoreListing(id, jwt);
        results.set(id, result);
        onResult?.(id, result);
      } catch (err) {
        // Individual failure doesn't stop the batch
        console.error(`Scoring failed for listing ${id}:`, err);
      }
    });
    await Promise.all(promises);
  }

  return results;
}
```

### Alternative: Backend Batch Endpoint

NOT recommended for v2.0. A backend `POST /score/batch` endpoint would:
- Require a new edge function or edge function modification
- Add complexity to error handling (partial failures)
- Lose progressive badge rendering (one badge at a time appearing)

The client-side parallelization preserves the existing per-listing API contract and progressive rendering while being much simpler to implement.

### Files Changed

| File | Change Type | What |
|------|-------------|------|
| `extension/src/lib/api.ts` | MODIFY | Add concurrency parameter, batch with `Promise.all` |
| `extension/src/entrypoints/content/App.tsx` | MODIFY | Pass concurrency to `scoreListings` |

### No Backend Changes Required

The FastAPI backend is already async. Multiple concurrent `POST /score` requests are handled by the event loop. `AsyncAnthropic` handles Claude API calls concurrently. No new endpoints, no batch logic.

### FAB UX Changes

The FAB already shows a scored count badge. For parallel scoring, add a progress indicator:

```
Current: FAB shows spinner -> done
New:     FAB shows "3/12" counter -> done
```

The content script's `handleScore` already calls `onResult` per listing for progressive rendering. The only change is updating the FAB to show progress count.

| File | Change Type | What |
|------|-------------|------|
| `extension/src/entrypoints/content/components/Fab.tsx` | MODIFY | Show progress count during scoring |
| `extension/src/entrypoints/content/App.tsx` | MODIFY | Track total/completed for progress |

---

## Integration 3: Dynamic Preference Schema Changes

### Database Impact

The `profiles.preferences` column is `jsonb NOT NULL DEFAULT '{}'`. No schema migration needed -- JSONB absorbs new fields automatically. The `dynamicFields` array is just new keys in the JSONB blob.

### Schema Synchronization

Three schemas must stay in sync (existing pattern from v1.1):

```
Zod (web/src/lib/schemas/preferences.ts)
  |
  |-- preferencesSchema adds dynamicFields
  |-- Used by: PreferencesForm, chat extraction, server actions

Pydantic (backend/app/models/preferences.py)
  |
  |-- UserPreferences adds dynamic_fields
  |-- Used by: scoring pipeline, prompt builder
  |-- model_validator migrates softCriteria -> dynamicFields

JSONB (profiles.preferences in Supabase)
  |
  |-- Stores whatever the frontend writes
  |-- Backend reads via edge function proxy
```

### New Pydantic Model

```python
class DynamicField(BaseModel):
    """A single AI-generated preference field."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str = Field(description="Stable UUID for this field")
    label: str = Field(description="Human-readable field name")
    description: str = Field(description="What the user means by this")
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
    category: str = Field(default="other", description="Grouping category")

class UserPreferences(BaseModel):
    # ... existing fields ...

    # NEW: replaces soft_criteria for AI-generated fields
    dynamic_fields: list[DynamicField] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_format(cls, data: dict) -> dict:
        # ... existing migrations ...

        # Migrate softCriteria -> dynamicFields (if only softCriteria exists)
        if "softCriteria" in data and "dynamicFields" not in data:
            import uuid
            data["dynamicFields"] = [
                {
                    "id": str(uuid.uuid4()),
                    "label": criterion,
                    "description": criterion,
                    "importance": "medium",
                    "category": "other",
                }
                for criterion in data["softCriteria"]
                if criterion.strip()
            ]
        return data
```

### Prompt Impact

The `build_user_prompt()` in `backend/app/prompts/scoring.py` needs to format dynamic fields:

```python
def _format_dynamic_fields(prefs: UserPreferences) -> str:
    if not prefs.dynamic_fields:
        return "**Custom criteria:** None"

    lines = ["**Custom Criteria:**"]
    for field in prefs.dynamic_fields:
        lines.append(
            f"- {field.label} ({field.importance.value.upper()}): {field.description}"
        )
    return "\n".join(lines)
```

This replaces the current `**Soft criteria:** {", ".join(prefs.soft_criteria)}` line.

### Backward Compatibility

- Old profiles with `softCriteria` continue to work via Pydantic migration
- The `softCriteria` field remains in the Zod schema as optional/deprecated
- Extension does not need changes -- it never reads preferences directly (edge function resolves them)
- The scoring prompt adapts: if `dynamic_fields` is empty but `soft_criteria` is present, fall back to old format

---

## Integration 4: Chrome Extension Distribution

### The Problem

Currently users must load the extension as an unpacked folder via `chrome://extensions` in developer mode. For the hackathon demo and pilot with Vera, this needs to be easier.

### Options Analysis

| Method | Effort | User Experience | Maintenance |
|--------|--------|----------------|-------------|
| Chrome Web Store | High (review process, 5+ days) | Best (1-click install) | Auto-updates |
| Direct .zip download + sideload instructions | Low | Medium (5-step manual process) | Manual |
| Self-hosted .crx | Low | BROKEN (Chrome blocks non-CWS CRX since v68) | N/A |

### Architecture Decision: .zip Download with Guided Install Page

**Use a download page on the Next.js website** that provides:
1. A downloadable .zip of the built extension
2. Step-by-step visual instructions for sideloading
3. Optional: start Chrome Web Store review in parallel

Rationale:
- CRX sideloading no longer works on Chrome for Windows/Mac (blocked since Chrome 68)
- Chrome Web Store takes 5+ days for initial review -- too slow for hackathon timeline
- A .zip + developer mode is the only reliable pre-CWS distribution method
- The guided install page can be replaced with a CWS link once published

### Implementation

**Build pipeline (existing):**
```bash
cd extension && npm run build  # -> dist/chrome-mv3/
```

**New: Package the build output as a .zip in the web app's public directory:**
```bash
cd extension && npm run build && cd dist && zip -r ../../web/public/homematch-extension.zip chrome-mv3/
```

Add this as a script in the extension's `package.json`:
```json
{
  "scripts": {
    "build:dist": "npm run build && cd dist && zip -r ../../web/public/homematch-extension.zip chrome-mv3/"
  }
}
```

**New page: `web/src/app/(dashboard)/extension/page.tsx`** (or public, non-auth page):

```
/extension (or /install-extension)
  +-----------------------------------------+
  |  Install HomeMatch Chrome Extension     |
  |                                         |
  |  [Download Extension (.zip)]            |
  |                                         |
  |  Installation Steps:                    |
  |  1. Download and unzip the file         |
  |  2. Open chrome://extensions            |
  |  3. Enable "Developer mode" toggle      |
  |  4. Click "Load unpacked"              |
  |  5. Select the chrome-mv3 folder        |
  |                                         |
  |  [Screenshot of each step]              |
  +-----------------------------------------+
```

### Considerations

- The .zip must be rebuilt and committed/deployed to Vercel whenever extension code changes
- Consider making this a public (non-auth) page so prospects can see install instructions before signing up
- Add a version number to the .zip filename for cache-busting: `homematch-extension-v2.0.zip`
- Include a note about Chrome Web Store availability coming soon

### Files Changed

| File | Change Type | What |
|------|-------------|------|
| `web/public/homematch-extension.zip` | NEW | Built extension archive |
| `web/src/app/install/page.tsx` | NEW | Download + install guide page |
| `extension/package.json` | MODIFY | Add `build:dist` script |
| `web/src/components/top-navbar.tsx` | MODIFY | Add nav link to install page |

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Chat Interface (NEW) | Multi-turn conversation for preference discovery | Vercel AI SDK -> Claude API |
| Preference Review (NEW) | Display/edit AI-generated fields before saving | Supabase (profiles table) |
| Chat API Route (NEW) | Server-side streaming endpoint for chat | Claude API via `@ai-sdk/anthropic` |
| Dynamic Fields Schema (MOD) | Extended preference data model | All layers (Zod, JSONB, Pydantic) |
| Parallel Scorer (MOD) | Concurrent listing scoring from extension | Edge function -> EC2 -> Claude API |
| Install Page (NEW) | Extension distribution | Static .zip download |
| Scoring Prompt (MOD) | Formats dynamic fields for Claude evaluation | Backend prompt builder |

---

## Data Flow Changes

### New Flow: Chat-Based Preference Creation

```
1. User navigates to /profiles/[id]/chat
2. ChatInterface renders with useChat() hook
3. User types: "I need a quiet 3-room apartment near Zurich HB,
   max CHF 2500, natural light is very important"
4. POST /api/chat -> streamText(anthropic('claude-haiku-4-5'), messages)
5. Claude asks: "What's your budget range? Any must-have features?"
6. ... multi-turn conversation (2-5 turns) ...
7. User clicks "Generate Preferences"
8. generateObject() with dynamicPreferenceSchema extracts structured fields
9. PreferenceReview component shows:
   - Standard fields auto-populated (location: "Zurich", budgetMax: 2500, roomsMin: 3)
   - Dynamic fields: [{label: "Natural light", importance: "critical", ...},
                       {label: "Quiet location", importance: "high", ...}]
10. User reviews, edits if needed, confirms
11. Server action: merge into profiles.preferences JSONB
12. Profile ready for scoring
```

### Modified Flow: Parallel Scoring

```
1. User clicks FAB on Flatfox.ch
2. Content script extracts N listing PKs from DOM (existing)
3. Loading skeletons injected for all N listings (existing)
4. scoreListings(pks, jwt, onResult, concurrency=5) -- MODIFIED
5. Batch 1: 5 concurrent requests -> edge function -> EC2 -> Claude
   Each result triggers onResult -> badge appears immediately
6. Batch 2: next 5 concurrent requests
   ...
7. All N badges rendered
```

### Unchanged Flows

- Profile CRUD on web app (no changes)
- Profile switching in extension popup (no changes)
- Stale badge detection (no changes)
- Analysis page viewing (no changes, but will render dynamic fields in checklist)
- Edge function score-proxy (no changes -- already handles concurrent requests)

---

## Patterns to Follow

### Pattern 1: Vercel AI SDK Server Action Chat

**What:** Use the Vercel AI SDK `useChat` hook + API route pattern for streaming chat.
**When:** Any time the web app needs multi-turn Claude conversation.
**Why:** Built-in streaming, message management, error handling. No custom WebSocket or SSE code needed.

```typescript
// API route (server)
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: '...',
    messages,
  })
  return result.toDataStreamResponse()
}

// Component (client)
import { useChat } from '@ai-sdk/react'

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  // render chat UI
}
```

### Pattern 2: Structured Extraction at Conversation End

**What:** After multi-turn chat, use `generateObject` with Zod schema for guaranteed structured output.
**When:** Converting free-form conversation into structured preference data.
**Why:** Claude's structured output mode guarantees schema compliance. No parsing errors.

```typescript
import { generateObject } from 'ai'

const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5'),
  schema: dynamicPreferenceSchema,
  prompt: `Based on this conversation, extract structured preferences:\n${conversationText}`,
})
```

### Pattern 3: Batched Concurrency with Progressive Results

**What:** Process N items in batches of K, calling a callback as each completes.
**When:** Parallel API calls with rate limit awareness.
**Why:** `Promise.all` on the full list could overwhelm rate limits; sequential is too slow.

```typescript
async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  onResult: (item: T, result: R) => void,
  concurrency: number = 5,
): Promise<Map<T, R>> {
  const results = new Map<T, R>();
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(async (item) => {
      const result = await fn(item);
      results.set(item, result);
      onResult(item, result);
    }));
  }
  return results;
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Routing Chat Through EC2 Backend

**What:** Adding a `/chat` endpoint to the FastAPI backend for preference discovery.
**Why bad:** Couples unrelated concerns (scoring pipeline vs. preference chat), adds latency (extra hop through edge function), and the backend lacks streaming infrastructure.
**Instead:** Use Vercel AI SDK directly from Next.js server actions or API routes. The web app already has direct access to Supabase for saving results.

### Anti-Pattern 2: Full-List Promise.all for Parallel Scoring

**What:** `await Promise.all(allListingIds.map(id => scoreListing(id, jwt)))` -- firing all requests simultaneously.
**Why bad:** 20+ concurrent Claude API calls will hit RPM/ITPM rate limits. At Tier 1, 50 RPM with token bucket means burst is possible but sustained 20+ concurrent requests with image content will hit ITPM.
**Instead:** Batch with concurrency limit (5-10). Use the batched concurrency pattern above.

### Anti-Pattern 3: Storing Chat History in Database

**What:** Saving every chat message to Supabase for the preference discovery conversation.
**Why bad:** The chat is ephemeral -- its purpose is to generate structured preferences. Once preferences are extracted and saved, the conversation has no value. Storing it adds schema complexity and storage cost.
**Instead:** Keep chat history in React state only. The output (dynamicFields) is what gets persisted.

### Anti-Pattern 4: Two Separate Preference Edit UIs

**What:** Having the chat generate preferences that bypass the form, creating two disconnected editing paths.
**Why bad:** Users lose the ability to fine-tune AI-generated preferences. Creates data inconsistency risk.
**Instead:** Chat outputs structured data that populates the existing form. The form is always the final editing UI. Chat is an alternative to manual entry, not a replacement for it.

### Anti-Pattern 5: CRX Self-Hosting

**What:** Hosting a .crx file on the website for direct extension install.
**Why bad:** Chrome blocks .crx installs from non-Chrome-Web-Store sources since Chrome 68 (2018) on Windows and Mac. Users would see an error.
**Instead:** Distribute as .zip with developer mode sideload instructions. Plan for Chrome Web Store submission in parallel.

---

## Scalability Considerations

| Concern | Current (v1.1) | v2.0 Changes | Future Scale |
|---------|----------------|--------------|--------------|
| Scoring throughput | Sequential (1 req/time) | 5 concurrent/user | Rate limit tiers or batch API |
| Chat API cost | N/A | ~2-5K tokens per chat session | Negligible -- Haiku is $0.80/M input |
| DB storage | JSONB preferences ~1KB | +dynamicFields ~2KB | No concern, still small JSONB |
| Edge function concurrency | 1 request/user | 5 concurrent/user | Supabase auto-scales edge functions |
| Extension distribution | Manual sideload | .zip download page | Chrome Web Store |
| Claude API key exposure | EC2 only (safe) | Also Vercel env (safe) | Both server-side, never client |

---

## Build Order (Dependency-Aware)

The four features have minimal inter-dependencies. Recommended build order based on what unblocks what:

### Phase 1: Dynamic Preference Schema
**Why first:** Every other feature touches the preferences schema. Get the schema right before building UI or modifying scoring.
- Add `dynamicFields` to Zod schema
- Add `DynamicField` + `dynamic_fields` to Pydantic model
- Add migration validator for `softCriteria` -> `dynamicFields`
- Update `build_user_prompt()` to format dynamic fields
- Update scoring prompt instructions for dynamic fields

### Phase 2: Chat-Based Preference Discovery
**Why second:** Depends on Phase 1 schema. The biggest new feature surface area.
- Install Vercel AI SDK + Anthropic provider
- Create API route for streaming chat
- Build ChatInterface component with `useChat`
- Build PreferenceReview component for editing extracted fields
- Create preference discovery system prompt
- Wire chat output into profile preferences form
- Integration test: chat -> extract -> save -> score

### Phase 3: Parallel Scoring
**Why third:** Independent of schema changes, but lower effort. Quick win.
- Modify `scoreListings()` with concurrency parameter
- Add progress counter to FAB component
- Update content script to track scoring progress
- Test with 10+ listings on a Flatfox search page

### Phase 4: UI Redesign + Extension Distribution
**Why last:** Pure UX, no architectural dependencies on other phases. Can be split across phases.
- Flatfox-inspired color scheme (CSS/Tailwind changes only)
- Extension download page with install instructions
- Build script for .zip packaging
- Chrome Web Store submission (parallel, async)

---

## Environment Variable Summary

| Variable | Service | Purpose | Exists? |
|----------|---------|---------|---------|
| `ANTHROPIC_API_KEY` | EC2 Backend | Claude API for scoring | YES |
| `ANTHROPIC_API_KEY` | Vercel (web) | Claude API for chat | NEW |
| `SUPABASE_URL` | All | Database | YES |
| `SUPABASE_ANON_KEY` | Web, Extension | Client-side Supabase | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | EC2 Backend | Server-side DB writes | YES |
| `BACKEND_URL` | Edge Function | EC2 address | YES |
| `CLAUDE_MODEL` | EC2 Backend | Model selection | YES |

Note: The `ANTHROPIC_API_KEY` for Vercel can be the same key as the backend, or a separate key for cost tracking. Vercel environment variables are set in the project settings dashboard and are never exposed to the client.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Chat generates incorrect preference structure | Medium | Low | `generateObject` with Zod schema guarantees structure; user reviews before saving |
| Parallel scoring hits rate limits | Medium | Medium | Concurrency limit of 5; exponential backoff on 429; monitor via response headers |
| Schema migration breaks old profiles | Low | High | Pydantic `model_validator` handles migration; test with real v1.1 JSONB data |
| Vercel AI SDK version incompatibility | Low | Low | Pin to specific version; AI SDK is mature and stable |
| Extension .zip download blocked by browser | Low | Low | .zip is not .crx; browsers do not block .zip downloads |

---

## Sources

- [Anthropic Rate Limits (official docs)](https://platform.claude.com/docs/en/api/rate-limits) -- Tier-specific RPM, ITPM, OTPM for all models. HIGH confidence.
- [Anthropic Structured Outputs (official docs)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- Schema-guaranteed JSON output. HIGH confidence.
- [Vercel AI SDK - Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- `@ai-sdk/anthropic` installation, supported functions, model IDs. HIGH confidence.
- [Vercel AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) -- Server actions, `streamText`, `useChat` patterns. HIGH confidence.
- [Chrome Extension Sideloading](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/) -- Developer mode + load unpacked process. HIGH confidence.
- [Chrome CRX restrictions](https://www.chromium.org/developers/extensions-deployment-faq/) -- CRX blocked from non-CWS sources since Chrome 68. HIGH confidence.
- [FastAPI Concurrency](https://fastapi.tiangolo.com/async/) -- Async concurrency model, `asyncio.gather` patterns. HIGH confidence.
