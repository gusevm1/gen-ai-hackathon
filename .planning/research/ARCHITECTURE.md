# Architecture Patterns

**Domain:** Multi-site web scraping infrastructure (Swiss real estate listings)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Recommended Architecture

The system is a **single-process Node.js monolith** running on EC2 that combines a cron-based scheduler, a scraper registry with a unified adapter interface, raw JSON file storage, and a minimal HTTP health server. This mirrors the proven architecture from the existing shoparoo-meals-backend codebase but is redesigned as a long-running service rather than a one-shot script.

```
                        +---------------------------+
                        |     EC2 Instance          |
                        |                           |
 cron tick              |  +---------------------+  |
 (node-cron)  --------->|  |    Scheduler        |  |
                        |  |  (runs on cadence)  |  |
                        |  +--------+------------+  |
                        |           |               |
                        |           v               |
                        |  +---------------------+  |
                        |  |  Scraper Registry   |  |
                        |  |  (site configs +    |  |
                        |  |   adapter lookup)   |  |
                        |  +--------+------------+  |
                        |           |               |
                        |    +------+------+        |
                        |    |             |        |
                        |    v             v        |
                        |  +------+   +--------+   |
                        |  |Apify |   | Custom |   |
                        |  |Adapter|  | Adapter|   |
                        |  +--+---+   +---+----+   |
                        |     |           |         |
                        |     v           v         |
                        |  +---------------------+  |
                        |  |  Result Normalizer  |  |
                        |  |  (raw -> common     |  |
                        |  |   PropertyListing)  |  |
                        |  +--------+------------+  |
                        |           |               |
                        |           v               |
                        |  +---------------------+  |
                        |  |   Storage Writer    |  |
                        |  |  (JSON files to     |  |
                        |  |   data/{site}/{ts}) |  |
                        |  +---------------------+  |
                        |                           |
                        |  +---------------------+  |
 GET /health  --------->|  |  Health Server      |  |
                        |  |  (port 3000)        |  |
                        |  +---------------------+  |
                        +---------------------------+

External:
  Apify Cloud  <-- ApifyClient calls actors
  Target sites <-- Custom scrapers (HTTP/Cheerio or Playwright)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Scheduler** | Triggers scrape runs on a cron cadence. Iterates through registered sites, invokes each adapter, handles sequential/parallel execution | Scraper Registry, Storage Writer |
| **Scraper Registry** | Central registry of all site configurations. Maps site names to their adapter type (apify or custom) and config. Single source of truth for "what do we scrape" | Scheduler (consumed by) |
| **Apify Adapter** | Calls Apify cloud actors via ApifyClient, waits for completion, downloads dataset items. Wraps the ApifyClient.actor().call() + dataset().listItems() pattern proven in shoparoo | Apify Cloud (external), Result Normalizer |
| **Custom Adapter** | Runs local Crawlee-based scrapers (CheerioCrawler or PlaywrightCrawler) for sites without Apify actors or where custom logic is needed | Target websites (external), Result Normalizer |
| **Result Normalizer** | Transforms raw site-specific data into a common PropertyListing shape. Each site has its own transform function | Adapters (receives from), Storage Writer |
| **Storage Writer** | Writes normalized JSON to disk in `data/{site}/{timestamp}/listings.json` plus `_run_meta.json`. Identical pattern to shoparoo's writeCatalog/writeRunMeta | Filesystem |
| **Health Server** | Minimal Express/Fastify HTTP server with a single `GET /health` endpoint. Reports process uptime, last run times, scraper statuses, next scheduled run | External monitoring |

### Data Flow

**End-to-end flow for a single scrape cycle:**

1. **Cron fires** -- `node-cron` triggers the scheduler at the configured interval (e.g., every 6 hours).
2. **Scheduler iterates sites** -- Pulls the list of enabled sites from the Scraper Registry. Runs them sequentially (to stay within Apify free-tier memory limits, matching shoparoo pattern).
3. **Adapter executes** -- For each site:
   - **Apify sites:** ApifyClient calls `actor(actorId).call(input)`, waits via `run(id).waitForFinish()`, downloads items via `dataset(id).listItems()`.
   - **Custom sites:** Crawlee crawler runs locally, collects items into an array.
4. **Normalization** -- Raw items pass through a site-specific `transform(rawItem): PropertyListing` function, producing uniform output.
5. **Storage** -- `listings.json` and `_run_meta.json` written to `data/{siteName}/{YYYY-MM-DD_HHMMSS}/`.
6. **Status update** -- Scheduler records the run result (success/failure/item count) for the health endpoint.
7. **Health endpoint** -- Always available at `GET /health`, returns JSON with last run info, next scheduled run, and per-site status.

## Patterns to Follow

### Pattern 1: Scraper Adapter Interface (Strategy Pattern)
**What:** A common TypeScript interface that both Apify-based and custom scrapers implement. The scheduler does not know which type it is running -- it just calls `scrape()`.
**When:** Always. This is the core abstraction that makes adding new sites trivial.
**Example:**
```typescript
// src/scrapers/types.ts

