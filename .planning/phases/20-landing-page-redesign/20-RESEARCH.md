# Phase 20: Landing Page Redesign — Research

**Researched:** 2026-03-27
**Domain:** Scroll-driven animation, SVG animation, motion/react v12, Next.js 15 App Router
**Confidence:** HIGH (core patterns), MEDIUM (SVG globe/isometric math), HIGH (motion API)

---

## Summary

This phase replaces the existing `web/src/components/landing/` section stack with a single scroll-driven page of 7 chapters. The pattern is the Apple MacBook/iPhone product page: a tall outer container creates scroll space, a sticky inner canvas stays fixed while animations play based on `scrollYProgress` (0→1 per chapter).

The project already has `motion` v12.38.0 (import path: `motion/react`), Tailwind v4 CSS-first, all design tokens, and `@base-ui/react` Button. No new dependencies are needed. The entire animation system is built with `useScroll` + `useTransform` — not `whileInView`, not CSS-only scroll-timeline.

**Primary recommendation:** One `"use client"` file per chapter component. Each chapter receives its own `chapterRef` and creates its own `scrollYProgress` via `useScroll`. Motion values are passed as props to child SVG/text components so they never cause React re-renders.

---

## Standard Stack

### Core (already installed — no installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion/react` | 12.38.0 | useScroll, useTransform, motion.path, useReducedMotion | The only scroll animation library needed |
| `next` | 16.1.6 | App Router, "use client" boundaries | Already in place |
| `tailwindcss` | v4 | CSS tokens, sticky/h-screen utilities | Already in place |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@base-ui/react` | ^1.2.0 | CTA button with render={`<Link />`} | Chapter 7 CTA only |
| `lucide-react` | ^0.577.0 | Icons in listing cards (Chapter 4) | Re-use existing HeroDemo icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `motion/react` useScroll | CSS Scroll Timeline API | Native but Safari support lagging; motion abstracts it with GPU acceleration |
| Hand-rolled word split | `motion-plus` splitText | splitText requires Motion+ paid subscription; manual span-per-word is fine |
| SVG globe | Three.js or Lottie | Three.js adds ~600kb; Lottie needs a designer; inline SVG is sufficient |

**Installation:** None required. All dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
web/src/components/landing/
├── LandingPageContent.tsx        # orchestrator (replaces existing, still "use client")
├── chapters/
│   ├── ChapterHook.tsx           # Chapter 1 — 100vh, load animation only
│   ├── ChapterSwiss.tsx          # Chapter 2 — 300vh sticky, SVG globe
│   ├── ChapterProblem.tsx        # Chapter 3 — 350vh sticky, isometric home
│   ├── ChapterMechanism.tsx      # Chapter 4 — 400vh sticky, browser demo
│   ├── ChapterScore.tsx          # Chapter 5 — 200vh sticky, CountUp
│   ├── ChapterDream.tsx          # Chapter 6 — 150vh, home lights up
│   └── ChapterCta.tsx            # Chapter 7 — 100vh, clean CTA
├── svg/
│   ├── IsometricHome.tsx         # SVG component, accepts scrollProgress MotionValue
│   ├── GlobeSwiss.tsx            # SVG globe, accepts scrollProgress MotionValue
│   └── BrowserDemo.tsx           # Browser chrome + listing cards
└── LandingNavbar.tsx             # Keep existing
└── LandingFooter.tsx             # Keep existing
```

### Pattern 1: The Sticky Scroll Chapter

This is the core pattern for every chapter with scroll animation:

```typescript
// Source: https://motion.dev/docs/react-use-scroll
"use client"

import { useRef } from "react"
import { useScroll, useTransform } from "motion/react"

export function ChapterSwiss() {
  const chapterRef = useRef<HTMLDivElement>(null)

  // scrollYProgress goes 0→1 as the user scrolls through the 300vh container
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  return (
    // Outer: creates scroll space. Height = how long the animation lasts.
    <div ref={chapterRef} className="relative h-[300vh]">
      {/* Inner: sticks to viewport while outer scrolls */}
      <div className="sticky top-0 h-screen overflow-hidden">
        <GlobeSwiss scrollProgress={scrollYProgress} />
      </div>
    </div>
  )
}
```

**Key rules:**
- `ref` goes on the OUTER div (the scroll space), not the sticky inner
- `offset: ["start start", "end end"]` means: progress starts when the top of the outer div hits the top of the viewport, ends when the bottom of the outer div hits the bottom of the viewport
- `scrollYProgress` is a `MotionValue<number>` — passing it as a prop to children does NOT cause re-renders

### Pattern 2: Child Component Receives MotionValue

Children receive `scrollYProgress` directly as a `MotionValue`:

```typescript
// Source: https://motion.dev/docs/react-motion-value
import { MotionValue, motion, useTransform } from "motion/react"

interface GlobeSwissProps {
  scrollProgress: MotionValue<number>
}

export function GlobeSwiss({ scrollProgress }: GlobeSwissProps) {
  // Map scroll 0→1 to rotation 0→360
  const rotation = useTransform(scrollProgress, [0, 0.4], [0, 360])

  // Map scroll 0.2→0.6 to scale 1→8 (zoom into Switzerland)
  const swissScale = useTransform(scrollProgress, [0.2, 0.6], [1, 8])

  // Map scroll 0.6→0.7 to opacity 0→1 (copy appears)
  const copyOpacity = useTransform(scrollProgress, [0.6, 0.75], [0, 1])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.svg style={{ rotate: rotation }} viewBox="0 0 400 400">
        {/* ... */}
      </motion.svg>
      <motion.p style={{ opacity: copyOpacity }}>
        One flat for every 200 applicants.
      </motion.p>
    </div>
  )
}
```

**Why this pattern:** Motion values update the DOM directly via the style prop — no React re-render per scroll tick. This is confirmed by the motion docs: "Changes to the motion value will update the DOM without triggering a React re-render."

### Pattern 3: useTransform with Multi-Stop Keyframes

For complex chapter sequences, use multiple keyframe stops in a single `useTransform` call:

```typescript
// Globe rotation: spin 0→360 in the first 40% of scroll
const globeRotate = useTransform(
  scrollProgress,
  [0,    0.4,  0.4,  1],
  [0,    360,  360,  360]
)

// Switzerland glow opacity: appears at 60%, stays
const swissGlow = useTransform(
  scrollProgress,
  [0,   0.5, 0.65, 1],
  [0,   0,   1,    1]
)

// Copy Y position: slides up at 70%
const copyY = useTransform(
  scrollProgress,
  [0,   0.7, 0.85, 1],
  [40,  40,  0,    0]
)
```

The input range must be monotonically increasing. Values stay clamped at endpoints by default (`clamp: true`).

### Pattern 4: useTransform with ease option

For scroll animations that should feel physical rather than linear:

```typescript
import { cubicBezier } from "motion"

// Source: https://motion.dev/docs/react-use-transform
const scale = useTransform(
  scrollProgress,
  [0.2, 0.7],
  [1, 8],
  { ease: cubicBezier(0.22, 1, 0.36, 1) }  // same as ease.enter from @/lib/motion
)
```

### Anti-Patterns to Avoid

- **Don't use `whileInView` for scroll-driven animation:** `whileInView` is a boolean trigger (in/out). For position-linked animation you must use `useScroll` + `useTransform`.
- **Don't put `ref` on the sticky inner div:** The `useScroll` target ref must be on the OUTER div that creates scroll height. Putting it on the sticky element gives wrong progress values.
- **Don't animate SVG geometric attributes (cx, cy, width, height) on every frame:** These trigger repaint (C-tier). Use CSS transform on `<g>` elements and `opacity` for all per-frame animation.
- **Don't use CSS variables for animated values:** The motion magazine article explicitly flags this: changing CSS variables triggers full style recalculation across the tree.
- **Don't put `will-change: transform` on everything:** Use it only on elements with many scroll-frame updates, and remove it after animation completes.

---

## Section 1: Scroll Chapter Architecture

### useScroll Options Reference

```typescript
// Source: https://motion.dev/docs/react-use-scroll
const { scrollYProgress } = useScroll({
  target: ref,          // Ref to the outer scroll-height container
  offset: [             // Default: ["start start", "end end"]
    "start start",      // When: top of target meets top of container (viewport)
    "end end",          // When: bottom of target meets bottom of container
  ],
  axis: "y",            // Default: "y"
  // container: windowRef   // Only needed for non-window scroll containers
})
```

**Offset syntax:** Each offset is `"<target-point> <container-point>"`. Values can be:
- Named: `"start"` (0%), `"center"` (50%), `"end"` (100%)
- Numbers: `0` to `1`
- Pixels: `"100px"`
- Percent: `"25%"`

**For chapter pattern** use `["start start", "end end"]` — progress starts when chapter enters and ends when chapter exits.

**SSR / hydration note:** `useScroll` requires `"use client"`. The ref must be attached to a native HTML element, not a custom component wrapper. If you get "Container/Target ref is defined but not hydrated", you passed the ref to a custom component without `forwardRef`.

### Chapter Height Guide

| Chapter | Height | Notes |
|---------|--------|-------|
| Hook (1) | `h-screen` | No scroll, no sticky. Load animation only. |
| Swiss (2) | `h-[300vh]` | 200vh of scroll time for globe → zoom → copy sequence |
| Problem (3) | `h-[350vh]` | 250vh for house construction + 3 pain lines |
| Mechanism (4) | `h-[400vh]` | 300vh for card reveal + score pop + zoom + analysis |
| Score (5) | `h-[200vh]` | 100vh for countup + bars |
| Dream (6) | `h-[150vh]` | 50vh for house lights + copy |
| CTA (7) | `h-screen` | No sticky needed |

---

## Section 2: Isometric SVG Home — Construction Technique

### Isometric Projection Math

Isometric projection uses three visible faces. For a 2D SVG, use polygon coordinates directly:

```
Isometric coordinate system:
- X-axis goes right and slightly down  (angle: 30° below horizontal = 150° from left)
- Y-axis goes left and slightly down   (angle: 210° from top = 30° below horizontal on left)
- Z-axis goes straight up

For a unit cube with side length S:
  Top face corners (parallelogram):
    top-center:     (cx, cy - S)
    right-center:   (cx + S*0.866, cy - S*0.5)
    bottom-center:  (cx, cy)
    left-center:    (cx - S*0.866, cy - S*0.5)

  Left face corners:
    top-left:   (cx - S*0.866, cy - S*0.5)
    bottom-left:(cx, cy)
    bottom-left-floor: (cx, cy + S)
    top-left-floor:    (cx - S*0.866, cy + S*0.5)

  Right face corners:
    top-right:  (cx + S*0.866, cy - S*0.5)
    top-center: (cx, cy)
    bottom-center-floor: (cx, cy + S)
    bottom-right-floor:  (cx + S*0.866, cy + S*0.5)
```

**Color convention (matching hero tokens):**
- Top face: `hsl(173 65% 62%)` (lighter teal / `--color-hero-teal` + lightness bump)
- Left face: `hsl(173 65% 42%)` (mid — `--color-hero-teal`)
- Right face: `hsl(173 65% 28%)` (dark shadow)
- Or for a neutral home: top=`hsl(210 15% 55%)`, left=`hsl(210 15% 40%)`, right=`hsl(210 15% 28%)`

### SVG House Structure

```typescript
// Concrete coordinate set for a centered isometric house
// SVG viewBox="0 0 400 400", house centered at (200, 220)
// S = 80 (unit size)

const S = 80
const cx = 200, cy = 220

const house = {
  // Foundation/floor
  floorTop:   `${cx},${cy - S}  ${cx + S*0.866},${cy - S*0.5}  ${cx},${cy}  ${cx - S*0.866},${cy - S*0.5}`,

  // Front-right wall (darker)
  wallRight:  `${cx},${cy}  ${cx + S*0.866},${cy - S*0.5}  ${cx + S*0.866},${cy + S*0.5}  ${cx},${cy + S}`,

  // Front-left wall (medium)
  wallLeft:   `${cx - S*0.866},${cy - S*0.5}  ${cx},${cy}  ${cx},${cy + S}  ${cx - S*0.866},${cy + S*0.5}`,

  // Roof ridge point
  roofPeak:   `${cx},${cy - S*1.5}`,
  // Roof-right triangle
  roofRight:  `${cx},${cy - S}  ${cx + S*0.866},${cy - S*0.5}  ${cx},${cy - S*1.5}`,
  // Roof-left triangle
  roofLeft:   `${cx - S*0.866},${cy - S*0.5}  ${cx},${cy - S}  ${cx},${cy - S*1.5}`,
}
```

