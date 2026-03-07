# Project Research Summary

**Project:** HomeMatch — AI-Powered Property Listing Scorer
**Domain:** Chrome Extension (MV3) + LLM Proxy Backend + Third-Party Site Integration
**Researched:** 2026-03-07
**Confidence:** HIGH (stack verified via official docs and npm; architecture patterns verified against Chrome official docs)

## Executive Summary

HomeMatch is a Chrome Extension (Manifest V3) that injects AI-generated match score badges onto Homegate.ch property listing cards, evaluated against the user's stored preference profile. The stack is clear and well-defined: WXT 0.20 as the extension build framework, React 19 for UI components, Tailwind CSS v4 for Shadow DOM-compatible styling, a thin Hono 4.12 proxy on EC2 that holds the Anthropic API key and forwards requests to Claude, and `@wxt-dev/storage` for typed `chrome.storage.local` access. No database, no user accounts. The entire value chain is: user sets preferences once in an onboarding wizard, content script detects listing cards on Homegate, background service worker fetches each listing detail page and calls the LLM proxy, and scored badges appear progressively as results arrive.

The recommended build order follows strict architectural dependencies: shared utilities first, then the onboarding/storage layer (no score can be generated without a profile), then the background service worker + data extraction from Homegate's `window.__INITIAL_STATE__` JSON, then LLM integration, then the badge injection UI. The backend can be developed in parallel with the extension and must be running before any end-to-end testing. The core loop — detect listing card, fetch detail, score against profile, render badge — must be solid before adding UX polish.

The primary risks are MV3 service worker lifecycle constraints (30s idle termination, 5-minute task limit), Homegate's anti-bot detection on background fetches, Claude API Tier 1 rate limits on burst scoring of 20+ listings, and content script CSS bleed-through on a third-party site. Every one of these has a well-understood mitigation: `chrome.storage.session` for in-flight state, `credentials: 'include'` with realistic headers for Homegate fetches, Anthropic prompt caching to reduce ITPM consumption, and Shadow DOM isolation with Tailwind CSS injected inside the shadow root. These mitigations must be designed in from Phase 1 — retroactive Shadow DOM refactors are expensive, and global state in service workers is a silent failure mode.

## Key Findings

### Recommended Stack

The extension is built on WXT 0.20 (Vite-based, MV3-first, HMR for content scripts and popups), which ships ~43% smaller bundles than the alternative Plasmo and provides first-class abstractions for all extension contexts: popup, content scripts, background service worker, and unlisted full-page tabs (used for onboarding). Plasmo should be avoided — it appears to be in maintenance mode as of 2025 and uses the slower Parcel bundler. The backend is a single Hono route (`POST /score`) deployed on EC2 with Node.js 18+, using `@hono/node-server` and the official `@anthropic-ai/sdk`. The extension never holds the Anthropic API key; it lives in the EC2 environment only.

**Core technologies:**
- **WXT 0.20**: Extension build framework — file-based entrypoints, auto-generated MV3 manifest, HMR, `createShadowRootUi()` for injected UI isolation
- **React 19.2**: UI rendering for popup, onboarding wizard, and injected badge components — first-class WXT integration via `@wxt-dev/module-react`
- **TypeScript 5.x**: Type safety across all extension contexts and backend — prevents content-script/service-worker messaging mismatches
- **Tailwind CSS v4**: Utility-first styling with native `:host` selector support — inject generated CSS into shadow root, not the host page
- **@wxt-dev/storage 1.2**: Typed, promise-based wrapper for `chrome.storage.local` — works across popup, content scripts, and service worker contexts
- **Hono 4.12 + @hono/node-server**: Thin EC2 proxy — ultralight (14 KB), streaming helper for SSE passthrough, built-in CORS middleware
- **@anthropic-ai/sdk 0.78**: Official Claude client on the backend only — streaming, prompt caching, SSE support
- **Zod 4 / @zod/mini**: Schema validation — `@zod/mini` in extension bundle (1.9 KB gzipped), full `zod` on backend

