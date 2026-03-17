---
phase: 15-ai-conversation-backend
verified: 2026-03-17T07:00:00Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "Chat page sends real messages to EC2 backend and displays Claude's responses"
    status: partial
    reason: >
      The fetch call to NEXT_PUBLIC_BACKEND_URL/chat is wired, but on the very first
      message triggerAIResponse reads the stale profileName state (still '') because
      React state updates are async and setProfileName(name) has not yet re-rendered
      when triggerAIResponse(pendingDescription) is invoked in the same synchronous
      handleNameSubmit call. The backend requires profile_name with min_length=1 and
      will return 422, which the frontend will display as an inline error message.
      Subsequent messages (sent after the first render cycle) work correctly.
    artifacts:
      - path: "web/src/components/chat/chat-page.tsx"
        issue: >
          triggerAIResponse at line 91 is called directly after setProfileName(name)
          in handleNameSubmit. The closure captures the stale profileName='' rather
          than the newly set value. The name parameter is available in scope but not
          passed to triggerAIResponse.
    missing:
      - "Pass name directly to triggerAIResponse (or a wrapper) in handleNameSubmit
         instead of relying on the profileName state value in the closure, e.g.:
         triggerAIResponse(pendingDescription, name) with profile_name: name || profileName"
  - truth: "EC2 backend deployed and serving POST /chat"
    status: failed
    reason: >
      SSH key was unavailable during plan execution. Backend code is complete and committed
      to main (commits 7195c75, 9979d41). Deployment was not executed. Human must SSH to
      EC2 and pull + restart uvicorn, or the NEXT_PUBLIC_BACKEND_URL will be unreachable.
    artifacts:
      - path: "EC2 63.176.136.105:8000"
        issue: "Cannot verify — deployment not performed, SSH key unavailable"
    missing:
      - "Run deployment: ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 \
         'cd gen-ai-hackathon && git pull && pkill -f uvicorn; cd backend && \
         nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn \
         app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &'"
      - "Verify health: ssh to EC2 and run: curl -s http://localhost:8000/health"
human_verification:
  - test: "End-to-end conversation flow after EC2 deployment"
    expected: >
      User types a property description, Claude responds conversationally, asks
      follow-ups, and eventually returns ready_to_summarize=true with extracted_preferences.
      Browser console shows '[HomeMatch] Preferences ready:' log with correct fields.
    why_human: "Requires live EC2 endpoint with ANTHROPIC_API_KEY and real Claude API call"
  - test: "First message profile_name bug"
    expected: >
      After entering profile name and starting chat, the first message should succeed
      (200 from /chat, not a 422 inline error). If the stale-closure bug is present,
      the first response in the thread will be 'Sorry, I encountered an error. Please try again.'
    why_human: "React state timing behavior requires browser execution to confirm"
---

# Phase 15: AI Conversation Backend Verification Report

**Phase Goal:** The EC2 backend hosts a conversation endpoint where Claude extracts structured preferences from natural language, asks smart follow-up questions, and signals when it has enough information
**Verified:** 2026-03-17T07:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /chat accepts conversation history and returns Claude's response | VERIFIED | `backend/app/routers/chat.py` implements `@router.post("")` with `ChatRequest` body and `ChatResponse` return; all 6 endpoint tests pass |
| 2 | Claude extracts structured preferences matching UserPreferences schema when ready | VERIFIED | `map_extracted_to_user_preferences` in `conversation.py` maps all fields; `test_map_extracted_validates_against_user_preferences` confirms `UserPreferences.model_validate()` succeeds |
| 3 | Claude asks follow-up questions when key fields are missing | VERIFIED | System prompt in `prompts/conversation.py` enforces ONE follow-up at a time and withholds `<preferences_ready>` tag until location + budget + property type gathered |
| 4 | Claude infers importance levels from language cues | VERIFIED | System prompt contains explicit Importance Inference Rules mapping "absolutely must"/"essential" to critical, "really want" to high, "would be nice" to medium, "not important" to low, and dealbreaker language to `_is_dealbreaker=true` |
| 5 | Claude signals readiness via ready_to_summarize boolean | VERIFIED | `parse_preferences_ready` regex parses `<preferences_ready>` sentinel; `conversation_service.chat()` sets `ready=True` and maps preferences when tag found; `ChatResponse.ready_to_summarize` field carries the signal |
| 6 | Chat page sends real messages to EC2 backend | PARTIAL | `triggerAIResponse` uses `fetch(${BACKEND_URL}/chat)` with correct JSON body; `mockAIResponse` fully removed (grep returns 0); however, stale-closure bug sends `profile_name: ""` on the first message causing 422 from backend |
| 7 | Error states are handled gracefully with user-visible feedback | VERIFIED | `catch(err)` block in `triggerAIResponse` inserts error as inline assistant message in the thread |
| 8 | EC2 backend deployed and serving | FAILED | SSH key unavailable during execution; backend code committed to main but deployment not performed |

