# Technology Stack

**Project:** Swiss Property Scraper
**Researched:** 2026-03-05
**Overall Confidence:** HIGH

---

## Recommended Stack

### Runtime & Language

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | 22.x LTS | Runtime | LTS with native TypeScript strip support (v22.6+). Required by Playwright. Team familiarity from shoparoo. | HIGH |
| TypeScript | ~5.7 | Language | Type safety for scraper configs, data schemas, scheduler logic. Crawlee is built in TS. | HIGH |
| tsx | latest | TS execution (dev) | 5-10x faster than ts-node via esbuild. Zero config. Watch mode for dev iteration. | HIGH |

**Why not ts-node:** tsx is faster, simpler, and requires no tsconfig hacks. ts-node is legacy at this point.
**Why not native Node TS stripping:** Still experimental for production; tsx is more battle-tested and handles edge cases better.

### Web Scraping Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Crawlee | ^3.16 | Scraping orchestration | Built by Apify. Unified API across CheerioCrawler, PlaywrightCrawler. Anti-bot fingerprinting, proxy rotation, session management, request queuing all built-in. Switching between HTTP and browser crawlers requires changing one import. | HIGH |
| Playwright | ^1.58 | Browser automation | For JS-rendered sites. Multi-browser support (Chromium, Firefox, WebKit). Better maintained than Puppeteer. Crawlee's PlaywrightCrawler wraps it. | HIGH |
| Cheerio | (via Crawlee) | HTML parsing | Bundled with Crawlee's CheerioCrawler. 70% faster than browser-based for static content. ~500 pages/min on 4GB RAM. | HIGH |

**Strategy -- Use CheerioCrawler as default, PlaywrightCrawler as fallback:**

Most Swiss real estate sites (Homegate, ImmoScout24) embed property data in `window.__INITIAL_STATE__` or `<script>` tags as JSON. This means CheerioCrawler (HTTP-only, no browser) can extract data directly without JavaScript rendering. This is dramatically faster and uses far less memory.

Reserve PlaywrightCrawler for sites that:
- Require JavaScript to render listing content
- Have aggressive anti-bot that blocks HTTP requests
- Need interaction (scrolling, clicking "load more")

Crawlee makes switching trivial -- same handler logic, different crawler class.

### Apify Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| apify-client | latest | Call Apify cloud actors | Lightweight client for calling pre-built Apify Store actors (Homegate scraper, ImmoScout24 scraper) from EC2. Auto-retry, rate limiting built-in. | HIGH |
| apify (SDK) | latest | Actor development (optional) | Only needed if building actors to deploy ON Apify platform. For EC2-only custom scrapers, Crawlee alone suffices. | MEDIUM |

**Integration pattern:**

```typescript
// For sites with existing Apify Store actors (Homegate, ImmoScout24):
import { ApifyClient } from 'apify-client';
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('ecomscrape/homegate-property-details-scraper').call(input);
const { items } = await client.dataset(run.defaultDatasetId).listItems();

// For custom scrapers (sites without Apify actors):
import { CheerioCrawler } from 'crawlee';
// Run directly on EC2, no Apify platform needed
```

**Known Apify Store actors for Swiss real estate:**
- `ecomscrape/homegate-property-details-scraper` -- Homegate.ch property details
- `ecomscrape/homegate-property-search-scraper` -- Homegate.ch search results
- `ecomscrape/immoscout24-property-details-scraper` -- ImmoScout24.ch property details
- `ecomscrape/immoscout24-property-search-scraper` -- ImmoScout24.ch search results

Sites without Apify actors (Comparis, Flatfox, Newhome, etc.) need custom Crawlee scrapers on EC2.

### Scheduler

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| node-cron | ^4.2 | Periodic scraper execution | Lightweight (67KB), zero dependencies beyond cron parsing. Cron syntax familiar. Perfect for single-server, in-process scheduling. No Redis required. | HIGH |

**Why node-cron over BullMQ:**
- BullMQ requires Redis -- unnecessary infrastructure for a single EC2 box
- BullMQ is designed for distributed job queues across multiple workers/servers
- node-cron runs in-process, trivial to set up, sufficient for 23 scrapers on a single machine
- If the project later needs job persistence, retry queues, or multi-server scaling, migrate to BullMQ then

