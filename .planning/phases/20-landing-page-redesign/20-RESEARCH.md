# Phase 20: Landing Page Redesign — Research

**Researched:** 2026-03-27
**Domain:** motion/react whileInView, SVG pathLength animation, SaaS landing page structure, Next.js App Router
**Confidence:** HIGH — codebase read directly; motion/react verified against official docs; all patterns cross-referenced.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual aesthetic**
- Clean SaaS — references: Linear, Vercel, Framer. NOT Apple-minimalist.
- Animations must be complete, polished, and authentic-feeling — not cinematic experiments
- Professional and effective copy; not sparse, not overwrought
- 21dev components welcome where they fit
- Teal accent retained, existing design token system reused

**Section structure (5 sections, in order)**
1. **Hero** — HomeMatch logo, problem/outcome headline, single CTA
2. **Globe** — SVG globe animating in, zooming/panning to pin Switzerland
3. **Problem** — Pain points with neat scroll-triggered animations
4. **Solution / Demo** — 3 sequential steps that animate in as you scroll
   - Step 1: Tell us what you need (AI chat or manual preferences)
   - Step 2: We search Flatfox and match a score
   - Step 3: Full analysis so you find the right home
5. **CTA** — Final call to action

**Animation model**
- Scroll-triggered entry — sections scroll normally; elements animate in as they enter the viewport
- No sticky-parallax chapters — that's what broke last time
- `whileInView` from `motion/react` is the primary pattern
- Smooth and simple quality — polished, not cinematic
- Globe section: draws in and pins Switzerland (not complex 3D spin)
- Solution section: 3 steps sequence in one by one as user scrolls

**Hero section**
- Layout: centered, full-height or near-full-height
- Logo mark + headline + optional subline + single primary CTA button
- Headline angle: problem + outcome combined
  - Model: "Thousands of listings. One perfect match."
  - States the scale of the problem, then delivers the outcome
- CTA: "Get Started" → `/auth`
- No secondary CTA, no background animation on hero

**Copy approach**
- Bilingual EN/DE remains required (use existing translations system)

### Claude's Discretion
- Exact headline and body copy (follow problem/outcome angle, finalize later)
- Problem section animation specifics (what animates, timing, sequencing)
- Solution step UI mockup style (icon + text, card, screenshot snippet — planner decides)
- Footer and navbar — reuse existing `LandingNavbar` and `LandingFooter`
- Whether to keep or delete existing Chapter components (planner can delete or gut them)

### Deferred Ideas (OUT OF SCOPE)
- Final production copy / copywriting — later milestone
- Social proof / testimonials — deferred per PROJECT.md
- Mobile-specific layout optimisation — Phase 22 (Polish & QA)
</user_constraints>

---

## Summary

The existing landing page uses a 7-chapter sticky-parallax approach with `useScroll` + `useTransform` on height-multiplied containers (`h-[300vh]`, `h-[350vh]`, `h-[400vh]`). This approach is being replaced entirely with a simpler, more reliable 5-section scroll-triggered entry model. The core difference: sections occupy their natural height, elements animate in with `whileInView`, and nothing requires sticky containers or scroll-progress tracking.

The project already has `motion/react` v12.38.0 installed (the rebranded Framer Motion package), a rich motion token library at `web/src/lib/motion.ts`, and two reusable motion primitives (`FadeIn`, `StaggerGroup`/`StaggerItem`) that implement exactly the pattern this redesign needs. The translation system (`_DeHasAllEnKeys` compile guard), design tokens, navbar (`LandingNavbar`), and footer (`LandingFooter`) are all reusable as-is.

The Globe section needs the most careful approach: instead of scroll-driven scale/pan, it uses `whileInView` to trigger a `pathLength: 0 → 1` draw-in animation on SVG strokes, plus a fill/color transition on the Switzerland polygon. This is cleaner, more reliable, and directly supported by `motion/react`'s SVG animation primitives.

One important discovery: `landing-translations.test.ts` already defines the expected translation key set for the new design (different from the old Chapter keys), which means a prior planning pass already defined what the translation keys should be. The plan must align with this test file.

