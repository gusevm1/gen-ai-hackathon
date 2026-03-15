# Domain Pitfalls

**Domain:** Chat-based AI preferences, dynamic schema fields, parallel scoring, UI redesign, Chrome extension distribution
**Researched:** 2026-03-15
**Milestone:** v2.0 Smart Preferences & UX Polish
**Confidence:** HIGH (codebase verified directly; API rate limits verified against official Anthropic docs; Chrome extension distribution verified against Chrome for Developers docs; Supabase edge function limits verified against official docs)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or blocked demos.

### Pitfall 1: Chat-Generated Preferences Overwrite User's Manually-Tuned Standard Fields

**What goes wrong:**
The chat-based preference discovery flow produces a complete preferences object from the conversation. When saved, it overwrites the entire `preferences` JSONB column in the `profiles` table -- including standard fields the user had already manually configured (budget, location, rooms). User flow: they set budget to CHF 1500-2000 manually, then open the chat to add soft criteria like "quiet street" and "south-facing balcony". The chat produces a full preferences object that either guesses at budget (incorrectly) or sets it to null/default. The manual budget disappears. The user re-scores and gets wrong results. They blame the product.

**Why it happens:**
The existing `preferencesSchema` is a single flat Zod object. There is no separation between "standard fields" (budget, location, rooms -- always form-controlled) and "dynamic fields" (chat-generated criteria). If the LLM returns a full preferences object and the save function does `UPDATE profiles SET preferences = $1`, the standard fields are overwritten.

**Consequences:**
- Users lose manually-configured dealbreaker settings silently
- Scoring produces unexpected results because budget/rooms/location reset to defaults
- Trust in the AI feature destroyed after first use

**Prevention:**
- Split the save path: chat output ONLY updates `softCriteria` (or the new dynamic fields) and `importance`, NEVER touches `budgetMin`, `budgetMax`, `roomsMin`, `roomsMax`, `location`, `offerType`, `objectCategory`, `floorPreference`, `availability`, or dealbreaker toggles
- Implement merge-save, not replace-save: `UPDATE profiles SET preferences = preferences || $chat_fields` using JSONB merge, not full replacement
- In the UI, show the chat output as an editable preview BEFORE saving -- let the user see exactly which fields will change
- Backend validation: reject any chat-generated preferences object that contains standard filter fields (or strip them before merge)

**Detection:**
- After chat save, standard fields (budget, rooms) differ from what user manually set
- `preferences` JSONB has null values for fields that were previously populated
- Scoring reasoning mentions "No budget preference" when user clearly set one

**Phase to address:** Chat preference discovery phase -- design the merge strategy BEFORE building the chat UI.

---

### Pitfall 2: Parallel Scoring Hits Claude API Rate Limits and Kills the Entire Batch

**What goes wrong:**
The current `scoreListings()` in `extension/src/lib/api.ts` runs requests sequentially. v2.0 changes this to parallel: the FAB click triggers scoring for all visible listings (10-20 on a Flatfox search page) simultaneously. Each scoring request goes: extension -> edge function (auth + profile resolution) -> backend -> Flatfox API (listing fetch) -> Flatfox HTML (image URLs) -> Claude API (scoring with images). With 15 parallel requests, the backend fires 15 concurrent Claude API calls. On Tier 1 (50 RPM) or even Tier 2 (1000 RPM), the input token rate limit is the real bottleneck: each scoring call sends ~4000-8000 input tokens (prompt + 5 images at ~1334 tokens each). 15 concurrent calls = ~60,000-120,000 input tokens hitting the API simultaneously. Claude returns 429 Too Many Requests for the later calls. The backend returns 502 to the edge function. The extension shows errors for some badges while others succeed -- a partial, confusing result.

**Why it happens:**
The transition from sequential to parallel was designed to improve speed but no concurrency limit or rate-limiting mechanism was added. The `ClaudeScorer` singleton has no semaphore. The Flatfox API fetch and image URL extraction are also unbounded -- 15 concurrent HTML page fetches to Flatfox may trigger their rate limiting too.

**Consequences:**
- Partial scoring results (some badges succeed, some error) -- confusing UX
- 429 errors from Claude API may trigger temporary rate limit escalation
- Flatfox may also rate-limit the backend, failing image URL extraction
- Claude API costs spike if retries are naively added without backoff

