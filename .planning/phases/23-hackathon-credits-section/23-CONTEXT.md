# Phase 23: Hackathon Credits Section - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ETH Zürich + Gen-AI Hackathon credits to the landing page and auth page, and introduce a Zurich cityscape photo as a visual theme across three surfaces: the hero section (landing), the new credits section (landing), and the auth page. This phase is about brand identity and visual grounding — connecting the product to its Swiss/ETH origins.

**In scope:**
- New `SectionCredits` component added to `LandingPageContent` above `LandingFooter`
- Zurich cityscape photo added as a dimmed background layer in `SectionHero`
- Zurich cityscape photo as full-screen background on the auth page (`src/app/auth/page.tsx`)
- ETH Zürich white SVG logo sourced and placed in `/public`
- GenAI Zürich Hackathon 2026 badge recreated in code

**Not in scope:** Other auth UI changes, dashboard updates, mobile QA

</domain>

<decisions>
## Implementation Decisions

### Logo assets
- ETH Zürich: Source official white SVG logo and place in `/public` (no file provided — researcher to find official download URL)
- GenAI Zürich Hackathon badge: Recreate in code as a styled component — green + black badge style matching the reference screenshot, showing "GenAI Zürich Hackathon 2026"
- White-only variant (landing is dark-only, auth page will also be dark)

### Credits section copy
- Label text: "A project from" (English only — proper nouns, no DE translation needed)
- Layout: ETH logo | vertical divider | Hackathon badge — side by side, centered
- Matches screenshot reference exactly

### Zurich photo — hero section
- Photo placed as `position: absolute, inset-0` behind all hero content
- Opacity: ~25% (heavily dimmed so chips and product demo remain clearly readable)
- A dark overlay on top of the photo for additional contrast
- Scroll-linked opacity: photo fades out as user scrolls down (using Framer Motion `useScroll` + `useTransform`)

### Zurich photo — credits section
- Photo fills the full width/height of `SectionCredits`
- "A project from" label + logos overlaid at center/bottom
- Dark gradient overlay to ensure logos are legible

### Zurich photo — auth page
- Photo replaces current `bg-background` on the outer wrapper div
- Photo fills full screen (`min-h-screen`)
- Login card floats centered over it (existing layout preserved)
- "A project from" + ETH logo + Hackathon badge shown below the card at bottom of viewport
- Matches the reference screenshot exactly

### Photo file
- Single photo file used across all three surfaces (consistent visual)
- Placed in `/public/zurich-bg.jpg` (or `.webp` for performance)
- Researcher to identify/confirm the source image or suggest a suitable aerial Zurich dusk/sunset shot

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `motion/react` (Framer Motion v12): already installed — use `useScroll` + `useTransform` for hero scroll-fade
- `useInView` pattern: established in SectionProblem, SectionCTA — can use for credits fade-in
- `LandingFooter`: already exists; `SectionCredits` slots in just before it in `LandingPageContent`

### Established Patterns
- Absolute-positioned layers: SectionCTA uses `position: absolute, inset-0` for radial glow — same pattern for photo layer in SectionHero and SectionCredits
- CSS variable `var(--color-hero-bg)` for dark background — photo goes behind this; reduce opacity instead of fighting the variable
- `aria-hidden` on decorative elements (radial glow divs) — use same for photo layer

### Integration Points
- `LandingPageContent.tsx`: add `<SectionCredits lang={lang} />` between `<SectionCTA>` and `<LandingFooter>`
- `SectionHero.tsx`: add absolute photo layer inside the outermost section element, before existing content
- `src/app/auth/page.tsx`: outer `<div className="flex min-h-screen ...">` changes from `bg-background` to photo-background; add credits strip at bottom

</code_context>

<specifics>
## Specific Ideas

- Reference screenshot (provided by user): auth page with full-screen Zurich aerial cityscape (dusk/sunset, red-orange sky), login card floating over it, "A project from" + ETH logo (white, italic bold) + vertical divider + GenAI Zürich Hackathon badge (green on black) at bottom
- The same photo should create a visual bookend: appears at the very top of the landing page (dimmed behind hero), fades away as you scroll through the product story, then reappears full-strength on the auth page when you click "Get Started"
- Year on hackathon badge: **2026** (not 2025 as shown in reference screenshot)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within expanded Phase 23 scope

</deferred>

---

*Phase: 23-hackathon-credits-section*
*Context gathered: 2026-03-29*
