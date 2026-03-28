# Phase 21: Landing Page Polish v2 - Research

**Researched:** 2026-03-28
**Domain:** React/Next.js landing page UI polish — Framer Motion animations, Tailwind CSS, component alignment
**Confidence:** HIGH

## Summary

Phase 21 is a focused polish pass on four existing landing sections (`SectionHero`, `SectionProblem`, `SectionSolution`, `SectionCTA`). All the tooling is already installed and working: `motion` v12.38.0 (the Motion for React package, imported as `motion/react`), Next.js 16 with React 19, Tailwind CSS v4, and Vitest. No new packages are permitted or needed.

The four changes are well-isolated: (1) Hero chips need a style overhaul to match the extension's `ScoreBadge` visual language plus three additional chip instances, (2) the Problem section needs a scroll-driven per-item highlight replacing the current slide-in approach, (3) the Solution section needs copy changes plus size increases to the browser demo and step cards, and (4) SectionCTA needs a gradient transition divider between it and SectionSolution.

The biggest decision for the planner is the scroll highlight mechanism in SectionProblem. `useInView` per-item is simpler and more reliable for a section with only 3 items; `useScroll`+`useTransform` gives fine-grained control but requires the section to have a fixed scroll height container. Given there are only 3 pain points, the per-item `useInView` with `once: false` is the correct choice.

**Primary recommendation:** Implement all four changes as separate tasks within one plan file. The changes are independent enough to be done sequentially but small enough to merge in a single commit each.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Increase hero chips from 4 to 7 floating property chips
- Badge style must exactly match extension ScoreBadge: 40x40px circle, tier-colored fill, white/dark text inside; tier label to the right colored with tier bg; white/95 card with border-gray-100, shadow-md, backdrop-blur-sm, rounded-full pill, px-2.5 py-1.5
- TIER_COLORS: excellent=#10b981, good=#3b82f6, fair=#f59e0b, poor=#6b7280
- Chip distribution: 3 excellent, 2 good, 1 fair, 1 poor
- Chip float: random positions, varied animation speeds and directions
- Desktop only (xl:flex), reduced motion falls back to static
- Problem section: replace slide-in with scroll-driven per-item highlight
- Highlighted item: full opacity + teal accent glow treatment; others: low opacity
- After all 3 scrolled past: all three highlighted simultaneously
- viewport: { once: false } — re-triggers on scroll back up
- Solution overline: EN 'How it works' → 'How to avoid this'; DE 'So funktioniert es' → 'So vermeidest du das'
- Browser demo: increase from max-w-lg to max-w-2xl or larger
- Step cards: increase padding, font sizes, card height — feel substantial
- Step description text: larger and easier to read
- CTA transition: add gradient/divider element between SectionSolution and SectionCTA
- CTA: slightly different background treatment (e.g. radial teal glow)
- All whileInView: viewport: { once: false }
- No new npm packages — use existing Framer Motion, Tailwind, and CSS

### Claude's Discretion
- Exact pixel values for size increases (within spirit of "larger")
- Specific float animation keyframe values for 7 chips
- Exact gradient colors for CTA transition divider
- Whether to use useScroll+useTransform or useInView-per-item for problem highlight

### Deferred Ideas (OUT OF SCOPE)
- Dashboard UI alignment (Phase 22)
- Mobile optimization (Phase 23)
- Adding more demo scenes to the browser mock
- Video background for hero
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion (motion/react) | ^12.38.0 | Framer Motion animations — `useInView`, `useScroll`, `useTransform`, `useReducedMotion` | Already installed, all landing sections use it |
| tailwindcss | ^4 | Utility-first CSS, spacing/sizing tokens | Already in use throughout project |
| next.js | 16.1.6 | App router, Server Components | Project framework |
| react | 19.2.3 | UI runtime | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.0.18 | Test runner | All unit/component tests |
| @testing-library/react | ^16.3.2 | Component render tests | Verify section renders without crashing |

### No New Packages
The constraint "no new npm packages" is absolute. Every animation primitive needed (`useInView`, `useScroll`, `useTransform`, `useReducedMotion`, `motion.div`) is already exported from `motion/react` v12.

**Installation:** None needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure
No new files required. All changes are edits to existing files:
```
web/src/
├── components/landing/
│   ├── SectionHero.tsx       ← CHIPS array overhaul + ScoreBadge style
│   ├── SectionProblem.tsx    ← scroll highlight animation replacement
│   ├── SectionSolution.tsx   ← copy change + size increases
│   └── SectionCTA.tsx        ← gradient divider + teal glow
├── lib/
│   └── translations.ts       ← landing_howit_overline EN+DE only
└── app/
    └── globals.css           ← optional: @keyframes float-N if not using Framer
```

### Pattern 1: Extension-matched ScoreBadge chip in hero

