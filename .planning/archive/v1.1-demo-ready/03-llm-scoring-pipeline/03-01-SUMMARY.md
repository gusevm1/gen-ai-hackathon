---
phase: 03-llm-scoring-pipeline
plan: 01
subsystem: api
tags: [anthropic, claude, pydantic, supabase, scoring, structured-output, tdd]

# Dependency graph
requires:
  - phase: 02-preferences-data-pipeline
    provides: UserPreferences model, FlatfoxListing model, FlatfoxClient singleton, conftest fixtures
provides:
  - ScoreResponse, CategoryScore, ChecklistItem Pydantic models for Claude structured output
  - build_system_prompt and build_user_prompt template functions
  - ClaudeScorer service with AsyncAnthropic messages.parse()
  - SupabaseService for reading preferences and writing analysis results
  - UserPreferences camelCase JSONB support and language field
  - 35 unit tests covering all scoring pipeline components
affects: [03-02-PLAN, phase-04-extension-ui]

# Tech tracking
tech-stack:
  added: [anthropic, supabase, python-dotenv]
  patterns: [structured-output-with-pydantic, camelCase-alias-generator, singleton-service]

key-files:
  created:
    - backend/app/models/scoring.py
    - backend/app/prompts/__init__.py
    - backend/app/prompts/scoring.py
    - backend/app/services/claude.py
    - backend/app/services/supabase.py
    - backend/tests/test_scoring_models.py
    - backend/tests/test_prompts.py
    - backend/tests/test_scoring.py
  modified:
    - backend/app/models/preferences.py
    - backend/requirements.txt
    - backend/tests/conftest.py

key-decisions:
  - "Used alias_generator=to_camel with populate_by_name=True for UserPreferences camelCase JSONB support"
  - "Claude model default: claude-haiku-4-5-20250514 via CLAUDE_MODEL env var"
  - "Supabase service uses synchronous client (wrap with asyncio.to_thread in async endpoints)"
  - "Description truncated to 2000 chars in user prompt to manage token usage"
  - "match_tier uses Literal type (excellent/good/fair/poor) for compile-time validation"

patterns-established:
  - "Structured output: messages.parse(output_format=PydanticModel) for guaranteed valid Claude responses"
  - "camelCase aliases: ConfigDict(alias_generator=to_camel, populate_by_name=True) for Supabase JSONB"
  - "Prompt templates: separate build_system_prompt and build_user_prompt functions in prompts/ package"
  - "Mock pattern: patch singleton.get_client for isolated unit tests of services"

requirements-completed: [EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 03 Plan 01: Core Scoring Engine Summary

**Pydantic scoring models with structured Claude output, prompt templates in 4 languages, and Supabase DB client -- fully TDD with 35 mocked tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T15:39:20Z
- **Completed:** 2026-03-10T15:45:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- ScoreResponse model validates Claude's structured output with 5 categories, checklist, match_tier, and 3-5 summary bullets
- UserPreferences accepts camelCase JSONB from Supabase and includes language field (default "de")
- Prompt templates generate correct system/user prompts in DE/FR/IT/EN with missing-data handling
- ClaudeScorer uses AsyncAnthropic messages.parse() with ScoreResponse output_format
- SupabaseService reads preferences and writes analyses with upsert
- All 45 tests pass (10 existing + 35 new) with zero external API calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Scoring Pydantic models + UserPreferences camelCase** - `1a30754` (test RED) + `5c3a823` (feat GREEN)
2. **Task 2: Prompt templates + Claude scorer + Supabase service** - `ba2a2df` (test RED) + `b5be563` (feat GREEN)
3. **Task 3: Scoring integration tests with mocked Claude** - `f1c622f` (test)

## Files Created/Modified
- `backend/app/models/scoring.py` - ScoreRequest, ScoreResponse, CategoryScore, ChecklistItem Pydantic models
- `backend/app/models/preferences.py` - Added camelCase alias support and language field to UserPreferences
- `backend/app/prompts/__init__.py` - Empty package init for prompts module
- `backend/app/prompts/scoring.py` - System and user prompt template functions with LANGUAGE_MAP
- `backend/app/services/claude.py` - ClaudeScorer singleton with score_listing using messages.parse()
- `backend/app/services/supabase.py` - SupabaseService singleton with get_preferences and save_analysis
- `backend/requirements.txt` - Added anthropic, supabase, python-dotenv
- `backend/tests/conftest.py` - Added SAMPLE_PREFERENCES_JSON and SAMPLE_SCORE_RESPONSE fixtures
- `backend/tests/test_scoring_models.py` - 21 tests for Pydantic model validation
- `backend/tests/test_prompts.py` - 8 tests for prompt template generation
- `backend/tests/test_scoring.py` - 6 tests for scoring service with mocked dependencies

## Decisions Made
- Used `alias_generator=to_camel` with `populate_by_name=True` on UserPreferences to accept both camelCase (Supabase JSONB) and snake_case (Python) keys
- Default Claude model set to `claude-haiku-4-5-20250514` via `CLAUDE_MODEL` env var for easy swapping
- SupabaseService uses synchronous `supabase` client (the official approach -- use `asyncio.to_thread()` in async endpoints)
- Description truncated to 2000 chars in user prompt to manage Claude token usage
- `match_tier` uses `Literal["excellent", "good", "fair", "poor"]` for compile-time validation rather than dynamic thresholds

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pyparsing version conflict for supabase import**
- **Found during:** Task 2 (Supabase service import verification)
- **Issue:** supabase-py's storage3 dependency pulls in pyiceberg which requires pyparsing >= 3.2 (for DelimitedList), but system had pyparsing 3.1.1
- **Fix:** Upgraded pyparsing to 3.3.2
- **Files modified:** None (system-level pip upgrade)
- **Verification:** `from app.services.supabase import supabase_service` succeeds
- **Committed in:** Not committed (pip upgrade is runtime environment, not source code)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- runtime dependency version bump, no source code changes needed.

## Issues Encountered
None beyond the pyparsing version conflict documented above.

## User Setup Required
None - no external service configuration required. API keys (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) will be needed at runtime but are already expected from prior phases.

## Next Phase Readiness
- Scoring engine is programmatically callable with listing + preferences input
- Plan 03-02 can wire up the FastAPI POST /score endpoint using these components
- All services follow the singleton pattern for easy lifespan management
- Test fixtures (SAMPLE_PREFERENCES_JSON, SAMPLE_SCORE_RESPONSE) are available for endpoint tests

## Self-Check: PASSED

All 12 files verified present. All 5 task commits verified in git log.

---
*Phase: 03-llm-scoring-pipeline*
*Completed: 2026-03-10*