### Expected Features

The core value proposition rests on an unbroken dependency chain: Preference Profile → LLM Scoring → Score Badge Injection. Every other feature is either an enhancement to this chain or independent of it. The hackathon MVP must ship the full chain end-to-end; everything else is additive.

**Must have (table stakes) — all P1 for hackathon demo:**
- **Score badge injection on listing cards** — core visible value; Shadow DOM required to survive Homegate CSS
- **Onboarding wizard (full-page tab)** — no profile = no scores; must open on extension install
- **Preference profile in chrome.storage.local** — foundation for everything; JSON blob, no server, no auth
- **Background fetch of listing detail pages** — listing cards show minimal data; full description needed for LLM soft-criteria evaluation
- **LLM evaluation via EC2 proxy** — Claude call with listing data + profile + weights + language instruction + "I don't know" instruction
- **Loading skeleton badges** — appear immediately; prevents "is it broken?" confusion during 2-5s scoring latency
- **Expandable score breakdown** — category scores + bullet reasoning + listing text citations; collapses on click
- **Extension popup dashboard** — on/off toggle + profile summary + edit link

**Should have (competitive differentiators):**
- **Configurable importance weights per category** — sliders/chips in onboarding; feed directly into LLM prompt weighting
- **Progressive badge reveal** — badges appear one-by-one as each LLM call resolves (not all-or-nothing)
- **Multi-language analysis** — prompt-level instruction only, no extra engineering; Claude handles DE/FR/IT natively
- **Score cache with TTL** — cache scores by listing ID + profile hash in `chrome.storage.local`; reduces LLM cost on repeat visits
- **Transparent citation of listing text** — LLM prompt instructs quoting relevant phrases from description; builds trust

**Defer (v2+):**
- Image analysis of listing photos — token cost and latency are prohibitive in v1
- Multiple user profiles (broker use case) — breaks "no accounts" constraint
- Cross-portal support (ImmoScout24, Comparis) — architecture extensible but do not build for v1
- Push notifications for new listings — requires server-side monitoring, not feasible in MV3

### Architecture Approach

The architecture is a message-passing hub pattern: content scripts never make external requests, all network activity flows through the background service worker, and `chrome.storage.local` is the sole persistence layer that survives service worker termination. The content script's responsibility is DOM observation and badge rendering only. The service worker handles Homegate detail page fetching (parsing `window.__INITIAL_STATE__` JSON via regex — not DOMParser, which is unavailable in service workers), batched LLM proxy calls, and score caching. The EC2 backend is a pure stateless proxy: validate request, call Claude, return JSON.

**Major components:**
1. **Content Script** — MutationObserver for listing card detection, Shadow DOM badge injection, SPA navigation re-scan via `webNavigation.onHistoryStateUpdated`
2. **Background Service Worker** — all external fetches (Homegate + EC2 proxy), message broker for content script requests, `chrome.storage.local` read/write for profile + score cache
3. **Popup** — on/off toggle, profile summary, links to onboarding; reads `chrome.storage.local` directly
4. **Onboarding Page (unlisted full-page tab)** — multi-step preference wizard, writes profile JSON to `chrome.storage.local` on completion
5. **EC2 Backend (Hono)** — single `POST /score` route, holds Anthropic API key, validates CORS to `chrome-extension://` origin only
6. **chrome.storage.local** — persistent state layer: userProfile, weights, scoreCache, extensionEnabled flag

### Critical Pitfalls

1. **Service worker global state lost on termination** — Never store in-flight state in JS variables; use `chrome.storage.session` for ephemeral state, `chrome.storage.local` for persistent data. Register all event listeners at the top level of the service worker, not inside async callbacks.

2. **DOMParser unavailable in service worker** — Do not attempt to parse fetched Homegate HTML with `new DOMParser()`. Instead, extract `window.__INITIAL_STATE__` JSON from the raw HTML string using a regex match — this pattern is confirmed to work on Homegate's HTML structure.

