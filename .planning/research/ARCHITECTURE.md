# Architecture Research

**Domain:** Chrome Extension (Manifest V3) with LLM backend proxy
**Researched:** 2026-03-07
**Confidence:** HIGH (Chrome MV3 official docs + verified patterns)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Chrome MV3)                          │
│                                                                      │
│  ┌──────────────────┐      ┌──────────────────────────────────────┐  │
│  │  Content Script  │      │      Background Service Worker       │  │
│  │  (homegate.cs)   │◄────►│      (background.js)                 │  │
│  │                  │  msg │                                      │  │
│  │  - DOM observer  │      │  - Receives scan requests            │  │
│  │  - Badge inject  │      │  - fetch() listing detail pages      │  │
│  │  - Shadow DOM UI │      │  - fetch() EC2 backend               │  │
│  │  - SPA nav watch │      │  - chrome.storage read/write         │  │
│  └────────┬─────────┘      └──────────────┬───────────────────────┘  │
│           │                               │                          │
│  ┌────────┴─────────┐      ┌──────────────┴───────────────────────┐  │
│  │  Popup UI        │      │      Extension Pages                  │  │
│  │  (popup.html)    │      │      (onboarding.html, options.html)  │  │
│  │  - Toggle on/off │      │      - Full-page preference wizard    │  │
│  │  - Profile summary│     │      - Weight configuration           │  │
│  │  - Edit link     │      │      - Stored to chrome.storage.local │  │
│  └──────────────────┘      └──────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                  chrome.storage.local                         │    │
│  │  { userProfile, weights, scoreCache, extensionEnabled }       │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
         │  HTTPS fetch (host_permissions declared)
         ▼
┌─────────────────────────────────────────┐
│         EC2 Backend (Node.js/Express)    │
│                                         │
│  POST /score                            │
│  - Validates request                    │
│  - Proxies to Claude API                │
│  - Returns scored analysis JSON         │
│                                         │
│  CORS: Allow chrome-extension:// origin │
└─────────────────────────────────────────┘
         │  HTTPS
         ▼
┌─────────────────────────────────────────┐
│         Anthropic Claude API            │
│  - API key stored server-side only      │
│  - claude-3-5-sonnet (recommended)      │
└─────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Content Script | DOM observation, badge injection, SPA nav detection, Shadow DOM UI rendering | Vanilla JS, MutationObserver, Shadow DOM |
| Background Service Worker | HTTP fetching (listings + backend), message broker, chrome.storage I/O | Vanilla JS, fetch(), chrome.runtime |
| Popup | Toggle enable/disable, show profile summary, link to onboarding | Simple HTML + chrome.storage.local reads |
| Onboarding Page | Full preference wizard (location, budget, rooms, features, weights) | React or Vanilla JS, chrome.storage.local writes |
| EC2 Backend | LLM proxy, API key security, request validation | Node.js + Express, Anthropic SDK |
| chrome.storage.local | User profile, weights, per-listing score cache, extension enabled flag | Chrome API — survives SW termination |

## Recommended Project Structure

```
extension/
├── manifest.json               # MV3 manifest
├── background/
│   └── service-worker.js       # Background service worker (single file)
├── content/
│   ├── homegate-content.js     # Main content script for Homegate
│   ├── badge-ui.js             # Shadow DOM badge component
│   └── homegate-content.css    # Scoped styles (injected into shadow root)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── onboarding/
│   ├── onboarding.html         # Full-page wizard (opened as chrome tab)
│   ├── onboarding.js
│   └── onboarding.css
├── shared/
│   ├── storage.js              # Typed wrappers for chrome.storage.local
│   ├── messages.js             # Message type constants (avoids string typos)
│   └── profile-schema.js       # UserProfile shape, default values
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png

backend/
├── server.js                   # Express app entry point
├── routes/
│   └── score.js                # POST /score handler
├── lib/
│   └── claude.js               # Anthropic SDK wrapper
└── package.json
```

### Structure Rationale

