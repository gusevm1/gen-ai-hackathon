# Pitfalls Research

**Domain:** Swiss real estate listing scraping infrastructure
**Researched:** 2026-03-05
**Confidence:** MEDIUM-HIGH (multiple sources corroborate; Swiss-specific legal nuances are LOW confidence due to limited case law)

---

## Critical Pitfalls

### Pitfall 1: Getting IP-Banned Within Hours and Losing Scraping Access

**What goes wrong:**
Scrapers hit Swiss real estate sites (Homegate, ImmoScout24, Comparis) too aggressively and get permanently IP-banned. Since you are running from a single EC2 instance with one IP, a ban means total loss of scraping capability for that site. Homegate.ch in particular blocks scrapers "after sending a few requests" according to ScrapFly's analysis. These sites use Cloudflare or equivalent WAFs that detect automated traffic via TLS fingerprinting, behavioral analysis, and IP reputation scoring.

**Why it happens:**
Developers test scrapers in dev mode with rapid requests, then deploy to production without throttling. Or they set a "reasonable" delay like 1 second but don't randomize it -- uniform intervals are a scraper fingerprint. The single-IP EC2 setup makes this worse because all 23+ scrapers share one origin.

**How to avoid:**
- Implement randomized delays between requests (3-8 seconds with jitter, not uniform intervals)
- Start with extremely conservative rates: 1 request every 5-10 seconds per site
- Use Apify cloud actors for sites with aggressive anti-bot (Apify handles proxy rotation)
- For custom scrapers, use residential proxy services only if free-tier Apify actors cannot handle the site
- Never run multiple scrapers against the same site concurrently
- Respect robots.txt crawl-delay directives (Comparis returned 403 even for robots.txt fetching, suggesting aggressive protection)
- Implement per-site rate limit configuration so each target can have its own throttle

**Warning signs:**
- HTTP 403 Forbidden responses (most common)
- HTTP 429 Too Many Requests
- Responses returning empty HTML/JSON (site silently serving empty content instead of blocking)
- CAPTCHAs appearing in responses
- Response times dramatically increasing (the site is throttling you before blocking)
- Scraped data suddenly contains zero listings

**Phase to address:**
Phase 1 (initial scraper infrastructure). Rate limiting must be built into the core scraper framework from day one, not bolted on after getting banned.

---

### Pitfall 2: Silent Data Corruption -- Scrapers Return Data But It Is Wrong

**What goes wrong:**
The scraper runs without errors and stores JSON files, but the data is silently corrupted. This happens in several ways specific to Swiss real estate:
1. Site changes its HTML structure or `window.__INITIAL_STATE__` JSON schema, and the scraper extracts wrong fields or null values
2. Price fields contain different currencies or formats (CHF vs EUR, "auf Anfrage" / "sur demande" / "su richiesta" for "price on request" in three languages)
3. Area measurements mix square meters with other units or omit the unit entirely
4. The site serves a bot-detection page (CAPTCHA, JavaScript challenge) and the scraper stores that HTML as if it were a valid listing

**Why it happens:**
Swiss real estate sites serve content in German, French, and Italian. Field labels, status messages, and error pages differ by language region. A scraper tested only against German-language listings will silently fail on French or Italian content. Additionally, sites like Homegate and ImmoScout24 embed listing data in `window.__INITIAL_STATE__` JSON objects within script tags -- when the JSON schema changes, the scraper keeps extracting from the old paths and gets nulls or wrong values.

**How to avoid:**
- Validate every scraped record against a schema before storing (required fields: price OR price_on_request flag, location, listing_id, source_url)
- Store the raw HTML/JSON snapshot alongside parsed data so you can re-parse later without re-scraping
- Add a "scrape health" check: if >20% of listings from a site have null prices or zero rooms in a single run, mark the run as suspect and alert
- Test scrapers against all three language variants (de, fr, it URL paths)
- Prefer extracting from JSON in script tags over HTML parsing -- JSON schemas change less frequently than CSS selectors
- Never trust field types: parse prices as strings first, then normalize (handle "CHF 1'200'000" Swiss number formatting with apostrophe as thousands separator)

**Warning signs:**
- Sudden spike in null/empty fields in stored JSON
- Listing counts dropping dramatically for a site between runs
- All listings from a run having identical timestamps or suspicious patterns
- File sizes for a site's output significantly smaller than previous runs

