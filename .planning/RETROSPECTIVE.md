# Retrospective — HomeMatch

---

## Milestone: v4.0 — Landing Page & Design System

**Shipped:** 2026-03-28
**Phases:** 4 (18-21) | **Plans:** 8 | **Timeline:** 2 days

### What Was Built

- Framer Motion design system — motion tokens, easing presets, FadeIn/StaggerGroup/CountUp primitives
- 5-section scroll-triggered landing page (Hero → Globe SVG draw-in → Problem → Solution → CTA), fully bilingual EN/DE
- ScoreBadge-style hero chips matching extension's TIER_COLORS visual language exactly
- Scroll-driven Problem section with `useInView` per-item highlight, teal glow, `once: false` re-trigger
- Enlarged Solution browser demo (max-w-2xl, 360px height), teal gradient bridge to CTA, radial glow CTA animation

### What Worked

- **Wave parallelization:** Plans 21-01 and 21-02 ran in parallel — both completed successfully with no conflicts (different files)
- **Incremental redesign:** Starting with a skeleton (Phase 19) then replacing it wholesale (Phase 20) avoided over-engineering early
- **Local TIER_COLORS const:** Duplicating the constant instead of importing cross-workspace prevented build coupling — pragmatic and correct
- **`useInView` over `whileInView` for per-item:** Explicit `animate` prop driven by `isInView` avoids the Framer Motion `whileInView` conflict when both animate and whileInView are set on the same element

### What Was Inefficient

- **Phase 20 rework:** Phase 20-01 built 7 sticky-parallax chapters that were discarded immediately in 20-02 (redesign pivot). The planning phase wasn't clear enough about the architectural direction, causing a full rewrite within the same phase.
- **Stale test cases:** Phase 21-03 had to delete dead test cases referencing removed `Features` block (Built for Swiss renters, AI match scoring) — tests weren't kept in sync with Phase 20's structural changes.
- **STATE.md drift:** The STATE.md showed "50% progress" after all phases were complete — the CLI's phase count was misaligned with the actual 4 phases in `.planning/phases/`.

### Patterns Established

- **Gradient bridges in LandingPageContent:** Visual transitions between sections belong in the orchestrator, not the section components themselves — keeps components self-contained
- **`useInView(ref, { once: false, amount: 0.5 })`:** Standard pattern for scroll-retriggerable per-item highlights going forward
- **`viewport: { once: false, amount: 0.3 }`:** Standard for `motion.div` CTA-style scroll-retriggerable animations
- **Inline CSS variable styles in landing sections:** Consistent with rest of landing page; avoids Tailwind custom token gaps

### Key Lessons

- Clarify sticky-vs-scroll direction in planning before writing chapter components — saves rework
- Keep tests updated when removing feature blocks; stale tests accumulate quickly in animated components
- When parallelizing plans, verify file overlap first — 21-01 and 21-02 touched different files cleanly

### Cost Observations

- Profile: quality (sonnet throughout)
- Sessions: 3 (Phase 20, Phase 21, milestone completion)
- Notable: Phase 21 wave parallelization (2 agents) was the fastest execution at ~6 min combined

---

## Cross-Milestone Trends

| Milestone | Days | Phases | Plans | Key Pattern |
|-----------|------|--------|-------|-------------|
| v1.0 MVP | 8 | 4 | 12 | Greenfield — everything from scratch |
| v1.1 Multi-Profile | 3 | 6 | 13 | Schema-first, then UI |
| v2.0 AI Features | 2 | 6 | ~12 | Parallel agents, wave execution |
| v3.0 Download | <1 | 1 | 1 | Single focused feature |
| v4.0 Landing | 2 | 4 | 8 | Animation-heavy, iterative redesign |

**Observed trend:** Parallel wave execution (v2.0+) reliably delivers 4-6 plans/day. Single-focused milestones (v3.0) complete in <1 day. Design-heavy milestones (v4.0) benefit most from an explicit redesign phase.
