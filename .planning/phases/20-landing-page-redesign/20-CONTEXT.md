# Phase 20: Landing Page Redesign - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the HomeMatch public landing page (`/`) as a clean, professional SaaS landing page with working scroll-triggered animations. Replace the current broken 7-chapter sticky-parallax implementation with a reliable 5-section structure. Content (final copy) is secondary — structure and animations must work correctly and look authentic.

</domain>

<decisions>
## Implementation Decisions

### Visual aesthetic
- Clean SaaS — references: Linear, Vercel, Framer. NOT Apple-minimalist.
- Animations must be complete, polished, and authentic-feeling — not cinematic experiments
- Professional and effective copy; not sparse, not overwrought
- 21dev components welcome where they fit
- Teal accent retained, existing design token system reused

### Section structure (5 sections, in order)
1. **Hero** — HomeMatch logo, problem/outcome headline, single CTA
2. **Globe** — SVG globe animating in, zooming/panning to pin Switzerland
3. **Problem** — Pain points with neat scroll-triggered animations
4. **Solution / Demo** — 3 sequential steps that animate in as you scroll:
   - Step 1: Tell us what you need (AI chat or manual preferences)
   - Step 2: We search Flatfox and match a score
   - Step 3: Full analysis so you find the right home
5. **CTA** — Final call to action

### Animation model
- **Scroll-triggered entry** — sections scroll normally; elements animate in (fade, slide, scale) as they enter the viewport
- No sticky-parallax chapters — that's what broke last time
- `whileInView` from `motion/react` is the primary pattern
- Smooth and simple quality — polished, not cinematic
- Globe section: draws in and pins Switzerland (not complex 3D spin)
- Solution section: 3 steps sequence in one by one as user scrolls

### Hero section
- Layout: centered, full-height or near-full-height
- Logo mark + headline + optional subline + single primary CTA button
- Headline angle: **problem + outcome combined**
  - Model: "Thousands of listings. One perfect match."
  - States the scale of the problem, then delivers the outcome
- CTA: "Get Started" → `/auth`
- No secondary CTA, no background animation on hero

### Copy approach
- Content / final copy is NOT locked — planner has discretion
- Placeholder copy is acceptable for now; structure and animations take priority
- Bilingual EN/DE remains required (use existing translations system)

### Claude's Discretion
- Exact headline and body copy (follow problem/outcome angle, finalize later)
- Problem section animation specifics (what animates, timing, sequencing)
- Solution step UI mockup style (icon + text, card, screenshot snippet — planner decides)
- Footer and navbar — reuse existing `LandingNavbar` and `LandingFooter`
- Whether to keep or delete existing Chapter components (planner can delete or gut them)

</decisions>

<specifics>
## Specific Ideas

- "It shouldn't be as minimalistic as Apple websites but it should have professional simple and effective copy with fantastic beautiful animations"
- "The animations are incomplete, the text is incomplete, the whole story is incomplete" — the redesign must feel *finished*
- Headline model: "Thousands of listings. One perfect match." (or similar problem → outcome structure)
- 21dev (21st.dev) has component ideas worth pulling from — check for relevant landing page components

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LandingNavbar.tsx` / `LandingFooter.tsx`: Keep as-is, pass `lang` prop
- `LandingPageContent.tsx`: Rewrite as orchestrator for 5 new sections
- `IsometricHome.tsx`: Can be repurposed or removed — not needed for new structure
- `ChapterHook` through `ChapterCTA`: All can be deleted or gutted — replaced by new sections
- `Button` component: Use `render={<Link href="/auth" />}` pattern (established in Phase 19)
- Design tokens: `--color-teal`, `--color-hero-bg`, `--color-hero-fg` etc. all available

### Established Patterns
- `motion/react` (not `framer-motion`) — all animation imports from this package
- `useReducedMotion()` fallback required in every animated component
- `whileInView` with `viewport={{ once: true }}` for scroll-triggered entry animations
- `lang` prop + `translations.ts` for all user-facing strings (EN + DE required)
- TypeScript `_DeHasAllEnKeys` guard enforces translation key symmetry at compile time
- No `'use client'` on page.tsx — `LandingPageContent` is the client boundary

### Integration Points
- `web/src/app/page.tsx` — server component, renders `<LandingPageContent />`
- `web/src/lib/translations.ts` — add new keys for all sections (remove old chapter keys)
- `web/src/app/globals.css` — animation keyframes if needed

</code_context>

<deferred>
## Deferred Ideas

- Final production copy / copywriting — later milestone
- Social proof / testimonials — deferred per PROJECT.md
- Mobile-specific layout optimisation — Phase 22 (Polish & QA)

</deferred>

---

*Phase: 20-landing-page-redesign*
*Context gathered: 2026-03-28*
