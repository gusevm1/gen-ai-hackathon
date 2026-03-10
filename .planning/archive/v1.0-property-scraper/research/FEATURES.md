# Feature Research: Swiss Real Estate Scraping Infrastructure

**Domain:** Real estate listing data collection / web scraping infrastructure
**Researched:** 2026-03-05
**Confidence:** MEDIUM-HIGH (Apify actor availability verified via search; site technical structures partially verified; data field inventories based on Apify docs, ScrapFly guides, and open-source projects)

---

## Per-Site Feasibility Assessment

This is the most critical input for roadmap ordering. Sites are ranked by ease of scraping.

### Tier 1: Existing Apify Actors Available (Easiest -- use these first)

| Site | Apify Actor(s) | Actor Author | Data Quality | Notes |
|------|----------------|--------------|--------------|-------|
| **Homegate.ch** | `ecomscrape/homegate-property-details-scraper`, `ecomscrape/homegate-property-search-scraper` | ecomscrape | HIGH | Switzerland's largest real estate marketplace. 100K+ listings. Hidden JSON in `window.__INITIAL_STATE__`. Two actors: search + details. |
| **ImmoScout24.ch** | `ecomscrape/immoscout24-property-search-scraper`, `ecomscrape/immoscout24-property-details-scraper` | ecomscrape | HIGH | Switzerland's other dominant platform. 84K+ properties. Same `__INITIAL_STATE__` pattern. Also has private REST API at `rest-api.immoscout24.ch/v4/`. |
| **FlatFox.ch** | `lexis-solutions/flatfox-ch-properties-scraper`, `stealth_mode/flatfox-property-search-scraper`, `azzouzana/flatfox-search-pages-scraper` | Multiple | HIGH | **Has official public API** at `flatfox.ch/en/docs/api/`. Three separate Apify actors available. Easiest site overall -- could skip Apify and call API directly. |
| **Comparis.ch** | `stealth_mode/comparis-property-search-scraper` | stealth_mode | MEDIUM | Switzerland's premier comparison platform. Aggregates from multiple sources. One Apify actor for property search. |
| **JamesEdition.com** | `parseforge/james-edition-real-estate-scraper` | parseforge | MEDIUM | Luxury real estate globally. Can filter to Switzerland. One actor available. |
| **Remax.ch** | `getdataforme/remax-scraper`, `parseforge/remax-scraper` | Multiple | MEDIUM | Note: actors scrape remax.**com** (global). Need to verify they work with remax.ch Swiss listings specifically. May need URL configuration. |

### Tier 2: No Apify Actor, But Scrapable with Custom Scrapers (Medium effort)

| Site | Technical Structure | Anti-Bot | Scrapability | Notes |
|------|---------------------|----------|--------------|-------|
| **RealAdvisor.ch** | Next.js with SSR, React Server Components. Data in `__next_f` streams. JSON-LD structured data. | Moderate | MEDIUM | Next.js SSR means data is in HTML on first load. Look for `__NEXT_DATA__` or `__next_f.push()` calls. Fields: property type, rooms, surface, price, price/m2, location, images. |
| **Newhome.ch** | JavaScript-heavy, likely React/Next.js. 150K+ listings. | MEDIUM-HIGH (returned 403 on fetch) | MEDIUM | Blocked basic fetch -- needs browser automation or proper headers. Owned by cantonal banks. Large listing base worth pursuing. |
| **Alle-Immobilien.ch** | WordPress CMS with programmatic ad stack. | LOW | MEDIUM-HIGH | **Owned by SMG** (same parent as Homegate/ImmoScout24/FlatFox). Aggregator indexing ~61K listings. Likely significant listing overlap with Homegate/ImmoScout24. **Lower priority** -- scrape the primary platforms first. |
| **ImmoStreet.ch** | Unknown (not fetched). | Unknown | UNKNOWN | **Also owned by SMG**. Likely overlapping listings with Homegate/ImmoScout24. Lower priority for same reason as Alle-Immobilien. |
| **UrbHome.ch** | Unknown. | Unknown | UNKNOWN | Swiss real estate platform. No Apify actor found. Needs direct technical assessment. |

