---
phase: 23-hackathon-credits-section
plan: 01
subsystem: ui
tags: [nextjs, framer-motion, next-image, tailwind, landing-page, credits, unsplash]

# Dependency graph
requires:
  - phase: 22-landing-page-section-redesigns
    provides: LandingPageContent, SectionHero, SectionCTA, LandingFooter component structure
provides:
  - SectionCredits component with Zurich photo background and ETH + hackathon badge overlay
  - Hero section Zurich cityscape scroll-fade photo layer
  - Auth page full-screen Zurich photo background with floating login card and credits strip
  - ETH Zürich white SVG and Zurich aerial dusk JPEG public assets
  - landing_credits_label translation key in en and de
affects: [landing-page-ui, auth-page, phase-24-onwards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/image fill in motion.div wrapper for animated opacity — do NOT animate Image directly"
    - "useScroll + useTransform for scroll-driven photo fade (hero pattern)"
    - "useInView fade-in on SectionCredits (once: false, amount: 0.3)"
    - "HackathonBadge inline component (not exported) — black pill #000 with green #50e75f"

key-files:
  created:
    - web/public/eth-zurich-white.svg
    - web/public/zurich-bg.jpg
    - web/src/components/landing/SectionCredits.tsx
  modified:
    - web/src/lib/translations.ts
    - web/src/components/landing/SectionHero.tsx
    - web/src/components/landing/LandingPageContent.tsx
    - web/src/app/auth/page.tsx

key-decisions:
  - "ETH SVG has dark blue background rect (#1f407a) — used as-is since it is the official white wordmark variant"
  - "no-img-element ESLint disable comment added for inline <img> usage in SectionCredits and auth page (no fill constraint needed)"
  - "npm run build fails due to pre-existing missing Supabase env vars — not introduced by this plan; tsc --noEmit passes cleanly"
  - "Hero photo uses priority=true (above fold); SectionCredits and auth page images omit priority (lazy load)"

patterns-established:
  - "Zurich photo opacity overlay: linear-gradient hsl(0 0% 0% / 0.65-0.75) for legible text on top"
  - "Credits layout: label text + flex row with logo | divider | badge"

requirements-completed: [CRED-01, CRED-02]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 23 Plan 01: Hackathon Credits Section Summary

**Zurich aerial dusk photo integrated across three surfaces (hero scroll-fade, credits section, auth background) with ETH Zürich logo and GenAI Zürich Hackathon 2026 badge**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T05:52:04Z
- **Completed:** 2026-03-29T05:54:47Z
- **Tasks:** 2 of 3 auto tasks complete (Task 3 is human-verify checkpoint)
- **Files modified:** 7

## Accomplishments
- Downloaded ETH Zürich white SVG (3.5KB) and Zurich aerial dusk JPEG (975KB) to `public/`
- Created `SectionCredits` component: Zurich photo full-bleed background with dark overlay, "A project from" label, ETH logo, vertical divider, and HackathonBadge — rendered between SectionCTA and LandingFooter
- Added Zurich photo scroll-fade layer to SectionHero: `useScroll` + `useTransform` drives opacity from 0.25 at top to 0 at scroll 600px
- Auth page upgraded with full-screen Zurich photo background, existing login card floated on top, credits strip (ETH + badge) anchored at bottom-8
- Added `landing_credits_label` key to both `en` and `de` translation objects (TypeScript key-parity enforcement satisfied)

## Task Commits

Each task was committed atomically:

1. **Task 1: Acquire assets, translation keys, SectionCredits** - `fe96252` (feat)
2. **Task 2: Hero photo, LandingPageContent wiring, auth page** - `cec84a1` (feat)
3. **Task 3: Visual verification** - awaiting human checkpoint

## Files Created/Modified
- `web/public/eth-zurich-white.svg` - ETH Zürich white wordmark SVG (official Wikimedia asset)
- `web/public/zurich-bg.jpg` - Zurich aerial dusk cityscape JPEG from Unsplash (975KB)
- `web/src/components/landing/SectionCredits.tsx` - New credits section component exported as `SectionCredits`
- `web/src/lib/translations.ts` - Added `landing_credits_label` to en and de objects
- `web/src/components/landing/SectionHero.tsx` - Photo layer with scroll-fade opacity added as first section child
- `web/src/components/landing/LandingPageContent.tsx` - Imported and rendered SectionCredits
- `web/src/app/auth/page.tsx` - Photo background, relative outer div, credits strip at bottom

## Decisions Made
- ETH SVG retained as-is — the blue background rect is part of the official white wordmark variant from Wikimedia
- `<img>` used instead of `<Image>` for ETH logo in non-fill contexts (no container needed for SVG display); ESLint no-img-element suppressed
- `priority` attribute: hero photo gets `priority=true` (LCP candidate); SectionCredits and auth page get lazy load (below fold or non-critical)
- `npm run build` fails due to pre-existing missing Supabase env vars in local environment — not related to this plan; `npx tsc --noEmit` passes cleanly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm run build` fails with Supabase env var error during auth page prerender — pre-existing infrastructure issue (no `.env.local` file in local environment). TypeScript check (`npx tsc --noEmit`) passes cleanly. Vercel deployment will succeed as env vars are configured there.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three Zurich photo surfaces ready for visual inspection at Task 3 checkpoint
- After approval: phase 23 complete, ready for merge to main and Vercel deployment
- No blockers

---
*Phase: 23-hackathon-credits-section*
*Completed: 2026-03-29*
