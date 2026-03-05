# Phase 1: Foundation + First Scraper - Research

**Researched:** 2026-03-05
**Domain:** TypeScript project setup, Apify integration, Zod validation, structured logging, Swiss data parsing
**Confidence:** HIGH

## Summary

This phase establishes a greenfield TypeScript project that scrapes Homegate.ch property listings via Apify, validates them with Zod, and writes normalized JSONL output to disk. The stack is well-established: `apify-client` for actor orchestration, Zod v4 for schema validation with type inference, Pino for structured JSON logging, and `tsx` for direct TypeScript execution. Node.js 22 provides native `.env` file support, eliminating the need for dotenv.

The Homegate actor by `ecomscrape` on Apify accepts search URLs with filters pre-applied, meaning the scraper must construct Homegate search URLs for rent and buy listings. Raw output from the actor contains Swiss-formatted numbers (apostrophe thousands separators like `CHF 1'200'000` and decimal rooms like `3.5 Zimmer`) that must be parsed to numeric values. The scraper adapter pattern should define a common interface so Phase 2 (FlatFox) can plug in without modifying core pipeline logic.

**Primary recommendation:** Use the standard TypeScript/Node.js stack (Zod v4 + Pino + apify-client + tsx) with a clean adapter interface. Keep it simple -- no framework overhead, no build step for execution, just `tsx` running TypeScript directly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Schema covers both rent AND buy listings -- `listingType` field discriminates between them
- Required fields: URL, title, listingType, price, rooms, address (city + canton) -- listings missing any required field are rejected
- Address stored in dual format: raw address string preserved as-is PLUS structured fields (street, zip, city, canton) parsed where available
- Every record includes `source` (e.g., "homegate") and `scrapedAt` (ISO timestamp) for traceability
- Geographic scope: all of Switzerland -- full nationwide scrape, no regional filtering
- Property types: residential only (apartments and houses) -- no commercial, parking, or storage
- No price or size filters -- capture everything, filtering happens downstream during analysis
- No artificial listing cap -- scrape all available Homegate listings (memory-safe via JSONL streaming to disk)
- Comprehensive capture: store everything Homegate provides (sqm, floor, year built, description, amenities, etc.)
- Description text: stored as-is, full length, no truncation
- Images: store URLs only, never download actual image files
- Agent/agency info: capture agency name and contact info when available
- Normalized output only -- no raw Apify response preserved alongside clean records
- Default log level: info -- progress milestones (starting, records fetched, validation summary, output path, done)
- Validation rejections: warning per rejection during run, then aggregate summary at end
- Apify failure handling: fail fast, no partial output -- exit with error, clean state for retry
- `--dry-run` flag supported: fetches small sample (~10 listings), validates and logs, does not write to disk