**Primary recommendation:** Replace all Chapter components with 5 new Section components. Consume the existing `FadeIn` and `StaggerGroup` primitives — don't rebuild them. Globe is the only section requiring custom animation logic, using `pathLength` draw-in.

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion/react` | 12.38.0 | All animations — `whileInView`, `motion.*`, variants | Already in project; is the current name of Framer Motion |
| `next` | 16.1.6 | App Router, Server/Client Components | Project framework |
| `react` | 19.2.3 | UI rendering | Project runtime |
| `tailwindcss` | 4.x | Utility CSS | Project styling system |
| `@base-ui/react` | 1.2.0 | Button primitive (via project `Button` component) | Established in Phase 19 |
| `lucide-react` | 0.577.0 | Icons for solution steps | Already installed |

### Already-Available Motion Primitives (reuse, do not recreate)

| Component | Import Path | What It Does |
|-----------|------------|-------------|
| `FadeIn` | `@/components/motion/FadeIn` | `whileInView="visible"`, `viewport={{ once: true, amount: 0.2 }}`, reduced-motion aware |
| `StaggerGroup` | `@/components/motion/StaggerGroup` | Container with `staggerChildren: 0.08`, `delayChildren: 0.1` |
| `StaggerItem` | `@/components/motion/StaggerGroup` | Item that inherits stagger variant from parent |
| `CountUp` | `@/components/motion/CountUp` | Number counting animation (available if needed for stats) |

### Already-Available UI Components

| Component | Import Path | Relevance to Landing |
|-----------|------------|---------------------|
| `ShimmerButton` | `@/components/ui/shimmer-button` | Primary CTA — 21st.dev component already in project |
| `Button` | `@/components/ui/button` | Use `render={<Link href="..." />}` for routing |
| `Badge` | `@/components/ui/badge` | Step number labels |
| `Card` | `@/components/ui/card` | Solution step cards if card-style layout is chosen |

### No Installation Step Required

All required libraries are present in `web/package.json`. No `npm install` needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
web/src/components/landing/
├── LandingPageContent.tsx   # REWRITE — orchestrates 5 new sections
├── LandingNavbar.tsx        # KEEP AS-IS (already works)
├── LandingFooter.tsx        # KEEP AS-IS (already works)
├── SectionHero.tsx          # NEW
├── SectionGlobe.tsx         # NEW
├── SectionProblem.tsx       # NEW
├── SectionSolution.tsx      # NEW
├── SectionCTA.tsx           # NEW
│
│   ── DELETE after new sections are complete:
├── ChapterHook.tsx
├── ChapterSwitzerland.tsx
├── ChapterProblem.tsx
├── ChapterMechanism.tsx
├── ChapterScore.tsx
├── ChapterDream.tsx
├── ChapterCTA.tsx
└── IsometricHome.tsx
```

### Pattern 1: Standard Scroll-Triggered Entry (whileInView)

**What:** Elements start invisible/offset, animate to visible as they enter the viewport. Fire once only.

**When to use:** All sections and sub-elements: headings, body copy, cards, icons, step rows.

```typescript
// Source: motion.dev/docs/react-motion-component (verified) + existing FadeIn.tsx
import { motion, useReducedMotion } from "motion/react"
import { fadeUpVariants, duration, ease } from "@/lib/motion"

// Simplest approach — use the existing FadeIn primitive:
import { FadeIn } from "@/components/motion/FadeIn"

<FadeIn delay={0.1}>
  <h2>Section headline</h2>
</FadeIn>

// Direct motion.div if you need more control:
const prefersReduced = useReducedMotion()

<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.2 }}
  variants={prefersReduced ? {} : fadeUpVariants}
>
  content
</motion.div>
```

`viewport.amount: 0.2` means 20% of the element must enter the viewport before the animation fires. This is the safe project default.

### Pattern 2: Stagger Group (Sequential List / Step Reveal)

**What:** Parent container orchestrates children with a delay between each.

**When to use:** Problem bullet points, Solution 3-step sequence, feature lists.

```typescript
// Source: existing StaggerGroup.tsx + @/lib/motion staggerContainerVariants (verified)
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup"

<StaggerGroup>
  <StaggerItem>
    <StepCard number={1} label="Tell us what you need" />
  </StaggerItem>
  <StaggerItem>
    <StepCard number={2} label="We search and score" />
  </StaggerItem>
  <StaggerItem>
    <StepCard number={3} label="See the full analysis" />
  </StaggerItem>
</StaggerGroup>
```

