# Phase 33: Dashboard Home, Nav Polish, Profile Creation Flow, and Analyses Titles Fix - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** User discussion

<domain>
## Phase Boundary

This phase delivers four distinct UX improvements to the HomeMatch web app:

1. **Dashboard Home Page** — A new landing page after auth (login/signup/redirect) that welcomes users and offers two profile creation paths
2. **Profile Creation Entry Points** — Both the dashboard home and the "+ New Profile" button show two options: Manual form or AI-guided chat
3. **Download Page Nav Fix** — Nav bar items disappear on the Download page; fix so all nav items remain visible and clickable
4. **Analyses Titles in English** — Analysis card titles are currently showing German text from Flatfox; fetch and display English listing titles instead

</domain>

<decisions>
## Implementation Decisions

### Dashboard Home Page
- After login, signup, or clicking "Go to Dashboard", user lands on a new dashboard home page (not profiles list)
- Display welcome header: **"Welcome to HomeMatch"**
- Subheader: **"Let's create your profile"**
- AI-guided description text: "Tell us exactly what you're looking for and let our AI build your profile automatically."
- Manual description text: "Prefer full control? Fill out a straightforward form and create your profile manually."
- Two large, visually appealing side-by-side cards/boxes:
  - Box 1: **Manual profile creation** → navigates to the manual profile form
  - Box 2: **AI-guided profile creation** → navigates to the LLM chat console
- Home nav bar item must be present and accessible from this page
- Clicking the HomeMatch logo continues to direct to the landing page (no change to logo behavior)

### Profiles Navigation — New Profile Flow
- Keep current Profiles nav bar and listing functionality unchanged
- When clicking "+ New Profile", show the same two-option UI (same cards as the dashboard home):
  - Manual profile creation → opens the manual form
  - AI-guided profile creation → opens the LLM chat console
- This replaces whatever the current "+ New Profile" action does (likely direct to form)

### Download Page Nav Fix
- Currently: other nav bar items disappear while on the Download page
- Fix: all nav items (Home, Profiles, Analyses, Download, etc.) remain visible and clickable while on the Download page
- Root cause is likely a nav layout or conditional rendering issue specific to this route

### Analyses Titles — English from Flatfox
- Analysis cards currently show German titles sourced from Flatfox listing data
- Fix: use the English listing title from Flatfox as the display title for each analysis card
- Flatfox listings have both German and English title fields — use the English one
- No backend change expected; this is likely a frontend field selection fix

### Claude's Discretion
- Visual design of the two profile-creation cards (follow existing design system / dark theme)
- Routing/URL structure for the new dashboard home page
- Whether to create a new route or repurpose an existing one
- Animation/transition details (follow existing Framer Motion patterns if present in dashboard)
- Exact field name for English title in Flatfox API response

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project State & Architecture
- `.planning/STATE.md` — Current decisions, tech stack, design system tokens
- `.planning/ROADMAP.md` — Phase context and milestone goals

### Codebase Entry Points
- `webapp/` — Next.js web application root
- `webapp/app/` — App Router pages and layouts
- `webapp/components/` — Shared UI components
- `backend/app/` — FastAPI backend (for Flatfox API integration)

</canonical_refs>

<specifics>
## Specific Requirements

### Welcome Text (exact copy)
- Heading: "Welcome to HomeMatch"
- Subheading: "Let's create your profile"
- AI card description: "Tell us exactly what you're looking for and let our AI build your profile automatically."
- Manual card description: "Prefer full control? Fill out a straightforward form and create your profile manually."

### Card Labels
- Card 1: "Manual profile creation"
- Card 2: "AI-guided profile creation"

### Routing Rules
- Logo → landing page (unchanged)
- Home nav item → dashboard home (new page)
- Manual card → manual profile form (existing route)
- AI-guided card → LLM chat console (existing route)
- "+ New Profile" → shows same two-card chooser (not direct to form)

</specifics>

<deferred>
## Deferred Ideas

- Mobile responsiveness tweaks beyond basic layout (covered in Phase 25)
- Onboarding flow or empty-state animations
- Profile creation wizard multi-step improvements

</deferred>

---

*Phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix*
*Context gathered: 2026-03-30 via user discussion*
