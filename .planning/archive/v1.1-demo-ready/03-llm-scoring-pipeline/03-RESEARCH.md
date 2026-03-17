# Phase 3: LLM Scoring Pipeline - Research

**Researched:** 2026-03-10
**Domain:** LLM-based property evaluation pipeline (Claude API + FastAPI + Supabase)
**Confidence:** HIGH

## Summary

Phase 3 builds the core intelligence of HomeMatch: a FastAPI endpoint that takes a Flatfox listing PK and a user ID, fetches both the listing data and user preferences, constructs a prompt, sends it to Claude, and returns a structured scoring response. The existing codebase already has the two key data models (`FlatfoxListing` and `UserPreferences`), the Flatfox HTTP client, and the Supabase database schema with both `user_preferences` and `analyses` tables. The main new components are: (1) the Anthropic SDK integration for Claude calls with structured output, (2) a Supabase Python client for reading preferences and writing analysis results from the backend, (3) Pydantic response models for the scoring output, (4) prompt engineering for the evaluation, and (5) a Supabase edge function to proxy scoring requests from the extension.

The Anthropic Python SDK (v0.84.0) now supports structured outputs natively via `client.messages.parse()` with Pydantic models -- no beta headers needed, no third-party libraries like Instructor required. This is the cleanest approach: define a Pydantic model for the scoring response, pass it to `parse()`, and get a validated, typed object back. Claude Haiku 4.5 is the recommended model for this use case at $1/$5 per million input/output tokens -- it supports structured outputs and is fast enough for interactive scoring.

The supabase-py library (v2.28.0) provides the Python client for reading preferences and writing results. The backend should use the service_role key (not the anon key) to bypass RLS, since it operates on behalf of authenticated users whose identity is verified by the edge function layer.

**Primary recommendation:** Use `anthropic` SDK with `AsyncAnthropic` + `messages.parse()` for structured scoring, `supabase` Python client with service_role key for DB access, and Claude Haiku 4.5 as the model. Keep the prompt simple and explicit with system prompt defining the evaluator role and user prompt containing the listing + preferences data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Score structure: Hybrid model with 5 weight categories (location, price, size, features, condition), each gets 0-100 score by Claude with full LLM judgment (no strict rubric). Soft criteria and selected features evaluated as separate checklist with per-item weights. Overall 0-100 score at Claude's discretion.
- Score badge display: Color-coded number only (no text label). Color palette should be modern/attractive, NOT traffic light. Scoring response should include a match tier/band for extension coloring.
- Summary bullets (3-5): Pros/cons list format, highlight compromises, include specific numbers AND labels (e.g., "CHF 2,100/mo vs your CHF 2,500 max -- within budget"), concise for extension overlay.
- Full analysis page: Pros/cons summary at top + category-by-category breakdown below. Each category: score, reasoning bullets with listing data citations. Breakdown matches 5 weight categories + checklist results.
- Analysis language: Returned in user's preferred language (NOT listing's language). Overrides EVAL-05. Requires language preference field in user preferences.