`staggerChildren: 0.08` is the default (fast cascade). For Solution steps where deliberate pacing feels better, pass a custom `variants` prop or wrap in a `motion.div` with `staggerChildren: 0.2`.

### Pattern 3: SVG Globe Draw-In + Switzerland Pin

**What:** Globe SVG draws in via `pathLength: 0 → 1` on stroke elements. Switzerland polygon highlights via fill color transition. All triggered by `whileInView` — no sticky scroll, no `useTransform`.

**Why this approach:** `motion/react` natively supports `pathLength` (0–1 progress) on `path`, `circle`, `ellipse`, `polygon`, `line`, and `rect` elements. Source: `motion.dev/docs/react-svg-animation` (verified). This eliminates all the fragile scroll-math from the old `ChapterSwitzerland`.

```typescript
// Source: motion.dev/docs/react-svg-animation (verified)
import { motion, useReducedMotion } from "motion/react"
import { ease } from "@/lib/motion"

function SectionGlobe({ lang }: { lang: Language }) {
  const prefersReduced = useReducedMotion()

  const drawVariant = prefersReduced ? {} : {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1,
      transition: { duration: 1.4, ease: ease.enter }
    },
  }

  const switzerlandVariant = prefersReduced ? {} : {
    hidden: { fill: "hsl(220 15% 25%)", opacity: 0.5 },
    visible: { fill: "hsl(173 65% 52%)", opacity: 1,
      transition: { delay: 1.6, duration: 0.6 }
    },
  }

  const glowRingVariant = prefersReduced ? {} : {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1,
      transition: { delay: 1.6, duration: 0.6, ease: ease.enter }
    },
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-hero-bg py-24 px-6">
      <motion.svg
        viewBox="0 0 200 200"
        width="320" height="320"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        aria-label="Globe showing Switzerland"
        role="img"
      >
        {/* Ocean fill — no pathLength needed, just fade in */}
        <motion.circle cx="100" cy="100" r="90"
          fill="hsl(220 30% 8%)"
          variants={prefersReduced ? {} : {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.4 } }
          }}
        />

        {/* Outer globe circle — draws in */}
        <motion.circle cx="100" cy="100" r="90"
          fill="none"
          stroke="hsl(220 20% 22%)"
          strokeWidth="1"
          variants={drawVariant}
        />

        {/* Latitude lines */}
        <motion.ellipse cx="100" cy="55" rx="78" ry="10"
          fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"
          variants={{ ...drawVariant,
            visible: { ...drawVariant.visible,
              transition: { delay: 0.3, duration: 1.0, ease: ease.enter }
            }
          }}
        />

        {/* Europe silhouette — fade in */}
        <motion.path
          d="M 80 40 L 95 38 L 108 42 L 115 50 L 120 60 L 122 70 L 118 75 L 125 80 L 128 88 L 122 95 L 118 100 L 115 108 L 108 112 L 100 118 L 90 115 L 82 110 L 75 102 L 70 95 L 68 88 L 72 80 L 68 72 L 65 65 L 70 55 L 75 48 Z"
          fill="hsl(220 15% 22%)"
          stroke="hsl(220 15% 30%)" strokeWidth="0.5"
          variants={prefersReduced ? {} : {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 0.8, duration: 0.6 } }
          }}
        />

        {/* Switzerland polygon — transitions to teal */}
        <motion.polygon
          points="112,82 118,80 121,83 120,88 115,90 110,88 109,84"
          variants={switzerlandVariant}
        />

        {/* Teal glow ring around Switzerland */}
        <motion.circle cx="115" cy="85" r="10"
          fill="none" stroke="hsl(173 65% 52%)" strokeWidth="1.5"
          variants={glowRingVariant}
        />
      </motion.svg>

      {/* Text fades in after globe animation */}
      <FadeIn delay={2.0} className="text-center mt-10 max-w-md">
        <p className="text-hero-fg font-semibold" style={{ fontSize: 'var(--text-subheading-size)' }}>
          {t(lang, 'landing_globe_headline')}
        </p>
      </FadeIn>
    </section>
  )
}
```