**Prevention:**
- Add an `asyncio.Semaphore(3)` in the backend scoring router to limit concurrent Claude API calls to 3 at a time (safe for Tier 1 at 50 RPM; provides 3-5x speedup over sequential without hitting limits)
- In `extension/src/lib/api.ts`, implement a concurrency pool: use `Promise.allSettled()` with a concurrency limit of 3-5, not raw `Promise.all()` with all requests
- Add retry logic with exponential backoff (1s, 2s, 4s) for 429 responses in the backend, limited to 2 retries
- Surface per-listing progress in the extension UI: "Scoring 3/15..." with individual badge loading states
- Add a `X-RateLimit-Remaining` header passthrough from Claude API responses so the backend can self-throttle

**Detection:**
- Some badges show scores while others show error states after a single FAB click
- Backend logs show `429 Too Many Requests` from Anthropic API
- Flatfox image URL extraction returns empty arrays despite listings having images (Flatfox rate limiting)

**Phase to address:** Parallel scoring phase -- the concurrency limiter MUST be in the backend before the extension sends parallel requests.

---

### Pitfall 3: Dynamic AI-Generated Fields Break the Scoring Prompt and Category System

**What goes wrong:**
v2.0 replaces `softCriteria: string[]` and `features: string[]` with dynamic AI-generated fields that have priorities. The chat produces custom fields like `{ field: "south-facing balcony", importance: "critical" }` or `{ field: "within 5min walk to S-Bahn", importance: "high" }`. The backend prompt in `scoring.py` currently hardcodes 5 categories: location, price, size, features, condition. The `ScoreResponse` model expects exactly these 5 `CategoryScore` entries. Dynamic fields do not map cleanly to these 5 categories -- "south-facing balcony" spans both features and condition; "near S-Bahn" is location. If dynamic fields are shoehorned into the existing `softCriteria` or `features` arrays (just as strings), Claude's prompt treats them as secondary checklist items, not as first-class scoring criteria with importance levels. The user marks "south-facing balcony" as CRITICAL but Claude only mentions it in the checklist with a boolean met/not-met, never weighting it into the overall score.

**Why it happens:**
The v1.1 prompt design hardcodes 5 scoring categories with fixed importance levels (`Importance` model in `preferences.py`). The `ChecklistItem` model in `scoring.py` only has `criterion`, `met`, and `note` -- no score or weight. Dynamic fields with importance levels have nowhere to go in the current response schema. The frontend can generate arbitrarily complex preference structures, but the backend prompt and response model are rigid.

**Consequences:**
- User-specified CRITICAL dynamic criteria are treated as low-priority checklist items
- Overall score does not reflect the user's actual priorities
- Chat-based preference discovery feels broken: "I told it balcony is critical but it doesn't affect my score"
- Prompt quality degrades as more dynamic fields are crammed into soft criteria strings

**Prevention:**
- Extend the `UserPreferences` model to include a `dynamic_fields: list[DynamicField]` where `DynamicField` has `name: str`, `description: str`, `importance: ImportanceLevel`
- Update `build_user_prompt()` in `scoring.py` to render dynamic fields as a separate section with their importance levels, explicitly instructing Claude to factor them into the overall score
- Extend `ChecklistItem` model to include an optional `importance: ImportanceLevel` and `score: int` so Claude can weight dynamic criteria
- Alternatively, keep the 5-category system but add a 6th dynamic "Custom Criteria" category whose score is the weighted average of all dynamic field evaluations
- Test with a preferences object containing 5+ dynamic fields at different importance levels and verify the overall score changes meaningfully when a CRITICAL dynamic field is unmet

**Detection:**
- Dynamic fields with CRITICAL importance do not visibly affect the overall score
- Changing a dynamic field's importance from LOW to CRITICAL produces the same score
- Claude's response checklist has no scores or weights for dynamic items

**Phase to address:** Chat preference discovery phase -- schema extension MUST be designed before the chat UI generates dynamic fields.

---

### Pitfall 4: Chat Conversation Loses Context in Multi-Turn Preference Discovery

**What goes wrong:**
The chat-based preference discovery requires multi-turn conversation: "What kind of apartment are you looking for?" -> user responds -> "What's your budget?" -> user responds -> generate structured output. If the implementation sends each message as a separate stateless Claude API call (no conversation history), Claude cannot build on previous answers. If the implementation accumulates the full conversation in the frontend and sends it all each time, token costs compound: turn 5 sends all 4 previous turns plus the new message. With image analysis disabled in the chat flow but the same Haiku model, the input token cost of a 10-turn preference discovery conversation is ~5000-10000 tokens per final call. This is manageable, but the real pitfall is losing context between page reloads or navigation.

