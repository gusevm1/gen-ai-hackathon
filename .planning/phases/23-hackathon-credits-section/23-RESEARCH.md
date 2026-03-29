# Phase 23: Hackathon Credits Section - Research

**Researched:** 2026-03-29
**Domain:** Next.js 16 / React 19 / Framer Motion v12 — static visual section + photo backgrounds + SVG logo placement
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- ETH Zurich: Source official white SVG logo, place in `/public` (researcher found direct URL)
- GenAI Zurich Hackathon badge: Recreate in code as a styled component — green + black badge style, "GenAI Zürich Hackathon 2026"
- White-only variant (landing is dark-only; auth page also dark)
- Label text: "A project from" (English only)
- Layout: ETH logo | vertical divider | Hackathon badge — side by side, centered
- Photo placed as `position: absolute, inset-0` behind hero content
- Hero photo opacity ~25%, dark overlay on top for contrast
- Scroll-linked opacity on hero photo: fades out as user scrolls (Framer Motion `useScroll` + `useTransform`)
- Credits section: photo fills full width/height, logos overlaid center/bottom, dark gradient overlay
- Auth page: photo replaces `bg-background`, fills full screen, login card floats over it, "A project from" + logos at bottom
- Single photo file: `/public/zurich-bg.jpg` (or `.webp` for performance)
- Year on hackathon badge: **2026** (not 2025)
- `SectionCredits` slots between `<SectionCTA>` and `<LandingFooter>` in `LandingPageContent`

### Claude's Discretion

- Photo source: researcher to identify/confirm a suitable aerial Zurich dusk/sunset shot
- ETH Zurich SVG: researcher to confirm download URL

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within expanded Phase 23 scope
- Other auth UI changes, dashboard updates, mobile QA out of scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRED-01 | New section added above footer — "Built at" + ETH Zurich logo + Gen-AI Hackathon logo | `SectionCredits` component pattern documented; photo-background + logo overlay pattern confirmed via SectionCTA radial glow pattern |
| CRED-02 | Credits section is minimal, elegant — does not distract from primary CTA above it | Short section height, muted overlay approach, simple fade-in animation recommended |
</phase_requirements>

---

## Summary

Phase 23 adds brand identity visuals connecting HomeMatch to its ETH Zurich and Gen-AI Hackathon origins. It touches three surfaces: the hero section (dimmed background photo with scroll-fade), a new `SectionCredits` component (photo background with logo overlay), and the auth page (full-screen photo with floating card).

All required patterns (`useScroll`, `useTransform`, `useInView`, absolute-positioned layers) are already established in the codebase. `LandingNavbar.tsx` already uses `useScroll` + `useTransform` for its scroll-linked background — the same pattern applies directly to the hero photo opacity. No new libraries are needed.

The only external assets to acquire are: the ETH Zurich white SVG logo (free from Wikimedia Commons, confirmed URL below) and a Zurich aerial dusk photo (Unsplash free license recommended). The GenAI Zurich Hackathon badge is recreated in code — its brand green is `rgb(80, 231, 95)` on a black background.

**Primary recommendation:** Build all three surfaces in sequence — hero photo layer first (scroll-fade established), then SectionCredits (new component), then auth page (layout wrapper change + credits strip). No new dependencies required.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | ^12.38.0 | `useScroll`, `useTransform`, `useInView`, `motion.div` | Already in codebase; all scroll/animation patterns use it |
| Next.js | 16.1.6 | `next/image` for optimized photo loading | Project framework |
| Tailwind CSS | ^4 | Layout utilities | Project standard |
| React | 19.2.3 | Component model | Project framework |

### New External Assets (not npm packages)

| Asset | Source | License | Notes |
|-------|--------|---------|-------|
| ETH Zurich white SVG | Wikimedia Commons | Public domain (institutional wordmark) | Direct download URL confirmed |
| Zurich aerial photo | Unsplash (free license) | Free for commercial use, no attribution required | Dusk/sunset aerial preferred |

