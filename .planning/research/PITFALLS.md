# Pitfalls Research

**Domain:** Chrome extension injecting UI into third-party real estate site with LLM API integration
**Researched:** 2026-03-07
**Confidence:** HIGH (MV3 pitfalls verified against official Chrome docs; Homegate structure verified against scraping sources; Claude rate limits verified against official Anthropic docs)

---

## Critical Pitfalls

### Pitfall 1: Service Worker Global State Lost on Termination

**What goes wrong:**
Storing in-flight scoring state, pending request queues, or intermediate results in global JavaScript variables in the background service worker. When Chrome terminates the worker after 30 seconds of inactivity (or 5 minutes for a single long task), all global state vanishes. Next time the worker wakes up, it has no memory of which listings were being scored, breaking the UX mid-flow.

**Why it happens:**
Developers migrating from MV2 background pages expect persistent background processes. MV3 service workers are not persistent — Chrome terminates them when idle and restarts them on demand. The termination is silent and unpredictable.

**How to avoid:**
- Never store scoring state in global variables. Use `chrome.storage.session` (10 MB, survives worker restarts within the same browser session) for in-flight state.
- Use `chrome.storage.local` (10 MB, persists across sessions) for scored results and the user preference profile.
- Implement a "pending queue" as a persisted list in `chrome.storage.session`, not an in-memory array.
- Each fetch-score cycle should be stateless and resumable: check storage at start, write to storage on completion.
- Register all event listeners at the **top level** of the service worker script, not inside async callbacks or conditionals.

**Warning signs:**
- Scores appear for some listings then stop, with no error shown.
- After the browser is idle for 30+ seconds, returning to Homegate shows badges stopped mid-way.
- `console.log` in the service worker stops appearing in DevTools after idle.

**Phase to address:** Phase 1 — Foundation & Content Script (architecture decision must be made before any state is stored).

---

### Pitfall 2: DOMParser Not Available in Service Worker — Homegate HTML Cannot Be Parsed Inline

**What goes wrong:**
The background service worker fetches Homegate listing detail pages as HTML text, then tries to use `new DOMParser().parseFromString(html, 'text/html')` to extract listing data. This throws `ReferenceError: DOMParser is not defined` because service workers have no DOM access.

**Why it happens:**
Developers assume the JS environment in a service worker is the same as a regular browser context. It is not — service workers run in a stripped-down worker context without DOM APIs.

**How to avoid:**
Two options:

Option A (preferred for this project): Skip HTML parsing entirely. Homegate embeds full listing data in `window.__INITIAL_STATE__` as a JSON blob in a `<script>` tag. Parse this with a regex or string extraction on the raw HTML text (no DOM required). Extract the JSON string, `JSON.parse()` it, then navigate the path `data["listing"]["listing"]` for detail pages.

Option B (fallback): Use the Chrome Offscreen API with reason `DOM_PARSER`. Create an offscreen document, pass the HTML via `chrome.runtime.sendMessage`, parse it there, return the structured data. Limitation: only one offscreen document allowed at a time — cannot parallelize parsing.

**Warning signs:**
- `ReferenceError: DOMParser is not defined` in the service worker DevTools console.
- All fetch-detail requests succeed (status 200) but scoring never starts.

**Phase to address:** Phase 2 — Background Fetch & Data Extraction. Validate approach by logging `window.__INITIAL_STATE__` content from a test fetch before building the parser.

---

### Pitfall 3: Content Script Doesn't Re-Execute on SPA Navigation

**What goes wrong:**
Homegate is a JavaScript-rendered site with client-side routing. When a user navigates between search result pages, the URL changes but no full page reload occurs. The content script was injected once on initial page load and does not re-run. Badge injection logic only runs at script startup — so navigating to page 2 of results shows no badges at all.

**Why it happens:**
Chrome only runs content scripts on full page navigations. SPA route changes (`history.pushState`) are invisible to the content script injection mechanism.