**Why it happens:**
The web app is server-rendered Next.js. If the chat component stores conversation state in React useState, navigating away (e.g., clicking the navbar) destroys the conversation. The user returns to find a fresh chat with no memory of their previous answers. Alternatively, if the chat is implemented as a modal/drawer, closing it loses state too.

**Consequences:**
- Users abandon multi-turn chat after losing progress to an accidental navigation
- Incomplete preference extraction produces poor-quality dynamic fields
- Users fall back to manual form entry, defeating the purpose of the feature

**Prevention:**
- Store conversation state in localStorage or sessionStorage, keyed by profile ID: `chat:${profileId}:messages`
- On chat component mount, restore previous conversation if it exists and was less than 30 minutes old
- Add a "Start over" button to explicitly clear conversation state
- Consider a single-shot approach instead of multi-turn: one large prompt that asks Claude to extract all preferences from a single free-text paragraph the user writes -- simpler, no state management, lower token cost
- If multi-turn is chosen, limit to 5 turns max with a "Generate preferences" button available after turn 2

**Detection:**
- User navigates to profiles page then back to chat; conversation is empty
- Chat component's useEffect runs on every mount with empty messages array
- sessionStorage has no entry for the current profile's chat state

**Phase to address:** Chat preference discovery phase -- decide single-shot vs multi-turn architecture BEFORE building the chat UI.

---

### Pitfall 5: Edge Function Becomes the Bottleneck for Parallel Scoring

**What goes wrong:**
The current `score-proxy` edge function handles one request at a time: auth check, profile resolution, proxy to backend. With parallel scoring, 15 requests arrive simultaneously. Each edge function invocation is a separate Deno isolate. Each one independently calls `supabase.auth.getUser(token)` (network round-trip to Supabase Auth) and `supabase.from('profiles').select().eq('is_default', true).single()` (network round-trip to Supabase Postgres). That is 30 Supabase round-trips for 15 listings -- all happening in parallel but each paying its own latency. The edge function's 150-second timeout per request is generous, but the real issue is that all 15 requests resolve the same profile with the same preferences, doing identical work 15 times.

**Why it happens:**
The edge function was designed for single-listing scoring. It resolves the active profile on every request because the extension only sends `listing_id` -- the edge function looks up `profile_id` and `preferences` server-side. This is correct for security (server-authoritative profile resolution) but wasteful when 15 requests arrive within milliseconds of each other for the same user and profile.

**Consequences:**
- 15x redundant Supabase Auth and DB queries per batch scoring
- Supabase free tier has limited edge function invocations (500K/month) -- parallel scoring burns through this faster
- Total wall-clock time for batch scoring includes 15 serial edge function cold starts
- Supabase Postgres connection pool may be exhausted on free tier (limited concurrent connections)

**Prevention:**
- **Option A (recommended): Batch endpoint.** Create a new edge function `score-proxy-batch` that accepts `{ listing_ids: number[] }` in a single request. Auth and profile resolution happen once. The edge function then calls the backend with all listing IDs in one request. The backend handles parallelization internally.
- **Option B: Backend batch endpoint.** Keep the existing edge function but add a `POST /score/batch` endpoint to the backend that accepts multiple listing IDs, resolves Flatfox data and Claude scoring in parallel with semaphore, and returns all results in one response.
- **Option C: Client-side caching.** The extension caches the JWT and profile preferences locally (already available from popup `getSession` and `getProfiles`), sends them with each request to avoid redundant edge function lookups. This trades security (client-trusted preferences) for efficiency -- NOT recommended for production but acceptable for hackathon.

**Detection:**
- Supabase dashboard shows spike in edge function invocations (15x expected)
- Edge function logs show 15 identical `getUser()` + `profiles.select()` queries within 1 second
- Supabase Postgres "Active connections" metric spikes during batch scoring

**Phase to address:** Parallel scoring phase -- design the batch API before implementing parallel requests in the extension.

---

### Pitfall 6: Flatfox Color Scheme Rebranding Breaks Extension Badge Visibility

**What goes wrong:**
The UI redesign adopts Flatfox-esque colors for the web app. The temptation is to also update extension badge colors to match. The extension's `ScoreBadge` and `SummaryPanel` are injected into the Flatfox page via Shadow DOM. If badge background colors are changed to match Flatfox's own blue/teal palette, badges become invisible or camouflaged against Flatfox's listing cards. The badges' purpose is to stand out from the host page, not blend in. Similarly, if the web app's primary color changes from `hsl(342 89% 40%)` (current magenta/rose) to Flatfox's blue, all shadcn components change color simultaneously -- buttons, links, focus rings, chart colors.

