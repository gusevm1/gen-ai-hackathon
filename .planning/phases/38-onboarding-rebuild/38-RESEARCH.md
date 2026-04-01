# Phase 38: Onboarding Rebuild - Research

**Researched:** 2026-04-01
**Domain:** React component rebuild — Shadcn/Base-UI Dialog, Framer Motion, onboarding state machine
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**WelcomeModal — Component**
- Use Shadcn Dialog (centered overlay with dimmed backdrop) — NOT the current fixed-position div
- Zero hardcoded inline styles — all styling via CSS variables and Tailwind tokens
- Dark-mode aware automatically via Shadcn's CSS variable system

**WelcomeModal — Content**
- Intro sentence (before CTA): "HomeMatch scores property listings against your preferences so you instantly know what fits."
- CTA button: "Let's get started" — uses `bg-primary` (brand token, HSL 342°)
- Secondary exit: ghost text link ("Skip tour") below the CTA button — low visual weight, doesn't compete with CTA but is discoverable
- Keep existing Dialog close (X) button in top-right

**Checklist — Success State**
- When all 8 steps complete, replace the checklist items with a success message — items fade out, success content fades in
- Success card content: checkmark icon + "You're all set ✓ — start scoring on Flatfox" + a direct link to Flatfox.ch (new tab)
- The Flatfox link is always direct to flatfox.ch — no smart routing based on extension install state
- Success card is dismissible with an X button — user closes manually; dismissed state persists (tracked like checklist active state)
- Transition is animated fade using existing Framer Motion FadeIn component (~150ms items out, success in) — consistent with DS-02 motion patterns

**Checklist — Section Grouping**
- Steps 1–4 (web app): labeled "In the app" with a small `text-muted-foreground text-xs` section header above step 1
- Steps 5–8 (extension): labeled "In the extension" with the same small muted section header above step 5
- Extension steps (5–8) are `opacity-50` dimmed until the user reaches step 5 — clears to full opacity when step 5 is reached
- Both labels use the same visual treatment (symmetric structure)

**Settings — Tour Re-access**
- New dedicated section at the bottom of the Settings page, titled "Onboarding Tour"
- Button copy: "Restart tour" — always resets to step 1 regardless of prior state
- Button style: outline/secondary — utility action, not a primary CTA; consistent with other Settings buttons
- Behavior: calls `startTour()` from `useOnboardingContext`, same as the existing NavUser dropdown "Take a Tour" entry

### Claude's Discretion
- Exact wording of the "In the app" / "In the extension" section labels (e.g., could be "On the web app →" or "In the extension →")
- Section heading text in the new Settings "Onboarding Tour" card (e.g., "Take the tour again" as description)
- Whether the checklist success card reuses the existing Shadcn Card or is a new styled variant
- Exact delay values for the fade transition (stay within ~100–200ms)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ONB-01 | WelcomeModal uses Shadcn Dialog/Card components — zero hardcoded inline styles | Shadcn Dialog is Base-UI Dialog (`web/src/components/ui/dialog.tsx`) — confirmed ready; `DialogContent` uses `bg-background` CSS var automatically dark-mode aware |
| ONB-02 | WelcomeModal respects dark/light mode via CSS variables | `bg-background`, `text-foreground`, `text-muted-foreground` tokens on `DialogContent` — no additional work needed, inherited automatically |
| ONB-03 | WelcomeModal shows brand primary color on the CTA button | `Button variant="default"` compiles to `bg-primary text-primary-foreground hover:bg-primary/90` — confirmed in button.tsx |
| ONB-04 | WelcomeModal copy includes one sentence explaining what HomeMatch does before asking user to start | Static string in JSX; locked copy from CONTEXT.md |
| ONB-05 | Onboarding checklist groups steps 5–8 under a visible "In the extension →" section label | Section label is a `<p>` or `<span>` with `text-muted-foreground text-xs` between items 4 and 5 in the CHECKLIST_ITEMS map loop — requires loop refactor to grouped render |
| ONB-06 | When onboarding completes, checklist morphs into a success state: "You're all set ✓ — start scoring on Flatfox" with a direct Flatfox link | `onboarding_completed` flag already exists in OnboardingState; checklist currently returns null — replace null return with success card; FadeIn animate prop drives transition |
| ONB-07 | User can re-access the tour from Settings after dismissing the checklist | Settings page is a client component (`"use client"`); import `useOnboardingContext` and call `startTour()` on button click — straightforward addition |
</phase_requirements>

