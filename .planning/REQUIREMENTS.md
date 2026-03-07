# Requirements: HomeMatch

**Defined:** 2026-03-07
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website.

## v1 Requirements

Requirements for hackathon MVP. Each maps to roadmap phases.

### Onboarding & Profile

- [x] **ONBD-01**: User sees a full-page onboarding wizard on first install
- [ ] **ONBD-02**: User can set location + radius preference (e.g., Stadelhofen + 50km)
- [ ] **ONBD-03**: User can select buy or rent
- [ ] **ONBD-04**: User can select property type (apartment, house, etc.)
- [ ] **ONBD-05**: User can set budget range (min/max CHF)
- [ ] **ONBD-06**: User can set rooms range (min/max)
- [ ] **ONBD-07**: User can set living area range (min/max sqm)
- [ ] **ONBD-08**: User can set year built range (Baujahr)
- [ ] **ONBD-09**: User can select floor preference (Erdgeschoss vs not)
- [ ] **ONBD-10**: User can set availability preference
- [ ] **ONBD-11**: User can toggle features/furnishings (balcony, elevator, parking, Minergie, etc.)
- [ ] **ONBD-12**: User can add custom soft-criteria text fields (e.g., "near Bahnhof", "low tax canton", "good schools")
- [ ] **ONBD-13**: User can configure importance weights per category via sliders
- [x] **ONBD-14**: User profile is stored as JSON in chrome.storage.local and persists across sessions

### Data Extraction

- [ ] **EXTR-01**: Extension background worker fetches listing detail pages without opening visible tabs
- [ ] **EXTR-02**: Extension extracts listing data from Homegate's `__INITIAL_STATE__` JSON
- [ ] **EXTR-03**: Fetches are throttled to 2-3 concurrent requests to avoid rate limiting

### LLM Scoring

- [ ] **EVAL-01**: Each listing is evaluated by Claude against the user's preference profile and weights
- [ ] **EVAL-02**: Evaluation returns a percentage match score with weighted category breakdown
- [ ] **EVAL-03**: Each category includes bullet-point reasoning with references to listing description text
- [ ] **EVAL-04**: Evaluation explicitly states "I don't know" for data points not available in the listing
- [ ] **EVAL-05**: Analysis is returned in the listing's language (DE/FR/IT)

### Extension UI

- [ ] **UI-01**: Score badge (percentage + match label) is injected next to each listing on Homegate search results
- [ ] **UI-02**: Loading skeleton badges appear immediately while scores are being computed
- [ ] **UI-03**: Scores appear progressively as each LLM call resolves
- [ ] **UI-04**: User can click a score badge to expand an inline analysis panel with category breakdowns
- [ ] **UI-05**: Extension popup shows profile summary, on/off toggle, and edit preferences link
- [ ] **UI-06**: Weights are adjustable from extension settings after onboarding

### Backend

- [ ] **BACK-01**: Thin EC2 backend receives listing data + user profile and proxies to Claude API
- [ ] **BACK-02**: Backend keeps API keys secure (not exposed in extension)
- [ ] **BACK-03**: Backend returns structured scoring response (percentage, categories, reasoning)

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Filter Integration

- **FILT-01**: Extension pre-fills Homegate filter fields from user profile preferences
- **FILT-02**: Filter pre-fill works after Homegate SPA navigation (not just page load)

### Caching & Performance

- **PERF-01**: Scores are cached by listing ID + profile hash with configurable TTL
- **PERF-02**: Cache invalidates automatically when user profile changes

### Multi-Profile

- **MULT-01**: User can create and switch between multiple preference profiles
- **MULT-02**: Each profile has its own name and independent preferences/weights

### Cross-Portal

- **PORT-01**: Extension supports ImmoScout24.ch with site-specific adapter
- **PORT-02**: Extension supports Comparis.ch with site-specific adapter

## Out of Scope

| Feature | Reason |
|---------|--------|
| Image/photo analysis | Token cost and latency prohibitive for v1; text-only evaluation |
| User accounts / authentication | Profile lives in extension storage; no server-side user management |
| Historical price tracking | Requires database infrastructure; not core to match scoring |
| Push notifications for new listings | MV3 service workers can't run without open tab; needs separate service |
| Save/bookmark listings | Homegate has its own saved listings; no need to duplicate |
| Auto-scroll/auto-load all pages | Appears as bot traffic; risks IP blocking |
| Streaming typewriter effect | <3s responses don't benefit from streaming; adds complexity |
| Mobile app | Chrome extension only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 1 | Complete |
| ONBD-02 | Phase 1 | Pending |
| ONBD-03 | Phase 1 | Pending |
| ONBD-04 | Phase 1 | Pending |
| ONBD-05 | Phase 1 | Pending |
| ONBD-06 | Phase 1 | Pending |
| ONBD-07 | Phase 1 | Pending |
| ONBD-08 | Phase 1 | Pending |
| ONBD-09 | Phase 1 | Pending |
| ONBD-10 | Phase 1 | Pending |
| ONBD-11 | Phase 1 | Pending |
| ONBD-12 | Phase 1 | Pending |
| ONBD-13 | Phase 1 | Pending |
| ONBD-14 | Phase 1 | Complete |
| EXTR-01 | Phase 2 | Pending |
| EXTR-02 | Phase 2 | Pending |
| EXTR-03 | Phase 2 | Pending |
| EVAL-01 | Phase 3 | Pending |
| EVAL-02 | Phase 3 | Pending |
| EVAL-03 | Phase 3 | Pending |
| EVAL-04 | Phase 3 | Pending |
| EVAL-05 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| BACK-01 | Phase 2 | Pending |
| BACK-02 | Phase 2 | Pending |
| BACK-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 -- traceability updated with phase mappings*
