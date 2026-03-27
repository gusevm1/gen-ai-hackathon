# Requirements: HomeMatch

**Defined:** 2026-03-17 | **Updated:** 2026-03-27

## v5.0 Requirements — Proximity-Aware Scoring

### Coordinate Resolution

- [x] **COORD-01**: Before scoring, system checks if listing has latitude and longitude
- [x] **COORD-02**: If coordinates missing, system attempts geocoding (Nominatim or existing Apify geocoder)
- [x] **COORD-03**: If geocoding fails, system marks coordinates unavailable and skips proximity evaluation without crashing

### Proximity Extraction

- [ ] **PROX-01**: System parses dynamic_fields from user preferences to identify place-based requirements
- [ ] **PROX-02**: Each extracted requirement includes query (string), radius_km (float, nullable), and importance level
- [ ] **PROX-03**: If no proximity requirements exist in dynamic_fields, Apify is never called and scoring proceeds normally

### Apify Integration

- [ ] **APIFY-01**: For each proximity requirement, system calls Apify Google Places actor with lat, lon, query, maxResults=5
- [ ] **APIFY-02**: Response includes name, distance from listing, rating, review count, and address per result
- [ ] **APIFY-03**: On Apify API failure, system falls back gracefully (treats as empty result, does not crash)

### Supabase Caching

- [x] **CACHE-04**: nearby_places_cache table created in Supabase (id, lat, lon, query, radius_km, response_json, created_at)
- [ ] **CACHE-05**: Before calling Apify, system checks cache by (lat, lon, query, radius_km)
- [ ] **CACHE-06**: On cache miss, Apify result is stored in nearby_places_cache before returning

### Prompt Integration

- [ ] **PROMPT-01**: Verified nearby data injected into build_user_prompt as structured "## Nearby Places Data (Verified)" section
- [ ] **PROMPT-02**: Section only added when nearby data exists — omitted entirely when no proximity requirements
- [ ] **PROMPT-03**: All search_nearby_places tool references removed from Claude prompts and tool definitions

### Scoring Rules

- [ ] **SCORE-01**: Claude scoring prompt updated: only evaluate amenity proximity on provided data
- [ ] **SCORE-02**: Claude scoring prompt updated: if amenity not in data → treat as "not found", never guess

## v4.0 Requirements — Landing Page & Design System

### Landing Page (LP)

- [ ] **LP-01**: Public landing page at `/` replaces current redirect — accessible without auth
- [ ] **LP-02**: Hero section with animated product demo (mock Flatfox → FAB → scoring → analysis)
- [ ] **LP-03**: Problem/Solution sections with Hormozi-structured copy (EN/DE bilingual)
- [ ] **LP-04**: Features section showcasing scoring, profiles, and analysis
- [ ] **LP-05**: Clear primary CTA ("Get Started" / "Sign Up") funneling to auth
- [ ] **LP-06**: Secondary CTA for existing users ("Sign In" / "Go to Dashboard")
- [ ] **LP-07**: Page is fully responsive (mobile, tablet, desktop)
- [ ] **LP-08**: Page achieves LCP < 2.5s and no layout shift from animations

### Design System (DS)

- [ ] **DS-01**: Framer Motion installed and animation primitives defined (easing, duration tokens)
- [ ] **DS-02**: Dark hero / light dashboard color split established via CSS variables
- [ ] **DS-03**: Typography scale defined (display, headline, body, caption)
- [ ] **DS-04**: Single teal accent — no competing secondary colors

### UI Alignment (UI)

- [ ] **UI-01**: Dashboard pages updated to align with landing page design language
- [ ] **UI-02**: Animations applied to dashboard where meaningful (not decorative)
- [ ] **UI-03**: Bilingual (EN/DE) copy propagated to all user-facing surfaces
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## v3.0 Requirements — Extension Download & Install

### Download Page (DL)

