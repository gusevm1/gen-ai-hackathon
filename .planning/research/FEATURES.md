# Feature Research

**Domain:** Multi-profile SaaS tool — AI property scoring with preferences management (v1.1 milestone)
**Researched:** 2026-03-13
**Confidence:** MEDIUM-HIGH (UI patterns are well-documented; AI prompt quality from structured inputs is documented; real estate B2B multi-profile specifics are inferred from analogous SaaS patterns)

---

## Context: What Already Exists (v1.0)

This research covers ONLY the NEW features for v1.1. The following are already shipped and out of scope:

- Preferences form (filters, soft criteria, weight sliders)
- Score badges (0-100) injected on Flatfox.ch via Chrome extension
- Expandable summary panels with AI reasoning bullets
- Full analysis page with category breakdown
- Supabase auth (email/password)
- Claude-powered multi-modal scoring with image analysis

**Milestone goal:** Professional UI redesign + multi-profile management + preferences UX improvement for better Claude prompt quality. Target: demo-ready for Bellevia Immobilien pilot (Vera Caflisch, Bewirtschaftung/Erstvermietung).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of SaaS tools with multiple profiles assume exist. Missing these makes the product feel unfinished or hard to trust.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Navbar with user identity anchor | Every SaaS tool has a persistent top-level nav; the extension popup already links to the website so it must feel professional | LOW | shadcn `NavigationMenu` + `Avatar` + `DropdownMenu`. User email/initials in top-right. Nav includes: Profiles, Analysis History, Settings/Account. |
| Profile list / profile selector | Users with multiple profiles need a home screen to see and pick between them. Without this there's no way to manage the multi-profile system. | MEDIUM | Card grid or list. Each card shows: profile name, key criteria summary (city, budget, rooms), last-modified date, "Active" badge if currently selected. |
| Create new profile | Core CRUD — without this, multi-profile doesn't exist | LOW | "New Profile" CTA at top of profiles list. Opens preferences form in blank state (or optionally cloned from active profile). |
| Rename profile | Users will name profiles "Profile 1" by default and immediately want to rename them | LOW | Inline edit on profile card, or edit button opening a name field. Updates everywhere profile name appears (navbar, extension popup). |
| Delete profile with confirmation | Destructive action must be guarded; losing a profile with months of preferences is critical | LOW | Confirmation dialog: "Delete 'Zug - 3-Zimmer'? This cannot be undone." Disable delete on the only remaining profile. |
| Set active profile | The extension scores against one profile at a time; users must be able to designate which profile is "active" | LOW | "Set as active" button or implicit on-click. Active profile badge. Active profile name shown in extension popup header. |
| Profile switcher in navbar | Google/Slack model: show active profile in the nav with a dropdown to switch. Users switching profiles is a frequent action (especially B2B with multiple clients). | MEDIUM | Dropdown in navbar showing current profile name + list of other profiles + "Manage profiles" link. Switching here changes the active profile and updates extension behavior. |
| Persistent layout across pages | Professional SaaS tools don't flash or jump. Navbar, sidebar, and footer stay stable across navigation. | LOW | Next.js root layout with fixed navbar. Content area scrolls independently. |
| Empty state for profiles list | A new user or user who deleted all profiles must see clear guidance on what to do next | LOW | Illustration + "Create your first search profile" CTA. No blank white boxes. |
| Preferences form edit for existing profile | Users must be able to update preferences after initial creation — this is implicit in multi-profile | MEDIUM | Already exists for single profile. Multi-profile requires routing per profile ID. `GET /profiles/[id]/edit`. |

### Differentiators (Competitive Advantage)