export interface PropertyListing {
  sourcesite: string;
  sourceUrl: string;
  externalId: string;
  title: string;
  price: number | null;
  currency: string;
  propertyType: string | null;      // apartment, house, land, commercial
  transactionType: string | null;    // buy, rent
  rooms: number | null;
  livingAreaM2: number | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  canton: string | null;
  description: string | null;
  imageUrls: string[];
  rawData: Record<string, unknown>;  // full original payload
  scrapedAt: string;                 // ISO timestamp
}

export interface ScrapeResult {
  site: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  listings: PropertyListing[];
  durationMs: number;
  error?: string;
}

export interface ScraperAdapter {
  readonly site: string;
  scrape(): Promise<ScrapeResult>;
}
```

### Pattern 2: Site Config Registry (Data-Driven)
**What:** All site definitions live in a single config array, similar to shoparoo's `STORES` array. Each entry declares the site name, adapter type, and type-specific config.
**When:** Always. This is how you add a new site without touching scheduler code.
**Example:**
```typescript
// src/scrapers/registry.ts

export type SiteConfig =
  | {
      name: string;
      enabled: boolean;
      type: 'apify';
      actorId: string;
      input?: Record<string, unknown>;
      minListings: number;
    }
  | {
      name: string;
      enabled: boolean;
      type: 'custom';
      scraperFactory: () => ScraperAdapter;
      minListings: number;
    };

export const SITES: SiteConfig[] = [
  {
    name: 'homegate',
    enabled: true,
    type: 'apify',
    actorId: 'ecomscrape~homegate-property-search-scraper',
    input: { location: 'switzerland', maxItems: 1000 },
    minListings: 100,
  },
  {
    name: 'immoscout24',
    enabled: true,
    type: 'apify',
    actorId: 'ecomscrape~immoscout24-property-search-scraper',
    input: { location: 'switzerland', maxItems: 1000 },
    minListings: 100,
  },
  {
    name: 'comparis',
    enabled: true,
    type: 'custom',
    scraperFactory: () => new ComparisScraper(),
    minListings: 50,
  },
  // ... more sites added here
];
```

### Pattern 3: Factory Function for Adapter Resolution
**What:** A function that takes a SiteConfig and returns the appropriate ScraperAdapter, abstracting away the Apify vs custom distinction.
**When:** Used by the scheduler to get the right adapter for each site.
**Example:**
```typescript
// src/scrapers/factory.ts

import { ApifyScraperAdapter } from './adapters/apify-adapter.js';
import type { SiteConfig, ScraperAdapter } from './types.js';

export function createAdapter(config: SiteConfig): ScraperAdapter {
  switch (config.type) {
    case 'apify':
      return new ApifyScraperAdapter(config);
    case 'custom':
      return config.scraperFactory();
    default:
      throw new Error(`Unknown adapter type`);
  }
}
```

### Pattern 4: Apify Adapter Wrapper (Proven Pattern from Shoparoo)
**What:** Reuse the exact ApifyClient call/wait/download pattern from shoparoo's ingest.ts, wrapped in the ScraperAdapter interface.
**When:** For any site that has an existing Apify actor available (Homegate, ImmoScout24, etc.).
**Example:**
```typescript
// src/scrapers/adapters/apify-adapter.ts

import { ApifyClient } from 'apify-client';

export class ApifyScraperAdapter implements ScraperAdapter {
  readonly site: string;

  constructor(
    private config: ApifySiteConfig,
    private client: ApifyClient,
  ) {
    this.site = config.name;
  }

