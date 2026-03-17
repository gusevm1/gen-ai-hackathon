---
phase: 15-ai-conversation-backend
plan: 01
subsystem: api
tags: [claude, anthropic, fastapi, pydantic, conversation, chat, preferences]

# Dependency graph
requires:
  - phase: 07-scoring-pipeline
    provides: UserPreferences Pydantic model and scoring patterns
provides:
  - POST /chat endpoint for AI property advisor conversations
  - ConversationService with AsyncAnthropic singleton for multi-turn chat
  - Sentinel <preferences_ready> parsing and preference extraction
  - System prompt for Swiss property advisor with importance inference
affects: [16-chat-frontend-integration, ai-conversation-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: [sentinel-tag-parsing, conversation-service-singleton, message-alternation-validation]

key-files:
  created:
    - backend/app/models/chat.py
    - backend/app/services/conversation.py
    - backend/app/prompts/conversation.py
    - backend/app/routers/chat.py
    - backend/tests/test_conversation.py
    - backend/tests/test_chat_endpoint.py
  modified:
    - backend/app/main.py
    - backend/tests/conftest.py
    - backend/app/services/claude.py

key-decisions:
  - "Used regex sentinel tag <preferences_ready> for structured extraction from conversational responses"
  - "Added from __future__ import annotations to claude.py for Python 3.9 compat"

patterns-established:
  - "Sentinel tag parsing: regex-based extraction of structured JSON from freeform text"
  - "Message alternation validation: enforce user/assistant role order in chat endpoint"
  - "Preference mapping: snake_case Claude output to camelCase UserPreferences-compatible dict"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05]

# Metrics
duration: 6min
completed: 2026-03-17
---

# Phase 15 Plan 01: AI Conversation Backend Summary

**Stateless POST /chat endpoint with Claude-powered Swiss property advisor, sentinel-based preference extraction, and 19 unit/endpoint tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T06:10:57Z
- **Completed:** 2026-03-17T06:17:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- ChatRequest/ChatResponse/ChatMessage Pydantic models with validation (min_length, role literals)
- ConversationService with lazy AsyncAnthropic singleton, sentinel parsing, and preference mapping
- Comprehensive Swiss property advisor system prompt with importance inference rules and exact JSON schema
- POST /chat router with message alternation validation, registered in main.py with lifespan cleanup
- 19 tests total: 13 unit tests (parsing, mapping, models) + 6 endpoint tests (success, preferences, validation, errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Test scaffolds + Pydantic models + sentinel parser + preference mapper** - `7195c75` (feat, TDD)
2. **Task 2: System prompt + router + main.py registration + endpoint tests** - `9979d41` (feat)

## Files Created/Modified
- `backend/app/models/chat.py` - ChatMessage, ChatRequest, ChatResponse Pydantic models
- `backend/app/services/conversation.py` - ConversationService with parse/strip/map utilities
- `backend/app/prompts/conversation.py` - Swiss property advisor system prompt builder
- `backend/app/routers/chat.py` - POST /chat endpoint with role alternation validation
- `backend/app/main.py` - Router registration and conversation_service lifespan cleanup
- `backend/tests/test_conversation.py` - 13 unit tests for parsing, mapping, model validation
- `backend/tests/test_chat_endpoint.py` - 6 endpoint tests with mocked ConversationService
- `backend/tests/conftest.py` - Chat fixtures (SAMPLE_CHAT_MESSAGES, SAMPLE_CLAUDE_RESPONSE_*)
- `backend/app/services/claude.py` - Added `from __future__ import annotations` for Python 3.9 compat

## Decisions Made
- Used regex sentinel tag `<preferences_ready>` for structured extraction from conversational responses (per CONTEXT.md decision)
- Added `from __future__ import annotations` to claude.py to fix Python 3.9 type annotation compatibility (pre-existing issue surfaced during test collection)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Python 3.9 type annotation compatibility in claude.py**
- **Found during:** Task 2 (endpoint test collection)
- **Issue:** `list[str] | None` syntax in claude.py fails on Python 3.9 (local env); code was written for 3.10+
- **Fix:** Added `from __future__ import annotations` to `backend/app/services/claude.py`
- **Files modified:** `backend/app/services/claude.py`
- **Verification:** Full test suite (95 tests) passes
- **Committed in:** 9979d41 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for local test execution. No scope creep.

## Issues Encountered
- Local Python 3.9 environment required installing pytest, pydantic, anthropic, httpx, fastapi, python-dotenv, and supabase packages. Production EC2 has a venv with all dependencies pre-installed.

## User Setup Required
None - no external service configuration required. ANTHROPIC_API_KEY is already set on EC2.

## Next Phase Readiness
- POST /chat endpoint is ready for frontend integration (Phase 16)
- ConversationService exports are stable: conversation_service singleton, parse/strip/map utilities
- System prompt is complete and tested; can be refined based on real conversation testing

---
*Phase: 15-ai-conversation-backend*
*Completed: 2026-03-17*