**Key constraint on pathLength:** `pathLength` only affects the stroke. For the Switzerland polygon (which is filled, not stroked), use a fill/opacity transition — NOT `pathLength`. The glow ring circle has a stroke and works with `pathLength`.

### Pattern 4: Hero — Mount-Time Animation (NOT whileInView)

**What:** Hero content animates on page load, not on scroll.

**Why:** The hero is visible immediately; `whileInView` is unreliable for above-the-fold elements because IntersectionObserver may fire before hydration. The existing `ChapterHook.tsx` uses `animate` (not `whileInView`) — this is correct and must be replicated.

```typescript
// Source: existing ChapterHook.tsx (verified working)
import { motion, useReducedMotion } from "motion/react"
import { duration, ease } from "@/lib/motion"

const prefersReduced = useReducedMotion()

// Logo — first element in
<motion.div
  initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReduced ? { duration: 0 } : { delay: 0.1, duration: duration.slow, ease: ease.enter }}
>
  <Logo />
</motion.div>

// Headline — 200ms after logo
<motion.h1
  initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReduced ? { duration: 0 } : { delay: 0.3, duration: duration.slow, ease: ease.enter }}
>
  {t(lang, 'landing_hero_headline')}
</motion.h1>

// Subline — 400ms
// CTA button — 600ms
```

### Pattern 5: LandingPageContent Rewrite

