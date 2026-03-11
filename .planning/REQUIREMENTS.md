# Requirements: HomeMatch

**Defined:** 2026-03-10
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website.

## v1 Requirements

Requirements for hackathon MVP. Each maps to roadmap phases.

### Auth & Infrastructure

- [ ] **AUTH-01**: User can sign up and log in on the Next.js website via Supabase (email/password)
- [ ] **AUTH-02**: User can log in via the Chrome extension popup using the same Supabase credentials
- [ ] **AUTH-03**: Supabase edge functions proxy scoring requests to EC2 backend with auth validation
- [ ] **INFRA-01**: Next.js app deployed on Vercel
- [ ] **INFRA-02**: FastAPI backend deployed on EC2 via Docker
- [ ] **INFRA-03**: Supabase project configured with auth, database tables, and edge functions

### Preferences

- [x] **PREF-01**: User can set location/city preference
- [x] **PREF-02**: User can select buy or rent
- [x] **PREF-03**: User can select property type (apartment, house, etc.)
- [x] **PREF-04**: User can set budget range (min/max CHF)
- [x] **PREF-05**: User can set rooms range (min/max)
- [x] **PREF-06**: User can set living space range (min/max sqm)
- [x] **PREF-07**: User can add soft criteria text fields (e.g., "near Bahnhof", "quiet neighborhood")
- [x] **PREF-08**: Reusable soft criteria suggestions for common features (balcony, parking, elevator, etc.)
- [x] **PREF-09**: User can configure importance weights per category via sliders
- [x] **PREF-10**: Preferences saved to Supabase PostgreSQL and persist across sessions

### Data & Scoring

- [x] **DATA-01**: Backend fetches listing details from Flatfox public API (`/api/v1/flat/`)
- [x] **DATA-02**: Backend parses Flatfox listing data into structured format (price, rooms, address, description, features, etc.)
- [x] **EVAL-01**: Each listing is evaluated by Claude against the user's preference profile and weights
- [x] **EVAL-02**: Evaluation returns a score (0-100) with weighted category breakdown
- [x] **EVAL-03**: Each category includes bullet-point reasoning with references to listing details
- [x] **EVAL-04**: Evaluation explicitly states "I don't know" for data points not available in the listing
- [x] **EVAL-05**: Analysis is returned in the listing's language (DE/FR/IT)

### Extension UI

- [x] **EXT-01**: Chrome extension activates on Flatfox.ch search results pages
- [ ] **EXT-02**: Floating action button appears on Flatfox search results for on-demand scoring
- [x] **EXT-03**: Extension extracts listing IDs from Flatfox search results DOM
- [x] **EXT-04**: Score badges (0-100 + match label) injected next to each listing after scoring
- [x] **EXT-05**: Clicking a badge expands a 3-5 bullet summary panel with key match/mismatch points
- [ ] **EXT-06**: Summary panel includes "See full analysis" button linking to the website
- [x] **EXT-07**: Extension popup shows login form, profile summary, and link to preferences website
- [x] **EXT-08**: Loading state shown while scores are being computed

### Website Analysis Page

- [x] **WEB-01**: Full analysis page on Next.js site for each scored listing
- [x] **WEB-02**: Analysis page shows category breakdown with weights, bullet-point reasoning, and listing citations
- [ ] **WEB-03**: Analysis results stored in Supabase for retrieval by website

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Caching & Performance

- **PERF-01**: Scores cached by listing ID + profile hash with configurable TTL
- **PERF-02**: Cache invalidates automatically when user profile changes

### Multi-Profile

- **MULT-01**: User can create and switch between multiple preference profiles
- **MULT-02**: Each profile has its own name and independent preferences/weights

### Cross-Portal

- **PORT-01**: Extension supports Homegate.ch with site-specific adapter
- **PORT-02**: Extension supports ImmoScout24.ch with site-specific adapter

### Advanced Features

- **ADV-01**: Automatic scoring on page load (toggle in settings)
- **ADV-02**: Score history and trends over time
- **ADV-03**: Comparison view for multiple listings side-by-side

## Out of Scope

| Feature | Reason |
|---------|--------|
| Image/photo analysis | Token cost and latency prohibitive for v1; text-only evaluation |
| Historical price tracking | Requires database infrastructure; not core to match scoring |
| Push notifications for new listings | Needs separate service, not core to MVP |
| Automatic scoring | Claude API calls are expensive; user triggers via FAB |
| Advanced database/logging | Future milestone; for now Supabase + EC2 volume logs |
| Mobile app | Chrome extension + web app only for v1 |
| Social login (Google, GitHub) | Email/password sufficient for hackathon |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| PREF-01 | Phase 2 | Complete |
| PREF-02 | Phase 2 | Complete |
| PREF-03 | Phase 2 | Complete |
| PREF-04 | Phase 2 | Complete |
| PREF-05 | Phase 2 | Complete |
| PREF-06 | Phase 2 | Complete |
| PREF-07 | Phase 2 | Complete |
| PREF-08 | Phase 2 | Complete |
| PREF-09 | Phase 2 | Complete |
| PREF-10 | Phase 2 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| EVAL-01 | Phase 3 | Complete |
| EVAL-02 | Phase 3 | Complete |
| EVAL-03 | Phase 3 | Complete |
| EVAL-04 | Phase 3 | Complete |
| EVAL-05 | Phase 3 | Complete |
| EXT-01 | Phase 4 | Complete |
| EXT-02 | Phase 4 | Pending |
| EXT-03 | Phase 4 | Complete |
| EXT-04 | Phase 4 | Complete |
| EXT-05 | Phase 4 | Complete |
| EXT-06 | Phase 4 | Pending |
| EXT-07 | Phase 4 | Complete |
| EXT-08 | Phase 4 | Complete |
| WEB-01 | Phase 4 | Complete |
| WEB-02 | Phase 4 | Complete |
| WEB-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 -- complete rewrite for Flatfox pivot*