### Animation Sequence with `pathLength`

Each house element is wrapped in `motion.polygon` or `motion.path` with `pathLength` animated from 0→1. Use `useTransform` to map `scrollProgress` thresholds to each element's `pathLength`:

```typescript
// Source: https://motion.dev/docs/react-svg-animation
import { motion, useTransform, MotionValue } from "motion/react"

interface IsometricHomeProps {
  scrollProgress: MotionValue<number>
}

export function IsometricHome({ scrollProgress }: IsometricHomeProps) {
  // Each element draws in at a different scroll segment
  const floorPath   = useTransform(scrollProgress, [0.00, 0.12], [0, 1])
  const wallRight   = useTransform(scrollProgress, [0.10, 0.22], [0, 1])
  const wallLeft    = useTransform(scrollProgress, [0.18, 0.30], [0, 1])
  const roofRight   = useTransform(scrollProgress, [0.28, 0.38], [0, 1])
  const roofLeft    = useTransform(scrollProgress, [0.35, 0.44], [0, 1])
  // Windows, door appear via opacity (faster than pathLength)
  const windowOp    = useTransform(scrollProgress, [0.44, 0.52], [0, 1])
  const doorOp      = useTransform(scrollProgress, [0.50, 0.58], [0, 1])
  const treesOp     = useTransform(scrollProgress, [0.56, 0.65], [0, 1])

  // "Dims" at 70%, pain lines appear
  const homeDim     = useTransform(scrollProgress, [0.68, 0.76], [1, 0.25])
  const line1Op     = useTransform(scrollProgress, [0.72, 0.80], [0, 1])
  const line2Op     = useTransform(scrollProgress, [0.80, 0.87], [0, 1])
  const line3Op     = useTransform(scrollProgress, [0.87, 0.94], [0, 1])

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full max-w-md mx-auto">
      <motion.g style={{ opacity: homeDim }}>
        {/* Floor */}
        <motion.polygon
          points={house.floorTop}
          fill="hsl(210 15% 55%)"
          stroke="hsl(210 15% 40%)"
          strokeWidth={1}
          style={{ pathLength: floorPath }}
        />
        {/* Right wall */}
        <motion.polygon
          points={house.wallRight}
          fill="hsl(210 15% 28%)"
          stroke="hsl(210 15% 20%)"
          strokeWidth={1}
          style={{ pathLength: wallRight }}
        />
        {/* Left wall */}
        <motion.polygon
          points={house.wallLeft}
          fill="hsl(210 15% 40%)"
          stroke="hsl(210 15% 28%)"
          strokeWidth={1}
          style={{ pathLength: wallLeft }}
        />
        {/* Roof right */}
        <motion.polygon
          points={house.roofRight}
          fill="hsl(210 25% 35%)"
          style={{ pathLength: roofRight }}
        />
        {/* Roof left */}
        <motion.polygon
          points={house.roofLeft}
          fill="hsl(210 25% 45%)"
          style={{ pathLength: roofLeft }}
        />
        {/* Windows */}
        <motion.g style={{ opacity: windowOp }}>
          {/* Small window rectangles — use <rect> or simple <polygon> */}
          <rect x={170} y={195} width={20} height={16}
            fill="hsl(50 90% 75%)" opacity={0.7} />
          <rect x={220} y={195} width={20} height={16}
            fill="hsl(50 90% 75%)" opacity={0.7} />
        </motion.g>
        {/* Door */}
        <motion.rect
          x={188} y={222} width={24} height={30}
          fill="hsl(25 50% 35%)"
          style={{ opacity: doorOp }}
        />
        {/* Trees (simple triangles) */}
        <motion.g style={{ opacity: treesOp }}>
          <polygon points="140,240 155,200 170,240" fill="hsl(140 40% 35%)" />
          <polygon points="240,240 255,200 270,240" fill="hsl(140 40% 35%)" />
        </motion.g>
      </motion.g>

      {/* Pain lines — appear after home dims */}
      <motion.text x="50%" y="300" textAnchor="middle"
        fill="hsl(0 0% 90%)" fontSize={14}
        style={{ opacity: line1Op }}>
        You scroll through 40 listings on Sunday.
      </motion.text>
      <motion.text x="50%" y="325" textAnchor="middle"
        fill="hsl(0 0% 90%)" fontSize={14}
        style={{ opacity: line2Op }}>
        You request 8 viewings. 6 don't reply.
      </motion.text>
      <motion.text x="50%" y="350" textAnchor="middle"
        fill="hsl(0 0% 90%)" fontSize={14}
        style={{ opacity: line3Op }}>
        The good one goes in 48 hours. You saw it too late.
      </motion.text>
    </svg>
  )
}
```

**Important:** `pathLength` works on `polygon`, `path`, `circle`, `ellipse`, `line`, `polyline`, `rect`. The element must have a `stroke` to be visible during drawing. Add `fill="none"` during draw phase, then fade the fill in separately using `opacity` if needed.

**Alternative approach — opacity only (simpler, lower performance risk):** Skip `pathLength` for walls/faces (they are filled polygons, not strokes). Instead, just use `opacity: 0 → 1` with staggered `useTransform` thresholds for each face. The "construction" feel comes from the order of appearance, not literal drawing.

---

## Section 3: SVG Globe with Zoom to Switzerland

### Layer Structure

```
<svg viewBox="0 0 400 400">
  <!-- 1. Ocean circle -->
  <circle cx="200" cy="200" r="160" fill="hsl(210 50% 20%)" />

  <!-- 2. Rotating latitude/longitude grid -->
  <g id="grid" style={{ animation: "spin 20s linear infinite" }}>
    <!-- 5 horizontal ellipses for latitude lines -->
    <!-- 5 lines through center for longitude -->
  </g>

  <!-- 3. Europe continent silhouette (simplified path) -->
  <path id="europe" d="..." fill="hsl(210 30% 35%)" />

  <!-- 4. Switzerland highlight polygon -->
  <polygon id="switzerland" points="..." fill="hsl(173 65% 52%)" />
</svg>
```

### Latitude / Longitude Lines (simplified)