---

## Summary

Phase 38 is a pure front-end component rebuild with no backend changes. All three work streams (WelcomeModal, OnboardingChecklist, Settings) touch existing files that are already fully understood. No new libraries need to be installed — the stack (Shadcn/Base-UI Dialog, Button, Card, Framer Motion `FadeIn`, `useOnboardingContext`) is already present and tested.

The most structurally significant change is to `OnboardingChecklist.tsx`. It currently renders a flat list and returns `null` when `isActive` is false or `onboarding_completed` is true. The rebuild must: (a) split the flat list into two labeled groups, (b) add `opacity-50` dimming to group 2 until step 5, and (c) replace the `null` return with a success card that is shown when `onboarding_completed === true` and the success card has not itself been dismissed. Dismissal of the success card needs its own local state (or a localStorage flag) — this is the one piece where a small design decision remains (see Open Questions).

The `WelcomeModal` rebuild is the cleanest of the three tasks: replace the fixed-div + inline-style implementation inside `OnboardingProvider.tsx` with a Shadcn `Dialog` controlled by `showWelcome` state. The `Dialog` open/close prop maps directly to `showWelcome`. The `DialogContent` provides backdrop, centering, and dark-mode automatically.

**Primary recommendation:** Implement in three discrete tasks — WelcomeModal first (self-contained), then Checklist grouping + success state (related concerns, same file), then Settings addition (one-liner import + JSX block). Write Vitest unit tests for each component change following the `src/__tests__/*.test.tsx` pattern.

---

## Standard Stack

### Core (already installed — no npm install required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.2.0 | Dialog primitives (used by Shadcn `dialog.tsx`) | Project's Dialog component wraps Base-UI Dialog, not Radix |
| `motion` (Framer Motion) | ^12.38.0 | FadeIn animation for checklist transition | Already in use; `FadeIn` component with `animate` prop added Phase 37 |
| `lucide-react` | ^0.577.0 | Icons (`CheckCircle2`, `X`, `ExternalLink`) | Already used in OnboardingChecklist |
| `class-variance-authority` | ^0.7.1 | `buttonVariants` for consistent button classes | Used throughout project |

### Existing UI Components to Reuse

| Component | File | Usage in Phase 38 |
|-----------|------|--------------------|
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` | `web/src/components/ui/dialog.tsx` | WelcomeModal shell |
| `Button` | `web/src/components/ui/button.tsx` | CTA (`variant="default"`), skip ghost link, Settings outline button |
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | `web/src/components/ui/card.tsx` | Checklist card (already used), success state card |
| `FadeIn` | `web/src/components/motion/FadeIn.tsx` | Checklist → success transition via `animate` prop |

**Important:** The project does NOT use Radix Dialog. `dialog.tsx` wraps `@base-ui/react/dialog`. Do not import from `@radix-ui/react-dialog`.

---

## Architecture Patterns

### Recommended File Changes

```
web/src/components/onboarding/
├── OnboardingProvider.tsx   # Extract WelcomeModal to standalone component; rebuild with Shadcn Dialog
└── OnboardingChecklist.tsx  # Add section grouping + success state

web/src/app/(dashboard)/settings/
└── page.tsx                 # Add "Onboarding Tour" section at bottom
```

No new files needed. All changes are edits to existing files.

### Pattern 1: Shadcn Dialog controlled by boolean state

The existing `showWelcome` state in `OnboardingProvider.tsx` maps directly to Dialog's `open` prop.

```tsx
// Source: web/src/components/ui/dialog.tsx (Base-UI wrapper)
// Dialog.Root accepts open + onOpenChange for controlled usage

<Dialog open={showWelcome} onOpenChange={(open) => { if (!open) handleWelcomeExit(); }}>
  <DialogContent showCloseButton>
    <DialogHeader>
      <DialogTitle>Welcome to HomeMatch!</DialogTitle>
      <DialogDescription>
        HomeMatch scores property listings against your preferences so you instantly know what fits.
      </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-2 pt-2">
      <Button onClick={handleWelcomeStart}>Let&apos;s get started</Button>
      <button
        onClick={handleWelcomeExit}
        className="text-xs text-muted-foreground hover:text-foreground text-center cursor-pointer"
      >
        Skip tour
      </button>
    </div>
  </DialogContent>
