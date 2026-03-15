---
phase: 11-dynamic-preference-schema
verified: 2026-03-15T14:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 11: Dynamic Preference Schema — Verification Report

**Phase Goal:** Replace static softCriteria string array with typed DynamicField schema (name + value + importance level) in both Pydantic and Zod, migrate existing data, update scoring prompt to weight by importance, and provide a UI editor for dynamic fields.
**Verified:** 2026-03-15T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DynamicField type exists in Zod with name (min 1), value (default ''), and importance (critical/high/medium/low) | VERIFIED | `web/src/lib/schemas/preferences.ts` lines 9-13: `dynamicFieldSchema` defined with all three fields and correct validation |
| 2 | DynamicField model exists in Pydantic with name, value, importance fields and camelCase alias support | VERIFIED | `backend/app/models/preferences.py` lines 66-88: `class DynamicField(BaseModel)` with `to_camel` alias_generator, field_validator rejecting empty names |
| 3 | Preferences with softCriteria but no dynamicFields auto-migrate in Pydantic model_validator | VERIFIED | `backend/app/models/preferences.py` lines 181-200: migrates both camelCase `softCriteria` and snake_case `soft_criteria`, filters empty strings |
| 4 | migratePreferences() function exists in Zod schema for web-side pre-parse migration | VERIFIED | `web/src/lib/schemas/preferences.ts` lines 81-94: exported function migrates softCriteria -> dynamicFields, skips if dynamicFields already present |
| 5 | Claude scoring prompt renders dynamic fields grouped by importance (CRITICAL/HIGH/MEDIUM/LOW) | VERIFIED | `backend/app/prompts/scoring.py` lines 144-178: `_format_dynamic_fields_section()` groups by importance with correct labels |
| 6 | System prompt references "custom criterion" not "soft criterion" | VERIFIED | `backend/app/prompts/scoring.py` line 44: "evaluate each custom criterion and desired feature individually" |
| 7 | DynamicFieldsSection component renders with useFieldArray for add/edit/remove | VERIFIED | `web/src/components/preferences/dynamic-fields-section.tsx` lines 28-31: `useFieldArray({ control: form.control, name: 'dynamicFields' })` with append/remove |
| 8 | PreferencesForm uses DynamicFieldsSection (not SoftCriteriaSection) | VERIFIED | `web/src/components/preferences/preferences-form.tsx` line 20: imports `DynamicFieldsSection`; line 95: renders it in "dynamic" accordion item |
| 9 | migratePreferences wired at all profile load call sites | VERIFIED | `profiles/[profileId]/page.tsx` line 32 and `dashboard/actions.ts` line 52: both call `migratePreferences(...)` before `preferencesSchema.parse(...)` |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/lib/schemas/preferences.ts` | dynamicFieldSchema + dynamicFields field on preferencesSchema + migratePreferences function | VERIFIED | All three exports present; dynamicFieldSchema at line 9, dynamicFields on preferencesSchema at line 63, migratePreferences at line 81 |
| `backend/app/models/preferences.py` | DynamicField BaseModel + dynamic_fields field on UserPreferences + migration in model_validator | VERIFIED | DynamicField at line 66, dynamic_fields at line 135, migration at lines 181-200 |
| `backend/tests/conftest.py` | SAMPLE_PREFERENCES_JSON updated with dynamicFields | VERIFIED | Lines 126-129: dynamicFields array with 2 entries present in SAMPLE_PREFERENCES_JSON |
| `backend/tests/test_preferences.py` | Tests for DynamicField parsing, validation, migration | VERIFIED | TestDynamicFields class (7 tests, lines 198-258) and TestSoftCriteriaMigration class (6 tests, lines 261-335) |
| `web/src/__tests__/preferences-schema.test.ts` | Tests for dynamicFields schema validation, defaults, migration | VERIFIED | `describe('dynamicFields')` block (5 tests) and `describe('migratePreferences')` block (5 tests) |
| `backend/app/prompts/scoring.py` | _format_dynamic_fields_section() + updated build_user_prompt + updated build_system_prompt | VERIFIED | All three present: function at line 144, build_user_prompt updated at lines 248-256, system prompt updated at line 44 |
| `backend/tests/test_prompts.py` | Tests for dynamic fields rendering in prompt with importance grouping | VERIFIED | TestDynamicFieldsPrompt class (11 tests) at lines 250-413 covering all importance labels, backward compat, and system prompt reference |
| `web/src/components/preferences/dynamic-fields-section.tsx` | DynamicFieldsSection component using useFieldArray | VERIFIED | Component created, useFieldArray at line 28-31, name/value/importance inputs, add/remove controls |
| `web/src/lib/profile-summary.ts` | Profile summary includes dynamic fields information | VERIFIED | Lines 84-99: shows count, first 2 names, and highlights critical fields |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/models/preferences.py` | Supabase JSONB | model_validator migrates softCriteria -> dynamicFields | WIRED | Lines 181-200: both `softCriteria` (camelCase) and `soft_criteria` (snake_case) migration paths implemented |
| `web/src/lib/schemas/preferences.ts` | preferencesSchema.parse() call sites | migratePreferences() called before parse at load points | WIRED | Both call sites confirmed: `profiles/[profileId]/page.tsx:32` and `dashboard/actions.ts:52` |
| `backend/app/prompts/scoring.py` | `backend/app/models/preferences.py` | prefs.dynamic_fields used in _format_dynamic_fields_section | WIRED | Lines 156 and 161: `prefs.dynamic_fields` accessed directly in the function |
| `web/src/components/preferences/dynamic-fields-section.tsx` | `web/src/lib/schemas/preferences.ts` | useFieldArray on dynamicFields + DynamicField type | WIRED | Line 30: `name: 'dynamicFields'`; line 4: `type Preferences` imported from schema |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHM-01 | 11-01, 11-02 | User preferences support dynamic AI-generated fields with importance levels replacing softCriteria | SATISFIED | DynamicField type in both schemas; UI editor in DynamicFieldsSection; migration at load points |
| SCHM-02 | 11-01 | Zod schema (web) includes DynamicField type with name, value, and importance | SATISFIED | `dynamicFieldSchema` exported from `preferences.ts` line 9; `DynamicField` type at line 16 |
| SCHM-03 | 11-01 | Pydantic model (backend) includes dynamic_fields with proper validation (not silently dropped) | SATISFIED | `dynamic_fields: list[DynamicField]` field at line 135; not in `extra="ignore"` scope |
| SCHM-04 | 11-02 | Claude scoring prompt renders dynamic fields as weighted custom criteria section | SATISFIED | `_format_dynamic_fields_section` renders 4 importance groups; `build_user_prompt` uses it when present |
| SCHM-05 | 11-01 | Existing softCriteria data migrates to dynamicFields format via backward-compat migration | SATISFIED | Pydantic model_validator + Zod migratePreferences both handle camelCase and snake_case variants |

