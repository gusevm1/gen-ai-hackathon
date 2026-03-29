---
phase: 23
slug: hackathon-credits-section
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build (`next build`) + TypeScript check (`tsc --noEmit`) |
| **Config file** | `web/next.config.ts` |
| **Quick run command** | `cd web && npx tsc --noEmit` |
| **Full suite command** | `cd web && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx tsc --noEmit`
- **After every plan wave:** Run `cd web && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | CRED-01 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | CRED-01 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 1 | CRED-01 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 23-01-04 | 01 | 1 | CRED-02 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 23-01-05 | 01 | 2 | CRED-01 | build | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing TypeScript infrastructure covers all phase requirements.

*Existing infrastructure covers all phase requirements — no new test files needed. All verification is via `tsc --noEmit` (type-check) and `npm run build` (compile-time correctness + translation key parity).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero photo scroll-fade (opacity decreases as user scrolls) | CRED-01 | Framer Motion animation — not automatable | Load landing page, scroll slowly, verify photo fades from ~25% to 0% |
| Credits section photo + logo overlay visual check | CRED-01 | Layout + visual — not automatable | Load landing page, scroll to bottom before footer, verify Zurich photo with ETH logo + hackathon badge overlay |
| Auth page full-screen photo + credits at bottom | CRED-01 | Visual + layout — not automatable | Navigate to /auth, verify Zurich photo fills viewport, login card floats over it, credits strip visible at bottom |
| GenAI Zürich Hackathon badge renders green/black correctly | CRED-02 | Visual styling — not automatable | Inspect badge: black background, #50e75f green text, "GenAI Zürich Hackathon 2026" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