```typescript
// 5 latitude ellipses — rx scales by cos(lat), ry is constant offset
// In SVG: each latitude is an ellipse centered at (200, 200)
// Latitude lines at: 15°, 30°, 45°, 60°, equator (0°)
const latLines = [
  { ry: 5,   rx: 158 },  // 60°N approx
  { ry: 40,  rx: 153 },  // 45°N
  { ry: 80,  rx: 140 },  // 30°N
  { ry: 118, rx: 115 },  // 15°N
  { ry: 150, rx: 0   },  // equator — straight line
]
// Render as <ellipse> elements, all centered at (200, 200)

// 6 longitude lines — all go through center, different angles
const longAngles = [0, 30, 60, 90, 120, 150]
// Render as <line> from (200-160*cos, 200-160*sin) to opposite
```

### Rotation Animation

The longitude lines group spins via CSS keyframe (not motion, to avoid JS overhead on a continuous loop):

```css
@keyframes globe-spin {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(360deg); }
}

/* In globals.css or module CSS */
.globe-grid {
  transform-origin: 200px 200px;
  animation: globe-spin 20s linear infinite;
}
```

**Note:** CSS 3D `rotateY` on an SVG group does not actually create proper 3D longitude-line foreshortening. For a convincing effect, animate `scaleX` between -1 and 1 (mimicking the hemisphere flip):

```css
@keyframes globe-longitude-sweep {
  0%   { transform: scaleX(1); }
  50%  { transform: scaleX(-1); }
  100% { transform: scaleX(1); }
}
```

### Simplified Europe Path

A recognizable-but-rough European continent path (sufficient for visual context):

```
// Very simplified Europe SVG path — not geographically precise, visually readable
// Positioned so Switzerland is near center-right of the continent
// In a 400x400 SVG with ocean circle centered at 200,200

const EUROPE_PATH = `
  M 145 95
  L 155 85 L 175 80 L 195 75 L 215 78
  L 235 72 L 250 80 L 260 90
  L 265 105 L 270 118 L 265 130
  L 255 140 L 260 155 L 255 168
  L 245 175 L 240 185 L 248 195
  L 252 210 L 245 220 L 235 225
  L 220 218 L 210 225 L 205 238
  L 195 240 L 185 235 L 175 228
  L 165 232 L 155 238 L 148 230
  L 140 218 L 135 205 L 130 195
  L 125 182 L 118 170 L 120 155
  L 115 142 L 118 128 L 130 118
  L 135 108 L 140 98 Z
`

// Switzerland — a small polygon at approximately correct relative position
// (center-right of Europe, slightly above vertical center)
const SWITZERLAND_POLYGON = "195,165  208,162  215,168  212,175  200,178  193,172"
```

### Zoom-into-Switzerland via scrollProgress

```typescript
// Source: https://motion.dev/docs/react-use-transform

export function GlobeSwiss({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  // Globe spins while scroll is 0→0.3 (handled by CSS animation, not motion)
  // At 0.3→0.6 the SVG viewBox zooms into Switzerland's position
  // Switzerland is at roughly (200, 168) in the 400x400 SVG

  // Approach: animate the viewBox string via motion.svg
  // OR: scale + translate the whole SVG element

  // Scale approach (simpler, no viewBox string interpolation):
  const scale = useTransform(scrollProgress, [0.25, 0.65], [1, 6], {
    ease: cubicBezier(0.22, 1, 0.36, 1)
  })

  // Translate to keep Switzerland centered after scaling
  // Switzerland center in SVG coords: (203, 170)
  // SVG center: (200, 200)
  // Offset from center: (3, -30)
  // At scale 6: need to translate by (-3 * 6, 30 * 6) = (-18, 180) to re-center
  // But with translate-then-scale rule:
  // translate values = offset * scale = small corrections
  const translateX = useTransform(scrollProgress, [0.25, 0.65], [0, -18])
  const translateY = useTransform(scrollProgress, [0.25, 0.65], [0, 180])

  // Switzerland glow appears as zoom reaches it
  const swissGlow = useTransform(scrollProgress, [0.55, 0.70], [0, 1])
  // Copy text fades in
  const copyOp    = useTransform(scrollProgress, [0.72, 0.85], [0, 1])
  const copyY     = useTransform(scrollProgress, [0.72, 0.85], [20, 0])

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-hero-bg">
      <motion.div
        style={{ scale, x: translateX, y: translateY }}
        className="origin-center"
      >
        <svg
          viewBox="0 0 400 400"
          width="400"
          height="400"
          className="globe-container"
        >
          <circle cx="200" cy="200" r="160" fill="hsl(210 50% 18%)" />

          {/* Grid — CSS animated, not motion */}
          <g className="globe-grid">
            <ellipse cx="200" cy="200" rx="153" ry="40"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" fill="none" />
            <ellipse cx="200" cy="200" rx="140" ry="80"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" fill="none" />
            <ellipse cx="200" cy="200" rx="115" ry="118"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" fill="none" />
            <line x1="40" y1="200" x2="360" y2="200"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" />
            <line x1="116" y1="63" x2="284" y2="337"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" />
            <line x1="116" y1="337" x2="284" y2="63"
              stroke="hsl(210 50% 35%)" strokeWidth="0.5" />
          </g>

          {/* Europe continent */}
          <path d={EUROPE_PATH} fill="hsl(210 25% 38%)" stroke="hsl(210 25% 50%)" strokeWidth="0.5" />

          {/* Switzerland highlight */}
          <motion.polygon
            points={SWITZERLAND_POLYGON}
            fill="hsl(173 65% 52%)"
            style={{ opacity: swissGlow }}
            filter="url(#swissGlow)"
          />

          {/* Glow filter */}
          <defs>
            <filter id="swissGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </motion.div>

      {/* Copy text — overlaid, not inside SVG */}
      <motion.div
        className="absolute bottom-24 text-center px-6"
        style={{ opacity: copyOp, y: copyY }}
      >
        <p className="text-hero-fg text-2xl font-semibold mb-2">
          One flat for every 200 applicants.
        </p>
        <p className="text-hero-fg/60 text-lg">
          The Swiss rental market doesn't wait.
        </p>
      </motion.div>
    </div>
  )
}
```

