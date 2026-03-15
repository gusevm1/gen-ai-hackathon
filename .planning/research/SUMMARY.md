# Project Research Summary

**Project:** HomeMatch v2.0 — Smart Preferences & UX Polish
**Domain:** AI-powered property scoring tool with chat-based preference discovery
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

HomeMatch v2.0 is an incremental milestone on a validated v1.1 architecture (Next.js + Supabase + FastAPI on EC2 + WXT Chrome extension). The v2.0 work is additive: replace manual free-text soft criteria with AI-generated structured preference fields via a chat interface, parallelize listing scoring for a dramatic UX speedup, and polish the product for B2B pilot distribution. The research is unusually high confidence because it builds on a production codebase that was directly analyzed — most findings are verified against the actual code, not just documentation.

The single most important architectural decision is the schema change: `softCriteria: string[]` becomes `dynamicFields: DynamicField[]` with importance levels, and this change must land across Zod (web), Pydantic (backend), and the Claude scoring prompt simultaneously before any chat UI is built. The chat feature itself is a thin layer on top of Vercel AI SDK (`useChat` + `generateObject`) — only three new npm packages needed across the entire project. Parallel scoring requires zero new packages; `asyncio.Semaphore(3)` in the backend and a concurrency-pooled `Promise.allSettled()` in the extension are the entire implementation.

The primary risks are operational, not architectural: (1) chat-save accidentally overwriting manually-configured standard fields (budget, rooms, location) via a full-replace instead of JSONB merge; (2) unbounded parallel scoring hitting Claude API rate limits and Flatfox scraping limits simultaneously; and (3) the Chrome extension requiring developer-mode sideloading for the pilot customer, which erodes trust. The first two risks have clear, low-effort mitigations. The third is best solved by submitting to Chrome Web Store Unlisted early in the milestone — $5 developer fee, 1-3 day review, zero code changes.

## Key Findings

### Recommended Stack

The existing stack requires only three new packages added to the web app: `ai` (Vercel AI SDK core), `@ai-sdk/react` (the `useChat` hook), and `@ai-sdk/anthropic` (the Anthropic provider). All are well-maintained and version-compatible with the current Next.js 16 + React 19 + Zod v4 setup. Backend, extension, and Supabase edge functions require zero new dependencies.

**Core technologies (new additions only):**
- `ai` v6.x: AI SDK core — `streamText`, `generateObject`, `convertToModelMessages`; eliminates all custom SSE parsing and streaming state management; 20M+ monthly downloads
- `@ai-sdk/react` v3.x: The `useChat` hook with built-in streaming state machine (`ready/submitted/streaming/error`), message history, and abort support; ~10 lines replaces ~200 lines of custom code
- `@ai-sdk/anthropic` v3.x: Anthropic provider wrapper for Claude Haiku 4.5; wraps `@anthropic-ai/sdk` internally — do NOT also install that package separately or version conflicts occur

**Critical env var addition:** `ANTHROPIC_API_KEY` must be added to Vercel environment variables. This is the first time the web app calls Claude directly (previously all Claude calls went through EC2 backend only). The key can be shared with EC2 or separate for cost tracking.

**What does NOT change:** CSS theming is a pure `globals.css` variable swap (~15 HSL values). Parallel scoring is `asyncio.Semaphore(3)` + `Promise.allSettled()`. Extension distribution adds a static download page and `.zip` artifact. No design token system, no new CSS-in-JS, no job queue, no message broker.

See `.planning/research/STACK.md` for full version compatibility matrix and alternatives considered.

### Expected Features

Features are well-defined in PROJECT.md with explicit v2.0 scope. There is no ambiguity about what this milestone delivers.

**Must have (table stakes for v2.0):**
- Chat-based preference discovery — the headline feature; replaces tedious manual soft-criteria entry with multi-turn AI conversation
- Review/edit UI for AI-generated preferences — required for user trust; chat output must be editable before save
- Dynamic preference fields replacing `softCriteria` — the foundation schema change; enables structured AI preferences with importance levels (critical/high/medium/low)
- Parallel scoring (concurrency=5) — ~5x speedup; sequential scoring of 15+ listings currently takes 60+ seconds
- Extension download page — static page on website; `.zip` download + sideload guide or CWS Unlisted link