- [x] **DL-01**: User sees "Download" item in the top navigation bar
- [x] **DL-02**: User can download the Chrome extension as a zip file with one click
- [x] **DL-03**: User sees step-by-step installation instructions (unzip, open chrome://extensions, enable Developer Mode, Load unpacked)
- [x] **DL-04**: Instructions link opens chrome://extensions in a new tab

### Hosting (HOST)

- [x] **HOST-01**: Extension zip is served as a static file from the Next.js public/ directory

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
- [x] **CHAT-02**: Input placeholder guides the user to describe location, budget, size, rooms, lifestyle preferences, and nearby amenities (train, schools, supermarkets, cafes, etc.)
- [x] **CHAT-03**: On the first (pre-conversation) message, a large "Start Creating Profile" button is shown instead of the standard send arrow
- [x] **CHAT-04**: Pressing "Start Creating Profile" prompts the user to enter a profile name before the conversation begins
- [x] **CHAT-05**: After the user enters a name and continues, the conversation starts and the initial description is sent to the AI as the first message
- [x] **CHAT-06**: AI responses appear in a scrollable chat thread with clear visual distinction between user and assistant messages
- [x] **CHAT-07**: User can send follow-up messages throughout the conversation
- [x] **CHAT-08**: Conversation is ephemeral — not persisted to the database; starting a new session starts fresh
- [x] **CHAT-09**: AI assistant messages display a circular avatar matching the HomeMatch extension FAB icon (same logo, same brand colors)

### AI Backend (AI)

- [x] **AI-01**: New FastAPI endpoint on EC2 handles multi-turn conversation state and calls Claude via the `ANTHROPIC_API_KEY` environment variable
- [x] **AI-02**: Claude extracts structured preferences from natural language: location, budget, property type, rooms, size, lifestyle preferences, nearby amenities, and importance levels
- [x] **AI-03**: Claude asks targeted follow-up questions when key preference fields are missing or unclear
- [x] **AI-04**: Claude infers importance levels from language cues (e.g. "absolutely must" → dealbreaker, "would be nice" → low importance)
- [x] **AI-05**: Claude signals when it has sufficient information to generate a preference summary

### Summary & Editing (SUMM)

- [x] **SUMM-01**: When AI is ready, a structured preference summary card is displayed in the chat — not raw JSON
- [x] **SUMM-02**: Summary mirrors the existing HomeMatch preference schema (same fields as the manual profile form: location, budget, type, rooms, size, preferences, amenities, importance levels)
- [x] **SUMM-03**: User can edit any field in the summary inline before confirming
- [x] **SUMM-04**: User confirms the summary (or edits and then confirms) to trigger profile creation

### Profile Creation (PROF)

- [x] **PROF-09**: Confirmed summary creates a standard HomeMatch profile via the existing profile creation API
- [x] **PROF-10**: Created profile is structurally identical to manually-created profiles and works with the existing scoring pipeline without modification
- [x] **PROF-11**: After profile creation, user is navigated to the new profile's detail page

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
| CHAT-06 | Phase 14 | Complete |
| CHAT-07 | Phase 14 | Complete |
| CHAT-08 | Phase 14 | Complete |
| CHAT-09 | Phase 14 | Complete |
| AI-01 | Phase 15 | Complete |
| AI-02 | Phase 15 | Complete |
| AI-03 | Phase 15 | Complete |
| AI-04 | Phase 15 | Complete |
| AI-05 | Phase 15 | Complete |
| SUMM-01 | Phase 16 | Complete |
| SUMM-02 | Phase 16 | Complete |
| SUMM-03 | Phase 16 | Complete |
| SUMM-04 | Phase 16 | Complete |
| PROF-09 | Phase 16 | Complete |
| PROF-10 | Phase 16 | Complete |
| PROF-11 | Phase 16 | Complete |

| DL-01 | Phase 17 | Complete |
| DL-02 | Phase 17 | Complete |
| DL-03 | Phase 17 | Complete |
| DL-04 | Phase 17 | Complete |
| HOST-01 | Phase 17 | Complete |

| CACHE-04 | Phase 22 | Complete |
| COORD-01 | Phase 22 | Complete |
| COORD-02 | Phase 22 | Complete |
| COORD-03 | Phase 22 | Complete |
| PROX-01 | Phase 23 | Pending |
| PROX-02 | Phase 23 | Pending |
| PROX-03 | Phase 23 | Pending |
| APIFY-01 | Phase 23 | Pending |
| APIFY-02 | Phase 23 | Pending |
| APIFY-03 | Phase 23 | Pending |
| CACHE-05 | Phase 23 | Pending |
| CACHE-06 | Phase 23 | Pending |
| PROMPT-01 | Phase 24 | Pending |
| PROMPT-02 | Phase 24 | Pending |
| PROMPT-03 | Phase 24 | Pending |
| SCORE-01 | Phase 24 | Pending |
| SCORE-02 | Phase 24 | Pending |

**Coverage:**
- v5.0 (Proximity) requirements: 17 total
- Mapped to phases: 17/17
- Phase 22: 4 requirements (CACHE-04, COORD-01, COORD-02, COORD-03)
- Phase 23: 8 requirements (PROX-01, PROX-02, PROX-03, APIFY-01, APIFY-02, APIFY-03, CACHE-05, CACHE-06)
- Phase 24: 5 requirements (PROMPT-01, PROMPT-02, PROMPT-03, SCORE-01, SCORE-02)

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-27 after v5.0 roadmap created (Phases 22-24)*