```typescript
// New LandingPageContent.tsx
'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/translations'
import { LandingNavbar } from './LandingNavbar'
import { LandingFooter } from './LandingFooter'
import { SectionHero } from './SectionHero'
import { SectionGlobe } from './SectionGlobe'
import { SectionProblem } from './SectionProblem'
import { SectionSolution } from './SectionSolution'
import { SectionCTA } from './SectionCTA'

export function LandingPageContent() {
  const { language } = useLanguage()
  const lang = language as Language
  return (
    <div className="bg-hero-bg">
      <LandingNavbar lang={lang} />
      <SectionHero lang={lang} />
      <SectionGlobe lang={lang} />
      <SectionProblem lang={lang} />
      <SectionSolution lang={lang} />
      <SectionCTA lang={lang} />
      <LandingFooter lang={lang} />
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Sticky-parallax containers (`h-[300vh]` + `sticky top-0`):** The previous broken approach. All new sections use natural/intrinsic height.
- **`useScroll` + `useTransform` for entry animations:** Overkill and fragile. Reserve `useScroll` for continuous effects (like the navbar backdrop — which is fine). `whileInView` handles scroll-triggered entry cleanly.
- **`initial` without `whileInView` or `animate`:** Setting `initial` with no trigger means the element starts hidden and stays hidden. Always pair `initial="hidden"` with either `whileInView="visible"` (scroll) or `animate={{ ... }}` (mount).
- **`'use client'` on `app/page.tsx`:** Never. The server component renders `<LandingPageContent />` which is the client boundary.
- **Skipping `useReducedMotion`:** Every animated component must check and use `prefersReduced` — project-wide requirement.
- **`pathLength` on filled polygon without stroke:** pathLength only affects strokes. The Switzerland polygon uses fill color transitions.
- **`staggerChildren` on non-variant children:** `StaggerGroup` only staggers children that use `variants`. Always wrap content in `StaggerItem`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-triggered fade-in | Custom IntersectionObserver hook | `FadeIn` (`@/components/motion/FadeIn`) | Already implemented, reduced-motion aware |
| Sequential stagger | Manual `delay: index * n` arithmetic | `StaggerGroup` + `StaggerItem` | Already in `@/components/motion/StaggerGroup` |
| SVG draw-in | CSS keyframe + `getTotalLength()` | `motion.path pathLength: 0 → 1` | motion normalizes pathLength; no manual measurement |
| Reduced motion detection | CSS media query hook | `useReducedMotion()` from `motion/react` | Built-in, SSR-safe |
| Shimmer CTA button | Custom gradient-border button | `ShimmerButton` (`@/components/ui/shimmer-button`) | 21st.dev component already in project |
| Link-as-button | `asChild` or wrapper div | `Button render={<Link href="..." />}` | Established pattern (Phase 19), base-ui native |
| Animation constants | Inline cubic-bezier strings | `ease.enter`, `duration.slow` from `@/lib/motion` | Single source of truth |

**Key insight:** The project already has a complete, working animation infrastructure. New section components are consumers of existing primitives, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: IntersectionObserver Not Mocked in Tests

**What goes wrong:** `whileInView` uses `IntersectionObserver` internally. jsdom (vitest's environment) doesn't implement it. Tests throw "IntersectionObserver is not defined".

**How to avoid:**

```typescript
// Already established in fade-in.test.tsx and landing-page.test.tsx
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})
```

Every new test file that renders a component using `whileInView` needs this block.

**Warning signs:** `ReferenceError: IntersectionObserver is not defined` in vitest output.

### Pitfall 2: Translation Key Drift

**What goes wrong:** New section components reference keys like `landing_hero_headline` that don't yet exist in `translations.ts`. TypeScript's `_DeHasAllEnKeys` guard only validates `en`/`de` symmetry — it does NOT catch references to non-existent keys.

**How to avoid:** Add all new keys to `translations.ts` (both `en` and `de`) in the SAME task that creates the section using them. Remove old chapter keys only after all chapter components are deleted.

**Additional gotcha:** If you remove a key from `en` but leave it in `de` (or vice versa), the TypeScript compile guard fails at build time. Remove from both simultaneously.

**Warning signs:** Blank text on live page; `landing-translations.test.ts` failures.

### Pitfall 3: `viewport.amount` Too High on Tall Sections

**What goes wrong:** `viewport={{ once: true, amount: 0.5 }}` on a section taller than the viewport means the animation never fires — 50% can never enter if the section is 1.5x the viewport height.

**How to avoid:** Use `amount: 0.1` to `0.2` for section-level triggers. `amount: 0.3` is fine for compact elements like the globe. The existing `FadeIn` uses `0.2` as its default — a safe choice for all sections.

**Warning signs:** Animations never fire on mobile; works on desktop but not smaller viewports.

### Pitfall 4: `pathLength` on Filled Polygons

**What goes wrong:** Animating `pathLength` on `<motion.polygon>` with `fill` but no `stroke` produces no visible effect. `pathLength` manipulates stroke-dasharray/dashoffset — if there's no stroke, nothing draws.

**How to avoid:** Switzerland polygon uses fill/opacity color transition (not `pathLength`). The globe outer circle and glow ring have strokes and work with `pathLength`. See Pattern 3 above.

**Warning signs:** Switzerland highlight does nothing during animation; no draw-in visible on the polygon.

### Pitfall 5: Hero Uses `whileInView` Instead of `animate`

**What goes wrong:** Using `whileInView` for above-the-fold hero content can cause the animation to be missed if the IntersectionObserver fires before React hydration, or results in the element being invisible on load until scroll.

**How to avoid:** Hero section uses `animate={{ opacity: 1, y: 0 }}` (mount-time), not `whileInView`. The existing `ChapterHook.tsx` demonstrates the correct pattern.

**Warning signs:** Hero text flashes invisible on first load, or sits invisible until user scrolls down even slightly.

### Pitfall 6: Stagger Container Without Variant Children

**What goes wrong:** `StaggerGroup` stagger orchestration only applies to children that also use `variants`. If a child uses direct `animate` props, it won't participate in the stagger timing.

**How to avoid:** Always use `StaggerItem` inside `StaggerGroup`. The `StaggerItem` applies `staggerItemVariants` which propagates correctly through motion's variant tree.

---

## Code Examples

### Translation Keys for New 5-Section Structure

The file `web/src/__tests__/landing-translations.test.ts` already defines exactly which keys are expected (this is authoritative for the plan). The plan must add all of these to `translations.ts` (both `en` and `de`), and remove old chapter keys:

**Keys to ADD (from landing-translations.test.ts):**
```
landing_hero_overline
landing_hero_headline
landing_hero_subtitle
landing_hero_cta
landing_problem_overline        (exists — keep or update value)
landing_problem_headline        (exists — keep or update value)
landing_problem_bullet1         (NEW — replaces landing_problem_pain1)
landing_problem_bullet2         (NEW)
landing_problem_bullet3         (NEW)
landing_howit_overline
landing_howit_headline
landing_howit_step1_label
landing_howit_step1_body
landing_howit_step2_label
landing_howit_step2_body
landing_howit_step3_label
landing_howit_step3_body
landing_features_overline
landing_features_headline
landing_feat1_title, landing_feat1_body
landing_feat2_title, landing_feat2_body
landing_feat3_title, landing_feat3_body
landing_cta_overline            (NEW — test expects this)
landing_cta_headline            (exists)
landing_cta_subtext             (NEW)
landing_cta_button              (exists)
landing_footer_copyright        (exists)
```

**Keys to REMOVE (old chapter keys no longer referenced):**
```
landing_hook_phrase1, landing_hook_phrase2
landing_ch_line1, landing_ch_line2
landing_problem_pain1, landing_problem_pain2, landing_problem_pain3
landing_mech_overline, landing_mech_headline
landing_score_label
landing_dream_line1, landing_dream_line2, landing_dream_line3
landing_cta_signin, landing_cta_signin_link   (check if still used before removing)
```

Note: `landing_nav_signin` is used by `LandingNavbar` — keep it.

### Easing — Always Use Tokens

```typescript
// Source: web/src/lib/motion.ts (verified — never inline these)
import { ease, duration } from "@/lib/motion"

