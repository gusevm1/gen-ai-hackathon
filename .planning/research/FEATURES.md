# Feature Research

**Domain:** Chrome extension — AI-powered property listing scorer overlaid on existing property portal
**Researched:** 2026-03-07
**Confidence:** MEDIUM (ecosystem well-understood; AI scoring overlay is a novel combination with few direct competitors)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of listing-overlay extensions assume exist. Missing any of these makes the product feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Score badge on each listing card | Core value prop — without it nothing works; JobRight, Area360, Property Picker all do this | MEDIUM | Shadow DOM injection required to avoid breaking Homegate CSS. Badge must survive DOM mutations when Homegate re-renders the list (use MutationObserver). |
| Visible loading state per badge | Users need to know scoring is in-progress, not broken | LOW | Spinner or skeleton badge placeholder while LLM call is pending. Render placeholder immediately on page load. |
| Expandable score breakdown | Without "why", a number is meaningless and untrustworthy | MEDIUM | Expand inline below/beside the listing card. Show weighted category breakdown + bullet-point reasons. Collapse on second click. |
| Preference profile storage | Extension must remember user settings across sessions | LOW | `chrome.storage.local` — no server needed, no login required. JSON blob. |
| Onboarding flow for new users | No preferences = no scores; extension is useless without setup | MEDIUM | Full-page tab opened on install via `chrome.runtime.onInstalled`. Multi-step wizard, not a popup (too cramped for 10+ preference categories). |
| On/Off toggle | Users need to disable scoring when they don't want it (performance, privacy) | LOW | Popup dashboard with toggle. Store state in `chrome.storage.local`. Content script checks state on load. |
| Score persistence across page refresh | Re-scoring every page refresh is slow and expensive | MEDIUM | Cache scores keyed by listing ID + profile hash in `chrome.storage.local`. TTL of a few hours to catch price changes. |
| Honest "no data" signal | Listing may omit floor, year built, proximity data — guessing erodes trust | LOW | LLM prompt explicitly instructs "I don't know" output. UI renders this as a neutral indicator, not a negative score. |

### Differentiators (Competitive Advantage)

Features that separate HomeMatch from generic property data overlays (Area360, PropertyData) and the JobRight model applied to real estate.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable importance weights per category | Different users have different priorities — a family weights schools differently than an investor; competitors use fixed metrics | MEDIUM | Sliders or ranked list in onboarding, editable from popup. Weights feed directly into LLM prompt and score calculation. Avoid free-form number entry — sliders or Low/Medium/High/Critical chips reduce errors. |
| Soft-criteria evaluation via LLM knowledge | Hard filters (rooms, price) are already on Homegate; the gap is "proximity to good schools, tax canton, walkability" — criteria the LLM can reason about | HIGH | LLM uses its knowledge base + listing description text for soft criteria. Must explicitly flag when reasoning is uncertain (canton tax rates change; LLM knowledge is dated). |
| Multi-language analysis matching listing language | Swiss portals serve DE/FR/IT; analysis in the user's listing language builds trust | MEDIUM | Pass listing language detection to LLM prompt. Claude handles DE/FR/IT natively. Cost: no extra step, just prompt instruction. |
| Background fetch (no tab opening) | Competitor tools require clicking into each listing; HomeMatch fetches detail pages invisibly | HIGH | Service worker fetch() to listing detail URL. Parse description + specs from HTML response. CORS not an issue for extensions with `host_permissions`. Rate limiting is the risk — must throttle batch fetches. |
| Progressive badge reveal as scores arrive | Users can start acting on high-scoring listings before all results are scored | MEDIUM | Badges appear one by one as each LLM call resolves. Shows "pending" state for unresolved ones. Avoids blocking the whole page waiting for 20 simultaneous LLM calls. |
| Homegate filter pre-fill from profile | Saves setup time; keeps extension filters in sync with Homegate built-in filters | MEDIUM | Content script finds Homegate filter form fields by selector and dispatches synthetic input events. Fragile — selectors break on Homegate DOM updates. Treat as enhancement, not dependency. |
| Transparent reference to listing text | Score reasons cite actual phrases from the listing description, not generic observations | MEDIUM | LLM prompt instructs quoting relevant listing text. Increases trust; reduces "where did that come from?" confusion. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like obvious additions but create significant problems in a hackathon context or damage user trust.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time streaming score text (typewriter effect) | Feels dynamic and impressive | Streaming adds complexity to the service worker → content script message pipeline. For a score + short bullets, latency is <3s — streaming gains nothing. Adds flicker/reflow to the listing card. | Complete score rendering: show spinner, reveal full breakdown at once when response arrives |
| Image analysis of listing photos | Photos reveal condition, view, renovation quality that text misses | Massively increases token cost and latency. Claude vision needs images downloaded and base64 encoded per listing. 10 listings = 10x photo bundles. Not feasible in hackathon timeline. | Text-only for v1; explicitly tell LLM to note when photo-dependent criteria can't be assessed |
| Multiple user profiles (broker use case) | Brokers serve multiple clients with different criteria | Profile switching UX doubles onboarding surface area; backend would need profile IDs. Breaks the "no accounts" constraint. | Single profile per extension install; brokers use separate Chrome profiles |
| Save/bookmark listings with scores | Useful for shortlisting | Requires separate storage model, list UI, sync logic. Scope creep. | User can use Homegate's own saved listings feature |
| Historical price tracking | Investors want price change data | Requires crawl history database — violates "thin backend, no database" constraint | Area360 and PropertyData already do this; HomeMatch doesn't compete here |
| Auto-scroll and auto-load scores for all pages | Users want everything scored automatically | Makes extension appear as bot traffic to Homegate. Risks IP/account blocking. | Score only listings visible in current viewport, triggered by user scroll |
| Gamified score explanations ("You're 87% compatible!") | Feels engaging | Anthropomorphizes what is a technical evaluation; undermines trust when scores are wrong | Factual framing: "87% match — 3 criteria met, 1 uncertain, 1 missed" |
| Push notifications for new matching listings | High-value for active searchers | Requires background polling even when browser is closed — not possible in MV3 service workers without open tab; requires server-side monitoring | Out of scope; if demand validated, would need separate alerting service |