### Claude's Discretion
- Exact Apify actor selection and input configuration for Homegate
- Swiss number parser implementation approach
- Pino logger configuration details
- TypeScript project structure (folder layout, tsconfig settings)
- Exit codes and error message formatting
- Exact JSONL streaming implementation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SETUP-01 | Project initialized with package.json, tsconfig.json, ESLint, and .env/.env.example | tsconfig uses `@tsconfig/node22`, ESLint flat config with `typescript-eslint`, Node.js 22 native `--env-file` support eliminates dotenv dependency |
| SETUP-02 | Pino-based structured logging with configurable log levels | Pino v10.3.x provides structured JSON logging out of the box; pino-pretty v13.x for dev; child loggers for per-component context |
| SETUP-03 | Config loader validates required environment variables at startup (fail fast on missing APIFY_TOKEN) | Simple module that reads `process.env.APIFY_TOKEN` and throws immediately if missing; Zod can validate env shape too |
| SCRP-01 | PropertyListing TypeScript interface defines unified schema for all scraped listings | Zod v4 schema with `z.infer<>` for type inference; discriminated union on `listingType`; optional fields for data not always present |
| SCRP-02 | Scraper adapter interface allows both Apify-backed and direct API scrapers | TypeScript interface with async `scrape()` method returning raw records; separate `normalize()` step; adapter pattern for extensibility |
| SCRP-03 | Scraped data stored as files in `data/{site}/{YYYY-MM-DD_HHMMSS}/` directories | `fs.mkdirSync` with `recursive: true`; JSONL format (one JSON object per line); streaming writes via `fs.createWriteStream` |
| SCRP-04 | Swiss number parser handles apostrophe thousands separators and decimal rooms | Simple regex/string replacement: strip apostrophes, parse with `parseFloat`; handles `CHF 1'200'000` and `3.5 Zimmer` |
| QUAL-01 | Zod schema validation on every scraped record before storage | `schema.safeParse()` per record; valid records written to JSONL; invalid records logged with details and excluded |
| SITE-01 | Homegate scraper via Apify actor retrieves property listings | `ecomscrape/homegate-property-search-scraper` actor; input is Homegate search URLs with filters; `apify-client` `.call()` + `.listItems()` pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `apify-client` | ^2.22 | Apify API client for calling actors and retrieving datasets | Official Apify JS client; built-in retries, TypeScript types, smart polling for `.call()` |
| `zod` | ^4.3 | Schema validation with TypeScript type inference | Industry standard for TS validation; v4 is stable, 2x faster than v3, ships as default `"zod"` import |
| `pino` | ^10.3 | Structured JSON logging | 5x faster than Winston; structured JSON by default; child loggers for context; minimal overhead |
| `tsx` | ^4.21 | TypeScript execution without build step | esbuild-powered; instant startup; works with ESM and CJS; `npx tsx` runs .ts files directly |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pino-pretty` | ^13.1 | Human-readable log formatting | Dev only (`pino-pretty` as transport); never in production |
| `@tsconfig/node22` | latest | Preset tsconfig for Node.js 22 | Base tsconfig to extend; sets correct target/module/moduleResolution |
| `typescript` | ^5.7 | TypeScript compiler | Type checking, IDE support; not needed at runtime when using tsx |
| `eslint` | ^9.x | Linting | Flat config format (`eslint.config.mjs`); with `typescript-eslint` plugin |
| `typescript-eslint` | ^8.x | TypeScript ESLint integration | Recommended + strict rule sets for TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` | `ts-node` | tsx is faster (esbuild-based), simpler ESM support; ts-node has more config options but slower |
| `tsx` | Node.js native `--experimental-strip-types` | Native TS support in Node 22+ is experimental, does not support tsconfig paths, limited features |
| `zod` v4 | `zod` v3 | v4 is stable, faster, better API; v3 still works but no reason for new projects to use it |
| `pino` | `winston` | Winston is more popular but 5x slower; Pino's JSON output is ideal for structured logging |
| dotenv | Node.js `--env-file` | Node 22+ has native `.env` support; eliminates a dependency; use `--env-file-if-exists` for optional loading |

**Installation:**
```bash
npm install apify-client zod pino
npm install -D tsx typescript pino-pretty @tsconfig/node22 eslint typescript-eslint
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── manual-run.ts        # CLI entry point (npx tsx src/manual-run.ts homegate)
├── config.ts            # Environment validation, fail-fast on missing vars
├── logger.ts            # Pino logger factory (shared instance)
├── schema/
│   └── listing.ts       # PropertyListing Zod schema + inferred types
├── parsers/
│   └── swiss-numbers.ts # Swiss number format parsing utilities
├── scrapers/
│   ├── types.ts         # ScraperAdapter interface definition
│   └── homegate/
│       ├── adapter.ts   # HomegateAdapter implements ScraperAdapter
│       └── normalize.ts # Raw Apify output -> PropertyListing mapping
└── output/
    └── jsonl-writer.ts  # JSONL streaming writer to disk
data/                    # Output directory (gitignored)
├── homegate/
│   └── 2026-03-05_143022/
│       └── listings.jsonl
.env.example             # Required env vars documented
.env                     # Local env (gitignored)
```