</Dialog>
```

Key: `DialogContent` already uses `bg-background` and `text-sm` — both dark-mode aware via CSS vars. The `showCloseButton` prop adds the X button in the top-right automatically.

### Pattern 2: Checklist grouped render with section labels

Replace the flat `.map()` on `CHECKLIST_ITEMS` with a two-group render. Use the `text-muted-foreground text-xs` label pattern for section headers.

```tsx
// Group definition (replaces the flat CHECKLIST_ITEMS constant)
const GROUP_APP = CHECKLIST_ITEMS.slice(0, 4);   // steps 1–4
const GROUP_EXT = CHECKLIST_ITEMS.slice(4, 8);   // steps 5–8

// In render:
<ul className="space-y-2">
  <li className="text-xs text-muted-foreground font-medium pb-0.5">In the app</li>
  {GROUP_APP.map(renderItem)}

  <li className={cn(
    "text-xs text-muted-foreground font-medium pt-1.5 pb-0.5",
    step < 5 && "opacity-50"
  )}>
    In the extension
  </li>
  <div className={cn("space-y-2", step < 5 && "opacity-50")}>
    {GROUP_EXT.map(renderItem)}
  </div>
</ul>
```

### Pattern 3: Success state with FadeIn animate prop

`FadeIn` with `animate` prop (added in Phase 37) supports controlled state-driven animation. Use `animate="visible"` to trigger fade-in, `animate="exit"` to fade out.

```tsx
// Source: web/src/components/motion/FadeIn.tsx
// animate prop enables mount-mode (controlled by parent state, not viewport)

{showSuccess ? (
  <FadeIn animate="visible" variants={fadeInVariants}>
    <Card>
      <CardContent className="px-4 py-4 text-center">
        <CheckCircle2 className="size-6 text-green-500 mx-auto mb-2" />
        <p className="text-sm font-medium">You&apos;re all set ✓</p>
        <a href="https://flatfox.ch" target="_blank" rel="noopener noreferrer"
           className="text-xs text-primary underline mt-1 block">
          Start scoring on Flatfox
        </a>
      </CardContent>
    </Card>
  </FadeIn>
) : (
  <FadeIn animate="visible">
    {/* checklist items */}
  </FadeIn>
)}
```

Use `fadeInVariants` from `@/lib/motion` (opacity only, no y-offset) for the success card — it is a pure opacity transition, appropriate for content replacement. Duration tokens: `duration.fast` (0.15s) for items-out, `duration.moderate` (0.25s) for success-in.

### Pattern 4: Settings page "Restart tour" button

The Settings page is already a client component (`"use client"`). Import `useOnboardingContext` and call `startTour()` directly.

```tsx
// Source: web/src/app/(dashboard)/settings/page.tsx pattern
import { useOnboardingContext } from "@/components/onboarding/OnboardingProvider"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

// In component:
const { startTour } = useOnboardingContext()

// In JSX (bottom of page, after Download Extension section):
<div className="mt-10">
  <h2 className="text-lg font-semibold mb-1">Onboarding Tour</h2>
  <p className="text-sm text-muted-foreground mb-4">
    {/* Description — Claude's discretion */}
    Take the tour again to revisit the setup steps.
  </p>
  <Button variant="outline" onClick={startTour}>
    <RotateCcw className="size-4 mr-2" />
    Restart tour
  </Button>
</div>
```

### Anti-Patterns to Avoid

- **Do not use `@radix-ui/react-dialog`** — the project uses `@base-ui/react/dialog` via `web/src/components/ui/dialog.tsx`. Importing from Radix will add a new dependency and conflict.
- **Do not hardcode colors** — `#111`, `#555`, `#888`, `#ddd` are all present in the current WelcomeModal. All must be replaced with CSS variable tokens (`text-foreground`, `text-muted-foreground`, `border-border`).
- **Do not use `pointerEvents: 'none'` workaround** — the current modal uses this to create a "non-blocking" feel. The Dialog primitive handles z-index and overlay correctly.
- **Do not call `skip()` from Dialog's onOpenChange on every close** — the X button in `DialogContent` fires the close event. The `onOpenChange` handler should call `handleWelcomeExit()` (which calls `skip()`), but verify this doesn't double-fire with the explicit "Skip tour" link.
- **Do not manage success dismissal in Supabase** — dismissed state for the success card should be local React state (reset on page reload is acceptable) or localStorage. Adding a new DB field is out of scope for this phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark-mode aware modal overlay | Custom CSS backdrop | `DialogOverlay` in `dialog.tsx` | Already handles `backdrop-blur-xs`, opacity, dark-mode tokens |
| Modal centering | `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` | `DialogContent` | Already handles centering with animation, focus trap, `aria-modal` |
| Fade transition | Custom CSS keyframes or inline style transition | `FadeIn` with `animate` prop + `fadeInVariants` | Consistent with DS-02 motion system; respects `useReducedMotion` |
| Close button in modal | Custom `<button>` with position:absolute | `showCloseButton` prop on `DialogContent` | Already implemented in `dialog.tsx` line 62–78 |