### Claude's Discretion
- Missing data behavior: how to handle listings that lack info for a category (infer from context vs neutral score vs exclude)
- Soft criteria evaluation approach: how to assess free-text criteria ("near Bahnhof") against listing data
- Feature evaluation: binary check vs quality assessment
- Overall score formula: how to blend category scores and checklist scores into 0-100 overall
- Prompt engineering: structure, chain-of-thought, JSON output format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVAL-01 | Each listing evaluated by Claude against user's preference profile and weights | Anthropic SDK `messages.parse()` with Pydantic response model; system prompt encodes evaluator role; user prompt embeds listing + preferences |
| EVAL-02 | Evaluation returns 0-100 score with weighted category breakdown | Pydantic response model with `overall_score`, `categories` list (each with name, score, weight, reasoning) |
| EVAL-03 | Each category includes bullet-point reasoning with listing detail references | Structured output model includes `reasoning: list[str]` per category; prompt instructs Claude to cite listing data |
| EVAL-04 | Evaluation explicitly states "I don't know" for unavailable data points | Prompt instruction: "If a data point is not available in the listing, explicitly state 'I don't know' or 'Not specified' rather than guessing" |
| EVAL-05 | Analysis returned in user's preferred language (modified from original: listing language) | Language preference field added to UserPreferences; prompt instructs: "Respond in {language}" |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | >=0.84.0 | Claude API client | Official Anthropic SDK; native structured output with `parse()` + Pydantic |
| supabase | >=2.28.0 | Supabase Python client | Official client; reads preferences, writes analysis results |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic | >=2.0 (already installed via FastAPI) | Response models for scoring output | Define structured scoring response schema |
| python-dotenv | latest | Environment variable loading | Load ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| anthropic SDK `parse()` | instructor library | Instructor adds abstraction layer; native SDK `parse()` is simpler and fewer deps |
| supabase-py | raw httpx + PostgREST | supabase-py handles auth, connection, query building; no reason to go raw |
| Claude Haiku 4.5 | Claude Sonnet 4.5 | Sonnet is 3x more expensive ($3/$15 vs $1/$5); Haiku sufficient for structured evaluation |

**Installation:**
```bash
pip install anthropic supabase python-dotenv
```

Add to `backend/requirements.txt`:
```
anthropic
supabase
python-dotenv
```

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
  models/
    listing.py          # (exists) FlatfoxListing
    preferences.py      # (exists) UserPreferences -- add language field
    scoring.py          # (NEW) ScoreRequest, ScoreResponse, CategoryScore, ChecklistItem
  services/
    flatfox.py          # (exists) FlatfoxClient singleton
    claude.py           # (NEW) ClaudeScorer -- async Claude evaluation service
    supabase.py         # (NEW) SupabaseClient -- read prefs, write analyses
  routers/
    listings.py         # (exists) GET /listings/{pk}
    scoring.py          # (NEW) POST /score endpoint
  prompts/
    scoring.py          # (NEW) System and user prompt templates
  main.py               # (exists) Add scoring router + supabase client lifecycle

supabase/
  functions/
    score-proxy/
      index.ts          # (NEW) Edge function: auth verify + proxy to EC2
  migrations/
    001_initial_schema.sql   # (exists) user_preferences + analyses tables
    002_add_language.sql     # (NEW) Add language preference column or handle in JSONB
```

### Pattern 1: Singleton Service with Lazy Init (established)
**What:** Async clients initialized on first use, closed on shutdown via lifespan
**When to use:** For long-lived HTTP clients (Flatfox, Supabase, Anthropic)
**Example:**
```python
# Source: Existing pattern in backend/app/services/flatfox.py
from anthropic import AsyncAnthropic

class ClaudeScorer:
    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic()  # Reads ANTHROPIC_API_KEY from env
        return self._client

    async def score_listing(
        self, listing: FlatfoxListing, preferences: UserPreferences
    ) -> ScoreResponse:
        client = self.get_client()
        response = await client.messages.parse(
            model="claude-4-5-haiku-latest",
            max_tokens=4096,
            system=build_system_prompt(preferences.language),
            messages=[{
                "role": "user",
                "content": build_user_prompt(listing, preferences),
            }],
            output_format=ScoreResponse,
        )
        return response.parsed_output

claude_scorer = ClaudeScorer()  # Singleton
```

### Pattern 2: Structured Output with Pydantic (new for this phase)
**What:** Define response schema as Pydantic model, use `messages.parse()` for guaranteed valid output
**When to use:** Any Claude call that needs structured data back
**Example:**
```python
# Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
from pydantic import BaseModel, Field

class CategoryScore(BaseModel):
    """Score for a single evaluation category."""
    name: str = Field(description="Category name: location, price, size, features, or condition")
    score: int = Field(ge=0, le=100, description="0-100 score for this category")
    weight: int = Field(ge=0, le=100, description="User's importance weight for this category")
    reasoning: list[str] = Field(description="3-5 bullet points with listing data citations")