**Phase to address:**
Phase 1 (scraper development). Schema validation is a day-one requirement, not a "nice to have."

---

### Pitfall 3: Swiss Data Protection Law (FADP) Violations Through Personal Data Collection

**What goes wrong:**
Real estate listings on Swiss sites may contain personal data -- agent names, phone numbers, email addresses, and in some cases owner/seller names. Under Switzerland's Federal Act on Data Protection (nFADP, effective since September 1, 2023), scraping and storing personal data without a legitimate legal basis is illegal. The FADP is extraterritorial: it applies to anyone processing personal data of people in Switzerland, regardless of where the processing occurs.

Unlike GDPR, the FADP provides for criminal penalties (fines up to CHF 250,000 against individuals, not the company). The FADP requires: (1) purpose limitation -- data collected for one purpose cannot be used for another, (2) proportionality -- only collect what is necessary, (3) transparency -- data subjects should be aware their data is being processed.

**Why it happens:**
Developers scrape "everything available" from listings (as stated in project requirements: "extract maximum data from each listing") without distinguishing between property data and personal data. Agent contact information, seller names, and personal descriptions get swept into raw JSON files on EC2 with no access controls, no retention policy, and no legal basis documented.

**How to avoid:**
- Separate property data from personal data at scrape time: listing details (price, rooms, location, description) are property data; agent names, phone numbers, emails are personal data
- For the hackathon MVP: strip or hash personal data fields before storage, or store them in a separate file with access controls
- Document your legal basis for data collection (likely "legitimate interest" for property market analysis with publicly available data)
- Do not store images that contain people's faces
- Implement a data retention policy: delete raw scrape data after N days if not needed
- Do not bypass login walls, paywalls, or authentication mechanisms -- the nFADP and Swiss UWG (Unfair Competition Act) both treat circumvention of access controls as aggravating factors

**Warning signs:**
- JSON files containing email addresses, phone numbers, or full names
- No documentation of legal basis for data processing
- Raw data accumulating indefinitely with no cleanup
- Scraping behind-login content

**Phase to address:**
Phase 1 (architecture). Data classification (property vs. personal) must be designed into the storage schema from the start. This is not a post-launch concern.

---

### Pitfall 4: Duplicate Listings Across 23+ Sites Making Data Unusable for Analysis

**What goes wrong:**
The same property appears on Homegate, ImmoScout24, Comparis, Alle-Immobilien, and multiple agency sites simultaneously. Without deduplication, downstream analysis will double/triple-count properties, skew price statistics, and produce misleading market insights. Swiss aggregator sites (Comparis, Alle-Immobilien) themselves aggregate from other sources, creating meta-duplicates.

**Why it happens:**
Real estate agencies in Switzerland typically list on multiple platforms. A single property might appear on 5-8 sites with slightly different descriptions, different photos, and sometimes different prices (e.g., one site shows "CHF 1'200'000" while another shows "CHF 1'190'000" due to rounding or update timing). Address formats vary by language region and site ("Bahnhofstrasse 10, 8001 Zurich" vs "Bahnhofstr. 10, 8001 Zuerich" vs "10, Bahnhofstrasse, 8001 Zurich").

**How to avoid:**
- Design a listing identity strategy from day one: use a composite key of (normalized_address + rooms + area_sqm + listing_type) for fuzzy matching
- Store a `source_listing_id` per site (Homegate listing ID, ImmoScout ID, etc.) to track the same listing across platforms
- For the hackathon: do NOT attempt real-time deduplication. Store all data with source metadata, and build dedup as a post-processing step
- Use Swiss postal code (PLZ/NPA) as the primary geographic normalizer -- it is consistent across all three language regions
- Accept that perfect dedup is impossible in a hackathon. Instead, design the storage format so dedup CAN be done later

**Warning signs:**
- Total listing count across all sites is 3-5x the actual market inventory
- Price analysis shows bimodal distributions (same properties counted at slightly different prices)
- Location analysis shows suspicious clustering (same address appearing multiple times)

**Phase to address:**
Phase 2 (data processing). Phase 1 stores raw data with source metadata; Phase 2 builds dedup as a post-processing pipeline. Do not block Phase 1 on this.

---