**How to avoid:**
- Use `MutationObserver` watching `document.body` to detect when the listing grid is replaced (new listing cards appear, old ones removed).
- Also listen for `chrome.webNavigation.onHistoryStateUpdated` in the service worker and send a message to the content script to re-scan the page.
- Alternatively, use the WXT framework's built-in `matches` pattern with history state detection.
- On each navigation detection, re-scan for listing card elements and inject badges only into cards that don't already have them (check for a data attribute like `data-homematch-scored`).

**Warning signs:**
- Badges show on page 1 of search results but not page 2 (without full reload).
- Clicking on filter changes shows a spinner but no badges appear.
- The `MutationObserver` callback fires many times per keystroke (over-broad observation scope).

**Phase to address:** Phase 1 — Content Script Foundation. Must be handled before badge injection is built.

---

### Pitfall 4: CSS Leakage — Extension Styles Break Homegate UI

**What goes wrong:**
Injected badge `<div>` elements pick up Homegate's global CSS rules. Conversely, extension CSS inadvertently restyled Homegate's listing cards — font sizes, colors, or flex layout shifted visually across the whole page.

**Why it happens:**
Content script stylesheets are injected into the host page's DOM. Any CSS rule with sufficient specificity bleeds into the host page. Conversely, the host page's CSS cascades into injected elements (especially inherited properties like `font-family`, `font-size`, `line-height`, `color`).

**How to avoid:**
- Wrap every injected UI element in a **Shadow DOM** with `element.attachShadow({mode: 'open'})`.
- Inject extension CSS inside the shadow root — styles are fully scoped.
- Use `all: initial` on the shadow host's root element to reset inherited styles from the host page.
- Use Tailwind CSS with a shadow-scoped prefix, or use `@layer` reset strategies inside shadow roots.
- Never rely on `!important` overrides — they indicate a specificity war, not a solution.

**Warning signs:**
- Badge text renders in an unexpected font or size that varies between Homegate pages.
- Homegate's listing card layout shifts when the extension is enabled.
- Extension popup CSS uses class names that match Homegate's class names.

**Phase to address:** Phase 1 — Content Script Foundation. Establish Shadow DOM pattern before building any UI components.

---

### Pitfall 5: Homegate Blocks Background Fetch Requests (Anti-Bot Headers)

**What goes wrong:**
Fetching Homegate listing detail pages from the service worker (via `fetch()`) results in 403, 429, or CAPTCHA redirect responses. The server detects non-browser request signatures: missing `Cookie` headers, wrong `User-Agent`, missing `Accept-Language`, missing `Referer`. The extension receives HTML with no listing data or a bot-detection page.

**Why it happens:**
Homegate uses server-side bot detection that checks request headers. Requests from the extension service worker have a bare-bones header profile (`chrome-extension://...` origin, no cookies for the current user session, no `Referer`). Even though the user is logged in on the browser, the service worker does not automatically send their session cookies.

**How to avoid:**
- Use `fetch()` with `credentials: 'include'` to send the user's existing Homegate session cookies.
- Include realistic headers: `Accept`, `Accept-Language: de-CH,de`, `Referer: https://www.homegate.ch/`, `User-Agent` (inherit from browser context or use a realistic value).
- Respect Homegate's robots.txt and Terms of Service. This extension is used by the logged-in user fetching their own results — not mass scraping.
- Implement per-listing request throttling (e.g., max 2-3 concurrent fetches, 300–500ms delay between requests) to avoid rate-limit bans.
- Parse `window.__INITIAL_STATE__` JSON from the fetched HTML rather than the rendered DOM — this is more robust to anti-scraping HTML obfuscation.

**Warning signs:**
- Fetch responses return status 200 but HTML contains "Access Denied" or "Captcha" text.
- `window.__INITIAL_STATE__` JSON is absent in fetched HTML but visible in the browser tab.
- Rapidly scoring 20+ listings triggers a temporary IP/session block.

