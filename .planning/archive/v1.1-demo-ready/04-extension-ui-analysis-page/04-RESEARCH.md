# Phase 4: Extension UI & Analysis Page - Research

**Researched:** 2026-03-11
**Domain:** Chrome Extension Content Script UI (WXT + React + Shadow DOM), Next.js Analysis Page, Supabase Auth in Extensions, Claude Vision API
**Confidence:** HIGH

## Summary

Phase 4 is the user-facing layer connecting the scoring pipeline (Phase 3) to visible UI. It spans three domains: (1) a Chrome extension content script that injects score badges and summary panels into Flatfox.ch search results pages, (2) a Next.js full analysis page that displays detailed scoring breakdowns, and (3) a backend enhancement adding listing image analysis to the Claude scoring prompt.

The extension content script must handle a JavaScript-rendered SPA (Flatfox search results are not server-rendered) using MutationObserver to detect dynamically loaded listing cards. Listing PKs are extractable from `<a href="/en/flat/{slug}/{pk}/">` link patterns in the rendered DOM. Score badges and panels must use Shadow DOM for style isolation from Flatfox's CSS. The extension needs Supabase auth integration to get JWT tokens for edge function API calls.

The website analysis page is straightforward server-side rendered Next.js with Supabase SSR -- it reads the `analyses` table by listing ID and renders the stored `ScoreResponse` breakdown. The image analysis backend enhancement adds URL-based image content blocks to the Claude API prompt, using image URLs fetched from the Flatfox listing detail page (the API only returns integer image IDs, not URLs).

**Primary recommendation:** Build three parallel work streams: (1) extension content script with FAB + badges + summary panels, (2) Next.js analysis page, (3) backend image analysis enhancement. Use WXT's `createShadowRootUi` with `cssInjectionMode: 'ui'` for all injected extension UI. Use `chrome.runtime.sendMessage` pattern for auth token flow between popup/content script and background script.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Content script MUST match `*://*.flatfox.ch/*` (NOT homegate.ch)
- Extract listing IDs from Flatfox search results DOM
- Floating action button (FAB) triggers scoring for visible listings
- Score badges injected next to each listing in Shadow DOM (style isolation)
- Color palette should be modern/attractive, NOT traffic light green/yellow/red
- match_tier from ScoreResponse determines color: excellent/good/fair/poor
- Extension calls Supabase edge function `score-proxy` with JWT Bearer token
- Extension does NOT call EC2 directly
- Extension (simple): overall_score, match_tier, summary_bullets -- badge + expandable panel
- Website (extensive): Full categories breakdown with per-category reasoning, checklist items, all bullets -- dedicated analysis page
- Current popup needs to switch to Supabase auth -- show login state, link to preferences website
- "Edit Preferences" should open the Next.js website, not the onboarding wizard
- Flatfox API returns image URLs in listing data (NOTE: actually returns integer IDs -- image URLs must be fetched from listing detail page HTML)
- Pass listing images to Claude as image content blocks alongside text
- Separate plan (04-03) to avoid blocking the core extension work

### Claude's Discretion
- Badge color palette specifics (modern/attractive, not traffic light)
- Content script DOM observation strategy
- Shadow DOM component structure
- Loading state UI design
- Analysis page layout and component structure

