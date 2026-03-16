# Requirements: HomeMatch v2.0

**Defined:** 2026-03-16
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## v2.0 Requirements

Requirements for the Polish & History milestone. Each maps to a roadmap phase.

### Score Caching

- [ ] **CACHE-01**: System returns cached score when listing_id + profile_id combination already exists in the analyses table (skips calling Claude)
- [ ] **CACHE-02**: Cache is invalidated when user saves updated preferences for a profile (existing analyses for that profile are marked stale or deleted)
- [ ] **CACHE-03**: User can force a re-score from the extension FAB (manual override that ignores the cache)

### Profile Management

- [ ] **PROF-08**: Duplicate profile action opens a rename modal pre-filled with "[Name] (copy)"; user can edit the name or accept the default before creating

### Analysis History

- [ ] **HIST-01**: Analysis page shows all past analyses across all profiles, with each entry labeled by its profile name
- [ ] **HIST-02**: User can click any past analysis in the list to navigate to its full analysis view

### Security

- [ ] **SEC-01**: Edge function JWT verification is enabled (remove `--no-verify-jwt` flag from deployment)
- [ ] **SEC-02**: Extension auth flow passes tokens that the edge function can verify correctly end-to-end

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Organization / B2B

- **ORG-01**: Team/organization model with role-based access control
- **ORG-02**: Profile templates for common property search patterns (broker onboarding)
- **ORG-03**: Shared profiles within an organization

### Intelligence

- **INTEL-01**: Market comparison: how a listing compares to similar active listings
- **INTEL-02**: New listing notifications when matches appear

## Out of Scope

| Feature | Reason |
|---------|--------|
| Other property sites | v2.x is Flatfox only |
| Mobile app | Web-first approach |
| Historical price tracking | Investment analysis out of scope |
| Automatic scoring | User must trigger via FAB — Claude API cost control |
| Offline mode | Not applicable to current architecture |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CACHE-01 | Phase 11 | Pending |
| CACHE-02 | Phase 11 | Pending |
| CACHE-03 | Phase 11 | Pending |
| PROF-08 | Phase 12 | Pending |
| HIST-01 | Phase 12 | Pending |
| HIST-02 | Phase 12 | Pending |
| SEC-01 | Phase 13 | Pending |
| SEC-02 | Phase 13 | Pending |

**Coverage:**
- v2.0 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
