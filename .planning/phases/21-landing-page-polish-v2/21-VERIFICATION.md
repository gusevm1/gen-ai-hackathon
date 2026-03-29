---
phase: 21-landing-page-polish-v2
verified: 2026-03-28T18:21:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "Visual inspection of hero chips on xl viewport"
    expected: "7 white/95 floating property chips appear around the hero content, each with a filled color circle showing score + tier name in tier color"
    why_human: "xl:flex chips are hidden below xl breakpoint; jsdom cannot simulate viewport width"
  - test: "Problem section scroll behavior"
    expected: "Scrolling past each problem item illuminates it (full opacity + teal glow ring); items not yet in view are dimmed at ~0.25 opacity; all 3 stay lit after scrolling past the last one; scrolling back up re-dims and re-lights correctly"
    why_human: "useInView + IntersectionObserver scroll behavior cannot be simulated reliably in jsdom"
  - test: "Gradient bridge between Solution and CTA"
    expected: "A 100px-tall teal gradient band is visible between the Solution and CTA sections, transitioning from transparent to hsl(173 65% 52% / 0.07) at 50% and back to transparent"
    why_human: "Visual artifact only detectable in a browser"
  - test: "CTA radial glow + scroll-retriggerable animation"
    expected: "CTA section has a faint radial teal glow centered on the section; scrolling away and back re-triggers the fade-in + slide-up of the content block"
    why_human: "Radial gradient visibility and scroll re-trigger require browser inspection"
---

# Phase 21: Landing Page Polish v2 Verification Report

