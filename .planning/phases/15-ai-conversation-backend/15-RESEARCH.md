# Phase 15: AI Conversation Backend - Research

**Researched:** 2026-03-17
**Domain:** FastAPI + Anthropic Python SDK multi-turn conversation endpoint
**Confidence:** HIGH

## Summary

This phase adds a stateless `POST /chat` endpoint to the existing EC2 FastAPI backend. The endpoint receives full conversation history from the frontend, forwards it to Claude (Sonnet 4.6) with a Swiss property advisor system prompt, and returns a conversational response. When Claude determines it has gathered enough preference information, it embeds a `<preferences_ready>` JSON block in its response, which the backend parses and returns as structured data.

The existing codebase provides strong patterns to follow. The `ClaudeScorer` service in `backend/app/services/claude.py` demonstrates the lazy-init `AsyncAnthropic` singleton pattern. The scoring router in `backend/app/routers/scoring.py` shows the standard `APIRouter` registration pattern. The `UserPreferences` Pydantic model in `backend/app/models/preferences.py` defines the exact schema the extracted preferences must match. No new dependencies are needed -- `anthropic` and `fastapi` are already installed.

**Primary recommendation:** Replicate the existing service/router/model pattern exactly. The only novel work is (1) the conversation system prompt, (2) parsing the `<preferences_ready>` sentinel from Claude's response, and (3) wiring up the frontend to call the real endpoint instead of the mock.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Route: `POST /chat` (new router `backend/app/routers/chat.py`)
- Request: `ChatRequest` with `messages: list[dict]` and `profile_name: str`
- Response: `ChatResponse` with `message: str`, `ready_to_summarize: bool`, `extracted_preferences: dict | None`
- No streaming -- full JSON response
- No server-side session state -- frontend sends full history every request
- Use existing `AsyncAnthropic` singleton pattern in new `ConversationService` class in `backend/app/services/conversation.py`
- Model: `claude-sonnet-4-6` configurable via `CHAT_MODEL` env var
- NOT using `messages.parse()` -- plain `messages.create()`
- `<preferences_ready>` sentinel tag in Claude response for signaling readiness
- Extracted preferences dict must match `UserPreferences` Pydantic model structure
- No auth on `/chat` endpoint
- CORS already configured (allow_origins=["*"])
- Frontend replaces mock `setTimeout` with real fetch to `/chat`
- New files: `backend/app/routers/chat.py`, `backend/app/services/conversation.py`, `backend/app/models/chat.py`
- Register router in `backend/app/main.py`

### Claude's Discretion
- Exact phrasing of the system prompt beyond stated requirements
- Whether to include a brief "I have enough info" message before the `<preferences_ready>` block
- How many exchanges before Claude typically signals readiness (heuristic in prompt)
- Error handling details for malformed Claude responses

### Deferred Ideas (OUT OF SCOPE)
- Streaming responses (real-time typing effect)
- Server-side conversation persistence
- Auth on /chat endpoint
- Rate limiting
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | New FastAPI endpoint on EC2 handles multi-turn conversation state and calls Claude via ANTHROPIC_API_KEY | Existing `ClaudeScorer` pattern provides exact template; `AsyncAnthropic()` auto-reads env var; stateless endpoint receives full history from frontend |
| AI-02 | Claude extracts structured preferences: location, budget, property type, rooms, size, lifestyle, amenities, importance levels | System prompt instructs extraction; `<preferences_ready>` sentinel carries JSON matching `UserPreferences` schema; backend parses and validates |
| AI-03 | Claude asks targeted follow-up questions when key fields missing/unclear | System prompt strategy: ask ONE follow-up at a time; minimum required fields: location, budget, property type |
| AI-04 | Claude infers importance levels from language cues | System prompt maps language patterns to importance levels (critical/high/medium/low/dealbreaker) |
| AI-05 | Claude signals when it has sufficient information | `<preferences_ready>` tag embedded in response text; backend detects tag, sets `ready_to_summarize=true`, extracts JSON |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | (already installed) | AsyncAnthropic client for Claude API | Already used by ClaudeScorer; no version change needed |
| fastapi | (already installed) | API framework | Existing backend framework |
| pydantic | (already installed) | Request/response models | Existing pattern for all models |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| re (stdlib) | N/A | Parse `<preferences_ready>` from response | Extracting JSON block from Claude response text |
| json (stdlib) | N/A | Parse extracted JSON string | Converting preference JSON string to dict |
| logging (stdlib) | N/A | Request/response logging | Following existing scoring router pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<preferences_ready>` sentinel | `messages.parse()` structured output | Sentinel is simpler; structured output would require separate extraction call and break conversational flow |
| Plain `messages.create()` | Tool use / function calling | Overkill for this use case; sentinel parsing is sufficient |

**Installation:** No new packages required. All dependencies already in `backend/requirements.txt`.

## Architecture Patterns

### New Files
```
backend/app/
  models/
    chat.py              # ChatRequest, ChatResponse Pydantic models
  routers/
    chat.py              # POST /chat endpoint
  services/
    conversation.py      # ConversationService class (AsyncAnthropic wrapper)
  prompts/
    conversation.py      # System prompt builder for chat