No orphaned requirements — all five SCHM requirements are claimed by plans and verified in the codebase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dynamic-fields-section.tsx` | 45, 50, 62 | "placeholder" strings | Info | These are HTML input `placeholder=` attributes — intentional and correct. Not a code quality issue. |

No blocker or warning anti-patterns found. All implementations are substantive (no stub returns, no TODO/FIXME markers, no empty handlers).

---

### Human Verification Required

#### 1. Dynamic Fields UI Rendering

**Test:** Open the web app, navigate to a profile edit page, expand the "Custom Criteria" accordion. Add a criterion, set importance to "Critical", save, reload.
**Expected:** Criterion persists with correct importance level; summary section shows the criterion name prefixed with "Must-have:".
**Why human:** Visual rendering and form state persistence after reload cannot be verified programmatically from the source alone.

#### 2. Backward Compatibility — Existing Profile with softCriteria

**Test:** In Supabase, find a profile whose `preferences` JSONB contains `softCriteria` but no `dynamicFields`. Open the profile edit page.
**Expected:** The "Custom Criteria" accordion is populated with the migrated criteria (one entry per soft criterion, importance = "Medium"). No blank editor.
**Why human:** Requires a live Supabase row with legacy data to confirm end-to-end migration flow.

#### 3. Scoring Prompt with Dynamic Fields

**Test:** Score a listing from the extension with a profile that has dynamic fields set at various importance levels. View the analysis page.
**Expected:** The scoring output checklist references the dynamic field names. Critical fields should influence the score more visibly than low-priority ones.
**Why human:** Claude's response quality and importance weighting cannot be unit-tested; requires a live scoring run.

---

### Gaps Summary

No gaps. All 9 observable truths are verified, all artifacts exist and are substantive, all key links are wired, and all 5 SCHM requirements have implementation evidence. The phase goal is fully achieved.

---

### Commit Verification

All 7 task commits confirmed present in git history:

| Commit | Message |
|--------|---------|
| `84fb92e` | test(11-01): add failing tests for DynamicField parsing, validation, and migration |
| `f62a777` | feat(11-01): add DynamicField Pydantic model with migration from softCriteria |
| `e70ac18` | test(11-01): add failing tests for Zod dynamicFieldSchema and migratePreferences |
| `02ce126` | feat(11-01): add dynamicFieldSchema, DynamicField type, and migratePreferences to Zod schema |
| `f7a0945` | test(11-02): add failing tests for dynamic fields in scoring prompt |
| `144afaf` | feat(11-02): render dynamic fields with importance grouping in scoring prompt |
| `37bbab6` | feat(11-02): replace SoftCriteriaSection with DynamicFieldsSection and wire migration |

---

_Verified: 2026-03-15T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