### Pitfall 5: EC2 Disk Fills Up and Scraper Silently Stops Storing Data

**What goes wrong:**
Raw JSON files accumulate on the EC2 instance's EBS volume. Swiss real estate listings with images, descriptions in 3 languages, and full metadata can be 10-50KB each. At 23 sites with potentially 50,000+ listings each, a full scrape cycle could generate 500MB-2GB of JSON. Daily snapshots compound this. The default EC2 EBS volume is 8GB. When disk fills up, JSON writes silently fail or produce truncated files, and the scraper reports "success" because the HTTP requests succeeded.

Additionally, the ext4 filesystem has inode limits. Millions of small JSON files can exhaust inodes before disk space runs out, causing "No space left on device" errors even with free gigabytes.

**Why it happens:**
Developers provision EC2 with default storage, don't monitor disk usage, and don't implement log/data rotation. The scraper writes files but never checks if the write actually succeeded or if the disk has space.

**How to avoid:**
- Provision at least 50GB EBS volume (costs ~$5/month for gp3)
- Store listings in consolidated JSONL files (one file per site per scrape run) instead of one file per listing -- this prevents inode exhaustion
- Implement disk space monitoring: check available space before each scrape run, skip run if <10% free
- Add write verification: after writing a JSON file, verify file size > 0
- Implement data rotation: compress and archive runs older than 7 days (gzip reduces JSON by 80-90%)
- Set up a simple cron alert: `df -h | awk '$5+0 > 80 {print}'` to detect when any partition exceeds 80%

**Warning signs:**
- Scraper logs show success but output directory has no new files
- JSON files with 0 bytes or truncated content
- `df -h` shows >80% disk usage
- `df -i` shows inode usage climbing

**Phase to address:**
Phase 1 (infrastructure setup). Disk monitoring and JSONL file format must be decided during EC2 provisioning.

---

## Moderate Pitfalls

### Pitfall 6: Swiss Number and Address Formatting Breaks Parsing

**What goes wrong:**
Swiss formatting conventions differ from other European countries and cause parsing failures:
- Numbers use apostrophes as thousands separators: `CHF 1'200'000` (not `1,200,000` or `1.200.000`)
- Decimal separator is a period in German/French regions but can be a comma in some contexts
- Swiss postcodes are 4 digits (e.g., 8001 for Zurich)
- Addresses can appear in any of the three national languages
- Floor numbering: Swiss "1. OG" = first floor above ground (not ground floor)
- Room counting: Swiss "3.5 Zimmer" means 3 rooms + 1 half-room (kitchen or alcove)

**How to avoid:**
- Build a Swiss-specific number parser that handles apostrophe thousands separator
- Normalize "Zimmer" / "pieces" / "locali" to a unified room count field
- Parse "3.5 Zimmer" as a decimal, not as an error
- Store raw text alongside parsed values so you can fix parsing errors later without re-scraping
- Use a canonical address format: `{street} {number}, {plz} {city}`

**Warning signs:**
- Prices of 0 or NaN in stored data
- Room counts that are all integers (missing the .5 half-rooms unique to Swiss listings)
- Address fields with inconsistent formats across different sites

**Phase to address:**
Phase 1 (scraper development). Build the Swiss number parser as a shared utility used by all scrapers.

---

### Pitfall 7: Scheduler Runs Overlap and Cause Duplicate or Corrupted Data

**What goes wrong:**
A scheduled scrape run takes longer than expected (site is slow, network issues, more listings than anticipated). The next scheduled run starts while the previous one is still running. Both runs write to the same output location, producing interleaved or corrupted data. Or both runs hit the same site simultaneously, doubling the request rate and triggering anti-bot detection.

**Why it happens:**
Developers set a fixed cron schedule (e.g., every 6 hours) without implementing run locking or checking if the previous run completed. Swiss real estate sites have varying numbers of listings (Homegate has far more than a small agency site like Cardis), so scrape duration varies wildly between sites.

**How to avoid:**
- Implement a lock file or semaphore per scraper: check if a `.lock` file exists before starting, create it on start, remove it on completion
- Use timestamped output directories: `data/{site}/{YYYY-MM-DD_HH-mm}/` so runs never overwrite each other
- Set timeouts on individual scrape runs: if a run exceeds 2x expected duration, kill it and log the failure
- Schedule scrapers for different sites at staggered times, not all at once
- Use PM2 or systemd with restart policies instead of bare cron