```

### Pattern 1: Service Singleton (replicate from ClaudeScorer)
**What:** Lazy-initialized AsyncAnthropic client as module-level singleton
**When to use:** All Claude API calls
**Example:**
```python
# Source: backend/app/services/claude.py (existing pattern)
class ConversationService:
    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic()
        return self._client

    async def chat(self, messages: list[dict], profile_name: str) -> tuple[str, bool, dict | None]:
        client = self.get_client()
        response = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=2048,
            system=build_conversation_system_prompt(),
            messages=messages,
        )
        text = response.content[0].text
        ready, prefs = parse_preferences_ready(text)
        clean_text = strip_preferences_tag(text) if ready else text
        return clean_text, ready, prefs

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

conversation_service = ConversationService()
```

### Pattern 2: Router Registration (replicate from scoring.py)
**What:** APIRouter with prefix, tags, async endpoint, HTTPException error handling
**When to use:** The /chat endpoint
**Example:**
```python
# Source: backend/app/routers/scoring.py (existing pattern)
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        message, ready, prefs = await conversation_service.chat(
            request.messages, request.profile_name
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat failed: {e}")
    return ChatResponse(
        message=message,
        ready_to_summarize=ready,
        extracted_preferences=prefs,
    )
```

### Pattern 3: Sentinel Tag Parsing
**What:** Extract JSON from `<preferences_ready>...</preferences_ready>` in Claude's response
**When to use:** Every response from ConversationService
**Example:**
```python
import re
import json

PREFS_PATTERN = re.compile(
    r"<preferences_ready>\s*(.*?)\s*</preferences_ready>",
    re.DOTALL,
)

def parse_preferences_ready(text: str) -> tuple[bool, dict | None]:
    match = PREFS_PATTERN.search(text)
    if not match:
        return False, None
    try:
        prefs = json.loads(match.group(1))
        return True, prefs
    except json.JSONDecodeError:
        return False, None

def strip_preferences_tag(text: str) -> str:
    return PREFS_PATTERN.sub("", text).strip()
```

### Pattern 4: Multi-turn Message Format
**What:** Anthropic Messages API expects alternating user/assistant messages
**When to use:** Building the messages list for `client.messages.create()`
**Critical detail:** The Anthropic API requires messages to alternate between `user` and `assistant` roles. The frontend already structures messages this way. The backend passes them directly.
```python
# Frontend sends:
{
    "messages": [
        {"role": "user", "content": "I'm looking for a 3-room apartment in Zurich..."},
        {"role": "assistant", "content": "That sounds great! What's your budget range?"},
        {"role": "user", "content": "Around 2000-2500 CHF per month"}
    ],
    "profile_name": "Zurich Search"
}
```

### Anti-Patterns to Avoid
- **Storing conversation state on the server:** The endpoint is stateless. All history comes from the client. No in-memory dicts, no session IDs.
- **Using messages.parse() for chat:** This endpoint needs natural conversation, not structured output. Use plain `messages.create()`.
- **Forgetting to close the client in lifespan:** Must add `conversation_service.close()` to the `lifespan` shutdown in `main.py`.
- **Not stripping the sentinel tag from the message:** The `<preferences_ready>` block should be stripped from `message` before returning to the frontend -- the user should not see raw XML/JSON.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude API client | Custom HTTP client | `AsyncAnthropic` from `anthropic` SDK | Handles auth, retries, rate limits, error types |
| JSON extraction from text | Fragile string splitting | Regex with `re.DOTALL` flag | Handles multiline JSON, whitespace variations |
| Preference validation | Manual dict checking | `UserPreferences.model_validate()` | Already handles camelCase aliases, legacy migration, defaults |
| Message role validation | Custom checks | Pydantic model with `Literal["user", "assistant"]` | Type-safe at the API boundary |

**Key insight:** The entire backend infrastructure already exists. This phase is fundamentally "write a new router that calls Claude with a different prompt and parses the response differently." No new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: Message Role Alternation
**What goes wrong:** Anthropic API returns 400 if messages don't alternate user/assistant roles, or if first message isn't from user.
**Why it happens:** Frontend bug sends two consecutive user messages, or conversation starts with assistant message.
**How to avoid:** Validate in the endpoint that messages alternate and start with "user". Return 422 with clear error if not.
**Warning signs:** 400 errors from Anthropic API in logs.

### Pitfall 2: Claude Doesn't Emit the Sentinel Tag
**What goes wrong:** Claude sometimes forgets to include `<preferences_ready>` even when it has enough info, or emits malformed JSON inside the tags.
**Why it happens:** System prompt instructions can be ignored or partially followed by the model.
**How to avoid:** (1) Make the system prompt very explicit about when and how to emit the tag. (2) Handle the "no tag found" case gracefully -- just return `ready_to_summarize=false`. (3) If JSON inside the tag is malformed, also return `ready_to_summarize=false` and let the conversation continue.
**Warning signs:** Users report the conversation goes on forever without reaching summary.

### Pitfall 3: Token Limit Exceeded with Long Conversations
**What goes wrong:** Sending full conversation history on every request eventually exceeds the model's context window.
**Why it happens:** Users have very long conversations (10+ exchanges), each with long messages.
**How to avoid:** Set a reasonable `max_tokens` for output (2048 is plenty for a conversational response). For input, Claude Sonnet 4.6 has a 200K context window -- unlikely to hit with normal conversations (5-8 exchanges). If needed, truncate older messages or add a message count limit (e.g., 20 turns).
**Warning signs:** 400 errors with "context length exceeded" from Anthropic.

### Pitfall 4: Extracted Preferences Schema Mismatch
**What goes wrong:** Claude outputs a preferences JSON that doesn't match `UserPreferences` field names or enum values exactly.
**Why it happens:** The system prompt describes the schema in natural language, and Claude may use slightly different key names or values.
**How to avoid:** Include the exact JSON schema with field names in the system prompt. Use `UserPreferences.model_validate()` with `extra="ignore"` (already configured) to be tolerant of extra fields. Provide defaults for missing fields.
**Warning signs:** Pydantic validation errors when trying to parse extracted preferences.

### Pitfall 5: CORS Preflight for New Route
**What goes wrong:** Browser blocks requests to `/chat` with CORS error.
**Why it happens:** Unlikely since CORS is already set to `allow_origins=["*"]` with all methods/headers, but worth verifying.
**How to avoid:** The existing CORS middleware in `main.py` already covers all routes. No changes needed.
**Warning signs:** Browser console shows CORS preflight failure.

### Pitfall 6: Forgetting to Register Router in main.py
**What goes wrong:** `/chat` returns 404.
**Why it happens:** New router file created but not imported and registered.
**How to avoid:** Add `from app.routers import chat` and `app.include_router(chat.router)` in `main.py`.
**Warning signs:** 404 on POST /chat.

## Code Examples

### ChatRequest / ChatResponse Models
```python
# backend/app/models/chat.py
from typing import Literal, Optional
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    profile_name: str = Field(min_length=1, max_length=100)

class ChatResponse(BaseModel):
    message: str
    ready_to_summarize: bool = False
    extracted_preferences: Optional[dict] = None
```

### System Prompt Structure (conversation.py in prompts/)
```python
# backend/app/prompts/conversation.py
def build_conversation_system_prompt() -> str:
    return """You are a friendly Swiss property search advisor helping users describe their ideal home.

GOAL: Through natural conversation, extract the user's property preferences to build a structured search profile.

INFORMATION TO GATHER:
- Location: city, neighborhood, canton (Swiss context)
- Budget: CHF min/max, rent vs buy
- Property type: apartment, house, studio
- Rooms: min/max number of rooms
- Living space: sqm range
- Floor preference: any, not ground, high
- Features: balcony, garden, elevator, parking, pets allowed, new build
- Lifestyle/soft criteria: quiet, near public transport, near schools, near shops, etc.
- Importance levels for each category

IMPORTANCE INFERENCE:
- "absolutely must" / "essential" / "non-negotiable" -> critical
- "really want" / "very important" -> high
- "would be nice" / "prefer" -> medium
- "not important" / "don't care" -> low
- "must NOT have" / "dealbreaker if over/under" -> mark as dealbreaker

CONVERSATION RULES:
1. Ask ONE targeted follow-up question at a time
2. Be conversational and friendly, not like a form
3. Acknowledge what the user has told you before asking the next question
4. Use Swiss context (CHF, Swiss cities, Swiss property conventions)

READINESS SIGNAL:
When you have gathered sufficient information (at minimum: location, budget range, property type), AND the user seems satisfied with the conversation, include this block at the end of your response:

<preferences_ready>
{
  "location": "...",
  "offer_type": "rent" or "buy",
  "object_types": ["apartment", "house", "studio"],
  "min_rooms": null or number,
  "max_rooms": null or number,
  "min_living_space": null or number,
  "max_living_space": null or number,
  "min_price": null or number,
  "max_price": null or number,
  "price_is_dealbreaker": true/false,
  "rooms_is_dealbreaker": true/false,
  "space_is_dealbreaker": true/false,
  "floor_preference": "any" or "not_ground" or "high",
  "availability": "any" or specific,
  "features": [...],
  "soft_criteria": [...],
  "importance": {
    "location": "critical"/"high"/"medium"/"low",
    "price": "critical"/"high"/"medium"/"low",
    "size": "critical"/"high"/"medium"/"low",
    "features": "critical"/"high"/"medium"/"low",
    "condition": "critical"/"high"/"medium"/"low"
  }
}
</preferences_ready>

Include a brief summary message before the block telling the user you have enough information to create their profile.
Do NOT include the <preferences_ready> block until you have at least: location, budget, and property type."""
```

### Preferences Mapping (extracted dict to UserPreferences)
The extracted preferences use a simplified schema from the system prompt. The backend must map it to the `UserPreferences` Pydantic model:

```python
def map_extracted_to_user_preferences(extracted: dict) -> dict:
    """Map Claude's extracted preferences to UserPreferences-compatible dict."""
    # Map object_types list to single object_category enum
    types = extracted.get("object_types", [])
    if "house" in types:
        obj_cat = "HOUSE"
    elif "apartment" in types or "studio" in types:
        obj_cat = "APARTMENT"
    else:
        obj_cat = "ANY"

    # Map offer_type string to enum
    offer = extracted.get("offer_type", "rent")
    offer_type = "SALE" if offer.lower() == "buy" else "RENT"

    return {
        "location": extracted.get("location", ""),
        "offerType": offer_type,
        "objectCategory": obj_cat,
        "budgetMin": extracted.get("min_price"),
        "budgetMax": extracted.get("max_price"),
        "budgetDealbreaker": extracted.get("price_is_dealbreaker", False),
        "roomsMin": extracted.get("min_rooms"),
        "roomsMax": extracted.get("max_rooms"),
        "roomsDealbreaker": extracted.get("rooms_is_dealbreaker", False),
        "livingSpaceMin": extracted.get("min_living_space"),
        "livingSpaceMax": extracted.get("max_living_space"),
        "livingSpaceDealbreaker": extracted.get("space_is_dealbreaker", False),
        "floorPreference": extracted.get("floor_preference", "any"),
        "availability": extracted.get("availability", "any"),
        "features": extracted.get("features", []),
        "softCriteria": extracted.get("soft_criteria", []),
        "importance": extracted.get("importance", {}),
    }
```

**Important:** The CONTEXT.md says `extracted_preferences` should be a `dict | None` in the response. The planner should decide whether to return the raw Claude-extracted dict (matching the prompt schema) or the mapped UserPreferences-compatible dict. Recommendation: return the mapped dict so the frontend can directly use it for profile creation in Phase 16.

### Frontend Integration (replace mock)
```typescript
// web/src/components/chat/chat-page.tsx
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

const triggerAIResponse = async (userMessage: string) => {
  setIsTyping(true)
  try {
    const allMessages = [...messages, { role: 'user', content: userMessage }]
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        profile_name: profileName,
      }),
    })
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`)
    const data = await res.json()
    // data.message, data.ready_to_summarize, data.extracted_preferences
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.message,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])
    if (data.ready_to_summarize && data.extracted_preferences) {
      // Transition to summary view (Phase 16)
    }
  } catch (err) {
    // Show error to user
  } finally {
    setIsTyping(false)
  }
}
```

