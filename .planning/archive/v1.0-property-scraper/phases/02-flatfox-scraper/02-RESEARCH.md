# Phase 2: FlatFox Scraper - Research

**Researched:** 2026-03-05
**Domain:** REST API scraping, data normalization, pagination
**Confidence:** HIGH

## Summary

FlatFox exposes a public REST API at `https://flatfox.ch/api/v1/public-listing/` that requires no authentication and returns JSON with offset-based pagination. The API currently hosts ~33,800 listings. The max page size is 100 records (the API silently caps requests above this). There is no server-side filtering capability -- query parameters like `offer_type`, `object_category`, and `object_type` are accepted but ignored by the server. All filtering must happen client-side after fetching.

The API response contains well-structured data with high field completeness for residential listings (apartments, houses, shared flats). Non-residential listings (parking, industrial, commercial) constitute a significant portion of total listings but lack room counts and often lack surface area. The normalizer should filter to residential categories and map FlatFox field names to the PropertyListing schema. Price data is available as numeric values (not strings), so Swiss number parsing is unnecessary for FlatFox.

**Primary recommendation:** Build a direct HTTP client (Node.js native `fetch`) that paginates through all listings with `limit=100`, filters client-side to residential categories, normalizes to PropertyListing schema, and writes JSONL output. Use `expand=images` to get image URLs. No external scraping library or Apify actor needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SITE-02 | FlatFox scraper via official REST API retrieves property listings (target ~1000 listings) | API verified: ~33,800 total listings, ~67% residential at mid-range offsets. Public REST API, no auth needed, pagination via offset/limit. Direct fetch approach confirmed. |
| SCRP-03 | Scraped data stored as files in `data/{site}/{YYYY-MM-DD_HHMMSS}/` directories | Existing `writeJsonl()` utility and timestamp directory pattern already implemented in Phase 1. FlatFox adapter writes to `data/flatfox/{timestamp}/listings.jsonl`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js native `fetch` | Built-in (Node 22) | HTTP requests to FlatFox API | No external dependency needed; project already on Node 22 which has stable global fetch. Simple JSON API does not need a request library. |
| zod | ^4.3.6 | Schema validation | Already in project; PropertyListingSchema validates all records before storage |
| pino | ^10.3.1 | Structured logging | Already in project; used by all adapters |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | FlatFox API is simple enough that no additional libraries are required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | undici / got / axios | Unnecessary for a simple JSON API with no auth, cookies, or retries. Native fetch keeps dependencies minimal. |
| Sequential pagination | p-limit for concurrent requests | Could speed up fetching by 3-5x, but adds complexity and risk of rate limiting. Sequential is ~12 min for all 34K listings, acceptable for daily scrape. Can optimize later if needed. |

**Installation:**
```bash
# No new packages needed -- all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── scrapers/
│   ├── types.ts              # ScraperAdapter interface (exists)
│   ├── homegate/
│   │   ├── adapter.ts        # HomegateAdapter (exists)
│   │   └── normalize.ts      # normalizeHomegate (exists)
│   └── flatfox/
│       ├── adapter.ts        # FlatfoxAdapter (NEW) -- implements ScraperAdapter
│       ├── normalize.ts      # normalizeFlatfox (NEW) -- maps API fields to PropertyListing
│       └── types.ts          # FlatFox API response types (NEW, optional)
├── manual-run.ts             # Add 'flatfox' case (MODIFY)
└── config.ts                 # Remove APIFY_TOKEN requirement for flatfox-only runs (MODIFY)
```

### Pattern 1: FlatfoxAdapter implementing ScraperAdapter
**What:** A class that implements the existing `ScraperAdapter` interface, using native `fetch` to paginate through the FlatFox API
**When to use:** For all FlatFox data retrieval
**Example:**
```typescript
// Following the HomegateAdapter pattern
export class FlatfoxAdapter implements ScraperAdapter {
  readonly name = 'flatfox';

  constructor(private readonly logger: Logger) {}

  async scrape(options: ScrapeOptions): Promise<RawRecord[]> {
    const allResults: RawRecord[] = [];
    let url: string | null = 'https://flatfox.ch/api/v1/public-listing/?limit=100&expand=images';

    if (options.dryRun) {
      // Fetch only first page in dry-run mode
      url = 'https://flatfox.ch/api/v1/public-listing/?limit=10&expand=images';
    }

    while (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`FlatFox API error: ${response.status}`);
      const data = await response.json();
      allResults.push(...data.results);
      this.logger.info({ fetched: allResults.length, total: data.count }, 'FlatFox pagination progress');
      url = options.dryRun ? null : data.next;
    }

    return allResults as RawRecord[];
  }
}
```

