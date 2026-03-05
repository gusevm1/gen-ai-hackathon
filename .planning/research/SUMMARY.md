# Project Research Summary

**Project:** Swiss Property Scraper
**Domain:** Multi-site web scraping infrastructure for Swiss real estate listings
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This project is a single-process Node.js scraping service that collects property listing data from 20+ Swiss real estate sites on a scheduled cadence, stores timestamped JSON snapshots on EC2, and exposes a health endpoint. The right way to build it is with a layered adapter architecture: use existing Apify Store actors for the two dominant platforms (Homegate, ImmoScout24), hit the FlatFox official REST API directly, and build Crawlee-based custom scrapers for remaining sites. This hybrid approach is the fastest path to meaningful data coverage while demonstrating technical breadth — Apify actors for proven sites, a real public API integration, and custom scrapers for everything else. The architecture mirrors a proven codebase (shoparoo-meals-backend) with a registry-driven adapter pattern that makes adding new sites a sub-30-minute task.

The recommended stack is deliberately minimal: Crawlee for scraping orchestration, node-cron for scheduling, Fastify for the health endpoint, Zod v4 for schema validation, and date-partitioned JSONL files for storage. There is no database, no Redis, no message queue. Every technology choice has a clear "why not the more complex alternative" answer, and those answers consistently point back to: single EC2 box, hackathon timeline, data collection phase only. The stack's complexity ceiling is correctly calibrated — it avoids BullMQ (needs Redis), PostgreSQL (premature), and Puppeteer-for-everything (resource-prohibitive).

The two highest-risk areas are data quality and legal compliance. Silent data corruption is the most dangerous failure mode: a scraper runs successfully, stores JSON, and the stored data is wrong — empty prices, null rooms, mismatched schemas from site changes — with no alert firing. Swiss FADP data protection law is a non-negotiable architectural constraint: agent contact data (phone, email, name) is personal data under nFADP and must be separated from property data at scrape time, not cleaned up later. Both risks have prevention strategies that must be built into Phase 1, not retrofitted.

## Key Findings

### Recommended Stack

See: `.planning/research/STACK.md`

The stack is confident and internally consistent. Crawlee (`^3.16`) handles all scraping orchestration — it wraps both CheerioCrawler (HTTP, fast) and PlaywrightCrawler (browser, JS-rendering) under a single API, so switching between them is a one-import change. Most Swiss real estate sites embed listing data in `window.__INITIAL_STATE__` or `<script>` JSON tags, meaning CheerioCrawler handles them without launching a browser — dramatically faster and lower-memory. Playwright is the fallback for SPA sites. The Apify client (`apify-client`) calls cloud actors for Homegate and ImmoScout24, where proven actors already exist. node-cron is the correct scheduler choice over BullMQ: it is in-process, requires no Redis dependency, and is completely sufficient for a single EC2 box running 23 scrapers.

**Core technologies:**
- **Node.js 22.x LTS + TypeScript ~5.7:** Runtime and language — LTS, native TS strip support, team-familiar
- **tsx:** TypeScript execution — 5-10x faster than ts-node, zero config, watch mode for dev
- **Crawlee ^3.16:** Scraping framework — unified API for HTTP and browser crawlers, anti-bot fingerprinting, session management, request queuing built-in
- **apify-client:** Apify integration — calls cloud actors for Homegate, ImmoScout24 (actors already built and maintained by ecomscrape)
- **node-cron ^4.2:** Scheduling — lightweight, in-process, no Redis dependency
- **Fastify ^5.7:** Health endpoint server — native TS, Pino logging built-in, 2-3x faster than Express
- **Zod ^4.3:** Validation — TypeScript-first schema validation for both data and config, 14x faster than v3
- **dotenv ^17.3:** Config — load environment variables, validate at startup

**Storage pattern:** Date-partitioned JSONL files at `data/{site}/{YYYY-MM-DD_HHMMSS}/listings.jsonl`. JSONL format (one listing per line) prevents inode exhaustion and enables incremental writes with crash recovery.

### Expected Features

See: `.planning/research/FEATURES.md`

**Site coverage tiers are the most critical finding for roadmap ordering:**
- **Tier 1 (use Apify actors):** Homegate.ch (100K+ listings), ImmoScout24.ch (84K+ listings), FlatFox.ch (official public API — skip Apify entirely), Comparis.ch (Apify actor available), JamesEdition.com (Apify actor available)
- **Tier 2 (custom scrapers needed):** RealAdvisor.ch (Next.js SSR), Newhome.ch (403 on basic fetch — needs browser), Alle-Immobilien.ch (WordPress, but significant overlap with Homegate/ImmoScout24 — lower priority)
- **Tier 3 (agency sites):** Very low priority — tiny listing pools, high custom dev effort per site

