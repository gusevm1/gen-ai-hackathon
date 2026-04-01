# Requirements: HomeMatch v7.0 Quick Apply

**Defined:** 2026-04-02
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

---

## v7.0 Requirements

### Profile — Contact Details

- [ ] **PROF-01**: User can add a phone number to their profile
- [ ] **PROF-02**: Profile edit page has a "Contact Details" section with name and email (pre-filled from auth) and an editable phone field

### Quick Apply — UI

- [ ] **QA-01**: TopMatches listing card shows a "Quick Apply" button
- [ ] **QA-02**: Clicking Quick Apply expands an inline panel below the card with an editable draft message
- [ ] **QA-03**: User can edit the draft message in the inline panel before sending
- [ ] **QA-04**: User can collapse the panel without sending
- [ ] **QA-05**: User can send the message from the inline panel with a single click
- [ ] **QA-06**: Card shows "Applied ✓" state after successful send
- [ ] **QA-07**: Card shows an error state if send fails, with a retry option

### Message Generation

- [ ] **MSG-01**: Draft is AI-generated from the user's profile (name, situation, key preferences, move-in intent)
- [ ] **MSG-02**: Draft references the specific listing details (address, property type)
- [ ] **MSG-03**: User can request a regenerated draft if they don't like the first one

### Send Mechanism

- [ ] **SEND-01**: FastAPI backend exposes an endpoint that accepts Quick Apply send requests from the web app
- [ ] **SEND-02**: Backend fetches a fresh CSRF token from the Flatfox listing page before submitting
- [ ] **SEND-03**: Backend POSTs the Flatfox contact form using the user's name, email, and phone from their profile

### Apply Tracking

- [ ] **TRACK-01**: Applied listings are stored per user + profile in Supabase (listing ID, profile ID, timestamp)
- [ ] **TRACK-02**: TopMatches cards show an "Applied" indicator for listings the user has already contacted
- [ ] **TRACK-03**: User can view a dedicated Applications page listing all sent applications with listing details and date

---

## Future Requirements

### Enhanced Apply Flow

- **QA-08**: User can add a personal note to the application beyond the AI draft
- **TRACK-04**: Application status tracking (sent / viewed / replied)
- **TRACK-05**: Email notification when landlord responds

### Multi-site Support

- **SEND-04**: Support sending contact messages on Homegate listings

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic bulk apply | User must explicitly trigger each application — cost and intent control |
| In-app messaging thread | Flatfox handles the conversation thread after initial contact |
| OAuth / Flatfox account connection | HTML form POST is sufficient for v7.0; account linking adds complexity |
| Mobile app apply flow | Web-first approach |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | Phase TBD | Pending |
| PROF-02 | Phase TBD | Pending |
| QA-01 | Phase TBD | Pending |
| QA-02 | Phase TBD | Pending |
| QA-03 | Phase TBD | Pending |
| QA-04 | Phase TBD | Pending |
| QA-05 | Phase TBD | Pending |
| QA-06 | Phase TBD | Pending |
| QA-07 | Phase TBD | Pending |
| MSG-01 | Phase TBD | Pending |
| MSG-02 | Phase TBD | Pending |
| MSG-03 | Phase TBD | Pending |
| SEND-01 | Phase TBD | Pending |
| SEND-02 | Phase TBD | Pending |
| SEND-03 | Phase TBD | Pending |
| TRACK-01 | Phase TBD | Pending |
| TRACK-02 | Phase TBD | Pending |
| TRACK-03 | Phase TBD | Pending |

**Coverage:**
- v7.0 requirements: 18 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