### Pattern 1: Scraper Adapter Interface
**What:** Common interface that all scrapers implement, abstracting away whether data comes from Apify or a direct API
**When to use:** Every scraper (Homegate now, FlatFox in Phase 2)
**Example:**
```typescript
// src/scrapers/types.ts
interface ScraperAdapter {
  readonly name: string;
  scrape(options: ScrapeOptions): Promise<RawRecord[]>;
}

interface ScrapeOptions {
  dryRun: boolean;
  // Extensible for future options
}

type RawRecord = Record<string, unknown>;

// src/scrapers/homegate/adapter.ts
class HomegateAdapter implements ScraperAdapter {
  readonly name = 'homegate';

  constructor(
    private readonly client: ApifyClient,
    private readonly logger: Logger
  ) {}

  async scrape(options: ScrapeOptions): Promise<RawRecord[]> {
    const input = {
      urls: [
        { url: 'https://www.homegate.ch/rent/real-estate/switzerland/matching-list' },
        { url: 'https://www.homegate.ch/buy/real-estate/switzerland/matching-list' },
      ],
      maxItems: options.dryRun ? 10 : undefined,
      // Additional actor-specific input params
    };

    const run = await this.client
      .actor('ecomscrape/homegate-property-search-scraper')
      .call(input);

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();

    return items as RawRecord[];
  }
}
```

### Pattern 2: Validate-Then-Write Pipeline
**What:** Parse each raw record through Zod, separate valid from invalid, write valid records as JSONL, log rejections
**When to use:** Core data pipeline after scraping
**Example:**
```typescript
// Pipeline flow
const rawRecords = await adapter.scrape({ dryRun: false });

const valid: PropertyListing[] = [];
const errors: { index: number; issues: string[] }[] = [];

for (const [i, raw] of rawRecords.entries()) {
  const normalized = normalizeHomegate(raw);
  const result = PropertyListingSchema.safeParse(normalized);
  if (result.success) {
    valid.push(result.data);
  } else {
    logger.warn({ index: i, issues: result.error.issues }, 'Validation failed');
    errors.push({ index: i, issues: result.error.issues.map(i => i.message) });
  }
}

logger.info({
  total: rawRecords.length,
  valid: valid.length,
  rejected: errors.length,
}, 'Validation complete');
```

### Pattern 3: JSONL Streaming Write
**What:** Write each validated record as a single JSON line to a file stream, preventing memory buildup for large datasets
**When to use:** Writing output files
**Example:**
```typescript
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function writeJsonl(records: PropertyListing[], outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = join(outputDir, 'listings.jsonl');
  const stream = createWriteStream(filePath, { encoding: 'utf-8' });

  for (const record of records) {
    stream.write(JSON.stringify(record) + '\n');
  }

  return new Promise((resolve, reject) => {
    stream.end(() => resolve(filePath));
    stream.on('error', reject);
  });
}
```

### Anti-Patterns to Avoid
- **Storing raw + normalized data:** User decision is normalized only -- do not keep raw Apify responses alongside clean records
- **Loading all records into a single JSON file:** Use JSONL (one record per line) for streaming reads and memory safety
- **Catching and continuing on Apify errors:** User decision is fail fast on Apify failures -- no partial output
- **Building a CLI framework (commander/yargs):** For a single command with one optional flag (`--dry-run`), `process.argv` parsing is sufficient
- **Type-only validation (no runtime):** TypeScript types are erased at runtime; Zod provides actual runtime validation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Manual if/else type checking | Zod `safeParse()` | Edge cases (nulls, wrong types, missing nested fields); Zod gives structured error details |
| Apify API communication | Raw HTTP requests to Apify API | `apify-client` | Automatic retries (8x), exponential backoff, smart polling, dataset pagination |
| JSON logging | `console.log` with manual formatting | Pino | Structured JSON, log levels, child loggers, async writing, 5x faster |
| TypeScript execution | Custom webpack/esbuild build scripts | `tsx` | Zero config, instant startup, handles ESM/CJS, works with `npx` |
| Environment variable loading | Custom `.env` parser | Node.js `--env-file` | Native in Node 22+, zero dependencies, battle-tested |

**Key insight:** Every "simple" hand-rolled solution in this domain (validation, logging, API clients) accumulates edge cases that established libraries already handle. The time saved by using libraries is better spent on the actual domain logic -- Swiss number parsing and Homegate data normalization.

## Common Pitfalls

### Pitfall 1: Apify Actor Input Misconfiguration
**What goes wrong:** The Homegate actor returns zero results or unexpected data because input URLs or parameters are wrong
**Why it happens:** Each Apify actor has its own input schema; the ecomscrape actors take search page URLs with pre-applied filters rather than programmatic filter objects
**How to avoid:** Run the actor manually in Apify Console first with a small test to verify input format and output structure; use `--dry-run` flag to test locally with ~10 listings
**Warning signs:** Empty dataset, `items` array with length 0, or items with unexpected field names

