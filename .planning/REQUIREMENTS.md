# Requirements: HomeMatch v2.0

**Defined:** 2026-03-15
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust -- without ever leaving the website.

## v2.0 Requirements

Requirements for Smart Preferences & UX Polish milestone. Each maps to roadmap phases.

### Preference Schema

- [x] **SCHM-01**: User preferences support dynamic AI-generated fields with importance levels (critical/high/medium/low) replacing softCriteria
- [x] **SCHM-02**: Zod schema (web) includes DynamicField type with name, value, and importance
- [x] **SCHM-03**: Pydantic model (backend) includes dynamic_fields with proper validation (not silently dropped)
- [x] **SCHM-04**: Claude scoring prompt renders dynamic fields as weighted custom criteria section
- [x] **SCHM-05**: Existing softCriteria data migrates to dynamicFields format via backward-compat migration

### Chat Preferences

- [ ] **CHAT-01**: User can open a chat interface from their profile to discover preferences
- [ ] **CHAT-02**: AI chat engages in multi-turn conversation to understand what user is looking for
- [ ] **CHAT-03**: Chat extracts structured preference fields with priorities from the conversation
- [ ] **CHAT-04**: User can view, edit, add, and delete AI-generated preference fields before saving
- [ ] **CHAT-05**: Chat-generated fields saved via JSONB merge preserving standard fields (location, budget, rooms)
- [ ] **CHAT-06**: Chat conversation persists in sessionStorage across page navigation within session

### Parallel Scoring

- [ ] **SCOR-01**: User can score all visible Flatfox listings with a single FAB click
- [ ] **SCOR-02**: Extension uses concurrency-pooled parallel requests (not unbounded) for batch scoring
- [ ] **SCOR-03**: Backend limits concurrent Claude API and Flatfox fetch calls with asyncio semaphores
- [ ] **SCOR-04**: FAB shows progress counter ("3 of 12 scored") during batch scoring

### UI & Distribution

- [ ] **UIDX-01**: Web app uses Flatfox-inspired teal/green color palette across all pages
- [ ] **UIDX-02**: Web app UI polished for professional SaaS appearance
- [ ] **UIDX-03**: Website has extension install page with download link and setup instructions
- [ ] **UIDX-04**: Chrome extension submitted to Chrome Web Store as Unlisted listing

## Future Requirements

Deferred to v2.1+. Tracked but not in current roadmap.

### Chat Enhancements

- **CHAT-07**: Chat conversation history persisted in Supabase across sessions
- **CHAT-08**: Chat auto-suggests standard fields (budget, rooms, location) during conversation

### UI Enhancements

- **UIDX-05**: Full Flatfox UI redesign beyond color palette (layout, typography, spacing overhaul)
- **UIDX-06**: Chrome Web Store public listing

### Scoring Enhancements

- **SCOR-05**: Score caching by listing ID + profile hash to avoid re-scoring

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Chat in Chrome extension popup | Extension is for scoring, not setup; popup too small for chat UI |
| Auto-scoring without FAB click | API cost risk; FAB is the intentional user trigger |
| Backend batch endpoint | Client-side concurrency with existing single-listing endpoint preserves progressive badge rendering and is simpler |
| Persistent chat history in Supabase | Chat is ephemeral for v2.0; only extracted dynamicFields are persisted |
| Other property sites beyond Flatfox | v2.x is Flatfox only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHM-01 | Phase 11 | Complete |
| SCHM-02 | Phase 11 | Complete |
| SCHM-03 | Phase 11 | Complete |
| SCHM-04 | Phase 11 | Complete |
| SCHM-05 | Phase 11 | Complete |
| CHAT-01 | Phase 12 | Pending |
| CHAT-02 | Phase 12 | Pending |
| CHAT-03 | Phase 12 | Pending |
| CHAT-04 | Phase 12 | Pending |
| CHAT-05 | Phase 12 | Pending |
| CHAT-06 | Phase 12 | Pending |
| SCOR-01 | Phase 13 | Pending |
| SCOR-02 | Phase 13 | Pending |
| SCOR-03 | Phase 13 | Pending |
| SCOR-04 | Phase 13 | Pending |
| UIDX-01 | Phase 14 | Pending |
| UIDX-02 | Phase 14 | Pending |
| UIDX-03 | Phase 14 | Pending |
| UIDX-04 | Phase 14 | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