3. **CSS leakage between extension and host page** — Wrap every injected UI element in Shadow DOM (`attachShadow({mode: 'open'})`). Add `all: initial` on the shadow host root element. Inject Tailwind CSS inside the shadow root, never into the host page's `<head>`. This must be designed in from Phase 1; retroactive refactors cost 2-4x as much.

4. **Content script doesn't re-execute on SPA navigation** — Homegate is a SPA using `history.pushState`. Use `MutationObserver` scoped narrowly to the results list container (not `document.body`) plus `chrome.webNavigation.onHistoryStateUpdated` in the service worker to detect route changes and re-trigger badge injection.

5. **Claude API Tier 1 rate limits on burst scoring** — At Tier 1 (50 RPM, 30,000 ITPM), 20 listings at ~1,500 tokens each saturates the ITPM budget in one batch. Mitigation: use `cache_control: {"type": "ephemeral"}` on system prompt and user profile (cached tokens don't count toward ITPM); process listings in batches of 3 concurrent; add exponential backoff on 429 responses; upgrade to Tier 2 ($40 deposit) before demo.

## Implications for Roadmap

Based on the dependency graph in FEATURES.md, the build order in ARCHITECTURE.md, and the phase-to-pitfall mapping in PITFALLS.md, the following phase structure is strongly recommended. The core loop must be shipped vertically before any horizontal feature additions.

### Phase 1: Foundation — Shared Utilities, Manifest, and Content Script Skeleton

**Rationale:** Everything else imports from shared utilities; the manifest defines all extension contexts; the content script's Shadow DOM and SPA navigation patterns must be established before badge UI is built. Getting these wrong requires expensive retroactive refactors (especially Shadow DOM). PITFALLS.md flags four critical pitfalls that must be mitigated at this phase: service worker state design, Shadow DOM isolation, SPA navigation handling, and DOM selector abstraction.

**Delivers:** Working extension scaffold that detects Homegate listing cards, injects placeholder elements, and survives SPA navigation. No scoring yet — just the detection and injection skeleton.

**Addresses features:** Score badge injection skeleton, on/off toggle foundation, extension popup shell.

**Must avoid:** CSS leakage (Shadow DOM from day one), global state in service worker (use `chrome.storage.session`/`local` from day one), unbounded MutationObserver (scope to results container), hardcoded fragile selectors (build selector abstraction with fallbacks).

### Phase 2: Data Layer — Onboarding Wizard, Profile Storage, and Background Fetch

**Rationale:** The LLM scorer needs a user profile and listing data. Onboarding must come before scoring because the content script requires a valid profile to send with score requests. Background fetch is the data acquisition layer — and it has the second-highest pitfall density (DOMParser unavailability, anti-bot headers, service worker mid-batch termination, message channel closure). These must be proven working before wiring up the LLM.

**Delivers:** Full onboarding wizard that writes a profile to `chrome.storage.local`. Working service worker that fetches Homegate detail pages and extracts listing data from `window.__INITIAL_STATE__`. End-to-end message passing from content script to service worker and back (with `return true` async pattern).

**Uses:** `@wxt-dev/storage`, WXT unlisted page entrypoint for onboarding, `chrome.storage.local` schema, `fetch()` with `credentials: 'include'` and realistic request headers.

**Must avoid:** DOMParser in service worker (use regex JSON extraction), missing `return true` in `onMessage` listener, fetching Homegate without session cookies (gets 403), sequential batch processing that exceeds 5-minute worker limit.

### Phase 3: LLM Integration — EC2 Backend Proxy and Scoring Pipeline

**Rationale:** The backend can be developed in parallel with Phase 2, but end-to-end integration only makes sense once Phase 2's data extraction is working. This phase wires listing data into Claude and renders real scores in badges. Prompt design is the key risk — the quality of the system prompt and weight-to-prompt translation directly determines product quality.

**Delivers:** Working EC2 Hono backend at `POST /score`. Full scoring pipeline: content script detects cards, service worker fetches detail page + calls proxy + receives score, content script renders real score badges. Prompt includes: listing data, user profile + weights, language instruction, "I don't know" instruction, listing text citation instruction.

**Implements:** EC2 backend (Hono + `@anthropic-ai/sdk`), CORS restricted to `chrome-extension://` origin, shared secret header for proxy auth, Anthropic prompt caching on system prompt and user profile, exponential backoff on 429 errors.

**Must avoid:** API key in extension bundle (never), open CORS policy on proxy (never), sending raw HTML to LLM instead of extracted JSON (wastes 5-10x tokens), scoring all listings simultaneously (triggers Tier 1 rate limits).

### Phase 4: UX Polish and Reliability

**Rationale:** After the core loop works end-to-end, invest in the UX features that determine whether users keep the extension after the first session — progressive badge reveal, expandable score breakdown, loading skeleton badges, and graceful failure states. Also address extension update context invalidation here.

**Delivers:** Skeleton badges on page load, progressive badge reveal as scores arrive, expandable inline breakdown panel with category scores + bullet reasoning + listing text citations, neutral "unable to score" state on failures, score cache with TTL to reduce repeat-visit latency and cost, graceful handling of extension updates with open tabs.

**Addresses features:** Progressive badge reveal, expandable score breakdown, score cache with TTL, transparent listing text citations, honest "I don't know" rendering.

**Must avoid:** All-or-nothing badge reveal (users think extension is frozen), silent scoring failure (show "?" badge with tooltip), inline expansion covering the listing card permanently (make it collapsible).

### Phase Ordering Rationale

- Shared utilities and manifest first — everything else imports from them; no entrypoint can be built without the manifest defined
- Shadow DOM and SPA detection in Phase 1 — retroactive Shadow DOM refactors are the highest-recovery-cost pitfall identified; must be foundational
- Onboarding and storage before scoring — the scoring pipeline is meaningless without a profile; no "score all listings" test is possible until profile data exists
- Background fetch before LLM integration — data extraction from Homegate's `__INITIAL_STATE__` must be proven before wiring it to Claude prompts; a broken parser produces hallucinated scores with no obvious error
- Backend parallel to extension phases 1-2 — EC2 proxy has no dependency on extension phases; teams can work in parallel; integration testing happens in Phase 3
- UX polish last — the core loop must work before investing in progressive disclosure and cache; polish on a broken pipeline is wasted effort

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Background Fetch):** Homegate's `window.__INITIAL_STATE__` JSON path structure for listing detail pages needs validation against a live Homegate fetch before writing the parser. The confirmed path is `data["listing"]["listing"]` but should be verified on current Homegate HTML.
- **Phase 3 (LLM Integration):** Prompt engineering for weighted multi-criteria evaluation with uncertainty signaling needs iteration. No prior research covers the specific prompt structure for Swiss property scoring — this requires empirical testing. Prompt caching implementation on `@anthropic-ai/sdk 0.78` should be verified against current SDK docs.
- **Phase 4 (UX Polish):** Score cache invalidation on profile change (profile hash key strategy) is well-understood but should be specified explicitly before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** WXT Shadow DOM setup, MutationObserver scoping, and `chrome.webNavigation.onHistoryStateUpdated` patterns are all well-documented in official Chrome and WXT docs. No novel patterns required.
- **Phase 2 (Onboarding/Storage):** WXT unlisted page entrypoints and `@wxt-dev/storage` usage are standard patterns with official documentation. Multi-step wizard state management is well-understood React local state.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WXT, Hono, React 19, Tailwind v4, `@anthropic-ai/sdk` all verified against official docs and current npm versions. Version compatibility table in STACK.md is reliable. |
| Features | MEDIUM | Core loop (badge injection, onboarding, LLM scoring) is well-validated. No direct competitor applies AI match scoring with weighted preferences to Swiss property portals — novel combination means some UX patterns are inferred from analogues (JobRight, Area360) rather than direct precedent. |
| Architecture | HIGH | All MV3 patterns verified against official Chrome documentation. Message-passing hub, Shadow DOM isolation, SPA navigation handling, and `chrome.storage.local` as the state persistence layer are the canonical MV3 approaches. Homegate `__INITIAL_STATE__` JSON structure verified via third-party scraping source (MEDIUM confidence on the exact JSON path). |
| Pitfalls | HIGH | All critical pitfalls verified against official Chrome docs (service worker lifecycle, messaging API, host_permissions). Anthropic rate limits verified against official Anthropic API docs. Homegate anti-bot behavior verified via scraping community sources (MEDIUM confidence — real-world headers may require adjustment). |