**Zoom math (translate-then-scale rule):**
From Jake Archibald's 2025 article on animating zoom: use `translate` before `scale` or use separate CSS properties (`scale` and `translate`). The translate values at the target scale are `offset * scale`, NOT the naive offset. In motion/react, setting `style={{ scale, x, y }}` applies translate first then scale automatically.

---

## Section 4: Browser Demo Zoom (Chapter 4)

### Structure

```
<div class="browser-chrome-wrapper">
  <div class="browser-chrome">
    <div class="traffic-lights" />
    <div class="address-bar">flatfox.ch/listings</div>
  </div>
  <div class="browser-content">
    <div class="card card-1" />   ← score appears at 0.2
    <div class="card card-2" />   ← score appears at 0.35
    <div class="card card-3" />   ← score appears at 0.5 (the 87 card)
  </div>
</div>
```

### Score Badge Pop-In

```typescript
const card1ScoreOp = useTransform(scrollProgress, [0.15, 0.25], [0, 1])
const card1ScoreScale = useTransform(scrollProgress, [0.15, 0.25], [0.5, 1])
const card2ScoreOp = useTransform(scrollProgress, [0.30, 0.40], [0, 1])
const card3ScoreOp = useTransform(scrollProgress, [0.45, 0.55], [0, 1])
```

### Card Zoom Math

Chapter 4 needs to scale the 87-score card (card3) from its natural position to fill the browser content area (not the viewport — that would be too extreme).

**Approach A (recommended): Scale the browser content area itself, not the card.**

At progress 0.60→0.80, scale the browser chrome + cards group down from 100% to ~70% and simultaneously scale card3 up so it visually fills the screen:

```typescript
// Shrink whole browser to make zoom feel more cinematic
const browserScale = useTransform(scrollProgress, [0.58, 0.75], [1, 0.75])
const browserOp    = useTransform(scrollProgress, [0.72, 0.82], [1, 0])

// Card 3 zoom: scale from 1 to ~5 from its center
const card3Scale   = useTransform(scrollProgress, [0.60, 0.80], [1, 5])
// Translate card3 to viewport center (rough, assumes card3 starts at ~bottom-right)
const card3X       = useTransform(scrollProgress, [0.60, 0.80], [0, -60])
const card3Y       = useTransform(scrollProgress, [0.60, 0.80], [0, -140])
```

**Approach B: CSS `transform-origin` trick.**

Set `transformOrigin: "50% 50%"` on the card being zoomed. Set its `scale` via `useTransform`. This scales from the card's own center. Then shift the card to viewport center using `x` and `y` motion values.

Calculate scale needed: if card is 300px wide and viewport is 1200px wide → scale = 4.

```typescript
// Targeted card zoom — keeps card centered in viewport
const zoomedCardScale = useTransform(scrollProgress, [0.60, 0.80], [1, 4])
// Translate to center: card starts at roughly x=+200px from viewport center
// At scale 4, to keep it centered: translate = -200 (then scale amplifies position)
// Use separate scale + translate (not combined transform):
const zoomedCardTX = useTransform(scrollProgress, [0.60, 0.80], [0, -200])
const zoomedCardTY = useTransform(scrollProgress, [0.60, 0.80], [0, -100])

// Analysis panel slides in from right after zoom completes
const analysisX  = useTransform(scrollProgress, [0.82, 0.92], [60, 0])
const analysisOp = useTransform(scrollProgress, [0.82, 0.92], [0, 1])
```

**Practical implementation note:** The exact pixel offsets depend on the rendered layout. Rather than computing exact offsets at build time, use a `useLayoutEffect` at mount to measure the card's position with `getBoundingClientRect()`, store in state, and derive the `useTransform` output ranges from those measurements. However, this requires careful SSR handling. The simpler approach is to hard-code approximate values and tune visually.

### Browser Chrome Markup Pattern

```typescript
function BrowserChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
        </div>
        <div className="flex-1 mx-4 bg-white/10 rounded px-3 py-1 text-xs text-white/40">
          flatfox.ch/listings
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
```

---

## Section 5: Load Animation — Word-by-Word Headline (Chapter 1)

Chapter 1 is NOT scroll-driven — it triggers on page load. Use standard motion animate with stagger delays.

### Pattern

```typescript
// Source: https://motion.dev/docs/react-animation
"use client"

import { motion } from "motion/react"
import { ease, duration } from "@/lib/motion"

const LINE_1 = ["Your", "next", "home."]
const LINE_2 = ["Already", "found."]
// Pause between lines achieved by higher delay index on line 2

export function ChapterHook() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="h-screen bg-hero-bg flex flex-col items-center justify-center">
      <div className="text-center">
        <h1
          className="text-hero-fg mb-4"
          style={{
            fontSize: "var(--text-display-size)",
            fontWeight: "var(--text-display-weight)",
            letterSpacing: "var(--text-display-ls)",
          }}
        >
          {/* Screen reader reads the full text; spans are aria-hidden */}
          <span className="sr-only">Your next home. Already found.</span>
          <span aria-hidden>
            {LINE_1.map((word, i) => (
              <motion.span
                key={word + i}
                className="inline-block mr-[0.25em]"
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.15,
                  duration: duration.moderate,
                  ease: ease.enter,
                }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          <br />
          <span aria-hidden>
            {LINE_2.map((word, i) => (
              <motion.span
                key={word + i}
                className="inline-block mr-[0.25em]"
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  // LINE_1.length * 0.15 = 0.45s base delay, plus 0.4s pause, plus per-word
                  delay: LINE_1.length * 0.15 + 0.4 + i * 0.15,
                  duration: duration.moderate,
                  ease: ease.enter,
                }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Logo fades in after all words */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: (LINE_1.length + LINE_2.length) * 0.15 + 0.6,
            duration: duration.slow,
            ease: ease.enter,
          }}
        >
          <span className="text-hero-teal text-xl font-bold tracking-wider">
            HomeMatch
          </span>
        </motion.div>
      </div>
    </section>
  )
}
```

**Key notes:**
- `"use client"` required (useReducedMotion)
- `inline-block` on each `motion.span` is required — `y` transform does not work on `display: inline`
- Pause between "Your next home." and "Already found." achieved with `delay: LINE_1.length * 0.15 + PAUSE_DURATION + i * 0.15`
- `sr-only` span provides accessible text for screen readers; animated spans are `aria-hidden`
- **splitText is NOT available** in the standard `motion` package — it's in `motion-plus` (paid). Manual word splitting is the correct approach here.

