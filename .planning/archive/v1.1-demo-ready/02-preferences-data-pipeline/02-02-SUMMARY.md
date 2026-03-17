---
phase: 02-preferences-data-pipeline
plan: 02
subsystem: api, backend
tags: [fastapi, pydantic, httpx, flatfox-api, python, async]

# Dependency graph
requires:
  - phase: 01-foundation-onboarding
    provides: Project scaffold and git repo
provides:
  - FlatfoxListing Pydantic model parsing all verified Flatfox public API fields
  - FlatfoxClient async httpx client for GET /api/v1/public-listing/{pk}/
  - UserPreferences Pydantic model mirroring frontend Zod schema for Phase 3 scoring
  - GET /listings/{pk} FastAPI endpoint with 404/502 error handling
  - FastAPI app with CORS, health check, lifespan cleanup
  - 10 passing tests (6 model unit, 3 endpoint, 1 integration)
affects: [03-scoring-pipeline, 04-extension-ui]

# Tech tracking
tech-stack:
  added: [httpx, pytest, pytest-asyncio, pydantic (via fastapi)]
  patterns: [singleton httpx client with lazy init, FastAPI lifespan for resource cleanup, ASGI transport testing]

key-files:
  created:
    - backend/app/models/listing.py
    - backend/app/models/preferences.py
    - backend/app/services/flatfox.py
    - backend/app/routers/listings.py
    - backend/app/main.py
    - backend/requirements.txt
    - backend/pyproject.toml
    - backend/tests/conftest.py
    - backend/tests/test_listing_model.py
    - backend/tests/test_flatfox.py
  modified: []

key-decisions:
  - "Used /api/v1/public-listing/{pk}/ endpoint (NOT /api/v1/flat/ which returns 404)"
  - "number_of_rooms stored as Optional[str] matching Flatfox convention (e.g. '3.5')"
  - "Singleton FlatfoxClient with lazy httpx.AsyncClient init and 30s timeout"
  - "autouse fixture to reset singleton between tests avoiding stale event loop"
  - "asyncio_mode=auto in pyproject.toml for pytest-asyncio compatibility"

patterns-established:
  - "Singleton httpx client with lazy init: FlatfoxClient().get_client() creates on first use"
  - "FastAPI lifespan cleanup: asynccontextmanager yields then closes httpx client"
  - "ASGI transport testing: httpx.AsyncClient(transport=ASGITransport(app=app)) for endpoint tests"
  - "Integration test marker: @pytest.mark.integration for tests hitting external APIs"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 2 Plan 2: FastAPI Flatfox API Integration Summary

**Pydantic listing model + httpx async client fetching Flatfox public API with GET /listings/{pk} endpoint and 10 passing tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T14:10:29Z
- **Completed:** 2026-03-10T14:14:08Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Built FlatfoxListing Pydantic model with all verified API fields (pricing, location, attributes, media, agency)
- Built UserPreferences Pydantic model mirroring frontend Zod schema with OfferType/ObjectCategory enums and Weights defaults
- Built FlatfoxClient async httpx service with lazy init, 30s timeout, and correct /api/v1/public-listing/{pk}/ endpoint
- Built GET /listings/{pk} FastAPI endpoint with proper error mapping (404 -> 404, other HTTP errors -> 502, connection errors -> 502)
- Wired FastAPI app with lifespan cleanup, CORS middleware, health check, and listings router
- All 10 tests pass (6 model parsing, 3 endpoint via ASGI transport, 1 real Flatfox API integration)

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Failing tests for Pydantic models** - `1b8012d` (test)
2. **Task 1 (TDD GREEN): Implement models and Flatfox client** - `47a8bca` (feat)
3. **Task 2: Listings router, FastAPI app, integration tests** - `ef80399` (feat)

## Files Created/Modified
- `backend/app/models/listing.py` - FlatfoxListing, FlatfoxAttribute, FlatfoxAgency, FlatfoxAgencyLogo Pydantic models
- `backend/app/models/preferences.py` - UserPreferences, Weights, OfferType, ObjectCategory models
- `backend/app/services/flatfox.py` - FlatfoxClient async httpx client with singleton pattern
- `backend/app/routers/listings.py` - GET /listings/{pk} endpoint with error handling
- `backend/app/main.py` - FastAPI app with lifespan, CORS, health check, router
- `backend/requirements.txt` - fastapi, uvicorn, httpx, pytest, pytest-asyncio
- `backend/pyproject.toml` - pytest asyncio_mode=auto configuration
- `backend/tests/conftest.py` - Sample listing JSON fixtures, integration marker, client reset fixture
- `backend/tests/test_listing_model.py` - 6 unit tests for model parsing and defaults
- `backend/tests/test_flatfox.py` - 3 endpoint tests + 1 integration test

## Decisions Made
- Used /api/v1/public-listing/{pk}/ endpoint (verified live, /api/v1/flat/ returns 404)
- number_of_rooms stored as Optional[str] per Flatfox convention (Swiss "3.5" rooms)
- Singleton FlatfoxClient with lazy httpx.AsyncClient initialization and 30-second timeout
- Added autouse fixture to reset singleton client between tests (prevents stale event loop errors)
- Set asyncio_mode=auto in pyproject.toml for cleaner pytest-asyncio test execution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed singleton httpx client stale event loop between tests**
- **Found during:** Task 2 (integration tests)
- **Issue:** Singleton flatfox_client held an httpx.AsyncClient bound to a closed event loop from a previous test, causing RuntimeError
- **Fix:** Added autouse async fixture in conftest.py that closes and resets the singleton client after each test
- **Files modified:** backend/tests/conftest.py
- **Verification:** All 10 tests pass sequentially without event loop errors
- **Committed in:** `ef80399` (part of Task 2 commit)

**2. [Rule 3 - Blocking] Added pyproject.toml for pytest-asyncio mode configuration**
- **Found during:** Task 2 (test execution)
- **Issue:** pytest-asyncio strict mode required explicit @pytest.mark.asyncio decorators and had event loop sharing issues
- **Fix:** Created backend/pyproject.toml with asyncio_mode=auto
- **Files modified:** backend/pyproject.toml
- **Verification:** Tests run cleanly without manual asyncio markers
- **Committed in:** `ef80399` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug via Rule 1, 1 blocking via Rule 3)
**Impact on plan:** Both fixes necessary for test reliability. No scope creep.

## Issues Encountered
None beyond the auto-fixed issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend data pipeline complete: Flatfox listings fetchable and parseable
- UserPreferences model ready for Phase 3 scoring pipeline consumption
- GET /listings/{pk} endpoint ready for extension/website integration
- Phase 3 can build scoring endpoint that combines preferences + listing data for Claude evaluation

## Self-Check: PASSED

All 10 claimed files exist. All 3 commit hashes verified (1b8012d, 47a8bca, ef80399).

---
*Phase: 02-preferences-data-pipeline*
*Completed: 2026-03-10*