### Pitfall 2: Swiss Number Format Edge Cases
**What goes wrong:** Prices or room counts parse to `NaN` or wrong values
**Why it happens:** Swiss format uses apostrophes for thousands (`1'200'000`), dots for decimals (`3.5`), and sometimes includes currency prefix (`CHF`) or unit suffix (`Zimmer`, `m2`)
**How to avoid:** Write explicit parser functions with unit tests covering: `"CHF 1'200'000"` -> `1200000`, `"3.5 Zimmer"` -> `3.5`, `"120 m2"` -> `120`, `"CHF 2'500.—"` -> `2500`, `null`/`undefined` -> `null`
**Warning signs:** `NaN` in output, prices that are 1000x too small (missing thousands), fractional rooms showing as integers

### Pitfall 3: Apify Run Timeout / Long-Running Scrapes
**What goes wrong:** Scraping all of Homegate takes longer than expected; script appears to hang
**Why it happens:** `apify-client`'s `.call()` method uses smart polling and waits indefinitely for the actor to finish; a full Switzerland scrape could take 10-30+ minutes
**How to avoid:** This is actually correct behavior -- `.call()` will poll until done. Log progress before calling the actor and after it returns. Set reasonable actor timeout in Apify Console. Consider adding a timeout option to the adapter for safety.
**Warning signs:** No output for extended periods -- ensure logging happens before and after the Apify call

### Pitfall 4: Zod v4 API Differences from v3
**What goes wrong:** Code examples from Stack Overflow or older tutorials use Zod v3 API that differs in v4
**Why it happens:** Zod v4 was released mid-2025; most tutorial content still references v3
**How to avoid:** Use `import { z } from "zod"` (defaults to v4 in latest npm); key v4 changes: `.strict()` -> `z.strictObject()`, string validators moved to top-level (`z.email()` instead of `z.string().email()`), error customization API unified
**Warning signs:** TypeScript errors on `.strict()`, `.email()`, or error handling code; `ZodError.errors` should be `ZodError.issues`

### Pitfall 5: JSONL Write Stream Not Flushing
**What goes wrong:** Output file is empty or truncated
**Why it happens:** `fs.createWriteStream` is asynchronous; if the process exits before the stream flushes, data is lost
**How to avoid:** Always wait for the stream's `finish` event via a Promise wrapper; call `stream.end()` and await the callback
**Warning signs:** File exists but is 0 bytes, or last few records are missing

### Pitfall 6: Missing Output Directory
**What goes wrong:** Write fails with `ENOENT` error
**Why it happens:** `data/homegate/2026-03-05_143022/` does not exist yet
**How to avoid:** Use `fs.mkdirSync(dir, { recursive: true })` or `fs.promises.mkdir(dir, { recursive: true })` before writing
**Warning signs:** `ENOENT: no such file or directory` error

## Code Examples

### Config Loader with Fail-Fast
```typescript
// src/config.ts
import { z } from 'zod';

const EnvSchema = z.object({
  APIFY_TOKEN: z.string().min(1, 'APIFY_TOKEN is required'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(): Config {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.issues);
    process.exit(1);
  }
  return result.data;
}
```

### Pino Logger Setup
```typescript
// src/logger.ts
import pino from 'pino';

export function createLogger(level: string = 'info'): pino.Logger {
  return pino({
    level,
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });
}
```

### PropertyListing Zod Schema
```typescript
// src/schema/listing.ts
import { z } from 'zod';

const AddressSchema = z.object({
  raw: z.string(),                      // Original address string as-is
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string(),                     // Required per user decision
  canton: z.string(),                   // Required per user decision
});

export const PropertyListingSchema = z.object({
  // Required fields (per user decision)
  url: z.string().url(),
  title: z.string().min(1),
  listingType: z.enum(['rent', 'buy']),
  price: z.number().positive(),
  rooms: z.number().positive(),
  address: AddressSchema,

  // Traceability (per user decision)
  source: z.string(),                   // e.g., "homegate"
  scrapedAt: z.string().datetime(),     // ISO timestamp

  // Optional comprehensive fields
  livingSpace: z.number().optional(),   // sqm
  floor: z.number().optional(),
  yearBuilt: z.number().optional(),
  description: z.string().optional(),   // Full text, no truncation
  imageUrls: z.array(z.string().url()).optional(),
  features: z.array(z.string()).optional(),
  agencyName: z.string().optional(),
  agencyContact: z.string().optional(),

  // Additional optional fields
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  propertyType: z.string().optional(),  // "apartment", "house", etc.
  currency: z.string().default('CHF'),
});

export type PropertyListing = z.infer<typeof PropertyListingSchema>;
```

