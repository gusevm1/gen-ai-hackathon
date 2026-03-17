# AI Agent Rules — HomeMatch

This file is the onboarding guide for any AI agent working in this repository.
Read it first. Follow it always.

---

## 1. Planning-First Approach

Before touching any source code, read the planning documents in this exact order:

**Core state:**
1. `.planning/PROJECT.md` — what the system is, architecture diagram, key decisions
2. `.planning/STATE.md` — current milestone, progress, blockers, where we stopped
3. `.planning/ROADMAP.md` — all milestones and phases, completion status
4. `.planning/MILESTONES.md` — milestone summaries, known gaps, archive pointers

**Research (read all five):**
5. `.planning/research/ARCHITECTURE.md` — data flows, component boundaries, DB schema
6. `.planning/research/STACK.md` — technologies, versions, what not to use
7. `.planning/research/FEATURES.md` — feature landscape, priorities, anti-features
8. `.planning/research/PITFALLS.md` — critical pitfalls with prevention steps
9. `.planning/research/SUMMARY.md` — executive summary, key findings, phase rationale

**Phase and milestone detail:**
10. `.planning/phases/` — per-phase plans, summaries, verification, validation
11. `.planning/milestones/` — per-milestone requirements, roadmaps, audit reports

---

## 2. Source Code Exploration

- Only read source code when you need to implement or verify a specific feature.
- The planning documents are the primary source of truth — not the code.
- When planning docs and code diverge, flag the discrepancy before acting.

---

## 3. Mandatory Onboarding Summary

After reading the planning documents, always produce a summary covering these four areas before doing any work:

### System Architecture
Describe the components, how they connect, and the key design principles (e.g. server-authoritative active profile resolution).

### Current Project State
State the active milestone, its completion status, and where work stopped. Reference `.planning/STATE.md` directly.

### Next Milestone
State what the next milestone is (or that it is undefined) and what the leading candidate work items are.

### Technical Risks
List the top risks by severity: known bugs, deferred debt, security concerns, scaling constraints.

---

## 4. Single Source of Truth

| Artifact | Authoritative For |
|----------|-------------------|
| `.planning/STATE.md` | Current milestone status, blockers, where we stopped |
| `.planning/PROJECT.md` | Architecture, requirements, key decisions |
| `.planning/ROADMAP.md` | Phase completion, milestone boundaries |
| `.planning/MILESTONES.md` | Milestone outcomes, known gaps, archive locations |
| `.planning/research/PITFALLS.md` | What not to do and why |
| Phase `VERIFICATION.md` files | Whether a phase's requirements are met |
| Phase `SUMMARY.md` files | What was actually built in a phase |

- Always check `.planning/STATE.md` before making any changes.
- Never assume the current state from memory or a previous conversation — read the file.
- After completing work, update `STATE.md` and any affected planning artifacts.

---

## 5. Working Conventions

- **Schema changes:** DB migration first, then backend, then edge function, then frontend. Never skip this order.
- **New features:** Add to `.planning/PROJECT.md` requirements and the active milestone's REQUIREMENTS file before implementing.
- **Phase completion:** A phase is not complete until it has a `VERIFICATION.md` with passing checks.
- **Decisions:** Log all non-trivial decisions in the Key Decisions table in `.planning/PROJECT.md`.
- **Orphaned code:** Flag it, don't silently delete it. Reference the audit in `v1.1-MILESTONE-AUDIT.md` for examples.
- **Security:** Never trust `profile_id` from the extension without server-side ownership validation. Never remove JWT validation from the edge function without an explicit decision logged.

---

## 6. Known Gaps to Keep in Mind

These are carried-forward issues from the v1.1 audit. Do not re-introduce or work around them — fix them:

- **UI-04:** `/analysis/[listingId]` uses `.single()` without `profile_id` filter — throws PGRST116 when the same listing is scored under multiple profiles.
- **Phase 8 unverified:** `VERIFICATION.md` is missing for the UI Foundation phase.
- **Orphaned code:** `app-sidebar.tsx`, `dashboard/actions.ts` (`savePreferences`/`loadPreferences`), extension onboarding wizard files, old v1 `profile.ts` numeric-weight schema.
- **Security:** `--no-verify-jwt` flag on `score-proxy` edge function needs a formal decision.
- **No score caching:** Every FAB click re-calls Claude API. Deferred to v2.

---

*Last updated: 2026-03-16*