---

## Section 6: CountUp Integration

### Current CountUp Behavior

The existing `CountUp.tsx` uses `useInView(ref, { once: true })` internally. For Chapter 5, the CountUp component lives inside a sticky scroll chapter where `isInView` will return `true` as soon as the chapter enters the viewport — which is the entire time the 200vh outer container is visible. This is actually the **correct and desired behavior** for Chapter 5.

**Recommended approach: Keep existing CountUp unchanged, use `useInView` with `margin`.**

```typescript
// Chapter 5: CountUp is visible inside the sticky section.
// The sticky section is always "in view" during the chapter.
// CountUp's own useInView fires once when the sticky section first appears.
// This is the right UX — the count starts when the user arrives at Chapter 5.

export function ChapterScore() {
  const chapterRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // Score bars animate via scrollProgress
  const bar1Width = useTransform(scrollProgress, [0.2, 0.5], ["0%", "92%"])
  const bar2Width = useTransform(scrollProgress, [0.3, 0.6], ["0%", "88%"])
  const bar3Width = useTransform(scrollProgress, [0.4, 0.7], ["0%", "75%"])

  return (
    <div ref={chapterRef} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        <div className="text-center">
          {/* CountUp fires when this sticky div enters viewport */}
          <div className="text-[12rem] font-bold text-hero-teal leading-none">
            <CountUp target={87} duration={2.0} />
          </div>
          <p className="text-hero-fg/60 text-xl mb-12">match score</p>

          {/* Score bars via scrollProgress */}
          <div className="space-y-4 w-80 mx-auto">
            {[
              { label: "Location", motionWidth: bar1Width },
              { label: "Size",     motionWidth: bar2Width },
              { label: "Price",    motionWidth: bar3Width },
            ].map(({ label, motionWidth }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-hero-fg/60">{label}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-hero-teal rounded-full"
                    style={{ width: motionWidth }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**If scroll-position control is needed (CountUp only fires at 30% through chapter):** Create a new `CountUpControlled` variant that accepts a `trigger: boolean` prop instead of using `useInView` internally. The chapter parent reads `scrollYProgress` via `useMotionValueEvent` and sets trigger state when progress crosses a threshold. This is a minor addition if needed.

---

## Section 7: Performance and Accessibility

### Motion Values: No Re-Render Architecture

```
scroll event
    ↓
motion.dev ScrollTimeline / rAF
    ↓
MotionValue.set(newValue)
    ↓
useTransform() derived values update
    ↓
style.transform / style.opacity written to DOM directly
    ↓
Browser compositor (GPU layer) — no React re-render
```

**Confirmed by motion docs:** "Changes to the motion value will update the DOM without triggering a React re-render." All `style={{ x, y, opacity, scale }}` props on `motion.*` elements bypass React's render cycle entirely.

### useReducedMotion Pattern for Scroll Chapters

```typescript
"use client"

import { useReducedMotion, useTransform } from "motion/react"
import type { MotionValue } from "motion/react"