**Phase to address:** Phase 2 — Background Fetch & Data Extraction. Validate with a single test fetch before building batch logic.

---

### Pitfall 6: Service Worker Terminates Mid-Batch Scoring (5-Minute Task Limit)

**What goes wrong:**
A Homegate search result page shows 20 listings. The extension fetches all 20 detail pages and sends LLM calls sequentially. Each LLM call takes 3–8 seconds. Total wall time for 20 listings easily exceeds 5 minutes. Chrome terminates the service worker mid-way. Listings 12–20 never get scored. No error is shown to the user.

**Why it happens:**
Chrome enforces a hard 5-minute limit on a single task. Additionally, each fetch has a 30-second timeout. LLM calls through a proxy can be slow. Chaining 20 sequential operations violates these constraints.

**How to avoid:**
- Process listings in parallel batches (e.g., 3 concurrent fetch+score operations at a time).
- Use the concurrency pattern: push all listing URLs into `chrome.storage.session` as a queue, then process with a self-scheduling pattern (each completed task picks up the next from the queue).
- Each individual fetch+score operation must complete within 5 minutes — which is fine for a single listing, but never chain them into one long sequential async chain.
- Use `chrome.alarms` to re-trigger the worker if it terminates with items still in queue.
- Call a trivial Chrome API (e.g., `chrome.storage.local.get`) every 20 seconds inside long loops to reset the 30-second idle timer.

**Warning signs:**
- Badges appear for the first N listings but stop suddenly with no visible error.
- DevTools service worker shows "Stopped" status mid-scoring.
- Queue counter in storage shows items remaining but no activity.

**Phase to address:** Phase 2 — Background Fetch & Data Extraction. Design the batch processing architecture before writing any fetch code.

---

### Pitfall 7: Claude API Rate Limits Hit During Burst Scoring (Tier 1)

**What goes wrong:**
On a fresh API account (Tier 1), the rate limit is 50 RPM and 30,000 ITPM for Claude Sonnet 4.x. A search result page with 20 listings and ~1,500-token prompts per listing consumes 30,000 input tokens per batch — hitting the ITPM ceiling in the first minute. The proxy returns 429 errors. Scoring stalls. The user sees badges loading forever.

**Why it happens:**
Each listing evaluation sends: system prompt (~500 tokens) + user profile (~300 tokens) + listing data (~500–700 tokens) = ~1,300–1,500 tokens per call. 20 listings = ~28,000–30,000 tokens — nearly the full Tier 1 ITPM budget in one burst.

**How to avoid:**
- Use prompt caching on the Anthropic API: mark the system prompt and user profile as cacheable (`cache_control: {"type": "ephemeral"}`). Cached tokens don't count toward ITPM on most Claude models. This drops effective token consumption per listing from ~1,500 to ~700.
- Add exponential backoff with jitter on 429 errors — retry after `retry-after` header duration.
- Process listings sequentially at a controlled rate (1 every 2 seconds) rather than bursting all 20 at once.
- For the hackathon demo, pre-score a fixed page to avoid live rate limit issues during the demo itself.
- Upgrade API account to Tier 2 ($40 deposit) before the demo — Tier 2 allows 1,000 RPM and 450,000 ITPM.

**Warning signs:**
- Proxy logs show `429` responses from Anthropic after the first few listings score correctly.
- First 2–3 badges appear, then all remaining listings show a loading indicator permanently.
- `retry-after` header value is 60 seconds or more.

**Phase to address:** Phase 3 — LLM Scoring. Implement caching and rate limit handling before end-to-end testing.

---

### Pitfall 8: Message Channel Closed Before Async Response (Content Script ↔ Service Worker)

**What goes wrong:**
The content script sends a message to the service worker requesting a score for a listing. The service worker handler does async work (fetch + LLM call) and tries to call `sendResponse()` when done. Chrome has already closed the message channel. The content script never receives the score. No error is thrown.