  async scrape(): Promise<ScrapeResult> {
    const start = Date.now();
    try {
      const run = await this.client.actor(this.config.actorId).call(this.config.input ?? {});
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      const listings = items.map((item) =>
        this.config.transform(item as Record<string, unknown>)
      );

      return {
        site: this.site,
        status: 'SUCCEEDED',
        listings,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        site: this.site,
        status: 'FAILED',
        listings: [],
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
```

### Pattern 5: Storage Layout (Timestamped Snapshots)
**What:** Each scrape run writes to `data/{site}/{YYYY-MM-DD_HHMMSS}/listings.json` plus `_run_meta.json`. This is the exact same pattern from shoparoo that has been proven to work.
**When:** Always. Historical snapshots are a core value proposition.
**Example directory tree:**
```
data/
  homegate/
    2026-03-05_060000/
      listings.json        # Array of PropertyListing objects
      _run_meta.json       # Run metadata (duration, count, status)
    2026-03-05_120000/
      listings.json
      _run_meta.json
  immoscout24/
    2026-03-05_060000/
      listings.json
      _run_meta.json
  comparis/
    2026-03-05_060000/
      listings.json
      _run_meta.json
```

## Recommended Project Structure

```
swiss-property-scraper/
  package.json                    # Single package, no workspaces needed
  tsconfig.json
  .env                           # APIFY_TOKEN, PORT, CRON_SCHEDULE
  .env.example

  src/
    index.ts                     # Entry point: starts scheduler + health server
    config.ts                    # Environment variable loading, defaults

    scheduler/
      scheduler.ts               # Cron loop, iterates sites, calls adapters
      types.ts                   # RunStatus, SchedulerState

    scrapers/
      types.ts                   # ScraperAdapter, ScrapeResult, PropertyListing
      registry.ts                # SITES config array (the single place to add sites)
      factory.ts                 # createAdapter(config) -> ScraperAdapter

      adapters/
        apify-adapter.ts         # ApifyClient-based adapter (generic)
        custom-adapter.ts        # Base class for Crawlee-based custom scrapers

      sites/                     # Per-site scraper implementations
        homegate/
          transform.ts           # Raw Apify output -> PropertyListing
        immoscout24/
          transform.ts
        comparis/
          scraper.ts             # Custom CheerioCrawler implementation
          transform.ts
        flatfox/
          scraper.ts
          transform.ts
        # ... one folder per site

    storage/
      writer.ts                  # writeListings(), writeRunMeta()
      types.ts                   # RunMeta interface

    health/
      server.ts                  # Minimal HTTP server, GET /health
      types.ts                   # HealthResponse

    utils/
      logger.ts                  # Structured logging (matches shoparoo pattern)
      timestamp.ts               # formatTimestamp helper
```

**Why this structure:**
- **Flat monolith, no workspaces** -- Unlike shoparoo which used npm workspaces because actors deployed independently to Apify cloud, this project is a single EC2 process. No need for workspace overhead.
- **`scrapers/sites/` is the extension point** -- Adding a new site means: (1) create a folder in `sites/`, (2) add a transform.ts (and optionally scraper.ts for custom), (3) add an entry to `registry.ts`. No other files change.
- **Adapters vs Sites separation** -- Adapters are the generic Apify/Custom wrappers. Sites contain site-specific logic (transforms, custom crawlers). This keeps generic infrastructure separate from per-site details.

## How to Add a New Scraper

This is the critical "plugin" workflow. Adding a new site should take under 30 minutes for an Apify-backed site or under 2 hours for a custom scraper.

### Adding an Apify-backed site (e.g., Homegate):

1. **Check Apify Store** for an existing actor (Homegate has `ecomscrape~homegate-property-search-scraper`).
2. **Create** `src/scrapers/sites/homegate/transform.ts`:
```typescript
import type { PropertyListing } from '../types.js';

export function transformHomegate(raw: Record<string, unknown>): PropertyListing {
  return {
    sourcesite: 'homegate',
    sourceUrl: raw.url as string,
    externalId: raw.id as string,
    title: raw.title as string,
    price: raw.price as number | null,
    currency: 'CHF',
    propertyType: raw.propertyType as string | null,
    transactionType: raw.offerType as string | null,
    rooms: raw.rooms as number | null,
    livingAreaM2: raw.livingSpace as number | null,
    address: raw.address as string | null,
    zipCode: raw.zip as string | null,
    city: raw.city as string | null,
    canton: raw.canton as string | null,
    description: raw.description as string | null,
    imageUrls: (raw.images as string[]) ?? [],
    rawData: raw,
    scrapedAt: new Date().toISOString(),
  };
}
```
3. **Register** in `src/scrapers/registry.ts`:
```typescript
import { transformHomegate } from './sites/homegate/transform.js';

// Add to SITES array:
{
  name: 'homegate',
  enabled: true,
  type: 'apify',
  actorId: 'ecomscrape~homegate-property-search-scraper',
  input: { location: 'switzerland' },
  transform: transformHomegate,
  minListings: 100,
},
```
4. **Done.** Next scheduler tick will pick it up.

### Adding a custom scraper (e.g., Comparis):

1. **Create** `src/scrapers/sites/comparis/scraper.ts`:
```typescript
import { CheerioCrawler } from 'crawlee';
import type { ScraperAdapter, ScrapeResult, PropertyListing } from '../../types.js';
import { transformComparis } from './transform.js';

export class ComparisScraper implements ScraperAdapter {
  readonly site = 'comparis';

  async scrape(): Promise<ScrapeResult> {
    const start = Date.now();
    const listings: PropertyListing[] = [];

    const crawler = new CheerioCrawler({
      async requestHandler({ $, request }) {
        // Parse listing data from HTML
        const raw = { /* ... extract fields ... */ };
        listings.push(transformComparis(raw));
      },
    });

    await crawler.run(['https://www.comparis.ch/immobilien/result/list']);

    return {
      site: this.site,
      status: 'SUCCEEDED',
      listings,
      durationMs: Date.now() - start,
    };
  }
}
```
2. **Create** `src/scrapers/sites/comparis/transform.ts` (same pattern as Apify sites).
3. **Register** in `src/scrapers/registry.ts`:
```typescript
import { ComparisScraper } from './sites/comparis/scraper.js';

// Add to SITES array:
{
  name: 'comparis',
  enabled: true,
  type: 'custom',
  scraperFactory: () => new ComparisScraper(),
  minListings: 50,
},
```
4. **Done.**

## Anti-Patterns to Avoid

### Anti-Pattern 1: God Scheduler
**What:** Putting site-specific scraping logic directly in the scheduler.
**Why bad:** Adding a new site requires modifying the scheduler. Scheduler becomes a massive file with mixed concerns. This is how the shoparoo ingest.ts could have gone wrong -- but it wisely delegated to Apify actors.
**Instead:** Scheduler only orchestrates. All site-specific logic lives in `scrapers/sites/`. Scheduler calls `adapter.scrape()` and does not know what happens inside.

### Anti-Pattern 2: Shared Mutable State Between Scrapers
**What:** Using global variables or shared objects to pass data between scraper runs.
**Why bad:** Race conditions if you later parallelize. Harder to test. Leaks between runs.
**Instead:** Each `scrape()` call is fully self-contained. Returns a `ScrapeResult`. State is write-only to disk.

### Anti-Pattern 3: Storing Raw + Normalized in the Same File
**What:** Mixing the raw API response with normalized fields in one JSON file.
**Why bad:** Raw data schema changes per site and over time. Downstream consumers need a stable schema.
**Instead:** Store `rawData` as a nested field inside each `PropertyListing` object. The top-level fields are the normalized contract. Raw data is preserved for debugging and re-processing.

### Anti-Pattern 4: Building a Database Too Early
**What:** Setting up PostgreSQL/MongoDB before you have stable scrapers and a known data shape.
**Why bad:** Schema migrations before you understand the data. Setup overhead during hackathon. JSON files are sufficient for data collection phase.
**Instead:** JSON files first. Add a database when you build the analysis/API layer. The `PropertyListing` interface becomes your future DB schema.

### Anti-Pattern 5: Overengineering the Health Endpoint
**What:** Building full REST API, authentication, metrics dashboards before scrapers work.
**Why bad:** Wasted hackathon time. The only consumer is "is the process alive?"
**Instead:** A single `GET /health` returning `{ status: "ok", uptime, lastRun, nextRun, scraperStatuses }`. Under 30 lines of code. Use Node.js built-in `http` module or minimal `express`.

### Anti-Pattern 6: Running All Scrapers in Parallel Initially
**What:** Using `Promise.all()` to run 23 scrapers simultaneously.
**Why bad:** Apify free-tier has memory limits. EC2 instance memory constraints. Rate limiting from target sites. Harder to debug failures.
**Instead:** Sequential execution (same as shoparoo), with future option to add controlled concurrency. The scheduler can later be enhanced with a concurrency parameter per site.

## Build Order (Dependency Analysis)

The components have clear dependencies. Build them in this order:

```
Phase 1: Foundation (must build first)
  1. Project scaffold (package.json, tsconfig, .env)
  2. Config loader (src/config.ts)
  3. Logger utility (src/utils/logger.ts)
  4. PropertyListing type + ScraperAdapter interface (src/scrapers/types.ts)
  5. Storage writer (src/storage/writer.ts)
     ^ These have ZERO external dependencies on each other

Phase 2: First Scraper (validates the architecture)
  6. Apify adapter (src/scrapers/adapters/apify-adapter.ts)
     ^ Depends on: types (5), apify-client package
  7. First site transform (e.g., homegate/transform.ts)
     ^ Depends on: types (5)
  8. Registry with one site (src/scrapers/registry.ts)
     ^ Depends on: transform (7), adapter (6)
  9. Manual test script (run one site, verify JSON output)
     ^ Validates: adapter -> transform -> storage pipeline

Phase 3: Scheduler + Health (makes it a service)
  10. Scheduler (src/scheduler/scheduler.ts)
      ^ Depends on: registry (8), factory, storage (5)
  11. Health server (src/health/server.ts)
      ^ Depends on: scheduler state (10)
  12. Entry point (src/index.ts) wiring scheduler + health
      ^ Depends on: scheduler (10), health (11)

Phase 4: Scale Out (add more sites)
  13-N. Additional site transforms/scrapers
      ^ Each only depends on: types (5), registry addition
```

**Critical path:** Types -> Storage -> Apify Adapter -> First Site Transform -> Registry -> Manual Test. This validates the full pipeline before adding the scheduler. Do NOT build the scheduler before you have proven one scraper works end-to-end.

## Scalability Considerations

| Concern | 5 sites (hackathon) | 23 sites (full target) | 50+ sites (future) |
|---------|---------------------|------------------------|---------------------|
| Execution time | Sequential, ~30 min total | Sequential, ~2-3 hours | Add concurrency (3-5 parallel), use queue |
| Apify costs | Free tier sufficient | May exceed free tier | Evaluate paid plan or shift to custom scrapers |
| Disk space | Negligible (~10MB/day) | ~100MB/day | Add retention policy, compress old snapshots |
| Error handling | Log and continue | Add per-site retry (1x) | Dead letter queue, alerting |
| Monitoring | Health endpoint only | Add per-site status tracking | Add metrics (Prometheus/CloudWatch) |
| Memory (EC2) | t3.micro sufficient | t3.small for Playwright scrapers | t3.medium if running many browser instances |

## Sources

- [Apify SDK for JavaScript - Overview](https://docs.apify.com/sdk/js/docs/overview) -- HIGH confidence, official docs
- [Apify API Client for JavaScript](https://docs.apify.com/api/client/js/docs) -- HIGH confidence, official docs
- [Crawlee GitHub - Architecture](https://github.com/apify/crawlee) -- HIGH confidence, official repo
- [Crawlee Quick Start](https://crawlee.dev/js/docs/quick-start) -- HIGH confidence, official docs
- [Homegate Property Search Scraper on Apify](https://apify.com/ecomscrape/homegate-property-search-scraper/api) -- MEDIUM confidence, third-party actor
- [ImmoScout24 Property Search Scraper on Apify](https://apify.com/ecomscrape/immoscout24-property-search-scraper) -- MEDIUM confidence, third-party actor
- [Node.js Schedulers Comparison (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) -- MEDIUM confidence, community guide
- [ZenRows TypeScript Web Scraping Guide](https://www.zenrows.com/blog/web-scraping-typescript) -- LOW confidence, commercial blog
- [Web Scraping Health Checks (WebScraping.AI)](https://webscraping.ai/faq/apis/how-do-you-implement-api-health-checks-for-scraping-services) -- LOW confidence, single source
- Existing shoparoo-meals-backend codebase at `/Users/maximgusev/workspace/shoparoo-group/shoparoo-meals-backend` -- HIGH confidence, developer's own working code