Features that go beyond the expected and align with the core value: transparent AI reasoning users can trust for Swiss property decisions.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Profile name as context label for Claude | When Claude knows the profile is named "Family relocation — Zug 2026", its framing of tradeoffs becomes more relevant. The name itself is a soft prompt signal. | LOW | Include profile name in the scoring prompt preamble. No extra infrastructure — just pass `profile.name` as a field. |
| Dealbreaker vs. preference distinction in preferences form | Hinge's "this is a dealbreaker" UX pattern: users mark certain criteria as non-negotiable. Claude then treats violations as disqualifying, not just penalizing. Produces materially better scoring behavior (a listing 100CHF over budget but perfect otherwise should score differently than one 5000CHF over budget). | MEDIUM | Replace uniform weight sliders with a two-tier system: "Dealbreakers" (hard filters, shown at top) and "Weighted preferences" (sliders). Dealbreakers are passed to Claude as absolute constraints. |
| Preference category labels that map to prompt structure | Current form structure: generic text fields. Better: named categories like "Location", "Budget", "Size", "Features", "Lifestyle" with Claude prompt sections that match. When user input maps 1:1 to prompt sections, Claude reasons per-category with precision instead of blending everything. | MEDIUM | Rename/restructure preferences form sections to match the scoring rubric Claude already uses. Add a "what matters most" ordering widget (drag-to-rank or chip selection) that sets category weights. |
| Profile summary preview on preferences form | Show a natural-language summary of the profile ("Searching for a 3-4 room apartment in Zurich for CHF 2,500-3,200/month, within 15 min of Zürich HB, no ground floor") so users can verify Claude will receive the right intent. | MEDIUM | Auto-generated from form values using a simple template (no LLM needed). Updates live as form values change. Gives users confidence their preferences translate correctly. |
| Duplicate profile | B2B use case: property manager starting search for a new client similar to an existing one. Duplicate and modify is much faster than building from scratch. | LOW | "Duplicate" action on profile card. Creates "Copy of [name]" with all same values. User then renames and adjusts. |
| Analysis history scoped to profile | Users (especially B2B) want to see all analyses done under a specific profile. Provides context for decisions. | MEDIUM | Filter analyses list by profile. Already stored in Supabase, just needs profile_id as FK + query filter on analysis history page. |
| Extension popup shows active profile name | The extension is where scoring happens. Showing the active profile name in the popup ensures users don't accidentally score listings against the wrong profile. | LOW | Already have a popup. Add active profile name as a text label near the top. Requires extension to read active_profile_id from Supabase on auth. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free-text "describe your ideal apartment" field as the main input | Feels natural; users assume LLM handles it | Unstructured text creates inconsistent Claude outputs — one user writes a sentence, another writes a paragraph. Prompt quality degrades with ambiguous input. Users also forget what they wrote and can't incrementally update it. | Structured form fields with labeled categories. Optionally add a "notes / extra context" freeform field at the bottom as a supplement, not a replacement. |
| Unlimited profiles | Power users want 10+ profiles | Diminishing returns; UI complexity for listing/selecting grows fast; API costs can multiply unchecked if user triggers scoring on all profiles simultaneously | Soft cap at 5-10 profiles. If B2B demand is proven, revisit with team/organization model. |
| Real-time auto-sync of active profile to extension | Seems like seamless UX | Extension needs to poll Supabase for active profile changes, or use websockets for a Chrome extension — both are fragile and add latency to the scoring path. Current FAB trigger model is safer. | On extension popup open, fetch current active profile. On FAB click, use the profile loaded at popup-open time. Acceptable staleness for on-demand scoring. |
| Profile "themes" or color coding | Helps distinguish profiles visually | Cosmetic scope creep; color pickers are polish for v2+ | Profile names + a simple initial-based avatar (first letter of profile name in a colored circle, auto-assigned from a palette — no user input required) |
| Notification when a new listing matches a profile | High-value if it works | Requires background polling when browser is closed — not possible in MV3 service workers. Needs server-side monitoring and push notification infrastructure. | Out of scope for v1.1. Document as a future feature tied to score caching milestone. |
| Side-by-side profile comparison | Users might want to see which profile a listing scores better against | Significant UI complexity; requires scoring same listing twice (double Claude API cost if not cached); confusing display | Single-profile scoring is the correct mental model for v1.1. Show profile name on each analysis. |
| Global "reset all profiles" action | Admin-style power action | Catastrophically destructive with no recovery path | Per-profile delete with confirmation dialog is sufficient |

---

## Feature Dependencies

```
[Profiles List Page]
    └──required for──> [Create Profile]
    └──required for──> [Rename Profile]
    └──required for──> [Delete Profile]
    └──required for──> [Set Active Profile]
    └──required for──> [Duplicate Profile]

[Create Profile]
    └──triggers──> [Preferences Form (per profile)]
                       └──requires──> [Profile ID routing: /profiles/[id]/edit]

[Set Active Profile]
    └──feeds into──> [Extension popup active profile display]
    └──feeds into──> [Chrome extension scoring (which profile is used)]
    └──feeds into──> [Profile switcher in navbar]

[Preferences Form restructure]
    └──required for──> [Dealbreaker vs preference distinction]
    └──required for──> [Profile summary preview]
    └──required for──> [Better Claude prompt quality]

[Profile name field]
    └──enhances──> [Claude scoring prompt (name as context)]

[Analysis history]
    └──requires──> [Profile ID as FK on analyses table]
    └──enhanced by──> [Filter by profile]

[Navbar redesign]
    └──contains──> [Profile switcher dropdown]
    └──contains──> [User identity anchor]
```

### Dependency Notes