**Why it happens:**
In Chrome's messaging API, if the listener function does not return `true` synchronously (or return a Promise in Chrome 146+), the message channel is closed immediately after the listener returns. Any attempt to call `sendResponse` asynchronously is silently dropped.

**How to avoid:**
- Return `true` from `chrome.runtime.onMessage.addListener` to keep the channel open for async responses (works in all Chrome versions).
- Or return a `Promise` from the listener (Chrome 146+, acceptable since this is a 2026 project).
- Better pattern for this architecture: use a persistent connection via `chrome.runtime.connect()` for streaming score updates from the service worker back to the content script.
- Or: use `chrome.storage.session` as a shared state bus — service worker writes scores, content script reads via `chrome.storage.onChanged` listener.

**Warning signs:**
- Scores are computed (visible in service worker DevTools console) but badges never update in the page.
- `chrome.runtime.lastError: "The message port closed before a response was received."` in content script console.

**Phase to address:** Phase 2 — Background Fetch & Data Extraction (messaging architecture must be established).

---

### Pitfall 9: Extension Update Breaks Content Script in Open Tabs

**What goes wrong:**
User updates the extension (or Chrome auto-updates it). Existing Homegate tabs still run the old content script. The new service worker starts. Old content scripts try to send messages to the new service worker — the extension IDs match, but the runtime context is stale. `chrome.runtime.sendMessage` throws `Extension context invalidated`. All badge injection stops. The user sees a broken state with no feedback.

**Why it happens:**
Chrome injects content scripts only at page load time. Open tabs from before the update still run the previous script version. The runtime context between the old content script and the new service worker is incompatible.

**How to avoid:**
- Catch `Extension context invalidated` errors around all `chrome.runtime` calls in content scripts.
- On catching this error, display a non-intrusive "Please reload the page to update HomeMatch" notice.
- In the service worker `chrome.runtime.onInstalled` handler, call `chrome.scripting.executeScript` to re-inject content scripts into all existing Homegate tabs.
- Use a version handshake: the content script sends its version on connection; if the service worker detects a mismatch, it triggers re-injection.

**Warning signs:**
- After extension update, badges disappear from tabs that were already open.
- `Uncaught Error: Extension context invalidated` in the browser console on existing tabs.
- Reloading the Homegate tab fixes the issue — confirming stale context, not a code bug.

**Phase to address:** Phase 4 — Polish & Reliability. Handle gracefully before release.

---

### Pitfall 10: Homegate DOM Selector Fragility (No Stable IDs)

**What goes wrong:**
The content script uses CSS selectors like `.listing-card-wrapper` or `[data-test-id="listing"]` to find listing cards and inject badges. Homegate deploys a frontend update that renames CSS classes or removes `data-test-id` attributes. All badge injection silently stops working in production. Users see no badges, no error.

**Why it happens:**
Third-party sites don't provide stability guarantees for their CSS class names or DOM structure. Homegate.ch uses server-side rendered React/Next.js with hashed or generated class names on some components that change with each build.

**How to avoid:**
- Prefer structural selectors over class name selectors: target `<article>` tags, aria-roles, or known semantic HTML elements rather than generated class names.
- Use `data-*` attributes where available as they tend to be more stable (often used in QA test suites internally).
- Build a selector abstraction layer with multiple fallback strategies: try selector A, fall back to selector B, fall back to selector C, log a warning if all fail.
- Validate selectors on page load and emit a warning badge ("HomeMatch: page structure changed — contact support") if no listing cards are found on a Homegate search URL.
- Monitor selector health: log when the fallback selector is used.

**Warning signs:**
- Extension works in development but no badges appear after a Homegate frontend deploy.
- `document.querySelectorAll(LISTING_SELECTOR).length === 0` on a page that visibly shows listings.
- Homegate's class names contain hashes like `listing-card__title--a3f9b2`.

