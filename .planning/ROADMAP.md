# Roadmap: Swiss Property Scraper

## Overview

This roadmap delivers a Swiss real estate scraping service in three phases: first, build and validate the core scraping pipeline locally with one site (Homegate); second, add a second data source (FlatFox) and automate execution with a scheduler; third, deploy to EC2 and harden with monitoring, alerting, and data quality checks. Each phase delivers a testable, working capability. By the end, a fully automated service scrapes two major Swiss listing platforms daily, stores timestamped JSONL snapshots, and alerts on failures or data quality degradation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + First Scraper** - Working local pipeline that scrapes Homegate via Apify, validates with Zod, and writes timestamped JSONL to disk
- [ ] **Phase 2: Second Scraper + Scheduling** - Automated multi-site scraping with FlatFox REST API integration, node-cron scheduler, and lock-file protection
- [ ] **Phase 3: Production Deployment + Hardening** - EC2 deployment with persistent process, health endpoint, email alerts, and data quality checks

## Phase Details

### Phase 1: Foundation + First Scraper
**Goal**: A developer can run a single command locally that scrapes Homegate listings via Apify, validates each record against a Zod schema, and writes normalized JSONL output to a timestamped directory on disk
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SCRP-01, SCRP-02, SCRP-03, SCRP-04, QUAL-01, SITE-01
**Success Criteria** (what must be TRUE):
  1. Running `npx tsx src/manual-run.ts homegate` produces a `data/homegate/{timestamp}/listings.jsonl` file containing normalized property listings
  2. Each listing in the output conforms to the PropertyListing Zod schema -- records with missing required fields are logged and excluded rather than silently stored
  3. Swiss-format numbers in the raw data (e.g., `CHF 1'200'000`, `3.5 Zimmer`) are correctly parsed to numeric values in the output
  4. The application fails fast at startup if APIFY_TOKEN is missing from the environment
  5. Structured JSON logs (via Pino) are emitted during the scrape showing progress, record counts, and any validation failures
**Plans**: 2

Plans:
- [ ] 01-01: Project Foundation + Core Types + Utilities (Wave 1)
- [ ] 01-02: Homegate Scraper + Pipeline Wiring (Wave 2)

### Phase 2: Second Scraper + Scheduling
**Goal**: The application scrapes both Homegate (Apify) and FlatFox (REST API) on a configurable daily schedule without manual intervention, with lock-file protection preventing overlapping runs
**Depends on**: Phase 1
**Requirements**: SITE-02, OPS-01, OPS-02, OPS-05
**Success Criteria** (what must be TRUE):
  1. Running the scheduler produces daily output directories for both `data/homegate/{timestamp}/` and `data/flatfox/{timestamp}/` containing normalized JSONL listings
  2. FlatFox listings are fetched via direct REST API calls (no Apify actor) and normalized to the same PropertyListing schema as Homegate
  3. A lock file prevents a second scheduler run from starting while the first is still in progress
  4. Each scrape run produces a `_run_meta.json` file recording listing count, duration, status, and any errors
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Production Deployment + Hardening
**Goal**: The scraping service runs as a persistent process on EC2, with a health endpoint confirming operational status, email alerts on failures, and data quality checks that catch silent corruption
**Depends on**: Phase 2
**Requirements**: SETUP-04, SETUP-05, SETUP-06, SETUP-07, OPS-03, OPS-04, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. The application runs as a persistent service on EC2 (survives SSH disconnect and server reboot) and scrapers execute on their daily schedule without manual intervention
  2. `GET /health` returns JSON with service uptime, last scrape run time, next scheduled run, and per-site listing counts from the most recent run
  3. When a scraper fails, an email notification is sent via AWS SES within minutes containing the site name, error details, and timestamp
  4. If more than 20% of listings in a single run have null prices or null rooms, an alert fires (logged and emailed)
  5. Within-site duplicate listings (same URL scraped in the same run) are detected and removed before storage
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + First Scraper | 0/? | Not started | - |
| 2. Second Scraper + Scheduling | 0/? | Not started | - |
| 3. Production Deployment + Hardening | 0/? | Not started | - |