**Critical SMG insight:** Homegate, ImmoScout24, FlatFox, Alle-Immobilien, and ImmoStreet are all owned by the same parent company (SMG Swiss Marketplace Group). Significant listing overlap means scraping Homegate + ImmoScout24 + FlatFox already covers the SMG ecosystem — Alle-Immobilien and ImmoStreet should be deprioritized.

**Must have (table stakes):**
- Multi-site scraping (minimum Homegate + ImmoScout24 + FlatFox to be useful)
- Unified data schema (normalize `numberOfRooms` vs `number_of_rooms` vs `rooms` to one field)
- Scheduled execution (daily cron — real estate listings persist for weeks, daily is sufficient)
- Within-site listing deduplication (use listing URL as primary key per site)
- Raw data persistence (JSONL files on EC2 with timestamps)
- Error handling and retries (wrap actor calls in try/catch, log failures, continue other sites)
- Comprehensive field extraction (use detail scrapers, not just search scrapers)
- Health endpoint (single `GET /health` with last run status)

**Should have (competitive/differentiator):**
- Historical snapshot tracking (timestamped runs enable price-over-time analysis — core investment value)
- FlatFox direct API integration (official REST API, no Apify needed, demonstrates technical versatility)
- Listing change detection (diff consecutive runs: new listings, price changes, removals)
- Apify actor + custom scraper hybrid approach (shows judges range of approaches)
- Scrape metrics dashboard (success rates, listing counts per site, data quality scores)

**Defer (v2+):**
- Cross-site deduplication (requires fuzzy address matching — high complexity, high error rate)
- Real-time scraping/webhooks (daily cadence is sufficient for real estate)
- Image downloading (disk space and licensing concerns)
- NLP on descriptions (analysis layer, not scraping layer)
- Database migration (JSON files sufficient for data collection phase)
- Agency sites / Tier 3 sites (diminishing returns)

### Architecture Approach

See: `.planning/research/ARCHITECTURE.md`