---

## Feature Dependencies

```
[Preference Profile (onboarding)]
    └──required by──> [Score Badge Injection]
                          └──required by──> [Expandable Score Breakdown]
                          └──required by──> [Progressive Score Loading]

[Background Fetch (detail pages)]
    └──required by──> [LLM Scoring]
                          └──required by──> [Score Badge Injection]

[Configurable Weights]
    └──enhances──> [LLM Scoring]  (weights shape the prompt and score calculation)

[Homegate Filter Pre-fill]
    └──depends on──> [Preference Profile]
    └──independent of──> [Score Badge Injection]  (different feature, different selector logic)

[Score Persistence / Cache]
    └──enhances──> [Score Badge Injection]  (badges appear instantly on repeat visits)
    └──requires──> [Preference Profile hash]  (invalidate cache when profile changes)

[Multi-language Analysis]
    └──requires──> [LLM Scoring]  (language is a prompt parameter)
    └──independent of──> [Score Badge Injection UX]

[On/Off Toggle]
    └──controls──> [Score Badge Injection]  (content script checks toggle state on load)
    └──controls──> [Background Fetch]  (skip fetching if disabled)
```

### Dependency Notes

- **Score Badge Injection requires LLM Scoring**: Badges are the display layer; LLM evaluation is the data layer. These are the non-negotiable core loop.
- **LLM Scoring requires Background Fetch**: Homegate search results cards contain minimal data (price, rooms, area). The LLM needs the full listing description from the detail page to evaluate soft criteria. Background service worker fetch() is the only way to get this without opening tabs.
- **Background Fetch requires Preference Profile**: Fetch is triggered when a page load is detected and scoring is enabled. Without a profile, there is nothing to score against.
- **Filter Pre-fill is independent of scoring**: Can be shipped separately or removed without affecting the core loop. Treat as enhancement.
- **Score Cache invalidates on profile change**: Cache key must include a hash of the user profile. Weight changes = new scores required.

---

## MVP Definition

### Launch With (v1)

Minimum viable product to demonstrate value at hackathon demo.

- [ ] **Onboarding wizard** — full-page tab with step-by-step preference setup (location, buy/rent, budget, rooms, area, features, custom soft criteria, weight configuration). Cannot score without this.
- [ ] **Preference profile in chrome.storage.local** — JSON blob; no server, no auth. Foundation for everything.
- [ ] **Score badge injection on Homegate search results** — Shadow DOM, MutationObserver for dynamic list updates. This is the visible demo moment.
- [ ] **Loading skeleton badges** — Appear immediately as placeholders while LLM calls are in flight. Eliminates "is it broken?" confusion.
- [ ] **Background fetch of listing detail pages** — Service worker fetch() for each visible listing card. Throttled to avoid flooding.
- [ ] **LLM evaluation against profile** — Claude API call via EC2 proxy. Prompt includes listing data, user profile, weights, language instruction, and "I don't know" instruction.
- [ ] **Expandable score breakdown** — Inline panel below/beside each card. Category scores + bullet reasoning + listing text references. Collapses on click.
- [ ] **Extension popup dashboard** — Profile summary, on/off toggle, "Edit preferences" link. Compact, not the primary UI.