The current chips use a dark card style (`hsl(0 0% 6% / 0.88)`) and a simple score badge. The new style must replicate the extension's `ScoreBadge` exactly on a light/white card (not dark). The extension badge uses:

```tsx
// Source: extension/src/entrypoints/content/components/ScoreBadge.tsx
// Card wrapper:
className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md
           bg-white/95 backdrop-blur-sm border border-gray-100"

// Score circle:
<span
  className="inline-flex items-center justify-center rounded-full text-base font-extrabold"
  style={{ width: 40, height: 40, backgroundColor: tierColor.bg, color: tierColor.text }}
>
  {score}
</span>

// Tier label:
<span className="text-xs font-semibold capitalize pr-1" style={{ color: tierColor.bg }}>
  {tier}
</span>
```

The hero chip also needs an address line and price line above the badge. The full chip structure becomes: white card pill → [left: address+price text block] [right: ScoreBadge circle+label].

Since hero background is dark (`hsl(0 0% 4%)`), the white card creates strong contrast — intentional, as it represents the extension badge appearing on a real Flatfox listing page.

### Pattern 2: Per-item useInView scroll highlight in SectionProblem

**Why useInView over useScroll+useTransform:** The section has only 3 discrete items. `useInView` with `once: false` and a generous `amount` threshold gives the "one at a time" feel without needing a pinned scroll container. `useScroll+useTransform` requires measuring section height and mapping scroll progress to item indices — more complex with no UX gain for 3 items.

The pattern: each item has its own `useInView` ref. When in view: full opacity + teal glow box-shadow. When NOT in view (but section is scrolled): low opacity (0.3). The "all highlighted" state at the end requires that items use `once: false` so they stay highlighted once the last one enters view.

```tsx
// Source: motion/react docs — useInView hook
import { useInView } from 'motion/react'
import { useRef } from 'react'

function ProblemItem({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      animate={{
        opacity: isInView ? 1 : 0.25,
        // teal glow when highlighted
        boxShadow: isInView
          ? 'inset 0 0 0 1px hsl(173 65% 52% / 0.3), 0 0 32px hsl(173 65% 52% / 0.12)'
          : 'none',
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
```

**Achieving "all three highlighted at end":** Because `once: false` is used, once the user scrolls past all 3, all 3 refs will have entered view and `isInView` will be `true` for all — this naturally produces the "all highlighted simultaneously" state without extra logic.

### Pattern 3: Browser demo enlargement + step card resizing

Current: `max-w-lg` (512px) on the MockBrowser wrapper. Target: `max-w-2xl` (672px) minimum, up to `max-w-3xl` (768px) if it fits within the section's `max-w-5xl` container.

Current step cards use `px-5 py-4`, `text-sm` label, `text-xs` body. Target treatment: `px-6 py-6` padding, `text-base` label (up from `text-sm`), `text-sm` body (up from `text-xs`).

### Pattern 4: CTA gradient transition divider

A `div` placed at the bottom of `SectionSolution` (or top of `SectionCTA`) with:
```tsx
// Gradient bridge element
<div
  aria-hidden
  style={{
    height: 120,
    background: 'linear-gradient(to bottom, transparent, hsl(173 65% 52% / 0.06), transparent)',
    // OR a teal decorative line in the center
  }}
/>
```

`SectionCTA` gets a `radial-gradient` background overlay — a teal glow at center:
```tsx
// Radial teal glow on CTA background
<div
  aria-hidden
  className="absolute inset-0 pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse 60% 40% at 50% 50%, hsl(173 65% 52% / 0.08) 0%, transparent 70%)',
  }}
/>
```