### Tier 3: Agency Sites (Smaller listing pools, custom scraper required)

| Site | Type | Estimated Effort | Priority | Notes |
|------|------|------------------|----------|-------|
| **Neho.ch** | Discount broker | Medium | LOW | Smaller listing pool. Commission-free model, so listings may be exclusive. |
| **BetterHomes.ch** | Agency | Medium | LOW | Swiss real estate agency. Custom scraper needed. |
| **Properti.com** | PropTech agency | Medium | LOW | Modern site, likely React/Next.js. Smaller listing pool. |
| **Livit.ch** | Property management | Medium | LOW | Focus on property management, not listing aggregation. |
| **Engel & Volkers** | Luxury agency | Medium | LOW | International luxury brand. No Swiss-specific Apify actor. |
| **Cardis.ch** | Regional agency (Vaud) | Low-Medium | VERY LOW | Regional agency, small listing pool. French-speaking Switzerland focus. |
| **Ginesta.ch** | Regional agency (Zurich) | Low-Medium | VERY LOW | Zurich Gold Coast specialist. Very small listing pool. |
| **Walde.ch** | Regional agency | Low-Medium | VERY LOW | Regional agency, small listing pool. |
| **SwissFineProperties.com** | Luxury niche | Low-Medium | VERY LOW | Very niche luxury segment. Tiny listing pool. |
| **iCasa.ch** | Agency | Low-Medium | VERY LOW | Small agency site. |
| **Immobilier.ch** | French-speaking portal | Medium | LOW | French-speaking Switzerland. May overlap with SMG platforms. |
| **LuxuryEstate.com** | International luxury | Medium | LOW | Global luxury aggregator. No Apify actor found. |

### Key Ownership Insight: SMG Swiss Marketplace Group

**Critical finding:** SMG owns Homegate, ImmoScout24, FlatFox, Alle-Immobilien.ch, ImmoStreet.ch, home.ch, Acheter-Louer.ch, and CASASOFT. This means significant listing overlap across these platforms. **Strategy: scrape Homegate + ImmoScout24 + FlatFox to cover the SMG ecosystem, skip Alle-Immobilien and ImmoStreet initially as they likely duplicate data.**

---

## Data Field Inventory

### Core Fields (Available across all major platforms)

| Field | Homegate | ImmoScout24 | FlatFox | Comparis | Description |
|-------|----------|-------------|---------|----------|-------------|
| Listing ID | Yes | Yes | `pk`/`id` | Yes | Unique identifier for dedup |
| Title | Yes | Yes | `short_title`, `public_title` | Yes | Listing headline |
| Description | Yes | Yes | `description`, `description_title` | Yes | Full-text description |
| Price | Yes | Yes | `price_display` | Yes | Asking price or rent |
| Price type | Yes | Yes | `price_display_type` (TOTAL/MONTHLY) | Yes | Sale vs rent distinction |
| Currency | CHF | CHF | CHF | CHF | Always CHF for Swiss |
| Rooms | Yes | `numberOfRooms` | `number_of_rooms` | Yes | Room count (Swiss style: 3.5, 4.5) |
| Living space (m2) | Yes | Yes | `livingspace` | Yes | Interior area |
| Address | Yes | `address` | `public_address` | Yes | Street-level or area |
| ZIP code | Yes | Yes | `zipcode` | Yes | Swiss postal code |
| City | Yes | Yes | `city` | Yes | Municipality |
| Canton | Derived | Yes | Derived | Yes | Swiss canton |
| GPS coordinates | Yes | Yes | `latitude`, `longitude` | Partial | Geocoordinates |
| Images | Yes (URLs) | Yes (URLs + metadata) | `images` array, `cover_image` | Yes | Property photos |
| Property type | Yes | Yes | `object_category`, `object_type` | Yes | Apartment, house, etc. |
| Listing URL | Yes | Yes | `url`, `short_url` | Yes | Original listing link |

