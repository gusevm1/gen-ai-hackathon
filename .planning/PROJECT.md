# HomeMatch — Swiss Property AI Scorer

## What This Is

A Chrome extension + web app that helps users evaluate Flatfox.ch property listings against their personal preferences. Users manage multiple search profiles on a Next.js website (with dealbreaker/importance-based preferences), then the Chrome extension scores each listing on Flatfox — showing score badges, expandable summaries, and linking to full analysis pages. Scoring uses Claude with image analysis for comprehensive evaluation. Supports multiple profiles per user for B2B property management use cases.

## Core Value

Help users instantly see how well each property listing matches their specific needs, with transparent AI reasoning they can trust — without ever leaving the website they're already on.

## Architecture

```
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js Frontend │───▶│   Supabase   │───▶│  EC2 FastAPI     │───▶│  Claude API  │
│ (Vercel)         │    │  Auth + Edge │    │  Backend         │    └──────────────┘
│ - Profile CRUD   │    │  Functions   │    │  - Flatfox fetch │
│ - Preferences    │    └──────┬───────┘    │  - Image extract │    ┌──────────────┐
│ - Analysis pages │          │            │  - LLM scoring   │───▶│ Flatfox API  │
└──────────────────┘           │            └──────────────────┘    │ /api/v1/flat/ │
                               │                                    └──────────────┘
┌──────────────────┐           │
│ Chrome Extension │───────────┘
│ (Flatfox.ch)     │
│ - Shadow DOM     │
│ - Score badges   │
│ - Profile switch │
│ - Stale detect   │
└──────────────────┘
```

## Requirements

### Validated

- ✓ Supabase auth (email/password) for website and extension — v1.0
- ✓ User preferences stored in Supabase PostgreSQL — v1.0
- ✓ Chrome extension on Flatfox.ch with FAB for on-demand scoring — v1.0
- ✓ Backend fetches listing data from Flatfox public API — v1.0
- ✓ LLM-powered evaluation with image analysis — v1.0
- ✓ Score badges (0-100) injected via Shadow DOM next to listings — v1.0
- ✓ Expandable summary panel on badge click — v1.0
- ✓ Full analysis page with category breakdown and reasoning — v1.0
- ✓ Multi-profile DB schema with atomic active-profile switching — v1.1
- ✓ Profile CRUD (create, rename, duplicate, delete) from web app — v1.1
- ✓ Professional SaaS web UI with navbar, dark/light mode — v1.1
- ✓ Preferences form with dealbreakers and importance chips — v1.1
- ✓ Canonical preferences schema unified across web/extension/backend — v1.1
- ✓ Claude prompt using structured importance levels — v1.1
- ✓ Extension popup with profile switcher and session health — v1.1
- ✓ Stale badge detection when active profile changes — v1.1
- ✓ Analysis page redesigned for demo presentations — v1.1
- ✓ Score caching by listing+profile (CACHE-01, CACHE-02, CACHE-03) — v2.0 Phase 11
- ✓ FAB re-score UX: long-press, stale visual states, brand teal styling — v2.0 Phase 11

### Active

- [ ] PROF-08: Duplicate profile opens rename modal pre-filled with "[Name] (copy)"
- [ ] HIST-01: Analysis page shows all past analyses across all profiles, labeled by profile name
- [ ] HIST-02: User can click any past analysis to navigate to it
- [ ] SEC-01: Edge function JWT verification enabled (remove --no-verify-jwt)
- [ ] SEC-02: Extension auth flow passes tokens the edge function can verify
- [ ] NAV-01: "AI-Powered Search" nav item in top navbar using pinkish-red accent color
- [ ] NAV-02: Nav order: HomeMatch Logo | AI-Powered Search | Profiles | Analysis | Settings
- [ ] CHAT-01: Chat page with minimal centered layout and large text input as primary element
- [ ] CHAT-02: Input placeholder guides user to describe location, budget, size, rooms, lifestyle, amenities
- [ ] CHAT-03: First message shows "Start Creating Profile" button instead of send arrow
- [ ] CHAT-04: Pressing "Start Creating Profile" prompts user to enter a profile name before conversation begins
- [ ] CHAT-05: After naming, conversation starts and initial description is sent to AI
- [ ] CHAT-06: AI responses appear in scrollable thread with visual distinction between user and assistant
- [ ] CHAT-07: User can send follow-up messages throughout the conversation
- [ ] CHAT-08: Conversation is ephemeral — not persisted across page refreshes
- [ ] CHAT-09: AI assistant messages display circular avatar matching the HomeMatch extension FAB icon
- [ ] AI-01: New FastAPI endpoint on EC2 for multi-turn conversation, calls Claude via ANTHROPIC_API_KEY
- [ ] AI-02: Claude extracts structured preferences from natural language (location, budget, type, rooms, size, lifestyle, amenities, importance levels)
- [ ] AI-03: Claude asks follow-up questions when key preference fields are missing or unclear
- [ ] AI-04: Claude infers importance levels from language cues (e.g. "must have" vs "would be nice")
- [ ] AI-05: Claude signals readiness to summarize once sufficient preferences are extracted
- [ ] SUMM-01: Structured preference summary card shown in chat — not raw JSON
- [ ] SUMM-02: Summary mirrors existing HomeMatch preference schema (same fields as manual profile form)
- [ ] SUMM-03: User can edit any summary field inline before confirming
- [ ] SUMM-04: User confirms summary to trigger profile creation
- [ ] PROF-09: Confirmed summary creates a standard HomeMatch profile via existing profile creation API
- [ ] PROF-10: Created profile is identical in structure to manually-created profiles and works with existing scoring system
- [ ] PROF-11: User is navigated to the new profile's page after creation