- **background/**: Single service-worker.js keeps all SW logic in one file — easier to reason about lifecycle, avoids import ordering issues
- **content/**: Separate files for DOM logic vs UI component — content script registers observer, badge-ui handles rendering independently
- **shared/**: Message type constants prevent content-script ↔ SW communication bugs from string typos; storage wrappers enforce schema
- **onboarding/**: Deliberately separate from popup — opened as a full Chrome tab via `chrome.tabs.create({ url: 'onboarding/onboarding.html' })`

## Architectural Patterns

### Pattern 1: Message-Passing Hub (Content Script → Service Worker → Backend)

**What:** Content script never calls external APIs directly. All outbound fetches go through the service worker. Content script sends messages and waits for scored responses.

**When to use:** Always — content scripts cannot access chrome APIs that require host_permissions for cross-origin fetches.

**Trade-offs:** Adds one async hop but is the only compliant MV3 pattern. The service worker acts as the sole network authority.

**Example:**
```javascript
// content/homegate-content.js
async function requestScore(listingId, listingUrl) {
  const response = await chrome.runtime.sendMessage({
    type: MSG.SCORE_LISTING,
    listingId,
    listingUrl
  });
  renderBadge(listingId, response.score, response.analysis);
}

// background/service-worker.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === MSG.SCORE_LISTING) {
    handleScoreListing(msg.listingId, msg.listingUrl)
      .then(sendResponse);
    return true; // Keep channel open for async response
  }
});
```

### Pattern 2: Progressive Badge Rendering

**What:** Content script injects a "pending" spinner badge immediately for each visible listing card. When the service worker returns a score, the content script updates that specific badge in place.

**When to use:** User is on Homegate search results page. Listings appear immediately; scoring takes 2-5 seconds per listing.

**Trade-offs:** Requires the content script to maintain a Map of `listingId → badgeElement` to update in place. Avoids blank space or layout shifts.

**Example:**
```javascript
// content/homegate-content.js
const pendingBadges = new Map(); // listingId → DOM node

function injectPendingBadge(card, listingId) {
  const badge = createBadgeElement('pending');
  card.appendChild(badge);
  pendingBadges.set(listingId, badge);
  requestScore(listingId, listingUrl);
}

function onScoreReceived(listingId, score, analysis) {
  const badge = pendingBadges.get(listingId);
  if (badge) updateBadge(badge, score, analysis);
}
```

### Pattern 3: Shadow DOM Badge Isolation

**What:** Each injected badge lives inside an `attachShadow({ mode: 'closed' })` container to prevent Homegate's CSS from affecting extension UI.

**When to use:** Always for injected UI on third-party pages. Homegate's CSS will bleed into any non-isolated element.

**Trade-offs:** Slightly more DOM setup. Cannot be styled by page CSS (feature, not bug). Keeps extension UI pixel-perfect across Homegate's DE/FR/IT locale variants.

**Example:**
```javascript
function createBadgeHost(card) {
  const host = document.createElement('div');
  host.classList.add('homematch-badge-host');
  const shadow = host.attachShadow({ mode: 'closed' });

  // Load extension CSS into shadow root (not page)
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = chrome.runtime.getURL('content/homegate-content.css');
  shadow.appendChild(style);

  card.appendChild(host);
  return shadow;
}
```

### Pattern 4: MutationObserver + webNavigation for SPA Navigation

**What:** Homegate is a SPA. Initial content script injection handles the first page load. `MutationObserver` catches new listing cards added to the DOM (pagination, filter changes). `chrome.webNavigation.onHistoryStateUpdated` in the service worker detects full SPA navigations and re-injects the content script if needed.

**When to use:** Any SPA target site where URL changes happen without full page reload.

**Trade-offs:** MutationObserver has performance cost — scope it narrowly to the results list container, not `document.body`.

**Example:**
```javascript
// content/homegate-content.js
const resultsContainer = document.querySelector('[data-test="result-list"]');
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.matches?.('[data-test="result-list-item"]')) {
        processListingCard(node);
      }
    }
  }
});
observer.observe(resultsContainer, { childList: true, subtree: false });

// background/service-worker.js — re-inject on SPA nav
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url.includes('homegate.ch') && details.url.includes('matching-list')) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ['content/homegate-content.js']
    });
  }
}, { url: [{ hostContains: 'homegate.ch' }] });
```

### Pattern 5: chrome.storage.local as State Persistence Layer

**What:** Service workers are terminated after 30s of inactivity. All state that must survive termination — user profile, weights, per-listing score cache — goes into `chrome.storage.local`. Variables in service-worker.js memory are considered ephemeral.

**When to use:** Any data that must be available across service worker activations.

**Trade-offs:** Async reads add latency on first access. Use an in-memory cache within a single SW activation cycle but always persist writes.

**Example:**
```javascript
// shared/storage.js
export async function getUserProfile() {
  const { userProfile } = await chrome.storage.local.get('userProfile');
  return userProfile ?? DEFAULT_PROFILE;
}

export async function cacheScore(listingId, score) {
  const { scoreCache = {} } = await chrome.storage.local.get('scoreCache');
  scoreCache[listingId] = { score, cachedAt: Date.now() };
  await chrome.storage.local.set({ scoreCache });
}
```

## Data Flow

### Primary Flow: Score a Listing

```
User loads Homegate search results
    ↓
Content Script runs (document_idle)
    ↓
MutationObserver detects listing cards
    ↓ (for each card)
Content Script extracts listingId + URL from DOM / window.__INITIAL_STATE__
    ↓
Content Script injects "pending" badge (Shadow DOM)
    ↓
Content Script: chrome.runtime.sendMessage({ type: SCORE_LISTING, listingId, listingUrl })
    ↓
Service Worker receives message
    ↓
Service Worker reads userProfile from chrome.storage.local
    ↓
Service Worker checks scoreCache — cache hit? → return cached score immediately
    ↓ (cache miss)
Service Worker fetch() listing detail page HTML (Homegate URL)
    ↓
Service Worker parses listing data from __INITIAL_STATE__ JSON
    ↓
Service Worker POST /score to EC2 backend { listing, userProfile, weights }
    ↓
EC2 Backend calls Claude API, returns { score, analysis, categories }
    ↓
Service Worker writes score to scoreCache in chrome.storage.local
    ↓
Service Worker sendResponse({ score, analysis }) back to content script
    ↓
Content Script updates badge from "pending" → score percentage + label
    ↓
User clicks badge → expandable analysis panel opens (in Shadow DOM)
```

### SPA Navigation Flow

```
User changes filter / navigates to next page on Homegate
    ↓
Homegate SPA calls history.pushState()
    ↓
Service Worker: webNavigation.onHistoryStateUpdated fires
    ↓
Service Worker: chrome.scripting.executeScript re-injects content script
    ↓
Content Script runs again, re-observes new results list
    ↓
[Back to Primary Flow above]
```

### Profile Setup Flow

```
User installs extension
    ↓
background: chrome.runtime.onInstalled opens onboarding.html as new tab
    ↓
User completes preference wizard
    ↓
Onboarding page: chrome.storage.local.set({ userProfile, weights })
    ↓
Onboarding page: chrome.tabs.update to close/redirect
```

### State Management

```
chrome.storage.local (persistent across SW terminations)
    ├── userProfile: { location, budget, rooms, area, features, customInterests }
    ├── weights: { location: 0.3, price: 0.3, size: 0.2, features: 0.1, custom: 0.1 }
    ├── scoreCache: { [listingId]: { score, analysis, cachedAt } }
    └── extensionEnabled: boolean

In-memory (within single SW activation — ephemeral)
    └── activeRequests: Map<listingId, Promise> — dedup concurrent score requests
```

## MV3-Specific Constraints

### Constraint 1: Service Worker Termination (30s idle)

**Impact:** Service worker can be killed between user interactions. Any in-memory request queue is lost.

**Mitigation:**
- Persist all meaningful state to `chrome.storage.local`
- Active fetch() requests keep the SW alive (up to 5 min per request)
- Calling chrome.storage API resets the 30s idle timer
- Do NOT use `setTimeout` or `setInterval` for keep-alive — use `chrome.alarms` if needed

### Constraint 2: No DOM Access in Service Worker

**Impact:** Cannot parse HTML in the service worker directly without a DOM parser.

**Mitigation:** Use `DOMParser` (available in service workers) or extract JSON from `__INITIAL_STATE__` script tags via regex/string search. Avoid heavyweight HTML parsing libraries.

```javascript
// Parse Homegate __INITIAL_STATE__ from fetched HTML
async function parseListingFromHtml(html) {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})<\/script>/s);
  if (match) return JSON.parse(match[1]);
  // Fallback: DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // ... extract from DOM
}
```

### Constraint 3: Content Script Isolated World

**Impact:** Content script cannot access page's JavaScript variables directly (e.g., `window.__INITIAL_STATE__` if set after load).

**Mitigation:** Read `__INITIAL_STATE__` from script tags via `document.querySelector('script')` text content parsing, which is DOM access (allowed). No need to run in MAIN world for this.

### Constraint 4: sendResponse Must Be Synchronous or Return True

**Impact:** If service worker listener is async, sendResponse may not work unless `return true` is explicitly returned from the listener.

**Mitigation:** Always `return true` from `onMessage.addListener` when response is async. Avoid `async` as the listener function directly — wrap inner logic in async IIFE.

```javascript
// Correct MV3 async response pattern
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === MSG.SCORE_LISTING) {
    (async () => {
      const result = await handleScore(msg);
      sendResponse(result);
    })();
    return true; // critical — keeps channel open
  }
});
```

### Constraint 5: localStorage Unavailable in Service Worker

**Impact:** Cannot use `localStorage` or `sessionStorage` in background.js.

**Mitigation:** Use `chrome.storage.local` exclusively. `chrome.storage.session` (cleared on browser restart) is available for session-scoped state.

### Constraint 6: No Persistent Background Pages

**Impact:** Unlike MV2 background pages, MV3 service workers cannot maintain WebSocket connections or persistent timers.

**Mitigation:** For this project, not needed. All communication is request/response. Scoring is triggered by content script messages, not background polling.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Homegate.ch listing pages | Service worker `fetch()` with `host_permissions` declared | Parse `__INITIAL_STATE__` JSON from HTML. No auth needed for public listings. |
| EC2 Backend (`/score`) | Service worker `POST` with JSON body | Add `Authorization` header or shared secret. EC2 must allow extension origin in CORS headers. |
| Anthropic Claude API | Backend-only (not from extension) | API key never leaves server. Use `claude-3-5-sonnet-20241022`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Content Script → Service Worker | `chrome.runtime.sendMessage()` / `return true` async pattern | Content script is untrusted — validate `sender.url` in SW |
| Service Worker → Content Script | `sendResponse()` callback (same message channel) | Use long-lived port (`chrome.tabs.connect`) if streaming scores in future |
| Popup → chrome.storage | Direct `chrome.storage.local.get/set` | Popup has direct storage access, no need to message SW |
| Onboarding Page → chrome.storage | Direct `chrome.storage.local.set` on wizard completion | Fire `chrome.runtime.sendMessage({ type: PROFILE_UPDATED })` after save so content script refreshes |
| Service Worker → chrome.storage | Read profile on each score request; write cache after scoring | In-memory dedup Map prevents duplicate concurrent requests for same listing |

### EC2 Backend CORS Configuration

The EC2 backend must explicitly allow the Chrome extension origin. The extension origin is `chrome-extension://<EXTENSION_ID>`. For development and production, configure:

```javascript
// backend/server.js
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

Note: Anthropic's API now supports `anthropic-dangerous-direct-browser-access: true` header for direct browser access, but for this project the EC2 proxy is still preferred to keep the API key out of the extension bundle.

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "HomeMatch",
  "version": "1.0.0",
  "description": "AI match scores on Homegate.ch listings",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "webNavigation"
  ],
  "host_permissions": [
    "https://www.homegate.ch/*",
    "https://<EC2-HOST>/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.homegate.ch/*matching-list*"],
      "js": ["content/homegate-content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "48": "icons/icon48.png" }
  },
  "web_accessible_resources": [
    {
      "resources": ["content/homegate-content.css", "icons/*"],
      "matches": ["https://www.homegate.ch/*"]
    }
  ]
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (hackathon demo) | Current architecture as described — no changes needed |
| 100 users | Add simple rate limiting on EC2 `/score` endpoint (token bucket per IP). Score cache already helps. |
| 10k users | EC2 auto-scaling group behind ALB. Consider Redis for shared score cache (currently per-user in extension storage). |
| 100k+ users | Separate scoring queue (SQS + Lambda). Per-user cache moves server-side with user accounts. Out of scope for v1. |

### Scaling Priorities

1. **First bottleneck:** EC2 cost from LLM API calls per listing per user. Mitigation: `chrome.storage.local` score cache with TTL (scores valid for 24h, listings don't change often).
2. **Second bottleneck:** Homegate rate limiting extension's fetch requests for detail pages. Mitigation: add 200-500ms delay between fetches per tab, respect `Retry-After` headers.

## Anti-Patterns

### Anti-Pattern 1: Keeping State in Service Worker Variables

**What people do:** `let userProfile = null;` at top of service-worker.js, loaded once on startup.

**Why it's wrong:** Service worker is terminated after 30s of idle. Next activation starts fresh — `userProfile` is null. Extension breaks silently.

**Do this instead:** Always read from `chrome.storage.local` at the start of each message handler. Use a local variable as a within-activation cache if needed, but always re-read on new activations.

### Anti-Pattern 2: Injecting Styles Without Shadow DOM

**What people do:** Append `<style>` or `<link>` tags directly to Homegate's `<head>` or `<body>`.

**Why it's wrong:** Homegate's CSS (including their component library classes) will bleed into extension UI. Extension UI will look broken after any Homegate CSS update.

**Do this instead:** Always create Shadow DOM roots for injected UI. Load extension CSS inside the shadow root via `chrome.runtime.getURL()`.

### Anti-Pattern 3: Making Cross-Origin Requests from Content Script

**What people do:** `fetch('https://ec2-host/score', ...)` directly from the content script.

**Why it's wrong:** Content scripts are subject to Homegate's Content Security Policy. Cross-origin fetches from content scripts are blocked by CSP regardless of extension host_permissions.

**Do this instead:** Send a message to the service worker. Service worker makes all external fetches. Content script only manipulates DOM.

### Anti-Pattern 4: Async Function as onMessage Listener

**What people do:**
```javascript
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const result = await doWork();
  sendResponse(result); // TOO LATE — channel already closed
});
```

**Why it's wrong:** An async function immediately returns a Promise (not `true`). Chrome closes the message channel before the async work finishes. `sendResponse` is called on a closed channel and silently fails.

**Do this instead:** Return `true` synchronously, run async work in an inner IIFE:
```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const result = await doWork();
    sendResponse(result);
  })();
  return true;
});
```

### Anti-Pattern 5: Observing document.body for Listing Card Changes

**What people do:** `observer.observe(document.body, { childList: true, subtree: true })` to catch new cards.

**Why it's wrong:** Homegate is a React SPA that makes frequent DOM updates. Observing the entire body with `subtree: true` fires the callback hundreds of times per second during navigation, causing severe performance degradation.

**Do this instead:** Scope the observer to the results list container: `observer.observe(resultsContainer, { childList: true, subtree: false })`. Only observe direct children of the list.

## Build Order (Dependency Graph)

Based on component dependencies, build in this order:

```
1. shared/messages.js + shared/storage.js   ← no deps, used by everything
2. manifest.json                             ← defines all entry points
3. background/service-worker.js             ← needs messages.js, storage.js
4. onboarding/ (wizard + storage writes)    ← needs storage.js; user can't score without profile
5. content/badge-ui.js (Shadow DOM badge)   ← isolated UI component
6. content/homegate-content.js             ← needs badge-ui.js, messages.js
7. popup/popup.html + popup.js             ← reads storage, links to onboarding
8. backend/server.js + routes/score.js     ← parallel to extension work
```

**Rationale:**
- Shared utilities first — everything else imports them
- Service worker before content script — content script messages won't be handled otherwise
- Onboarding before content script goes live — content script needs a valid profile to send with score requests
- Backend can be built in parallel with extension but must be deployed before end-to-end testing

## Sources

- [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — HIGH confidence (official docs)
- [Longer Extension Service Worker Lifetimes](https://developer.chrome.com/blog/longer-esw-lifetimes) — HIGH confidence (official blog)
- [Chrome Extension Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — HIGH confidence (official docs)
- [Cross-Origin Network Requests in Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — HIGH confidence (official docs)
- [chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) — HIGH confidence (official docs)
- [Homegate.ch Data Structure](https://scrapfly.io/blog/posts/how-to-scrape-homegate-ch-real-estate-property-data) — MEDIUM confidence (third-party scraping guide, verified `__INITIAL_STATE__` pattern and URL structure)
- [Making Chrome Extension Smart for SPA](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8) — MEDIUM confidence (community article)

---
*Architecture research for: HomeMatch Chrome Extension (MV3)*
*Researched: 2026-03-07*
