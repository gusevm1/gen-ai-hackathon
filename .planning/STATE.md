---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Landing Page v2 & Hackathon Credits
status: in_progress
last_updated: "2026-03-28"
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 12
  completed_plans: 11
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.
**Current focus:** v4.1 — polish landing page sections, unify tier colors, add hackathon credits.

## Current Position

Milestone v4.0 complete and archived. Branch `redesign/v4-landing` active.
Phase 22 plan 02 (SectionProblem Redesign) complete. Next: 22-03.

Progress: [█████████░] 92% (11/12 plans complete)

**Last session:** 2026-03-28 — Completed 22-02-PLAN.md (SectionProblem redesign)

## Accumulated Context

### Key decisions carried from v4.0

- Framer Motion (motion/react v12) — whileInView + useInView patterns established
- `useInView` not `whileInView` for per-item animate props — avoids Framer Motion conflict
- Tailwind CSS variables: `var(--color-hero-bg)`, `var(--color-hero-fg)`, `var(--color-hero-teal)`
- TIER_COLORS defined locally in SectionHero (not imported cross-workspace)
- Landing sections: SectionHero, SectionGlobe, SectionProblem, SectionSolution, SectionCTA
- `once: false` on useInView — animations re-trigger on scroll back

### v4.1 Design Decisions

- Poor tier color to change from gray (#6b7280) → red (#ef4444) in both landing and extension TIER_COLORS
- Problem cards: slide from left (translateX: -60px → 0) using useInView per card, not opacity-only
- CTA headline: clamp(2.5rem, 6vw, 4.5rem) min, animate y: 60 → 0 with spring
- Credits section: minimal, below CTA, shows ETH + Gen-AI Hackathon logos
- Swiss photography deferred to v4.2 discussion
- x slide-in uses no initial prop — Framer Motion derives start state from animate value at mount when isInView=false (22-02)
- jsdom normalizes hsl() to rgba() — PROB-03 test checks both color representations for test reliability (22-02)
- Card elevation via backgroundColor + border inline style (not Tailwind bg-* classes) — required since hsl() with spaces not supported in Tailwind utilities (22-02)

### Blockers/Concerns

- None