**No new npm packages required.**

---

## Architecture Patterns

### Recommended File Structure

```
web/
├── public/
│   ├── eth-zurich-white.svg      # ETH Zurich wordmark (white)
│   └── zurich-bg.jpg             # Aerial dusk cityscape (or .webp)
└── src/
    └── components/
        └── landing/
            ├── SectionCredits.tsx    # NEW — credits section component
            ├── SectionHero.tsx       # MODIFY — add photo layer + scroll-fade
            ├── LandingPageContent.tsx # MODIFY — insert <SectionCredits>
            └── (all other sections unchanged)
    └── app/
        └── auth/
            └── page.tsx              # MODIFY — photo background + credits strip
```

### Pattern 1: Scroll-linked opacity for hero photo

**What:** `useScroll()` returns `scrollY` MotionValue; `useTransform()` maps scroll range to opacity range.
**When to use:** When a decorative background element should fade as user scrolls away from top.
**Example (already used in LandingNavbar.tsx):**
```typescript
// Source: /web/src/components/landing/LandingNavbar.tsx (line 14-15)
const { scrollY } = useScroll()
const bgOpacity = useTransform(scrollY, [0, 80], [0, 1])
```

For the hero photo (inverse: starts visible, fades out):
```typescript
// Source: Same pattern, inverted range
const { scrollY } = useScroll()
const photoOpacity = useTransform(scrollY, [0, 400], [0.25, 0])
// Apply via: <motion.div style={{ opacity: photoOpacity, ... }} />
```