**Warning signs:**
- Multiple scraper processes for the same site in `ps aux`
- Output files with mixed timestamps or out-of-order listings
- Site anti-bot triggers occurring at regular intervals matching your cron schedule

**Phase to address:**
Phase 1 (scheduler implementation). Run isolation must be built into the scheduler from the start.

---

### Pitfall 8: Relying on Community Apify Actors That Stop Working

**What goes wrong:**
You find a community-built Apify actor for Homegate or ImmoScout24, integrate it into your pipeline, and it works for 3 days. Then the target site makes a minor HTML change, the community actor maintainer doesn't update it, and your scraping pipeline for that site silently starts returning zero or garbage results. Apify Store actors have varying maintenance quality.

**Why it happens:**
Community actors are maintained by individuals with no SLA. The actor page may show "last updated 2 months ago" which seems recent, but a site change yesterday means it is already broken. Swiss sites are lower priority for international Apify developers compared to Zillow or Realtor.com.

**How to avoid:**
- Before integrating any Apify actor, check: (1) last update < 30 days, (2) rating > 4 stars, (3) run success rate > 90%, (4) maintained by Apify team vs. community developer
- Always have a fallback plan: for every Apify actor you use, understand the site's data structure well enough to build a custom scraper in 2-4 hours if the actor breaks
- Test actors with a small run before integrating into your pipeline
- Monitor actor output: if an actor returns <50% of expected listings, switch to fallback
- Prefer building your own actors for critical sites (Homegate, ImmoScout24) -- you control maintenance

**Warning signs:**
- Actor's Apify Store page shows last update > 60 days ago
- Actor's issue tracker has unresolved reports of failures
- Actor returns significantly fewer results than the site visibly has
- Actor's success rate on its Apify Store page drops below 80%

**Phase to address:**
Phase 1 (scraper selection). Evaluate available actors early, build custom scrapers for sites where no reliable actor exists.

---

### Pitfall 9: No Crash Recovery -- One Failed Scrape Loses the Entire Run

**What goes wrong:**
A scraper is halfway through crawling 5,000 Homegate listings when the EC2 instance runs out of memory, the network drops, or an unhandled exception occurs. All 2,500 already-scraped listings are lost because they were held in memory and not yet written to disk. The scraper restarts from zero and re-scrapes pages it already visited, wasting time and increasing ban risk.

**Why it happens:**
Developers batch all results in memory and write them to a single JSON file at the end. This is simpler to implement but has zero fault tolerance. Node.js's default behavior on unhandled promise rejections is to crash the process.

**How to avoid:**
- Write each scraped listing to disk immediately (append to JSONL file, one listing per line)
- Maintain a cursor/checkpoint: store the last successfully scraped page number or listing ID
- On restart, read the checkpoint and resume from where you left off
- Use PM2 with `--max-memory-restart` to auto-restart before OOM kills the process
- Wrap every scraper in a top-level try/catch that logs the error and saves the checkpoint before exiting
- Use `process.on('uncaughtException')` and `process.on('unhandledRejection')` to save state before crashing

**Warning signs:**
- Scraper processes disappearing from `ps aux` without log entries
- Output files that are empty or suspiciously small
- Scrape runs taking 2-3x longer than expected (silently restarting from zero)

**Phase to address:**
Phase 1 (scraper framework). Incremental write + checkpoint must be in the base scraper class that all site-specific scrapers extend.

---

### Pitfall 10: Scraping Sites That Require JavaScript Rendering Without a Headless Browser

**What goes wrong:**
Some Swiss real estate sites render listing data client-side via JavaScript frameworks (React, Vue, Angular). A simple HTTP GET request returns an empty HTML shell with no listing data. The scraper stores this empty shell and reports success. This is particularly common with modern agency websites (Properti, Neho, BetterHomes) that are built as single-page applications.

**Why it happens:**
Developers test by viewing the page in a browser (where JS renders) but the scraper uses `fetch` or `axios` which only gets the initial HTML. The key sites (Homegate, ImmoScout24) embed data in `window.__INITIAL_STATE__` which IS available without JS rendering, but smaller agency sites often do not.