### main.py Registration
```python
# Add to imports
from app.routers import chat

# Add after existing router registrations
app.include_router(chat.router)

# Add to lifespan shutdown
from app.services.conversation import conversation_service
# In lifespan:
await conversation_service.close()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude 2 / completion API | Claude Messages API (Sonnet 4.6) | 2024-2025 | Multi-turn is native; use `messages` param with role/content dicts |
| Structured output via prompt engineering | `messages.parse()` with Pydantic | 2024 | Available but NOT used here -- sentinel approach is better for conversational flow |
| Streaming via SSE | Non-streaming JSON response | N/A (design choice) | Simpler implementation; streaming deferred to future |

**Note on `messages.create()` vs `messages.parse()`:** The existing `ClaudeScorer` uses `messages.parse()` with `output_format=ScoreResponse` for guaranteed structured output. The chat endpoint deliberately does NOT use this because:
1. The response must be natural conversation, not structured JSON
2. The `<preferences_ready>` sentinel approach lets Claude decide when to signal readiness within the conversational flow
3. `messages.parse()` would force every response into a rigid structure

## Open Questions

1. **Max conversation length**
   - What we know: Claude Sonnet 4.6 has 200K token context window; typical conversations will be 5-8 exchanges
   - What's unclear: Should there be a hard limit on number of messages sent to the API?
   - Recommendation: Start without a limit; add a 20-turn cap only if costs become a concern

2. **Preferences validation before returning**
   - What we know: Claude may output JSON that doesn't perfectly match UserPreferences schema
   - What's unclear: Should the backend validate extracted preferences through `UserPreferences.model_validate()` before returning, or return raw and let frontend/Phase 16 handle validation?
   - Recommendation: Validate with `model_validate()` in the backend; if validation fails, return `ready_to_summarize=false` and let conversation continue

3. **Profile name usage in system prompt**
   - What we know: `profile_name` is sent in the request
   - What's unclear: Whether to include it in the system prompt or just pass it through
   - Recommendation: Include it minimally (e.g., "The user is creating a profile called '{profile_name}'") for context

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | `backend/pyproject.toml` (`[tool.pytest.ini_options]` with `asyncio_mode = "auto"`) |
| Quick run command | `cd backend && python -m pytest tests/test_chat.py -x` |
| Full suite command | `cd backend && python -m pytest tests/ -x` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | POST /chat returns ChatResponse | unit | `cd backend && python -m pytest tests/test_chat_endpoint.py -x` | No -- Wave 0 |
| AI-02 | Preferences extraction from `<preferences_ready>` tag | unit | `cd backend && python -m pytest tests/test_conversation.py::test_parse_preferences -x` | No -- Wave 0 |
| AI-03 | Follow-up question behavior | manual-only | Manual: send partial preferences, verify Claude asks follow-up | N/A |
| AI-04 | Importance inference from language | manual-only | Manual: use "absolutely must" language, verify critical importance | N/A |
| AI-05 | Ready signal when sufficient info gathered | unit | `cd backend && python -m pytest tests/test_conversation.py::test_ready_signal -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_chat_endpoint.py tests/test_conversation.py -x`
- **Per wave merge:** `cd backend && python -m pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_chat_endpoint.py` -- covers AI-01 (endpoint returns correct response shape, 422 on bad input)
- [ ] `backend/tests/test_conversation.py` -- covers AI-02, AI-05 (sentinel parsing, preference extraction, schema mapping)
- [ ] Fixtures in conftest.py: sample chat messages, sample Claude response with `<preferences_ready>` tag

## Sources

### Primary (HIGH confidence)
- `backend/app/services/claude.py` -- existing AsyncAnthropic pattern (singleton, lazy init, messages API)
- `backend/app/routers/scoring.py` -- existing router pattern (APIRouter, HTTPException, async)
- `backend/app/models/preferences.py` -- UserPreferences schema (field names, types, enums, aliases)
- `backend/app/main.py` -- router registration and lifespan pattern
- `backend/app/prompts/scoring.py` -- system prompt pattern for Swiss real estate context
- Anthropic Python SDK docs -- `messages.create()` accepts `system`, `messages`, `model`, `max_tokens`

### Secondary (MEDIUM confidence)
- Claude Sonnet 4.6 200K context window -- based on current Anthropic model specifications

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in the project
- Architecture: HIGH -- exact patterns to replicate exist in codebase
- Pitfalls: HIGH -- pitfalls are well-understood from the existing scoring pipeline experience
- System prompt: MEDIUM -- prompt engineering is iterative; may need tuning after initial implementation

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no fast-moving dependencies)