**IMPORTANT:** `useScroll()` requires a 'use client' component and relies on window scroll — already the case for SectionHero (it's already a client component).

### Pattern 2: Absolute-positioned photo layer

**What:** `position: absolute, inset: 0` layer inside a `position: relative` parent section.
**When to use:** Decorative background that doesn't affect layout flow.
**Already used:** SectionCTA's radial glow div uses identical pattern.
```typescript
// Established pattern from SectionCTA.tsx (line 22-28)
<div
  aria-hidden
  className="absolute inset-0 pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse 80% 60% at 50% 50%, ...)',
  }}
/>
// For photo: same div, but use next/image or a CSS background-image
```

Photo layer stacking order inside SectionHero (z-index plan):
- `z-0`: Dot grid (existing)
- `z-0`: Photo layer (NEW, behind glow)
- `z-0`: Teal glow (existing, on top of photo)
- `z-0`: Floating orbs (existing)
- `z-10`: Floating chips (existing)
- `z-20`: Main content (existing)

### Pattern 3: useInView fade-in for SectionCredits

**What:** Section fades in when scrolled into view.
**When to use:** Any section that should animate on scroll entry.
**Already used:** SectionProblem, SectionCTA use this exact pattern.
```typescript
// Pattern from SectionProblem.tsx + SectionCTA.tsx
const ref = useRef<HTMLDivElement>(null)
const isInView = useInView(ref, { once: false, amount: 0.3 })

<motion.div
  ref={ref}
  animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
>
```

### Pattern 4: GenAI Zurich Hackathon Badge (in-code)

**What:** Small pill/badge styled component. No image needed — pure CSS.
**Brand colors confirmed from genaizurich.ch CSS:**
- Green: `rgb(80, 231, 95)` (hex `#50e75f`)
- Background: black (`#000` or `rgb(0,0,0)`)
- Font: "Inter Tight" is their site font but the badge can use the project's system font

```typescript
// Badge structure — purely styled div, no external dependency
function HackathonBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
      style={{
        backgroundColor: '#000000',
        color: '#50e75f',
        border: '1px solid #50e75f',
      }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: '#50e75f' }}
      />
      GenAI Zürich Hackathon 2026
    </div>
  )
}
```

### Pattern 5: next/image for the photo

**What:** Use `<Image>` from `next/image` for performance (automatic WebP/AVIF, lazy loading, LCP optimization).
**When to use:** Any photo placed in the Next.js `public/` directory.
```typescript
import Image from 'next/image'

// Inside absolute-positioned container:
<Image
  src="/zurich-bg.jpg"
  alt=""  // decorative — empty alt
  fill
  className="object-cover"
  priority  // add only on hero (above the fold); omit on credits section + auth
/>
```

`fill` prop requires the parent to be `position: relative` (or absolute) with explicit dimensions — already satisfied by the `position: relative` section element.

### Anti-Patterns to Avoid

- **Using `<img>` instead of `next/image`:** Loses automatic format optimization and lazy loading. Use `next/image` with `fill` for background-style photos.
- **Setting `priority` on all three photo instances:** Only the hero (above the fold) warrants `priority`. Credits section and auth page should lazy-load.
- **Animating `opacity` with Framer Motion on a `next/image` directly:** Wrap in a `motion.div` container and animate the wrapper, not the Image itself.
- **Using the `initial` prop with `useInView` animate pattern:** Do not add `initial` to motion.div when driving animation from `useInView` `animate` prop — this pattern is established in SectionProblem. Framer Motion derives start state from the `animate` value at mount when `isInView=false`.
- **Adding translation keys only to `en` locale:** The translations file enforces TypeScript type-check that `de` has all `en` keys. Adding `landing_credits_label` to `en` without adding it to `de` will cause a TypeScript compile error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo background optimization | CSS `background-image` with raw URL | `next/image` with `fill` | Automatic WebP/AVIF, responsive sizes, LCP tracking |
| Scroll-linked animation | `window.addEventListener('scroll', ...)` | `useScroll` + `useTransform` from motion/react | Already in codebase; handles cleanup, SSR, and MotionValue composition |
| ETH Zurich logo rendering | Hand-drawing SVG path data | Download SVG from Wikimedia Commons | Official asset, freely available, saves effort |
| Badge typography sizing | Custom CSS | Tailwind utility classes matching project conventions | Consistent with all other components |

**Key insight:** This phase is almost entirely composition of existing patterns. No new architectural concepts are introduced — the photo layer, scroll-fade, and useInView patterns are copy-adapt from LandingNavbar and SectionCTA.

---

## Common Pitfalls

### Pitfall 1: `useScroll` in a non-client component

**What goes wrong:** `useScroll` reads `window.scrollY` — calling it in a Server Component causes a build error.
**Why it happens:** SectionHero.tsx already has `'use client'` at the top so this is safe. No change needed.
**How to avoid:** Confirm `'use client'` is present before adding `useScroll`.
**Warning signs:** Build error: `You're importing a component that needs useEffect`.

### Pitfall 2: `next/image` `fill` without positioned parent

**What goes wrong:** The image renders at 0×0 dimensions or breaks layout.
**Why it happens:** `fill` positions the image absolutely relative to its nearest positioned ancestor. If the section wrapper has no explicit `position` value, the image escapes the container.
**How to avoid:** The section already has `className="relative ..."` — confirm `relative` is present before adding the `fill` Image.

### Pitfall 3: Translation key parity check

**What goes wrong:** TypeScript build fails with "Type 'false' is not assignable to type 'true'" on the `_deKeyCheck` line.
**Why it happens:** `translations.ts` enforces at compile time that `de` has every key `en` has. Adding new keys to `en` without adding them to `de` triggers this.
**How to avoid:** Add any new translation keys (e.g., `landing_credits_label`) to both `en` and `de` objects simultaneously.

### Pitfall 4: Stale z-index allows photo to cover hero content

**What goes wrong:** Floating chips or headline text disappears behind the photo layer.
**Why it happens:** The photo layer gets a z-index higher than `z-10` or `z-20`.
**How to avoid:** Photo layer must be `z-0` (or `z-[-1]` via Tailwind). The existing stacking order in SectionHero already works — just insert the photo layer first among the `z-0` elements.
**Warning signs:** Hero chips not visible on desktop, or headline text missing.

### Pitfall 5: Auth page photo missing `min-h-screen` on the replacement wrapper

**What goes wrong:** Photo crops to the height of the login card rather than filling the viewport.
**Why it happens:** The outer `<div>` already has `flex min-h-screen` — if this class is accidentally dropped when editing, the photo will not fill.
**How to avoid:** When replacing `bg-background` on the outer div, preserve all other classes including `min-h-screen`.

### Pitfall 6: `priority` prop on all photo instances causes LCP regression

**What goes wrong:** Browser eagerly downloads all three photo instances (hero + credits + auth), increasing page weight.
**Why it happens:** `priority` disables lazy loading.
**How to avoid:** Only add `priority` to the hero photo. Credits section and auth page photo should lazy-load (default behavior).

---

## Code Examples

Verified patterns from existing codebase:

### Scroll-linked opacity (from LandingNavbar.tsx)

```typescript
// Source: /web/src/components/landing/LandingNavbar.tsx lines 14-33
import { motion, useScroll, useTransform } from 'motion/react'

const { scrollY } = useScroll()
const bgOpacity = useTransform(scrollY, [0, 80], [0, 1])
// Usage: <motion.header style={{ opacity: bgOpacity }} />
```

Hero photo adaptation (inverse direction):
```typescript
const { scrollY } = useScroll()
const photoOpacity = useTransform(scrollY, [0, 600], [1, 0])
// Wrapped in a motion.div: <motion.div style={{ opacity: photoOpacity }} />
```

### Absolute decorative layer (from SectionCTA.tsx)

```typescript
// Source: /web/src/components/landing/SectionCTA.tsx lines 22-28
<div
  aria-hidden
  className="absolute inset-0 pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse 80% 60% at 50% 50%, ...)',
  }}
/>
```

### useInView animate pattern (from SectionProblem.tsx)

```typescript
// Source: /web/src/components/landing/SectionProblem.tsx lines 24-38
const ref = useRef<HTMLDivElement>(null)
const isInView = useInView(ref, { once: false, amount: 0.5 })

<motion.div
  ref={ref}
  animate={{ opacity: isInView ? 1 : 0.25, x: isInView ? 0 : -60 }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
>
```

### next/image fill pattern

```typescript
import Image from 'next/image'

// Parent must be position:relative (or absolute) with explicit size
<div className="absolute inset-0 overflow-hidden" aria-hidden>
  <Image
    src="/zurich-bg.jpg"
    alt=""
    fill
    className="object-cover"
    priority  // only for hero
  />
  {/* Dark overlay on top */}
  <div
    className="absolute inset-0"
    style={{ background: 'linear-gradient(to bottom, hsl(0 0% 0% / 0.55), hsl(0 0% 0% / 0.70))' }}
  />
</div>
```

---

## External Assets

### ETH Zurich White SVG Logo

**Direct download URL (confirmed):**
```
https://upload.wikimedia.org/wikipedia/commons/a/a7/ETH_Z%C3%BCrich_Logo_white.svg
```
- Source: Wikimedia Commons
- Dimensions: 192 × 32 px
- File size: 3 KB
- Type: Wordmark (text logo — "ETH Zürich" in institutional typeface, white)
- License: Public domain / freely usable
- Place at: `/public/eth-zurich-white.svg`

**Download command:**
```bash
curl -L "https://upload.wikimedia.org/wikipedia/commons/a/a7/ETH_Z%C3%BCrich_Logo_white.svg" \
  -o /Users/singhs/gen-ai-hackathon/web/public/eth-zurich-white.svg
```

### Zurich Aerial Dusk Photo

**Recommended source:** Unsplash (free license, commercial use permitted, no attribution required)

Search query: `https://unsplash.com/s/photos/zurich-aerial` or `https://unsplash.com/s/photos/zurich-sunset`

Key selection criteria:
- Aerial perspective (not street-level)
- Dusk or sunset lighting (red-orange sky — matches the reference screenshot)
- High resolution (≥ 2000px wide for Retina support)
- Lake Zurich visible preferred (recognizable Swiss identity)

Alternatives also acceptable:
- Pexels (also free commercial license): https://www.pexels.com/search/zurich%20aerial/
- Pixground (4K wallpapers, check license): https://www.pixground.com/sunset-over-zurich-aerial-cityscape-4k-wallpaper/

Place final photo at: `/public/zurich-bg.jpg` (JPEG preferred for photo compression; `.webp` is also acceptable but next/image handles conversion automatically from JPEG).

### GenAI Zurich Hackathon Badge

**Recreated in code — no file asset needed.**

Brand colors from genaizurich.ch (confirmed via CSS inspection):
- Accent green: `rgb(80, 231, 95)` → hex `#50e75f`
- Background: `rgb(0, 0, 0)` → `#000000`
- Secondary: `rgb(53, 53, 49)` → for subtle variants

---

## Integration Checklist

| Surface | File | Change Type | Key Details |
|---------|------|-------------|-------------|
| Hero photo layer | `SectionHero.tsx` | Add motion.div with Image inside, scroll-fade via useScroll | z-0, aria-hidden, priority=true |
| Credits section | `SectionCredits.tsx` | New file | Photo bg + dark overlay + "A project from" + ETH SVG + badge |
| Landing page order | `LandingPageContent.tsx` | Insert SectionCredits | Between SectionCTA and LandingFooter |
| Auth page | `src/app/auth/page.tsx` | Outer div bg change + absolute photo layer + credits strip at bottom | min-h-screen preserved |
| Translations | `src/lib/translations.ts` | Add credits label key | Both `en` and `de` |
| Public assets | `/public/` | Add two files | `eth-zurich-white.svg` + `zurich-bg.jpg` |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| Config file | `/web/vitest.config.mts` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-credits.test.tsx src/__tests__/auth-page.test.tsx src/__tests__/landing-page.test.tsx src/__tests__/section-hero.test.tsx` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRED-01 | `SectionCredits` renders without crashing | unit | `npx vitest run src/__tests__/section-credits.test.tsx` | ❌ Wave 0 |
| CRED-01 | Credits section contains "A project from" label | unit | `npx vitest run src/__tests__/section-credits.test.tsx` | ❌ Wave 0 |
| CRED-01 | ETH Zürich logo img rendered in credits section | unit | `npx vitest run src/__tests__/section-credits.test.tsx` | ❌ Wave 0 |
| CRED-01 | Hackathon badge renders with "GenAI Zürich Hackathon 2026" text | unit | `npx vitest run src/__tests__/section-credits.test.tsx` | ❌ Wave 0 |
| CRED-01 | Hero photo layer present (`data-testid="hero-photo"`) | unit | `npx vitest run src/__tests__/section-hero.test.tsx` | ✅ (file exists, test to be added) |
| CRED-01 | Auth page renders with Zurich photo background | unit | `npx vitest run src/__tests__/auth-page.test.tsx` | ✅ (file exists, test to be added) |
| CRED-02 | `LandingPageContent` includes SectionCredits between CTA and Footer | unit | `npx vitest run src/__tests__/landing-page.test.tsx` | ✅ (file exists, test to be added) |

**Known jsdom gotchas (from STATE.md):**
- jsdom normalizes hex colors to `rgb()` — use `rgb()` form in assertions
- jsdom normalizes `hsl()` to `rgba()` — check both representations
- `IntersectionObserver` must be mocked in `beforeAll` (established pattern in all existing landing tests)
- `next/image` renders as `<img>` in jsdom — test for `img[src="/zurich-bg.jpg"]` or `data-testid`

### Wave 0 Gaps

- [ ] `src/__tests__/section-credits.test.tsx` — covers CRED-01 (new test file needed)
- [ ] Tests to add to `src/__tests__/section-hero.test.tsx` — hero photo layer presence
- [ ] Tests to add to `src/__tests__/auth-page.test.tsx` — photo background applied, credits strip present
- [ ] Tests to add to `src/__tests__/landing-page.test.tsx` — SectionCredits present between CTA and Footer

*(All test infrastructure (vitest, jsdom, @testing-library/react, mocking patterns) already exists.)*

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| CSS `background-image` for photos | `next/image` with `fill` | Auto format conversion (WebP/AVIF), LCP tracking, responsive srcset |
| Manual `window.scrollY` listener | `useScroll` + `useTransform` | No memory leak, SSR safe, composable MotionValues |
| `whileInView` on h2 inside motion.div parent | `useInView` + `animate` prop | Avoids Framer Motion conflict (established decision in STATE.md) |

**Deprecated/outdated in this project:**
- `whileInView` on heading elements inside parent `motion.div` — use `useInView` + `animate` instead (STATE.md: "useInView not whileInView for per-item animate props")
- `bg-background` class on auth page outer wrapper — will be replaced by photo background in this phase

---

## Open Questions

1. **Photo file selection**
   - What we know: Unsplash has Zurich aerial/sunset photos with free commercial license
   - What's unclear: No specific Unsplash photo ID is locked — implementer must browse and select a suitable dusk/sunset aerial shot
   - Recommendation: Select a photo with red-orange sky (matching reference screenshot) at ≥2000px width; download and commit to `/public/zurich-bg.jpg`

2. **ETH Zurich SVG content specifics**
   - What we know: File is 3KB, 192×32px wordmark from Wikimedia Commons; download URL confirmed
   - What's unclear: Whether the SVG has a `fill` color hardcoded or uses `currentColor`
   - Recommendation: After downloading, inspect the SVG. If fill is hardcoded non-white, override with `style={{ color: '#ffffff' }}` and replace fills with `currentColor` OR just use it as-is since it is the white variant

3. **SectionCredits section height**
   - What we know: Should be "minimal, elegant" per CRED-02; photo fills full width/height
   - What's unclear: Exact px/vh height not specified
   - Recommendation: Use `py-24` (consistent with other sections) or `min-h-[50vh]` for a half-viewport feel that shows the photo without competing with CTA

---

## Sources

### Primary (HIGH confidence)
- `/web/src/components/landing/LandingNavbar.tsx` — `useScroll` + `useTransform` pattern confirmed in codebase
- `/web/src/components/landing/SectionHero.tsx` — existing stacking order, z-index structure, `relative overflow-hidden` section confirmed
- `/web/src/components/landing/SectionCTA.tsx` — absolute-positioned decorative layer pattern confirmed
- `/web/src/components/landing/SectionProblem.tsx` — `useInView` + `animate` pattern confirmed
- `/web/src/components/landing/LandingPageContent.tsx` — insertion point confirmed
- `/web/src/app/auth/page.tsx` — outer div structure confirmed (`flex min-h-screen`)
- `/web/src/lib/translations.ts` — translation key parity enforcement confirmed
- `/web/vitest.config.mts` — test framework config confirmed
- `/web/src/__tests__/section-hero.test.tsx` — jsdom gotchas documented in existing tests
- Wikimedia Commons `https://commons.wikimedia.org/wiki/File:ETH_Z%C3%BCrich_Logo_white.svg` — ETH Zurich white SVG confirmed available, direct URL confirmed

### Secondary (MEDIUM confidence)
- `https://www.genaizurich.ch/hackathon` — GenAI Zurich brand green `rgb(80, 231, 95)` extracted from site CSS
- WebSearch — Unsplash confirmed as free-license source for Zurich aerial dusk photos

### Tertiary (LOW confidence)
- WebSearch — Pixground 4K Zurich sunset wallpaper (license needs verification before use)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json; all patterns confirmed in existing source files
- Architecture: HIGH — integration points, file paths, z-index order, component slots all confirmed from source code
- Asset acquisition: MEDIUM — ETH SVG URL confirmed from Wikimedia; photo source confirmed (Unsplash) but specific photo ID not locked
- Pitfalls: HIGH — all from observed patterns in codebase (STATE.md accumulated context) and confirmed jsdom behaviors

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack; Framer Motion v12 API is stable)