transition={{ duration: duration.slow, ease: ease.enter }}
// NOT: transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
```

Available tokens: `duration.instant/fast/base/moderate/slow/crawl`, `ease.enter/exit/inOut/expressive/linear`, `spring.snappy/gentle/bouncy/stiff`, `fadeUpVariants`, `fadeInVariants`, `slideInLeftVariants`, `slideInRightVariants`, `staggerContainerVariants`, `staggerItemVariants`.

### Button with Link (Established Pattern)

```typescript
// Source: ChapterCTA.tsx + LandingNavbar.tsx (verified)
import Link from "next/link"
import { Button } from "@/components/ui/button"

<Button
  render={<Link href="/auth" />}
  size="lg"
  className="bg-hero-teal text-hero-bg hover:opacity-90 px-8 py-3 text-base font-semibold rounded-xl h-auto"
>
  {t(lang, 'landing_hero_cta')}
</Button>
```

### Reduced Motion — Both Variant and Direct Patterns

```typescript
// Variant-based (preferred with FadeIn / StaggerGroup):
variants={prefersReduced ? {} : fadeUpVariants}

// Direct props (when not using variants):
initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
animate={{ opacity: 1, y: 0 }}
transition={prefersReduced ? { duration: 0 } : { duration: duration.moderate, ease: ease.enter }}
```

---

## State of the Art

| Old Approach (Phase 20 v1) | New Approach | Impact |
|---------------------------|--------------|--------|
| `h-[300vh]`/`h-[350vh]`/`h-[400vh]` sticky containers | Natural `min-h-screen` sections | No scroll-jank, no height miscalculations |
| `useScroll` + `useTransform` for every element | `whileInView` + `viewport={{ once: true }}` | Simpler, more reliable, better perf |
| 7 Chapter components | 5 Section components | Cleaner narrative, fewer files |
| Globe zoom via CSS scale 1→5 with pan | `pathLength` draw-in + fill color transition | Actually works without scroll-math fragility |
| Separate chapters for mechanism/score/dream | Single `SectionSolution` with 3-step stagger | Unified narrative, single component |
| `IsometricHome` SVG (complex, fragile) | Simpler inline SVG or icon-based steps | Less maintenance surface |

**Deprecated in this redesign:**
- All Chapter components (`ChapterHook` through `ChapterCTA`) — deleted
- `IsometricHome.tsx` — deleted
- Old chapter translation keys — removed from `translations.ts`

---

## Open Questions

1. **Features section vs Solution section**
   - What we know: `landing-translations.test.ts` defines both `landing_howit_*` (3 steps) AND `landing_features_*` (3 features with titles/bodies) as separate key groups
   - What's unclear: Are these two separate sections, or do features collapse into step bodies?
   - Recommendation: Treat as two sections — `SectionSolution` (3 steps with `howit` keys) + a brief `SectionFeatures` (3-column feature grid with `feat` keys). CTA is section 5. This maps to 6 content blocks total but still reads as "5 sections" if features are visually light (a row of cards below solution steps).

2. **Globe section translation keys**
   - What we know: `landing-translations.test.ts` does NOT include globe-specific keys
   - Recommendation: Planner adds `landing_globe_headline` and `landing_globe_body` to translations and the test

3. **Hero background treatment**
   - Locked decision: no background animation on hero
   - Recommendation: Use existing `bg-hero-bg` (`hsl(0 0% 4%)`) — unchanged from current implementation. A subtle radial gradient overlay is acceptable if static.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `web/vitest.config.ts` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run 2>&1 | tail -30` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| LP-01 | Landing page renders without auth | unit | `npm test -- --run landing-page` | ✅ `landing-page.test.tsx` |