The architecture is a **single-process Node.js monolith** using a Strategy pattern for scraper adapters. The Scraper Registry holds all site configurations as a data array (similar to shoparoo's `STORES` array). A factory function resolves each config to the appropriate adapter: `ApifyScraperAdapter` wraps the ApifyClient call/wait/download pattern proven in shoparoo; `CustomAdapter` runs Crawlee-based crawlers locally. Both implement a common `ScraperAdapter` interface (`scrape(): Promise<ScrapeResult>`), so the Scheduler has no knowledge of adapter internals. Adding a new site means: create a `sites/{name}/transform.ts`, optionally a `sites/{name}/scraper.ts` for custom crawlers, and add one entry to `registry.ts`. No other files change.

**Major components:**
1. **Scheduler** — node-cron triggers sequential site scraping; holds run state for health endpoint; implements lock-file protection against overlapping runs
2. **Scraper Registry** — central SITES config array; single place to add/enable/disable sites; maps site name to adapter type and input
3. **Apify Adapter** — generic wrapper for `client.actor(id).call(input)` + `dataset(id).listItems()`; proven pattern from shoparoo
4. **Custom Adapter** — base class for Crawlee-based scrapers (CheerioCrawler or PlaywrightCrawler); each site gets its own `scraper.ts`
5. **Result Normalizer** — per-site `transform(raw): PropertyListing` function; maps raw API fields to unified schema; preserves `rawData` for re-processing
6. **Storage Writer** — writes `listings.jsonl` + `_run_meta.json` to `data/{site}/{timestamp}/`; verifies write success; checks disk space before writing
7. **Health Server** — Fastify server; single `GET /health` returning uptime, last run times, per-site status, next scheduled run

**Build order matters:** Types → Storage → Apify Adapter → First Site Transform → Registry → Manual Test → Scheduler → Health Server → Additional Sites. Do not build the scheduler before one scraper works end-to-end.

### Critical Pitfalls

See: `.planning/research/PITFALLS.md`

1. **IP banning (CRITICAL)** — Homegate blocks scrapers "after a few requests." Use Apify actors for the major aggregators (they handle proxy rotation internally). For any custom scraper, randomize delays (3-8 seconds with jitter, never uniform). Never run multiple scrapers against the same site concurrently. Build rate-limiting configuration per site from day one.

2. **Silent data corruption (CRITICAL)** — The scraper reports success but stored data is wrong (null prices, empty fields, CAPTCHA HTML stored as a listing). Prevent with: Zod schema validation on every scraped record before writing; alert if >20% of listings from a run have null prices; verify file size > 0 after every write. Swiss-specific: prices use apostrophe as thousands separator (`CHF 1'200'000`), rooms are decimals (`3.5 Zimmer`) — build a shared `parseSwissNumber()` utility from day one.

3. **Swiss FADP data protection violations (CRITICAL)** — Agent names, phone numbers, and emails are personal data under nFADP (effective September 2023). Criminal penalties up to CHF 250,000. Strip or hash personal data fields at scrape time; store in a separate file with access controls if needed. Never mix personal data with property data in the same JSON file. Document legal basis (likely "legitimate interest").

4. **EC2 disk exhaustion (HIGH)** — At 23 sites, daily snapshots quickly fill the default 8GB EBS volume. Provision minimum 50GB. Use JSONL format (not one file per listing) to avoid inode exhaustion. Check disk space before each run; compress runs older than 7 days (gzip reduces JSON 80-90%).

5. **Unreliable community Apify actors (HIGH)** — Community actors for Swiss sites have no SLA. Before integrating, verify: last update <30 days, rating >4 stars, run success rate >90%. Have a custom scraper fallback plan for every Apify-dependent site. The ecomscrape actors for Homegate and ImmoScout24 are the best candidates but must be monitored.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Foundation and First Scraper

**Rationale:** The architecture's dependency analysis is clear — you cannot build the scheduler before you have a working scraper, and you cannot have a working scraper without the types and storage layer. Validate the full pipeline with one real site before scaling. The build order from ARCHITECTURE.md is the correct phase 1 sequence.

**Delivers:** A working end-to-end pipeline that scrapes Homegate via Apify actor, normalizes to a unified schema, and writes timestamped JSONL to disk. Manually triggered (no scheduler yet).

**Addresses:**
- Project scaffold (package.json, tsconfig.json, .env, .env.example)
- Config loader with Zod validation (fail fast on missing APIFY_TOKEN)
- Logger utility (Pino-based structured logging)
- `PropertyListing` interface and `ScraperAdapter` interface
- JSONL storage writer with write verification and disk space check
- Apify adapter (generic wrapper for actor call/wait/download)
- Swiss number parser utility (`parseSwissNumber()`, `parseSwissRooms()`)
- Homegate site transform (first real site normalization)
- Scraper Registry with Homegate entry
- Manual test script to run one site and inspect output

**Avoids:** Silent data corruption (Zod validation on every record), FADP violations (separate personal data at schema design time), disk exhaustion (JSONL format, disk check before write).

**Research flag:** STANDARD PATTERNS — well-documented Apify client usage proven in shoparoo. Skip `/gsd:research-phase`.

---

### Phase 2: Additional Tier 1 Sites and Scheduler

**Rationale:** Once the pipeline is validated with Homegate, adding ImmoScout24 and FlatFox is low-risk (same patterns). The scheduler completes the "service" transformation — the system becomes fully automated. All three must be in place before the system has investment value (coverage + automation = historical snapshots begin accumulating).

**Delivers:** Automated daily scraping of the three highest-value Swiss platforms. Historical snapshot accumulation begins. Health endpoint confirms the service is alive.

**Addresses:**
- ImmoScout24 Apify integration (same pattern as Homegate, different actor ID and transform)
- FlatFox direct REST API integration (independent code path — no Apify needed; demonstrates technical versatility)
- Scheduler with node-cron (sequential execution, lock-file protection, run state tracking)
- Health server (Fastify `GET /health` with last run status, next scheduled run, per-site counts)
- Entry point wiring (scheduler + health server started in `src/index.ts`)
- Offset scheduling (stagger site scrapes to avoid simultaneous hits: Homegate at :00, ImmoScout24 at :30, FlatFox at :45)

**Avoids:** Scheduler overlap (lock files per site), IP banning from concurrent scraping (staggered schedule), silent scheduler failure (lock timeout enforcement).

**Research flag:** STANDARD PATTERNS for Apify integration and scheduler. FlatFox API is well-documented (official public API). Skip `/gsd:research-phase`.

---

### Phase 3: Data Quality and Operational Hardening

**Rationale:** After Phase 2, data is accumulating but its quality is unverified at scale. Before expanding to more sites, harden the pipeline: implement the monitoring that catches corruption early, add the change detection that creates investment signal, and add Comparis as a fourth source. This phase converts "data exists" into "data is trustworthy."

**Delivers:** A monitored, hardened scraping service with proven data quality metrics and investment-grade change detection signals.

**Addresses:**
- Schema health checks (alert if >20% of records in a run have null prices or null rooms)
- Listing change detection (diff consecutive runs: new listings, price drops, removals)
- Per-site scrape metrics (listing count per run, success rate, data quality score — stored as metadata)
- Comparis.ch Apify actor integration (4th source, actor verified as available from ecomscrape)
- Data retention policy (compress runs older than 7 days, disk usage dashboard in health endpoint)
- Run metadata enrichment (`_run_meta.json` includes listing count, null rate, duration, status)

**Avoids:** Silent data corruption at scale (health checks catch schema drift), disk exhaustion (compression policy).

**Research flag:** NEEDS DEEPER RESEARCH for Comparis actor (community actor, verify maintenance status). Run `/gsd:research-phase` if Comparis actor evaluation is complex.

---

### Phase 4: Tier 2 Custom Scrapers (Post-Hackathon)

**Rationale:** Agency sites and custom scrapers are high effort for low incremental coverage. Tier 1 (Homegate + ImmoScout24 + FlatFox + Comparis) already covers the vast majority of Swiss listings. Tier 2 custom scrapers (RealAdvisor, Newhome) require browser automation and have anti-bot challenges. This is post-hackathon work.

**Delivers:** Expanded coverage for RealAdvisor (price-per-m2 data) and Newhome (cantonal bank listings), and optionally JamesEdition (luxury segment).

**Addresses:**
- RealAdvisor custom Crawlee scraper (Next.js SSR, look for `__NEXT_DATA__`)
- Newhome custom scraper (403 on basic fetch — requires PlaywrightCrawler with proper headers)
- JamesEdition Apify actor integration (luxury segment, actor available)
- Cross-site deduplication planning (address normalization, composite key strategy)

**Avoids:** JS rendering misclassification (classify each Tier 2 site before writing scraper: static/hidden-JSON/SPA).

**Research flag:** NEEDS DEEPER RESEARCH — Newhome and RealAdvisor require site-specific technical assessment before scraper development. Run `/gsd:research-phase` for each.

---

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Cannot schedule scrapers that do not exist. The architecture build order (Types → Storage → Adapter → Transform → Registry → Manual Test) is non-negotiable for de-risking the pipeline.
- **Tier 1 sites before custom scrapers:** Apify actors are low-effort and high-coverage. Custom scrapers for Tier 2/3 sites cost 2-8 hours each for marginal listing gain. Validate the Apify pipeline first.
- **Data quality before scale:** Adding more sites before the existing 3 sites are verified correct creates technical debt that corrupts all historical data retroactively. Phase 3 hardening must come before Phase 4 expansion.
- **Scheduler requires error handling:** Unattended cron execution silently loses data on failure. Error handling, logging, and lock files are Phase 2 prerequisites, not Phase 3 additions.
- **FlatFox in Phase 2 not Phase 1:** FlatFox is independent (no Apify dependency) and serves as a good parallel workstream, but Phase 1 must first validate the core Apify pipeline. FlatFox adds in Phase 2 when the pipeline is proven.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 — Comparis actor evaluation:** Verify ecomscrape actor maintenance status, success rate, last update. If actor is unreliable, switch to custom Cheerio scraper (Comparis likely uses SPA rendering, needs site assessment).
- **Phase 4 — Newhome technical assessment:** Site returned 403 on basic fetch. Need to determine if it is a Cloudflare-protected SPA or a Next.js SSR site with strict bot detection. Determines whether PlaywrightCrawler is required.
- **Phase 4 — RealAdvisor technical assessment:** Next.js site with React Server Components. Need to verify if `__NEXT_DATA__` contains listing data on first load (no browser needed) or if data is client-fetched (browser needed).

**Phases with standard patterns (skip research):**
- **Phase 1:** Apify client usage is identical to shoparoo pattern. JSONL storage is standard Node.js fs/promises. Zod validation is well-documented.
- **Phase 2:** node-cron is extensively documented. FlatFox has an official public API with docs. ImmoScout24 uses the same Apify actor pattern as Homegate.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies have official docs, proven in related project (shoparoo). Rationale for each choice is clear. |
| Features | MEDIUM-HIGH | Apify actor availability verified via search. FlatFox API verified via official source. Data field inventory based on Apify docs + ScrapFly guides + open-source projects. SMG ownership verified via official corporate source. |
| Architecture | HIGH | Patterns directly map from proven shoparoo codebase. Strategy pattern + registry + adapter is a standard design. Build order dependencies are clearly documented. |
| Pitfalls | MEDIUM-HIGH | Anti-bot and data corruption pitfalls are well-corroborated by multiple sources. Swiss FADP legal risk is HIGH confidence (DLA Piper + Adnovum sources). Actor reliability pitfall is based on general Apify community experience. |

**Overall confidence:** HIGH

### Gaps to Address

- **Apify actor input schemas:** The exact input parameters for `ecomscrape~homegate-property-search-scraper` and `ecomscrape~immoscout24-property-search-scraper` (how to specify Switzerland-only, max items, language) need to be verified by running a test call before building the full integration. Resolve in Phase 1 execution.

- **Comparis actor reliability:** The `stealth_mode/comparis-property-search-scraper` actor was identified but its maintenance status (last update, success rate) was not fully verified. Check Apify Store for current status before committing Phase 3. May need custom Cheerio scraper as fallback.

- **Remax.ch actor scope:** The identified Remax actors (`getdataforme/remax-scraper`, `parseforge/remax-scraper`) were flagged as potentially scraping remax.com (global) rather than remax.ch (Swiss). Low priority but needs a URL parameter test before integrating.

- **FlatFox API pagination:** The FlatFox public API is confirmed to exist. The exact pagination mechanism and rate limits need verification against the official API docs before building the integration.

- **Apify free-tier credit limits:** The free tier provides $5/month platform usage credits. Running daily scrapes of Homegate + ImmoScout24 (both of which retrieve 1,000+ listings) needs a credit consumption estimate before committing to the daily cadence. May require switching to the paid tier.

## Sources

### Primary (HIGH confidence)
- [Crawlee Official Docs — Introduction](https://crawlee.dev/js/docs/introduction) — scraping framework patterns
- [Apify SDK for JavaScript](https://docs.apify.com/sdk/js/docs/overview) — actor development patterns
- [Apify API Client for JavaScript](https://docs.apify.com/api/client/js/docs) — client API patterns
- [FlatFox Official API Reference](https://flatfox.ch/en/docs/api/) — FlatFox integration
- [SMG Swiss Marketplace Group — Real Estate Portfolio](https://swissmarketplace.group/portfolio/real-estate/) — site ownership / overlap analysis
- [Swiss FADP Overview (DLA Piper)](https://www.dlapiperdataprotection.com/?t=law&c=CH) — data protection legal risk
- [AWS EC2 Volume Disk Space](https://repost.aws/knowledge-center/ec2-volume-disk-space) — disk management
- shoparoo-meals-backend codebase — Apify call/wait/download pattern, SITES registry pattern, run metadata pattern

### Secondary (MEDIUM confidence)
- [Homegate Property Details Scraper — Apify](https://apify.com/ecomscrape/homegate-property-details-scraper) — actor availability and field coverage
- [ImmoScout24 Property Search Scraper — Apify](https://apify.com/ecomscrape/immoscout24-property-search-scraper) — actor availability
- [FlatFox.ch Properties Scraper — Apify](https://apify.com/lexis-solutions/flatfox-ch-properties-scraper) — actor availability
- [Comparis Property Search Scraper — Apify](https://apify.com/stealth_mode/comparis-property-search-scraper) — actor availability (maintenance status unverified)
- [How to Scrape Homegate.ch — ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) — site technical structure, anti-bot behavior
- [How to Scrape ImmoScout24.ch — ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-immoscout24-ch-real-estate-property-data) — site technical structure
- [swiss-immo-scraper — GitHub](https://github.com/dvdblk/swiss-immo-scraper) — open-source reference implementation
- [Best Node.js Schedulers — BetterStack](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — node-cron vs BullMQ comparison
- [Pino vs Winston — BetterStack](https://betterstack.com/community/comparisons/pino-vs-winston/) — logger selection rationale
- [Swiss FADP (Adnovum)](https://www.adnovum.com/blog/swiss-federal-act-on-data-protection-2023) — FADP requirements and penalties

### Tertiary (LOW confidence)
- [Remax Scraper — Apify](https://apify.com/getdataforme/remax-scraper) — may be remax.com not remax.ch; needs URL parameter verification
- [ZenRows TypeScript Web Scraping Guide](https://www.zenrows.com/blog/web-scraping-typescript) — general TypeScript scraping patterns
- [Small JSON Files Problem on S3](https://medium.com/@e.pkontou/small-files-problem-on-s3-5a5ec7f19d0a) — inode exhaustion rationale for JSONL format

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
