---
phase: 29-subjective-scorer-claude-enhancement
plan: 02
subsystem: api
tags: [openrouter, httpx, scoring, subjective-evaluation, two-path-logic]

# Dependency graph
requires:
  - phase: 29-subjective-scorer-claude-enhancement
    plan: 01
    provides: SubjectiveResponse, BulletsOnlyResponse models; rewritten system prompt with JSON schema
  - phase: 28-deterministic-scorer
    provides: FulfillmentResult model for return type
provides:
  - Two-path score_listing() using OpenRouter httpx calls instead of Anthropic SDK
  - SUBJECTIVE_MODEL env var (default google/gemini-2.5-flash-lite)
  - Updated scoring router handling new tuple return type
affects: [31 (hybrid aggregator), 32 (deployment)]

# Tech tracking
tech-stack:
  added: []
  patterns: [httpx async OpenRouter calls with system+user messages, JSON response parsing with markdown fence stripping, fulfillment rounding to 0.1 step]

key-files:
  created:
    - backend/tests/test_subjective_scorer.py
  modified:
    - backend/app/services/claude.py
    - backend/app/routers/scoring.py
    - backend/tests/test_scoring.py

key-decisions:
  - "Kept ClaudeScorer class name and claude_scorer singleton for minimal router diff -- Phase 31 renames"
  - "criterion_type=None treated as subjective (consistent with Phase 27 design)"
  - "Router builds temporary ScoreResponse with placeholder overall_score=0 for backward compatibility"
  - "image_urls NOT sent to OpenRouter (text-only model); kept parameter for Phase 31 Claude fallback"

patterns-established:
  - "Two-path scoring: combined subjective+bullets vs bullets-only based on criterion_type filtering"
  - "_build_subjective_criteria_block() injects criteria section into user prompt"
  - "_to_fulfillment_result() converts SubjectiveCriterionResult to FulfillmentResult with 0.1 rounding"

requirements-completed: [SS-02, SS-04]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 29 Plan 02: Two-Path OpenRouter Scoring Summary

**OpenRouter httpx-based two-path scorer replacing Anthropic SDK with configurable SUBJECTIVE_MODEL, combined criteria+bullets path, and bullets-only path**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T13:34:25Z
- **Completed:** 2026-03-30T13:38:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced Anthropic SDK messages.parse() with httpx OpenRouter REST calls in claude.py
- Implemented two-path scoring: PATH A (combined subjective criteria + bullets) and PATH B (bullets-only)
- SUBJECTIVE_MODEL env var defaults to google/gemini-2.5-flash-lite, configurable at runtime
- Scoring router updated to unpack new tuple return type and build temporary ScoreResponse
- 15 new tests for subjective scorer + 4 updated existing tests, all 187 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement two-path scoring in claude.py with tests (TDD)** - `9813801` (test RED), `9d1f422` (feat GREEN)
2. **Task 2: Update scoring router for new return type** - `23e6fc7` (feat)

_Task 1 used TDD: RED (failing tests) -> GREEN (implementation) -> verify_

## Files Created/Modified
- `backend/app/services/claude.py` - Replaced Anthropic SDK with httpx OpenRouter; two-path score_listing(); _parse_json_response(); _to_fulfillment_result(); _build_subjective_criteria_block()
- `backend/app/routers/scoring.py` - Updated step 5 to unpack tuple return type; temporary ScoreResponse construction
- `backend/tests/test_subjective_scorer.py` - 15 tests: rounding, model config, combined/bullets-only paths, criterion_type=None, prompt content, no-anthropic check
- `backend/tests/test_scoring.py` - Updated 4 TestClaudeScorer tests from Anthropic SDK mock to OpenRouter httpx mock

## Decisions Made
- Kept ClaudeScorer class name and claude_scorer singleton name for minimal router diff. Phase 31 will rename to SubjectiveScorer/subjective_scorer.
- criterion_type=None fields are treated as subjective (consistent with Phase 27 design where unclassified fields default to LLM evaluation).
- Router builds a temporary ScoreResponse with overall_score=0 and match_tier="fair" as placeholders. Phase 31 will replace this with hybrid scorer aggregation.
- image_urls parameter kept in score_listing() signature but NOT sent to OpenRouter. Images are text-only for OpenRouter models; Phase 31 Claude fallback path may still use them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated 4 existing tests in test_scoring.py for new OpenRouter interface**
- **Found during:** Task 1 (verification of existing test suite)
- **Issue:** TestClaudeScorer tests in test_scoring.py referenced removed `get_client()` method and Anthropic SDK `messages.parse()` mock pattern
- **Fix:** Rewrote all 4 TestClaudeScorer tests to mock httpx POST with OpenRouter response format, assert tuple return type instead of ScoreResponse
- **Files modified:** backend/tests/test_scoring.py
- **Verification:** All 187 tests pass (15 new + 4 updated + 168 unchanged)
- **Committed in:** 9d1f422 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - tests for removed API surface)
**Impact on plan:** Necessary to keep existing test suite passing after Anthropic SDK removal. No scope creep.

## Issues Encountered
None

## User Setup Required
None - SUBJECTIVE_MODEL and OPENROUTER_API_KEY env vars already configured on EC2 from previous phases.

## Next Phase Readiness
- Phase 29 is now fully complete (Plan 01 models/prompts + Plan 02 scoring logic)
- Phase 30 (DB schema version) can proceed independently
- Phase 31 (hybrid aggregator) can now import:
  - `claude_scorer.score_listing()` returning `tuple[list[FulfillmentResult], list[str]]`
  - SubjectiveResponse, BulletsOnlyResponse from `app.models.scoring`
  - build_system_prompt, build_bullets_system_prompt from `app.prompts.scoring`
- All contracts and interfaces are defined and tested

## Self-Check: PASSED

- All 4 modified/created files exist on disk
- Task commits verified (9813801, 9d1f422, 23e6fc7)
- All imports succeed (claude_scorer, router, no Anthropic)
- 187/187 tests pass

---
*Phase: 29-subjective-scorer-claude-enhancement*
*Completed: 2026-03-30*