**How to avoid:**
- For each target site, first check if data is available in the raw HTML or `__INITIAL_STATE__` script tags (no JS rendering needed)
- If JS rendering is required, use Puppeteer/Playwright via Apify actors (they handle browser management)
- Never use headless browsers when plain HTTP requests suffice -- headless browsers use 10-50x more memory and CPU
- Create a site classification during the research phase: "static" (HTTP only), "hidden-API" (JSON in script tags), "SPA" (needs browser)
- For SPA sites, check if they have a hidden REST API by examining Network tab in DevTools -- often the SPA calls a JSON API that can be scraped directly

**Warning signs:**
- Scraped HTML files that are tiny (<5KB for a listing page that should have rich content)
- JSON parse errors when trying to extract `__INITIAL_STATE__` (the data is loaded via XHR, not embedded)
- All listing fields are null but the scraper reports HTTP 200 success

**Phase to address:**
Phase 1 (site feasibility research). Classify every target site before writing scrapers.

---

## Minor Pitfalls

### Pitfall 11: Timezone and Scheduling Confusion

**What goes wrong:**
EC2 instance defaults to UTC. Swiss time is CET (UTC+1) or CEST (UTC+2 in summer). Scheduled scrapes meant to run at "3 AM Swiss time" (off-peak, less anti-bot scrutiny) actually run at 1 AM or 2 AM UTC. Timestamp comparisons between scrape runs and listing "last updated" dates produce wrong results.

**How to avoid:**
- Store all timestamps in UTC in the data
- Configure the scheduler to explicitly use `Europe/Zurich` timezone for scheduling
- Log both UTC and local time in scrape run metadata

**Phase to address:**
Phase 1 (scheduler configuration).

---

### Pitfall 12: Not Capturing Listing Removal (Sold/Rented Properties)

**What goes wrong:**
Scrapers only capture new and existing listings. When a property is sold or rented and removed from the site, the scraper has no way to detect this. Historical analysis cannot distinguish between "listing was never scraped" and "listing was removed because it sold."

**How to avoid:**
- Store a manifest of all listing IDs seen per site per run
- Diff consecutive manifests to detect removed listings
- Mark removed listings with a `last_seen` timestamp and `status: presumed_sold`
- This is a Phase 2 concern -- for hackathon, just store snapshots and accept that removal detection comes later

**Phase to address:**
Phase 2 (data processing). Not critical for MVP but essential for investment analysis.

---

### Pitfall 13: Ignoring robots.txt and Getting a Legal Nastygram

**What goes wrong:**
Swiss real estate platforms explicitly restrict scraping in their robots.txt and terms of service. Ignoring these creates legal exposure. Comparis.ch returned a 403 even for the robots.txt file itself, suggesting very aggressive anti-scraping posture. Under the Swiss UWG (Unfair Competition Act), systematic extraction of a database can constitute unfair competition even if individual listings are publicly available.

**How to avoid:**
- Check and document the robots.txt for every target site before scraping
- Respect Disallow directives -- they are a strong negative signal if you end up in legal proceedings
- Use the crawl-delay directive if present
- Do not scrape content behind login walls or paywalls
- Consider reaching out to key platforms about data access (some may have partner APIs)
- Keep your scraping volume "polite" -- do not scrape faster than a human could browse

