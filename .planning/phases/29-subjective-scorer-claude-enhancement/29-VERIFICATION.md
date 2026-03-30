---
phase: 29-subjective-scorer-claude-enhancement
verified: 2026-03-30T14:00:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 29: Subjective Scorer (OpenRouter) Verification Report

**Phase Goal:** Replace Claude SDK scoring with OpenRouter-based subjective scorer — new Pydantic models, per-criterion fulfillment prompts, two-path logic, SUBJECTIVE_MODEL env var
**Verified:** 2026-03-30T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SubjectiveCriterionResult validates fulfillment in [0.0, 1.0] and rejects out-of-bounds | VERIFIED | `scoring.py:82 Field(ge=0.0, le=1.0)`; 5 model tests pass |
| 2 | SubjectiveResponse wraps list of criterion results plus 3-5 summary_bullets | VERIFIED | `scoring.py:96-97`; tests reject 2 and 6 bullets |
| 3 | BulletsOnlyResponse enforces 3-5 summary_bullets with no criteria field | VERIFIED | `scoring.py:100-109`; test_bullets_only_* tests pass |
| 4 | New system prompt contains all 4 preserved rules (sale/rent, language, image, proximity) | VERIFIED | All 4 rule blocks present; `test_system_prompt_contains_*` tests pass |
| 5 | System prompt never instructs overall_score or category-level scores | VERIFIED | Prompt uses indirect phrasing "combined total, per-category aggregation"; `test_system_prompt_no_overall_score` passes |
| 6 | System prompt includes explicit JSON output schema for OpenRouter | VERIFIED | Schema block at lines 89-98 of prompts/scoring.py; `test_system_prompt_contains_json_instruction` passes |
| 7 | Bullets-only system prompt contains language rules and bullet generation instructions, not fulfillment/criteria | VERIFIED | `build_bullets_system_prompt()` verified; zero occurrences of "criteria" word; `test_bullets_prompt_no_fulfillment` passes |
| 8 | When subjective criteria exist, exactly one OpenRouter call is made returning both fulfillment results and summary_bullets | VERIFIED | PATH A in `claude.py:197-231`; `test_combined_call_with_subjective_criteria` asserts `call_count == 1` |
| 9 | When zero subjective criteria exist, a separate bullets-only OpenRouter call generates summary_bullets | VERIFIED | PATH B in `claude.py:232-241`; `test_bullets_only_when_no_subjective` and `test_bullets_only_when_no_dynamic_fields` pass |
| 10 | SUBJECTIVE_MODEL env var defaults to google/gemini-2.5-flash-lite and is configurable | VERIFIED | `claude.py:39`; `TestSubjectiveModel.test_default_model` and `test_model_reads_from_env` pass |
| 11 | DynamicFields with criterion_type=None are treated as subjective | VERIFIED | `claude.py:191`; `test_none_criterion_type_treated_as_subjective` passes |
| 12 | score_listing() returns tuple of (list[FulfillmentResult], list[str]) | VERIFIED | `claude.py:177` type annotation; router unpacks tuple at line 142 |
| 13 | Scoring router handles the new return type without breaking the endpoint | VERIFIED | Router unpacks `subjective_results, summary_bullets`; builds `ScoreResponse` for backward compat; `Router imports OK` confirmed |
| 14 | Fulfillment values are rounded to 0.1 step in Python | VERIFIED | `_to_fulfillment_result()` at claude.py:78; `test_round_073_to_07` (0.73→0.7) and `test_round_075_to_08` (0.75→0.8) pass |
| 15 | No Anthropic Claude API calls are made in the scoring path | VERIFIED | Zero `anthropic` imports in claude.py; `test_no_anthropic_imports` passes using AST inspection |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/models/scoring.py` | SubjectiveCriterionResult, SubjectiveResponse, BulletsOnlyResponse models | VERIFIED | Lines 76-109; all three models present with correct fields and ConfigDict |
| `backend/app/prompts/scoring.py` | Rewritten build_system_prompt() and new build_bullets_system_prompt() | VERIFIED | Both functions present; JSON schema embedded; 4 rules preserved |
| `backend/tests/test_subjective_models.py` | Unit tests for models and prompts | VERIFIED | 31 tests in TestSubjectiveModels + TestPrompts; all pass |
| `backend/app/services/claude.py` | Two-path score_listing() using OpenRouter httpx calls; SUBJECTIVE_MODEL | VERIFIED | Full rewrite; httpx + OpenRouter; no Anthropic SDK; 252 lines |
| `backend/app/routers/scoring.py` | Updated router handling new score_listing() return type | VERIFIED | Lines 142-160; tuple unpacking; temporary ScoreResponse construction |
| `backend/tests/test_subjective_scorer.py` | Unit tests for two-path scoring logic | VERIFIED | 15 tests in TestFulfillmentRounding, TestSubjectiveModel, TestScoreListing; all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/models/scoring.py` | `backend/app/services/claude.py` | `import SubjectiveResponse, BulletsOnlyResponse` | WIRED | `claude.py:28: from app.models.scoring import BulletsOnlyResponse, SubjectiveResponse` |
| `backend/app/prompts/scoring.py` | `backend/app/services/claude.py` | `import build_system_prompt, build_bullets_system_prompt` | WIRED | `claude.py:30-34: from app.prompts.scoring import (build_bullets_system_prompt, build_system_prompt, build_user_prompt,)` |
| `backend/app/services/claude.py` | `backend/app/services/deterministic_scorer.py` | `import FulfillmentResult` | WIRED | `claude.py:29: from app.services.deterministic_scorer import FulfillmentResult` |
| `backend/app/services/claude.py` | `backend/app/models/preferences.py` | `import CriterionType` | WIRED | `claude.py:22-23: from app.models.preferences import (CriterionType, ...)` — used at line 191 |
| `backend/app/routers/scoring.py` | `backend/app/services/claude.py` | `calls claude_scorer.score_listing()` | WIRED | `scoring.py:142: subjective_results, summary_bullets = await claude_scorer.score_listing(...)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SS-01 | 29-01 | SubjectiveCriterionResult with criterion/fulfillment/reasoning; SubjectiveResponse wraps list + summary_bullets | SATISFIED | All three models in scoring.py lines 76-109; validated by 15 model tests |
| SS-02 | 29-02 | Subjective criteria batched in single OpenRouter call; SUBJECTIVE_MODEL env var; call skipped if zero subjective criteria | SATISFIED | Two-path logic in claude.py:197-241; SUBJECTIVE_MODEL at line 39; PATH B for zero-criteria case |
| SS-03 | 29-01 | Prompt instructs fulfillment in {0.0,0.1,...,1.0} per criterion with reasoning; never produce overall_score or category-level scores | SATISFIED | System prompt EVALUATION RULES + OUTPUT FORMAT; 4 preserved rule blocks; 16 prompt tests pass |
| SS-04 | 29-02 | 3-5 summary_bullets in user's preferred language in same OpenRouter call | SATISFIED | summary_bullets min/max enforced at model level; bullets generated in both PATH A and PATH B; LANGUAGE RULES in both prompts |

All 4 requirement IDs (SS-01, SS-02, SS-03, SS-04) satisfied. No orphaned requirements for Phase 29.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/routers/scoring.py` | 153-160 | `overall_score=0`, `match_tier="fair"` placeholder ScoreResponse | Info | Intentional; documented as `# TODO(Phase 31): Replace with hybrid scorer aggregation`; Phase 31 will replace with full aggregation |
| `backend/app/routers/scoring.py` | 3 | Docstring still says "via Claude" | Info | Cosmetic; no functional impact; Phase 31 or 32 will update |

No blockers. The placeholder ScoreResponse is the documented backward-compatibility bridge for Phase 31.

### Human Verification Required

None. All must-haves are verifiable programmatically via unit tests and static analysis.

### Gaps Summary

No gaps. All 15 observable truths are verified. All 6 artifacts exist and are substantive and wired. All 4 key links are confirmed wired by import inspection. All 4 requirement IDs (SS-01–SS-04) are satisfied with evidence. The full non-integration test suite passes (187 tests, 0 failures). All 5 task commits exist in git history.

---

_Verified: 2026-03-30T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