| LP-03 | Problem/Solution sections with EN/DE copy | unit | `npm test -- --run landing-translations` | ✅ `landing-translations.test.ts` |
| LP-05 | Primary CTA button present and links to /auth | unit | extend `landing-page.test.tsx` | ✅ extend existing |
| LP-06 | Sign In link in navbar | unit | `npm test -- --run landing-page` | ✅ already tested |
| DS-02 | Dark hero background applied | smoke | visual review | manual |
| LP-08 | No layout shift from animations | manual | Lighthouse / visual check | manual |

### Sampling Rate
- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run 2>&1 | tail -20`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

The `landing-translations.test.ts` currently **fails** because it references new translation keys (`landing_hero_overline`, `landing_howit_step1_label`, etc.) that do not yet exist in `translations.ts`. This must be fixed in the first task of the plan.

- [ ] `web/src/lib/translations.ts` — add all new `landing_hero_*`, `landing_howit_*`, `landing_features_*`, `landing_cta_overline`, `landing_cta_subtext` keys in both `en` and `de`; remove old chapter keys
- [ ] `web/src/__tests__/landing-page.test.tsx` — update to import new `SectionHero`, `LandingPageContent` once Chapter components are deleted (test currently imports `LandingPageContent` which imports Chapter files — will break when those are deleted)

---

## Sources

### Primary (HIGH confidence)
- `motion.dev/docs/react-motion-component` — `whileInView`, `viewport` options, props API (fetched directly 2026-03-27)
- `motion.dev/docs/react-svg-animation` — `pathLength`, `pathOffset`, SVG element support, viewBox animation (fetched directly 2026-03-27)
- `motion.dev/docs/react-use-in-view` — `useInView` hook, `once`, `amount`, `margin` options (fetched directly 2026-03-27)
- Codebase read directly: `web/src/lib/motion.ts`, `FadeIn.tsx`, `StaggerGroup.tsx`, `ChapterHook.tsx`, `ChapterSwitzerland.tsx`, `ChapterProblem.tsx`, `ChapterMechanism.tsx`, `ChapterCTA.tsx`, `LandingNavbar.tsx`, `LandingPageContent.tsx`, `shimmer-button.tsx`, `button.tsx`
- `web/src/lib/translations.ts` — full key set read directly
- `web/src/__tests__/landing-translations.test.ts` — expected new key set (read directly)
- `web/package.json` — all version numbers verified

### Secondary (MEDIUM confidence)
- WebSearch results confirming `whileInView` + `viewport.once` are current motion/react API (2025 sources)
- `css-tricks.com/svg-line-animation-works` — stroke-dasharray technique background (stable reference)

### Tertiary (LOW confidence)
- 21st.dev search results — `ShimmerButton` confirmed in project; other 21st.dev landing components browsed via search but not individually fetched

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from `package.json` directly
- Animation patterns (whileInView, stagger): HIGH — verified from motion.dev official docs + existing working code
- Globe SVG animation (pathLength): HIGH — `pathLength` approach verified from `motion.dev/docs/react-svg-animation`
- Translation key set: HIGH — read directly from test and translations files
- Architecture: HIGH — based on direct codebase analysis + locked decisions from CONTEXT.md
- Pitfalls: HIGH — derived from existing code patterns, official docs, and known jsdom limitations

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (motion/react API is stable; translation keys are codebase-specific — valid indefinitely)
