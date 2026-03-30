# Phase 34: Onboarding & Tutorial System - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** PRD provided by user

<domain>
## Phase Boundary

Design and implement a guided onboarding system that drives first-time users to the core product value (running their first property analysis via the extension) as quickly as possible. The system must span the web app (Next.js) and the Chrome extension, with shared state coordination between them. The onboarding must be replayable on demand via a "Take a quick tour" entry point.

</domain>

<decisions>
## Implementation Decisions

### Core Principle
- Onboarding is NOT an explanation of the UI — it forces the user to experience the core value once
- Core value = user successfully analyzes a property using the extension and sees results
- At every step: "Is this helping the user reach their first successful analysis faster?"

### Onboarding Flow (8 Steps across 3 Phases)

**Phase 1: Activation — Web App (Steps 1–3)**

- **Step 1: Install Extension** — on Downloads page
  - Show installation instructions with CTA: "I've installed the extension"
  - Optional: auto-detect extension installation and auto-complete step if detected
- **Step 2: Create First Profile** — on Dashboard
  - Highlight "Create Profile" button
  - User must open modal, select option, save profile
  - Cannot proceed without creating at least one profile
- **Step 3: Open Flatfox via Extension Entry** — on Dashboard
  - Highlight "Open in Flatfox" button
  - User clicks → navigates to Flatfox

**Phase 2: Extension-Based Onboarding — Flatfox (Steps 4–7)**

- **Step 4: Login to Extension** — on Flatfox domain
  - Detect Flatfox domain
  - Inject tooltip/UI overlay, highlight login area
- **Step 5: Trigger First Analysis** — on Flatfox
  - Highlight "Analyze" button (bottom right)
  - User clicks to run analysis
- **Step 6: Understand Results** — on Flatfox
  - Highlight key UI: badge score, short analysis summary, "Show full analysis" button
- **Step 7: Redirect Back to Web App** — triggered by "Show full analysis" click

**Phase 3: Post-Analysis — Web App (Step 8)**

- **Step 8: Feature Awareness (Light Guidance)**
  - Non-blocking tooltips for: profiles overview, switching profiles, viewing past analyses

### Replayable Onboarding ("Take a quick tour")
- Entry points: profile dropdown (primary), empty states (secondary — "Not sure where to start? Take a quick tour")
- Behavior: start from Step 1, no adaptive skipping, same flow as first-time onboarding
- Reset: `onboarding_step → 1`, `onboarding_active → true`

### UX Rules (Locked)
- Always allow "Skip tour" and "Exit" at any step
- Show progress indicator: "Step 2 of 5" (or similar count)
- Never overwhelm — one action per step, no long explanations

### Onboarding Checklist (Persistent UI)
- Show during onboarding: ☐ Install extension, ☐ Create profile, ☐ Analyze first property
- Updates in real time as steps complete

### Tooltip System
- Highlight relevant UI elements with focus highlight
- Dim background (spotlight effect)
- Short, clear instructions — no long explanations
- One action per step

### Cross-Platform State Coordination
- Shared state: `onboarding_active: boolean`, `onboarding_step: number`, `onboarding_completed: boolean`
- Flow: user clicks "Open in Flatfox" → extension detects active onboarding + current step → injects correct tooltip/step UI → progress syncs back to web app
- State must be accessible to both web app and extension

### State Reset for Replay
- Reset: `onboarding_step → 1`, `onboarding_active → true` (onboarding_completed stays true after first run)

### Claude's Discretion
- State storage mechanism (localStorage, Supabase user_preferences, or extension storage)
- Exact positioning/styling of spotlight overlay
- How extension polls/reads shared onboarding state (storage sync vs. messaging)
- Whether to split into multiple PLAN.md files (web vs. extension)
- Tooltip component library vs. custom implementation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Extension Architecture
- `extension/src/entrypoints/content/` — Content script entry point (where tooltip injection happens)
- `extension/src/entrypoints/content/style.css` — Extension content styles
- `extension/src/entrypoints/popup/` — Extension popup (login area for Step 4)

### Web App Architecture
- `webapp/` — Next.js web app root
- `webapp/app/` — App router pages
- `webapp/components/` — Shared components

### Project Context
- `.planning/STATE.md` — Architecture decisions, tech stack, scoring system
- `.planning/phases/33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix/33-CONTEXT.md` — Phase 33 context (nav, dashboard, profile creation UI — directly relevant)
- `.planning/phases/33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix/33-02-PLAN.md` — Profile creation flow implementation

### Infrastructure
- `CLAUDE.md` — Deployment instructions (EC2, Supabase, Vercel, extension build)

</canonical_refs>

<specifics>
## Specific Requirements

### State Fields (Minimum Required)
```
onboarding_completed: boolean
onboarding_active: boolean
onboarding_step: number  (1–8)
```

### Success Criteria
Onboarding is successful if user:
1. Installs extension
2. Creates a profile
3. Runs at least one analysis
4. Views the result

### "Take a quick tour" Button Placement
- **Primary:** Profile dropdown (top-right menu)
- **Secondary:** Empty states (no profiles / no analyses) — inline message

### Non-Goals / Out of Scope
- No adaptive onboarding logic
- No behavior-based step skipping
- No personalization
- Do not explain every feature — focus only on first successful analysis

</specifics>

<deferred>
## Deferred Ideas

- Adaptive onboarding (skip steps user already completed on replay)
- Personalization based on user type
- Analytics/funnel tracking for onboarding steps
- Onboarding A/B testing

</deferred>

---

*Phase: 34-onboarding-tutorial-system*
*Context gathered: 2026-03-30 via user PRD*