**Why not cron (OS-level):**
- node-cron keeps scheduling in the application layer, co-located with scraper logic
- Easier to monitor, configure, and deploy as a single Node.js process
- Can dynamically adjust schedules without touching crontab

**Scheduling approach:**
```typescript
import cron from 'node-cron';

// Run scrapers at different intervals to spread load
cron.schedule('0 */4 * * *', () => runScraper('homegate'));    // Every 4 hours
cron.schedule('30 */4 * * *', () => runScraper('immoscout24')); // Offset by 30 min
cron.schedule('0 */6 * * *', () => runScraper('comparis'));     // Every 6 hours
```

### HTTP Server (Health Endpoint)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Fastify | ^5.7 | Health endpoint server | 2-3x faster than Express. Native TypeScript support. Plugin system superior for adding routes later. Schema validation built-in. Pino logging integrated. | HIGH |

**Why Fastify over Express:**
- Built-in TypeScript support (Express needs @types/express)
- Native JSON schema validation
- Pino logger integrated by default
- 70-80K req/s vs Express's 20-30K req/s (matters less here, but good defaults)
- Plugin architecture is cleaner for future expansion (API routes in later milestones)
- Express v5 has been in beta for years; Fastify v5 is stable and actively maintained

**Health endpoint is minimal:**
```typescript
import Fastify from 'fastify';

const server = Fastify({ logger: true }); // Pino built-in

server.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  scrapers: getScraperStatuses(), // last run times, success/fail
}));

await server.listen({ port: 3000, host: '0.0.0.0' });
```

### Data Storage (Raw JSON)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js fs/promises | built-in | File I/O | Native, zero dependencies. async/await API. | HIGH |
| zod | ^4.3 | Schema validation | Validate scraped data shape before writing. Catch scraper breakage early. 14x faster in v4 vs v3. Zero dependencies. | HIGH |

**Storage pattern -- date-partitioned directory structure:**

```
data/
  raw/
    homegate/
      2026-03-05/
        search-results-001.json
        search-results-002.json
        listings/
          listing-12345.json
          listing-12346.json
      2026-03-06/
        ...
    immoscout24/
      2026-03-05/
        ...
    comparis/
      ...
```

**Why this structure:**
- Date partitioning enables historical snapshots (core project goal)
- Per-site directories keep data organized
- Individual listing files prevent giant monolithic JSON files
- Easy to `ls` / `du` to check data volume
- Simple to archive old data (`tar` a date directory)
- No database overhead; grep/jq for ad-hoc queries

**Why not a single large JSON file per scrape:**
- Large files (>100MB) cause memory issues with `JSON.parse()`
- Individual files enable incremental processing
- Deduplication is simpler (check if `listing-{id}.json` exists)

### Logging

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Pino | (via Fastify) | Structured logging | Ships with Fastify. JSON output for machine parsing. Async, non-blocking. Fastest Node.js logger. | HIGH |
| pino-pretty | latest | Dev log formatting | Human-readable logs during development. Disabled in production. | MEDIUM |

**Why not Winston:** Pino is faster, ships with Fastify, and JSON-structured logs are better for scraper debugging (attach scraper name, site URL, listing count as structured fields).

### Configuration & Environment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| dotenv | ^17.3 | Environment variables | Load .env file. 45M+ weekly downloads. Zero dependencies. Industry standard. | HIGH |
| zod | ^4.3 | Config validation | Validate env vars at startup. Fail fast if APIFY_TOKEN missing. Reuse same lib as data validation. | HIGH |

**Environment variables needed:**
```bash
APIFY_TOKEN=           # Reuse from shoparoo setup
NODE_ENV=production
PORT=3000
DATA_DIR=/data/raw     # Where JSON files are stored
LOG_LEVEL=info
```

### Development Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tsx | latest | Run TypeScript | Fast execution via esbuild. Watch mode. | HIGH |
| ESLint | ^9.x | Linting | Flat config format (eslint.config.js). TypeScript plugin. | MEDIUM |
| Prettier | ^3.x | Formatting | Consistent code style. | MEDIUM |
| vitest | ^3.x | Testing (future) | Fastest TS-native test runner. Not needed for hackathon MVP. | LOW |

