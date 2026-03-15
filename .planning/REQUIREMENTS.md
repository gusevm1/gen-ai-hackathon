# Requirements: HomeMatch

**Defined:** 2026-03-10
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.

## v1.0 Requirements (Shipped)

All v1.0 requirements shipped and validated. See MILESTONES.md for details.

### Auth & Infrastructure -- Complete
### Preferences -- Complete
### Data & Scoring -- Complete
### Extension UI -- Complete
### Website Analysis Page -- Complete

## v1.1 Requirements

Requirements for Demo-Ready + Multi-Profile milestone. Each maps to roadmap phases.

### Multi-Profile Management

- [x] **PROF-01**: User can create a new named search profile
- [x] **PROF-02**: User can rename an existing profile
- [x] **PROF-03**: User can delete a profile (with confirmation, cannot delete last remaining profile)
- [x] **PROF-04**: User can duplicate an existing profile
- [x] **PROF-05**: User can set a profile as active (drives extension scoring)
- [x] **PROF-06**: User can see all profiles as cards with name, key criteria summary, and active badge
- [x] **PROF-07**: DB schema supports multiple profiles per user with atomic active-profile switching via Postgres RPC

### UI Overhaul

- [x] **UI-01**: App has a navigation layout (horizontal top navbar with navigation links)
- [x] **UI-02**: Navbar shows user identity, active profile name, and profile switcher dropdown
- [x] **UI-03**: Dark/light mode toggle with system preference detection
- [x] **UI-04**: Analysis page redesigned with professional layout for demo presentations
- [x] **UI-05**: 21st.dev components integrated via research-first workflow (agent checks GitHub usage before integration)

### Preferences UX

- [x] **PREF-11**: Preferences form distinguishes dealbreakers (hard constraints) from weighted soft preferences
- [x] **PREF-12**: Importance levels use chips (Low/Medium/High/Critical) instead of sliders for non-numeric criteria
- [x] **PREF-13**: Web/extension/backend preference schemas unified into canonical superset
- [x] **PREF-14**: Claude prompt updated to use structured importance levels and all preference fields
- [x] **PREF-15**: Live profile summary preview on the preferences form

### Extension Polish

- [x] **EXT-09**: Extension popup shows active profile name
- [x] **EXT-10**: Profile switcher dropdown in extension popup
- [x] **EXT-11**: Session health check on FAB click with "Connected" indicator in popup
- [x] **EXT-12**: Stale badge indicator when active profile changes mid-session
- [ ] **EXT-13**: Improved badge and summary panel design

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Organization / B2B

- **ORG-01**: Team/organization model with role-based access control
- **ORG-02**: Profile templates for common property search patterns (broker onboarding)
- **ORG-03**: Shared profiles within an organization

### Performance

- **PERF-01**: Score caching per profile (avoid re-scoring same listing+profile)
- **PERF-02**: New listing notifications when matches appear

### Intelligence

- **INTEL-01**: Market comparison: how a listing compares to similar active listings
- **INTEL-02**: Listing quality score and description optimization suggestions

### Cross-Portal

- **PORT-01**: Extension supports Homegate.ch with site-specific adapter
- **PORT-02**: Extension supports ImmoScout24.ch with site-specific adapter

## Out of Scope

| Feature | Reason |
|---------|--------|
| Other property sites beyond Flatfox | v1.x is Flatfox only |
| Mobile app | Web-first, mobile later |
| Historical price tracking | Not core to matching value |
| Automatic scoring | Claude API cost control -- user must trigger via FAB |
| Real-time chat / messaging | Not core to scoring tool |
| Tenant screening / application scoring | Different product direction -- validate with pilot first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 (Shipped)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| PREF-01..10 | Phase 2 | Complete |
| DATA-01..02 | Phase 2 | Complete |
| EVAL-01..05 | Phase 3 | Complete |
| EXT-01..08 | Phase 4 | Complete |
| WEB-01..03 | Phase 4 | Complete |

### v1.1

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-07 | Phase 5 | Complete |
| PROF-01 | Phase 9 | Complete |
| PROF-02 | Phase 9 | Complete |
| PROF-03 | Phase 9 | Complete |
| PROF-04 | Phase 9 | Complete |
| PROF-05 | Phase 9 | Complete |
| PROF-06 | Phase 9 | Complete |
| UI-01 | Phase 8 | Complete |
| UI-02 | Phase 8 | Complete |
| UI-03 | Phase 8 | Complete |
| UI-04 | Phase 9 | Complete |
| UI-05 | Phase 8 | Complete |
| PREF-11 | Phase 9 | Complete |
| PREF-12 | Phase 9 | Complete |
| PREF-13 | Phase 7 | Complete |
| PREF-14 | Phase 7 | Complete |
| PREF-15 | Phase 9 | Complete |
| EXT-09 | Phase 10 | Complete |
| EXT-10 | Phase 10 | Complete |
| EXT-11 | Phase 10 | Complete |
| EXT-12 | Phase 10 | Complete |
| EXT-13 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 22 total
- Mapped to phases: 22/22
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-13 after v1.1 roadmap creation*
