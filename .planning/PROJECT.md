# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension that overlays AI-powered match scores on Homegate.ch listing results. Users set up their property preferences (location, budget, rooms, features, custom interests) with configurable importance weights, and the extension scores each listing against their profile — showing a percentage badge alongside transparent reasoning, directly on the search results page. Built for real estate professionals who evaluate dozens of listings daily.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Current Milestone: v1.0 HomeMatch MVP

**Goal:** A working Chrome extension on Homegate.ch that onboards users, pre-fills filters, and shows AI match scores with explanations on search results.

**Target features:**
- User onboarding with preference profile + configurable weights
- Homegate filter pre-fill from profile
- AI match scoring on search results with expandable analysis
- Thin EC2 backend proxying LLM calls

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chrome extension with full-page onboarding wizard (location, buy/rent, property type, budget, rooms, living area, year built, floor, availability, features, custom interests, weight configuration)
- [ ] User preference profile stored as JSON in extension storage
- [ ] Configurable importance weights per category, set during onboarding, adjustable after
- [ ] Homegate filter pre-fill from user profile preferences
- [ ] Match score badges (percentage + label) injected next to each listing on Homegate search results
- [ ] Background fetch of listing detail pages (no visible tab opening)
- [ ] LLM-powered evaluation of listing data against user profile
- [ ] Expandable score breakdown with weighted categories, bullet-point reasoning, and references to listing description
- [ ] Honest "I don't know" for data points the listing doesn't provide
- [ ] Analysis displayed in the listing's language (DE/FR/IT)
- [ ] Thin EC2 backend that proxies LLM API calls (keeps keys secure)
- [ ] Extension popup as compact dashboard (profile summary, on/off toggle, edit link)

### Out of Scope

- Other property sites beyond Homegate — architecture for extensibility, but v1 is Homegate only
- Multiple client profiles (broker multi-profile) — future milestone
- Mobile app
- User accounts / authentication — profile lives in extension storage
- Image analysis of listing photos — text-only evaluation for v1
- Historical price tracking or investment analysis
- Custom scraping infrastructure (pivoted away from v1.0)

## Context

- **Hackathon:** Gen AI hackathon, ~1 week build window. Demo story: a real estate professional piloting the extension closes more deals by quickly identifying best-match listings.
- **Inspiration:** JobRight.ai — shows match percentage badges next to job listings with key reasons. Same UX pattern applied to real estate.
- **Target site:** Homegate.ch — Switzerland's largest property portal. Filters include location+radius, buy/rent, category, price range, rooms, living space, year built, type, floor, availability, features (balcony, elevator, parking, Minergie, etc.), free-text search.
- **LLM scoring approach:** Extension background worker fetches each listing's detail page HTML, parses out description/specs/images metadata, sends to LLM with user profile for evaluation. Scores appear progressively as they resolve.
- **Language:** Homegate serves DE/FR/IT. LLM analysis matches the listing language.
- **User-defined soft criteria:** Beyond hard filters — distance to Bahnhof, tax rates, school quality, supermarket proximity, etc. LLM evaluates these using its knowledge + listing description. Honest about uncertainty.
- **Solo developer** building this.

## Constraints

- **Timeline**: ~1 week hackathon window — speed matters
- **Platform**: Chrome extension (Manifest V3)
- **Backend**: Thin EC2 proxy for LLM calls only — no database, no user accounts
- **LLM**: Claude API (via backend proxy)
- **Target site**: Homegate.ch only for v1
- **No tab opening**: All detail page fetching happens via background service worker fetch()

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chrome extension (not standalone app) | Meet users where they already browse — no workflow disruption | — Pending |
| Homegate-only for v1 | Nail one site perfectly, architect for extensibility | — Pending |
| EC2 backend for LLM proxy | Keeps API keys secure, allows model swapping without extension updates | — Pending |
| Configurable weights | Users/brokers have different priorities — let them express what matters most | — Pending |
| Full-page onboarding (not popup) | Complex preference setup needs space — popup is too cramped | — Pending |
| Background fetch for detail pages | Invisible to user, no jarring tab opening | — Pending |
| "I don't know" over guessing | Trust > accuracy theater — users need to know what the AI can't verify | — Pending |

---
*Last updated: 2026-03-07 after pivot to Chrome extension*