- **Multi-profile requires routing change**: Currently the preferences form is at `/preferences` (single profile). Multi-profile needs `/profiles` (list) + `/profiles/[id]/edit` (per-profile preferences). This is the foundational routing change everything else depends on.
- **Active profile concept is the integration point with extension**: The extension reads `active_profile_id` from Supabase to know which profile to score against. This field must be stored per user in the database.
- **Preferences form restructure is independent of multi-profile routing**: You can restructure the form UX (dealbreakers, category labels, preview) without or before adding multi-profile. But the restructure must land before the demo because it directly affects Claude prompt quality.
- **Duplicate profile is fast win with high B2B value**: Depends only on Create Profile being complete. Low code complexity.
- **Analysis history filter by profile requires schema change**: `analyses` table needs `profile_id` FK if not already present. Check current schema before implementing.

---

## MVP Definition for v1.1

### Launch With (v1.1 — demo-ready target)

The minimum needed to demo multi-profile to Vera Caflisch at Bellevia Immobilien and feel professional doing it.

- [x] **Navbar with user identity + profile switcher** — Professional baseline. Without this it's a hackathon prototype.
- [x] **Profiles list page with profile cards** — The landing page after login. Shows all profiles with name, criteria summary, active badge.
- [x] **Create new profile** — Empty form state. Name field at top.
- [x] **Rename profile** — Inline or modal. Trivial but expected.
- [x] **Delete profile with confirmation** — Guarded delete. Required for user confidence.
- [x] **Set active profile** — Core integration with extension scoring.
- [x] **Preferences form restructured with dealbreakers + category labels** — Direct improvement to Claude prompt quality. This is a scoring quality improvement, not just UX polish.
- [x] **Profile summary preview on form** — Live natural-language summary. Builds user trust that preferences translate correctly.
- [x] **Extension popup shows active profile name** — Prevents scoring-against-wrong-profile errors during demo.

### Add After Demo (v1.1-post)

- [ ] **Duplicate profile** — High B2B value, low code cost. Add when B2B multi-client workflow is validated with Vera.
- [ ] **Analysis history filtered by profile** — Needs schema change. Add after schema audit.
- [ ] **Profile name as Claude prompt context** — One-line prompt change. Trivial to add; validate if it measurably improves output quality.

### Future Consideration (v2+)

- [ ] **Team / organization model** — Multiple users sharing profiles. Requires RBAC. Only if B2B pilot proves out.
- [ ] **Profile templates** — Pre-filled profiles for common searches ("Family Zurich", "Investment 1-bedroom"). Useful for broker onboarding.
- [ ] **Score caching per profile** — Listed in REQUIREMENTS.md as PERF-01/02. Enables auto-scoring and cost control.
- [ ] **New listing notifications per profile** — Server-side monitoring required. Far future.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Navbar with profile switcher | HIGH | LOW | P1 |
| Profiles list page | HIGH | MEDIUM | P1 |
| Create / rename / delete profile | HIGH | LOW | P1 |
| Set active profile (DB + extension) | HIGH | MEDIUM | P1 |
| Preferences form restructure (dealbreakers + categories) | HIGH | MEDIUM | P1 |
| Profile summary preview on form | HIGH | LOW | P1 |
| Extension popup active profile display | MEDIUM | LOW | P1 |
| Duplicate profile | MEDIUM | LOW | P2 |
| Analysis history filtered by profile | MEDIUM | MEDIUM | P2 |
| Profile name as Claude prompt context | LOW | LOW | P2 |
| Team / org model | HIGH (B2B) | HIGH | P3 |
| Profile templates for brokers | MEDIUM | MEDIUM | P3 |
| Score caching per profile | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 demo
- P2: Should have, add post-demo when validated
- P3: Future milestone

---

## Preferences UX Patterns That Improve Claude Prompt Quality

This section is specific to the research question about preferences UX and AI scoring quality. HIGH confidence based on multiple sources.

### What Makes a Good Preferences-to-Prompt Translation

**Finding:** Structured inputs produce materially better LLM outputs than freeform text. The reason is that LLMs perform best when prompted with labeled, hierarchical data — ambiguity is the primary cause of output degradation, not model capability.

**Specific recommendations for HomeMatch:**

1. **Labeled categories over freeform text**: Current soft criteria fields are open text. Replace with named categories ("Location", "Transport", "Building quality", "Lifestyle") that map directly to Claude's scoring rubric sections. When user input and prompt structure are isomorphic, Claude's category scores are more consistent.

2. **Dealbreaker vs. soft preference distinction**: Directly analogous to MoSCoW prioritization (Must Have / Should Have / Could Have). Marking budget ceiling as a dealbreaker changes how Claude evaluates a 3,500 CHF listing when budget is 3,000. Without this distinction, Claude treats all criteria as soft and sometimes rationalizes past hard limits. Hinge's UX for this: a checkbox on each criterion "This is a dealbreaker" that changes algorithmic weight to disqualifying.