### Add After Validation (v1.x)

Features to add if hackathon demo gets traction or after first real-user feedback.

- [ ] **Score cache with TTL** — Add when repeat page visits become common. Reduces LLM costs substantially.
- [ ] **Homegate filter pre-fill** — Add when users report friction in initial Homegate setup. Selector-fragile so defer until Homegate DOM is stable in testing.
- [ ] **Profile edit flow** — Re-entry into onboarding wizard from popup "Edit" link. Add once profile is established and users want to iterate.
- [ ] **Score cache invalidation on profile change** — Required alongside profile editing feature.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multiple Chrome profiles for brokers** — Needs profile-switching UX and backend session model.
- [ ] **Other Swiss property portals (ImmoScout24, Comparis)** — Architecture should be extensible but do not build v1 for multiple targets.
- [ ] **Image analysis** — Only when token costs are acceptable and listing photo quality is validated as meaningful signal.
- [ ] **Alerting for new listings** — Requires server-side monitoring infrastructure.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Score badge injection | HIGH | MEDIUM | P1 |
| Preference profile + onboarding | HIGH | MEDIUM | P1 |
| LLM scoring via EC2 proxy | HIGH | MEDIUM | P1 |
| Background fetch of detail pages | HIGH | HIGH | P1 |
| Loading skeleton badges | HIGH | LOW | P1 |
| Expandable score breakdown | HIGH | MEDIUM | P1 |
| Configurable weights in onboarding | HIGH | MEDIUM | P1 |
| Extension popup toggle | MEDIUM | LOW | P1 |
| Progressive badge reveal | MEDIUM | LOW | P1 |
| Multi-language analysis | MEDIUM | LOW | P1 (LLM prompt only — no extra work) |
| Honest "I don't know" output | HIGH | LOW | P1 (prompt instruction only) |
| Score cache with TTL | MEDIUM | MEDIUM | P2 |
| Homegate filter pre-fill | LOW | MEDIUM | P2 |
| Profile edit flow | MEDIUM | MEDIUM | P2 |
| Multiple profiles | LOW | HIGH | P3 |
| Image analysis | MEDIUM | HIGH | P3 |
| Cross-portal support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (hackathon demo)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Direct competitors in the "listing overlay + score" space are sparse for property portals. The closest analogues are:

| Feature | JobRight.ai (job listings) | Area360 / PropertyData (UK property) | HomeMatch (target) |
|---------|----------------------------|---------------------------------------|--------------------|
| Match score badge on listing cards | Yes — percentage match badge | No — raw metric overlays (price/sqft, EPC) | Yes — AI match % |
| AI-generated reasoning | Yes — bullet-point fit reasons | No — factual data only | Yes — weighted category breakdown |
| User preference profile | Yes — resume + job criteria | No — no user profile concept | Yes — full preference wizard with weights |
| Configurable importance weights | Implicit (resume is the profile) | No | Yes — explicit sliders per category |
| Background data enrichment | Loads from their own database | Fetches from PropertyData API | Fetch from listing detail page directly |
| Language localization | English only | English only | DE/FR/IT matching listing language |
| Filter pre-fill on host site | No (autofill for application forms) | No | Yes — Homegate filter pre-population |
| Honest uncertainty signaling | Partial (confidence indicators) | N/A | Yes — explicit "I don't know" for missing data |
| Progressive loading | No — all scores at once | N/A | Yes — badges appear as each scores |

**Key insight:** No direct competitor applies AI match scoring with user-defined weighted preferences to property listing overlays. The JobRight UX pattern (score badge + expandable bullet reasons) is the right model; the property-specific execution (Swiss portals, multi-language, soft criteria via LLM knowledge) is the differentiation.

---

## UX Pattern Notes

### Badge Injection

Use Shadow DOM via WXT `createShadowRootUi` or Plasmo's content script UI pattern. This isolates HomeMatch CSS from Homegate's stylesheet and prevents breakage. Position badges using absolute positioning relative to each listing card's container element. Use MutationObserver to re-inject badges when Homegate's React/Vue framework re-renders the listing list (e.g., after filter changes or infinite scroll).