**Score:** 7/8 truths verified (6 fully VERIFIED, 1 PARTIAL, 1 FAILED)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/models/chat.py` | ChatRequest, ChatResponse, ChatMessage Pydantic models | VERIFIED | All three models present with correct field types, min_length constraints, role literal |
| `backend/app/prompts/conversation.py` | System prompt builder for Swiss property advisor | VERIFIED | `build_conversation_system_prompt(profile_name)` returns full prompt with all required sections |
| `backend/app/services/conversation.py` | ConversationService with AsyncAnthropic singleton, sentinel parsing | VERIFIED | `conversation_service`, `parse_preferences_ready`, `strip_preferences_tag`, `map_extracted_to_user_preferences` all present and substantive |
| `backend/app/routers/chat.py` | POST /chat endpoint | VERIFIED | Router with prefix="/chat", role alternation validation, 502 on service error |
| `backend/tests/test_conversation.py` | Unit tests for parsing, mapping | VERIFIED | 13 tests covering all sentinel and mapping behaviors; all pass |
| `backend/tests/test_chat_endpoint.py` | Endpoint tests with mocked ConversationService | VERIFIED | 6 tests including success, with_preferences, empty_messages, missing_profile_name, wrong_role_order, service_error; all pass |
| `web/src/components/chat/chat-page.tsx` | Real API integration replacing mock setTimeout | PARTIAL | `mockAIResponse` removed, real fetch wired — but stale-closure bug sends `profile_name: ""` on first message |
| `backend/app/prompts/__init__.py` | Package init file | VERIFIED | File exists in `backend/app/prompts/` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/routers/chat.py` | `backend/app/services/conversation.py` | `from app.services.conversation import conversation_service` | WIRED | Line 13 of chat.py matches exact pattern |
| `backend/app/main.py` | `backend/app/routers/chat.py` | `app.include_router(chat.router)` | WIRED | Line 42 of main.py; also imported at line 15 |
| `backend/app/services/conversation.py` | `backend/app/prompts/conversation.py` | `from app.prompts.conversation import build_conversation_system_prompt` | WIRED | Line 18 of conversation.py; called inside `ConversationService.chat()` |
| `backend/app/main.py` | `conversation_service.close()` in lifespan | lifespan shutdown block | WIRED | Line 27 of main.py |
| `web/src/components/chat/chat-page.tsx` | EC2 POST /chat | `fetch(${BACKEND_URL}/chat)` | PARTIAL | Fetch call present at line 37; `BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL` at line 19; but stale-closure bug on first call; EC2 not confirmed running |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-01 | 15-01, 15-02 | FastAPI endpoint on EC2 handles multi-turn conversation state and calls Claude via ANTHROPIC_API_KEY | SATISFIED (code); BLOCKED (deployment) | `POST /chat` accepts full conversation history as messages array; AsyncAnthropic client initialized with env var; EC2 deployment unconfirmed |
| AI-02 | 15-01 | Claude extracts structured preferences: location, budget, property type, rooms, size, lifestyle preferences, nearby amenities, importance levels | SATISFIED | System prompt enumerates all 10 fields; `map_extracted_to_user_preferences` maps all fields to UserPreferences schema; validated by test |
| AI-03 | 15-01, 15-02 | Claude asks targeted follow-up questions when key preference fields are missing | SATISFIED | System prompt rule: ask ONE follow-up; withhold `<preferences_ready>` until minimum 3 fields gathered |
| AI-04 | 15-01, 15-02 | Claude infers importance levels from language cues | SATISFIED | Importance Inference Rules section in system prompt maps 5 language patterns to importance levels + dealbreaker flag |
| AI-05 | 15-01, 15-02 | Claude signals when it has sufficient information to generate a preference summary | SATISFIED | Sentinel tag `<preferences_ready>` parsed by regex; `ready_to_summarize=True` in ChatResponse when detected |

