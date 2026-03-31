# Phase 38: Onboarding Rebuild - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the WelcomeModal on Shadcn Dialog primitives (dark-mode aware, brand-aligned). Add a proper completion state to the onboarding checklist (morphs to success instead of disappearing). Add section grouping to the checklist. Add a "Restart tour" button in Settings. No changes to the underlying driver.js tour steps, extension onboarding logic, or state persistence mechanism.

</domain>

<decisions>
## Implementation Decisions

### WelcomeModal — Component
- Use **Shadcn Dialog** (centered overlay with dimmed backdrop) — NOT the current fixed-position div
- Zero hardcoded inline styles — all styling via CSS variables and Tailwind tokens
- Dark-mode aware automatically via Shadcn's CSS variable system

### WelcomeModal — Content
- Intro sentence (before CTA): **"HomeMatch scores property listings against your preferences so you instantly know what fits."**
- CTA button: **"Let's get started"** — uses `bg-primary` (brand token, HSL 342°)
- Secondary exit: **ghost text link** ("Skip tour") below the CTA button — low visual weight, doesn't compete with CTA but is discoverable
- Keep existing Dialog close (X) button in top-right

### Checklist — Success State
- When all 8 steps complete, **replace the checklist items** with a success message — items fade out, success content fades in
- Success card content: checkmark icon + **"You're all set ✓ — start scoring on Flatfox"** + a direct link to **Flatfox.ch (new tab)**
- The Flatfox link is always direct to flatfox.ch — no smart routing based on extension install state
- Success card is **dismissible with an X button** — user closes manually; dismissed state persists (tracked like checklist active state)
- Transition is **animated fade** using existing Framer Motion FadeIn component (~150ms items out, success in) — consistent with DS-02 motion patterns

### Checklist — Section Grouping
- Steps 1–4 (web app): labeled **"In the app"** with a small `text-muted-foreground text-xs` section header above step 1
- Steps 5–8 (extension): labeled **"In the extension"** with the same small muted section header above step 5
- Extension steps (5–8) are **`opacity-50` dimmed** until the user reaches step 5 — clears to full opacity when step 5 is reached
- Both labels use the same visual treatment (symmetric structure)

### Settings — Tour Re-access
- New **dedicated section at the bottom** of the Settings page, titled "Onboarding Tour"
- Button copy: **"Restart tour"** — always resets to step 1 regardless of prior state
- Button style: **outline/secondary** — utility action, not a primary CTA; consistent with other Settings buttons
- Behavior: calls `startTour()` from `useOnboardingContext`, same as the existing NavUser dropdown "Take a Tour" entry

### Claude's Discretion
- Exact wording of the "In the app" / "In the extension" section labels (e.g., could be "On the web app →" or "In the extension →")
- Section heading text in the new Settings "Onboarding Tour" card (e.g., "Take the tour again" as description)
- Whether the checklist success card reuses the existing Shadcn Card or is a new styled variant
- Exact delay values for the fade transition (stay within ~100–200ms)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Shadcn Dialog` (`web/src/components/ui/dialog.tsx`): Full suite (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter) — ready to use for WelcomeModal rebuild
- `Shadcn Card` (`web/src/components/ui/card.tsx`): Already used by OnboardingChecklist — continue using for success state
- `Shadcn Button` (`web/src/components/ui/button.tsx`): `variant="default"` for primary CTA, `variant="outline"` for Settings button, ghost link for skip
- `FadeIn` (`web/src/components/motion/FadeIn.tsx`): Has `animate` prop (added in Phase 37) — use for checklist→success transition
- `useOnboardingContext` (`web/src/components/onboarding/OnboardingProvider.tsx`): Exposes `startTour()` — reuse in Settings "Restart tour" button

### Current Onboarding Files
- `web/src/components/onboarding/OnboardingProvider.tsx` (lines 26–102): WelcomeModal — pure React inline styles, hardcoded `#111` button. Full rebuild target.
- `web/src/components/onboarding/OnboardingChecklist.tsx`: Currently returns `null` on completion (unmounts). Add success state + section grouping here.
- `web/src/app/(dashboard)/settings/page.tsx`: Settings page — add "Onboarding Tour" section at bottom

### Established Patterns
- `bg-primary` / `hover:bg-primary/90`: Brand button pattern established in Phase 37 DS-01 cleanup — use for CTA
- `text-muted-foreground text-xs`: Muted label pattern used throughout the codebase for secondary text
- `opacity-50`: Dimming pattern used on disabled/inactive UI elements

### Integration Points
- `OnboardingProvider.tsx` → `showWelcome` state controls WelcomeModal visibility — preserve this trigger, just swap the component
- `OnboardingChecklist.tsx` → `isActive` check (returns null) needs to be replaced with success state check using `onboarding_completed` flag
- Settings page → import `useOnboardingContext` and call `startTour()` on button click

</code_context>

<specifics>
## Specific Requirements

- ONB-01: WelcomeModal — Shadcn Dialog, zero hardcoded inline styles, dark-mode aware
- ONB-02: WelcomeModal — `bg-primary` on CTA button, one-sentence value prop before CTA
- ONB-03: Checklist — "In the extension" section label above steps 5–8 (plus symmetric "In the app" above 1–4)
- ONB-04: Checklist — morphs to success state on completion (does NOT disappear), direct Flatfox.ch link
- ONB-05: Settings — "Restart tour" outline button in a new "Onboarding Tour" section at bottom of Settings page

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-onboarding-rebuild*
*Context gathered: 2026-04-01*
