# Phase 22: Landing Page Section Redesigns - Research

**Researched:** 2026-03-28
**Domain:** React/Next.js landing page polish — Framer Motion animations, Tailwind CSS, tier color system
**Confidence:** HIGH

## Summary

Phase 22 is pure polish work on four existing landing page components: SectionHero, SectionProblem, SectionSolution, and SectionCTA. All dependencies are already installed and working. The animation infrastructure (motion/react v12, useInView, spring tokens from `@/lib/motion`) is fully established from Phases 18–21. No new libraries need to be added.

The work falls into four categories: (1) subtractive changes to Hero (remove stats row, isolate CTA button row), (2) animation upgrade to Problem cards (add x:-60→0 slide-in and elevated card style), (3) enlargement + color system fixes in Solution (max-w-3xl browser demo, tier-based score colors), and (4) CTA animation and font size upgrade. Additionally, `TIER_COLORS.poor` must be updated in two places: `SectionHero.tsx` and `extension/src/types/scoring.ts`.

**Primary recommendation:** Work sequentially per component. The tier color unification (HERO-03) is a single-line change in two files and should be done first since it unblocks tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HERO-01 | Stats row removed from SectionHero | Locate and delete the `mt-16 flex items-center gap-10` motion.div block (lines 240–261 of SectionHero.tsx) |
| HERO-02 | CTA button centered on its own row, not paired inline with secondary text on desktop | The CTA wrapper uses `flex-col sm:flex-row` — change to always `flex-col items-center`; move the "Free · No credit card" span below the button |
| HERO-03 | Poor tier color: gray (#6b7280) → red (#ef4444) in both SectionHero.tsx TIER_COLORS and extension/src/types/scoring.ts | Two-file, one-line change per file: change `bg: '#6b7280'` to `bg: '#ef4444'` |
| PROB-01 | Remove decorative background numbers (aria-hidden `<span>` with 3% opacity) from ProblemItem | Delete the `<span aria-hidden>` block (lines 41–52 of SectionProblem.tsx) |
| PROB-02 | Each problem card slides from x:-60→0 on scroll entry using useInView per card | `useInView` per card is already implemented; add `x: isInView ? 0 : -60` to the existing animate prop alongside current opacity/scale |
| PROB-03 | Problem cards redesigned — elevated card style, stronger visual hierarchy, not plain bordered list | Replace current plain border-b style with card background + elevated shadow + larger number badge |
| SOLN-01 | Browser demo enlarged: max-w-2xl → max-w-3xl+ | Change `max-w-2xl` to `max-w-3xl` on the browser demo wrapper motion.div |
| SOLN-02 | Step cards enlarged — more padding, bigger label text, more presence | Increase px-6/py-6 to px-8/py-8; increase step label from `text-base` to `text-lg`+ |
| SOLN-03 | AnimatedScore uses green(≥80)/yellow(60-79)/red(<60) — not binary teal/gray | Refactor the `isHigh = score >= 88` binary logic in AnimatedScore to a three-way tier function |
| SOLN-04 | SceneAnalysis overall score badge uses tier color (green at 94) not static teal | The "94%" span currently uses `var(--color-hero-teal)` — replace with tier-derived color |
| CTA-01 | Headline font size: clamp(2.5rem, 6vw, 4.5rem), bold, commanding | Change `clamp(1.75rem, 4vw, 2.75rem)` to `clamp(2.5rem, 6vw, 4.5rem)` on the h2 in SectionCTA |
| CTA-02 | Headline animates from y:60+ with spring physics | Extract the h2 into its own motion element with `useInView` + spring transition from y:60 |
| CTA-03 | Stronger visual presence — larger glow radius, button with glow shadow matching hero CTA | Enlarge radial gradient from 60%/40% to 80%/60%; add `boxShadow: '0 0 32px hsl(173 65% 52% / 0.28)'` to button |
</phase_requirements>

## Standard Stack

### Core (already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | ^12.38.0 | Framer Motion v12 — scroll animations, springs | Established in Phase 18; `useInView`, `motion.div`, `useReducedMotion` all in use |
| next | 16.1.6 | App framework | Project foundation |
| tailwindcss | (project dep) | Utility CSS | Used throughout landing |
| vitest | ^4.0.18 | Test runner | Existing test suite in `web/src/__tests__/` |

### Motion Tokens (already established in `@/lib/motion`)

| Export | Value | Use |
|--------|-------|-----|
| `spring.gentle` | `{ type: "spring", stiffness: 120, damping: 20, mass: 1 }` | CTA headline spring entrance |
| `spring.snappy` | `{ type: "spring", stiffness: 520, damping: 32, mass: 0.8 }` | Problem card slide-in |
| `ease.enter` | `[0.22, 1, 0.36, 1]` | Standard entrance easing |
| `duration.slow` | `0.60` | Longer entrance animations |
| `slideInLeftVariants` | `{ hidden: { opacity:0, x:-40 }, visible: { opacity:1, x:0 } }` | Pre-built left-slide preset (x:-40); phase uses x:-60 so use animate prop directly |

**Installation:** No new packages needed.

## Architecture Patterns

### Existing Pattern: useInView per-item animate

Already used in `SectionProblem.tsx` for opacity/scale. Extend it for x-axis translation:

```typescript
// Source: existing SectionProblem.tsx — extend this pattern
const ref = useRef<HTMLDivElement>(null)
const isInView = useInView(ref, { once: false, amount: 0.5 })

animate={prefersReduced ? {} : {
  opacity: isInView ? 1 : 0.25,
  x: isInView ? 0 : -60,           // ADD this — was not present
  scale: isInView ? 1 : 0.99,
  boxShadow: isInView ? '...' : 'none',
}}
transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
```

**Key constraint:** Use `animate` + `useInView` for per-item props. Do NOT use `whileInView` when setting individual animate prop values — this is an established pattern from Phase 21 carried forward in STATE.md.

### Tier Color Helper Pattern

For SOLN-03/SOLN-04, define a local helper in SectionSolution.tsx (consistent with TIER_COLORS being defined locally — not cross-imported):

```typescript
// Define locally — NOT imported from extension
function scoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) return { bg: 'hsl(142 71% 45% / 0.18)', text: '#10b981', border: 'hsl(142 71% 45% / 0.3)' }
  if (score >= 60) return { bg: 'hsl(38 92% 50% / 0.18)',  text: '#f59e0b', border: 'hsl(38 92% 50% / 0.3)'  }
  return              { bg: 'hsl(0 72% 51% / 0.18)',       text: '#ef4444', border: 'hsl(0 72% 51% / 0.3)'   }
}
```

For SOLN-04 (SceneAnalysis overall score badge at 94), the same helper applies — score 94 → green.

### CTA Headline Spring Pattern

For CTA-02, the current SectionCTA wraps the entire content block in a single `whileInView` motion.div with `y:20`. Extract the h2 separately:

```typescript
// Source: pattern from SectionHero + motion tokens
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { spring } from '@/lib/motion'

const headlineRef = useRef<HTMLHeadingElement>(null)
const headlineInView = useInView(headlineRef, { once: false, amount: 0.6 })

<motion.h2
  ref={headlineRef}
  animate={prefersReduced ? {} : {
    opacity: headlineInView ? 1 : 0,
    y: headlineInView ? 0 : 60,
  }}
  initial={{ opacity: 0, y: 60 }}
  transition={spring.gentle}
  // ...
>
```

### Anti-Patterns to Avoid

- **Mixing whileInView + animate props on same element:** Using both `whileInView` and a dynamic `animate` prop on one `motion.div` causes Framer Motion to conflict. Use `useInView` + `animate` prop consistently (existing established pattern).
- **Importing extension TIER_COLORS into web:** The extension workspace is not a web import target. Keep color definitions local to each component/file.
- **Removing `once: false` from useInView:** STATE.md documents `once: false` as an intentional decision — animations re-trigger on scroll back. Do not change to `once: true`.
- **Hardcoding animation values instead of using motion tokens:** Use `spring.gentle`/`spring.snappy` from `@/lib/motion`, not inline spring configs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll trigger | Custom IntersectionObserver wrapper | `useInView` from motion/react | Already used, handles SSR and cleanup |
| Spring animation | Manual requestAnimationFrame spring | `spring.gentle` from `@/lib/motion` | Physics already tuned |
| Reduced motion | Manual `prefers-reduced-motion` media query | `useReducedMotion()` from motion/react | Hook already used throughout codebase |

**Key insight:** All animation infrastructure is present. Phase 22 is configuration of existing patterns, not new primitives.

## Common Pitfalls

### Pitfall 1: Test selector mismatch after card structure change
**What goes wrong:** `section-problem.test.tsx` line 47 queries `.py-12` to find 3 problem items. If card padding class changes during the visual redesign (PROB-03), this selector breaks.
**Why it happens:** Tests are written against current CSS class names.
**How to avoid:** Either keep `.py-12` on the outer motion.div, or update the test selector to use a `data-testid="problem-item"` attribute.
**Warning signs:** `section-problem.test.tsx` test "renders 3 problem items with motion divs" fails after PROB-03 change.

### Pitfall 2: AnimatedScore logic breakage
**What goes wrong:** AnimatedScore `isHigh = score >= 88` is used to control both color AND border. Replacing this binary with a three-way tier function affects the entire style object.
**Why it happens:** All three style properties (backgroundColor, color, border) are derived from the single boolean.
**How to avoid:** Replace the boolean with the `scoreColor(score)` helper that returns all three values at once; update all three style references.

### Pitfall 3: CTA h2 spring flickers on initial load
**What goes wrong:** If `initial={{ opacity: 0, y: 60 }}` is set on an element that starts in-view on page load (CTA is below the fold, so this is low risk), it may flash.
**Why it happens:** Framer Motion applies `initial` before the component mounts.
**How to avoid:** The CTA section is at the bottom of a tall page — it is always below the fold. Low risk. Use `initial={{ opacity: 0, y: 60 }}` directly.

### Pitfall 4: Stats row removal leaves a dangling bottom padding
**What goes wrong:** The stats row `motion.div` has `mt-16` which adds space below the CTA button group. After removing the stats row, the bottom of the hero content sits closer to the floating chips.
**Why it happens:** The `mt-16` spacer was only meaningful because content followed it.
**How to avoid:** After removing stats row, verify hero visual balance. May need to adjust `mb-10` on subtitle or `py-24` on section.

### Pitfall 5: Poor chip color at #ef4444 conflicts with white chip background
**What goes wrong:** The poor-tier chip (Altstetten, score 41) currently shows gray (#6b7280) badge on white background. Red (#ef4444) on white is visually fine, but the tier label text beside the badge is colored `TIER_COLORS[chip.tier].bg` — which becomes red text. This is intentional and correct (matches extension visual language).
**Why it happens:** Both the score circle background and the tier label text use the same color value.
**How to avoid:** This is by design. Verify it looks correct visually after the change.

## Code Examples

### Hero: Remove stats row (HERO-01)

Delete lines 239–261 of `web/src/components/landing/SectionHero.tsx`:

```typescript
// DELETE this entire block:
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.8, duration: duration.slow }}
  className="mt-16 flex items-center gap-10 flex-wrap justify-center"
>
  {[...].map(({ value, label }) => (
    <div key={label} className="flex flex-col items-center gap-1">
      ...
    </div>
  ))}
</motion.div>
```

### Hero: Center CTA on its own row (HERO-02)

```typescript
// BEFORE (line 217 area):
<motion.div
  ...
  className="flex flex-col sm:flex-row items-center gap-4"
>
  <Button ...>{t(lang, 'landing_hero_cta')}</Button>
  <span className="text-sm" style={{ color: 'hsl(0 0% 42%)' }}>
    Free · No credit card · Works on Flatfox today
  </span>
</motion.div>

// AFTER — always stacked, button centered:
<motion.div
  ...
  className="flex flex-col items-center gap-3"
>
  <Button ...>{t(lang, 'landing_hero_cta')}</Button>
  <span className="text-sm text-center" style={{ color: 'hsl(0 0% 42%)' }}>
    Free · No credit card · Works on Flatfox today
  </span>
</motion.div>
```

### Hero + Extension: Tier color update (HERO-03)

```typescript
// web/src/components/landing/SectionHero.tsx — line 14:
poor: { bg: '#ef4444', text: '#ffffff' },  // was '#6b7280'

// extension/src/types/scoring.ts — line 39:
poor: { bg: '#ef4444', text: '#ffffff' },  // was '#6b7280'
```

### Problem: Add x slide-in to existing animate prop (PROB-02)

```typescript
// SectionProblem.tsx — extend existing animate in ProblemItem:
animate={prefersReduced ? {} : {
  opacity: isInView ? 1 : 0.25,
  x: isInView ? 0 : -60,           // NEW
  scale: isInView ? 1 : 0.99,
  boxShadow: isInView
    ? 'inset 0 0 0 1px hsl(173 65% 52% / 0.3), 0 0 28px hsl(173 65% 52% / 0.10)'
    : 'none',
}}
```

### Problem: Elevated card style (PROB-03)

```typescript
// Replace the className and style on the outer motion.div in ProblemItem:
// BEFORE: "relative flex items-start gap-6 py-12 border-b rounded-xl px-4"
// AFTER:
<motion.div
  ref={ref}
  animate={...}
  transition={...}
  className="relative flex items-start gap-6 py-8 px-8 rounded-2xl"
  style={{
    backgroundColor: 'hsl(0 0% 100% / 0.03)',
    border: '1px solid hsl(0 0% 100% / 0.07)',
  }}
>
```

Note: The existing `boxShadow` in animate already provides the teal glow on hover-in — keep it.
The border-b (bottom border only) should be replaced by a full border for the card look.

### Solution: ScoreColor helper (SOLN-03 + SOLN-04)

```typescript
// Add near top of SectionSolution.tsx (after imports)
function scoreColor(score: number) {
  if (score >= 80) return {
    bg: 'hsl(142 71% 45% / 0.18)',
    color: '#10b981',
    border: 'hsl(142 71% 45% / 0.3)',
  }
  if (score >= 60) return {
    bg: 'hsl(38 92% 50% / 0.18)',
    color: '#f59e0b',
    border: 'hsl(38 92% 50% / 0.3)',
  }
  return {
    bg: 'hsl(0 72% 51% / 0.18)',
    color: '#ef4444',
    border: 'hsl(0 72% 51% / 0.3)',
  }
}
```

### CTA: Font size + spring entrance (CTA-01 + CTA-02)

```typescript
// SectionCTA.tsx — extract headline into own motion element:
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { spring } from '@/lib/motion'

// Inside SectionCTA component:
const prefersReduced = useReducedMotion()
const headlineRef = useRef<HTMLHeadingElement>(null)
const headlineInView = useInView(headlineRef, { once: false, amount: 0.6 })

// In JSX:
<motion.h2
  ref={headlineRef}
  className="font-bold tracking-tight mb-4"
  style={{
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',  // was clamp(1.75rem, 4vw, 2.75rem)
    lineHeight: 1.1,
    color: 'var(--color-hero-fg)',
  }}
  initial={{ opacity: 0, y: 60 }}
  animate={prefersReduced ? { opacity: 1, y: 0 } : {
    opacity: headlineInView ? 1 : 0,
    y: headlineInView ? 0 : 60,
  }}
  transition={spring.gentle}
>
  {t(lang, 'landing_cta_headline')}
</motion.h2>
```

### CTA: Larger glow + button shadow (CTA-03)

```typescript
// Glow: change 60%/40% → 80%/60% and increase opacity 0.09 → 0.13
background: 'radial-gradient(ellipse 80% 60% at 50% 50%, hsl(173 65% 52% / 0.13) 0%, transparent 70%)'

// Button: add boxShadow matching hero CTA
style={{
  backgroundColor: 'var(--color-hero-teal)',
  color: 'var(--color-hero-bg)',
  boxShadow: '0 0 32px hsl(173 65% 52% / 0.28)',
}}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion/react` (v12 package name) | Phase 18 | Import from `motion/react` not `framer-motion` |
| `whileInView` for per-item animation | `useInView` hook + `animate` prop | Phase 21 | Avoids Framer Motion conflict with dynamic animate values |
| Binary teal/gray for score badges | Three-tier green/yellow/red system | Phase 22 (this phase) | Matches extension visual language and traffic-light convention |

**Deprecated/outdated:**
- `framer-motion` import path: use `motion/react` for all imports in this project.
- `whileInView` on elements that also use dynamic `animate` prop: use `useInView` + `animate` prop instead.

## Open Questions

1. **PROB-03 card spacing between items**
   - What we know: Current layout uses `space-y-0` container with `border-b` creating visual separation. With elevated cards, adjacent items need gap.
   - What's unclear: Whether `space-y-4` or `space-y-6` looks better — requires visual judgment at implementation time.
   - Recommendation: Use `space-y-4` as starting point; implementer adjusts visually.

2. **SOLN-01 browser demo height at max-w-3xl**
   - What we know: MockBrowser content area is fixed at `height: 360`. At max-w-3xl the browser is wider but height stays 360.
   - What's unclear: Whether fixed height 360 needs to increase at larger widths.
   - Recommendation: Try without changing height first. If content looks sparse, increase to 400 or 420.

3. **Section-problem test selector after PROB-03**
   - What we know: `section-problem.test.tsx` line 47 queries `.py-12` to find 3 items. PROB-03 changes card padding class.
   - What's unclear: Whether to update test or preserve class name.
   - Recommendation: Add `data-testid="problem-item"` to motion.div and update the test selector. This is the clean approach.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HERO-01 | Stats row absent from rendered output | unit | `npm test -- --run --reporter=verbose section-hero` | ✅ `section-hero.test.tsx` |
| HERO-02 | CTA wrapper lacks `sm:flex-row` class | unit | `npm test -- --run --reporter=verbose section-hero` | ✅ (needs new assertion) |
| HERO-03 | Poor tier bg is `#ef4444` not `#6b7280` | unit | `npm test -- --run --reporter=verbose section-hero` | ✅ (needs new assertion) |
| PROB-01 | No decorative bg number span in output | unit | `npm test -- --run --reporter=verbose section-problem` | ✅ `section-problem.test.tsx` |
| PROB-02 | ProblemItem receives x animate prop | unit | `npm test -- --run --reporter=verbose section-problem` | ✅ (needs new assertion) |
| PROB-03 | Card has background color (not just border-b) | unit | `npm test -- --run --reporter=verbose section-problem` | ✅ (needs new assertion) |
| SOLN-01 | Browser demo wrapper has max-w-3xl class | unit | `npm test -- --run --reporter=verbose section-solution` | ✅ `section-solution.test.tsx` |
| SOLN-02 | Step cards have enlarged padding | unit | `npm test -- --run --reporter=verbose section-solution` | ✅ (needs new assertion) |
| SOLN-03 | AnimatedScore renders green color for score >= 80 | unit | `npm test -- --run --reporter=verbose section-solution` | ✅ (needs new assertion) |
| SOLN-04 | SceneAnalysis score badge not static teal | unit | `npm test -- --run --reporter=verbose section-solution` | ✅ (needs new assertion) |
| CTA-01 | h2 font-size style includes `clamp(2.5rem` | unit | `npm test -- --run --reporter=verbose section-cta` | ✅ `section-cta.test.tsx` |
| CTA-02 | CTA headline element has spring transition | unit | `npm test -- --run --reporter=verbose section-cta` | ✅ (needs new assertion) |
| CTA-03 | Button has glow boxShadow; glow div uses 80% ellipse | unit | `npm test -- --run --reporter=verbose section-cta` | ✅ (needs new assertion) |

### Sampling Rate

- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

The following test assertions need to be added to existing test files (files exist, new `it()` blocks needed):

- [ ] `section-hero.test.tsx` — assert stats row absent (HERO-01), CTA flex direction (HERO-02), poor color is `#ef4444` (HERO-03)
- [ ] `section-problem.test.tsx` — assert no aria-hidden span with `0.03` opacity (PROB-01), card background present (PROB-03); update `.py-12` selector to `data-testid="problem-item"` after PROB-03 changes padding class
- [ ] `section-solution.test.tsx` — assert `max-w-3xl` class (SOLN-01), green score color for ≥80 (SOLN-03)
- [ ] `section-cta.test.tsx` — assert `clamp(2.5rem` in h2 style (CTA-01), button has `boxShadow` (CTA-03)

## Sources

### Primary (HIGH confidence)

- Direct file read: `web/src/components/landing/SectionHero.tsx` — current TIER_COLORS, chip data, CTA structure, stats row location
- Direct file read: `web/src/components/landing/SectionProblem.tsx` — current ProblemItem animate pattern, decorative span location
- Direct file read: `web/src/components/landing/SectionSolution.tsx` — AnimatedScore binary logic, browser demo max-w, step card sizing
- Direct file read: `web/src/components/landing/SectionCTA.tsx` — current headline font-size, existing animation, glow definition
- Direct file read: `web/src/lib/motion.ts` — spring tokens, ease tokens, slideInLeftVariants
- Direct file read: `extension/src/types/scoring.ts` — canonical TIER_COLORS with poor: #6b7280
- Direct file read: `web/src/__tests__/section-hero.test.tsx` — test assertions that must remain passing
- Direct file read: `web/src/__tests__/section-problem.test.tsx` — `.py-12` selector risk
- Direct file read: `web/src/__tests__/section-solution.test.tsx` — current test coverage
- Direct file read: `web/src/__tests__/section-cta.test.tsx` — current test coverage
- Direct file read: `web/vitest.config.mts` — test environment jsdom, include glob, @ alias

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — confirms `once: false` on useInView, `useInView` not `whileInView` pattern, TIER_COLORS local definition convention
- `.planning/REQUIREMENTS.md` — exact requirement text and acceptance criteria
- `.planning/ROADMAP.md` — plan structure: 22-01, 22-02, 22-03

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used; versions confirmed from package.json
- Architecture: HIGH — all patterns read directly from existing source files
- Pitfalls: HIGH — identified from actual test file selectors and current code logic
- Test gaps: HIGH — test files read directly; missing assertions identified by diff against requirements

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable codebase; no external API changes)
