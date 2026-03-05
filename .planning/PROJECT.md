# Swiss Property Scraper

## What This Is

A greenfield scraping infrastructure for Swiss real estate listings, built for a Gen AI hackathon. Collects property data from major Swiss listing platforms (Homegate, ImmoScout24, Comparis, etc.) and stores raw JSON snapshots on an EC2 instance. This is the data collection foundation for a future investment intelligence layer that will help retail investors evaluate properties financially rather than just browse them.

## Core Value

Reliably collect and store comprehensive property listing data from Swiss real estate websites, building historical snapshots over time that enable downstream investment analysis.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scraping infrastructure running on a new EC2 instance (Node.js/TypeScript)
- [ ] 2-3 initial scrapers for the easiest Swiss listing sites
- [ ] Scheduler running scrapers on a cadence (frequency TBD by research)
- [ ] Raw JSON storage of scraped data on EC2
- [ ] Health endpoint (only endpoint — no other API routes in v1)
- [ ] Reuse Apify API keys from existing shoparoo setup where applicable
- [ ] Extract maximum data from each listing (price, location, size, rooms, images, descriptions, financials — everything available)

### Out of Scope

- Investment analysis / yield calculations — future milestone
- User-facing frontend — future milestone
- API endpoints for querying data — future milestone
- Database setup (PostgreSQL/MongoDB) — raw JSON sufficient for now
- Grocery store scrapers (pivoted away)
- Mobile app

## Context

- **Hackathon:** Gen AI hackathon, ~1 week build window. Data collection is the foundation — more historical snapshots = more analysis potential.
- **Existing work:** Prior scraping infrastructure exists at `/Users/maximgusev/workspace/shoparoo-group/shoparoo-meals-backend` (Node.js/TypeScript). Built for grocery store scraping but architecture patterns, scheduler, and Apify integration may be reusable. Needs deep code review before deciding what to carry forward.
- **Apify:** Hackathon sponsor. Provides web scraping infrastructure and pre-built Actors. Can use both Apify cloud actors and custom EC2 scrapers depending on site feasibility.
- **Challenge paths:** Three options (AI Agents, RAG Applications, Build an Apify Actor). Decision deferred until analysis layer is designed — data collection comes first.
- **Target sites (big aggregators):** comparis.ch, RealAdvisor.ch, Alle-Immobilien.ch, Newhome.ch, Homegate.ch, ImmoScout24.ch
- **Target sites (agencies):** remax.ch, icasa.ch, properti.com, walde.ch, swissfineproperties.com, jamesedition.com, luxuryestate.com, flatfox.ch, urbanhome.ch, immostreet.ch, immobilier.ch, neho.ch, betterhomes.ch, livit.ch, engelvoelkers.com, cardis.ch, ginesta.ch
- **Strategy:** Start with easiest-to-scrape sites, then expand. Research feasibility of each site before building scrapers.
- **Solo developer** building this.

## Constraints

- **Timeline**: ~1 week hackathon window — speed matters
- **Infrastructure**: New EC2 box (not yet provisioned), reuse existing Apify API keys
- **Stack**: Node.js/TypeScript (consistent with existing codebase)
- **Storage**: Raw JSON files on EC2 for now — no database overhead
- **Scraping approach**: Mix of Apify actors and custom scrapers based on per-site feasibility

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Greenfield repo (not fork old one) | Clean start, old repo has wrong name and structure for new domain | — Pending |
| Raw JSON storage over database | Minimize setup time, sufficient for data collection phase | — Pending |
| Easiest sites first | Maximize data collected within hackathon window | — Pending |
| Node.js/TypeScript | Consistent with existing codebase, team familiarity | — Pending |
| Health endpoint only | No API needed until analysis layer exists | — Pending |

---
*Last updated: 2026-03-05 after initialization*
