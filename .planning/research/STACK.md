# Stack Research

**Domain:** Chrome Extension (MV3) + Thin Node.js LLM Proxy Backend
**Researched:** 2026-03-07
**Confidence:** HIGH (WXT, React, Hono verified via official docs and current npm; @anthropic-ai/sdk version confirmed)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| WXT | 0.20.x | Chrome extension build framework | The dominant framework for MV3 extensions as of 2025-2026. Vite-based, framework-agnostic, provides file-based entrypoints, auto-generated manifest, built-in storage/messaging APIs, HMR for content scripts AND popup, and cross-browser support. Actively maintained (7.9k GitHub stars). Ships ~43% smaller bundles than Plasmo. Purpose-built for exactly this architecture: popup, content scripts, background service worker, and unlisted full-page tabs all as first-class entrypoints. |
| React | 19.2.x | UI rendering for popup, onboarding, content script overlays | React 19.2 is stable and recommended for production. WXT has a first-class `@wxt-dev/module-react` integration. The popup, onboarding wizard, and injected badge UI all benefit from component-based composition. The extension community's most-used framework for Chrome extension UIs. |
| TypeScript | 5.x | Type safety across extension and backend | WXT is TypeScript-first. Types for chrome.* APIs, storage schemas, message payloads, and Zod-validated API contracts all benefit from TypeScript. Required to avoid runtime errors from content-script → background messaging mismatches. |
| Tailwind CSS | 4.x | Styling for popup, onboarding, injected content UI | v4 (Jan 2025) ships CSS-only config (`@import "tailwindcss"`, no tailwind.config.js needed). Native `:host` selector support is a major improvement for Shadow DOM injection in content scripts. Style isolation works with WXT's `createShadowRootUi()` by injecting Tailwind's generated CSS into the shadow root. |
| Hono | 4.12.x | Thin Node.js HTTP server for LLM proxy backend | Ultra-lightweight (14 KB core), 3.5x faster than Express, built on Web Standards. Ships a streaming helper ideal for proxying Claude SSE responses. Built-in CORS middleware. TypeScript-native. Deploys on Node.js via `@hono/node-server`. Perfect fit for a single-responsibility proxy that does auth, rate-limiting, and Claude API forwarding. Runs on EC2 with Node.js 18+. |
| @anthropic-ai/sdk | 0.78.x | Claude API client (backend only) | Official Anthropic TypeScript SDK. Supports streaming SSE, message batching, and custom baseURL (for proxying). Lives on the backend only — never shipped in extension bundle. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @wxt-dev/module-react | 1.1.x | React integration for WXT | Required to use React in WXT entrypoints (popup, content script UI, onboarding page). Install as a WXT module, not a standalone Vite plugin. |
| @wxt-dev/storage | 1.2.x | Typed, promise-based chrome.storage wrapper | Use for persisting user preference profile JSON in `chrome.storage.local`. Provides type-safe item definitions, watch callbacks for reactive updates, and versioning. Replaces raw `chrome.storage.local` calls across content script, background, and popup. |
| Zod | 4.x | Runtime schema validation | Validate user profile structure on save/load from storage. Validate backend request/response payloads. The `@zod/mini` distribution (1.9 KB gzipped) is suitable for in-extension validation where bundle size matters. Use full `zod` on the backend. |
| @hono/node-server | 1.x | Node.js adapter for Hono | Required to run Hono on EC2 Node.js. Converts Node.js `http.IncomingMessage` / `ServerResponse` to Web Standard Request/Response. |
| vite | 6.x | Bundler (via WXT) | WXT uses Vite internally. No direct configuration needed for standard setups — WXT exposes `vite()` config hook in `wxt.config.ts` for customization. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| WXT CLI (`wxt dev`) | Dev server with HMR for extension | Launches Chrome with extension loaded. Persists user data across reloads with `--user-data-dir`. Use `wxt dev --browser chrome` for targeted dev. |
| TypeScript tsc | Type checking | Run `tsc --noEmit` in CI. WXT generates types for entrypoints and manifest automatically (`wxt prepare`). |
| eslint + @typescript-eslint | Lint | Catch cross-context mistakes (e.g., DOM API usage in service worker context). |
| nodemon / tsx watch | Backend dev server | `tsx watch src/index.ts` for local EC2 backend development without a build step. |
| dotenv | Backend secrets | `ANTHROPIC_API_KEY` loaded from `.env` in local dev. On EC2, use environment variables injected at deploy time (not committed). |

## Installation