**Phase to address:** Phase 1 — Content Script Foundation. Establish the selector abstraction pattern from day one.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding Homegate CSS selectors | Faster development | Breaks silently on Homegate frontend deploys | Only with a monitoring/alerting strategy in place |
| Sending full raw HTML to LLM instead of extracted JSON | Avoids writing a parser | Wastes 5-10x tokens, hits rate limits faster, increases cost and latency | Never — extract from `window.__INITIAL_STATE__` always |
| Sequential scoring (one listing at a time) | Simpler code | User waits 3-8 minutes for 20 listings to score | Acceptable in MVP if clearly communicated; replace with parallelism post-demo |
| No retry logic on LLM proxy calls | Faster to write | Transient errors cause permanent badge failures | Never in production; always add exponential backoff |
| Global variables in service worker for in-flight state | Feels natural, works in dev | State lost on worker restart, hard to reproduce bugs | Never — use `chrome.storage.session` from day one |
| Calling LLM with the listing's raw description text (multilingual, unsanitized) | No preprocessing | LLM may hallucinate on garbage HTML artifacts left in the extracted text | Acceptable in hackathon if you strip obvious HTML tags; clean up for production |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Homegate fetch from service worker | Fetching without `credentials: 'include'` — cookies not sent, gets 403 or empty page | Use `fetch(url, {credentials: 'include', headers: {Referer: 'https://www.homegate.ch/'}})` |
| Homegate data extraction | Parsing rendered HTML DOM selectors | Parse `window.__INITIAL_STATE__` JSON from the raw HTML string — more reliable, no DOM needed |
| Anthropic API (via proxy) | Sending full user profile and system prompt uncached on every request | Use `cache_control: {type: "ephemeral"}` on system prompt and profile — cached tokens don't count toward ITPM |
| Anthropic API rate limits | Ignoring the `retry-after` response header on 429 | Read `retry-after` header and wait exactly that duration before retry, with exponential backoff |
| Chrome storage | Using `chrome.storage.sync` for the user profile | `sync` has 100KB total quota; use `chrome.storage.local` for the profile (10 MB quota) |
| Content script ↔ service worker messaging | Not returning `true` from `onMessage` listener | Return `true` for async responses, or use `chrome.storage.onChanged` as a shared event bus |
| Shadow DOM and Tailwind CSS | Importing Tailwind CDN inside shadow root — blocked by extension CSP | Bundle Tailwind as a static CSS file in the extension package; import via shadow root `adoptedStyleSheets` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded MutationObserver | CPU spikes on pages with live price tickers or animated elements; fan noise | Observe only `{childList: true, subtree: false}` on the listings container, not `document.body`; disconnect when processing | Immediately on heavy SPA pages |
| Scoring all listings simultaneously | First 2-3 badges appear, remaining never resolve (rate limit hit) | Cap concurrent scoring at 3; use a self-draining queue in `chrome.storage.session` | On Tier 1 with 8+ listings per page |
| Re-scoring already-scored listings on every DOM mutation | Exponential duplicate LLM calls; cost blow-up | Tag each listing DOM element with `data-homematch-scored="true"` before scoring; check before enqueueing | Immediately if MutationObserver fires on inject |
| Fetching detail page for each listing card, including duplicate listings (same ID in carousel vs grid) | Duplicate LLM calls; unnecessary cost | Deduplicate by listing ID before fetching; maintain a scored ID set in `chrome.storage.session` | With paginated or carousel-style result pages |
| Large listing HTML sent to proxy | Slow proxy response; high token count; risk of context limit | Extract only needed fields from `window.__INITIAL_STATE__` — strip image URLs, metadata noise, keep description + specs only | For listings with long marketing descriptions |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Anthropic API key in extension (content script or service worker) | Key exposed to any webpage that inspects the extension's network requests or source; extractable from `.crx` | Never put API key in extension. Always route through the EC2 proxy. Proxy validates requests and holds the key in an environment variable. |
| EC2 proxy with no authentication | Any user with the proxy URL can make unlimited Claude API calls billed to your account | Add a shared secret header that the extension sends; validate on the proxy. For hackathon: generate a UUID secret at extension install time stored in `chrome.storage.local`, sent with every proxy request. |
| EC2 proxy open to all origins (`Access-Control-Allow-Origin: *`) | Any website can hit your proxy endpoint and consume your API credits | Restrict CORS to `chrome-extension://[your-extension-id]` or validate the `Origin` header server-side |
| Injecting raw Homegate HTML into the page's DOM | Stored XSS: if Homegate listing descriptions contain script injection, and you `innerHTML` them, they execute in the page context | Always use Shadow DOM + `textContent` for user-visible content. Never `innerHTML` with untrusted content. |
| Using `chrome.storage.sync` for the user profile | Sync data is transmitted to Google's servers and synced across devices — includes user's home address, budget, location preferences (PII) | Use `chrome.storage.local` — stays on the user's device. Document this choice in the privacy policy. |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing a spinner on all badges simultaneously, then revealing all at once | Users think the extension is frozen for 30-60+ seconds; likely to disable it | Show each badge as soon as its score is ready (progressive disclosure); each listing badge is independent |
| Showing a numeric percentage (e.g., "73%") with no context | Users question the number — "73% of what?" — and distrust it | Show label + number: "Good Match — 73%" with color coding; percentage alone is opaque |
| Silent failure when scoring fails (LLM error, timeout) | User assumes the extension is broken for that listing permanently | Show a neutral "?" badge with "Unable to score" tooltip; never leave a listing in a permanent loading state |
| Full-page onboarding that reloads Homegate after completion | User loses their search context; jarring | After onboarding completes, trigger badge injection on the current page state; don't force a reload |
| Score breakdown panel covers the listing card permanently | Users can't read the listing title or price while the panel is open | Make breakdown expandable/collapsible; default to collapsed; anchor to the right side or render as a tooltip |