### Deferred Ideas (OUT OF SCOPE)
- Prefilter routing for Flatfox (load Flatfox with user's filters pre-applied) -- nice to have
- Batch scoring optimization (score multiple listings in parallel)
- Score caching (don't re-score same listing if preferences haven't changed)
- Extension badge animations / transitions
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-01 | Chrome extension activates on Flatfox.ch search results pages | WXT content script with `matches: ['*://*.flatfox.ch/*']` + `wxt:locationchange` listener for SPA navigation |
| EXT-02 | Floating action button appears on Flatfox search results for on-demand scoring | `createShadowRootUi` with `position: 'overlay'` anchored to body, FAB button component |
| EXT-03 | Extension extracts listing IDs from Flatfox search results DOM | Extract PKs from `<a href="/en/flat/{slug}/{pk}/">` patterns via regex on link hrefs |
| EXT-04 | Score badges (0-100 + match label) injected next to each listing after scoring | `createShadowRootUi` with `position: 'inline'` anchored next to each listing card |
| EXT-05 | Clicking a badge expands a 3-5 bullet summary panel with key match/mismatch points | Expandable panel component in Shadow DOM, renders `summary_bullets` from ScoreResponse |
| EXT-06 | Summary panel includes "See full analysis" button linking to the website | Link to `${WEBSITE_URL}/analysis/${listingId}` opens in new tab |
| EXT-07 | Extension popup shows login form, profile summary, and link to preferences website | Replace existing Dashboard.tsx with Supabase auth flow via background script message passing |
| EXT-08 | Loading state shown while scores are being computed | Skeleton/spinner in badge placeholder, loading overlay on FAB |
| WEB-01 | Full analysis page on Next.js site for each scored listing | `web/src/app/analysis/[listingId]/page.tsx` server component reading from Supabase |
| WEB-02 | Analysis page shows category breakdown with weights, bullet-point reasoning, and listing citations | Render `categories`, `checklist`, `summary_bullets` from stored `ScoreResponse` breakdown JSONB |
| WEB-03 | Analysis results stored in Supabase for retrieval by website | Already implemented in Phase 3 `save_analysis` -- reads from `analyses` table |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | ^0.20.18 | Extension framework (Manifest V3) | Already installed, handles content script lifecycle |
| React | ^19.2.4 (ext) / 19.2.3 (web) | UI framework | Already used in both extension and website |
| @supabase/supabase-js | ^2.99.0 | Supabase client for auth + DB | Already in web, needs adding to extension |
| Tailwind CSS | ^3.4.19 (ext) / ^4 (web) | Styling | Already configured in both projects |
| shadcn/ui + Radix | Various | UI components | Already in extension with Radix primitives |
| lucide-react | ^0.577.0 | Icons | Already installed |
| Next.js | 16.1.6 | Website framework | Already deployed on Vercel |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client | Already in web for SSR auth |

### Supporting (Need to Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.99.0 | Auth in extension | Add to extension package.json for popup auth + JWT retrieval |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shadow DOM injection | createIntegratedUi | No style isolation -- Flatfox CSS would break our badges |
| MutationObserver | Polling with setInterval | MutationObserver is more efficient and standard |
| Background script auth | Content script auth | Background script is more reliable for token persistence across page navigations |

**Installation (extension only):**
```bash
cd extension && pnpm add @supabase/supabase-js
```

## Architecture Patterns

### Recommended Project Structure (Extension Changes)
```
extension/src/
  entrypoints/
    content.ts                     # DELETE -- replaced by directory
    content/                       # NEW -- content script as directory for UI
      index.tsx                    # Main content script entry with createShadowRootUi
      style.css                    # Tailwind CSS for shadow DOM injection
      App.tsx                      # Root React component for content script UI
      components/
        Fab.tsx                    # Floating action button
        ScoreBadge.tsx             # Score badge (0-100 + match tier color)
        SummaryPanel.tsx           # Expandable 3-5 bullet summary
        LoadingSkeleton.tsx        # Loading placeholder
    background.ts                  # UPDATE -- add Supabase auth + message handling
    popup/
      App.tsx                      # UPDATE -- switch to Supabase auth popup
  components/
    popup/
      Dashboard.tsx                # REWRITE -- Supabase auth state, not local storage
      LoginForm.tsx                # NEW -- email/password login form
  lib/
    supabase.ts                    # NEW -- Supabase client for extension
    api.ts                         # NEW -- edge function API client
    flatfox.ts                     # NEW -- Flatfox DOM parser utilities
  types/
    scoring.ts                     # NEW -- TypeScript types matching ScoreResponse
```

### Recommended Project Structure (Website Changes)
```
web/src/app/
  analysis/
    [listingId]/
      page.tsx                     # NEW -- full analysis page (server component)
      loading.tsx                  # NEW -- loading state
  components/
    analysis/
      CategoryBreakdown.tsx        # NEW -- per-category score + reasoning
      ChecklistSection.tsx         # NEW -- soft criteria evaluation
      ScoreHeader.tsx              # NEW -- overall score + match tier hero
      BulletSummary.tsx            # NEW -- summary bullets section
```

### Pattern 1: WXT Content Script with Shadow DOM UI
**What:** Content script that injects isolated React UI into Flatfox pages
**When to use:** All extension-injected UI (FAB, badges, summary panels)
**Example:**
```typescript
// Source: WXT docs - https://wxt.dev/guide/key-concepts/content-script-ui.html
import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';

export default defineContentScript({
  matches: ['*://*.flatfox.ch/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // FAB overlay -- always visible
    const fab = await createShadowRootUi(ctx, {
      name: 'homematch-fab',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const el = document.createElement('div');
        container.append(el);
        const root = ReactDOM.createRoot(el);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    fab.mount();
  },
});
```

### Pattern 2: Supabase Auth in Extension via Background Script
**What:** Background script manages Supabase auth, popup/content script communicate via messages
**When to use:** All auth operations in the extension
**Example:**
```typescript
// background.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'signIn') {
    supabase.auth.signInWithPassword(msg.value)
      .then(({ data, error }) => sendResponse({ data, error }));
    return true; // async response
  }
  if (msg.action === 'getSession') {
    supabase.auth.getSession()
      .then(({ data }) => sendResponse({ session: data.session }));
    return true;
  }
});

// In popup or content script:
const { session } = await browser.runtime.sendMessage({ action: 'getSession' });
const jwt = session?.access_token;
```

### Pattern 3: Flatfox Listing PK Extraction
**What:** Extract listing primary keys from dynamically rendered Flatfox search DOM
**When to use:** When FAB is clicked, scan visible listings
**Example:**
```typescript
// Flatfox listing URLs follow: /en/flat/{slug}/{pk}/
// or /de/flat/{slug}/{pk}/ etc.
function extractListingPKs(): number[] {
  const links = document.querySelectorAll('a[href*="/flat/"]');
  const pks = new Set<number>();
  for (const link of links) {
    const href = (link as HTMLAnchorElement).href;
    const match = href.match(/\/flat\/[^/]+\/(\d+)\/?/);
    if (match) pks.add(parseInt(match[1], 10));
  }
  return Array.from(pks);
}
```

### Pattern 4: Edge Function API Call with JWT
**What:** Extension sends scoring request through Supabase edge function
**When to use:** When user clicks FAB to score listings
**Example:**
```typescript
const EDGE_FUNCTION_URL = 'https://mlhtozdtiorkemamzjjc.supabase.co/functions/v1/score-proxy';

async function scoreListings(listingIds: number[], jwt: string): Promise<ScoreResponse[]> {
  const results = await Promise.all(
    listingIds.map(async (id) => {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ listing_id: id }),
      });
      if (!res.ok) throw new Error(`Score failed for ${id}: ${res.status}`);
      return res.json() as Promise<ScoreResponse>;
    })
  );
  return results;
}
```

### Pattern 5: Next.js Analysis Page (Server Component)
**What:** Server-rendered analysis page reading from Supabase
**When to use:** Full analysis view at `/analysis/[listingId]`
**Example:**
```typescript
// web/src/app/analysis/[listingId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .single();

  if (!data) return <NotFound />;

  const breakdown = data.breakdown; // Full ScoreResponse JSONB
  return <AnalysisView analysis={breakdown} />;
}
```

### Anti-Patterns to Avoid
- **Using createIntegratedUi for badges:** Flatfox CSS will break styling. Always use createShadowRootUi with style isolation.
- **Initializing Supabase client in content script:** Content scripts reload on navigation. Keep auth state in background script.
- **Using rem units in Shadow DOM CSS:** rem resolves relative to the host page's root font size, not the shadow root. Use px or CSS custom properties instead.
- **Polling for DOM changes:** Use MutationObserver instead of setInterval to detect when Flatfox renders listing cards.
- **Calling EC2 backend directly from extension:** Always go through the edge function for auth validation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shadow DOM encapsulation | Manual `attachShadow()` + style injection | WXT `createShadowRootUi` | Handles CSS bundling, lifecycle, cleanup, HMR automatically |
| Extension message passing | Custom event system | `browser.runtime.sendMessage` / `onMessage` | Standard API, works across popup/background/content |
| Auth token refresh | Manual token refresh timer | Supabase JS client `onAuthStateChange` | Handles token refresh, expiry, storage automatically |
| Content script cleanup | Manual DOM removal on unload | WXT context `ctx` with `onRemove` | Prevents "Extension context invalidated" errors |
| URL change detection in SPA | Manual popstate/pushState interception | WXT `wxt:locationchange` event | Framework handles all history API methods |

**Key insight:** WXT provides first-class abstractions for all the tricky Chrome extension patterns (Shadow DOM, SPA navigation, context invalidation). Using raw Chrome APIs would mean reimplementing significant error-prone boilerplate.

## Common Pitfalls

### Pitfall 1: Flatfox Search Page is a JavaScript SPA
**What goes wrong:** Content script runs on page load but Flatfox search results are rendered client-side by JavaScript after the initial HTML loads. `document.querySelectorAll('a[href*="/flat/"]')` returns nothing on DOMContentLoaded.
**Why it happens:** Flatfox uses a JS widget system (`ffbl('call', 'search.render', ...)`) that renders listing cards asynchronously.
**How to avoid:** Use MutationObserver on `document.body` (or `#flat-search-widget` if it exists) to detect when listing anchor elements appear. WXT's `autoMount()` can also help.
**Warning signs:** Extension loads but finds no listings to score.

### Pitfall 2: Flatfox API Returns Image IDs, Not URLs
**What goes wrong:** The `FlatfoxListing.images` field contains integer IDs like `[9782495, 9782496]`, not image URLs. There is no public API endpoint to convert these IDs to URLs.
**Why it happens:** Flatfox uses signed `/thumb/` URLs with signature parameters that are generated server-side and embedded in the listing detail page HTML, but not exposed via the JSON API.
**How to avoid:** For image analysis, the backend must fetch the listing detail HTML page at `https://flatfox.ch/en/flat/{slug}/{pk}/` and extract image URLs from `<img>` srcset attributes or og:image meta tags. Alternatively, use the OG image as a single representative image (simpler but less comprehensive).
**Warning signs:** Passing integer IDs to Claude as URLs will fail.

### Pitfall 3: rem Units in Shadow DOM
**What goes wrong:** shadcn/ui and Tailwind CSS use `rem` units extensively. In Shadow DOM, `rem` is relative to the host page's root `<html>` font-size, not the shadow root's font-size.
**Why it happens:** CSS specification defines rem relative to the document root, which Shadow DOM does not override.
**How to avoid:** Either set a known font-size on the shadow root container element, or use a Tailwind plugin/config that converts rem to px. For this hackathon, setting `font-size: 16px` on the shadow root container element is the simplest fix.
**Warning signs:** Text and spacing appear too large or too small in badges/panels.

### Pitfall 4: Extension Context Invalidation
**What goes wrong:** After extension update or reload during development, content scripts continue running but their context is invalid. Calls to `browser.runtime.sendMessage` throw "Extension context invalidated" errors.
**Why it happens:** Manifest V3 service workers restart independently of content scripts.
**How to avoid:** Use WXT's `ctx` object for all timers, event listeners, and async operations. The context automatically handles invalidation cleanup.
**Warning signs:** Console errors about "Extension context invalidated" after extension hot-reload.

### Pitfall 5: CORS with Edge Function
**What goes wrong:** Content script fetch to edge function blocked by CORS.
**Why it happens:** Content scripts run in the page's origin context by default.
**How to avoid:** The edge function already has `Access-Control-Allow-Origin: *` CORS headers. Ensure the extension manifest includes `host_permissions` for the Supabase domain. Alternatively, route API calls through the background script which has no CORS restrictions.
**Warning signs:** Network tab shows CORS preflight failures.

### Pitfall 6: Supabase Auth Session in Extension
**What goes wrong:** Supabase JS client uses `localStorage` by default, which is not available in service workers (background script in MV3).
**Why it happens:** Manifest V3 background scripts are service workers without DOM APIs.
**How to avoid:** Initialize Supabase client with a custom storage adapter that wraps `chrome.storage.local`. Or keep the Supabase client in the popup (which has localStorage) and use message passing to relay session to background/content scripts.
**Warning signs:** Auth state lost after browser restart or background script restart.

## Code Examples

### Flatfox Listing PK Extraction from Rendered DOM
```typescript
// Source: Verified against live Flatfox search page (2026-03-11)
// Flatfox listing URLs: /en/flat/{slug}/{pk}/ or /de/flat/{slug}/{pk}/ etc.
// The {pk} is always the last numeric segment before trailing slash

function extractVisibleListingPKs(): number[] {
  const links = document.querySelectorAll('a[href*="/flat/"]');
  const pks = new Set<number>();

  for (const link of links) {
    const href = (link as HTMLAnchorElement).getAttribute('href') || '';
    // Match: /en/flat/some-slug-123-city/12345/ or /flat/slug/12345/
    const match = href.match(/\/flat\/[^/]+\/(\d+)\/?$/);
    if (match) {
      pks.add(parseInt(match[1], 10));
    }
  }

  return Array.from(pks);
}
```

### MutationObserver for SPA Listing Detection
```typescript
// Source: MDN MutationObserver + WXT ctx pattern
function observeListings(
  ctx: ContentScriptContext,
  onListingsDetected: (pks: number[]) => void
) {
  const observer = new MutationObserver(() => {
    const pks = extractVisibleListingPKs();
    if (pks.length > 0) {
      onListingsDetected(pks);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Clean up when extension context invalidates
  ctx.onInvalidated(() => observer.disconnect());
}
```

### WXT Content Script URL for wxt.config.ts Update
```typescript
// wxt.config.ts -- update host_permissions
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HomeMatch',
    description: 'AI-powered property match scoring for Flatfox.ch',
    version: '0.2.0',
    permissions: ['storage'],
    host_permissions: [
      '*://*.flatfox.ch/*',
      'https://mlhtozdtiorkemamzjjc.supabase.co/*',
    ],
  },
});
```

### Supabase Custom Storage Adapter for Extension
```typescript
// Source: Supabase discussions + community patterns
// https://github.com/orgs/supabase/discussions/21923

const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Claude API Image Content Blocks (Python)
```python
# Source: https://platform.claude.com/docs/en/build-with-claude/vision
# For URL-based images (preferred -- avoids base64 encoding overhead):
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "url",
                    "url": "https://flatfox.ch/thumb/ff/2024/08/some-hash.jpg?signature=xxx",
                },
            },
            {
                "type": "image",
                "source": {
                    "type": "url",
                    "url": "https://flatfox.ch/thumb/ff/2024/08/another-hash.jpg?signature=yyy",
                },
            },
            {
                "type": "text",
                "text": build_user_prompt(listing, preferences),
            },
        ],
    }
]