class ChecklistItem(BaseModel):
    """Evaluation of a single soft criterion or selected feature."""
    criterion: str = Field(description="The criterion or feature name")
    met: bool | None = Field(description="True if met, False if not, None if unknown")
    note: str = Field(description="Brief explanation with listing data reference")

class ScoreResponse(BaseModel):
    """Complete scoring response from Claude."""
    overall_score: int = Field(ge=0, le=100, description="Overall match score")
    match_tier: str = Field(description="Match tier: excellent, good, fair, poor")
    summary_bullets: list[str] = Field(
        min_length=3, max_length=5,
        description="3-5 pro/con bullets highlighting compromises"
    )
    categories: list[CategoryScore] = Field(description="Per-category breakdown")
    checklist: list[ChecklistItem] = Field(description="Soft criteria + feature checklist")
    language: str = Field(description="Language code of the response (de, fr, it, en)")
```

### Pattern 3: Supabase Python Client with Service Role Key
**What:** Backend uses service_role key to bypass RLS and operate on behalf of users
**When to use:** Server-to-server database access where user identity is validated upstream (by edge function)
**Example:**
```python
# Source: https://supabase.com/docs/reference/python/introduction
from supabase import create_client, Client
import os

class SupabaseService:
    def __init__(self) -> None:
        self._client: Client | None = None

    def get_client(self) -> Client:
        if self._client is None:
            self._client = create_client(
                os.environ["SUPABASE_URL"],
                os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            )
        return self._client

    def get_preferences(self, user_id: str) -> dict:
        client = self.get_client()
        result = client.table("user_preferences") \
            .select("preferences") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        return result.data["preferences"]

    def save_analysis(self, user_id: str, listing_id: str, score_data: dict) -> None:
        client = self.get_client()
        client.table("analyses").upsert({
            "user_id": user_id,
            "listing_id": str(listing_id),
            "score": score_data["overall_score"],
            "breakdown": score_data,
            "summary": "\n".join(score_data.get("summary_bullets", [])),
        }).execute()

supabase_service = SupabaseService()  # Singleton
```

### Pattern 4: Edge Function as Auth Proxy
**What:** Supabase edge function validates JWT, extracts user_id, forwards request to EC2 backend
**When to use:** All extension-to-backend communication
**Example:**
```typescript
// supabase/functions/score-proxy/index.ts
// Source: https://supabase.com/docs/guides/functions/auth
import { createClient } from "npm:@supabase/supabase-js@2";

