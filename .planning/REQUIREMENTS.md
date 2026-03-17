# Requirements: HomeMatch v3.0

**Defined:** 2026-03-17
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## v2.0 Requirements (in progress — phases 12-13 pending)

### Score Caching

- [x] **CACHE-01**: System returns cached score when listing_id + profile_id combination already exists in the analyses table
- [x] **CACHE-02**: Cache is invalidated when user saves updated preferences for a profile
- [x] **CACHE-03**: User can force a re-score from the extension FAB (manual override)

### Profile Management

- [ ] **PROF-08**: Duplicate profile action opens a rename modal pre-filled with "[Name] (copy)"; user can edit before creating

### Analysis History

- [ ] **HIST-01**: Analysis page shows all past analyses across all profiles, with each entry labeled by its profile name
- [ ] **HIST-02**: User can click any past analysis to navigate to its full analysis view

### Security

- [ ] **SEC-01**: Edge function JWT verification is enabled (remove `--no-verify-jwt` flag)
- [ ] **SEC-02**: Extension auth flow passes tokens that the edge function can verify end-to-end

## v3.0 Requirements

Requirements for the AI-Powered Conversational Profile Creation milestone. Each maps to a roadmap phase.

### Navigation (NAV)

- [x] **NAV-01**: "AI-Powered Search" nav item appears in the top navbar using the existing pinkish-red accent color to visually distinguish it as a key feature
- [x] **NAV-02**: Navigation order is: HomeMatch Logo | AI-Powered Search | Profiles | Analysis | Settings

### Chat Interface (CHAT)

- [x] **CHAT-01**: "AI-Powered Search" page displays a minimal, centered layout with a large text input as the primary element
- [x] **CHAT-02**: Input placeholder guides the user to describe location, budget, size, rooms, lifestyle preferences, and nearby amenities (train, schools, supermarkets, cafés, etc.)
- [x] **CHAT-03**: On the first (pre-conversation) message, a large "Start Creating Profile" button is shown instead of the standard send arrow
- [x] **CHAT-04**: Pressing "Start Creating Profile" prompts the user to enter a profile name before the conversation begins
- [x] **CHAT-05**: After the user enters a name and continues, the conversation starts and the initial description is sent to the AI as the first message
- [ ] **CHAT-06**: AI responses appear in a scrollable chat thread with clear visual distinction between user and assistant messages
- [ ] **CHAT-07**: User can send follow-up messages throughout the conversation
- [x] **CHAT-08**: Conversation is ephemeral — not persisted to the database; starting a new session starts fresh
- [x] **CHAT-09**: AI assistant messages display a circular avatar matching the HomeMatch extension FAB icon (same logo, same brand colors)

### AI Backend (AI)

- [ ] **AI-01**: New FastAPI endpoint on EC2 handles multi-turn conversation state and calls Claude via the `ANTHROPIC_API_KEY` environment variable
- [ ] **AI-02**: Claude extracts structured preferences from natural language: location, budget, property type, rooms, size, lifestyle preferences, nearby amenities, and importance levels
- [ ] **AI-03**: Claude asks targeted follow-up questions when key preference fields are missing or unclear
- [ ] **AI-04**: Claude infers importance levels from language cues (e.g. "absolutely must" → dealbreaker, "would be nice" → low importance)
- [ ] **AI-05**: Claude signals when it has sufficient information to generate a preference summary

### Summary & Editing (SUMM)

- [ ] **SUMM-01**: When AI is ready, a structured preference summary card is displayed in the chat — not raw JSON
- [ ] **SUMM-02**: Summary mirrors the existing HomeMatch preference schema (same fields as the manual profile form: location, budget, type, rooms, size, preferences, amenities, importance levels)
- [ ] **SUMM-03**: User can edit any field in the summary inline before confirming
- [ ] **SUMM-04**: User confirms the summary (or edits and then confirms) to trigger profile creation

### Profile Creation (PROF)

- [ ] **PROF-09**: Confirmed summary creates a standard HomeMatch profile via the existing profile creation API
- [ ] **PROF-10**: Created profile is structurally identical to manually-created profiles and works with the existing scoring pipeline without modification
- [ ] **PROF-11**: After profile creation, user is navigated to the new profile's detail page

## Future Requirements

Deferred to future releases.

### Organization / B2B

- **ORG-01**: Team/organization model with role-based access control
- **ORG-02**: Profile templates for common property search patterns (broker onboarding)
- **ORG-03**: Shared profiles within an organization

### Intelligence

- **INTEL-01**: Market comparison: how a listing compares to similar active listings
- **INTEL-02**: New listing notifications when matches appear

### AI Enhancements

- **AIENH-01**: Persist conversation history so users can resume in-progress sessions
- **AIENH-02**: Re-enter conversation to refine an existing AI-created profile
- **AIENH-03**: Streaming responses for real-time AI typing effect

## Out of Scope

| Feature | Reason |
|---------|--------|
| Other property sites | v3.x is Flatfox only |
| Mobile app | Web-first approach |
| Automatic scoring | User must trigger via FAB — Claude API cost control |
| Conversation persistence | Ephemeral sessions chosen for v3.0 simplicity |
| Streaming AI responses | Deferred to future; polling or full-response is sufficient for v3.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-08 | Phase 12 | Pending |
| HIST-01 | Phase 12 | Pending |
| HIST-02 | Phase 12 | Pending |
| SEC-01 | Phase 13 | Pending |
| SEC-02 | Phase 13 | Pending |
| NAV-01 | Phase 14 | Complete |
| NAV-02 | Phase 14 | Complete |
| CHAT-01 | Phase 14 | Complete |
| CHAT-02 | Phase 14 | Complete |
| CHAT-03 | Phase 14 | Complete |
| CHAT-04 | Phase 14 | Complete |
| CHAT-05 | Phase 14 | Complete |
| CHAT-06 | Phase 14 | Pending |
| CHAT-07 | Phase 14 | Pending |
| CHAT-08 | Phase 14 | Complete |
| CHAT-09 | Phase 14 | Complete |
| AI-01 | Phase 15 | Pending |
| AI-02 | Phase 15 | Pending |
| AI-03 | Phase 15 | Pending |
| AI-04 | Phase 15 | Pending |
| AI-05 | Phase 15 | Pending |
| SUMM-01 | Phase 16 | Pending |
| SUMM-02 | Phase 16 | Pending |
| SUMM-03 | Phase 16 | Pending |
| SUMM-04 | Phase 16 | Pending |
| PROF-09 | Phase 16 | Pending |
| PROF-10 | Phase 16 | Pending |
| PROF-11 | Phase 16 | Pending |

**Coverage:**
- v3.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