### Extended Fields (Available on most platforms)

| Field | Availability | Notes |
|-------|-------------|-------|
| Rent breakdown (net/charges/gross) | FlatFox (explicit), ImmoScout24, Homegate | Swiss law requires net/charges split. FlatFox: `rent_net`, `rent_charges`, `rent_gross` |
| Floor number | Most platforms | `floor` field |
| Year built | Homegate, ImmoScout24, FlatFox | Construction year |
| Availability date | Most platforms | FlatFox: `moving_date`, `moving_date_type` |
| Listing publication date | Most platforms | When listing was posted |
| Agency/lister name | All platforms | Real estate company or private |
| Agency contact info | Most platforms | Phone, email |
| Agency logo | ImmoScout24, FlatFox | Brand identification |
| Amenities/attributes | Most platforms | Balcony, elevator, parking, etc. |
| Furnished status | FlatFox (`is_furnished`) | Whether furnished |
| Temporary rental | FlatFox (`is_temporary`) | Sublet or temporary |
| Virtual tour available | Homegate, ImmoScout24 | Remote viewing indicator |
| Documents | FlatFox (`documents`) | Attached PDFs (floor plans, etc.) |
| Listing status | FlatFox (`status`) | Active, reserved, rented |

### Fields for Investment Analysis (Downstream value)

| Field | Source | Extraction Difficulty | Notes |
|-------|--------|----------------------|-------|
| Price per m2 | RealAdvisor (explicit), calculable elsewhere | LOW | Key investment metric |
| Plot/land size | Some platforms | MEDIUM | `surface_property` on FlatFox |
| Volume (m3) | FlatFox (`volume`) | LOW | Building volume |
| Energy rating | Some platforms | MEDIUM | Sustainability metric |
| Renovation status | Description text (NLP needed) | HIGH | Usually in free text, not structured |
| HOA/common charges | Sometimes explicit | MEDIUM | Condominium fees |
| Offer type | All (`offer_type`: RENT/SALE) | LOW | Critical for analysis segmentation |

---

## Feature Landscape

### Table Stakes (Must Have -- System Is Useless Without These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-site scraping** | Core purpose. Must scrape at least 2-3 sites to be useful. | MEDIUM | Start with Tier 1 Apify actors (Homegate, ImmoScout24, FlatFox) |
| **Unified data schema** | Raw data from different sites has different field names. Must normalize to single schema for downstream use. | MEDIUM | Map site-specific fields (`numberOfRooms` vs `number_of_rooms` vs `rooms`) to unified format |
| **Scheduled execution** | Historical snapshots require regular, automated scraping. Manual runs defeat the purpose. | LOW | Cron job or node-cron scheduler. Daily cadence sufficient for real estate (listings stay up for weeks). |
| **Listing deduplication** | Same property appears on Homegate AND ImmoScout24 (both SMG). Without dedup, analysis is corrupted. | MEDIUM | Use listing URL as primary key per-site. Cross-site dedup is harder (address + price matching) -- defer to v2. |
| **Raw data persistence** | Must store scraped data to build historical snapshots. In-memory only = worthless. | LOW | JSON files on EC2 as per PROJECT.md. One file per scrape run per site. |
| **Error handling & retries** | Scrapers fail. Sites change. Actors timeout. Must not silently lose data. | LOW | Wrap Apify actor calls in try/catch with retry logic. Log failures. |
| **Comprehensive field extraction** | Must extract ALL available fields from each listing, not just title and price. | MEDIUM | Use detail scrapers (not just search scrapers) to get full listing data |
| **Health endpoint** | Only API surface in v1. Confirms system is alive. | LOW | Express.js `/health` returning status + last scrape timestamps |