# For base64-encoded images (fallback if URLs aren't accessible by Claude):
import base64, httpx

image_data = base64.standard_b64encode(httpx.get(image_url).content).decode("utf-8")

content_block = {
    "type": "image",
    "source": {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": image_data,
    },
}
```

### ScoreResponse TypeScript Types (for Extension)
```typescript
// Mirror of backend Pydantic models for type-safe frontend usage
interface CategoryScore {
  name: string;        // location, price, size, features, condition
  score: number;       // 0-100
  weight: number;      // 0-100
  reasoning: string[]; // 1-5 bullets
}

interface ChecklistItem {
  criterion: string;
  met: boolean | null; // true/false/null (unknown)
  note: string;
}

interface ScoreResponse {
  overall_score: number;     // 0-100
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[]; // 3-5 bullets
  categories: CategoryScore[];
  checklist: ChecklistItem[];
  language: string;          // de/fr/it/en
}
```

### Badge Color Palette (Modern, Not Traffic Light)
```typescript
// Modern color palette for match tiers
const TIER_COLORS = {
  excellent: { bg: '#10b981', text: '#ffffff', label: 'bg-emerald-500' },  // Emerald
  good:      { bg: '#3b82f6', text: '#ffffff', label: 'bg-blue-500' },     // Blue
  fair:      { bg: '#f59e0b', text: '#1f2937', label: 'bg-amber-500' },    // Amber
  poor:      { bg: '#6b7280', text: '#ffffff', label: 'bg-gray-500' },     // Gray
} as const;
// Avoids the green/yellow/red traffic light pattern per user requirement
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manifest V2 background pages | Manifest V3 service workers | Chrome 2023+ | No persistent background page; must handle service worker lifecycle |
| localStorage in background | chrome.storage.local with custom adapter | MV3 transition | Service workers have no localStorage; custom storage adapter required for Supabase |
| CSS injection via manifest | WXT cssInjectionMode: 'ui' | WXT 0.15+ | CSS automatically scoped to shadow DOM, no manual injection needed |
| Manual Shadow DOM setup | WXT createShadowRootUi | WXT 0.15+ | Handles shadow root creation, CSS bundling, HMR, cleanup automatically |
| Claude text-only scoring | Claude vision with URL images | Anthropic 2024+ | Can now pass image URLs directly (no base64 needed) |

