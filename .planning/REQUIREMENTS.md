# Requirements: HomeMatch v4.1 — Landing Page v2 & Hackathon Credits

**Defined:** 2026-03-28
**Core Value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## v4.1 Requirements

### Hero Section

- [ ] **HERO-01**: Stats row removed — "2,400+ listings scored daily", "< 3s per listing", "Free" block no longer shown
- [ ] **HERO-02**: CTA button is centered on its own row (not paired inline with secondary text on desktop)
- [ ] **HERO-03**: Poor tier color updated from gray (#6b7280) to red in TIER_COLORS (both landing page and extension `src/types/scoring.ts`)

### Problem Section

- [x] **PROB-01**: Decorative background numbers (huge aria-hidden 01/02/03 at 3% opacity) removed from cards
- [x] **PROB-02**: Each problem card slides in from the left as it enters the viewport (individual scroll trigger per card)
- [x] **PROB-03**: Problem cards redesigned to be more visually engaging — elevated card style, stronger visual hierarchy, attention-hooking rather than plain bordered list

### Solution Section

- [ ] **SOLN-01**: Browser demo mock enlarged — max-w-2xl → max-w-3xl (or larger if it fits without crowding step cards)
- [ ] **SOLN-02**: Step cards (01/02/03 beneath demo) enlarged — more padding, bigger label text, more presence
- [ ] **SOLN-03**: AnimatedScore in SceneListings uses full tier color system: green (≥80), yellow (60-79), red (<60) — not binary teal/gray
- [ ] **SOLN-04**: SceneAnalysis overall score badge uses tier color (green at 94) not static teal — matching extension visual language

### CTA Section

- [ ] **CTA-01**: Headline font size increased — minimum clamp(2.5rem, 6vw, 4.5rem), bold, commanding
- [ ] **CTA-02**: Headline animates in from further below (y: 60+) with spring physics — dramatic unveil on scroll
- [ ] **CTA-03**: CTA section has stronger visual presence — larger glow radius, button with glow shadow matching hero CTA

### Hackathon Credits

- [ ] **CRED-01**: New section added above footer — "Built at" + ETH Zurich logo + Gen-AI Hackathon logo
- [ ] **CRED-02**: Credits section is minimal, elegant — does not distract from primary CTA above it

## v4.2 Requirements (Deferred)

### Dashboard Alignment

- **DASH-01**: Dashboard pages updated to match landing page design language (sidebar spacing, card radii, teal accent)
- **DASH-02**: Meaningful animations applied to dashboard (not decorative)

### Design System

- **DS-02**: Dark hero / light dashboard color split via CSS variables
- **DS-03**: Typography scale defined (display, headline, body, caption)

### Mobile & QA

- **LP-07**: Full mobile/tablet responsiveness across all pages
- **PERF-01**: LCP < 2.5s, no layout shift from animations

### Photography

- **PHOTO-01**: Swiss/Zurich urban photography integrated into relevant landing page sections (discuss separately)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social proof / testimonials | No real users yet; deferred post-launch |
| Video background in hero | Performance cost; chip animations serve same purpose |
| Dark/light mode toggle on landing | Landing is intentionally dark-only |
| Automatic scoring | Claude API cost control |
| Mobile app | Web-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HERO-01 | Phase 22 | Pending |
| HERO-02 | Phase 22 | Pending |
| HERO-03 | Phase 22 | Pending |
| PROB-01 | Phase 22 | Complete |
| PROB-02 | Phase 22 | Complete |
| PROB-03 | Phase 22 | Complete |
| SOLN-01 | Phase 22 | Pending |
| SOLN-02 | Phase 22 | Pending |
| SOLN-03 | Phase 22 | Pending |
| SOLN-04 | Phase 22 | Pending |
| CTA-01 | Phase 22 | Pending |
| CTA-02 | Phase 22 | Pending |
| CTA-03 | Phase 22 | Pending |
| CRED-01 | Phase 23 | Pending |
| CRED-02 | Phase 23 | Pending |

**Coverage:**
- v4.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — v4.1 milestone kickoff*
