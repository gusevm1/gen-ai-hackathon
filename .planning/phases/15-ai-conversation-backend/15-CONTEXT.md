# Phase 15: AI Conversation Backend - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a stateless POST /chat endpoint to the EC2 FastAPI backend. The frontend sends the full conversation history + latest user message with each request (no server-side session state). Claude processes the history and returns a conversational response. When Claude has gathered sufficient preference information, it signals readiness via a `ready_to_summarize` boolean and includes extracted structured preferences in the response. The frontend handles all state — the backend is purely request/response.

</domain>

<decisions>
## Implementation Decisions

### Endpoint Design
- Route: `POST /chat` (new router `backend/app/routers/chat.py`)
- Request body: `ChatRequest` with fields:
  - `messages: list[dict]` — full conversation history, each `{role: "user"|"assistant", content: str}`
  - `profile_name: str` — profile name entered by user (used in system prompt context)
- Response body: `ChatResponse` with fields:
  - `message: str` — Claude's conversational response text
  - `ready_to_summarize: bool` — true when Claude signals sufficient info gathered
  - `extracted_preferences: dict | None` — full structured preferences when ready_to_summarize=true, else null
- No streaming — full response returned as JSON (per v3.0 scope decision)
- No server-side session state — frontend sends full history every request

### Claude Model & Client
- Use the existing `AsyncAnthropic` singleton pattern from `backend/app/services/claude.py`
- New service class `ConversationService` in `backend/app/services/conversation.py` following the same lazy-init pattern as `ClaudeScorer`
- Model: `claude-sonnet-4-6` (better conversation quality than haiku for preference extraction); configurable via `CHAT_MODEL` env var with fallback to `claude-sonnet-4-6`
- NOT using structured output (messages.parse) — plain messages.create since we need the extraction to happen naturally in conversation, then signalled via response structure

### System Prompt Strategy
- System prompt instructs Claude to:
  1. Act as a friendly Swiss property search advisor
  2. Help user articulate their ideal property in natural language
  3. Gradually extract: location (city/neighborhood), budget (CHF min/max), property type (apartment/house/studio), rooms (min/max), living space (sqm), lifestyle preferences (balcony, garden, quiet, etc.), nearby amenities (train, schools, supermarkets, cafés)
  4. Infer importance levels from language: "absolutely must" / "essential" → critical, "really want" → high, "would be nice" → medium, "not important" → low, "must NOT have" / "dealbreaker" → dealbreaker
  5. Ask ONE targeted follow-up question at a time when key info is missing
  6. When enough information is gathered (at minimum: location, budget, property type), respond with a special JSON block `<preferences_ready>` embedded in the response text containing the structured preferences dict
- The backend parses the response to detect `<preferences_ready>` and sets `ready_to_summarize=true` + extracts the JSON

### Structured Preferences Schema (extracted output)
The extracted preferences dict must match the existing `UserPreferences` Pydantic model structure used by the scoring pipeline:
```python
{
  "location": str,                        # e.g. "Zurich, Kreis 4"
  "offer_type": "rent" | "buy",           # default "rent" if not mentioned
  "object_types": list[str],              # ["apartment", "house", "studio"]
  "min_rooms": float | None,
  "max_rooms": float | None,
  "min_living_space": float | None,
  "max_living_space": float | None,
  "min_price": float | None,
  "max_price": float | None,
  "price_is_dealbreaker": bool,           # default false
  "rooms_is_dealbreaker": bool,           # default false
  "space_is_dealbreaker": bool,           # default false
  "floor_preference": "any" | "not_ground" | "high",
  "availability": "any" | str,
  "features": list[str],                  # ["balcony", "garden", "elevator", "parking", "pets", "new_build"]
  "soft_criteria": list[str],             # free text tags
  "importance": {
    "location": "critical" | "high" | "medium" | "low",
    "price": "critical" | "high" | "medium" | "low",
    "size": "critical" | "high" | "medium" | "low",
    "features": "critical" | "high" | "medium" | "low",
    "condition": "critical" | "high" | "medium" | "low"
  }
}
```

### CORS & Auth
- No auth on /chat endpoint — the edge function / frontend calls it directly
- CORS already set to allow_origins=["*"] in main.py — no changes needed
- The frontend will call the EC2 backend URL directly (same as the scoring endpoint pattern, proxied via Supabase edge function or called directly — follows existing pattern)

### Frontend Integration
- The Next.js chat page already has a `sendMessage` handler with mock setTimeout response
- Replace the mock with: `fetch('${BACKEND_URL}/chat', {method: 'POST', body: JSON.stringify({messages, profile_name})})`
- The backend URL comes from `NEXT_PUBLIC_BACKEND_URL` env var (already exists for scoring)
- When response has `ready_to_summarize: true`, the frontend transitions to the summary view (Phase 16)

### Claude's Discretion
- Exact phrasing of the system prompt beyond the requirements above
- Whether to include a brief "I have enough info" message before the `<preferences_ready>` block or just the block
- How many exchanges before Claude typically signals readiness (heuristic in prompt)
- Error handling details for malformed Claude responses

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/services/claude.py` — `ClaudeScorer` class with lazy `AsyncAnthropic` client init; replicate this pattern exactly in new `ConversationService`
- `backend/app/models/preferences.py` — `UserPreferences` Pydantic model; the extracted preferences dict must match this schema
- `backend/app/routers/scoring.py` — Router pattern with `APIRouter(prefix="/score")`, imports services; replicate for `/chat`
- `backend/app/main.py` — Registers routers via `app.include_router()`; add `chat.router` here
- `ANTHROPIC_API_KEY` — already set on EC2, read automatically by `AsyncAnthropic()`

### Established Patterns
- All routers: `APIRouter(prefix="/{name}", tags=["name"])` with async endpoint functions
- Service classes: singleton instances at module level (`claude_scorer = ClaudeScorer()`)
- Pydantic models in `backend/app/models/` — separate file per domain
- Error handling: `HTTPException` with status codes (502 for upstream failures)
- Async: all IO is `await`-ed, services use `async def`
- Environment variables: `os.environ.get("VAR_NAME", "default")`

### Integration Points
- `backend/app/main.py`: add `from app.routers import chat` and `app.include_router(chat.router)`
- New files: `backend/app/routers/chat.py`, `backend/app/services/conversation.py`, `backend/app/models/chat.py`
- `web/src/components/chat/chat-page.tsx`: replace mock `setTimeout` with real `fetch` to `/chat` endpoint
- The `NEXT_PUBLIC_BACKEND_URL` env var (already in Vercel config for scoring) is reused

</code_context>

<specifics>
## Specific Ideas

- The `<preferences_ready>` sentinel tag in Claude's response is the cleanest way to signal readiness without requiring structured output parsing — backend strips the tag and parses the JSON between the tags
- The conversation service should be purely stateless — no in-memory conversation storage on the server side; all history comes from the frontend
- Use `claude-sonnet-4-6` for better Swiss/German property domain understanding vs haiku
- The system prompt should explicitly mention Swiss context (CHF, Swiss cities, Swiss property portal conventions)

</specifics>

<deferred>
## Deferred Ideas

- Streaming responses (real-time typing effect) — explicitly deferred to future milestone
- Server-side conversation persistence — explicitly out of scope (ephemeral sessions)
- Auth on /chat endpoint — can be added later; v3.0 ships without it matching existing pattern
- Rate limiting — not in v3.0 scope

</deferred>
