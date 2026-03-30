# Technology Stack: Integration of ListingProfile Enrichment + OpenRouter Gap-Fill

**Project:** HomeMatch v5.0 (Phases 29-32 adjusted)
**Researched:** 2026-03-30
**Overall confidence:** HIGH
**Focus:** Stack additions for integrating pre-computed ListingProfile data and OpenRouter gap-fill into the existing v5.0 hybrid scoring pipeline

---

## Executive Summary

The integration requires **one new dependency** (`httpx` -- already installed) and **one new environment variable** (`OPENROUTER_API_KEY`). The existing `httpx` async client is the correct choice for OpenRouter API calls. The critical finding is that the current OpenRouter model (`google/gemini-2.0-flash-001`) is **deprecated and will shut down June 1, 2026** -- the model constant must be updated to `google/gemini-2.5-flash-lite` before deployment.

The deterministic scorer (Phase 28, 439 lines, 41 tests) currently consumes `FlatfoxListing` + `DynamicField` -- it does NOT consume `ListingProfile`. The integration requires an **adapter layer** that projects `ListingProfile` data into the same interfaces the deterministic scorer already understands, rather than rewriting the scorer itself.

No new Python packages are needed. The `openrouter.py` module (372 lines) is well-structured but needs three fixes: model update, structured JSON output via `response_format`, and `ALLOW_CLAUDE_FALLBACK` gating. The `listing_profile_db.py` module (118 lines) is production-ready and follows existing Supabase patterns.

---

## Recommended Stack Changes

### New Runtime Dependencies

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| `httpx` (existing) | installed | OpenRouter API client | Already in `requirements.txt`. `openrouter.py` uses `httpx.AsyncClient` -- correct async pattern for FastAPI. |
| `OPENROUTER_API_KEY` env var | -- | OpenRouter API auth | New env var on EC2 only. Not needed locally (fallback to Claude). |
| `ALLOW_CLAUDE_FALLBACK` env var | -- | Feature flag: allow expensive Claude scoring for listings without ListingProfile | Boolean gating. When `false`, listings without a pre-computed profile return a "not yet analyzed" response instead of burning $0.06 on Claude. |

### Model Update (CRITICAL)

| Technology | Current | Recommended | Rationale |
|------------|---------|-------------|-----------|
| OpenRouter model | `google/gemini-2.0-flash-001` | `google/gemini-2.5-flash-lite` | **Gemini 2.0 Flash is deprecated, shutting down June 1, 2026.** Gemini 2.5 Flash Lite has identical pricing ($0.10/M input, $0.40/M output), 1M context window, structured output support, and is the direct successor for cost-optimized workloads. |