3. **Numeric weights are better than sliders for AI prompts**: For LLM consumption, what matters is the relative weight structure, not the absolute slider position. Convert sliders to a 1-5 importance scale or Low/Medium/High/Critical chip selector. Chips reduce errors vs. sliders (Baymard: sliders are inaccurate for precise values; chips communicate intent more clearly). Pass weights to Claude as `{"location": "critical", "budget": "must_not_exceed", "size": "high"}` rather than `{"location": 0.87, "budget": 0.93}`.

4. **Natural language preview of the profile**: Show users "What Claude will see" as a plain-English summary. This serves dual purpose: (a) user catches errors before scoring, (b) the preview text itself can be included in the prompt as the intent summary, which grounds Claude's evaluation in user-expressed goals.

5. **Avoid "describe in your own words" as the primary input**: Freeform descriptions create prompt injection risk, inconsistent lengths, and unverifiable user mental models. Use freeform as a "notes" supplement only.

### UX Pattern: Chip Selectors vs. Sliders

**Sliders** (current): Good for continuous ranges (price, sqm). Poor for importance levels — users can't meaningfully distinguish between 0.8 and 0.85 importance.

**Chips** (recommended for importance): Low / Medium / High / Critical. Maps clearly to scoring multipliers. Reduces cognitive load. Fast to configure.

**Hybrid**: Keep sliders for numeric ranges (budget min/max, rooms, sqm). Replace importance sliders with chips or a 1-5 star/dot scale.

---

## Competitor Feature Analysis

The B2B multi-profile angle (property manager matching multiple clients) has no direct competitor in the Swiss market. Analogous patterns from adjacent SaaS tools:

| Feature | Google Analytics (multi-property) | Salesforce (multi-record views) | HomeMatch v1.1 approach |
|---------|----------------------------------|--------------------------------|------------------------|
| Profile/entity switching | Account switcher in top nav, persistent | Record list + detail pane | Profile switcher in navbar dropdown |
| Active entity indicator | Property name in nav | Selected record highlighted | "Active" badge on profile card |
| Create new entity | "Create Property" button in admin | "+ New" button | "New Profile" CTA at top of profiles list |
| Entity list view | Admin table view | List + grid toggle | Profile card grid (name, criteria summary, active badge) |
| Destructive delete | Confirmation modal | Confirmation step in wizard | Confirmation dialog with profile name |
| Settings scoped to entity | Per-property settings | Per-record fields | Per-profile preferences form at `/profiles/[id]/edit` |

---

## Sources

- [B2B SaaS UX Design 2026 — Onething Design](https://www.onething.design/post/b2b-saas-ux-design) — Role-based interfaces, progressive disclosure, multi-persona support
- [Ways to Design Account Switchers — UX Power Tools / Medium](https://medium.com/ux-power-tools/ways-to-design-account-switchers-app-switchers-743e05372ede) — Account switcher pattern taxonomy (profile switch vs. workspace switch vs. team switch)
- [From Prompts to Parameters: The Case for Structured Inputs — Medium/DevOps AI](https://medium.com/devops-ai/from-prompts-to-parameters-the-case-for-structured-inputs-0fda3b69609f) — Structured inputs eliminate prompt ambiguity; JSON > freeform for LLM consumption
- [Improve Form Slider UX — Baymard Institute](https://baymard.com/blog/slider-interfaces) — Sliders are inaccurate for precise values; fallback input fields required
- [Designing The Perfect Slider — Smashing Magazine](https://www.smashingmagazine.com/2017/07/designing-perfect-slider/) — When sliders work vs. when they fail
- [Mastering CRUD Operations UX — Medium / Design Bootcamp](https://medium.com/design-bootcamp/mastering-crud-operations-a-framework-for-seamless-product-design-2630affbc1e5) — CRUD UX framework: create, rename, duplicate, delete with confirmation
- [Prioritization Methods — Nielsen Norman Group](https://www.nngroup.com/articles/prioritization-methods/) — MoSCoW (Must/Should/Could/Won't) as the theoretical basis for dealbreaker UX
- [AI in Real Estate 2026 — Homesage.ai](https://homesage.ai/ai-changing-real-estate-data-2026/) — AI-powered property recommendation patterns (preference-based filtering)
- [Real Estate App UX — Onething Design](https://www.onething.design/post/real-estate-app-ux) — Saved searches, personalization expectations in real estate apps
- [Mastering LLM Prompts — Codesmith](https://www.codesmith.io/blog/mastering-llm-prompts) — Structure and context matter more than clever wording; labeled sections eliminate ambiguity

---

*Feature research for: HomeMatch v1.1 — Professional UI + Multi-profile + Preferences UX*
*Researched: 2026-03-13*