### Swiss Number Parser
```typescript
// src/parsers/swiss-numbers.ts

/**
 * Parse Swiss-format price strings to numbers.
 * Examples: "CHF 1'200'000" -> 1200000, "CHF 2'500.—" -> 2500
 */
export function parseSwissPrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/CHF\s*/i, '')     // Remove currency prefix
    .replace(/'/g, '')          // Remove apostrophe thousands separators
    .replace(/\.—$/, '')        // Remove Swiss dash-suffix (2'500.—)
    .replace(/\s/g, '')         // Remove whitespace
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse Swiss-format room strings to numbers.
 * Examples: "3.5 Zimmer" -> 3.5, "4" -> 4
 */
export function parseSwissRooms(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Parse Swiss-format area strings to numbers.
 * Examples: "120 m2" -> 120, "85.5 m²" -> 85.5
 */
export function parseSwissArea(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}
```

### Manual Run Entry Point
```typescript
// src/manual-run.ts
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { ApifyClient } from 'apify-client';
import { HomegateAdapter } from './scrapers/homegate/adapter.js';
import { normalizeHomegate } from './scrapers/homegate/normalize.js';
import { PropertyListingSchema } from './schema/listing.js';
import { writeJsonl } from './output/jsonl-writer.js';

const config = loadConfig();  // Fails fast if APIFY_TOKEN missing
const logger = createLogger(config.LOG_LEVEL);

const site = process.argv[2];
if (!site || site === '--help') {
  console.log('Usage: npx tsx src/manual-run.ts <site> [--dry-run]');
  process.exit(site ? 0 : 1);
}

const dryRun = process.argv.includes('--dry-run');

async function main() {
  logger.info({ site, dryRun }, 'Starting scrape');

  const client = new ApifyClient({ token: config.APIFY_TOKEN });
  const adapter = new HomegateAdapter(client, logger);

  // 1. Scrape
  const rawRecords = await adapter.scrape({ dryRun });
  logger.info({ count: rawRecords.length }, 'Raw records fetched');

  // 2. Normalize + Validate
  const valid = [];
  const rejected = [];
  for (const [i, raw] of rawRecords.entries()) {
    const normalized = normalizeHomegate(raw);
    const result = PropertyListingSchema.safeParse(normalized);
    if (result.success) {
      valid.push(result.data);
    } else {
      logger.warn({ index: i, issues: result.error.issues }, 'Record rejected');
      rejected.push({ index: i, issues: result.error.issues });
    }
  }

  logger.info({
    total: rawRecords.length,
    valid: valid.length,
    rejected: rejected.length,
  }, 'Validation summary');

  // 3. Write output
  if (!dryRun && valid.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const outputDir = `data/${site}/${timestamp}`;
    const filePath = await writeJsonl(valid, outputDir);
    logger.info({ filePath, records: valid.length }, 'Output written');
  }

  logger.info('Done');
}

main().catch((err) => {
  logger.fatal(err, 'Scrape failed');
  process.exit(1);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dotenv` package for .env loading | Node.js `--env-file` flag | Node 20.6+ (2023) | Zero-dependency env loading; use `--env-file-if-exists` for optional |
| Zod v3 (`z.string().email()`) | Zod v4 (`z.email()`, unified errors) | Jun 2025 | Faster validation, cleaner API, but breaking changes from v3 code examples |
| `.eslintrc.js` legacy config | `eslint.config.mjs` flat config | ESLint v9 (2024) | Simpler config, better TypeScript support, `defineConfig()` helper |
| `ts-node` for TypeScript execution | `tsx` (esbuild-based) | 2023+ | 10x faster startup, native ESM support, no tsconfig complications |
| Winston for logging | Pino v10 | Ongoing | 5x faster, structured JSON by default, lower memory footprint |