**Deprecated/outdated:**
- Extension `chrome.storage.local` profile from Phase 1 wizard: will be replaced with Supabase auth
- Content script matching `*://*.homegate.ch/*`: must change to `*://*.flatfox.ch/*`
- Onboarding wizard (`/onboarding.html`): preferences are now on the Next.js website

## Open Questions

1. **Flatfox Image URL Resolution**
   - What we know: API returns integer image IDs (e.g., `[9782495, 9782496]`). Listing detail pages have `/thumb/ff/...` signed URLs in HTML. No public API maps ID to URL.
   - What's unclear: Whether Claude can fetch Flatfox `/thumb/` URLs directly (they use signed signatures that may expire). Whether we need to download and base64-encode instead.
   - Recommendation: Try URL-based approach first. If Claude cannot access the signed URLs, fall back to downloading images on the backend and sending as base64. Use the og:image URL as a simple first approach (one representative image per listing).

2. **Flatfox Search Results DOM Selectors**
   - What we know: Search page is fully client-rendered SPA. Listing links follow `/en/flat/{slug}/{pk}/` pattern. CSS class `widget-listing-title` exists on listing detail pages.
   - What's unclear: Exact CSS classes on search result listing cards (needs live browser inspection). Whether Flatfox uses stable CSS class names or hashed/obfuscated ones.
   - Recommendation: Use href-based detection (`a[href*="/flat/"]`) as the primary extraction method since URL patterns are stable. CSS classes may change. The content script should find listing anchor tags and inject badges relative to the closest card container element (walk up DOM tree with `closest()`).