**Phase to address:**
Phase 1 (site feasibility research). Document robots.txt compliance for each site before building scrapers.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One JSON file per listing | Simple to implement | Inode exhaustion at scale, slow to query | Never at 23+ sites -- use JSONL from the start |
| No schema validation | Faster initial development | Silent data corruption goes undetected for days | First 24 hours only, then add validation |
| Hardcoded CSS selectors | Quick scraper development | Breaks on any site change, no reuse across sites | Acceptable for hackathon if hidden JSON/API not available |
| All scrapers in one process | Simple scheduling | One crash kills all scrapers, no per-site isolation | Never -- isolate per-site from day one |
| No proxy rotation | No infrastructure cost | IP ban kills all scraping from the EC2 instance | Acceptable for low-volume sites (<100 listings), never for major aggregators |
| Storing personal data alongside property data | Faster to implement | FADP liability, harder to comply with data requests | Never -- classify data types at scrape time |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Apify API | Assuming free tier credits last for 23 sites | Calculate expected Apify usage upfront. Free tier gives $5/month platform usage credits. Estimate cost per actor run and decide which sites justify the cost |
| EC2 with raw JSON | Not setting up SSH key or security group properly | Use key pair auth, restrict SSH to your IP, open only port 22 and health check port |
| Apify dataset download | Downloading full dataset every run instead of incremental | Use Apify's dataset pagination or webhook-based export to only get new results |
| Swiss site language | Scraping German-only URL paths | Most Swiss sites have `/de/`, `/fr/`, `/it/` paths. Check if different language paths show different listings (some agencies list in only one language) |
| Number parsing | Using `parseInt` or `parseFloat` on Swiss-formatted numbers | `CHF 1'200'000` must strip apostrophes before parsing. Build a shared `parseSwissNumber()` utility |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all scraped data into memory for dedup | Node.js process OOM-killed | Stream-process JSONL files, never load all data at once | >10,000 listings in memory (~50-500MB depending on field richness) |
| Running Puppeteer for every site | EC2 uses 4GB+ RAM, scrapes take hours | Only use browser rendering for SPA sites. Use HTTP requests for hidden-JSON sites | >3 concurrent Puppeteer instances on a t3.small |
| Single-threaded sequential scraping of all sites | Full scrape cycle takes 8+ hours | Run site scrapers in parallel (different processes), stagger start times | >10 sites with 1000+ listings each |
| No caching of already-scraped listing pages | Re-downloads full listing details every run even if listing hasn't changed | Use listing ID + last-modified date to skip unchanged listings | Daily scraping with >10,000 total listings |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Apify API keys in code or git | Key exposure, unauthorized usage billing | Use environment variables. Store in `.env` file excluded from git. On EC2, use instance metadata or AWS Secrets Manager |
| EC2 with open security group (0.0.0.0/0 on all ports) | Instance compromise, data theft, crypto mining | Restrict to SSH (port 22) from your IP + health check port. No other inbound rules |
| No HTTPS for health endpoint | Credentials in transit if you add auth later | Use self-signed cert or just accept HTTP for hackathon health check (no sensitive data flows through it) |
| Raw JSON files readable by all users on EC2 | Any process can read scraped data | Set file permissions to 600 (owner read/write only), run scraper as dedicated user |

## "Looks Done But Isn't" Checklist

- [ ] **Scraper "works":** Does it handle pagination? A scraper returning 20 listings when the site has 5,000 is only scraping page 1
- [ ] **Data "stored":** Are the JSON files valid JSON? Open one and verify it is parseable, not truncated, and contains expected fields
- [ ] **Scheduler "runs":** Does it actually run on schedule, or did the cron syntax put it on a monthly cycle? Check `crontab -l` and verify with a test run
- [ ] **"All sites" scraped:** Did you test with sites in all three languages? A scraper working for German Homegate may fail on French Homegate (`/fr/`)
- [ ] **Error handling "exists":** Does the scraper log errors AND continue, or does it log the error and then crash without saving partial results?
- [ ] **Rate limiting "implemented":** Is the delay between requests truly randomized, or is it a fixed `setTimeout(1000)` that is trivially detectable?
- [ ] **Disk space "sufficient":** Have you calculated the storage needed for daily scrapes across 23 sites for the full hackathon week?
- [ ] **Health endpoint "works":** Does it actually report scraper status (last run time, success/failure, listing counts), or just return `{"status": "ok"}`?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IP banned from major site | MEDIUM | Switch to Apify cloud actor for that site. If using custom scraper, add residential proxy. Recovery time: 1-2 hours |
| Silent data corruption (wrong schema) | HIGH | Re-scrape affected date ranges. Build schema validator. Audit all stored data against new schema. Recovery time: 4-8 hours |
| Disk full on EC2 | LOW | Compress old runs with gzip. Resize EBS volume (online, no restart needed with gp3). Recovery time: 30 minutes |
| FADP compliance issue | HIGH | Audit all stored data for personal information. Strip/hash personal fields. Document legal basis. Recovery time: 1-2 days |
| Duplicate data corrupting analysis | MEDIUM | Build post-hoc dedup pipeline using address normalization + fuzzy matching. Recovery time: 4-8 hours but imperfect results |
| Apify actor breaks | LOW-MEDIUM | Switch to custom scraper for that site. If the site uses hidden JSON, a basic custom scraper can be built in 2-4 hours |
| Scheduler overlap corruption | LOW | Move to timestamped output directories. Re-run affected scrapes. Add lock files. Recovery time: 1 hour |
| EC2 instance crash, data loss | HIGH if no backup | Set up daily EBS snapshot schedule ($0.05/GB/month). Recovery: launch new instance from snapshot. Without backup: data is gone |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IP banning (P1) | Phase 1: Scraper framework | Test each scraper with 100+ requests; no 403/429 errors |
| Silent data corruption (P2) | Phase 1: Schema validation | Run scraper output through validator; >95% of records pass |
| FADP violations (P3) | Phase 1: Data classification | Grep stored JSON for email/phone patterns; should return zero matches in property data files |
| Duplicate listings (P4) | Phase 2: Dedup pipeline | Compare listing count vs. known market inventory; within 2x is acceptable for MVP |
| Disk exhaustion (P5) | Phase 1: Infrastructure | `df -h` shows <50% usage after 3 days of scraping |
| Swiss number parsing (P6) | Phase 1: Shared utilities | Unit tests pass for `1'200'000`, `3.5 Zimmer`, `sur demande` |
| Scheduler overlap (P7) | Phase 1: Scheduler design | Run overlapping test; second instance detects lock and skips |
| Apify actor reliability (P8) | Phase 1: Actor evaluation | Document fallback plan for each Apify-dependent site |
| Crash recovery (P9) | Phase 1: Scraper framework | Kill scraper mid-run; restart recovers from checkpoint |
| JS rendering misclassification (P10) | Phase 1: Site research | Site classification doc exists with rendering requirement per site |
| Timezone confusion (P11) | Phase 1: Scheduler config | Scheduler runs at expected Swiss time; timestamps in data are UTC |
| Listing removal (P12) | Phase 2: Data processing | Manifest diff detects removed listings between runs |
| robots.txt compliance (P13) | Phase 1: Site research | robots.txt documented for each target site |