---

## Common Pitfalls

### Pitfall 1: Dialog `open` prop vs uncontrolled
**What goes wrong:** If `Dialog` is used without `open` prop (uncontrolled), it manages its own open state and the `showWelcome` state in `OnboardingProvider` becomes disconnected. The modal could become impossible to close programmatically.
**How to avoid:** Always pass `open={showWelcome}` and `onOpenChange`. Base-UI Dialog Root accepts `open` + `onOpenChange` for controlled mode.
**Warning signs:** Modal doesn't close when `handleWelcomeExit` is called; `showWelcome` is false but modal is still visible.

### Pitfall 2: Success state triggers when `isActive` is false (skip case)
**What goes wrong:** `OnboardingChecklist.tsx` currently checks `if (!isActive || !state) return null`. If we add success state, we must NOT show the checklist (or the success card) when the user just skipped the tour mid-way — only show success when `onboarding_completed === true`.
**How to avoid:** The condition should be:
```
if (!state) return null;
if (!isActive && !state.onboarding_completed) return null; // skipped — show nothing
if (state.onboarding_completed && !successDismissed) return <SuccessCard />;
if (!isActive) return null;
// else show checklist
```
**Warning signs:** Success card appears when user clicks "Skip tour" on step 3.

### Pitfall 3: `FadeIn` animate prop — `"visible"` vs `"exit"` state
**What goes wrong:** `FadeIn` in mount-mode (`animate !== undefined`) uses `initial="hidden"` always. If `animate` is never set to a non-hidden state, the component stays invisible.
**How to avoid:** For the success card, always render with `animate="visible"`. For the checklist-to-success transition, conditionally render one or the other (not animate between them on the same element).
**Warning signs:** Success card mounts but is invisible (opacity: 0).

### Pitfall 4: `useOnboardingContext` in Settings requires OnboardingProvider in tree
**What goes wrong:** `useOnboardingContext` throws if not inside `OnboardingProvider`. If Settings is rendered outside the provider boundary, adding the hook will crash.
**How to avoid:** Verify `OnboardingProvider` wraps the `(dashboard)` layout. Given it's already used by the checklist (which renders on the dashboard), this is almost certainly already in place — but confirm during implementation.
**Warning signs:** "useOnboardingContext must be used inside OnboardingProvider" console error.

### Pitfall 5: Dialog renders outside `(dashboard)` layout tree
**What goes wrong:** The WelcomeModal renders via `OnboardingProvider.tsx` which is part of the layout. If `DialogPortal` appends to `document.body` (which Base-UI does by default), it will render correctly — but if theme classes are applied to a child div rather than `<html>`, dark mode may not propagate.
**How to avoid:** Confirm theme class is on `<html>` (standard Next-Themes behavior). No action needed if the existing modals/dialogs in the project already work in dark mode.
**Warning signs:** Dialog background is white in dark mode despite `bg-background`.

---

## Code Examples

### WelcomeModal controlled Dialog pattern

```tsx
// Source: web/src/components/ui/dialog.tsx — Base-UI wrapper API
// open prop = controlled; onOpenChange = close handler

<Dialog open={showWelcome} onOpenChange={(open) => { if (!open) handleWelcomeExit(); }}>
  <DialogContent showCloseButton className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Welcome to HomeMatch!</DialogTitle>
      <DialogDescription>
        HomeMatch scores property listings against your preferences so you instantly know what fits.
      </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-3 pt-2">
      <Button className="w-full" onClick={handleWelcomeStart}>
        Let&apos;s get started
      </Button>
      <button
        onClick={handleWelcomeExit}
        className="text-xs text-muted-foreground hover:text-foreground text-center cursor-pointer transition-colors"
      >
        Skip tour
      </button>
    </div>
  </DialogContent>
</Dialog>
```

