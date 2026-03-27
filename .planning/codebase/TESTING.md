---
focus: quality
generated: 2026-03-27
---

# Testing

## Extension Tests

**Framework:** Vitest ^4.0.18 + WxtVitest plugin + happy-dom
**Location:** `extension/src/__tests__/*.test.ts`
**Run:** `cd extension && npm test`
**Config:** `extension/vitest.config.ts`

### Test Files

| File | What it covers |
|---|---|
| `weight-redistribution.test.ts` | `redistributeWeights()` — proportional redistribution, edge cases, rounding |
| `profile-storage.test.ts` | `profileStorage` / `wizardStateStorage` — read/write via WXT `fakeBrowser` |
| `profile-schema.test.ts` | `PreferenceProfileSchema` / `SoftCriterionSchema` — Zod validation, required fields, ranges |
| `background.test.ts` | `handleInstalled` — opens onboarding on install, not on update |
| `content-matches.test.ts` | Content script listing detection logic |
| `flatfox-parser.test.ts` | Flatfox page parsing helpers |
| `scoring-types.test.ts` | ScoreResponse type validation |
| `auth-flow.test.ts` | Auth state transitions |
| `loading-state.test.ts` | Loading state management |
| `popup-profile.test.ts` | Popup profile display |
| `stale-badge.test.ts` | Stale badge display logic |

### Patterns

- `fakeBrowser.reset()` in `beforeEach` for storage isolation
- `vi.spyOn()` for browser API stubs (tabs, runtime)
- `vi.restoreAllMocks()` in `afterEach`
- Pure unit tests for utilities; integration-style tests for storage via `fakeBrowser`

## Backend Tests

**Framework:** pytest + pytest-asyncio (auto mode)
**Location:** `backend/tests/`
**Run:** `cd backend && pytest`
**Config:** `backend/pyproject.toml` (`asyncio_mode = "auto"`)

### Test Files

| File | What it covers |
|---|---|
| `test_scoring.py` | Core scoring logic |
| `test_scoring_models.py` | Pydantic model validation for scoring |
| `test_score_endpoint.py` | POST /score endpoint (integration) |
| `test_flatfox.py` | FlatfoxClient — API fetching and page parsing |
| `test_chat_endpoint.py` | POST /chat endpoint |
| `test_conversation.py` | Conversation service / multi-turn logic |
| `test_prompts.py` | Prompt building functions |
| `test_preferences.py` | UserPreferences model validation |
| `test_listing_model.py` | FlatfoxListing model |
| `test_image_scoring.py` | Image content block building |
| `conftest.py` | Shared fixtures |

### Patterns

- Async tests via `pytest-asyncio` with `asyncio_mode = "auto"` (no `@pytest.mark.asyncio` needed)
- Fixtures in `conftest.py` for shared test data

## Web App Tests

**Framework:** Vitest ^4.0.18 + @testing-library/react + jsdom
**Location:** `web/src/__tests__/`
**Run:** `cd web && npx vitest run`
**Config:** `web/vitest.config.mts`

### Test Files

| File | What it covers |
|---|---|
| `preferences-schema.test.ts` | Zod preferences schema validation |
| `chat-preferences-mapper.test.ts` | Chat output → preferences mapping |
| `category-breakdown.test.ts` | CategoryBreakdown component |
| `analysis-page.test.ts` | Analysis detail page |
| `chat-page.test.tsx` | Chat page component |
| `ai-avatar.test.tsx` | AI avatar component |
| `sidebar.test.tsx` | Sidebar component |
| `navbar.test.tsx` | Navbar component |
| `top-navbar.test.tsx` | Top navbar component |
| `theme-toggle.test.tsx` | Theme toggle |
| `download-page.test.tsx` | Extension download page |
| `twenty-first-component.test.tsx` | (Component test) |

## Testing Gaps

- **No E2E tests** — no Playwright/Cypress covering the full user flow
- **No integration tests** against real Supabase or real Flatfox API
- **No load/performance tests** for batch scoring
- **Claude API mocked** in backend tests — real LLM behavior not tested
- **Edge function** (`score-proxy`) has no test coverage
- **Auth flow** in web app not covered by tests
- **Content script DOM injection** on live Flatfox pages not tested