**Deprecated/outdated:**
- `ts-node`: Still works but slower; `tsx` is the community standard for quick TypeScript execution
- `dotenv`: Unnecessary for Node 22 projects; native `--env-file` covers all use cases
- `.eslintrc.*`: Legacy format; ESLint 9+ uses flat config by default
- Zod v3 API patterns: `z.string().email()` etc. still work in v3 but v4 is the standard for new projects

## Open Questions

1. **Exact Homegate actor input schema**
   - What we know: Actor `ecomscrape/homegate-property-search-scraper` takes search URLs as input; proxy and retry settings are configurable
   - What's unclear: Full list of input fields (maxItems, proxy config options, URL format requirements); the Apify store page did not render its README content during research
   - Recommendation: Run a test call in Apify Console with a small sample first. Check actor input schema via `apify.com/ecomscrape/homegate-property-search-scraper/input-schema`. Budget 1 Apify run for discovery during implementation.

2. **Exact Homegate actor output field names**
   - What we know: Output includes price, rooms, living space, address, coordinates, images, description, offer type (rent/buy), property categories
   - What's unclear: Exact JSON field names in the actor's output (e.g., is it `price` or `sellingPrice`? Is address a string or object?)
   - Recommendation: Run a single test call, inspect the first few output records, then build the `normalizeHomegate()` function to map those exact fields to `PropertyListing`

3. **Apify free-tier credit limits for full Switzerland scrape**
   - What we know: Free tier is $5/month; Homegate has 100K+ listings; scraping all of them may consume significant compute
   - What's unclear: How many actor compute units a full Homegate scrape consumes
   - Recommendation: Start with a small test run (10-50 listings) to estimate CU cost, then extrapolate. The `--dry-run` flag (10 listings) helps here.

4. **Timestamp format for output directories**
   - What we know: Requirement says `data/{site}/{YYYY-MM-DD_HHMMSS}/`
   - What's unclear: Timezone handling -- should timestamp be UTC or local?
   - Recommendation: Use UTC for consistency (the server will eventually run on EC2 in eu-central-1). Format: `2026-03-05_143022`

## Sources

### Primary (HIGH confidence)
- [Apify JS Client Documentation](https://docs.apify.com/api/client/js/docs) - Client initialization, `.call()` + `.listItems()` pattern, automatic retries
- [Apify Actor Run & Data Retrieval](https://docs.apify.com/academy/api/run-actor-and-retrieve-data-via-api) - Sync vs async patterns, dataset pagination (250K item limit per request), timeout handling
- [Zod Official Documentation](https://zod.dev/) - v4 stable, `safeParse()`, `z.infer<>`, schema composition
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog) - Breaking changes from v3, new import paths, stable release status
- [Pino GitHub](https://github.com/pinojs/pino) - v10.3.x API, structured JSON logging, child loggers, transport system
- [tsx Official Site](https://tsx.is/) - v4.21, esbuild-based TypeScript execution
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs) - Native `--env-file` support in Node 20.6+/22+

### Secondary (MEDIUM confidence)
- [Scrapfly Homegate Scraping Guide](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) - Homegate data structure (JSON in `__INITIAL_STATE__`), available fields (price, rooms, address, coordinates, images)
- [Apify Homegate Property Search Scraper](https://apify.com/ecomscrape/homegate-property-search-scraper) - Actor exists, by ecomscrape, search URL input pattern
- [Apify Homegate Property Details Scraper](https://apify.com/ecomscrape/homegate-property-details-scraper) - Alternative actor for individual listing URLs
- [ESLint Flat Config with TypeScript](https://typescript-eslint.io/getting-started/) - Recommended + strict rule sets, `eslint.config.mjs`
- [Switzerland Number Format](https://helpcenter.spinifexit.com/hc/en-us/articles/18889737257881-Switzerland-Number-Format) - Apostrophe thousands separator, dot decimal separator

### Tertiary (LOW confidence)
- Exact Homegate actor input/output schemas -- Actor store page did not render documentation; needs test run verification
- Apify compute unit costs for full Homegate scrape -- No concrete data; estimate via test run

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-documented, stable, widely adopted; versions verified via npm
- Architecture: HIGH - Adapter pattern, JSONL streaming, validate-then-write are established Node.js patterns
- Pitfalls: MEDIUM - Swiss number parsing edge cases identified but may have more; Apify actor specifics need test run verification

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days - stable domain, no fast-moving dependencies)
