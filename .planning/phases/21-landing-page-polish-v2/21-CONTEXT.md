# Phase 21: Landing Page Polish v2 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Source:** Direct user feedback after Phase 20 execution

<domain>
## Phase Boundary

Polish the 5-section landing page (`web/src/components/landing/`) based on specific user feedback. Does NOT touch dashboard, backend, or extension source. All changes are in the web app landing section components and translations.

Key files in scope:
- `web/src/components/landing/SectionHero.tsx`
- `web/src/components/landing/SectionProblem.tsx`
- `web/src/components/landing/SectionSolution.tsx`
- `web/src/components/landing/SectionCTA.tsx`
- `web/src/lib/translations.ts` (overline copy change only)
- `web/src/app/globals.css` (new keyframes if needed)

</domain>

<decisions>
## Implementation Decisions

### Hero Section — Score Badge Chips
- **Increase from 4 to 7 floating property chips** around the main text
- **Badge style must exactly match the extension's ScoreBadge component** (`extension/src/entrypoints/content/components/ScoreBadge.tsx`):
  - Circle element: 40×40px, `border-radius: 50%`, filled with `TIER_COLORS[tier].bg`, number in white/dark text inside
  - Tier label text to the right of circle, colored with `TIER_COLORS[tier].bg`
  - White/95 card background with subtle border and shadow (`bg-white/95 backdrop-blur-sm border border-gray-100 shadow-md`)
  - TIER_COLORS: `excellent` = `#10b981` (emerald), `good` = `#3b82f6` (blue), `fair` = `#f59e0b` (amber), `poor` = `#6b7280` (gray)
- Chips should float randomly around the hero text — varied positions, varied float animation speeds and directions
- Each chip has a property address, price, and score badge (circle + tier label)
- Distribute tiers across the 7 chips to show variety (e.g., 3 excellent, 2 good, 1 fair, 1 poor)
- On desktop only (xl:flex), reduced motion falls back to static

### Problem Section — Scroll-Driven Highlight Animation
- **Replace** the current slide-in animation with a scroll-driven per-item highlight system
- As the user scrolls through the problem section, each pain point gets highlighted one at a time; the others fade out (low opacity)
- At the end of the section (user has scrolled past all 3), all three are highlighted simultaneously
- Uses `useScroll` + `useTransform` or `useInView` per item — whichever is most reliable
- Section should feel more vibrant: consider a teal accent glow or color treatment on highlighted items
- `viewport: { once: false }` — re-triggers on scroll back up

### Solution Section — Copy + Size Improvements
- Change the overline translation key `landing_howit_overline` value from "How it works" to "How to avoid this" (EN) and "So vermeidest du das" (DE)
- **Browser demo**: increase max-width from `max-w-lg` (512px) to `max-w-2xl` (672px) or larger — make it the visual centerpiece
- **Step cards**: increase padding, font sizes, and overall card height — they should feel substantial, not small
- Step description text should be larger and easier to read

### CTA Transition — Smooth Bridge
- Add a visual gradient/divider element between the Solution section and SectionCTA
- Options: a gradient `div` that fades from `hero-bg` to a slightly different shade, or a decorative separator with a teal element
- The CTA section itself can have a slightly different background treatment (e.g., a radial teal glow) to signal a change of tone

### General
- All whileInView animations must use `viewport: { once: false }` so they re-trigger on scroll back
- Colors must match the extension palette: teal (#10b981 for excellent, #3b82f6 for good, #f59e0b for fair, #6b7280 for poor)
- No new npm packages — use existing Framer Motion, Tailwind, and CSS

### Claude's Discretion
- Exact number of pixels for size increases (within the spirit of "larger")
- Specific float animation keyframe values for the 7 chips
- Exact gradient colors for the CTA transition divider
- Whether to use `useScroll`+`useTransform` or `useInView`-per-item for the problem highlight

</decisions>

<specifics>
## Specific References

**Extension ScoreBadge source:** `extension/src/entrypoints/content/components/ScoreBadge.tsx`
**Extension TIER_COLORS source:** `extension/src/types/scoring.ts`

TIER_COLORS exact values:
```ts
excellent: { bg: '#10b981', text: '#ffffff' },
good:      { bg: '#3b82f6', text: '#ffffff' },
fair:      { bg: '#f59e0b', text: '#1a1a1a' },
poor:      { bg: '#6b7280', text: '#ffffff' },
```

ScoreBadge visual structure:
```
[○ 94  excellent]   ← circle (40×40) | tier label
```
- Card: white/95 bg, border-gray-100, shadow-md, rounded-full pill, px-2.5 py-1.5
- Circle: 40×40, rounded-full, bg = tier color, text = tier text color, font-extrabold text-base
- Label: text-xs font-semibold capitalize, color = tier.bg

Current translation to change:
- EN `landing_howit_overline`: 'How it works' → 'How to avoid this'
- DE `landing_howit_overline`: 'So funktioniert es' → 'So vermeidest du das'

</specifics>

<deferred>
## Deferred Ideas

- Dashboard UI alignment (Phase 22)
- Mobile optimization (Phase 23)
- Adding more demo scenes to the browser mock
- Video background for hero

</deferred>

---

*Phase: 21-landing-page-polish-v2*
*Context gathered: 2026-03-28 from user feedback session*