### Out of Scope

- Other property sites beyond Flatfox — v1.x is Flatfox only
- Mobile app — web-first approach
- Historical price tracking or investment analysis
- Automatic scoring (user must trigger via FAB — Claude API cost control)
- Offline mode

## Current Milestone: v2.0 Smart Preferences & UX Polish

**Goal:** Replace manual preference forms with AI chat-driven discovery, overhaul UI design, and enable parallel listing scoring.

**Target features:**
- Chat-based preference generation with editable output and priority assignment
- Simplified preferences schema: standard fields + dynamic AI-generated fields
- Flatfox-inspired UI redesign across web app
- Parallel scoring of all visible listings from single FAB click
- Chrome extension distribution from website

## Context

**Shipped v1.1 Demo-Ready + Multi-Profile.** 13,153 LOC across TypeScript (extension + web) and Python (backend). Built in ~10 days.

- **Tech stack:** Next.js (Vercel) + FastAPI (EC2) + Supabase (auth/DB/edge) + WXT Chrome extension + Claude API
- **Target site:** Flatfox.ch — Swiss property portal with public API
- **Language:** DE/FR/IT — scoring matches listing language
- **Pilot target:** Vera Caflisch at Bellevia Immobilien GmbH, Thalwil ZH (B2B property management)
- **Known tech debt:** No score caching, `--no-verify-jwt` on edge function, orphaned app-sidebar.tsx and dashboard/actions.ts

## Constraints

- **Frontend**: Next.js on Vercel
- **Extension**: Chrome MV3 via WXT, Shadow DOM for style isolation
- **Backend**: Python FastAPI on EC2
- **Auth**: Supabase (email/password)
- **Storage**: Supabase PostgreSQL (profiles + analyses tables)
- **LLM**: Claude API with multi-modal (text + images)
- **Target site**: Flatfox.ch only
- **Scoring**: On-demand via FAB (not automatic)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flatfox over Homegate | Agent feedback + public API | ✓ Good |
| Separate website for preferences | Complex setup needs space | ✓ Good |
| Supabase auth from day 1 | Shared identity across apps | ✓ Good |
| On-demand scoring via FAB | Claude API cost control | ✓ Good |
| Edge functions as proxy | Private EC2 URL + auth layer | ✓ Good |
| Shadow DOM for badges | Style isolation from Flatfox CSS | ✓ Good |
| Image-enhanced scoring | Visual aspects improve evaluation | ✓ Good |
| Clean-slate DB migration | Only test data existed, simpler than ALTER | ✓ Good |
| Server-authoritative profile resolution | Edge function resolves active profile, never trusts extension | ✓ Good |
| Structured importance levels over float weights | Better Claude prompt quality | ✓ Good |
| Horizontal top navbar over sidebar | User preference after visual review | ✓ Good |
| Native `<select>` in extension popup | Avoids portal/iframe issues with Radix | ✓ Good |
| No score caching in v1 | Speed over optimization for hackathon | ⚠️ Revisit |
| `--no-verify-jwt` on edge function | Gateway rejects extension JWTs; function handles auth itself | ⚠️ Revisit |

## Current Milestone: v3.0 AI-Powered Conversational Profile Creation

**Goal:** Introduce a conversational AI interface that lets users describe their dream property in natural language and have the system extract and create a structured profile — making profile creation feel like talking to a property advisor.

**Target features:**
- "AI-Powered Search" nav section with chat interface (ChatGPT-style)
- Multi-turn conversation with Claude via EC2 FastAPI (ANTHROPIC_API_KEY)
- Structured preference extraction from natural language with importance inference
- Inline-editable preference summary card before profile creation
- Confirmed summary creates a standard HomeMatch profile (no changes to scoring pipeline)

**In-progress from v2.0 (phases 12-13 still pending):**
- Duplicate profile rename modal (PROF-08)
- Cross-profile analysis history page (HIST-01, HIST-02)
- Edge function JWT hardening (SEC-01, SEC-02)

---
*Last updated: 2026-03-17 after v3.0 milestone started*