**Should have (low-effort differentiators):**
- Scoring progress indicator "3 of 12 scored" on FAB — trivial to implement alongside parallel scoring
- Chat auto-suggests standard fields (budget, rooms, location) — extractable during `generateObject` call at no extra cost
- Chrome Web Store Unlisted submission — start immediately; review takes 1-3 business days

**Defer to v2.1:**
- Full Flatfox UI redesign beyond color palette swap — lower priority than functional features; minimal color update sufficient for v2.0
- Chat conversation memory across sessions — sessionStorage persistence is the v2.0 mitigation
- CWS public listing — niche extension (Flatfox only + HomeMatch account); unlisted is correct for B2B pilot

**Anti-features (explicitly do not build):**
- Chat in the Chrome extension popup — extension is for scoring, not setup; popup is too small for chat UI
- Auto-scoring without FAB click — API cost risk; FAB is the intentional user trigger
- Backend batch endpoint — client-side concurrency with the existing single-listing endpoint preserves progressive badge rendering and is far simpler
- Persistent chat history in Supabase — chat is ephemeral; only the extracted `dynamicFields` should be persisted

See `.planning/research/FEATURES.md` for full dependency graph and MVP recommendation.

### Architecture Approach

The v2.0 architecture adds one new layer (a Next.js chat route handler calling Claude directly) to the existing v1.1 topology while keeping all existing data flows intact. The key principle is separation of concerns: chat preference discovery runs entirely through the web app (Vercel -> Claude -> Supabase); scoring continues through the existing pipeline (Extension -> Edge Function -> EC2 -> Claude -> Supabase). These two Claude usage paths share the same API key but never cross.

**Major components:**
1. Chat Interface (`/profiles/[id]/chat`) — new Next.js page with `useChat` hook; multi-turn conversation or single-shot input; sessionStorage persistence keyed by profile ID prevents loss on navigation
2. Chat API Routes (`/api/chat` + `/api/chat/extract`) — streaming route handler using `streamText`; separate extraction endpoint using `generateObject` with Zod schema for guaranteed structured output
3. Preference Review component — displays AI-extracted `dynamicFields` with importance levels; user edits/removes/adds before JSONB merge-save to Supabase (NOT full replace)
4. Dynamic Schema layer (`dynamicFields: DynamicField[]`) — added to Zod (web), Pydantic (backend), and scoring prompt in one coordinated change; migrates legacy `softCriteria` via existing `model_validator` pattern
5. Parallel Scorer — `scoreListings()` refactored with `concurrency=5` batching via `Promise.allSettled()`; FAB adds progress counter; backend adds `asyncio.Semaphore(3)` around both Claude API calls AND Flatfox HTML fetches
6. Extension Install Page (`/install`) — static Next.js page; `.zip` download + step-by-step guide; CWS Unlisted link replaces sideload instructions once published

**Key patterns to follow:**
- JSONB merge-save (`preferences || $dynamic_only`) instead of full replace — critical to preserve standard fields (budget, rooms, location)
- `generateObject` with Zod schema for structured preference extraction — guarantees schema compliance, eliminates JSON parsing errors
- Batched concurrency with progressive results: `Promise.allSettled()` in batches of 5 with `onResult` callback; loading skeletons injected for all badges before batch starts

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, file change inventory, and anti-patterns.

### Critical Pitfalls

1. **Chat save overwrites standard fields (CRITICAL)** — use JSONB merge (`preferences || $chat_output`) not full replace; show preview before save; strip standard fields from chat output server-side. Recovery requires restoring from Supabase audit log — very painful.

2. **Unbounded parallel scoring hits both Claude API and Flatfox rate limits (CRITICAL)** — add `asyncio.Semaphore(3)` to backend Claude calls AND to `FlatfoxClient` HTML fetches; reuse a single `httpx.AsyncClient` for Flatfox scraping. Both semaphores must be in place before enabling parallel requests in the extension.