### Differentiators (Hackathon Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Historical snapshot tracking** | Track price changes over time. See when listings appear/disappear. This is the core investment intelligence value. | MEDIUM | Store timestamped snapshots. Compare current vs previous runs to detect changes. |
| **FlatFox direct API integration** | Skip Apify entirely for FlatFox. Official API is free, reliable, and returns structured data. Zero anti-bot concerns. | LOW | REST API with pagination. No auth needed for public listings. Demonstrates technical breadth for hackathon. |
| **Listing change detection** | Detect price drops, listing removals, relisting patterns. Investment alpha signal. | MEDIUM | Diff current scrape against previous. Flag: new listings, removed listings, price changes. |
| **Multi-language support** | Swiss sites serve DE/FR/IT/EN. Capturing multilingual descriptions captures more data. | LOW | Most Apify actors handle this via URL parameters. Store original language + language code. |
| **Apify actor + custom scraper hybrid** | Shows hackathon judges you can use Apify AND build custom solutions. Best of both worlds. | MEDIUM | Apify for Homegate/ImmoScout24, direct API for FlatFox, custom Cheerio/Puppeteer for others. |
| **Scrape metrics dashboard** | Track scrape success rates, listing counts per site, data quality scores. | LOW | Store metrics in JSON alongside scrape data. Health endpoint returns summary. |
| **Site coverage report** | Programmatically report which sites are being scraped, last success, listing count per site. | LOW | Useful for hackathon demo. Shows system breadth at a glance. |

### Anti-Features (Do NOT Build in v1)

| Anti-Feature | Why Requested | Why Problematic | What to Do Instead |
|--------------|---------------|-----------------|-------------------|
| **Cross-site deduplication** | Same property on multiple sites inflates counts | Requires fuzzy address matching, NLP on descriptions, price tolerance bands. High complexity, high error rate. | Store all listings per-site with source URL. Dedup in analysis layer later. |
| **Real-time scraping / webhooks** | "Get notified instantly when new listing appears" | Real estate listings persist for weeks/months. Real-time adds massive complexity (WebSocket, queue, always-on scrapers) for near-zero value. | Daily or twice-daily scheduled scrapes are sufficient. |
| **Image downloading / storage** | Store property photos locally | Images are huge (10-50 photos per listing at 1-5MB each). Fills EC2 disk instantly. Licensing issues. | Store image URLs only. Fetch on-demand in analysis layer. |
| **NLP / text analysis on descriptions** | Extract structured data from free text | This is the analysis layer, not the scraping layer. Mixing concerns makes both worse. | Store raw descriptions. NLP in downstream milestone. |
| **User-configurable scraping parameters** | "Let users choose which cantons to scrape" | No users in v1. Admin-only system. UI adds complexity without value. | Hardcode search parameters in config files. |
| **Database storage** | "Use PostgreSQL or MongoDB instead of JSON" | Setup time, schema design, migrations -- all overhead. JSON files are sufficient for data collection phase. | Raw JSON files as per PROJECT.md. Migrate to DB when analysis layer needs it. |
| **Agency sites (Tier 3)** | "Scrape all 23 sites" | Diminishing returns. Agency sites have tiny listing pools. Custom scraper per site = massive dev time for few unique listings. | Focus on 4-5 aggregators that cover 90%+ of Swiss listings. |
| **Proxy rotation infrastructure** | "Avoid IP bans" | Apify handles proxies internally for its actors. FlatFox has official API. Over-engineering for v1. | Let Apify manage proxies. Only worry about this for custom scrapers in v2. |
| **Scraping rate limiting / politeness** | "Don't overload target sites" | Apify actors handle this internally. For daily scrapes, rate limiting is barely relevant. | Let Apify handle rate limiting. For custom scrapers, simple 1-2 second delays between requests. |

---

## Feature Dependencies