**Confidence:** HIGH — Shadow DOM isolation for content script UI is the documented best practice per Plasmo and WXT frameworks, verified against official Chrome extension documentation.

### Progressive Loading

Do NOT wait for all listings to score before showing any badges. The sequence:

1. Content script detects listing cards on page load
2. Immediately inject skeleton placeholder badges (grey spinner or shimmer)
3. For each card, send a message to service worker: "fetch and score listing X"
4. Service worker fetches detail page, extracts text, calls EC2 proxy → Claude
5. Score response arrives: service worker sends message back to content script
6. Content script replaces skeleton badge with real score badge for that listing
7. Repeat until all visible listings are scored

Throttle service worker fetches to 2-3 concurrent to avoid rate limiting from Homegate.

**Confidence:** MEDIUM — pattern derived from LLM streaming UX best practices and general async extension patterns; no direct property-extension precedent found.

### Expandable Analysis Panel

Expand inline below the listing card — not in a sidebar (sidebars require constant screen real estate and fight with Homegate's own UI). Use a CSS transition for smooth reveal. Panel contains:
- Category scores (grid of chips: Location 9/10, Budget 8/10, Features 6/10, Soft Criteria 7/10)
- Bullet-point reasoning per category
- Quoted text from listing description where relevant
- Neutral indicator for criteria where data was unavailable

Clicking the badge or an expand chevron toggles the panel. Only one panel open at a time (collapsing others reduces visual clutter).

**Confidence:** MEDIUM — derived from Area360 sidebar approach and PropertyData overlay patterns; inline panel is the adaptation for listing card context.

### Onboarding Wizard

Open a new full-page tab on install (`chrome.runtime.onInstalled → chrome.tabs.create`). Multi-step wizard with visible step indicator. Group related preferences into themed screens (location, property type + budget, features, soft criteria, weight configuration). Allow back-navigation without losing data (autosave to `chrome.storage.local` on each step). Complete wizard writes final profile JSON to storage and closes tab, redirecting user to Homegate.ch.

Keep steps to 5-7 screens max. Beyond that, completion rates drop sharply (validated by extension UX research: 86% of users decide within first few minutes whether to keep an extension; every extra step loses users).

**Confidence:** HIGH — wizard pattern per Eleken guide; Chrome extension onboarding trigger pattern per Firefox Extension Workshop and Chrome documentation.

---

## Sources

- [JobRight Autofill Chrome Extension — Chrome Web Store](https://chromewebstore.google.com/detail/jobright-autofill/odcnpipkhjegpefkfplmedhmkmmhmoko) — JobRight match score UX model
- [Area360 Property Data — chrome-stats.com](https://chrome-stats.com/d/nlkldbkpogpeeljahilafnnbmfcmkeck) — Property overlay extension competitor analysis
- [PropertyData Browser Extension](https://propertydata.co.uk/browser-extension) — UK property data overlay UX
- [Property Investments UK — Top Property Tools 2025](https://www.propertyinvestmentsuk.co.uk/property-tools/) — Competitor landscape; traffic light scoring UX (Property Picker)
- [REI Lense Extensions](https://rei-lense.com/extensions) — Real estate analysis overlay for US portals
- [Plasmo Content Scripts UI](https://www.plasmo.com/blog/posts/content-scripts-ui) — Shadow DOM injection for isolated extension UI
- [WXT Content Script UI — DeepWiki](https://deepwiki.com/wxt-dev/wxt/5.3-content-script-ui) — createShadowRootUi pattern documentation
- [Wizard UI Pattern Explained — Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained) — Multi-step wizard UX best practices
- [15 Best Practices to Build a Browser Extension — ExtensionBooster](https://extensionbooster.com/blog/best-practices-build-browser-extension/) — Extension onboarding and performance patterns
- [Improving UX of LLM Applications through Streaming — Medium/PressW](https://medium.com/pressw/improving-user-experience-of-llm-applications-through-streaming-and-user-engagement-tricks-23d0594120c0) — Progressive loading and perceived performance for LLM calls
- [Service Workers in Chrome Extensions MV3 — Codimite](https://codimite.ai/blog/service-workers-in-chrome-extensions-mv3-powering-background-functionality/) — Background fetch architecture

---

*Feature research for: Chrome extension — AI property listing scorer (HomeMatch)*
*Researched: 2026-03-07*