3. **Dynamic fields silently dropped by Pydantic `extra="ignore"` (CRITICAL)** — add `dynamic_fields: list[DynamicField]` to `UserPreferences` model BEFORE the chat UI generates any fields. Otherwise scoring silently ignores all chat-generated criteria — no error, no warning, just wrong scores.

4. **Dynamic fields not weighted in scoring prompt (CRITICAL)** — extend `build_user_prompt()` to render a "Custom Criteria" section with importance levels; update `ChecklistItem` or add a 6th scoring category. Without this, CRITICAL chat-generated criteria produce the same score as LOW criteria.

5. **Chrome extension sideloading alienates pilot customer (HIGH)** — submit to Chrome Web Store Unlisted immediately (start of Phase 4 at latest); $5 developer fee; 1-3 day review. Sideloading triggers Chrome's "disable developer mode extensions" banner and disables auto-updates — wrong first impression for B2B.

See `.planning/research/PITFALLS.md` for 10 additional moderate/minor pitfalls with detection checklists and recovery costs.

## Implications for Roadmap

Based on combined research, the phase order is driven by one hard dependency chain: dynamic schema must land across all layers before the chat UI generates fields; chat UI must work before it is wired into the profile form. Parallel scoring and UI changes are fully independent and can run concurrently with later chat phases or in separate workstreams.

### Phase 1: Dynamic Preference Schema Foundation

**Rationale:** Every other v2.0 feature touches `preferences`. The Pydantic `extra="ignore"` pitfall means dynamic fields must exist in the backend model before any frontend code generates them — there is no safe way to develop chat and schema in parallel. Get schema right first, eliminate all downstream rework risk.
**Delivers:** `dynamicFields: DynamicField[]` in Zod + Pydantic with backward-compat migration from `softCriteria`; updated scoring prompt rendering dynamic fields with importance levels as a separate "Custom Criteria" section; updated `ChecklistItem` to carry importance weighting.
**Addresses features:** Dynamic AI-generated fields replacing soft criteria; scoring prompt update to weight custom criteria.
**Avoids pitfalls:** Pitfall 3 (dynamic fields not weighted in prompt) and Pitfall 8 (backend silently drops unknown fields via `extra="ignore"`). Both are prevention-only — no viable fix after the fact without data loss.
**Research flag:** SKIP — Pydantic model validators, Zod schema extension, JSONB migration, and `model_validator` backward-compat are all established patterns with direct codebase examples from v1.1 schema unification.

### Phase 2: Chat-Based Preference Discovery