```
[Apify API Integration]
    +--requires--> [Unified Data Schema]
                       +--requires--> [Raw Data Persistence (JSON files)]

[Scheduled Execution]
    +--requires--> [Apify API Integration]
    +--requires--> [Error Handling & Retries]

[Historical Snapshot Tracking]
    +--requires--> [Raw Data Persistence]
    +--requires--> [Scheduled Execution]

[Listing Change Detection]
    +--requires--> [Historical Snapshot Tracking]
    +--requires--> [Listing Deduplication (within-site)]

[FlatFox Direct API]
    +--independent-- (can be built in parallel with Apify integration)
    +--requires--> [Unified Data Schema]

[Health Endpoint]
    +--independent-- (can be built first as scaffolding)

[Scrape Metrics]
    +--requires--> [Scheduled Execution]
    +--enhances--> [Health Endpoint]
```

### Dependency Notes

- **Apify Integration requires Unified Schema:** Different actors return different field names. Must normalize before storing.
- **Scheduling requires Error Handling:** Unattended scraping must handle failures gracefully or you silently lose days of data.
- **Change Detection requires Snapshots:** Can only detect changes if you have previous data to compare against.
- **FlatFox API is independent:** Can be built as a standalone scraper module because it uses REST, not Apify. Good parallel workstream.

---

## MVP Definition

### Launch With (v1 -- Hackathon delivery)

- [x] **Apify integration for Homegate.ch** -- Largest Swiss platform, proven actors, maximum listing coverage
- [x] **Apify integration for ImmoScout24.ch** -- Second largest, same actor author (ecomscrape), similar patterns
- [x] **FlatFox.ch direct API integration** -- Official API, demonstrates technical versatility for hackathon
- [x] **Unified data schema** -- Normalize across 3 sources into single format
- [x] **Scheduled scraper execution** -- Daily cron, automated data collection
- [x] **JSON file storage on EC2** -- Timestamped files per scrape run
- [x] **Error handling with logging** -- Don't lose data silently
- [x] **Health endpoint** -- System status and last scrape info

### Add After Validation (v1.x -- if time permits in hackathon)

- [ ] **Comparis.ch Apify actor** -- Add 4th source, Apify actor available
- [ ] **Listing change detection** -- Compare runs to detect price changes, new/removed listings
- [ ] **Scrape metrics tracking** -- Success rates, listing counts, data quality
- [ ] **JamesEdition.com** -- Luxury segment, Apify actor available

### Future Consideration (v2+ -- post-hackathon)

- [ ] **RealAdvisor.ch custom scraper** -- Next.js site, needs Puppeteer/Playwright
- [ ] **Newhome.ch custom scraper** -- 403 on basic fetch, needs headless browser
- [ ] **Cross-site deduplication** -- Address matching across platforms
- [ ] **Database migration** -- Move from JSON to PostgreSQL when analysis layer arrives
- [ ] **Agency sites (Tier 3)** -- Only if aggregator coverage proves insufficient

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Homegate.ch Apify scraper | HIGH | LOW | **P1** |
| ImmoScout24.ch Apify scraper | HIGH | LOW | **P1** |
| FlatFox.ch API integration | HIGH | LOW | **P1** |
| Unified data schema | HIGH | MEDIUM | **P1** |
| Scheduled execution | HIGH | LOW | **P1** |
| JSON file storage | HIGH | LOW | **P1** |
| Error handling & retries | HIGH | LOW | **P1** |
| Health endpoint | MEDIUM | LOW | **P1** |
| Comparis.ch Apify scraper | MEDIUM | LOW | **P2** |
| Historical snapshot tracking | HIGH | MEDIUM | **P2** |
| Listing change detection | HIGH | MEDIUM | **P2** |
| Scrape metrics | MEDIUM | LOW | **P2** |
| JamesEdition scraper | LOW | LOW | **P2** |
| RealAdvisor custom scraper | MEDIUM | HIGH | **P3** |
| Newhome.ch custom scraper | MEDIUM | HIGH | **P3** |
| Remax.ch (verify actor works) | LOW | LOW | **P3** |
| Cross-site deduplication | MEDIUM | HIGH | **P3** |
| Database migration | MEDIUM | HIGH | **P3** |

**Priority key:**
- **P1:** Must have for hackathon delivery. Core scraping pipeline.
- **P2:** Should have if time permits. Increases demo impact.
- **P3:** Future milestone. Adds coverage but not essential for hackathon.