### Pattern 2: Client-side filtering in normalizer
**What:** Filter out non-residential listings (parking, industrial, commercial, gastro) during normalization, before Zod validation
**When to use:** Because the FlatFox API does not support server-side filtering
**Example:**
```typescript
const RESIDENTIAL_CATEGORIES = new Set(['APARTMENT', 'HOUSE', 'SHARED', 'SECONDARY']);

export function normalizeFlatfox(raw: RawRecord): Record<string, unknown> | null {
  // Skip non-residential listings entirely
  const category = raw.object_category as string;
  if (!RESIDENTIAL_CATEGORIES.has(category)) return null;

  // Map offer_type: RENT -> 'rent', SALE -> 'buy'
  const offerType = raw.offer_type as string;
  const listingType = offerType === 'SALE' ? 'buy' : 'rent';

  // price_display is already a number -- no Swiss number parsing needed
  const price = raw.price_display as number | null;

  // number_of_rooms is a string like "2.0" or null
  const roomsStr = raw.number_of_rooms as string | null;
  const rooms = roomsStr ? parseFloat(roomsStr) : undefined;

  // URL is relative -- prepend base
  const url = `https://flatfox.ch${raw.url as string}`;

  // Images need expand=images; URLs are relative
  const images = Array.isArray(raw.images) && typeof raw.images[0] === 'object'
    ? raw.images.map((img: any) => `https://flatfox.ch${img.url}`)
    : undefined;

  return {
    url,
    title: raw.short_title || raw.public_title || raw.description_title || '',
    listingType,
    price: price ?? undefined,
    rooms: rooms ?? undefined,
    address: {
      raw: raw.public_address || `${raw.street || ''} ${raw.zipcode} ${raw.city}`.trim(),
      street: raw.street || undefined,
      zip: String(raw.zipcode),
      city: raw.city as string,
      canton: '', // FlatFox does not provide canton
    },
    source: 'flatfox',
    scrapedAt: new Date().toISOString(),
    livingSpace: raw.surface_living ?? undefined,
    floor: raw.floor ?? undefined,
    yearBuilt: raw.year_built ?? undefined,
    description: raw.description ?? undefined,
    imageUrls: images,
    features: Array.isArray(raw.attributes)
      ? raw.attributes.map((a: any) => a.name)
      : undefined,
    propertyType: raw.object_type ?? undefined,
    agencyName: (raw.agency as any)?.name ?? undefined,
    latitude: raw.latitude ?? undefined,
    longitude: raw.longitude ?? undefined,
    currency: 'CHF',
  };
}
```

### Pattern 3: Config modification for non-Apify scrapers
**What:** Make APIFY_TOKEN optional so FlatFox-only runs don't require it
**When to use:** When running `npx tsx src/manual-run.ts flatfox`
**Example:**
```typescript
// config.ts -- make APIFY_TOKEN optional
const EnvSchema = z.object({
  APIFY_TOKEN: z.string().min(1).optional(), // optional for flatfox-only runs
  LOG_LEVEL: z.enum([...]).default('info'),
});
```

### Anti-Patterns to Avoid
- **Fetching all 34K listings then filtering:** Fetch all, but filter during normalization (return null for non-residential). Do not accumulate all records in memory and then filter -- normalize as you go.
- **Using expand=images when you don't need images:** Without `expand=images`, image fields are just PK integers. Always include `expand=images` in the URL.
- **Parsing prices as strings:** FlatFox returns prices as numbers (`price_display: 1690`), not strings. Do not route through `parseSwissPrice()`.
- **Trusting the `count` field for filtering:** The API's `count` reflects total unfiltered listings regardless of query params. Do not use it for progress calculation when filtering is needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests | Custom HTTP wrapper | Native `fetch` | Built into Node 22, no config needed for simple JSON API |
| Pagination | Custom cursor tracking | Follow `next` URL from API response | The API provides the full next URL -- just follow it until `next` is null |
| JSON serialization | Custom JSONL writer | Existing `writeJsonl()` | Already built in Phase 1, handles directory creation and streaming |
| Schema validation | Custom field checks | Existing `PropertyListingSchema` with `safeParse()` | Already built in Phase 1, reusable for all sources |

**Key insight:** The FlatFox integration is simpler than Homegate because the API returns structured JSON directly. No HTML parsing, no anti-bot bypass, no Apify dependency. The main complexity is pagination volume (~338 pages) and client-side filtering.

## Common Pitfalls

### Pitfall 1: API page size silently capped at 100
**What goes wrong:** Requesting `limit=500` returns only 100 results with no error. Code that assumes it got 500 will miscalculate progress or terminate too early.
**Why it happens:** The FlatFox API silently caps at 100 per page and the `next` URL uses `limit=100` regardless of what was requested.
**How to avoid:** Always use `limit=100`. Do not try to increase page size. Follow the `next` URL as-is.
**Warning signs:** Fewer results than expected per page, `next` URL has different limit than requested.

### Pitfall 2: Server-side filters don't work
**What goes wrong:** Adding `offer_type=RENT` or `object_category=APARTMENT` to the URL does not filter results. All 34K listings are still returned.
**Why it happens:** The API accepts these parameters without error but ignores them for filtering. The `count` field is always the total unfiltered count.
**How to avoid:** All filtering MUST be client-side. Filter during normalization by checking `object_category` against a whitelist.
**Warning signs:** Same count regardless of filter params, mixed categories in results.

### Pitfall 3: Relative URLs in responses
**What goes wrong:** Listing URLs (`/en/flat/.../12345/`) and image URLs (`/thumb/ff/...`) are relative, not absolute.
**Why it happens:** FlatFox returns paths relative to their domain.
**How to avoid:** Prepend `https://flatfox.ch` to all URL fields. The PropertyListingSchema requires `z.string().url()` which validates for absolute URLs.
**Warning signs:** Zod validation rejects every record with "Invalid url" on the url field.