**Why not Jest:** vitest is faster, native ESM/TS support, but testing is out of scope for hackathon week.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Scraping framework | Crawlee | Raw Playwright/Puppeteer | Crawlee adds request queuing, anti-bot fingerprinting, session management, proxy rotation. Raw Playwright means building all of this yourself. |
| Scraping framework | Crawlee | Scrapy (Python) | Project is Node.js/TypeScript. Crawlee is the JS equivalent and integrates with Apify. |
| Browser automation | Playwright (via Crawlee) | Puppeteer | Puppeteer is Chrome-only. Playwright supports Chromium, Firefox, WebKit. Playwright has better API, active development by Microsoft. |
| HTTP parsing | Cheerio (via Crawlee) | JSDOM | Cheerio is 70% faster. JSDOM simulates full DOM which is unnecessary for data extraction. |
| Scheduler | node-cron | BullMQ | BullMQ requires Redis. Over-engineered for single-server, 23-scraper setup. Add Redis dependency only when actually needed. |
| Scheduler | node-cron | OS crontab | Keeps scheduling in app layer. Dynamic config. Easier monitoring. Single process deployment. |
| HTTP server | Fastify | Express | Express lacks native TS support, slower, middleware architecture less clean. Express v5 still beta. Fastify v5 is stable with better defaults. |
| HTTP server | Fastify | None (no server) | Health endpoint is a requirement. Fastify is minimal enough to justify. |
| Logger | Pino (via Fastify) | Winston | Pino is faster, JSON-native, integrated with Fastify. Winston is more configurable but that configurability is unnecessary here. |
| Validation | Zod v4 | Joi / Yup | Zod is TypeScript-first with static type inference. Joi/Yup are JS-first with TS bolted on. Zod v4 is 14x faster than v3. |
| TS runner | tsx | ts-node | tsx is 5-10x faster, zero config, watch mode built-in. ts-node is legacy. |
| TS runner | tsx | Native Node TS | Still experimental for production use. tsx handles edge cases better. |
| Storage | Raw JSON files | SQLite | JSON files are simpler, no schema migration, easy to inspect with jq. Database is explicitly out of scope. |
| Storage | Raw JSON files | MongoDB | Adds infrastructure overhead. JSON files achieve the same goal for data collection phase. |

---

## Swiss Real Estate Site Scraping Techniques

Understanding how target sites serve data is critical for choosing the right crawler type per site.

### Sites Using Hidden JSON Data (CheerioCrawler viable)

| Site | Technique | Data Location | Notes |
|------|-----------|---------------|-------|
| Homegate.ch | Hidden web data | `window.__INITIAL_STATE__` in `<script>` tags | Extract JSON directly from HTML. No JS rendering needed for basic extraction. Has anti-bot measures (empty/obfuscated data). |
| ImmoScout24.ch | Hidden web data | `<script>` tags with JSON datasets | Property data embedded in page source. No JS rendering needed for basic extraction. Rate limiting in place. |

### Sites Likely Requiring Browser (PlaywrightCrawler)

| Site | Likely Reason | Notes |
|------|---------------|-------|
| Comparis.ch | SPA / heavy JS rendering | Major aggregator, likely React/Angular app. Research needed per-site. |
| Most agency sites | Varies | Smaller sites may use WordPress (static HTML, easy) or React (needs browser). Test each. |

### Strategy

1. **Try CheerioCrawler first** for every site -- fastest, lowest resource usage
2. **Check for hidden JSON** (`__INITIAL_STATE__`, `__NEXT_DATA__`, inline `<script type="application/ld+json">`)
3. **Fall back to PlaywrightCrawler** only when HTTP requests get blocked or content requires JS rendering
4. **Use Apify Store actors** for Homegate and ImmoScout24 to save development time -- these are already built and maintained

---

## Installation

```bash
# Core scraping
npm install crawlee @crawlee/cheerio @crawlee/playwright playwright

# Apify integration
npm install apify-client

# Server & scheduling
npm install fastify node-cron

# Validation & config
npm install zod dotenv

# Logging (pino comes with fastify, add pretty for dev)
npm install -D pino-pretty

# TypeScript tooling
npm install -D typescript tsx @types/node

# Install Playwright browsers (required on EC2)
npx playwright install --with-deps chromium
```