**Overall confidence:** HIGH

### Gaps to Address

- **Homegate `__INITIAL_STATE__` JSON exact path:** Confirmed by third-party scraping guide (`data["listing"]["listing"]` for detail pages) but should be validated with a live test fetch in Phase 2 before writing the parser.
- **Claude prompt structure for weighted scoring:** No template exists — prompt engineering for the multi-criteria weighted evaluation with uncertainty signaling and multilingual output needs empirical iteration in Phase 3. Allocate time for prompt iteration in the Phase 3 plan.
- **Homegate DOM selectors for listing cards:** Research identifies `[data-test="result-list"]` and `[data-test="result-list-item"]` as the selector targets, but these should be validated live before building the content script observer. Build a selector abstraction with fallbacks from Phase 1.
- **EC2 proxy authentication approach:** Research recommends a UUID shared secret generated at extension install time and sent as a header. The exact header name and validation logic needs to be specified during Phase 3 planning.
- **Anthropic Tier 1 rate limits for demo:** If the demo account is on Tier 1, upgrade to Tier 2 ($40 deposit) before demo day. Verify API account tier before Phase 3 testing begins.

## Sources

### Primary (HIGH confidence)
- [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — 30s idle termination, 5-minute task limit, event listener registration rules
- [Chrome Extension Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — `return true` async pattern, message channel closure behavior
- [Cross-Origin Network Requests in Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — host_permissions, content script CORS restrictions
- [chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) — SPA navigation detection
- [Claude API Rate Limits — Anthropic Official Docs](https://platform.claude.com/docs/en/api/rate-limits) — Tier 1: 50 RPM / 30K ITPM, Tier 2: 1,000 RPM / 450K ITPM
- [WXT Official Docs — wxt.dev](https://wxt.dev/) — entrypoints, content script UI modes (Shadow DOM), storage API, version 0.20.18
- [Hono Official Docs](https://hono.dev/docs/getting-started/nodejs) — Node.js adapter, CORS middleware, streaming
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — streaming, prompt caching, Node.js usage

### Secondary (MEDIUM confidence)
- [How to Scrape Homegate.ch Real Estate — Scrapfly](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) — `window.__INITIAL_STATE__` JSON structure and path on Homegate listing pages
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) — Plasmo maintenance status, WXT vs competitors
- [Making Chrome Extension Smart for SPA — Medium](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8) — SPA navigation handling patterns
- [Solving CSS Interference in Chrome Extensions — DEV Community](https://dev.to/developertom01/solving-css-and-javascript-interference-in-chrome-extensions-a-guide-to-react-shadow-dom-and-best-practices-9l) — Shadow DOM isolation for injected UI
- [Managing Concurrency in Chrome Extensions — Taboola](https://www.taboola.com/engineering/managing-concurrency-in-chrome-extensions/) — concurrent fetch patterns in service workers
- [JobRight.ai Chrome Extension](https://chromewebstore.google.com/detail/jobright-autofill/odcnpipkhjegpefkfplmedhmkmmhmoko) — match score badge UX model
- [Hackers Target Misconfigured LLM Proxies — BleepingComputer](https://www.bleepingcomputer.com/news/security/hackers-target-misconfigured-proxies-to-access-paid-llm-services/) — proxy authentication requirements

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