---

## "Looks Done But Isn't" Checklist

- [ ] **Badge injection:** Badges appear on page 1 — verify they also appear after SPA navigation to page 2 without full reload.
- [ ] **Background fetch:** Fetch works in dev (where no bot detection triggers) — verify with `credentials: 'include'` and real session cookies on actual Homegate.ch.
- [ ] **Service worker state:** Scoring works in one session — verify state survives if user leaves the tab idle for 60 seconds then returns (worker was terminated and restarted).
- [ ] **Shadow DOM isolation:** Extension badges look correct in dev — verify Homegate's own CSS doesn't alter badge appearance (check `font-size`, `color`, `line-height` inheritance).
- [ ] **Message passing:** Scores received in dev environment — verify `sendResponse` + `return true` pattern is used and scores still arrive under load.
- [ ] **Rate limits:** 3 listings score correctly — verify 20 simultaneous listings complete without 429 errors; test with prompt caching enabled.
- [ ] **Selector stability:** Selectors work on current Homegate — test on search results page, map view toggle, and after applying a filter (each can trigger DOM restructure).
- [ ] **Extension update:** Works when extension is active — verify what happens when the extension is reloaded (DevTools "reload" button) with Homegate tab already open.
- [ ] **Multilingual listings:** DE listing scores correctly — verify FR and IT listings also score and that the LLM response language matches the listing language.
- [ ] **Proxy security:** Proxy accepts extension requests — verify the proxy rejects requests without the shared secret header.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service worker state loss discovered late | MEDIUM | Refactor all global state to `chrome.storage.session`; test by forcibly stopping the worker in DevTools |
| DOMParser failure discovered in production | LOW | Switch to regex-based `window.__INITIAL_STATE__` extraction; no architecture change needed |
| Homegate DOM selectors break | LOW | Update selectors; ship new extension version; add fallback selector strategy |
| Anti-bot blocking on background fetch | MEDIUM | Add `credentials: 'include'` + headers; implement request throttling; test with real session |
| Rate limits saturated during demo | LOW | Switch from Sonnet to Haiku for demo; add prompt caching; upgrade to Tier 2 ($40) |
| CSS bleed-through discovered in testing | LOW | Wrap in Shadow DOM; typically a 2–4 hour fix if not designed in from the start |
| CSS bleed-through discovered post-ship | HIGH | Shadow DOM refactor requires rewriting all injected UI component mounting logic |
| Proxy has no auth, gets abused | MEDIUM | Add secret-header validation on proxy; rotate the key and republish extension with new key |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Service worker global state loss | Phase 1 — Foundation | Force-stop worker in DevTools; confirm queued items persist in `chrome.storage.session` |
| DOMParser not available in service worker | Phase 2 — Background Fetch | Log raw HTML from a test fetch; confirm `window.__INITIAL_STATE__` JSON is extractable via string parsing |
| Content script doesn't re-execute on SPA navigation | Phase 1 — Foundation | Navigate between search pages without reload; confirm badge injection fires |
| CSS leakage (extension vs. host page) | Phase 1 — Foundation | Inspect Homegate card styles with extension active; toggle extension on/off and diff computed styles |
| Homegate blocks background fetch (anti-bot) | Phase 2 — Background Fetch | Run fetch from service worker with DevTools network log; confirm 200 response and `__INITIAL_STATE__` present |
| Service worker terminates mid-batch | Phase 2 — Background Fetch | Score 20+ listings; observe service worker lifecycle in DevTools; confirm all listings eventually score |
| Claude API rate limits on burst scoring | Phase 3 — LLM Scoring | Run end-to-end score for 20 listings; check proxy logs for 429 errors; verify caching is applied |
| Message channel closed before async response | Phase 2 — Background Fetch | Send a score request; add 10-second artificial delay in handler; confirm badge still updates |
| Extension update breaks open tabs | Phase 4 — Polish & Reliability | Reload extension in DevTools with Homegate tab open; confirm graceful degradation or re-injection |
| Homegate DOM selector fragility | Phase 1 — Foundation | Test selectors after toggling search filters (DOM re-renders); implement fallback strategy |