**Why it happens:**
"Flatfox-esque" is ambiguous. The web app should look polished and thematically related to Flatfox for B2B credibility. But the extension badges need visual distinction from the host page. These are conflicting design goals that are easy to blur.

**Consequences:**
- Extension badges invisible on Flatfox pages if colors match the host site
- Web app buttons and interactive elements lose visual distinction from non-interactive text
- Dark mode colors need independent tuning (Flatfox doesn't have dark mode; the web app does)

**Prevention:**
- Define TWO color palettes: one for the web app (Flatfox-inspired but distinct) and one for extension badges (current emerald/blue/amber/gray tier colors that contrast with Flatfox's white/blue cards)
- The web app theme change is purely CSS variable updates in `globals.css` -- change `:root` and `.dark` HSL values. Do NOT touch `TIER_COLORS` in `extension/src/types/scoring.ts`
- Before deploying the new color scheme, screenshot the extension badges ON a Flatfox search page to verify contrast meets WCAG AA (4.5:1 ratio for text)
- Test both light and dark mode for the web app; test the extension ONLY on Flatfox (no dark mode to worry about)

**Detection:**
- Extension badges are hard to see on Flatfox listing cards
- Badge text fails WCAG contrast check
- Web app buttons are the same color as Flatfox's native buttons, causing confusion about which site the user is on

**Phase to address:** UI redesign phase -- define color palettes as the FIRST task, before any CSS changes.

---

## Moderate Pitfalls

### Pitfall 7: Chrome Extension Download Page Promises "Install" but Delivers Developer Mode Sideloading

**What goes wrong:**
The website adds a "Download Extension" section. Users click the download button expecting a one-click install experience like the Chrome Web Store. Instead they get a `.zip` file with instructions to: (1) extract the zip, (2) open `chrome://extensions`, (3) enable "Developer mode", (4) click "Load unpacked", (5) navigate to the extracted folder. On macOS, the zip might auto-extract to the Downloads folder; on Windows, it stays zipped. Non-technical users (property managers at Bellevia) fail at step 3. Chrome shows a yellow banner "Disable developer mode extensions" periodically, alarming users.

**Why it happens:**
Without a Chrome Web Store listing (which requires a $5 developer registration, review process, and public listing), sideloading is the only distribution option. The Chromium project explicitly blocks CRX installs from non-Web Store sources on Windows and macOS since Chrome 33/44. Enterprise policy deployment is an option but requires Google Workspace admin access that the pilot customer may not grant.

**Consequences:**
- Pilot customer (Bellevia) cannot install the extension without hands-on support
- Chrome's "Disable developer mode extensions" popup undermines user trust
- Extension is removed if user clicks "Disable" on Chrome's warning
- Auto-updates are impossible without Web Store -- every version requires manual reinstall

**Prevention:**
- **Publish to Chrome Web Store as "Unlisted"** -- only users with the direct link can find it. $5 one-time developer registration. Review takes 1-3 business days. This is the correct solution for B2B pilot distribution.
- If Web Store is not an option for timeline reasons: create a detailed visual guide (screenshots) on the download page showing each sideloading step. Include a warning about the developer mode banner.
- Package the extension as a `.zip` (not `.crx`) since Chrome blocks CRX installs from non-Store sources
- Add a "Check Extension Installed" feature on the website that tries `chrome.runtime.sendMessage()` to detect if the extension is present, and shows different UI accordingly
- Consider creating a video walkthrough for the install process

**Detection:**
- Users report they "downloaded but nothing happened"
- Support requests about "developer mode" warnings
- Extension silently disappears from users' browsers after Chrome update

**Phase to address:** Chrome extension distribution phase -- decide Web Store unlisted vs sideloading BEFORE building the download page.

---

### Pitfall 8: Chat-Generated Dynamic Fields Create Schema Mismatch Between Web, Backend, and Extension

**What goes wrong:**
The chat produces dynamic preference fields like `{ name: "quiet_street", description: "On a quiet residential street", importance: "critical" }`. This is a new data shape not present in v1.1's canonical schema. The web app Zod schema (`preferencesSchema`), the backend Pydantic model (`UserPreferences`), and the extension's understanding of preferences all need to understand this new shape. If the web app saves dynamic fields to the `preferences` JSONB but the backend's `UserPreferences` model has `extra="ignore"` (which it currently does), the dynamic fields are silently dropped during `model_validate()`. Claude never sees them. The user added 5 custom criteria via chat, but scoring ignores all of them.

**Why it happens:**
The v1.1 schema unification was a major effort to align web, backend, and extension. Dynamic fields introduce a new dimension that must be added to ALL three layers simultaneously. The backend's `extra="ignore"` config was a deliberate safety measure to handle old-format JSONB -- but it now actively defeats the purpose of dynamic fields.

**Consequences:**
- Dynamic fields stored in Supabase but ignored by scoring
- No error message -- silent data loss through `extra="ignore"`
- Users who rely on chat-generated preferences get worse scores than users who manually configure the form
- The chat feature appears broken even though the data is saved correctly

**Prevention:**
- Add `dynamic_fields: list[DynamicField] = Field(default_factory=list)` to the backend `UserPreferences` model BEFORE the web app starts saving dynamic fields
- Add the same field to the Zod schema: `dynamicFields: z.array(dynamicFieldSchema).default([])`
- Update the Claude prompt template to render dynamic fields with their importance levels
- Write an integration test: save preferences with dynamic fields via the web app, trigger scoring, assert Claude's response references at least one dynamic field
- The extension does not need to generate dynamic fields (it uses the web for preferences), but it should pass through whatever `preferences` JSONB the edge function provides without filtering

**Detection:**
- Backend logs show `UserPreferences` parsing with warnings about ignored fields (if logging is enabled for Pydantic)
- Claude's response checklist contains only the original `features` and `softCriteria`, not dynamic fields
- Supabase `profiles.preferences` JSONB has `dynamicFields` array but backend response does not reference them

**Phase to address:** Schema extension phase -- must be completed across all layers BEFORE the chat UI starts generating dynamic fields.

---

### Pitfall 9: Parallel Scoring Fires Multiple Flatfox HTML Page Fetches That Get Rate-Limited

**What goes wrong:**
Each scoring request fetches listing data from `flatfox.ch/api/v1/public-listing/{pk}/` (JSON) AND scrapes the HTML detail page at `flatfox.ch/en/flat/{slug}/{pk}/` for image URLs. With 15 parallel requests, the backend makes 15 concurrent API calls AND 15 concurrent HTML page fetches to Flatfox. Flatfox is a Swiss startup, not a hyperscale platform -- their rate limiting kicks in after 10-20 rapid requests from the same IP. The HTML page fetches start returning 429 or connection timeouts. Image URL extraction fails gracefully (returns empty list), so scoring falls back to text-only -- but the user doesn't know images were dropped. Scores decrease because the condition category loses visual input, and users think the property is worse than it is.

**Why it happens:**
The `FlatfoxClient` uses `httpx.AsyncClient` with no rate limiting. The image URL extraction creates a NEW `httpx.AsyncClient` for each call (see `get_listing_image_urls()` line 84: `async with httpx.AsyncClient(timeout=15.0) as html_client`). 15 concurrent new HTTP connections to Flatfox's servers from the same EC2 IP address.

**Consequences:**
- Flatfox may temporarily block the EC2 IP
- Image-enhanced scoring silently degrades to text-only with no user notification
- Scores appear lower than expected because condition/features categories lack visual data
- If Flatfox blocks the API endpoint too, the entire batch fails

**Prevention:**
- Add a semaphore to `FlatfoxClient`: `self._semaphore = asyncio.Semaphore(3)` and wrap both `get_listing()` and `get_listing_image_urls()` with `async with self._semaphore:`
- Reuse a single `httpx.AsyncClient` for HTML page fetches instead of creating a new one per call -- add a separate `_html_client` to `FlatfoxClient`
- Add a small delay (200-500ms) between Flatfox requests within the semaphore to stay well under rate limits
- Log when image URL extraction falls back to empty (currently only logged at DEBUG level) -- promote to WARNING so the degradation is visible
- Consider caching Flatfox listing data and image URLs for 1 hour in memory (listings don't change frequently)

**Detection:**
- Backend logs show "Could not fetch images for listing" for multiple listings in a batch
- Scoring results show no image-based observations in the condition category reasoning
- Flatfox API returns 429 status codes (visible in backend logs)
- Score variance: same listing scored at different times gets different scores because images were available one time but not another

**Phase to address:** Parallel scoring phase -- add Flatfox rate limiting BEFORE enabling parallel requests.

---

### Pitfall 10: UI Redesign Touches globals.css Variables and Breaks Extension Popup Styles

**What goes wrong:**
The extension popup (`extension/src/entrypoints/popup/`) uses its own styles but may import shared utilities or Tailwind classes that reference CSS variables. The web app UI redesign changes the HSL values in `globals.css` for the new Flatfox-inspired theme. If the extension's Tailwind configuration or CSS references the same variable names (e.g., `--primary`, `--background`), and the extension build picks up web app CSS somehow (shared `tailwind.config` or `@import`), the popup renders with wrong colors. More subtly: if the extension and web app share a `tailwind.config` or CSS preset, changing the web app theme changes the extension theme unintentionally.

**Why it happens:**
The extension uses WXT with its own build pipeline, but developers might create shared configuration files for consistency. Even if the extension has independent CSS, a refactor during the UI redesign could accidentally introduce a shared dependency.

**Consequences:**
- Extension popup has wrong background or text colors after web app theme change
- Badge injection styles are unaffected (Shadow DOM isolates them) but popup is broken
- Discovered late because developers test the web app in browser, not the extension popup

**Prevention:**
- Verify that the extension's Tailwind/CSS configuration is completely independent from the web app's `globals.css`
- After any web app CSS changes, rebuild the extension (`cd extension && npm run build`) and verify popup appearance
- Keep the extension's color tokens in `extension/src/entrypoints/content/style.css` and `extension/src/entrypoints/popup/` -- never import from `web/src/`
- Add extension popup visual check to the post-redesign verification checklist

**Detection:**
- Extension popup background is wrong color after web app theme deployment
- Extension popup text is unreadable (wrong contrast) after CSS variable changes
- Only discovered when testing extension after web app deployment

**Phase to address:** UI redesign phase -- verify extension independence BEFORE committing CSS variable changes.

---

## Minor Pitfalls

### Pitfall 11: Chat UI Does Not Handle Claude API Errors Gracefully

**What goes wrong:**
The chat-based preference discovery calls the Claude API (likely via a new backend endpoint or directly from the web app via Vercel API route). If the Claude API returns an error (rate limit, timeout, server error), the chat shows a generic error or hangs. Users cannot retry the failed message. The conversation state becomes corrupted if a partial response was streamed.

**Prevention:**
- Implement retry with exponential backoff for transient errors (429, 500, 503)
- Show a "Message failed to send. Retry?" button on the specific message that failed
- If streaming is used, handle partial responses by discarding incomplete JSON
- Set a 30-second timeout on the chat API call (Claude responses for text-only preference extraction should complete in 5-10 seconds)

---

### Pitfall 12: Extension Download Page Shows Install Instructions for Wrong Platform

**What goes wrong:**
The download page shows generic instructions, but the sideloading process differs between Windows, macOS, and Linux. Showing macOS screenshots to a Windows user causes confusion. Linux users can install CRX files directly but may not know this.

**Prevention:**
- Detect the user's platform via `navigator.platform` or `navigator.userAgentData.platform` and show platform-specific instructions
- Provide a fallback "Show all platforms" toggle for edge cases
- If going the Web Store unlisted route, platform detection is unnecessary (Web Store handles it)

---

### Pitfall 13: Parallel Scoring Results Arrive Out of Order, Confusing Badge Display

**What goes wrong:**
With parallel scoring, results arrive at different times (some listings score faster than others). The FAB shows "Scoring 3/15..." but the numbered sequence does not match the visual order of listings on the page. A badge appears for listing #7 before listing #1, creating a jumpy, confusing visual experience.

**Prevention:**
- Show loading skeletons for ALL listings immediately when scoring starts (already done in current code via `injectBadge()`)
- Use the `onResult` callback pattern (already in `scoreListings()`) to progressively replace skeletons with scores as results arrive
- Do NOT sort or reorder the page; let results fill in naturally
- Show a total progress counter on the FAB: "3 of 15 scored" regardless of order

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Chat preference discovery | Overwrites standard fields (Pitfall 1) | Merge-save pattern; separate standard vs dynamic fields |
| Chat preference discovery | Loses conversation on navigation (Pitfall 4) | sessionStorage persistence or single-shot approach |
| Dynamic schema fields | Backend ignores dynamic fields (Pitfall 8) | Update Pydantic model BEFORE web app generates fields |
| Dynamic schema fields | Scoring prompt doesn't weight them (Pitfall 3) | Extend prompt template and response model |
| Parallel scoring | Claude API rate limits (Pitfall 2) | Backend semaphore limiting concurrent Claude calls to 3 |
| Parallel scoring | Edge function redundant work (Pitfall 5) | Batch endpoint design |
| Parallel scoring | Flatfox rate limiting (Pitfall 9) | Flatfox client semaphore + connection reuse |
| UI redesign | Badge visibility on Flatfox (Pitfall 6) | Separate web app and extension color palettes |
| UI redesign | Extension popup color breakage (Pitfall 10) | Verify CSS independence; rebuild extension after web changes |
| Extension distribution | Sideloading UX confusion (Pitfall 7) | Chrome Web Store unlisted listing |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Chat output -> preferences save | `UPDATE profiles SET preferences = $chat_output` (full replace) | `UPDATE profiles SET preferences = preferences || $chat_dynamic_fields` (JSONB merge of only dynamic fields) |
| Dynamic fields -> backend scoring | `UserPreferences(extra="ignore")` silently drops unknown fields | Add `dynamic_fields: list[DynamicField]` to model before chat generates them |
| Dynamic fields -> Claude prompt | Cramming dynamic fields into `softCriteria: string[]` | Render as separate prompt section with importance levels |
| Parallel extension requests -> edge function | 15 separate edge function calls, each resolving same profile | Batch endpoint: one call, one auth check, one profile resolution, multiple listing IDs |
| Parallel backend requests -> Claude API | Unbounded `asyncio.gather()` for 15 Claude calls | `asyncio.Semaphore(3)` wrapping each Claude API call |
| Parallel backend requests -> Flatfox | 15 concurrent HTML page scrapes from same IP | `asyncio.Semaphore(3)` + connection reuse in FlatfoxClient |
| Web app CSS variables -> extension | Shared Tailwind config or CSS imports across projects | Fully independent CSS configurations; verify after web theme change |
| Extension `.zip` distribution | Hosting `.crx` file for download | CRX blocked on Windows/macOS since Chrome 33/44; use `.zip` + sideloading or Web Store unlisted |
| Flatfox color scheme -> web app | Adopting exact Flatfox colors | Flatfox-**inspired** palette with distinct primary to maintain brand identity |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 15 parallel Claude API calls with images | 429 rate limit errors; partial batch results | Backend semaphore(3); extension concurrency pool | At 10+ concurrent listings on Tier 1/2 |
| 15 parallel Flatfox HTML scrapes | Image extraction fails silently; text-only scoring | FlatfoxClient semaphore(3); reuse HTTP client | At 10+ concurrent scrapes from same IP |
| 15 edge function invocations for same user | 15x redundant auth + profile DB queries | Batch endpoint with single auth/profile resolution | Every parallel scoring batch |
| Chat conversation history accumulation | Token costs compound per turn; 10-turn = ~10K tokens | Limit to 5 turns; or use single-shot approach | At 8+ conversation turns |
| Full preferences replace on chat save | No performance issue, but data loss | JSONB merge instead of replace | Every chat preference save |

---

## Security Considerations

| Concern | Risk | Prevention |
|---------|------|------------|
| Chat endpoint exposed without rate limiting | Attacker spams chat endpoint consuming Claude API credits | Rate limit chat endpoint to 10 requests/minute per user |
| Dynamic fields contain injection attempts | User crafts dynamic field name that manipulates Claude prompt | Sanitize dynamic field names/descriptions; max 100 chars per field; max 10 fields |
| Batch scoring endpoint without per-user limits | Single user triggers batch scoring for 100+ listings | Limit batch size to 20 listing IDs per request |
| Extension .zip downloaded over HTTP | MITM attack replaces extension code | Serve from HTTPS (Vercel does this automatically) |
| Chat conversation stored in localStorage | Another extension or XSS attack reads preference data | Use sessionStorage (cleared on tab close) or encrypt with user token |

---

## "Looks Done But Isn't" Checklist

- [ ] **Chat preference save:** Dynamic fields saved to Supabase -- verify standard fields (budget, rooms, location) are UNCHANGED after chat save by comparing JSONB before and after
- [ ] **Dynamic fields in scoring:** Backend receives dynamic fields -- verify by checking Claude's response references at least one dynamic field by name
- [ ] **Parallel scoring concurrency:** 15 listings scored -- verify no 429 errors in backend logs and all 15 badges show scores (not partial errors)
- [ ] **Flatfox rate limiting:** 15 listings scored -- verify image URLs extracted for all 15 (not falling back to text-only due to rate limits)
- [ ] **Edge function efficiency:** Batch scoring triggered -- verify Supabase dashboard shows 1 edge function invocation (batch) not 15 separate invocations
- [ ] **Badge visibility:** Extension installed on Flatfox -- take screenshot and verify badge colors contrast with Flatfox card background
- [ ] **Extension popup after redesign:** Web app CSS changed -- rebuild extension and verify popup colors are correct
- [ ] **Chat error handling:** Disconnect network during chat -- verify retry button appears, conversation state preserved
- [ ] **Extension install experience:** Follow download page instructions on a clean Chrome profile -- complete install in under 3 minutes
- [ ] **Conversation persistence:** Start chat, navigate to profiles page, return to chat -- verify conversation is restored

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Chat overwrites standard fields (Pitfall 1) | MEDIUM | Restore preferences from Supabase audit log or backup; implement merge-save; re-save affected profiles |
| Claude API rate limit kills batch (Pitfall 2) | LOW | Add semaphore; retry failed listings individually; no data loss |
| Dynamic fields ignored by backend (Pitfall 8) | MEDIUM | Add fields to Pydantic model; redeploy; re-score listings; existing analyses are text-only quality |
| Flatfox blocks EC2 IP (Pitfall 9) | HIGH | Contact Flatfox; wait for rate limit reset (usually 1 hour); add semaphore; consider rotating IP via proxy |
| Extension sideloading fails for pilot user (Pitfall 7) | MEDIUM | Schedule screen-share to walk through install; fast-track Web Store unlisted submission |
| Web app theme breaks extension popup (Pitfall 10) | LOW | Revert CSS variables for extension; rebuild; 15-minute fix |
| Chat conversation lost on navigation (Pitfall 4) | LOW | Implement sessionStorage persistence; user re-enters preferences; 30-minute fix |

---

## Sources

- [Rate limits - Claude API Docs](https://platform.claude.com/docs/en/api/rate-limits) -- HIGH confidence (official Anthropic documentation; Tier 1 = 50 RPM, Tier 2 = 1000 RPM, image tokens ~1334 per 1000x1000)
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits) -- HIGH confidence (official; 150s timeout, 2s CPU time, isolated V8 per invocation)
- [Use alternative installation methods - Chrome Extensions](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions) -- HIGH confidence (official Chrome docs; CRX blocked on Windows/macOS; sideloading requires developer mode)
- [Self-host for Linux - Chrome Extensions](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux) -- HIGH confidence (official; Linux is only platform allowing non-Store CRX install)
- [Tailwind CSS v4 Migration](https://tailwindcss.com/blog/tailwindcss-v4) -- HIGH confidence (official; CSS-first configuration, @theme directive)
- [zod-dynamic-schema (GitHub)](https://github.com/techery/zod-dynamic-schema) -- MEDIUM confidence (community library for dynamic Zod schemas with LLM structured outputs)
- [Dynamic pydantic models (Medium)](https://itracer.medium.com/dynamic-pydantic-models-ac91e8acedcd) -- MEDIUM confidence (community pattern for runtime model creation)
- [FastAPI concurrency and asyncio.Semaphore patterns](https://medium.com/@reesel/build-faster-more-reliable-fastapi-apps-with-concurrency-e726784a0299) -- MEDIUM confidence (community best practice for external API rate limiting)
- [Rate Limiting AI APIs with Async Middleware in FastAPI 2026](https://dasroot.net/posts/2026/02/rate-limiting-ai-apis-async-middleware-fastapi-redis/) -- MEDIUM confidence (community tutorial, recent)
- Direct codebase analysis: `extension/src/lib/api.ts` (sequential scoring), `backend/app/services/claude.py` (no semaphore), `backend/app/services/flatfox.py` (new HTTP client per image fetch), `backend/app/models/preferences.py` (extra="ignore"), `backend/app/prompts/scoring.py` (hardcoded 5 categories), `supabase/functions/score-proxy/index.ts` (single-request design), `web/src/app/globals.css` (CSS variables), `extension/src/types/scoring.ts` (TIER_COLORS independent) -- HIGH confidence (direct evidence)

---
*Pitfalls research for: HomeMatch v2.0 -- Chat-based preferences, dynamic schema fields, parallel scoring, UI redesign, Chrome extension distribution*
*Researched: 2026-03-15*