export function ChapterSwiss({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const shouldReduceMotion = useReducedMotion()

  // With reduced motion: show final states immediately
  const swissGlow = shouldReduceMotion
    ? useTransform(scrollProgress, [0, 1], [1, 1])   // always 1
    : useTransform(scrollProgress, [0.55, 0.70], [0, 1])

  const copyOp = shouldReduceMotion
    ? useTransform(scrollProgress, [0, 1], [1, 1])   // always visible
    : useTransform(scrollProgress, [0.72, 0.85], [0, 1])

  // ... same pattern for all animated values
}
```

**Alternative (cleaner):** Wrap the entire chapter in a check:

```typescript
if (shouldReduceMotion) {
  return <ChapterSwissStatic />  // A simple static layout with final state
}
return <ChapterSwissAnimated scrollProgress={scrollProgress} />
```

### will-change Guidance

- Apply `will-change: transform` only to elements that animate on every scroll tick (the SVG globe container, the isometric house group, the card zoom div)
- Do NOT apply globally or to elements that animate once
- Remove `will-change` when the chapter's sticky container is no longer in view (use `useMotionValueEvent` to detect scrollProgress reaching 0 or 1)
- In Tailwind v4: `className="will-change-transform"` (maps to `will-change: transform`)

### Performance Tier Summary (from motion.dev/magazine)

| Property | Tier | Notes |
|----------|------|-------|
| `transform` (scale, rotate, translate) | S/A | GPU compositor |
| `opacity` | S/A | GPU compositor |
| `filter: blur()` | C | Careful with large radii |
| SVG attribute (`cx`, `cy`, `width`) | C/D | Triggers repaint/layout |
| CSS custom variables | F | Invalidates entire style tree |

**Rule:** For per-frame animations (every scroll tick), only animate `transform` and `opacity`. All content changes (showing/hiding text blocks) use `opacity`.

### Sticky Section Layout Concerns

- `position: sticky` creates a stacking context. Ensure z-index layering is correct between chapters.
- The outer scroll-height divs stack vertically in normal flow. Chapters layer naturally.
- Add `overflow-hidden` to the sticky inner div to prevent animated elements from overflowing into adjacent chapters.
- `overscroll-behavior: none` on `html` or `body` prevents bounce-scroll on macOS from disrupting chapter boundaries.

### Next.js 15 App Router SSR Requirements

- Every chapter component that uses `useScroll`, `useTransform`, `useReducedMotion` MUST be `"use client"`
- `LandingPageContent.tsx` is already `"use client"` — chapter components can inherit this or be independently marked
- SVG inline in JSX has no SSR issues — it is pure markup
- Motion's `useScroll` ref hydration error: ensure `ref` is on a native HTML element, not a React component. All chapter outer divs are `<div ref={chapterRef}>` — correct.
- `LazyMotion` with `domAnimation` can reduce bundle size from ~34kb to ~4.6kb initial. Recommended if total animation weight matters. Wrap `LandingPageContent` in `<LazyMotion features={domAnimation}>` and use `<m.*>` instead of `<motion.*>`.

---

## Section 8: Common Pitfalls

### Pitfall 1: Ref on Sticky Inner Div Instead of Outer Container

**What goes wrong:** `scrollYProgress` always reads 0 or 1 immediately; animation plays on first render and freezes.

**Why it happens:** `useScroll` tracks the target element moving through the viewport. A sticky element doesn't move — it stays fixed. The outer div with `h-[300vh]` is what travels through the viewport.

**How to avoid:** Always attach `chapterRef` to the OUTER div (the tall one creating scroll space), not the `sticky` inner div.

**Warning signs:** `scrollYProgress` jumps to 1 immediately when chapter enters viewport.

---

### Pitfall 2: `motion.polygon`/`motion.rect` pathLength on Filled Shapes

**What goes wrong:** `pathLength: 0→1` appears to do nothing on a filled polygon with no stroke.

**Why it happens:** `pathLength` controls the stroke dash animation. Without a visible `stroke`, nothing appears to change.

**How to avoid:** Either (a) add a stroke to polygons during the "drawing" phase and fade stroke out after, or (b) use `opacity` instead of `pathLength` for filled shapes. The `pathLength` approach is better for `<path>` outlines (house frame lines). For filled faces, use staggered `opacity`.

---

### Pitfall 3: useTransform with Duplicate Input Values

**What goes wrong:** `useTransform` with `[0, 0.4, 0.4, 1]` may cause unexpected interpolation at the repeated value.

**Why it happens:** Motion handles "hold" values by snapping at the exact boundary. Values must be monotonically non-decreasing. Repeated values create a step at that point.

**How to avoid:** Use `[0, 0.399, 0.400, 1]` (slightly different) if the behavior at the hold point is important. Or use `clamp: true` (default) and two separate `useTransform` calls.

---

### Pitfall 4: Animating CSS Custom Variables via style prop

**What goes wrong:** Slow performance, style invalidation across the entire component tree.

**Why it happens:** CSS variable changes trigger full re-style even on unrelated elements.

**How to avoid:** Never do `style={{ "--my-var": motionValue }}`. Always animate concrete CSS properties: `style={{ opacity, scale, x, y }}`.

---

### Pitfall 5: SVG Attribute Animation (attrX / direct attributes) per Frame

**What goes wrong:** Janky scroll animations on mobile, dropped frames.

**Why it happens:** Animating SVG attributes like `cx`, `cy`, `r`, `width`, `height` triggers browser repaint every frame (C/D tier).

**How to avoid:** Use CSS `transform` on `<g>` wrapper elements for all position/scale changes. Reserve SVG attribute animation for one-time transitions (not per-scroll-tick).

---

### Pitfall 6: `whileInView` on Scroll-Chapter Children

**What goes wrong:** Elements animate when the chapter first enters view, but then don't respond to scroll position.

**Why it happens:** `whileInView` is boolean (in/out), not position-linked.

**How to avoid:** Use `useTransform(scrollProgress, [...], [...])` with `style={}` prop for everything inside a scroll chapter.

---

### Pitfall 7: Large `blur()` Filters on Mobile

**What goes wrong:** Switzerland glow filter causes jank on lower-end devices.

**Why it happens:** `feGaussianBlur` with large stdDeviation recalculates every paint frame.

**How to avoid:** Keep `stdDeviation` ≤ 4. Apply the filter only to the small Switzerland polygon (not the whole SVG). Alternatively, use a pre-blurred color glow via `box-shadow` or `drop-shadow()` which is GPU-accelerated.

---

### Pitfall 8: `@base-ui/react` Button Semantics with Links

**What goes wrong:** Attempting `<Button render={<Link href="/auth" />}>` — this works (HeroSection already does it), but the docs warn against it for semantic reasons.

**Why it matters here:** Chapter 7 CTA must use a Link. The correct existing pattern from `HeroSection.tsx` is:

```typescript
<Button
  render={<Link href="/auth" />}
  className="bg-hero-teal text-hero-bg ..."
>
  Create free account
</Button>
```

This is confirmed working in the existing codebase. Do NOT use `asChild` — it does not exist in `@base-ui/react`.

---

### Pitfall 9: Hydration Mismatch from window/document Access

**What goes wrong:** `getBoundingClientRect()` called during SSR throws or returns zeros, causing hydration mismatch.

**How to avoid:** All layout measurements must go in `useLayoutEffect` or `useEffect` (which only run client-side). Never call DOM APIs at module scope or in the render body.

---

## Code Examples

### Full Chapter Scaffold (TypeScript)

```typescript
// Source: verified against motion.dev/docs/react-use-scroll
"use client"

import { useRef } from "react"
import { useScroll } from "motion/react"
import type { MotionValue } from "motion/react"

interface ChapterProps {
  height: string  // e.g. "h-[300vh]"
}

function Chapter({ height }: ChapterProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  return (
    <div ref={chapterRef} className={`relative ${height}`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <ChapterContent scrollProgress={scrollYProgress} />
      </div>
    </div>
  )
}

function ChapterContent({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  // useTransform calls go here — not in parent
  return <div>...</div>
}
```

### useTransform Multi-Stop Pattern

```typescript
// Source: motion.dev/docs/react-use-transform
import { useTransform } from "motion/react"
import type { MotionValue } from "motion/react"

// Element appears, stays, then fades — within a chapter scroll
function useChapterPhase(
  scrollProgress: MotionValue<number>,
  [appearStart, appearEnd, fadeStart, fadeEnd]: [number, number, number, number]
) {
  return useTransform(
    scrollProgress,
    [appearStart, appearEnd, fadeStart, fadeEnd],
    [0, 1, 1, 0]
  )
}

// Usage:
const globeOpacity = useChapterPhase(scrollProgress, [0, 0.1, 0.8, 0.95])
```

### Score Bar Animation Pattern

```typescript
// Score bars animate width via motion value (not layout animation)
const barWidth = useTransform(
  scrollProgress,
  [0.3, 0.6],
  ["0%", "87%"],
  { ease: cubicBezier(0.22, 1, 0.36, 1) }
)

// In JSX:
<div className="h-2 bg-white/10 rounded-full overflow-hidden">
  <motion.div
    className="h-full bg-hero-teal rounded-full"
    style={{ width: barWidth }}
  />
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package, import from `motion/react` | 2024 | Confirmed in this project |
| `whileInView` for everything | `useScroll`+`useTransform` for position-linked | Framer Motion v6+ | Better precision |
| CSS scroll-snap sections | Sticky outer + sticky inner pattern | 2023+ | Smoother, more control |
| `splitText` builtin | Manual span-per-word OR `motion-plus` (paid) | 2024 | motion-plus not available here |
| GSAP for complex SVG sequences | motion/react `pathLength` + `useTransform` | 2023+ | No extra dep |
| `will-change` on everything | Selective, remove after animation | Best practice | Prevents memory bloat |

**Deprecated/outdated:**
- `framer-motion` package import: replaced by `motion/react`
- `AnimateSharedLayout`: removed, replaced by `layoutId`
- `asChild` on `@base-ui/react` Button: does not exist, use `render={}` prop

---

## Open Questions

1. **Exact card zoom pixel offsets (Chapter 4)**
   - What we know: transform math is correct; exact translate values depend on rendered card position
   - What's unclear: card3 position at runtime without measuring
   - Recommendation: Use `useLayoutEffect` + `getBoundingClientRect` on card3 ref to measure position, then compute `useTransform` output range dynamically at mount

2. **Globe longitude lines 3D foreshortening**
   - What we know: CSS `scaleX(-1 to 1)` fakes hemisphere flip; it won't perfectly foreshorten
   - What's unclear: whether the visual result is convincing enough
   - Recommendation: Start with `scaleX` animation; if it looks wrong, replace with animating SVG ellipse `rx` attribute on each longitude ellipse (lower performance but correct look — acceptable since it's not per-scroll-tick, just a CSS animation)

3. **CountUp scroll trigger timing**
   - What we know: existing `useInView` fires when sticky section enters viewport
   - What's unclear: whether firing immediately on chapter enter feels too early
   - Recommendation: Keep existing CountUp; if timing feels off, add `margin: "-30% 0px"` to `useInView` in CountUp to delay trigger until user is 30% into the chapter

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + Testing Library |
| Config file | `vitest.config.*` (check web/ directory) |
| Quick run command | `cd web && npx vitest run --reporter=dot` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | 7 chapters render without crash | unit/smoke | `vitest run components/landing` | ❌ Wave 0 |
| LAND-02 | ChapterHook word stagger renders correct words | unit | `vitest run ChapterHook` | ❌ Wave 0 |
| LAND-03 | CountUp renders target value after trigger | unit | `vitest run CountUp` | ❌ Wave 0 |
| LAND-04 | useReducedMotion shows final state (no animation) | unit | `vitest run --grep reduced-motion` | ❌ Wave 0 |
| LAND-05 | CTA Button renders as Link | unit | `vitest run ChapterCta` | ❌ Wave 0 |
| LAND-06 | IsometricHome SVG renders all polygon elements | unit | `vitest run IsometricHome` | ❌ Wave 0 |
| LAND-07 | LandingPageContent renders all 7 chapters | smoke | `vitest run LandingPageContent` | ❌ Wave 0 |

**Note:** scroll animation behavior (scrollYProgress → visual transforms) cannot be meaningfully tested in jsdom since scroll events are not functional. Tests should verify render without crash, correct element presence, and reduced-motion path.

### Wave 0 Gaps

- [ ] `web/src/components/landing/__tests__/LandingPageContent.test.tsx` — covers LAND-07
- [ ] `web/src/components/landing/chapters/__tests__/ChapterHook.test.tsx` — covers LAND-01, LAND-02, LAND-04
- [ ] `web/src/components/landing/chapters/__tests__/ChapterCta.test.tsx` — covers LAND-05
- [ ] `web/src/components/landing/svg/__tests__/IsometricHome.test.tsx` — covers LAND-06
- [ ] `web/src/components/motion/__tests__/CountUp.test.tsx` — covers LAND-03

---

## Sources

### Primary (HIGH confidence)

- `https://motion.dev/docs/react-use-scroll` — useScroll full API, offset syntax, target vs container
- `https://motion.dev/docs/react-use-transform` — useTransform overloads, clamp, ease option
- `https://motion.dev/docs/react-use-in-view` — useInView API, options, once/margin
- `https://motion.dev/docs/react-motion-value` — motion values, no-re-render architecture, useMotionValueEvent
- `https://motion.dev/docs/react-svg-animation` — pathLength, pathOffset, pathSpacing, attribute animation
- `https://motion.dev/docs/react-use-reduced-motion` — useReducedMotion API
- `https://motion.dev/troubleshooting/use-scroll-ref` — SSR hydration error cause and fix
- `https://motion.dev/magazine/web-animation-performance-tier-list` — GPU tier list, CSS variable trap
- `https://motion.dev/docs/react-scroll-animations` — sticky chapter code examples, parallax
- `https://jakearchibald.com/2025/animating-zooming/` — translate-before-scale math for zoom
- `https://base-ui.com/react/components/button` — render prop API, nativeButton prop
- Project codebase: `web/src/lib/motion.ts`, `web/src/components/motion/CountUp.tsx`, `web/src/components/landing/HeroSection.tsx`

### Secondary (MEDIUM confidence)

- `https://dev.to/heres/scroll-svg-path-with-framer-motion-54el` — verified pathLength + useScroll pattern
- `https://blog.olivierlarose.com/tutorials/zoom-parallax` — sticky container scale zoom pattern
- `https://www.jointjs.com/blog/isometric-diagrams` — isometric SVG matrix math
- `https://motion.dev/docs/split-text` — confirmed splitText is motion-plus (paid), not in standard `motion`

### Tertiary (LOW confidence)

- SVG globe codepens (ElJefe, bluebie, kgierke) — visual reference only, not used for code patterns
- Simplified Europe SVG path — hand-crafted approximation, not from geographic data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — project already has all dependencies, confirmed via package.json
- useScroll/useTransform patterns: HIGH — verified against official motion.dev docs (fetched 2026-03-27)
- Isometric SVG math: MEDIUM — coordinate formulas derived from isometric projection principles, exact pixel values need visual tuning
- SVG globe: MEDIUM — approach verified; simplified Europe path is approximate
- Card zoom math: MEDIUM — translate-before-scale principle is HIGH confidence (Jake Archibald 2025); exact pixel offsets are LOW (require runtime measurement)
- Pitfalls: HIGH — sourced from official docs, motion magazine, and existing project patterns
- Performance: HIGH — from motion.dev/magazine performance tier list

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (motion/react v12 API is stable; 90 days)