---

## Sources

- [Chrome Extension Service Worker Lifecycle — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — HIGH confidence
- [Longer Extension Service Worker Lifetimes — Chrome Blog](https://developer.chrome.com/blog/longer-esw-lifetimes) — HIGH confidence
- [Chrome Offscreen API — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/offscreen) — HIGH confidence
- [Cross-origin Network Requests — Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — HIGH confidence
- [Claude API Rate Limits — Anthropic Official Docs](https://platform.claude.com/docs/en/api/rate-limits) — HIGH confidence (Tier 1: 50 RPM, 30K ITPM for Sonnet 4.x; Tier 2: 1,000 RPM, 450K ITPM)
- [How to Scrape Homegate.ch Real Estate Property Data — Scrapfly](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) — MEDIUM confidence (confirms `window.__INITIAL_STATE__` JSON structure)
- [Solving CSS and JavaScript Interference in Chrome Extensions — DEV Community](https://dev.to/developertom01/solving-css-and-javascript-interference-in-chrome-extensions-a-guide-to-react-shadow-dom-and-best-practices-9l) — MEDIUM confidence
- [Making Chrome Extension Smart By Supporting SPA Websites — Medium](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8) — MEDIUM confidence
- [Managing Concurrency in Chrome Extensions — Taboola Engineering](https://www.taboola.com/engineering/managing-concurrency-in-chrome-extensions/) — MEDIUM confidence
- [Hackers Target Misconfigured LLM Proxies — BleepingComputer](https://www.bleepingcomputer.com/news/security/hackers-target-misconfigured-proxies-to-access-paid-llm-services/) — MEDIUM confidence (real-world attack pattern on unsecured LLM proxies)

---
*Pitfalls research for: Chrome extension + LLM integration on third-party real estate site (Homegate.ch)*
*Researched: 2026-03-07*
