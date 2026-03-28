---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Dashboard Polish & QA
status: between_milestones
last_updated: "2026-03-28"
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.
**Current focus:** v4.0 shipped. Next: v4.1 Dashboard Polish & QA (Phases 22-23) or merge `redesign/v4-landing` → main.

## Current Position

Milestone v4.0 complete and archived. Branch `redesign/v4-landing` ready to merge → main.
Phases 22 (Dashboard UI Alignment) and 23 (Polish & QA) planned for v4.1.

Progress: [__________] 0% (v4.1 not started)

## Accumulated Context

### Decisions (v4.0 — archived)

- [v4.0]: Branch `redesign/v4-landing` — all work here, PR → merge to main when milestone complete
- [v4.0]: Landing page replaces `/` route directly (currently a redirect)
- [v4.0]: Framer Motion for animations — not yet installed
- [v4.0]: Dark hero + light dashboard color split — teal accent retained, single accent only
- [v4.0]: Apple-inspired aesthetic — restraint, whitespace, typography-led, motion earned not decorative
- [v4.0]: Hero animation — mock Flatfox page → FAB → scoring → analysis panel
- [v4.0]: Copy bilingual EN/DE — Hormozi structure (dream outcome → proof → CTA)
- [v4.0]: No social proof yet — deferred to later milestone
- [v4.0]: Phase order: 18 Design System → 19 Landing Page → 20 Dashboard Alignment → 21 Polish & QA
- [Phase 20-01]: IsometricHome uses useMotionValue(1) as fallback when scrollProgress is undefined — all parts visible in static mode
- [Phase 20-01]: 7-chapter scroll-driven landing page replaces Phase 19 flat layout — each chapter a sticky section driven by useScroll + useTransform
- [Phase 20-02]: EMPTY_VARIANTS typed as Variants = {} for reduced-motion ternary in motion/react components — TypeScript cannot infer {} assignable to Variants without explicit type annotation
- [Phase 20-02]: Switzerland polygon uses fill color transition (not pathLength) — pathLength only affects strokes; polygon has fill but no stroke
- [Phase 20-02]: LandingPageContent stubbed with SectionHero + SectionGlobe immediately to unblock tests — full rewrite deferred to Plan 03
- [Phase 20-03]: SectionSolution uses one section element for both How It Works and Features blocks — cohesion over split
- [Phase 20-03]: stepStaggerVariants defined locally (staggerChildren: 0.15) — specific to 3-step reveal, not reusable
- [Phase 21-02]: once: false on useInView so highlight re-triggers on scroll back; reduced motion uses empty animate object
- [Phase 21-01]: TIER_COLORS defined as local const in SectionHero.tsx (not imported across workspaces) to mirror extension ScoreBadge
- [Phase 21-01]: data-testid="hero-chip" added to animated chip divs for jsdom testability
- [Phase 21-01]: landing_howit_overline changed to "How to avoid this" (EN) / "So vermeidest du das" (DE) — narrative bridge from Problem to Solution
- [Phase 21-03]: Gradient bridge divider placed in LandingPageContent (not inside sections) to keep components self-contained
- [Phase 21-03]: SectionCTA FadeIn replaced with motion.div using viewport: { once: false, amount: 0.3 } for scroll-retriggerable animation
- [Phase 21-03]: Tailwind bg-hero-bg / text-hero-fg / bg-hero-teal replaced with inline CSS variable styles in SectionCTA — consistent with other landing sections

### Decisions (added)

- [19-01]: Auth form moved to /auth; / is a Server Component redirecting logged-in users to /dashboard
- [19-01]: `translations` const exported so tests can import it for coverage checks
- [19-01]: IntersectionObserver mock pattern established in test files (same as fade-in.test.tsx)

### Blockers/Concerns

- None