### Checklist success state with dismissal

```tsx
// Source: web/src/components/onboarding/OnboardingChecklist.tsx pattern
// onboarding_completed flag is already in OnboardingState

const [successDismissed, setSuccessDismissed] = useState(false);

if (!state) return null;
if (!isActive && !state.onboarding_completed) return null;
if (state.onboarding_completed && !successDismissed) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-64">
      <FadeIn animate="visible" variants={fadeInVariants}>
        <Card className="shadow-lg border">
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  <span className="text-sm font-medium">You&apos;re all set ✓</span>
                </div>
                <a
                  href="https://flatfox.ch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Start scoring on Flatfox
                </a>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-5 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setSuccessDismissed(true)}
              >
                <X className="size-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
if (!isActive) return null;
// ... rest of checklist render
```

### Section grouping render structure

```tsx
// Group labels use text-muted-foreground text-xs — established codebase pattern
const step = state.onboarding_step;
const isExtDimmed = step < 5;

<ul className="space-y-2">
  <li className="text-xs text-muted-foreground font-medium pb-0.5">In the app</li>
  {CHECKLIST_ITEMS.slice(0, 4).map(({ labelKey, completedFromStep }) => (
    <ChecklistItem key={labelKey} labelKey={labelKey} checked={step >= completedFromStep} language={language} />
  ))}
  <li className={cn("text-xs text-muted-foreground font-medium pt-1.5 pb-0.5", isExtDimmed && "opacity-50")}>
    In the extension
  </li>
  <div className={cn(isExtDimmed && "opacity-50")}>
    {CHECKLIST_ITEMS.slice(4, 8).map(({ labelKey, completedFromStep }) => (
      <ChecklistItem key={labelKey} labelKey={labelKey} checked={step >= completedFromStep} language={language} />
    ))}
  </div>
</ul>
```

---

## Key Implementation Insights

### OnboardingProvider.tsx: WelcomeModal refactor scope

The current `WelcomeModal` component is defined inline in `OnboardingProvider.tsx` (lines 36–102). It can either stay inline (now using Shadcn Dialog instead of a raw div) or be extracted to a separate file. Either is valid — keeping it inline is simpler for this phase since the component is tightly coupled to `showWelcome` state and handler props. The `Dialog` open/close mechanism removes the need for the `pointerEvents: 'none'` overlay workaround.

The `onOpenChange` prop on `Dialog` fires when the user clicks the backdrop or the X button. Set it to call `handleWelcomeExit` to ensure the skip path is taken (consistent with the current X button behavior). The "Skip tour" ghost link calls `handleWelcomeExit` explicitly. No double-fire risk since `handleWelcomeExit` calls `setShowWelcome(false)` and `skip()` — idempotent operations.

### OnboardingChecklist.tsx: isActive vs onboarding_completed

Current guard: `if (!isActive || !state) return null`

This causes the "silent disappear" bug — when `onboarding_completed` becomes true, `isActive` becomes false, so the checklist vanishes. The fix is:

1. Keep showing the checklist while `isActive` is true (normal operation)
2. When `onboarding_completed` is true AND `isActive` is false, show the success card
3. When `isActive` is false AND `onboarding_completed` is false, show nothing (user skipped)

The `onboarding_completed` flag is set in `use-onboarding.ts` `advance()` when `nextStep > 9`, and also in `completeTour()`. It is read from Supabase via `getOnboardingState()` → `profiles.preferences.onboarding`.

### translations.ts: New keys needed

The phase adds UI strings that should follow the existing translation pattern. New keys needed in both `en` and `de` sections:

- `onboarding_success_title` — "You're all set ✓"
- `onboarding_success_cta` — "Start scoring on Flatfox"
- `onboarding_section_app` — "In the app"
- `onboarding_section_ext` — "In the extension"
- `settings_onboarding_title` — "Onboarding Tour"
- `settings_onboarding_btn` — "Restart tour"