const BACKEND_URL = Deno.env.get("BACKEND_URL")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing auth" }, { status: 401 });
  }

  // Verify JWT and extract user
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SB_PUBLISHABLE_KEY")!
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  // Forward to backend with user_id
  const body = await req.json();
  const backendResponse = await fetch(`${BACKEND_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, user_id: data.user.id }),
  });

  const result = await backendResponse.json();
  return Response.json(result, {
    status: backendResponse.status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});
```

### Anti-Patterns to Avoid
- **Putting API keys in the edge function:** The edge function should NOT call Claude directly. It only proxies to EC2 where the ANTHROPIC_API_KEY lives.
- **Skipping structured output:** Do NOT parse Claude's text response with regex/string splitting. Use `messages.parse()` with a Pydantic model for guaranteed schema compliance.
- **Synchronous Supabase client in async FastAPI:** The `supabase` Python library is synchronous. Either run it in a threadpool (`asyncio.to_thread()`) or accept the small blocking cost for the two DB calls per request. Do NOT use `supabase-py-async` -- it's a third-party fork, not official.
- **Hardcoding the Claude model name:** Use a constant or env var so it's easy to swap between haiku/sonnet during development.
- **Massive prompts:** Keep the prompt focused. Don't dump the entire listing JSON raw -- format it into a readable summary for Claude.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema enforcement for LLM output | Manual JSON parsing + retry loops | `messages.parse()` with Pydantic model | SDK guarantees valid JSON matching schema; handles retries internally |
| JWT verification in edge function | Custom jose/crypto implementation | `supabase.auth.getUser(token)` | Supabase client handles verification, token refresh, claims extraction |
| Database query building | Raw SQL strings | supabase-py `.table().select().eq()` | Handles escaping, connection pooling, error mapping |
| Prompt template interpolation | f-strings with raw data | Structured template function with data formatting | Prevents prompt injection, ensures consistent formatting |

**Key insight:** The Anthropic SDK's `messages.parse()` eliminates the biggest pain point in LLM pipelines -- unreliable output parsing. With Pydantic models, you get compile-time type safety AND runtime validation from Claude's structured output mode.

## Common Pitfalls

### Pitfall 1: Supabase-py Is Synchronous in Async FastAPI
**What goes wrong:** `supabase` Python library uses synchronous `httpx` under the hood. Calling it directly in an `async def` endpoint blocks the event loop.
**Why it happens:** FastAPI auto-threads `def` endpoints but NOT `async def` endpoints.
**How to avoid:** Either (a) use `def` for the scoring endpoint (FastAPI will thread it), or (b) wrap supabase calls in `asyncio.to_thread()`.
**Warning signs:** Endpoint latency spikes, concurrent requests queue up.

### Pitfall 2: Preferences Stored as camelCase JSONB
**What goes wrong:** Frontend Zod schema uses camelCase (`budgetMin`, `offerType`), but backend Pydantic model uses snake_case (`budget_min`, `offer_type`).
**Why it happens:** `savePreferences()` in `actions.ts` saves the Zod-parsed object directly as JSONB.
**How to avoid:** Either (a) add a `model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)` to `UserPreferences`, or (b) manually map camelCase keys when reading from Supabase. Option (a) is cleaner.
**Warning signs:** Pydantic validation errors when parsing preferences from DB.

### Pitfall 3: Missing Language Preference Field
**What goes wrong:** The CONTEXT.md decided analysis should be in user's preferred language, but `UserPreferences` and the frontend schema have no `language` field.
**Why it happens:** Decision was made during Phase 3 context but not yet implemented.
**How to avoid:** Add `language: str = "de"` to `UserPreferences` Pydantic model. Either add it to frontend schema too, or just default it in the backend. Since preferences are JSONB, no migration needed -- just add the field.
**Warning signs:** Claude defaults to English when no language instruction is given.

### Pitfall 4: Claude Token Limits with Long Listing Descriptions
**What goes wrong:** Some Flatfox listings have very long descriptions (1000+ words in German). Combined with the system prompt and preferences, this can push input tokens high.
**Why it happens:** Flatfox `description` field is free-text HTML/plain text with no length limit.
**How to avoid:** Truncate listing description to ~500 words in the prompt. The key scoring data (price, rooms, size, location, attributes) is in structured fields anyway -- the description adds context but shouldn't dominate.
**Warning signs:** API costs higher than expected, latency spikes.

### Pitfall 5: Analyses Table Schema Mismatch
**What goes wrong:** The `analyses` table has `score numeric`, `breakdown jsonb`, `summary text` but the response from Claude is richer (categories, checklist, match_tier).
**Why it happens:** Schema was created in Phase 1 with minimal structure.
**How to avoid:** Store the entire `ScoreResponse` dict in the `breakdown` JSONB column. The `score` column holds `overall_score`. The `summary` column holds the joined summary bullets. All detailed data lives in `breakdown`.
**Warning signs:** Data loss if trying to fit rich response into flat columns.

### Pitfall 6: Edge Function CORS Issues
**What goes wrong:** Chrome extension gets CORS errors when calling the edge function.
**Why it happens:** Edge functions need explicit CORS headers, especially for POST requests with custom headers.
**How to avoid:** Handle OPTIONS preflight explicitly in the edge function. Return `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: authorization, content-type`.
**Warning signs:** Network errors in extension console, "CORS policy" errors.

## Code Examples

### Scoring Endpoint (FastAPI Router)
```python
# backend/app/routers/scoring.py
# Source: Follows existing pattern from backend/app/routers/listings.py
from fastapi import APIRouter, HTTPException
from app.models.scoring import ScoreRequest, ScoreResponse
from app.services.claude import claude_scorer
from app.services.supabase import supabase_service
from app.services.flatfox import flatfox_client
from app.models.preferences import UserPreferences

router = APIRouter(prefix="/score", tags=["scoring"])

@router.post("", response_model=ScoreResponse)
async def score_listing(request: ScoreRequest):
    """Score a Flatfox listing against user preferences via Claude."""
    # 1. Fetch listing from Flatfox
    try:
        listing = await flatfox_client.get_listing(request.listing_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch listing")

    # 2. Load preferences from Supabase (sync call -- consider to_thread)
    import asyncio
    try:
        prefs_data = await asyncio.to_thread(
            supabase_service.get_preferences, request.user_id
        )
        preferences = UserPreferences.model_validate(prefs_data)
    except Exception:
        raise HTTPException(status_code=404, detail="Preferences not found")

    # 3. Score with Claude
    try:
        result = await claude_scorer.score_listing(listing, preferences)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scoring failed: {str(e)}")

    # 4. Save to Supabase
    await asyncio.to_thread(
        supabase_service.save_analysis,
        request.user_id,
        str(request.listing_id),
        result.model_dump(),
    )

    return result
```

### Prompt Construction
```python
# backend/app/prompts/scoring.py
from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences

LANGUAGE_MAP = {
    "de": "German (Deutsch)",
    "fr": "French (Francais)",
    "it": "Italian (Italiano)",
    "en": "English",
}

def build_system_prompt(language: str = "de") -> str:
    lang_name = LANGUAGE_MAP.get(language, "German (Deutsch)")
    return f"""You are a Swiss real estate evaluation assistant. Your job is to score
a property listing against a user's preferences, providing honest and transparent analysis.

RULES:
- Respond entirely in {lang_name}.
- For each category, provide a 0-100 score based on how well the listing matches the user's preferences.
- If a data point is NOT available in the listing, explicitly state this. Use phrases like
  "Not specified in listing" or "Information not available". Never guess or assume.
- Highlight compromises clearly -- what the user would be giving up by choosing this property.
- Include specific numbers from the listing alongside qualitative assessments.
- Summary bullets should be concise, actionable, and highlight the most important match/mismatch points.
- The overall score should reflect how well this property matches the user's complete profile,
  considering category weights."""

def build_user_prompt(listing: FlatfoxListing, prefs: UserPreferences) -> str:
    # Format listing data readably
    attrs = ", ".join(a.name for a in listing.attributes) if listing.attributes else "None listed"
    desc_truncated = (listing.description or "No description")[:2000]

    return f"""## User Preferences

**Location:** {prefs.location or "No preference"}
**Type:** {prefs.offer_type.value} | {prefs.object_category.value}
**Budget:** {f"CHF {prefs.budget_min:,}" if prefs.budget_min else "No min"} - {f"CHF {prefs.budget_max:,}" if prefs.budget_max else "No max"}
**Rooms:** {prefs.rooms_min or "No min"} - {prefs.rooms_max or "No max"}
**Living space:** {f"{prefs.living_space_min} sqm" if prefs.living_space_min else "No min"} - {f"{prefs.living_space_max} sqm" if prefs.living_space_max else "No max"}
**Soft criteria:** {", ".join(prefs.soft_criteria) if prefs.soft_criteria else "None"}
**Desired features:** {", ".join(prefs.selected_features) if prefs.selected_features else "None"}

**Category weights (0-100 importance):**
- Location: {prefs.weights.location}
- Price: {prefs.weights.price}
- Size: {prefs.weights.size}
- Features: {prefs.weights.features}
- Condition: {prefs.weights.condition}

---

## Listing Data

**Title:** {listing.description_title or listing.public_title or "Untitled"}
**Address:** {listing.public_address or f"{listing.street}, {listing.zipcode} {listing.city}"}
**Canton:** {listing.state or "Unknown"}
**Type:** {listing.offer_type} | {listing.object_category} ({listing.object_type})
**Price:** {f"CHF {listing.rent_gross:,}/month (net: {listing.rent_net}, charges: {listing.rent_charges})" if listing.rent_gross else f"CHF {listing.price_display:,}" if listing.price_display else "Not specified"}
**Rooms:** {listing.number_of_rooms or "Not specified"}
**Living space:** {f"{listing.surface_living} sqm" if listing.surface_living else "Not specified"}
**Floor:** {listing.floor if listing.floor is not None else "Not specified"}
**Year built:** {listing.year_built or "Not specified"}
**Year renovated:** {listing.year_renovated or "Not specified"}
**Available:** {listing.moving_date or listing.moving_date_type or "Not specified"}
**Features/Attributes:** {attrs}
**Furnished:** {"Yes" if listing.is_furnished else "No"}
**Temporary:** {"Yes" if listing.is_temporary else "No"}

**Description:**
{desc_truncated}

---

Evaluate this listing against the user's preferences. Score each of the 5 categories (location, price, size, features, condition), evaluate the soft criteria and desired features as a checklist, and provide an overall score with summary bullets highlighting key matches and compromises."""
```

### Claude Scorer Service (Async)
```python
# backend/app/services/claude.py
from anthropic import AsyncAnthropic
from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences
from app.models.scoring import ScoreResponse
from app.prompts.scoring import build_system_prompt, build_user_prompt
import os

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-4-5-haiku-latest")

class ClaudeScorer:
    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic()  # Reads ANTHROPIC_API_KEY from env
        return self._client

    async def score_listing(
        self, listing: FlatfoxListing, preferences: UserPreferences
    ) -> ScoreResponse:
        client = self.get_client()
        response = await client.messages.parse(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=build_system_prompt(getattr(preferences, "language", "de")),
            messages=[{
                "role": "user",
                "content": build_user_prompt(listing, preferences),
            }],
            output_format=ScoreResponse,
        )
        return response.parsed_output

claude_scorer = ClaudeScorer()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use / function calling for JSON | `messages.parse()` with Pydantic | Late 2025 (GA Feb 2026) | No beta headers, SDK-native, cleaner code |
| instructor library for structured output | Native Anthropic SDK `parse()` | Feb 2026 | One fewer dependency; SDK handles everything |
| Manual JSON schema in prompt | `output_format=PydanticModel` | Feb 2026 | Type safety at Python level + guaranteed valid output |

**Deprecated/outdated:**
- `output_format` parameter (old style): Moved to `output_config.format`. SDK still accepts old form but it's deprecated.
- Beta header `structured-outputs-2025-11-13`: No longer needed. Structured outputs are GA.
- `supabase-py-async`: Third-party fork; not recommended. Use official `supabase` (sync) with `asyncio.to_thread()`.

## Open Questions

1. **Preferences camelCase/snake_case mapping**
   - What we know: Frontend saves camelCase JSONB (`budgetMin`), backend model uses snake_case (`budget_min`)
   - What's unclear: Whether Pydantic's `alias_generator` or manual mapping is cleaner
   - Recommendation: Use `ConfigDict(populate_by_name=True)` with aliases in UserPreferences to handle both

2. **Language preference field location**
   - What we know: Needs to exist so Claude can respond in user's language
   - What's unclear: Whether to add it to frontend preferences form (Phase 2 addition) or just backend-default to "de"
   - Recommendation: Add `language` field to both frontend schema and backend model. Default "de". Simple dropdown: DE/FR/IT/EN. Can be a minimal frontend change.

3. **Match tier thresholds**
   - What we know: Response needs a `match_tier` for badge coloring
   - What's unclear: Exact thresholds (e.g., 80+ = excellent, 60-79 = good, etc.)
   - Recommendation: Let Claude assign the tier based on its judgment in the prompt, OR define fixed thresholds in the backend after receiving the score. Fixed thresholds are more predictable for UI.

4. **Edge function environment: BACKEND_URL**
   - What we know: Edge function needs to know the EC2 backend URL
   - What's unclear: Whether this is set via Supabase dashboard secrets or config.toml
   - Recommendation: Set via `supabase secrets set BACKEND_URL=https://ec2-xxx.compute.amazonaws.com` in production. For local dev, use `supabase functions serve` with `--env-file .env.local`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (already configured) |
| Config file | `backend/tests/conftest.py` (exists, has fixtures and markers) |
| Quick run command | `cd backend && python -m pytest tests/ -x -m "not integration"` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVAL-01 | Claude evaluates listing against preferences | unit (mock Claude) | `cd backend && python -m pytest tests/test_scoring.py::test_score_listing_mock -x` | No -- Wave 0 |
| EVAL-02 | Response includes 0-100 overall + category breakdown | unit | `cd backend && python -m pytest tests/test_scoring_models.py::test_score_response_validation -x` | No -- Wave 0 |
| EVAL-03 | Each category has reasoning bullets | unit | `cd backend && python -m pytest tests/test_scoring_models.py::test_category_reasoning -x` | No -- Wave 0 |
| EVAL-04 | "I don't know" for missing data | unit (mock Claude) | `cd backend && python -m pytest tests/test_scoring.py::test_missing_data_handling -x` | No -- Wave 0 |
| EVAL-05 | Response in user's preferred language | unit | `cd backend && python -m pytest tests/test_prompts.py::test_language_in_prompt -x` | No -- Wave 0 |
| AUTH-03 | Edge function proxies with auth | manual-only | Manual: call edge function with valid/invalid JWT | N/A |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/ -x -m "not integration"`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_scoring_models.py` -- covers EVAL-02, EVAL-03 (Pydantic model validation)
- [ ] `backend/tests/test_scoring.py` -- covers EVAL-01, EVAL-04 (mock Claude for scoring endpoint)
- [ ] `backend/tests/test_prompts.py` -- covers EVAL-05 (prompt template language selection)
- [ ] Mock fixtures for Claude responses in `backend/tests/conftest.py`
- [ ] Sample preferences fixture (with camelCase keys as stored in Supabase)

## Sources

### Primary (HIGH confidence)
- [Anthropic Structured Outputs Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - `messages.parse()` API, Pydantic integration, GA status
- [Anthropic Python SDK GitHub](https://github.com/anthropics/anthropic-sdk-python) - v0.84.0, AsyncAnthropic, env var auto-detection
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - Haiku 4.5: $1/$5 per M tokens
- [Supabase Python Docs](https://supabase.com/docs/reference/python/introduction) - create_client, table operations, service_role
- [supabase-py PyPI](https://pypi.org/project/supabase/) - v2.28.0 (Feb 2026)
- [Supabase Edge Functions Auth](https://supabase.com/docs/guides/functions/auth) - JWT verification, getClaims, middleware pattern
- [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart) - CLI commands, file structure, deployment

### Secondary (MEDIUM confidence)
- [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) - structured prompt format, system prompt contract

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs, verified versions, GA features
- Architecture: HIGH - Follows existing codebase patterns, well-documented APIs
- Pitfalls: HIGH - Identified from actual codebase analysis (camelCase mismatch, sync client)
- Prompt engineering: MEDIUM - Prompt structure is well-understood but output quality needs iteration

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable APIs, 30 days)
