---
phase: 22
slug: landing-page-section-redesigns
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `web/vitest.config.ts` |
| **Quick run command** | `cd web && npm test -- --run --reporter=verbose 2>&1 \| tail -20` |
| **Full suite command** | `cd web && npm test -- --run 2>&1 \| tail -30` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 22-01-01 | 01 | 1 | HERO-01 | unit | `cd web && npm test -- --run --reporter=verbose -t "stats"` | ⬜ pending |
| 22-01-02 | 01 | 1 | HERO-02 | unit | `cd web && npm test -- --run --reporter=verbose -t "hero"` | ⬜ pending |
| 22-01-03 | 01 | 1 | HERO-03 | visual | Manual: check chip color for score 41 (Altstetten) = red | ⬜ pending |
| 22-02-01 | 02 | 1 | PROB-01 | unit | `cd web && npm test -- --run --reporter=verbose -t "problem"` | ⬜ pending |
| 22-02-02 | 02 | 1 | PROB-02 | unit | `cd web && npm test -- --run --reporter=verbose -t "problem"` | ⬜ pending |
| 22-02-03 | 02 | 1 | PROB-03 | visual | Manual: inspect card background + typography in browser | ⬜ pending |
| 22-03-01 | 03 | 2 | SOLN-01 | visual | Manual: verify max-w-3xl browser demo in browser | ⬜ pending |
| 22-03-02 | 03 | 2 | SOLN-02 | visual | Manual: verify enlarged step cards | ⬜ pending |
| 22-03-03 | 03 | 2 | SOLN-03 | unit | `cd web && npm test -- --run --reporter=verbose -t "solution"` | ⬜ pending |
| 22-03-04 | 03 | 2 | CTA-01 | visual | Manual: verify headline size in browser | ⬜ pending |
| 22-03-05 | 03 | 2 | CTA-02 | visual | Manual: scroll into CTA, verify rise from below | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Tests exist in:
- `web/src/__tests__/landing-page.test.tsx`
- `web/src/__tests__/landing-translations.test.ts`

**Note:** If PROB-03 changes card padding from `py-12`, update the test selector from `.py-12` to `data-testid="problem-item"` in `landing-page.test.tsx`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Poor tier chips show red (#ef4444) in hero | HERO-03 | Color visual check | Open landing page, verify Altstetten chip (score 41) shows red circle |
| Problem cards slide in from left | PROB-02 | Animation requires browser | Scroll slowly through problem section, verify each card enters from left |
| CTA headline rises from below | CTA-02 | Animation requires browser | Scroll down to CTA, verify headline rises from y:60 with spring |
| Solution demo is visually larger | SOLN-01 | Size requires browser | Compare before/after at max-w-3xl — demo should fill more horizontal space |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