## Sources

- [ScrapFly: How to Scrape Homegate.ch](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) -- MEDIUM confidence, commercial scraping service perspective
- [ScrapFly: How to Scrape ImmoScout24.ch](https://scrapfly.io/blog/posts/how-to-scrape-immoscout24-ch-real-estate-property-data) -- MEDIUM confidence
- [Swiss FADP Overview (Adnovum)](https://www.adnovum.com/blog/swiss-federal-act-on-data-protection-2023) -- HIGH confidence, Swiss company analysis
- [Swiss FADP (SecurePrivacy)](https://secureprivacy.ai/blog/switzerland-new-federal-act-data-protection-fadp-key-changes-compliance) -- MEDIUM confidence
- [DLA Piper: Switzerland Data Protection Laws](https://www.dlapiperdataprotection.com/?t=law&c=CH) -- HIGH confidence, international law firm
- [Is Web Scraping Legal in 2026 (Rayobyte)](https://rayobyte.com/blog/is-web-scraping-legal-2026) -- MEDIUM confidence
- [State of Web Scraping 2026 (Browserless)](https://www.browserless.io/blog/state-of-web-scraping-2026) -- MEDIUM confidence
- [Web Scraping Challenges 2025 (ScrapingBee)](https://www.scrapingbee.com/blog/web-scraping-challenges/) -- MEDIUM confidence
- [How to Bypass Cloudflare 2026 (ScrapFly)](https://scrapfly.io/blog/posts/how-to-bypass-cloudflare-anti-scraping) -- MEDIUM confidence
- [Apify: Analyzing Pages and Fixing Errors](https://docs.apify.com/academy/node-js/analyzing-pages-and-fixing-errors) -- HIGH confidence, official docs
- [Swiss-immo-scraper (GitHub)](https://github.com/dvdblk/swiss-immo-scraper) -- MEDIUM confidence, working open-source project
- [AWS: EC2 Volume Disk Space](https://repost.aws/knowledge-center/ec2-volume-disk-space) -- HIGH confidence, official AWS docs
- [Small JSON Files Problem on S3 (Medium)](https://medium.com/@e.pkontou/small-files-problem-on-s3-5a5ec7f19d0a) -- MEDIUM confidence

---
*Pitfalls research for: Swiss real estate listing scraping infrastructure*
*Researched: 2026-03-05*