```bash
# --- Chrome Extension ---
# Scaffold with WXT + React + TypeScript
npm create wxt@latest homematch-extension -- --template react-ts
cd homematch-extension

# WXT React module
npm install @wxt-dev/module-react @wxt-dev/storage

# UI
npm install tailwindcss

# Runtime schema validation (mini bundle for extension)
npm install @zod/mini

# Dev dependencies
npm install -D typescript eslint @typescript-eslint/eslint-plugin

# --- Backend (separate directory: homematch-backend) ---
mkdir homematch-backend && cd homematch-backend
npm init -y

npm install hono @hono/node-server @anthropic-ai/sdk zod dotenv

npm install -D typescript tsx @types/node
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| WXT | Plasmo | Only if team is React-only and building a short-lived prototype where Plasmo's React DX is more important than long-term maintenance. Plasmo appears to be in maintenance mode as of 2025 and uses the slower Parcel bundler. |
| WXT | CRXJS (Vite plugin) | Only if you need maximum control and minimal abstraction with a senior team that will manually configure everything. CRXJS provides no built-in storage, messaging, or entrypoint abstractions — you build them yourself. Historical abandonment risk. |
| WXT | Webpack + custom config | Never for a new project. No ecosystem benefit. WXT gives you Vite HMR, auto-manifest, and all entrypoints out of the box. |
| Hono | Express.js | Only if the team already has an Express codebase or needs a large ecosystem of middleware. Express is 3.5x slower and significantly heavier. For a single-route LLM proxy, Express is overkill baggage. |
| Hono | Fastify | Fastify is a valid choice for Node.js-only deployments and has a richer plugin ecosystem. Choose it if you later need complex middleware chains. For this proxy, Hono's Web Standards API alignment is sufficient and lighter. |
| @anthropic-ai/sdk | Vercel AI SDK (`@ai-sdk/anthropic`) | Use Vercel AI SDK if you want a unified interface for switching between models (Claude, OpenAI, Gemini) from a single SDK. Adds abstraction overhead unnecessary for a Claude-only proxy. |
| Tailwind v4 | CSS Modules | CSS Modules are a valid isolation mechanism for popup/onboarding, but Tailwind v4's utility-first approach is faster for hackathon-pace development. Shadow DOM injection of CSS-in-JS (e.g., styled-components) is painful in content scripts — avoid. |
| Zod | yup / joi | Zod has first-class TypeScript inference, is faster in v4, and integrates natively with the Anthropic SDK's type definitions. No compelling reason to use alternatives in a TypeScript-first stack. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manifest V2 background pages | Chrome has sunset MV2. Extensions using MV2 are being disabled in Chrome as of 2024-2025. All new extensions must use MV3 service workers. | MV3 background service worker (built into WXT via `background/index.ts` entrypoint) |
| Persistent state in service worker memory | MV3 service workers are terminated after 30s idle and 5min max runtime. Any in-memory state is lost. | `@wxt-dev/storage` (wraps `chrome.storage.local`) or `chrome.storage.session` for ephemeral state |
| `window.localStorage` in content scripts or service worker | `localStorage` is tied to the page origin, inaccessible from service workers, and unreliable across contexts. | `chrome.storage.local` via `@wxt-dev/storage` |
| CSS injected globally from content scripts | Without Shadow DOM isolation, your extension CSS will clash with Homegate's styles and vice versa. Produces hard-to-debug visual corruption. | `createShadowRootUi()` from WXT with Tailwind CSS injected into the shadow root |
| Calling Claude API directly from the extension | Exposes your API key in the extension bundle (visible via Chrome DevTools). Keys would need to be rotated on every compromise. | EC2 backend proxy that holds the key server-side |
| `fetch()` to Homegate from content scripts | Content scripts run in the page origin context; cross-origin fetches from content scripts are CORS-blocked. | Delegate all external fetches to the background service worker via `chrome.runtime.sendMessage` — background scripts bypass CORS with host_permissions |
| React Server Components / Next.js | RSC requires a server runtime. Extension UIs (popup, onboarding, content script overlays) are static HTML/JS bundles loaded from the extension package. No server to hydrate from. | Standard React (client-side only) |
| WebSockets for backend streaming | Adds connection management complexity. Claude API returns SSE. Proxy SSE → SSE is simpler and stateless. | Hono streaming helper + SSE passthrough from `@anthropic-ai/sdk` stream |

## Stack Patterns by Variant

**For the content script badge UI (score overlay on Homegate listings):**
- Use `createShadowRootUi()` from WXT
- Mount a React component tree inside the shadow root
- Inject Tailwind CSS as a `<style>` tag inside the shadow root (not the global document)
- Use `MutationObserver` to detect when new listing cards are injected (Homegate uses client-side routing)
- Because WXT provides `autoMount()`, prefer that over manual observer wiring

**For the full-page onboarding wizard:**
- Register as a WXT "unlisted" HTML entrypoint (not a content script, not the popup)
- Open via `chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })` from `runtime.onInstalled`
- React multi-step wizard (no router needed — wizard state is local React state)
- On completion, write the profile JSON to `@wxt-dev/storage` and close the tab

**For the popup dashboard:**
- Register as the standard popup entrypoint in WXT (`popup/index.html`)
- React component, reads profile summary from storage, shows on/off toggle
- "Edit" link opens the onboarding tab: `chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })`

**For the background service worker:**
- Registered as `background/index.ts` in WXT
- All external HTTP fetches (Homegate detail pages, Claude proxy) live here
- Keep stateless — reconstruct from storage on each activation
- Use `chrome.runtime.onMessage` to receive scoring requests from content scripts
- Use `fetch()` with `Host: homegate.ch` allowed via `host_permissions`

**For the EC2 backend:**
- Single Hono route: `POST /score` accepts listing data + user profile, calls Claude, streams response back
- CORS locked to `chrome-extension://[your-extension-id]` for production; open for dev
- API key read from `process.env.ANTHROPIC_API_KEY`
- No database, no auth, no sessions — pure stateless proxy

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| wxt@0.20.x | vite@6.x (internal) | WXT 0.20 is the RC for 1.0. Breaking changes from 0.19 — follow migration guide at wxt.dev/guide/resources/upgrading |
| @wxt-dev/module-react@1.1.x | wxt@0.20.x | Must match WXT major version. Install as a WXT module in `wxt.config.ts` modules array. |
| @wxt-dev/storage@1.2.x | wxt@0.20.x | Separate package — works across popup, content scripts, and service worker contexts |
| tailwindcss@4.x | vite@6.x | Tailwind v4's Vite plugin (`@tailwindcss/vite`) is required in WXT's vite config hook |
| react@19.x | @wxt-dev/module-react@1.1.x | Confirmed compatible. Use `react@19` and `react-dom@19` matching versions. |
| hono@4.12.x | @hono/node-server@1.x | Node adapter version must be compatible with hono core. Install both from same release cycle. |
| @anthropic-ai/sdk@0.78.x | node@18+ | SDK requires Node.js 18 or higher — matches Hono's Node.js minimum. |
| zod@4.x | @anthropic-ai/sdk | Zod v4 is not backward-compatible with Zod v3 API. If any dependencies pin to Zod v3, use separate packages. |