All 5 required IDs (AI-01 through AI-05) are claimed by plans 15-01 and 15-02. No orphaned requirements found for Phase 15 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `web/src/components/chat/chat-page.tsx` | 42 | `profile_name: profileName` uses stale closure state | Warning | First message in every new conversation will send `profile_name: ""` causing 422 from backend; user sees inline error "Sorry, I encountered an error" |
| `web/src/components/chat/chat-page.tsx` | 58-61 | `console.log` placeholder for `ready_to_summarize` signal | Info | Intentional Phase 16 deferral; no functional impact in Phase 15 scope |

### Human Verification Required

#### 1. EC2 Deployment

**Test:** SSH to EC2 (`ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105`) and run:
```
cd gen-ai-hackathon && git pull && pkill -f uvicorn
cd backend && nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
sleep 2 && curl -s http://localhost:8000/health
```
**Expected:** `{"status":"healthy","service":"homematch-api"}`
**Why human:** SSH key not available in agent environment

#### 2. First Message Profile Name Bug

**Test:** Open the web app, type a property description, enter a profile name, click Continue. Observe the first assistant response.
**Expected:** Claude responds with a friendly follow-up question. No error message in the thread.
**Why human:** React state timing (stale closure) requires browser rendering to confirm actual behavior. If broken, first response will be "Sorry, I encountered an error. Please try again. (Chat failed: 422)"

#### 3. Full Conversation Flow

**Test:** After EC2 is deployed, complete a multi-turn conversation:
1. Start with: "I'm looking for a 3-room apartment in Zurich, around 2000-2500 CHF per month. Must have a balcony."
2. Respond to Claude's follow-up with: "Near Zurich HB, absolutely must be quiet, a nice view would be a bonus"
3. Continue until Claude signals readiness

**Expected:** Claude responds conversationally, asks one question at a time, and eventually returns a response without the `<preferences_ready>` tag in the visible text. Browser console (F12) shows `[HomeMatch] Preferences ready:` with a correctly structured object containing location "Zurich", budget 2000-2500, features including "balcony", importance with quiet=critical.
**Why human:** Requires live Claude API call; real-time response quality and Swiss context cannot be verified programmatically

### Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Stale closure bug (wiring, partial blocker):** In `web/src/components/chat/chat-page.tsx`, `handleNameSubmit` calls `setProfileName(name)` then immediately `triggerAIResponse(pendingDescription)`. React state is async; `triggerAIResponse` closes over `profileName` which is still `''`. The backend's `min_length=1` constraint on `profile_name` will reject this with 422. The user sees an error on the very first message of every conversation. Fix: pass `name` directly into `triggerAIResponse` or a wrapper call in `handleNameSubmit`.

**Gap 2 — EC2 deployment not executed (infrastructure):** The backend code is complete, all 95 tests pass, and the code is committed to main. However SSH deployment was not run due to unavailable SSH key. The endpoint at `63.176.136.105:8000/chat` may not be running the Phase 15 code. Human must deploy and verify health.

These two gaps mean the phase goal "EC2 backend hosts a conversation endpoint" is met in code but not confirmed in production, and the frontend integration has a first-message failure. The backend logic itself (requirements AI-01 through AI-05) is fully implemented and tested.

---

_Verified: 2026-03-17T07:00:00Z_
_Verifier: Claude (gsd-verifier)_