Alternatively, hardcode English-only strings for UI copy (the "Recommended" badge in Phase 36 was hardcoded). Given this is product branding copy and the translation system is already established, adding keys is the right approach and consistent with `onboarding_checklist_*` keys already in place.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (jsdom) |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONB-01 | WelcomeModal renders with Dialog component, no inline styles | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ Wave 0 |
| ONB-02 | WelcomeModal renders correctly in dark mode (CSS vars) | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ Wave 0 |
| ONB-03 | WelcomeModal CTA button has `bg-primary` class | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ Wave 0 |
| ONB-04 | WelcomeModal renders value-prop sentence before CTA | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ Wave 0 |
| ONB-05 | Checklist renders "In the extension" section label | unit | `npx vitest run src/__tests__/onboarding-checklist.test.tsx` | ❌ Wave 0 |
| ONB-06 | Checklist renders success state when `onboarding_completed=true` | unit | `npx vitest run src/__tests__/onboarding-checklist.test.tsx` | ❌ Wave 0 |
| ONB-07 | Settings page renders "Restart tour" button | unit | `npx vitest run src/__tests__/settings-page.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `web/src/__tests__/onboarding-welcome-modal.test.tsx` — covers ONB-01, ONB-02, ONB-03, ONB-04
- [ ] `web/src/__tests__/onboarding-checklist.test.tsx` — covers ONB-05, ONB-06
- [ ] `web/src/__tests__/settings-page.test.tsx` — covers ONB-07

**Existing infrastructure is sufficient** — no framework install needed. Tests follow the pattern in `theme-toggle.test.tsx` and `navbar.test.tsx`: mock external dependencies (`useOnboardingContext`, `next/navigation`), render component, assert on DOM nodes.

---

## Open Questions

1. **Success card dismissed state persistence**
   - What we know: `onboarding_completed` is persisted in Supabase. No separate "success_card_dismissed" flag exists.
   - What's unclear: Should the success card reappear on next page load after being dismissed? Or is session-only dismissal acceptable?
   - Recommendation: Use `useState` (session-only, lost on reload). The checklist only renders while the user is doing setup — after full completion, it's a one-time success moment. If persistent dismissal is needed, a localStorage key is the lightest approach with no DB changes. CONTEXT.md says "dismissed state persists (tracked like checklist active state)" which implies persistence. Use `localStorage` key `homematch_success_dismissed` to persist across reloads without DB changes.

2. **Dialog backdrop interaction — non-blocking intent**
   - What we know: The current WelcomeModal uses `pointerEvents: 'none'` on the outer wrapper, meaning users CAN interact with the app behind the modal. The `DialogOverlay` in `dialog.tsx` uses `bg-black/10` which is light.
   - What's unclear: Should the Dialog backdrop block interaction (standard modal) or remain non-blocking like the current implementation?
   - Recommendation: Use standard Dialog behavior (blocking backdrop). The `bg-black/10` backdrop is subtle and appropriate. The "Skip tour" link gives users a clear exit. The non-blocking approach was a workaround for the driver.js artifact — not an intentional UX pattern.

---

## Sources

### Primary (HIGH confidence)
- `web/src/components/ui/dialog.tsx` — Base-UI Dialog API, available props, dark-mode token usage
- `web/src/components/ui/button.tsx` — variant classes, confirmed `bg-primary` on `variant="default"`
- `web/src/components/onboarding/OnboardingProvider.tsx` — current WelcomeModal implementation (lines 36–102)
- `web/src/components/onboarding/OnboardingChecklist.tsx` — current checklist, CHECKLIST_ITEMS structure, `isActive` guard
- `web/src/hooks/use-onboarding.ts` — `onboarding_completed` flag, `startTour()` implementation
- `web/src/components/motion/FadeIn.tsx` — `animate` prop API confirmed present
- `web/src/lib/motion.ts` — `fadeInVariants`, `duration` tokens
- `web/src/lib/translations.ts` — existing `onboarding_checklist_*` key pattern; confirmed both `en` and `de`
- `web/src/app/(dashboard)/settings/page.tsx` — existing Settings page structure, button patterns

### Secondary (MEDIUM confidence)
- `web/vitest.config.mts` + existing `__tests__/*.test.tsx` — test infrastructure pattern confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in package.json and codebase
- Architecture: HIGH — files, APIs, and integration points directly inspected
- Pitfalls: HIGH — derived from reading actual implementation code, not assumptions
- Test infrastructure: HIGH — vitest.config.mts and test pattern files directly inspected

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries, low churn domain)