### Pitfall 4: number_of_rooms is a string, not a number
**What goes wrong:** Schema expects `rooms: z.number().positive()` but the API returns `"2.0"` (string) or `null`.
**Why it happens:** FlatFox stores rooms as strings like `"2.0"`, `"3.5"`, `"1.0"`.
**How to avoid:** Parse with `parseFloat()`. The value is always a simple decimal format, no Swiss formatting needed.
**Warning signs:** All records rejected with rooms validation error.

### Pitfall 5: zipcode is a number, not a string
**What goes wrong:** AddressSchema expects `zip: z.string()` but the API returns `zipcode: 8005` (integer).
**Why it happens:** FlatFox stores zip codes as integers.
**How to avoid:** Convert with `String(raw.zipcode)` in the normalizer.
**Warning signs:** Type error or Zod rejection on the zip field.

### Pitfall 6: Non-residential listings dominate early pages
**What goes wrong:** First few hundred listings are mostly parking and industrial (garage slots, offices). Testing with a small sample may show very few valid residential records.
**Why it happens:** Default ordering returns oldest listings first, which happen to be parking/industrial.
**How to avoid:** Expect low residential density in early pages during testing. For dry-run validation, use `offset=10000` to get a more representative sample, or accept that dry-run will have many filtered-out records.
**Warning signs:** Dry-run shows 2-5% valid records instead of expected 60-70%.

### Pitfall 7: APIFY_TOKEN fail-fast blocks FlatFox-only runs
**What goes wrong:** Running `npx tsx src/manual-run.ts flatfox` crashes at startup because `loadConfig()` requires APIFY_TOKEN.
**Why it happens:** Current config.ts has `APIFY_TOKEN: z.string().min(1)` as required.
**How to avoid:** Make APIFY_TOKEN optional in the env schema. Only validate it when instantiating HomegateAdapter.
**Warning signs:** App exits before reaching the flatfox scrape logic.

## Code Examples

Verified patterns from live API testing:

### Fetching a page of listings
```typescript
// Verified: 2026-03-05 via live API call
const response = await fetch('https://flatfox.ch/api/v1/public-listing/?limit=100&expand=images');
const data = await response.json();
// data.count = 33786 (total, unfiltered)
// data.next = "https://flatfox.ch/api/v1/public-listing/?expand=images&limit=100&offset=100"
// data.previous = null (first page)
// data.results = [...100 listings...]
```