---

## Competitor Feature Analysis

| Feature | swiss-immo-scraper (GitHub) | ScrapFly guides | Apify Actors | Our Approach |
|---------|---------------------------|-----------------|--------------|--------------|
| Site coverage | 2 sites (Homegate, ImmoScout24) | Guides for individual sites | Per-site actors | 3+ sites unified |
| Data fields | 5 basic fields (rent, rooms, space, location, images) | Comprehensive (10-20 fields) | Varies by actor | Maximum extraction -- all available fields |
| Output format | Discord embeds | Tutorial-only | JSON/CSV/Excel | Timestamped JSON files |
| Historical tracking | No (notification only) | No | No (one-shot) | **Yes -- daily snapshots** |
| Scheduling | Yes (120s interval) | No | Via Apify scheduler | Yes (node-cron, daily) |
| Change detection | New listings only | No | No | **Yes -- price changes, removals** |
| Investment analysis | No | No | No | **Downstream milestone** |
| Language | Python | Python | Node.js/Python | **Node.js/TypeScript** |

---

## Recommended Scraping Cadence

| Frequency | Rationale | When to Use |
|-----------|-----------|-------------|
| **Every 24 hours** | Real estate listings persist for weeks/months. Daily captures all changes with minimal resource usage. | Default for all sites |
| **Every 12 hours** | Catches same-day price changes. Marginal benefit over daily. | Only if historical analysis shows significant intra-day changes |
| **Every 6 hours** | Overkill for real estate. Wastes Apify credits. | Not recommended |
| **Weekly** | Misses short-lived listings and price changes. | Only for low-priority agency sites |

**Recommendation:** Daily scraping for Tier 1 sites. This balances data freshness with Apify credit consumption and EC2 storage.

---

## Sources

- [Homegate Property Details Scraper - Apify](https://apify.com/ecomscrape/homegate-property-details-scraper) -- MEDIUM confidence (verified actor exists)
- [ImmoScout24 Property Search Scraper - Apify](https://apify.com/ecomscrape/immoscout24-property-search-scraper) -- MEDIUM confidence
- [FlatFox.ch Properties Scraper - Apify](https://apify.com/lexis-solutions/flatfox-ch-properties-scraper) -- MEDIUM confidence
- [FlatFox Official API Reference](https://flatfox.ch/en/docs/api/) -- HIGH confidence (official source)
- [FlatFox API response structure - GitHub](https://github.com/denysvitali/flatfox-rs/blob/master/resources/api/flat.json) -- HIGH confidence (real API response)
- [Comparis Property Search Scraper - Apify](https://apify.com/stealth_mode/comparis-property-search-scraper) -- MEDIUM confidence
- [JamesEdition Real Estate Scraper - Apify](https://apify.com/parseforge/james-edition-real-estate-scraper) -- MEDIUM confidence
- [Remax Scraper - Apify](https://apify.com/getdataforme/remax-scraper) -- LOW confidence (may be remax.com not remax.ch)
- [How to Scrape Homegate.ch - ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) -- MEDIUM confidence (technical guide)
- [How to Scrape ImmoScout24.ch - ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-immoscout24-ch-real-estate-property-data) -- MEDIUM confidence
- [swiss-immo-scraper - GitHub](https://github.com/dvdblk/swiss-immo-scraper) -- HIGH confidence (open source, verifiable)
- [SMG Swiss Marketplace Group - Real Estate Portfolio](https://swissmarketplace.group/portfolio/real-estate/) -- HIGH confidence (official corporate source)
- [Laravel FlatFox Package - GitHub](https://github.com/codebar-ag/laravel-flatfox) -- MEDIUM confidence (archived repo, but shows real API fields)
- [Swiss Real Estate Scraper - GitHub](https://github.com/sapg-dev/Swiss-Real-Estate-Scraper) -- LOW confidence (third-party project)

---
*Feature research for: Swiss Real Estate Scraping Infrastructure*
*Researched: 2026-03-05*