**Rationale:** The headline feature of v2.0; depends on Phase 1 schema. Installs the only new packages (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`). Largest new feature surface area with the most product judgment required (conversation design, prompt engineering, single-shot vs multi-turn tradeoff).
**Delivers:** Chat page at `/profiles/[id]/chat`; streaming chat route handler (`/api/chat`); structured extraction endpoint (`/api/chat/extract`); PreferenceReview component with edit-before-save; JSONB merge-save (NOT full replace); sessionStorage conversation persistence; `ANTHROPIC_API_KEY` on Vercel.
**Uses stack:** Vercel AI SDK `useChat` + `streamText` + `generateObject`; `@ai-sdk/anthropic` provider.
**Avoids pitfalls:** Pitfall 1 (standard field overwrite — merge-save is the implementation requirement); Pitfall 4 (conversation lost on navigation — sessionStorage persistence); Pitfall 11 (chat API error handling — retry button, timeout).
**Research flag:** NEEDS RESEARCH — the preference discovery conversation design is underspecified. Specifically: (a) single-shot (user writes one paragraph, AI extracts) vs multi-turn (AI asks clarifying questions); (b) system prompt structure for extraction quality; (c) how to guide users toward the right level of specificity. Single-shot is simpler and avoids state complexity; multi-turn is richer but harder to implement well. This warrants a focused `/gsd:research-phase` pass before building the chat UI.

### Phase 3: Parallel Scoring

**Rationale:** Independent of schema and chat changes. Delivers the highest-visible UX improvement (60s -> ~12s for 15 listings) with the least code. Must be shipped as a complete unit: backend semaphore + Flatfox client hardening + extension concurrency pool must all land together to avoid partial-failure states.
**Delivers:** `scoreListings()` with `concurrency=5` batching via `Promise.allSettled()`; `asyncio.Semaphore(3)` wrapping Claude API calls in backend; `asyncio.Semaphore(3)` + persistent `httpx.AsyncClient` in `FlatfoxClient` for HTML fetches; FAB progress counter "N of M scored".
**Avoids pitfalls:** Pitfall 2 (Claude API 429 rate limits); Pitfall 9 (Flatfox HTML scraping rate limits — new client per request is the current code flaw); Pitfall 5 (edge function redundant work — client-side batching reduces total invocations); Pitfall 13 (out-of-order badge display — existing `onResult` callback pattern handles this already).
**Research flag:** SKIP — `asyncio.Semaphore`, `Promise.allSettled()` batching, `httpx.AsyncClient` connection reuse are standard and well-documented. Rate limits verified against official Anthropic docs.

### Phase 4: UI Redesign + Extension Distribution

**Rationale:** Pure UX polish with no architectural dependencies on earlier phases. Can be split across two parallel workstreams: color palette (CSS-only, hours of work) and extension distribution (static page + CWS submission process). Chrome Web Store Unlisted submission should start at the beginning of this phase — not the end — because the review takes 1-3 days.
**Delivers:** Flatfox-inspired teal/green primary color palette in `globals.css`; verified WCAG AA badge contrast on Flatfox pages; extension install page at `/install`; `.zip` build script in `extension/package.json`; Chrome Web Store Unlisted submission.
**Avoids pitfalls:** Pitfall 6 (badge visibility — define two separate palettes before any CSS changes; test on actual Flatfox page); Pitfall 7 (sideloading UX alienating pilot users — CWS Unlisted is the correct solution); Pitfall 10 (extension popup color breakage — rebuild extension after any `globals.css` change and verify popup).
**Research flag:** SKIP for color palette (CSS-only; Flatfox exact colors need visual tuning by inspection, not research). SKIP for install page (standard static Next.js page). CWS submission process is well-documented at developer.chrome.com.

### Phase Ordering Rationale

- **Phase 1 before Phase 2 (hard dependency):** Pydantic `extra="ignore"` silently discards unknown fields. If Phase 2 chat generates `dynamicFields` before the backend model declares them, scoring silently ignores all custom criteria. No workaround exists without a backend redeploy.
- **Phase 3 can run in parallel with Phase 2:** Parallel scoring is architecturally independent. A second team member could implement Phase 3 while Phase 2 chat work is in progress. Recommend merging Phase 3 before Phase 2 (lower risk) to avoid compounding changes during final integration.
- **Phase 4 after Phases 1-2:** Color palette changes are best done on a stabilized codebase to avoid visual regressions during active feature development. Exception: CWS submission should start immediately regardless — it is a background process with no code dependency.
- **CWS Unlisted submission:** Start in parallel with Phase 1 development. Review takes 1-3 days; there is no reason to wait until Phase 4.

### Research Flags

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 2 (Chat UI conversation design):** The product decision between single-shot and multi-turn preference discovery is not resolved by current research. Single-shot (user writes a paragraph, AI extracts preferences) is simpler and avoids session state complexity. Multi-turn (AI asks clarifying questions across 3-5 turns) is richer but requires sessionStorage persistence, turn limits, and more complex prompt engineering. The system prompt quality directly determines extraction quality — this warrants deliberate design before implementation begins.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Schema):** Pydantic model validators, Zod schema extension, JSONB migration, backward-compat migration — all established patterns with direct codebase examples from v1.1.
- **Phase 3 (Parallel Scoring):** `asyncio.Semaphore`, `Promise.allSettled()` batching, `httpx.AsyncClient` reuse — standard Python/TypeScript patterns, fully documented.
- **Phase 4 (UI + Distribution):** CSS variable theming, static Next.js page, WXT zip packaging, CWS Unlisted submission — all well-documented. Flatfox color values need visual validation during implementation, not upfront research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against official AI SDK docs (ai-sdk.dev), npm registry version numbers, Anthropic rate limit docs. Medium-confidence item: exact Flatfox color HSL values (no public style guide; must tune by visual inspection). |
| Features | HIGH | Features drawn directly from PROJECT.md active requirements. Integration patterns verified against official docs. Anti-features supported by clear technical rationale. |
| Architecture | HIGH | Codebase analyzed directly. Data flows, file paths, model fields, and existing patterns (migration validators, async patterns) all verified against real source files. |
| Pitfalls | HIGH | Six critical pitfalls identified with direct codebase evidence (specific file paths and code patterns). Rate limits verified against official Anthropic and Supabase docs. Chrome extension restrictions verified against official Chrome for Developers docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Chat conversation design:** The single-shot vs multi-turn tradeoff is flagged for a Phase 2 research pass. The technical implementation of both approaches is understood; the product decision requires deliberate thought before UI construction begins.
- **Flatfox color values:** The exact HSL values for Flatfox's primary teal/green palette are not publicly documented. The `hsl(168 76% 36%)` approximation must be tuned by visual comparison with flatfox.ch during implementation. Low impact — CSS-only change.
- **Anthropic API tier level:** Research assumes Tier 1 (50 RPM) as the conservative baseline for semaphore sizing. If the account is on Tier 2 (1000 RPM), the concurrency limit of 3 could safely increase to 10. Check in the Anthropic console before finalizing Phase 3 implementation.
- **Chrome Web Store reviewer requirements:** CWS review may require a privacy policy URL and detailed permission justifications for host permissions on `flatfox.ch`. Prepare these before submission to avoid rejection delays.
- **Flatfox rate limiting specifics:** Flatfox does not publish rate limit documentation. The threshold estimate (~10-20 concurrent requests) is based on common patterns for similar-sized services. Needs empirical validation during Phase 3 testing.

## Sources

### Primary (HIGH confidence)
- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction) — SDK packages, `useChat` hook API, `streamText`, `generateObject`, migration guide 6.0
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) — model IDs, provider setup, `generateObject` support
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) — RPM/ITPM/OTPM by tier for Haiku 4.5; image token counts (~1334 per image)
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `generateObject` schema guarantee
- [Chrome Extension Distribution](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions) — CRX blocked on Windows/macOS; developer mode sideloading process
- [Chrome Web Store Distribution Settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) — Unlisted/private/public visibility options; $5 developer fee
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits) — 150s timeout, V8 isolates per invocation
- [FastAPI Concurrency Docs](https://fastapi.tiangolo.com/async/) — async/await patterns, `asyncio.gather`
- [Python asyncio Semaphore](https://docs.python.org/3/library/asyncio-sync.html) — stdlib concurrency primitives
- Direct codebase analysis: `extension/src/lib/api.ts`, `backend/app/services/claude.py`, `backend/app/services/flatfox.py`, `backend/app/models/preferences.py`, `backend/app/prompts/scoring.py`, `supabase/functions/score-proxy/index.ts`, `web/src/app/globals.css`, `extension/src/types/scoring.ts`

### Secondary (MEDIUM confidence)
- [DEPT Agency — Flatfox Brand Case Study](https://www.deptagency.com/de-dach/case/upgrades-fuer-die-groesste-schweizer-immobilienplattform/) — brand palette described as teal/turquoise; "light and agile," "fresh, bold colors"
- [FastAPI rate limiting with asyncio.Semaphore](https://medium.com/@reesel/build-faster-more-reliable-fastapi-apps-with-concurrency-e726784a0299) — community best practice for external API rate limiting
- [Dynamic Pydantic models pattern](https://itracer.medium.com/dynamic-pydantic-models-ac91e8acedcd) — community pattern for runtime model creation

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*
