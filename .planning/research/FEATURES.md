# Feature Landscape: v2.0

**Domain:** AI property scoring tool -- v2.0 Smart Preferences & UX Polish
**Researched:** 2026-03-15
**Confidence:** HIGH (features defined in PROJECT.md; integration patterns verified against official docs)

## Table Stakes (v2.0 Scope)

Features the v2.0 milestone must deliver. These are explicitly listed in PROJECT.md active requirements.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Chat-based preference discovery | Core value prop of v2.0; replaces tedious manual form entry | High | Multi-turn streaming chat + structured extraction + review UI |
| User can review/edit AI-generated preferences | Without review, users lose control; trust issue | Medium | PreferenceReview component showing extracted fields before save |
| Standard fields remain as form inputs | Location, price, rooms are precise -- chat is overkill for these | Low | Keep existing form sections, only replace soft criteria |
| Dynamic AI-generated fields replace soft criteria | The whole point of "smart preferences" | Medium | Schema change (Zod + Pydantic + JSONB), backward compat migration |
| Parallel scoring from single FAB click | Currently 10+ listings take 60+ seconds sequentially | Medium | Client-side concurrency with batching, progressive rendering |
| Chrome extension download section on website | Users currently need manual sideload instructions | Low | Static page with .zip download + step-by-step guide |
| UI redesign with Flatfox-esque styling | Visual polish for demo/pilot | Medium | Tailwind color palette changes, component styling updates |

## Differentiators

Features that would set HomeMatch apart but are not strictly required for v2.0.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Chat suggests standard field values | Chat could auto-fill budget, rooms, location from conversation | Low | Extract during `generateObject` call, pre-populate form |
| Importance auto-assignment from chat | AI infers importance levels from conversation tone/emphasis | Low | Part of dynamic field extraction schema |
| Scoring progress indicator | Show "3 of 12 scored" on FAB during parallel scoring | Low | Counter in FAB component, trivial to implement |
| Chat conversation memory per profile | Re-enter chat to refine preferences with context of previous conversation | Medium | Store last conversation in profile metadata; NOT v2.0 |
| Chrome Web Store listing | Professional distribution, auto-updates, 1-click install | Medium | 5+ day review process; start submission in v2.0, ship when approved |

## Anti-Features

Features to explicitly NOT build in v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Chat in the Chrome extension | Extension popup is tiny; chat needs space; chat is a setup activity, not a browsing activity | Keep chat on website only; extension is for scoring |
| Auto-scoring without FAB click | Claude API costs are per-call; auto-scoring could generate hundreds of unwanted API calls | Keep FAB as intentional trigger; user controls when/what to score |
| Real-time chat with scoring | Scoring while chatting about preferences is confusing UX | Separate flows: chat to SET preferences, FAB to SCORE listings |
| Backend batch endpoint | Adds complexity without meaningful benefit over client-side batching | Client-side concurrency preserves progressive rendering and per-listing error handling |
| Persistent chat history | Storing every chat message adds schema complexity for ephemeral data | Keep chat state in React; only persist the extracted dynamicFields |
| .crx direct download | Chrome blocks .crx from non-CWS sources since Chrome 68 | Use .zip + developer mode sideload instructions |
| Custom AI model for chat | Using a fine-tuned model for preference extraction | Claude Haiku 4.5 with good prompting is sufficient; no training data available |

## Feature Dependencies

```
Dynamic Schema (Phase 1)
  |
  +-> Chat-Based Preferences (Phase 2) -- depends on dynamicFields schema
  |
  +-> Scoring Prompt Update (Phase 1) -- depends on dynamicFields format
  |
Parallel Scoring (Phase 3) -- independent of schema changes
  |
UI Redesign (Phase 4) -- independent, pure CSS/component changes
  |
Extension Download Page (Phase 4) -- independent, static page
```

## MVP Recommendation (within v2.0)

**Prioritize (ship in order):**
1. Dynamic schema + scoring prompt update -- foundation for everything else
2. Chat-based preference discovery with review UI -- the headline feature
3. Parallel scoring -- quick win, dramatic UX improvement
4. Extension download page -- low effort, high impact for distribution

**Defer to v2.1 (if time-constrained):**
- Full Flatfox-inspired UI redesign: Do a minimal color palette update in v2.0, full redesign in v2.1
- Chrome Web Store submission: Start the process, but it takes 5+ days and is async
- Chat conversation memory per profile: Nice-to-have but not essential

## Sources

- [PROJECT.md](/Users/maximgusev/workspace/gen-ai-hackathon/.planning/PROJECT.md) -- Active requirements for v2.0
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- Schema-guaranteed extraction
- [Vercel AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- Chat infrastructure capabilities
- [Chrome Extension Distribution FAQ](https://www.chromium.org/developers/extensions-deployment-faq/) -- CRX restrictions