### Anti-Patterns to Avoid
- **Dark chip style for the hero rewrite:** The CONTEXT requires white/95 card to match the extension badge — do not keep the existing dark `hsl(0 0% 6% / 0.88)` background.
- **`viewport: { once: true }` on any whileInView:** CONTEXT locks `once: false` everywhere — this also applies to the existing `FadeIn` component in `SectionCTA` (which has `once: true` hardcoded). SectionCTA uses `FadeIn` — either pass a prop or replace with inline `motion.div`.
- **Using `useScroll` for the problem section:** The section is not a sticky/pinned scroll container; `useInView` is correct for discrete items.
- **Adding new translation keys:** Only the existing key `landing_howit_overline` changes value. Do not add keys (TypeScript will error if a key exists in `en` but not `de`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-aware animation trigger | Custom IntersectionObserver wrapper | `useInView` from `motion/react` | Already used in project; handles reduced motion, threshold, once |
| Float keyframes | CSS `@keyframes float-N` per chip | Framer Motion `animate` with y array `[0, -12, 0]` + repeat | Existing chip pattern already uses this; stays consistent |
| Tier color lookup | Inline color ternaries | TIER_COLORS from `extension/src/types/scoring.ts` | Source of truth; copy verbatim into a local const in SectionHero |

**Key insight:** The extension's `TIER_COLORS` is not importable from the web package (different workspace). Copy the const verbatim into `SectionHero.tsx` as a local constant — this is intentional and documented in CONTEXT.md.

---

## Common Pitfalls

### Pitfall 1: FadeIn component hardcodes `viewport: { once: true }`
**What goes wrong:** `SectionCTA` wraps its content in `<FadeIn>` which has `viewport={{ once: true, amount: 0.2 }}` hardcoded. The CONTEXT requires `once: false` everywhere.
**Why it happens:** `FadeIn` was built before the `once: false` requirement.
**How to avoid:** Replace `<FadeIn>` in `SectionCTA` with an inline `<motion.div ... whileInView viewport={{ once: false }}>` or add an `once` prop to `FadeIn`. The simpler path is an inline replacement since only SectionCTA is affected.
**Warning signs:** Animation doesn't re-trigger when scrolling back up to CTA section.

### Pitfall 2: TypeScript error when changing translations.ts
**What goes wrong:** The translations object uses `as const` and has a type-level check (`_DeHasAllEnKeys`) ensuring `de` has all keys that `en` has. Changing a key's VALUE is safe; renaming a key would break both language objects and the compile check.
**Why it happens:** `as const` freezes the shape.
**How to avoid:** Only change the string values of `landing_howit_overline` in both `en` and `de` entries. Do not rename the key.

### Pitfall 3: Hero chip z-index layering on white cards
**What goes wrong:** The new white/95 chips may visually clash with or obscure the dark background dot-grid and orbs, or stack incorrectly against the main content (`z-20`).
**Why it happens:** Current chips use `z-10`; main content uses `z-20`. White chips at `z-10` will appear behind the main content block — correct behavior.
**How to avoid:** Keep chips at `z-10`. The main content at `z-20` will render above, which is desired.

### Pitfall 4: MockBrowser content area height too small after enlargement
**What goes wrong:** The MockBrowser content area is hardcoded at `height: 280`. When the wrapper grows to `max-w-2xl`, the aspect ratio looks squished.
**Why it happens:** The height was tuned for `max-w-lg`.
**How to avoid:** When increasing `max-w-lg` to `max-w-2xl`, also increase the content area height from `280` to approximately `340–380px` to maintain a reasonable aspect ratio.

### Pitfall 5: Framer Motion `animate` object vs `whileInView` for scroll highlight
**What goes wrong:** Using `whileInView` with opacity/boxShadow directly conflicts with using `animate` driven by `useInView`'s boolean.
**Why it happens:** Framer Motion prioritizes gesture/scroll states over animate when both are present on the same element.
**How to avoid:** Use `animate` (not `whileInView`) on the problem item elements, with the value driven by the `useInView` boolean. This is the correct pattern when you need programmatic control over the animated state.

---

## Code Examples

### TIER_COLORS local copy (SectionHero)
```typescript
// Copy from extension/src/types/scoring.ts — not importable across workspaces
const TIER_COLORS = {
  excellent: { bg: '#10b981', text: '#ffffff' },
  good:      { bg: '#3b82f6', text: '#ffffff' },
  fair:      { bg: '#f59e0b', text: '#1a1a1a' },
  poor:      { bg: '#6b7280', text: '#ffffff' },
} as const
type Tier = keyof typeof TIER_COLORS
```

### 7-chip data array shape
```typescript
const CHIPS: {
  addr: string
  price: string
  score: number
  tier: Tier
  delay: number
  pos: React.CSSProperties
  floatY: [number, number, number]  // e.g. [0, -10, 0] or [0, 12, 0]
  floatDuration: number
}[] = [
  // 3 excellent, 2 good, 1 fair, 1 poor
  // Positions: spread around left/right/top/bottom edges at xl breakpoint
  // Some chips left side (left: '2%'), some right (right: '2%')
  // Vary top% between 12% and 80% across the 7
]
```

### Per-item useInView highlight pattern
```typescript
// Source: motion/react — useInView hook
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

function ProblemItem({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const isInView = useInView(ref, { once: false, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      animate={prefersReduced ? {} : {
        opacity: isInView ? 1 : 0.25,
        scale: isInView ? 1 : 0.98,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-start gap-6 py-12 border-b rounded-xl px-4"
      style={{
        borderColor: 'hsl(0 0% 100% / 0.07)',
        // Teal glow is better applied via boxShadow in animate or a conditional className
      }}
    >
      {children}
    </motion.div>
  )
}
```

### CTA section with radial glow and no FadeIn wrapper
```typescript
// SectionCTA — replace FadeIn with inline motion.div, add glow overlay
export function SectionCTA({ lang }: { lang: Language }) {
  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
      style={{ backgroundColor: 'var(--color-hero-bg)' }}
    >
      {/* Radial teal glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, hsl(173 65% 52% / 0.09) 0%, transparent 70%)',
        }}
      />
      <motion.div
        className="relative z-10 max-w-xl w-full"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ... existing content ... */}
      </motion.div>
    </section>
  )
}
```

### Gradient divider between SectionSolution and SectionCTA
```tsx
// Place at bottom of SectionSolution (inside the section element, after step cards)
<div
  aria-hidden
  style={{
    height: 100,
    background: 'linear-gradient(to bottom, transparent 0%, hsl(173 65% 52% / 0.07) 50%, transparent 100%)',
    margin: '0 -1.5rem',  // extend to section edges to cancel px-6
  }}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (`motion/react`) | Framer Motion rebranded to Motion v11+ | Import path is `motion/react`, not `framer-motion` — already correct in codebase |
| `useInView` from `react-intersection-observer` | `useInView` from `motion/react` | Motion v11 | No external peer library needed for scroll-trigger |

**Deprecated/outdated:**
- `framer-motion` import: Project already uses `motion/react` correctly — no change needed.
- `viewport: { once: true }` in `FadeIn`: Acceptable for general use but must be overridden for Phase 21 landing sections per CONTEXT requirement.

---

## Open Questions

1. **Gradient divider placement: inside SectionSolution vs standalone component**
   - What we know: It needs to bridge between SectionSolution and SectionCTA visually
   - What's unclear: Whether to put it at the bottom of SectionSolution's `<section>` or as a separate `<div>` in `LandingPageContent.tsx`
   - Recommendation: Put it as a `<div>` in `LandingPageContent.tsx` between the two sections — keeps each section self-contained and makes the divider easy to remove later.

2. **Chip positions at 7 items without overlap**
   - What we know: Current 4 chips use top-left, top-right, bottom-left, bottom-right at `2%` inset
   - What's unclear: How to distribute 3 more without crowding on `xl` screens (1280px+)
   - Recommendation: Add chips at mid-left and mid-right positions (~40-50% top), plus a top-center chip. The hero text occupies center 60%, so chips at left/right 2% with varied top% avoid overlap.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.0.18 |
| Config file | `web/vitest.config.ts` (inferred from package.json `"test": "vitest"`) |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LP-02 | Hero section renders with 7 chips | unit | `cd web && npx vitest run --reporter=verbose` | ❌ Wave 0 |
| LP-03 | Problem/Solution sections render without error | unit | `cd web && npx vitest run --reporter=verbose` | ❌ Wave 0 |
| LP-05 | CTA section renders with correct copy | unit | `cd web && npx vitest run --reporter=verbose` | ❌ Wave 0 |
| (copy change) | landing_howit_overline returns new value in both langs | unit | `cd web && npx vitest run --reporter=verbose` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/landing-polish.test.tsx` — smoke tests for SectionHero (7 chips), SectionProblem, SectionSolution (overline copy), SectionCTA
- [ ] Translation key value assertions for `landing_howit_overline` in both EN and DE

*(Existing test infrastructure is present — `vitest`, `@testing-library/react`, `@testing-library/jest-dom` are all installed. Only new test file needed for phase-specific behaviors.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code read: `extension/src/entrypoints/content/components/ScoreBadge.tsx` — exact badge markup
- Direct source code read: `extension/src/types/scoring.ts` — TIER_COLORS exact hex values
- Direct source code read: `web/src/components/landing/SectionHero.tsx` — current chip structure
- Direct source code read: `web/src/components/landing/SectionProblem.tsx` — current animation approach
- Direct source code read: `web/src/components/landing/SectionSolution.tsx` — current demo/step card sizes
- Direct source code read: `web/src/components/landing/SectionCTA.tsx` — FadeIn usage confirmed
- Direct source code read: `web/src/components/motion/FadeIn.tsx` — `once: true` hardcoded confirmed
- Direct source code read: `web/src/lib/motion.ts` — available easing tokens
- Direct source code read: `web/src/lib/translations.ts` — current overline values, const structure
- Direct source code read: `web/src/app/globals.css` — CSS variable names confirmed
- Direct source code read: `web/package.json` — `motion` v12.38.0 confirmed

### Secondary (MEDIUM confidence)
- motion/react v12 API: `useInView`, `useScroll`, `useTransform`, `useReducedMotion` all present in v12 — consistent with existing code patterns using these hooks

### Tertiary (LOW confidence)
- None — all critical findings verified from source code directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and existing source
- Architecture: HIGH — all patterns derived from existing codebase conventions
- Pitfalls: HIGH — identified from direct code inspection (FadeIn once:true, translation const shape, z-index values)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack, 30 days)