3. **Sequential vs Parallel Scoring**
   - What we know: Each score call takes ~2-5 seconds (Flatfox API + Claude API). Batch scoring is deferred.
   - What's unclear: Whether sequential requests will cause timeout issues when scoring 10+ listings.
   - Recommendation: Fire requests sequentially (one at a time) to avoid overwhelming the backend. Show badges as they arrive (progressive rendering). This is simpler and stays within the "no batch optimization" scope.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (extension) / Vitest 4.0.18 (web) |
| Config file | `extension/vitest.config.ts` (exists) / `web/` (needs vitest config) |
| Quick run command | `cd extension && pnpm test` |
| Full suite command | `cd extension && pnpm test && cd ../web && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01 | Content script matches flatfox.ch | unit | `cd extension && pnpm vitest run src/__tests__/content-matches.test.ts -x` | Wave 0 |
| EXT-03 | Extract listing PKs from DOM | unit | `cd extension && pnpm vitest run src/__tests__/flatfox-parser.test.ts -x` | Wave 0 |
| EXT-04 | ScoreResponse type validation | unit | `cd extension && pnpm vitest run src/__tests__/scoring-types.test.ts -x` | Wave 0 |
| EXT-07 | Supabase auth flow | unit | `cd extension && pnpm vitest run src/__tests__/auth-flow.test.ts -x` | Wave 0 |
| EXT-08 | Loading state rendering | unit | `cd extension && pnpm vitest run src/__tests__/loading-state.test.ts -x` | Wave 0 |
| WEB-01 | Analysis page renders data | unit | `cd web && npx vitest run src/__tests__/analysis-page.test.ts -x` | Wave 0 |
| WEB-02 | Category breakdown component | unit | `cd web && npx vitest run src/__tests__/category-breakdown.test.ts -x` | Wave 0 |
| EXT-02 | FAB appears on Flatfox page | manual-only | Load extension on flatfox.ch, verify FAB visible | N/A |
| EXT-05 | Badge expands summary panel | manual-only | Click badge, verify panel appears with bullets | N/A |
| EXT-06 | "See full analysis" link works | manual-only | Click link, verify opens analysis page | N/A |
| WEB-03 | Analysis stored in Supabase | integration | Already verified in Phase 3 e2e testing | Existing |

### Sampling Rate
- **Per task commit:** `cd extension && pnpm test`
- **Per wave merge:** `cd extension && pnpm test && cd ../web && pnpm build`
- **Phase gate:** Full test suite green + manual verification of FAB -> badge -> panel -> analysis page flow

### Wave 0 Gaps
- [ ] `extension/src/__tests__/flatfox-parser.test.ts` -- covers EXT-03 (PK extraction)
- [ ] `extension/src/__tests__/scoring-types.test.ts` -- covers EXT-04 (type validation)
- [ ] `web/vitest.config.ts` -- web project needs vitest config if not present
- [ ] `web/src/__tests__/analysis-page.test.ts` -- covers WEB-01 (analysis rendering)

## Sources

### Primary (HIGH confidence)
- WXT Content Scripts docs: https://wxt.dev/guide/essentials/content-scripts -- content script API, createShadowRootUi, cssInjectionMode, SPA handling
- WXT Content Script UI docs: https://wxt.dev/guide/key-concepts/content-script-ui.html -- Shadow DOM React patterns, positioning options
- Anthropic Vision docs: https://platform.claude.com/docs/en/build-with-claude/vision -- image content blocks (URL + base64), size limits (5MB API), supported formats (JPEG/PNG/GIF/WebP), token cost (~1334 tokens per 1000x1000 image)
- Live Flatfox API verification (2026-03-11): `GET /api/v1/public-listing/{pk}/` -- confirmed images are integer IDs, URL pattern is `/en/flat/{slug}/{pk}/`
- Existing codebase analysis: `extension/`, `web/`, `backend/`, `supabase/functions/` -- verified all file structures, dependencies, and patterns

### Secondary (MEDIUM confidence)
- Supabase auth in extensions: https://akoskm.com/how-to-connect-browser-extensions-to-supabase/ -- background script message passing pattern for auth
- Supabase Chrome storage adapter: https://github.com/orgs/supabase/discussions/21923 -- custom storage adapter pattern for chrome.storage.local
- Supabase auth in browser extensions: https://pustelto.com/blog/supabase-auth/ -- session management patterns

### Tertiary (LOW confidence)
- Flatfox DOM structure: Based on live page inspection (2026-03-11) -- search page is SPA, listing URLs confirmed stable, but CSS class names may change without notice
- Flatfox image URL signing: observed `/thumb/ff/{year}/{month}/{hash}.jpg?signature={sig}` pattern -- unclear if signatures expire or are permanent

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, versions verified from package.json
- Architecture: HIGH -- WXT content script patterns verified from official docs, Supabase SSR patterns verified from existing codebase
- Pitfalls: HIGH -- verified against live Flatfox page (SPA rendering, image ID format), WXT docs (Shadow DOM rem issue), MV3 docs (service worker limitations)
- Flatfox DOM: MEDIUM -- URL patterns stable and verified, CSS classes may change
- Image analysis: MEDIUM -- Claude URL-based image API verified, but Flatfox signed URL accessibility by Claude needs runtime validation

**Research date:** 2026-03-11
**Valid until:** 2026-03-25 (14 days -- Flatfox DOM structure could change; WXT/Supabase stable)