### Key field mappings (FlatFox -> PropertyListing)
```typescript
// Verified: 2026-03-05 via live API response inspection
{
  // FlatFox field                -> PropertyListing field
  url: '/en/flat/...'             // -> prepend 'https://flatfox.ch' -> url
  offer_type: 'RENT' | 'SALE'    // -> 'rent' | 'buy' -> listingType
  price_display: 1690             // -> number, use directly -> price
  number_of_rooms: '2.0'         // -> parseFloat() -> rooms
  surface_living: 85              // -> number or null -> livingSpace
  floor: 3                        // -> number or null -> floor
  year_built: 2004                // -> number or null -> yearBuilt
  street: 'Bahnhofstr. 1'        // -> string or null -> address.street
  zipcode: 8001                   // -> String() -> address.zip
  city: 'Zurich'                  // -> string -> address.city
  public_address: '...'           // -> string -> address.raw
  latitude: 47.38                 // -> number -> latitude
  longitude: 8.51                 // -> number -> longitude
  short_title: '...'              // -> string -> title
  description: '...'              // -> string -> description
  object_category: 'APARTMENT'   // -> filter: only APARTMENT/HOUSE/SHARED/SECONDARY
  object_type: 'APARTMENT'        // -> string -> propertyType
  attributes: [{name: 'lift'}]   // -> map .name -> features
  agency: {name: '...'}          // -> .name -> agencyName
  images: [{url: '/thumb/...'}]  // -> prepend base URL -> imageUrls (requires expand=images)
}
```

### Pagination flow
```typescript
// Verified: 2026-03-05 -- next URL is a full URL with updated offset
// Page 1: ?limit=100&offset=0 -> next: "...?expand=images&limit=100&offset=100"
// Page 2: use next URL as-is -> next: "...?expand=images&limit=100&offset=200"
// Last page: next = null -> stop
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web scraping FlatFox HTML | Public REST API | Always available | No need for browser/Crawlee/Apify -- direct HTTP fetch is sufficient |
| Apify actor for all scrapers | Direct API for FlatFox, Apify for anti-bot sites | Phase 2 decision | FlatFox does not need Apify -- saves credits and complexity |

**Deprecated/outdated:**
- None relevant -- the FlatFox API appears stable and unchanged

## Open Questions

1. **Canton data missing from FlatFox API**
   - What we know: FlatFox does not return a canton field. The `state` field is null.
   - What's unclear: Whether canton can be derived from zip code
   - Recommendation: Set `canton: ''` (empty string) in normalizer. AddressSchema requires canton as `z.string()` which accepts empty. Canton derivation from zip could be added in a future phase.

2. **Rate limiting under sustained load**
   - What we know: 5 rapid sequential requests returned 200 OK. No rate limit headers observed. API is behind Cloudflare.
   - What's unclear: Whether 338 sequential requests (one per ~2s) will trigger Cloudflare protection
   - Recommendation: Add a small delay (200-500ms) between pages as courtesy. Add retry logic with exponential backoff for 429/503 responses. If Cloudflare blocks, reduce concurrency or add longer delays.

3. **Should non-residential listings be fetched at all?**
   - What we know: ~33-60% of listings per page are non-residential (varies by offset). Fetching all 34K wastes bandwidth for ~12K useful records.
   - What's unclear: Whether there's a more efficient API endpoint or parameter we haven't found
   - Recommendation: Fetch all and filter client-side. The overhead is acceptable (~310KB per page, ~12 min total). The alternative -- fetching individual listing detail pages -- would be far slower.

4. **Dry-run sample representativeness**
   - What we know: First page (offset=0) is 96% parking/industrial. Offset=10000 is ~67% residential.
   - What's unclear: Best offset for a representative dry-run sample
   - Recommendation: For dry-run, either (a) fetch first page and accept low residential hit rate, or (b) use a mid-range offset (e.g., 10000) for testing. Option (a) is simpler and matches Homegate's dry-run approach.

## Sources

### Primary (HIGH confidence)
- Live API testing: `https://flatfox.ch/api/v1/public-listing/?limit=2&expand=images` -- verified 2026-03-05, response shape, field names, pagination behavior, field types
- Live API testing: pagination cap at 100, `next` URL format, high-offset behavior (offset=33784)
- Live API testing: filter parameters (offer_type, object_category) confirmed non-functional
- Live API testing: response timing (~2.1s per 100 records without images, ~3.0s with images)
- Live API testing: SALE listings confirmed with `price_unit: "sell"` and `price_display_type: "TOTAL"`

### Secondary (MEDIUM confidence)
- Field completeness analysis from samples at offsets 0, 5000, 10000: residential listings have 99% rooms, 100% price, 81% surface_living, 91% street, 100% coordinates

### Tertiary (LOW confidence)
- Rate limiting behavior: only tested with 5 rapid requests. Full 338-page crawl may trigger different behavior from Cloudflare.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; native fetch + existing project infrastructure
- Architecture: HIGH - Follows established ScraperAdapter pattern from Homegate; field mappings verified against live API
- Pitfalls: HIGH - All pitfalls discovered through direct API testing, not assumptions

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (API is stable; no versioning changes expected)
