# Requirements: HomeMatch v6.0 UX & Design System Overhaul

**Defined:** 2026-03-31
**Core Value:** Help users instantly see how well each property listing matches their specific needs — without ever leaving the website they're already on.

---

## v6.0 Requirements

### Navigation & Information Architecture

- [ ] **NAV-01**: User sees "New Profile" (not "AI-Powered Search") in the top navbar
- [ ] **NAV-02**: User does not see "Download" as a primary nav item after initial setup
- [ ] **NAV-03**: User who has not confirmed extension install sees a contextual install banner on the dashboard
- [ ] **NAV-04**: User can access the Download Extension page from Settings

### Dashboard — State-Aware Home

- [ ] **DASH-01**: New user (0 profiles) sees an onboarding-oriented home: 3-step product explainer + two profile creation paths
- [ ] **DASH-02**: New user sees AI profile creation as the visually recommended primary path (badge + primary styling)
- [ ] **DASH-03**: New user sees manual profile creation as a secondary option (outline style, lower visual weight)
- [ ] **DASH-04**: Returning user (1+ profiles) sees their active profile name, last-used date, and an "Open Flatfox" CTA on the home page
- [ ] **DASH-05**: Returning user sees their 3 most recent analyses (score + tier + address) on the home page
- [ ] **DASH-06**: Returning user can switch active profile or create a new one from the home page

### Design System — Tokens & Motion

- [ ] **DS-01**: No hardcoded `rose-500` color remains in the codebase — all replaced with `primary` CSS token
- [ ] **DS-02**: Dashboard home, profiles list, and analyses list pages have Framer Motion entrance animations (FadeIn on mount, stagger on list items)
- [ ] **DS-03**: Tier colors are unified across web: excellent=teal, good=green, fair=amber, poor=red
- [ ] **DS-04**: All card hover states use a consistent lift effect matching the landing page style

### Onboarding — WelcomeModal Rebuild

- [ ] **ONB-01**: WelcomeModal uses Shadcn Dialog/Card components — zero hardcoded inline styles
- [ ] **ONB-02**: WelcomeModal respects dark/light mode via CSS variables
- [ ] **ONB-03**: WelcomeModal shows brand primary color on the CTA button
- [ ] **ONB-04**: WelcomeModal copy includes one sentence explaining what HomeMatch does before asking user to start

### Onboarding — Checklist & Completion

- [ ] **ONB-05**: Onboarding checklist groups steps 5–8 under a visible "In the extension →" section label
- [ ] **ONB-06**: When onboarding completes, checklist morphs into a success state: "You're all set ✓ — start scoring on Flatfox" with a direct Flatfox link
- [ ] **ONB-07**: User can re-access the tour from Settings after dismissing the checklist

### Critical Handoffs

- [ ] **HND-01**: After saving preferences on the profile edit page, user sees a full-width primary button: "Save & Open in Flatfox →"
- [ ] **HND-02**: Profile edit page shows a section progress indicator (e.g. "Step 2 of 5 — Budget")
- [ ] **HND-03**: Analyses page empty state shows an "Open Flatfox →" primary CTA and a secondary "Download extension" link
- [ ] **HND-04**: Analyses page filter bar is hidden when there are 0 analyses

### Page Redesigns — Profiles

- [ ] **PG-01**: Profile cards in the profiles list show the active profile badge, total analysis count, and last-used date
- [ ] **PG-02**: Active profile is visually prominent in the profiles list (highlighted border or pin indicator)

### Page Redesigns — AI Chat (Profile Creation)

- [ ] **PG-03**: AI chat page shows a context heading explaining what the conversation does
- [ ] **PG-04**: Transition from chat to summary card is animated — not an abrupt swap

### Page Redesigns — Analyses

- [ ] **PG-05**: Analysis cards show a left-edge colored tier bar (teal/green/amber/red) for instant scanability
- [ ] **PG-06**: Analysis card score number is larger and left-aligned (not a small pill top-right)

### Page Redesigns — Settings

- [ ] **PG-07**: Settings page has a "Download Extension" section with the download button and install link

---

## Future Requirements (v6.1+)

### Landing Page Polish (v4.1 carry-overs)

- **HERO-01**: Stats row removed from SectionHero
- **HERO-02**: CTA button centered on its own row
- **HERO-03**: Poor tier color updated to red across landing + extension
- **PROB-01**: Decorative background numbers removed from problem cards
- **PROB-02**: Problem cards slide in from left on scroll
- **PROB-03**: Problem cards visually redesigned — elevated, engaging
- **SOLN-01**: Browser demo enlarged (max-w-3xl+)
- **SOLN-02**: Step cards enlarged with more presence
- **SOLN-03**: Score display uses full tier color system (green/yellow/red)
- **CTA-01**: Headline font size increased to clamp(2.5rem, 6vw, 4.5rem)
- **CTA-02**: Headline dramatic bottom-up entrance animation
- **CRED-01**: ETH + Gen-AI Hackathon credits section added

### Deeper UX (future)

- **UX-01**: Mobile responsive pass for all dashboard pages
- **UX-02**: Profile edit form validation with inline error states
- **UX-03**: Skeleton loading states on analyses page
- **UX-04**: Extension popup onboarding widget (steps 5–8 visible in popup)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Extension content script changes | Phase 34 onboarding overlay complete and stable |
| Backend / scoring changes | v5.0 hybrid scorer shipped — no changes needed |
| Auth page redesign | Works correctly; not on critical path |
| Real-time notifications | High complexity, not core to current user journey |
| Mobile app | Web-first approach remains |

---

## Traceability

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |
| NAV-04 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| DASH-05 | — | Pending |
| DASH-06 | — | Pending |
| DS-01 | — | Pending |
| DS-02 | — | Pending |
| DS-03 | — | Pending |
| DS-04 | — | Pending |
| ONB-01 | — | Pending |
| ONB-02 | — | Pending |
| ONB-03 | — | Pending |
| ONB-04 | — | Pending |
| ONB-05 | — | Pending |
| ONB-06 | — | Pending |
| ONB-07 | — | Pending |
| HND-01 | — | Pending |
| HND-02 | — | Pending |
| HND-03 | — | Pending |
| HND-04 | — | Pending |
| PG-01 | — | Pending |
| PG-02 | — | Pending |
| PG-03 | — | Pending |
| PG-04 | — | Pending |
| PG-05 | — | Pending |
| PG-06 | — | Pending |
| PG-07 | — | Pending |

**Coverage:**
- v6.0 requirements: 31 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 31 ⚠️

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
