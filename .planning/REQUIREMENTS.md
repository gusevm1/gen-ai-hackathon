# Requirements: Swiss Property Scraper

**Defined:** 2026-03-05
**Core Value:** Reliably collect and store comprehensive property listing data from Swiss real estate websites, building historical snapshots over time that enable downstream investment analysis.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Project Setup

- [ ] **SETUP-01**: Project initialized with package.json, tsconfig.json, ESLint, and .env/.env.example
- [ ] **SETUP-02**: Pino-based structured logging with configurable log levels
- [ ] **SETUP-03**: Config loader validates required environment variables at startup (fail fast on missing APIFY_TOKEN)
- [ ] **SETUP-04**: EC2 instance provisioned (t3.large, 50GB EBS gp3, eu-central-1)
- [ ] **SETUP-05**: EC2 setup script installs Node.js 22, Chromium dependencies, and project dependencies
- [ ] **SETUP-06**: Git repo cloned on EC2 with deploy workflow (SSH + git pull)
- [ ] **SETUP-07**: Application runs as a persistent process on EC2 (PM2 or systemd service)

### Scraping Infrastructure

- [ ] **SCRP-01**: PropertyListing TypeScript interface defines unified schema for all scraped listings
- [ ] **SCRP-02**: Scraper adapter interface allows both Apify-backed and direct API scrapers
- [ ] **SCRP-03**: Scraped data stored as files in `data/{site}/{YYYY-MM-DD_HHMMSS}/` directories
- [ ] **SCRP-04**: Swiss number parser handles apostrophe thousands separators (`CHF 1'200'000` -> `1200000`) and decimal rooms (`3.5 Zimmer` -> `3.5`)

### Site Integrations

- [ ] **SITE-01**: Homegate scraper via Apify actor retrieves property listings (target ~1000 listings)
- [ ] **SITE-02**: FlatFox scraper via official REST API retrieves property listings (target ~1000 listings)

### Scheduling & Operations

- [ ] **OPS-01**: node-cron scheduler runs scrapers on configurable daily cadence
- [ ] **OPS-02**: Lock-file prevents overlapping scraper runs
- [ ] **OPS-03**: Health endpoint (GET /health) returns service status, last run time, and per-site listing counts
- [ ] **OPS-04**: Email notifications on scraper failures (via AWS SES, reuse existing API keys)
- [ ] **OPS-05**: Run metadata stored per scrape (_run_meta.json with listing count, duration, status)

### Data Quality

- [ ] **QUAL-01**: Zod schema validation on every scraped record before storage
- [ ] **QUAL-02**: Alert if >20% of listings in a run have null prices or null rooms
- [ ] **QUAL-03**: Within-site listing deduplication using listing URL as primary key

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Sites

- **SITE-03**: ImmoScout24 via Apify actor (84K+ listings, same actor author as Homegate)
- **SITE-04**: Comparis via Apify actor (community actor, needs reliability verification)
- **SITE-05**: JamesEdition via Apify actor (luxury segment)
- **SITE-06**: RealAdvisor custom Crawlee scraper (Next.js SSR)
- **SITE-07**: Newhome custom scraper (requires PlaywrightCrawler, 403 on basic fetch)

### Data Intelligence

- **DATA-01**: Listing change detection (diff consecutive runs: new listings, price drops, removals)
- **DATA-02**: Cross-site deduplication (fuzzy address matching)
- **DATA-03**: Historical price trend analysis per listing

### Operations

- **OPS-06**: Data retention policy (compress runs older than 7 days)
- **OPS-07**: Scrape metrics dashboard in health endpoint
- **OPS-08**: FADP-compliant personal data separation at scrape time

### Infrastructure

- **INFRA-01**: Database migration (PostgreSQL or SQLite for structured queries)
- **INFRA-02**: CI/CD pipeline (GitHub Actions for lint + test + deploy)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Investment analysis / yield calculations | Future milestone -- analysis layer, not scraping |
| User-facing frontend | Future milestone |
| API endpoints for querying data | Future milestone -- raw JSON sufficient for data collection |
| Image downloading from listings | Disk space and licensing concerns |
| NLP on listing descriptions | Analysis layer, not scraping layer |
| Real-time scraping / webhooks | Daily cadence sufficient for real estate |
| Agency sites (17 small sites) | Diminishing returns -- hours of dev for hundreds of listings each |
| Alle-Immobilien / ImmoStreet | SMG subsidiaries -- listings overlap with Homegate/ImmoScout24 |
| Mobile app | Web-first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 3 | Pending |
| SETUP-05 | Phase 3 | Pending |
| SETUP-06 | Phase 3 | Pending |
| SETUP-07 | Phase 3 | Pending |
| SCRP-01 | Phase 1 | Pending |
| SCRP-02 | Phase 1 | Pending |
| SCRP-03 | Phase 1 | Pending |
| SCRP-04 | Phase 1 | Pending |
| SITE-01 | Phase 1 | Pending |
| SITE-02 | Phase 2 | Pending |
| OPS-01 | Phase 2 | Pending |
| OPS-02 | Phase 2 | Pending |
| OPS-03 | Phase 3 | Pending |
| OPS-04 | Phase 3 | Pending |
| OPS-05 | Phase 2 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after roadmap creation*
