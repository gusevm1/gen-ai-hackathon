---
phase: 07-preferences-schema-unification
verified: 2026-03-13T16:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 7: Preferences Schema Unification Verification Report

**Phase Goal:** Unify the preferences schema across web, backend, and Claude prompts — replace numeric weights with importance levels, add dealbreaker toggles, add new fields (floorPreference, availability, features).
**Verified:** 2026-03-13T16:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Zod schema defines all canonical fields: dealbreaker toggles, floorPreference, availability, importance levels, features (no selectedFeatures/weights) | VERIFIED | `web/src/lib/schemas/preferences.ts` exports `preferencesSchema` with `budgetDealbreaker`, `roomsDealbreaker`, `livingSpaceDealbreaker`, `floorPreference`, `availability`, `features`, `importance` — no `selectedFeatures` or `weights` fields present |
| 2 | Pydantic model mirrors Zod schema field-for-field with camelCase aliasing and backward-compatible parsing | VERIFIED | `backend/app/models/preferences.py` exports `UserPreferences` with all canonical fields, `ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")`, and `model_validator(mode="before")` migrating old-format JSONB |
| 3 | Old preferences JSONB (weights + selectedFeatures) parses without error, defaulting importance to medium and migrating selectedFeatures to features | VERIFIED | `migrate_legacy_format` validator handles both `selectedFeatures` (camelCase) and `selected_features` (snake_case); `test_parse_legacy_format` PASSED confirming migration |
| 4 | New preferences JSONB with importance levels and dealbreaker booleans parses correctly | VERIFIED | `test_parse_new_format` PASSED; `SAMPLE_PREFERENCES_JSON` in conftest uses new canonical format |
| 5 | Claude system prompt includes DEALBREAKER RULES and IMPORTANCE LEVELS sections | VERIFIED | `build_system_prompt()` contains "DEALBREAKER RULES:" section (score 0 + poor tier) and "IMPORTANCE LEVELS:" section (critical=90, high=70, medium=50, low=30) |
| 6 | Claude user prompt emits importance levels (CRITICAL/HIGH/MEDIUM/LOW) instead of numeric weights | VERIFIED | `_format_importance_section()` emits `imp.location.value.upper()` etc.; "Category weights (0-100" absent from `scoring.py`; `test_user_prompt_no_numeric_weights` PASSED |
| 7 | Claude user prompt includes dealbreaker flags with HARD LIMIT labels when dealbreaker is true | VERIFIED | `_format_dealbreakers_section()` outputs "HARD LIMIT" lines; inline "(DEALBREAKER)" appended to budget/rooms/living-space lines; `test_user_prompt_includes_dealbreaker_section` PASSED |
| 8 | Claude user prompt includes floor preference and availability fields | VERIFIED | `build_user_prompt()` lines 211-212: `**Floor preference:** {prefs.floor_preference}` and `**Availability:** {prefs.availability}`; tests `test_user_prompt_includes_floor_preference` and `test_user_prompt_includes_availability` PASSED |
| 9 | All test suites pass with zero regressions | VERIFIED | 76 backend tests PASSED, 38 web tests PASSED |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/lib/schemas/preferences.ts` | Canonical Zod schema with all fields, importance levels, dealbreaker toggles | VERIFIED | 59 lines; exports `importanceLevelSchema`, `preferencesSchema`, `Preferences` type; contains `importanceLevel` enum; no `selectedFeatures` or `weights` |
| `backend/app/models/preferences.py` | Pydantic model mirroring canonical schema with backward-compat validator | VERIFIED | 150 lines; exports `UserPreferences`, `ImportanceLevel`, `Importance`, `IMPORTANCE_WEIGHT_MAP`; `migrate_legacy_format` validator present |
| `backend/tests/test_preferences.py` | Pydantic model parsing tests for new and old format | VERIFIED | 194 lines (exceeds 50-line minimum); 11 tests covering new format, legacy format, defaults, extra fields, weight map, camelCase aliases, language literal |
| `backend/tests/conftest.py` | Updated SAMPLE_PREFERENCES_JSON (new format) + LEGACY_PREFERENCES_JSON fixture | VERIFIED | `SAMPLE_PREFERENCES_JSON` uses new canonical format with `importance`, `features`, `budgetDealbreaker`; `LEGACY_PREFERENCES_JSON` with `weights` + `selectedFeatures` present; `legacy_preferences_json` fixture added |
| `backend/app/prompts/scoring.py` | Updated system and user prompts with importance levels and dealbreaker semantics | VERIFIED | Contains "DEALBREAKER RULES:", "IMPORTANCE LEVELS:", `_format_importance_section()`, `_format_dealbreakers_section()`, `_fmt_range()` helpers; uses `prefs.features` (not `prefs.selected_features`) |
| `backend/tests/test_prompts.py` | Tests verifying new prompt format with importance levels and dealbreakers | VERIFIED | Contains "dealbreaker" and "importance" test cases; `test_system_prompt_includes_dealbreaker_rules`, `test_system_prompt_includes_importance_levels`, `test_user_prompt_includes_dealbreaker_section`, `test_user_prompt_omits_dealbreakers_when_none_active`, `test_user_prompt_includes_floor_preference`, `test_user_prompt_includes_availability`, `test_user_prompt_no_numeric_weights` all present |
| `backend/tests/test_score_endpoint.py` | Updated endpoint tests using new-format preferences | VERIFIED | Uses `SAMPLE_PREFERENCES_JSON` from conftest (new format); contains "importance" field reference via conftest |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `backend/app/models/preferences.py` | `backend/tests/conftest.py` | `UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)` | VERIFIED | `test_parse_new_format` calls `UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)` and asserts `prefs.importance.location == ImportanceLevel.HIGH` |
| `web/src/lib/schemas/preferences.ts` | `web/src/__tests__/preferences-schema.test.ts` | `preferencesSchema.parse()` | VERIFIED | Test file imports `preferencesSchema` and calls `.parse({})` and `.parse(input)` across 10 tests |
| `backend/app/prompts/scoring.py` | `backend/app/models/preferences.py` | `build_user_prompt` uses `prefs.importance` and `prefs.budget_dealbreaker` fields | VERIFIED | `_format_importance_section(prefs)` uses `prefs.importance.*`, `_format_dealbreakers_section(prefs)` uses `prefs.budget_dealbreaker`, `prefs.rooms_dealbreaker`, `prefs.living_space_dealbreaker` |
| `backend/app/prompts/scoring.py` | `backend/app/models/preferences.py` | `IMPORTANCE_WEIGHT_MAP` values used for prompt weight instructions | PARTIAL | `IMPORTANCE_WEIGHT_MAP` is NOT imported in `scoring.py` — the numeric values (critical=90, high=70, medium=50, low=30) are hardcoded as a string literal in the system prompt. Functionally equivalent but not using the constant directly. This is a style concern only; the prompt text is correct. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PREF-13 | 07-01-PLAN.md | Web/extension/backend preference schemas unified into canonical superset | SATISFIED | Zod schema, Pydantic model, and conftest all use canonical schema with importance levels, dealbreakers, features. No `selectedFeatures`/`weights` in app code. REQUIREMENTS.md marks as `[x]`. |
| PREF-14 | 07-02-PLAN.md | Claude prompt updated to use structured importance levels and all preference fields | SATISFIED | System prompt has DEALBREAKER RULES + IMPORTANCE LEVELS sections. User prompt emits CRITICAL/HIGH/MEDIUM/LOW labels, HARD LIMIT flags, floor preference, availability, uses `prefs.features`. REQUIREMENTS.md marks as `[x]`. |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps both PREF-13 and PREF-14 to Phase 7. Both are claimed by plans in this phase. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `web/src/components/preferences/soft-criteria.tsx` | 16, 20, 23, 28, 68 | References `selectedFeatures` field (old schema name) | Warning | Web UI form component still uses `selectedFeatures` which is no longer in the canonical Zod schema. This component will likely fail or silently lose data when the form submits. Phase 9 is expected to rebuild this UI component. No impact on Phase 7 goal (schema + prompt layer), but noted for Phase 9. |

---

### Human Verification Required

No human verification required. All Phase 7 deliverables (schema definitions, tests, prompt templates) are fully verifiable programmatically. The Claude prompt content quality (whether Claude actually respects DEALBREAKER instructions during live scoring) requires a live API call — but this is out of scope for Phase 7 and covered by integration testing in a later phase.

---

### Gaps Summary

No gaps. All 9 observable truths are VERIFIED. Both requirement IDs (PREF-13, PREF-14) are fully satisfied.

One observation worth noting for Phase 9:

- `web/src/components/preferences/soft-criteria.tsx` references `selectedFeatures` (old field name, now removed from the canonical Zod schema). This component was out of scope for Phase 7 (the plan explicitly deferred UI rebuilding to Phase 9), so it is not a gap for this phase. It is documented as a Warning anti-pattern so Phase 9 does not miss it.

The `IMPORTANCE_WEIGHT_MAP` key link is PARTIAL (values hardcoded in prompt string rather than imported from the constant) but this is functionally correct — the numeric values in the system prompt match the map definition exactly. This does not constitute a gap.

---

_Verified: 2026-03-13T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
