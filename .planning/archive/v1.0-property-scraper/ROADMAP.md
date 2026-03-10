# Roadmap: Swiss Property Scraper

## Overview

This roadmap delivers a Swiss real estate scraping service that collects data on an EC2 instance as quickly as possible. The strategy pivots to FlatFox (public REST API, no anti-bot protection) as the first scraper to unblock end-to-end pipeline validation and EC2 deployment. Homegate is deferred until its DataDome anti-bot protection is resolved. By Phase 3 completion, a fully automated service scrapes FlatFox daily on EC2, stores timestamped JSONL snapshots, and can be extended with additional scrapers.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, ...): Planned milestone work
- Decimal phases (e.g., 01.1): Inserted work (marked with INSERTED)
- PAUSED phases: Work blocked on external issues

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Core types, schema, parsers, JSONL writer, pipeline scaffold
- [x] **Phase 2: FlatFox Scraper** - Direct REST API scraper with normalizer, wired into pipeline, verified locally
- [ ] **Phase 3: EC2 Deployment + Scheduling** - Provision EC2, deploy app, cron-based daily scraping, run metadata
- [ ] **Phase 4: Homegate Scraper** - Resume DataDome bypass work, deploy custom Apify actor, wire into pipeline
- [ ] **Phase 5: Hardening** - Health endpoint, email alerts, data quality checks, deduplication

## Phase Details

### Phase 1: Foundation
**Goal**: Core project infrastructure — types, schema, parsers, pipeline scaffold, JSONL writer
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SCRP-01, SCRP-02, SCRP-04, QUAL-01
**Status**: COMPLETE
**Success Criteria** (what must be TRUE):
  1. PropertyListing Zod schema validates listing records with required fields (url, title, listingType, price, rooms, address)
  2. Swiss number parsers correctly handle CHF 1'200'000, 3.5 Zimmer, etc.
  3. JSONL writer produces timestamped output directories
  4. Application fails fast at startup if required env vars are missing
  5. Structured JSON logs (via Pino) are emitted

Plans:
- [x] 01-01: Project Foundation + Core Types + Utilities (Wave 1)
- [x] 01-02: Homegate Scraper + Pipeline Wiring (Wave 2)

### Phase 01.1: Build custom Homegate scraper actor on Apify (INSERTED — PAUSED)

**Goal:** A custom Apify actor that scrapes Homegate property listings via `window.__INITIAL_STATE__` JSON extraction
**Requirements**: SITE-01
**Depends on:** Phase 1
**Status**: PAUSED — blocked by DataDome anti-bot protection. CDP browser approach partially built but not reliably bypassing detection.
**Plans:** 1/2 plans executed

Plans:
- [x] 01.1-01-PLAN.md -- Build actor project with CheerioCrawler extraction logic (Wave 1)
- [ ] 01.1-02-PLAN.md -- Deploy actor to Apify and wire into HomegateAdapter (Wave 2)

**Resume when:** DataDome bypass strategy is confirmed working (manual CAPTCHA, residential proxy, or alternative approach).

### Phase 2: FlatFox Scraper
**Goal**: A working FlatFox scraper that fetches listings via their public REST API (`https://flatfox.ch/api/v1/public-listing/`), normalizes them to the PropertyListing schema, and writes JSONL output locally
**Depends on**: Phase 1
**Requirements**: SITE-02, SCRP-03
**Success Criteria** (what must be TRUE):
  1. Running `npx tsx src/manual-run.ts flatfox` produces a `data/flatfox/{timestamp}/listings.jsonl` file containing normalized property listings
  2. FlatFox listings are fetched via direct REST API calls (no Apify actor needed) with pagination support
  3. Each listing conforms to the PropertyListing Zod schema — records with missing required fields are logged and excluded
  4. Dry-run mode (`--dry-run`) fetches a small sample and validates without writing to disk
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md -- FlatFox adapter, normalizer, and pipeline wiring (Wave 1)

### Phase 3: EC2 Deployment + Scheduling
**Goal**: The FlatFox scraper runs on an EC2 instance on a daily cron schedule, collecting data automatically without manual intervention
**Depends on**: Phase 2
**Requirements**: SETUP-04, SETUP-05, SETUP-06, SETUP-07, OPS-01, OPS-02, OPS-05
**Success Criteria** (what must be TRUE):
  1. EC2 instance provisioned (t3.small or t3.micro sufficient — no browser needed for FlatFox API scraping)
  2. Application deployed via SSH + git pull, runs with PM2 or systemd
  3. Cron schedule runs FlatFox scraper daily, producing `data/flatfox/{timestamp}/listings.jsonl`
  4. Lock-file prevents overlapping scraper runs
  5. Each scrape run produces a `_run_meta.json` recording listing count, duration, and status
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Scheduler + Lock + Run Metadata + S3 Sync + PM2 Config (Wave 1)
- [ ] 03-02-PLAN.md -- EC2 Provisioning + Setup + Deploy Scripts (Wave 1)

### Phase 4: Homegate Scraper
**Goal**: Resume and complete the Homegate scraper — deploy the custom Apify actor and wire it into the pipeline alongside FlatFox
**Depends on**: Phase 3 (EC2 running), Phase 01.1 resume (DataDome solved)
**Requirements**: SITE-01
**Success Criteria** (what must be TRUE):
  1. Custom Homegate actor deployed to Apify and callable via HomegateAdapter
  2. Running `npx tsx src/manual-run.ts homegate` produces normalized JSONL output
  3. Daily cron on EC2 scrapes both FlatFox and Homegate
**Plans**: TBD (depends on DataDome resolution)

### Phase 5: Hardening
**Goal**: Production-grade reliability — health endpoint, failure alerts, data quality monitoring
**Depends on**: Phase 3
**Requirements**: OPS-03, OPS-04, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. `GET /health` returns service uptime, last scrape time, next scheduled run, per-site listing counts
  2. Email notification via AWS SES on scraper failure
  3. Alert if >20% of listings in a run have null prices or null rooms
  4. Within-site deduplication by listing URL
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 (when unblocked) -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-03-05 |
| 01.1 Homegate Actor (INSERTED) | 1/2 | PAUSED (DataDome) | - |
| 2. FlatFox Scraper | 1/1 | Complete | 2026-03-05 |
| 3. EC2 Deployment + Scheduling | 0/2 | Planned | - |
| 4. Homegate Scraper | 0/? | Blocked (DataDome) | - |
| 5. Hardening | 0/? | Not started | - |