## Sources

- [WXT Official Docs — wxt.dev](https://wxt.dev/) — entrypoints, content script UI modes, storage API, version 0.20.18 confirmed
- [WXT npm — wxt@0.20.11](https://www.npmjs.com/package/wxt) — latest published version
- [@wxt-dev/module-react npm](https://www.npmjs.com/package/@wxt-dev/module-react) — version 1.1.5
- [@wxt-dev/storage npm](https://www.npmjs.com/package/@wxt-dev/storage) — version 1.2.8
- [2025 State of Browser Extension Frameworks: Plasmo vs WXT vs CRXJS](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) — MEDIUM confidence, framework comparison, maintenance status
- [How to Build Chrome Extensions with React, Vite & CRXJS in 2026](https://optymized.net/blog/building-chrome-extensions) — MEDIUM confidence
- [Hono Official Docs — Node.js Getting Started](https://hono.dev/docs/getting-started/nodejs) — Node.js adapter, CORS middleware, streaming helper
- [Hono npm — version 4.12.5](https://www.npmjs.com/package/hono) — latest version confirmed
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — streaming, Node.js usage patterns verified
- [@anthropic-ai/sdk npm — 0.78.0](https://www.npmjs.com/package/@anthropic-ai/sdk) — latest version confirmed (March 2026)
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-only config, :host selector for Shadow DOM
- [React 19.2 Stable](https://react.dev/blog/2025/10/01/react-19-2) — stable release confirmed
- [Zod v4 InfoQ](https://www.infoq.com/news/2025/08/zod-v4-available/) — version 4.3.6, @zod/mini confirmed
- [Chrome Cross-Origin Requests in Content Scripts](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/) — content script fetch CORS behavior
- [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — 30s idle / 5min max termination confirmed
- [WXT Content Scripts Guide](https://wxt.dev/guide/essentials/content-scripts) — shadow root UI, integrated UI, iframe UI modes

---
*Stack research for: HomeMatch Chrome Extension + EC2 LLM Proxy*
*Researched: 2026-03-07*