**Confidence: HIGH** -- verified on [OpenRouter model page](https://openrouter.ai/google/gemini-2.0-flash-001) showing "Going away June 1, 2026" badge and on [Gemini 2.5 Flash Lite page](https://openrouter.ai/google/gemini-2.5-flash-lite) showing active availability.

**Alternative considered:** `google/gemini-2.5-flash` ($0.30/M input, $2.50/M output) -- 3x input cost, 6x output cost. The "reasoning" capability is unnecessary for gap-fill (binary yes/no/partial questions about listing features). Use `2.5-flash-lite` because gap-fill prompts are simple factual extraction, not reasoning tasks.

### No New Python Packages

| Question | Answer | Rationale |
|----------|--------|-----------|
| OpenAI SDK for OpenRouter? | **No. Use raw httpx.** | The existing `openrouter.py` uses `httpx.AsyncClient` directly, which is correct. OpenRouter is OpenAI-compatible, but adding `openai` as a dependency just for one gap-fill endpoint adds unnecessary weight. The raw HTTP approach gives full control over error handling and JSON parsing. |
| pydantic-settings for env vars? | **No. Use os.environ.** | The project consistently uses `os.environ.get()` for all env vars (see `claude.py`, `supabase.py`, `openrouter.py`). Adding `pydantic-settings` for one boolean flag breaks the established pattern. |
| aiohttp or requests? | **No. httpx is already standard.** | httpx is already used by `flatfox_client`, `openrouter.py`. No reason to add a second HTTP library. |
| tenacity for retries? | **No. httpx retry + manual fallback.** | `openrouter.py` already implements batch-then-individual fallback. Adding tenacity for a single API call is overkill. |

---

## Integration Architecture: ListingProfile to Deterministic Scorer

### The Core Problem

The Phase 28 deterministic scorer consumes `FlatfoxListing` (from live Flatfox API) and `DynamicField` (from user preferences). The new `ListingProfile` (from pre-computed enrichment) has different field names, richer data, and additional AI-analyzed scores. These two models are **not interchangeable**.

**Confidence: HIGH** -- verified by reading both models:

| Field | FlatfoxListing | ListingProfile |
|-------|---------------|----------------|
| Price | `price_display: Optional[int]` | `price: Optional[int]` |
| Rooms | `number_of_rooms: Optional[str]` (string!) | `rooms: Optional[float]` |
| Size | `surface_living: Optional[int]` | `sqm: Optional[int]` |
| Attributes | `attributes: list[FlatfoxAttribute]` (objects with `.name`) | `attributes: list[str]` (plain strings) |
| Location | `latitude/longitude: Optional[float]` | `latitude/longitude: Optional[float]` (same) |
| Condition | Not available (images only) | `condition_score`, `kitchen_quality_score`, etc. |
| Amenities | Not available (fetched at runtime) | `amenities: dict[str, AmenityCategory]` |
| Description | `description: Optional[str]` | `description: Optional[str]` (same) |

### Recommended Approach: Adapter Function, Not Scorer Rewrite

**Do NOT rewrite `deterministic_scorer.py` to accept `ListingProfile`.** The scorer has 41 passing tests against `FlatfoxListing`. Instead, create an adapter that converts `ListingProfile` into a `FlatfoxListing`-compatible object.

```python
# backend/app/services/profile_adapter.py

from app.models.listing import FlatfoxListing, FlatfoxAttribute
from app.models.listing_profile import ListingProfile


def listing_profile_to_flatfox(profile: ListingProfile) -> FlatfoxListing:
    """Convert a pre-computed ListingProfile to a FlatfoxListing for the scorer.

    This adapter bridges the enrichment pipeline output (ListingProfile)
    to the deterministic scorer input (FlatfoxListing) without changing
    either model or the scorer's 41 passing tests.
    """
    return FlatfoxListing(
        pk=profile.listing_id,
        slug=profile.slug,
        url=f"https://flatfox.ch/en/flat/{profile.slug}/",
        short_url=f"https://flatfox.ch/en/flat/{profile.slug}/",
        status="ACTIVE",
        offer_type=profile.offer_type,
        object_category=profile.object_category,
        object_type=profile.object_type,
        price_display=profile.price,
        rent_net=profile.rent_net,
        rent_charges=profile.rent_charges,
        rent_gross=profile.price if profile.offer_type == "RENT" else None,
        short_title=profile.title,
        description=profile.description,
        surface_living=profile.sqm,
        number_of_rooms=str(profile.rooms) if profile.rooms else None,
        floor=profile.floor,
        street=profile.address,
        zipcode=profile.zipcode,
        city=profile.city,
        latitude=profile.latitude,
        longitude=profile.longitude,
        state=profile.canton,
        country=profile.country,
        attributes=[FlatfoxAttribute(name=a) for a in profile.attributes],
        is_furnished=profile.is_furnished,
        is_temporary=profile.is_temporary,
        year_built=profile.year_built,
        year_renovated=profile.year_renovated,
        moving_date=profile.moving_date,
        moving_date_type=profile.moving_date_type,
    )
```

**Why this approach:**
1. **Zero test breakage** -- the scorer's 41 tests remain valid
2. **Zero scorer changes** -- formulas stay proven
3. **Single point of field mapping** -- one file to update if either model changes
4. **ListingProfile data is richer** -- the adapter can select the best available data (e.g., gross rent from `price` field)

### Proximity Data from ListingProfile

The Phase 28 scorer's `score_proximity_quality()` accepts `proximity_data: dict[str, list[dict]]` -- a runtime-fetched dict from Google Places. The ListingProfile stores pre-computed amenities as `amenities: dict[str, AmenityCategory]`.

An adapter function converts ListingProfile amenities to the scorer's expected format:

```python
def extract_proximity_data(profile: ListingProfile) -> dict[str, list[dict]]:
    """Convert ListingProfile amenities to the proximity_data format
    expected by score_proximity_quality()."""
    result: dict[str, list[dict]] = {}
    for category, amenity_cat in profile.amenities.items():
        entries = []
        for r in amenity_cat.results:
            entries.append({
                "distance_km": r.distance_km,
                "rating": r.rating or 3.0,
                "is_fallback": False,
                "name": r.name,
            })
        if entries:
            result[category] = entries
    return result
```

This eliminates the runtime Google Places API call for pre-enriched listings -- proximity data is already baked into the ListingProfile.

---

## OpenRouter Integration Patterns

### Current State (openrouter.py, 372 lines)

The existing `openrouter.py` is well-structured:
- `OpenRouterService` class with lazy `httpx.AsyncClient` init
- Batch gap-fill with fallback to individual calls
- Robust JSON parsing (handles markdown fences, malformed output)
- Module-level singleton `openrouter_service`

**Confidence: HIGH** -- read the full 372-line implementation.

### Required Changes

#### 1. Model Constant Update

```python
# BEFORE (deprecated, shuts down June 1, 2026)
OPENROUTER_MODEL = "google/gemini-2.0-flash-001"

# AFTER
OPENROUTER_MODEL = "google/gemini-2.5-flash-lite"
```

**Confidence: HIGH** -- [Gemini 2.0 Flash deprecation](https://openrouter.ai/google/gemini-2.0-flash-001) confirmed on OpenRouter.

#### 2. Structured JSON Output (Optional Enhancement)

The current implementation uses prompt-based JSON enforcement ("Respond ONLY with the JSON array, no other text") with regex fallback parsing. OpenRouter supports `response_format: { type: "json_object" }` for Gemini models, which would eliminate the need for the `_parse_json_response()` fallback chain.

```python
# Enhanced request body
json={
    "model": OPENROUTER_MODEL,
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.1,
    "max_tokens": 2048,
    "response_format": {"type": "json_object"},  # NEW
}
```

**Confidence: MEDIUM** -- [OpenRouter structured outputs docs](https://openrouter.ai/docs/guides/features/structured-outputs) confirm support but don't explicitly list Gemini 2.5 Flash Lite. The existing fallback parsing chain handles this gracefully either way, so this is a low-risk optimization, not a requirement.

#### 3. Make Model Configurable via Environment

```python
OPENROUTER_MODEL = os.environ.get(
    "OPENROUTER_MODEL", "google/gemini-2.5-flash-lite"
)
```

This allows switching models without code changes -- useful for testing or if pricing changes.

### Cost Analysis

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Est. cost per gap-fill (5 gaps) |
|-------|----------------------|------------------------|-------------------------------|
| Gemini 2.0 Flash (current, deprecated) | $0.10 | $0.40 | ~$0.0075 |
| Gemini 2.5 Flash Lite (recommended) | $0.10 | $0.40 | ~$0.0075 |
| Gemini 2.5 Flash (overkill) | $0.30 | $2.50 | ~$0.025 |
| Claude Haiku 4.5 (current fallback) | $0.80 | $4.00 | ~$0.06 |

Gap-fill via OpenRouter is **8x cheaper** than Claude Haiku per listing. At 1,792 Zurich listings, that is ~$13.50 total vs ~$107.50 via Claude.

---

## Environment Variable Gating: ALLOW_CLAUDE_FALLBACK

### Pattern

The scoring router currently always falls through to Claude when no ListingProfile exists. With enrichment coverage growing, most listings will have profiles. The `ALLOW_CLAUDE_FALLBACK` flag gates whether to burn Claude API credits for unenriched listings.

```python
# In scoring router
import os

ALLOW_CLAUDE_FALLBACK = os.environ.get("ALLOW_CLAUDE_FALLBACK", "true").lower() == "true"


# In the score_listing endpoint:
if listing_profile is None:
    if ALLOW_CLAUDE_FALLBACK:
        # Existing Claude pipeline ($0.06/listing)
        result = await claude_scorer.score_listing(...)
    else:
        raise HTTPException(
            status_code=202,
            detail="Listing not yet analyzed. Score will be available after enrichment."
        )
```

**Why `os.environ.get()` not pydantic-settings:** The project uses `os.environ.get()` everywhere (`claude.py` line 28, `openrouter.py` line 152). Consistency trumps "best practice" in a 7-developer-day hackathon project.

**Default: `true`** -- backward compatible. Existing behavior (Claude fallback) is preserved unless explicitly disabled. Set to `false` on EC2 once enrichment coverage exceeds 90% to eliminate surprise Claude costs.

**Why 202 not 404/503:** The listing exists, it just hasn't been pre-analyzed yet. HTTP 202 (Accepted) signals "we received your request but the result isn't ready" -- semantically correct. The extension can display "Enrichment pending" instead of an error.

---

## Supabase JSONB Best Practices for listing_profiles

### Current State

Migration `005_listing_profiles.sql` creates a well-designed table:
- `listing_id` as `integer NOT NULL UNIQUE` with index -- correct for lookups
- `amenities` as `JSONB NOT NULL DEFAULT '{}'` -- correct for nested amenity data
- `attributes` as `JSONB NOT NULL DEFAULT '[]'` -- correct for string arrays
- `research_json` (migration 006) as nullable `JSONB` -- correct for optional raw data

**Confidence: HIGH** -- read both migration files.

### JSONB Column Patterns (Verified)

| Column | Type | Index | Query Pattern |
|--------|------|-------|---------------|
| `amenities` | JSONB | No index needed | Read full column, deserialize in Python via `ListingProfile.model_validate()` |
| `attributes` | JSONB | No index needed | Read full column, deserialized as `list[str]` |
| `research_json` | JSONB | No index needed | Debugging only -- never queried in scoring hot path |

**Why no GIN index on JSONB columns:** The scoring pipeline always reads the full row by `listing_id` (unique index). It never queries *into* the JSONB (e.g., "find listings where amenities.supermarket.distance < 0.5km"). If that use case emerges, add a GIN index then. Per [Supabase JSONB docs](https://supabase.com/docs/guides/database/json): "Use GIN indexes for JSONB columns that are frequently queried with containment operators."

### listing_profile_db.py Patterns (Verified)

The existing CRUD module follows correct patterns:
- Uses `supabase_service.get_client()` -- same singleton as the rest of the backend
- `maybeSingle()` for get operations -- returns None instead of throwing
- `upsert(data, on_conflict="listing_id")` for saves -- idempotent
- Synchronous calls wrapped with `asyncio.to_thread()` in FastAPI endpoints

**One concern:** The `get_stale_profiles()` function makes two separate queries (one for `lt("analyzed_at", threshold)`, one for `is_("analyzed_at", "null")`). This could be a single query with an `or_` filter, but since it's only used by the poller (not the scoring hot path), it's not a performance issue.

---

## What NOT to Change in Phase 27-28 Code

### Phase 27 (CriterionType + Classifier) -- DO NOT TOUCH

| File | Why Hands-Off |
|------|--------------|
| `backend/app/models/preferences.py` | `CriterionType` enum, `IMPORTANCE_WEIGHT_MAP`, `DynamicField.criterion_type` -- all complete and wired into Phase 28 tests |
| `backend/app/routers/classifier.py` | POST `/classify-criteria` endpoint -- working, used by frontend at profile save time |
| `backend/app/services/classifier.py` | Claude-based criterion classification -- working, no changes needed |

### Phase 28 (Deterministic Scorer) -- DO NOT TOUCH

| File | Why Hands-Off |
|------|--------------|
| `backend/app/services/deterministic_scorer.py` | 439 lines, 41 tests passing. All 6 scorer functions (`score_price`, `score_distance`, `score_size`, `score_binary_feature`, `score_proximity_quality`, `synthesize_builtin_results`) consume `FlatfoxListing` + `DynamicField`. The adapter pattern (above) feeds them ListingProfile data without modification. |
| `backend/tests/test_deterministic_scorer.py` | 428 lines, 41 tests. Must remain green after integration. |

### Why Adapter Over Rewrite

Rewriting `deterministic_scorer.py` to accept `ListingProfile` directly would:
1. Invalidate all 41 tests (need rewrite for new input type)
2. Create a hard dependency on the enrichment pipeline (can't score without a profile)
3. Break the Claude fallback path (which still needs `FlatfoxListing` input)
4. Lose the proven exponential decay formulas while refactoring

The adapter is ~40 lines of field mapping. The scorer stays stable.

---

## Scoring Router Integration Flow

The modified `scoring.py` router should follow this flow:

```
POST /score request
  |
  +-- Cache check (existing, add schema_version >= 2 gate)
  |
  +-- Look up ListingProfile from Supabase (listing_profile_db.get_listing_profile)
  |
  +-- IF ListingProfile exists (Layer 2 + Layer 3):
  |     |
  |     +-- Convert to FlatfoxListing via adapter
  |     +-- Extract proximity_data from ListingProfile.amenities
  |     +-- Run deterministic scorer (score_price, score_distance, etc.)
  |     +-- Run synthesize_builtin_results
  |     +-- Collect subjective-type criteria
  |     +-- IF subjective criteria exist:
  |     |     +-- Phase 29: ClaudeSubjectiveResponse via messages.parse()
  |     |
  |     +-- Detect gaps (Phase 28 gap_detector.detect_gaps)
  |     +-- IF gaps exist:
  |     |     +-- OpenRouter gap-fill (openrouter_service.fill_gaps)
  |     |     +-- Merge results (openrouter.merge_gap_results)
  |     |
  |     +-- Aggregate: weighted average formula (Phase 31)
  |     +-- CRITICAL override: f=0 forces poor tier, cap at 39
  |     +-- Build ScoreResponse v2
  |     +-- Save + return
  |
  +-- ELSE IF ALLOW_CLAUDE_FALLBACK (Layer 4):
  |     |
  |     +-- Existing Claude pipeline (unchanged)
  |     +-- Save + return
  |
  +-- ELSE:
        +-- Return 202 "Not yet analyzed"
```

### Key Integration Point: Subjective Scorer vs Gap-Fill

There is a **design tension** between two gap-handling approaches:

1. **Phase 29 (v5.0 plan):** Claude evaluates subjective criteria via `ClaudeSubjectiveResponse` -- returns `fulfillment` floats + reasoning
2. **Enrichment pipeline:** OpenRouter fills `[GAP]` markers from deterministic scorer -- returns `score`/`met`/`note` dicts

**Resolution:** These handle different things:
- **Subjective scorer** (Phase 29): Evaluates criteria that are *inherently* subjective ("modern kitchen", "quiet neighborhood", "family-friendly area") -- criterion_type is `subjective`
- **Gap detector + OpenRouter** (existing): Fills data gaps where the deterministic scorer *should* have had an answer but the ListingProfile was missing data (e.g., binary feature not in attributes list but mentioned in description text)

Both can coexist. The subjective scorer runs first (for `criterion_type == "subjective"` fields), then gap detection runs on the deterministic results (for `criterion_type != "subjective"` fields that returned `None`).

---

## Lifespan Management

The existing `main.py` lifespan closes `flatfox_client` and `conversation_service` on shutdown. The `openrouter_service` singleton also has a `.close()` method that should be called:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await flatfox_client.close()
    await conversation_service.close()
    await openrouter_service.close()  # ADD THIS
```

**Confidence: HIGH** -- `openrouter.py` line 308-312 defines `async def close()` which calls `self._client.aclose()`.

---

## Installation

```bash
# Backend (Python) -- NO NEW PACKAGES
# httpx is already installed (used by flatfox_client)
# All other dependencies are existing

# Environment variables to set on EC2:
echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/gen-ai-hackathon/backend/.env
echo 'ALLOW_CLAUDE_FALLBACK=true' >> ~/gen-ai-hackathon/backend/.env
# OPENROUTER_MODEL defaults to google/gemini-2.5-flash-lite if not set

# Database migrations to apply:
# 005_listing_profiles.sql -- creates listing_profiles table
# 006_add_research_json.sql -- adds research_json JSONB column
```

---

## Sources

- [OpenRouter Gemini 2.0 Flash model page](https://openrouter.ai/google/gemini-2.0-flash-001) -- confirmed "Going away June 1, 2026" deprecation badge (HIGH confidence)
- [OpenRouter Gemini 2.5 Flash Lite model page](https://openrouter.ai/google/gemini-2.5-flash-lite) -- confirmed $0.10/M input, $0.40/M output pricing, active availability (HIGH confidence)
- [OpenRouter Structured Outputs docs](https://openrouter.ai/docs/guides/features/structured-outputs) -- confirmed `response_format` support for JSON mode (MEDIUM confidence -- model-specific support not confirmed for 2.5 Flash Lite)
- [Supabase JSONB docs](https://supabase.com/docs/guides/database/json) -- GIN index guidance, arrow operators (HIGH confidence)
- [FastAPI Settings docs](https://fastapi.tiangolo.com/advanced/settings/) -- env var patterns (HIGH confidence, but project uses `os.environ.get()` pattern instead)
- Existing codebase verified: `deterministic_scorer.py` (439 lines, consumes FlatfoxListing), `openrouter.py` (372 lines, httpx-based), `listing_profile.py` (155 lines, different field names than FlatfoxListing), `listing_profile_db.py` (118 lines, Supabase CRUD), `gap_detector.py` (77 lines, finds [GAP] markers), `scoring.py` router (179 lines, current Claude-only pipeline), `main.py` (lifespan management) -- all HIGH confidence

---

*Stack research for: HomeMatch v5.0 -- Integration of ListingProfile Enrichment + OpenRouter Gap-Fill*
*Researched: 2026-03-30*