**Phase Goal:** Polish the landing page visual design — hero chips match ScoreBadge language, Problem section uses scroll-driven highlights, Solution is the visual centerpiece with enlarged demo, gradient bridge to CTA, CTA has radial glow and scroll-retriggerable animation.
**Verified:** 2026-03-28T18:21:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Hero section shows 7 floating property chips (desktop only, xl:flex) | VERIFIED | CHIPS array has 7 entries in SectionHero.tsx:28-34; each chip has `className="… hidden xl:flex …"` at line 109 |
| 2  | Each chip uses a white/95 card background (not the old dark card) | VERIFIED | `backgroundColor: 'rgba(255, 255, 255, 0.95)'` at SectionHero.tsx:112; no `hsl(0 0% 6%)` string present (regression test passes) |
| 3  | Each chip badge shows a 40x40px filled circle with score + tier label in tier color | VERIFIED | `width: 40, height: 40, backgroundColor: TIER_COLORS[chip.tier].bg` at SectionHero.tsx:131-135; tier label span at lines 139-143 |
| 4  | Chips distribute tiers: 3 excellent, 2 good, 1 fair, 1 poor | VERIFIED | CHIPS array lines 28-34: excellent×3 (scores 92, 88, 95), good×2 (83, 79), fair×1 (64), poor×1 (41) |
| 5  | Chip float animation uses varied speeds and directions per chip | VERIFIED | Each chip has unique `floatY` and `floatDuration` fields; `y: { repeat: Infinity, ease: 'easeInOut' }` transition at line 119 |
| 6  | Solution overline reads 'How to avoid this' (EN) | VERIFIED | translations.ts line 55: `landing_howit_overline: 'How to avoid this'` |
| 7  | Solution overline reads 'So vermeidest du das' (DE) | VERIFIED | translations.ts line 129: `landing_howit_overline: 'So vermeidest du das'` |
| 8  | Section-solution test updated to match new overline copy | VERIFIED | section-solution.test.tsx line 24: `getByText('How to avoid this')` — passes |
| 9  | Each problem item highlights when scrolled into view (useInView, once: false) | VERIFIED | ProblemItem in SectionProblem.tsx uses `useInView(ref, { once: false, amount: 0.5 })` at line 24; animate prop driven by isInView at lines 29-35 |
| 10 | Items not in view are dimmed (opacity 0.25) | VERIFIED | `opacity: isInView ? 1 : 0.25` at SectionProblem.tsx:30 |
| 11 | Highlighted items get teal glow box-shadow | VERIFIED | `boxShadow: isInView ? 'inset 0 0 0 1px hsl(173 65% 52% / 0.3), 0 0 28px hsl(173 65% 52% / 0.10)' : 'none'` at lines 32-34 |
| 12 | Browser demo wrapper is max-w-2xl; content area height is 360px | VERIFIED | SectionSolution.tsx line 370: `className="max-w-2xl mx-auto mb-12"`; MockBrowser content area line 290: `style={{ height: 360, overflow: 'hidden' }}` |
| 13 | Step cards have px-6 py-6 padding and text-base label / text-sm body | VERIFIED | SectionSolution.tsx line 383: `className="flex-1 text-left rounded-2xl px-6 py-6 …"`; label line 415: `className="text-base font-semibold …"`; body line 421: `className="text-sm leading-relaxed"` |
| 14 | Gradient divider sits between SectionSolution and SectionCTA | VERIFIED | LandingPageContent.tsx lines 21-28: aria-hidden div with `linear-gradient(to bottom, transparent 0%, hsl(173 65% 52% / 0.07) 50%, transparent 100%)` inserted between the two section components |
| 15 | SectionCTA has radial glow overlay + viewport once:false animation | VERIFIED | SectionCTA.tsx lines 16-22: radial-gradient absolute overlay; motion.div line 28: `viewport={{ once: false, amount: 0.3 }}`; FadeIn not imported |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/__tests__/section-hero.test.tsx` | 7-chip assertions, tier distribution, no dark card | VERIFIED | 4 tests, all pass — 7-chip count, tier label presence, dark card regression guard |
| `web/src/components/landing/SectionHero.tsx` | 7-chip CHIPS array with TIER_COLORS | VERIFIED | TIER_COLORS const lines 10-16; CHIPS array 7 entries lines 28-34; white/95 background; 40x40 circle |
| `web/src/lib/translations.ts` | landing_howit_overline updated in EN + DE | VERIFIED | EN line 55, DE line 129 — both values updated |
| `web/src/components/landing/SectionProblem.tsx` | useInView-driven per-item highlight | VERIFIED | useInView imported line 4; ProblemItem component with ref lines 15-79; animate driven by isInView |
| `web/src/components/landing/SectionSolution.tsx` | Enlarged demo (max-w-2xl, h=360) and step cards (px-6 py-6, text-base/text-sm) | VERIFIED | All 5 targeted size changes applied at lines 290, 370, 383, 415, 421 |
| `web/src/components/landing/SectionCTA.tsx` | Radial glow + motion.div viewport once:false, no FadeIn | VERIFIED | FadeIn removed; motion imported; radial-gradient overlay; viewport once:false at line 28 |
| `web/src/components/landing/LandingPageContent.tsx` | Gradient divider between Solution and CTA | VERIFIED | linear-gradient div lines 21-28 between SectionSolution and SectionCTA |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CHIPS array | ScoreBadge rendering | `TIER_COLORS[chip.tier]` lookup | WIRED | Lines 133-134 and 141 in SectionHero.tsx use `TIER_COLORS[chip.tier].bg` and `.text` for both circle and label |
| translations.ts | `landing_howit_overline` | string value change only | WIRED | Key unchanged; value updated to 'How to avoid this' (EN) and 'So vermeidest du das' (DE); SectionSolution reads via `t(lang, 'landing_howit_overline')` |
| SectionProblem item | useInView boolean | `animate` prop driven by `isInView` | WIRED | `animate={prefersReduced ? {} : { opacity: isInView ? 1 : 0.25, … }}` — no whileInView on item elements |
| LandingPageContent | gradient divider div | inserted between SectionSolution and SectionCTA | WIRED | aria-hidden div is positioned correctly between the two JSX elements at lines 20-29 |
| SectionCTA | motion.div | FadeIn removed, viewport once:false | WIRED | `viewport={{ once: false, amount: 0.3 }}` on motion.div at line 28; FadeIn import absent |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LP-03 | 21-01, 21-03 | Hero chips match ScoreBadge visual language; Solution is visual centerpiece | SATISFIED | 7 white/95 chips with TIER_COLORS palette in SectionHero; max-w-2xl browser demo, px-6 py-6 step cards in SectionSolution |
| LP-04 | 21-02 | Problem section scroll-driven highlights | SATISFIED | useInView per-item, once:false, opacity + teal glow animate in SectionProblem |
| LP-06 | 21-01, 21-03 | CTA improvements (gradient bridge, radial glow, scroll-retriggerable) | SATISFIED | Gradient divider in LandingPageContent; radial-gradient overlay + viewport once:false in SectionCTA |

---

### Anti-Patterns Found

No anti-patterns detected. No TODO/FIXME/placeholder comments found in any modified landing component. No empty implementations. No stub returns. TypeScript compiles without errors (`npx tsc --noEmit` exits clean).

---

### Test Suite Results

All 87 landing-related tests pass:

- `section-hero.test.tsx` — 4/4 passed (7-chip count, tier distribution, regression guard)
- `section-problem.test.tsx` — 5/5 passed (includes new `.py-12` structure assertion)
- `section-solution.test.tsx` — 6/6 passed (new overline copy 'How to avoid this')
- `section-cta.test.tsx` — 6/6 passed (no FadeIn, content identical)
- `landing-translations.test.ts` — 66/66 passed (all translation keys valid in both languages)

Note: `chat-page.test.tsx` has 6 pre-existing failures unrelated to phase 21 (last modified at commit `deb7d1d`, before this phase began). These are not regressions introduced by phase 21.

---

### Human Verification Required

#### 1. Hero floating chips on xl viewport

**Test:** Open the landing page in a browser at viewport width >= 1280px (xl breakpoint). Scroll to the hero section.
**Expected:** 7 white-card floating chips appear distributed around the hero content — 3 on the left side, 4 on the right — each showing an address, price, a colored circle with the score, and a tier label in the circle's color. No dark card backgrounds visible.
**Why human:** The `xl:flex` class hides chips below 1280px width; jsdom cannot simulate this.

#### 2. Problem section scroll highlights

**Test:** On a real browser, scroll slowly through the Problem section.
**Expected:** Each of the 3 pain points illuminates with full opacity and a teal glow ring as it enters the viewport center; others fade to ~25% opacity. Once all 3 have been scrolled past, all remain lit. Scrolling back up should re-dim items as they leave view, then re-illuminate them on the way back down.
**Why human:** IntersectionObserver scroll behavior requires a real browser; jsdom stubs `observe()` but does not fire callbacks.

#### 3. Gradient bridge visual

**Test:** Scroll between the Solution and CTA sections.
**Expected:** A 100px-tall band with a soft teal glow at the midpoint creates a cinematic transition between the two sections.
**Why human:** Visual gradient rendering cannot be verified programmatically.

#### 4. CTA radial glow and scroll re-trigger

**Test:** Scroll to CTA, then scroll away (to Problem section), then scroll back to CTA.
**Expected:** The CTA content block (overline, headline, subtext, button) fades in and slides up again on each return. A faint teal radial glow is visible at the center of the CTA section background.
**Why human:** `viewport: { once: false }` re-trigger and visual glow require real browser inspection.

---

### Summary

All 15 must-have truths are fully implemented and verified against the actual codebase. The phase goal is achieved: hero chips match ScoreBadge language exactly (7 chips, white/95 card, 40x40 tier-colored circle), Problem section uses `useInView` scroll-driven highlights with `once: false`, Solution section has an enlarged browser demo (max-w-2xl, 360px height) and substantial step cards (px-6 py-6, text-base/text-sm), a gradient bridge sits between Solution and CTA in LandingPageContent, and the CTA has a radial teal glow with scroll-retriggerable animation (FadeIn removed, viewport once:false). 4 items require human visual/scroll verification in a real browser.

---

_Verified: 2026-03-28T18:21:00Z_
_Verifier: Claude (gsd-verifier)_