**EC2 note:** `npx playwright install --with-deps chromium` installs Chromium and its system dependencies (fonts, libraries). Only install Chromium (not all browsers) to minimize disk usage. This command handles apt-get dependencies automatically on Ubuntu/Debian.

---

## Package Summary

### Production Dependencies

| Package | Purpose |
|---------|---------|
| `crawlee` | Scraping framework core |
| `@crawlee/cheerio` | HTTP-based HTML scraping |
| `@crawlee/playwright` | Browser-based scraping |
| `playwright` | Browser automation engine |
| `apify-client` | Call Apify Store actors |
| `fastify` | HTTP server for health endpoint |
| `node-cron` | In-process job scheduling |
| `zod` | Data and config validation |
| `dotenv` | Environment variable loading |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `tsx` | Fast TS execution |
| `@types/node` | Node.js type definitions |
| `pino-pretty` | Human-readable dev logs |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Puppeteer** (standalone) | Playwright is superior (multi-browser, better API, Microsoft-backed). Crawlee wraps both but Playwright is the better choice. |
| **Express** | Legacy middleware pattern. No native TS. Slower. Fastify is the modern choice. |
| **ts-node** | Slow, complex configuration. tsx is faster and simpler. |
| **BullMQ / Redis** | Over-engineered for single-server. Adds infrastructure dependency. Use node-cron. |
| **MongoDB / PostgreSQL** | Out of scope. Raw JSON files are sufficient for data collection phase. |
| **Axios / node-fetch** | Crawlee handles HTTP internally with got-scraping (browser-like fingerprinting). Don't use raw HTTP clients for scraping. |
| **Selenium** | Legacy. Playwright/Puppeteer are modern replacements with better APIs. |
| **Scrapy** | Python ecosystem. Project is Node.js/TypeScript. |
| **PM2** | For hackathon, a simple systemd service or `tsx watch` is sufficient. PM2 adds complexity without clear benefit at this stage. |

---

## Sources

- [Crawlee official docs -- Introduction](https://crawlee.dev/js/docs/introduction) (HIGH confidence)
- [Crawlee GitHub](https://github.com/apify/crawlee) (HIGH confidence)
- [Apify SDK for JavaScript docs](https://docs.apify.com/sdk/js) (HIGH confidence)
- [Apify Client JS docs](https://docs.apify.com/api/client/js) (HIGH confidence)
- [Homegate Property Details Scraper on Apify](https://apify.com/ecomscrape/homegate-property-details-scraper) (HIGH confidence)
- [ImmoScout24 Property Search Scraper on Apify](https://apify.com/ecomscrape/immoscout24-property-search-scraper) (HIGH confidence)
- [How to Scrape Homegate.ch -- ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) (MEDIUM confidence)
- [How to Scrape ImmoScout24.ch -- ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-immoscout24-ch-real-estate-property-data) (MEDIUM confidence)
- [Swiss Immo Scraper (Python reference)](https://github.com/dvdblk/swiss-immo-scraper) (MEDIUM confidence)
- [Best Node.js Schedulers -- BetterStack](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) (MEDIUM confidence)
- [Pino vs Winston -- BetterStack](https://betterstack.com/community/comparisons/pino-vs-winston/) (MEDIUM confidence)
- [TSX vs ts-node -- BetterStack](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/) (MEDIUM confidence)
- [Express vs Fastify 2025 -- Medium](https://medium.com/codetodeploy/express-or-fastify-in-2025-whats-the-right-node-js-framework-for-you-6ea247141a86) (MEDIUM confidence)
- [Zod v4 announcement -- InfoQ](https://www.infoq.com/news/2025/08/zod-v4-available/) (MEDIUM confidence)
- [Cheerio vs Puppeteer 2026 -- Proxyway](https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping) (MEDIUM confidence)
- [Best JavaScript Web Scraping Libraries 2025 -- Apify Blog](https://blog.apify.com/best-javascript-web-scraping-libraries/) (MEDIUM confidence)
