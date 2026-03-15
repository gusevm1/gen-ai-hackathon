---
phase: 9
slug: web-profile-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 + jsdom |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd web && pnpm vitest run` |
| **Full suite command** | `cd web && pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && pnpm vitest run`
- **After every plan wave:** Run `cd web && pnpm vitest run && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PROF-01 | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | PROF-02 | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | PROF-03 | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | PROF-04 | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | PROF-05 | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | PROF-06 | unit | `cd web && pnpm vitest run src/__tests__/profile-card.test.tsx` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | PREF-11 | unit | `cd web && pnpm vitest run src/__tests__/preferences-form.test.tsx` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 2 | PREF-12 | unit | `cd web && pnpm vitest run src/__tests__/preferences-form.test.tsx` | Partial | ⬜ pending |
| 09-02-04 | 02 | 2 | PREF-15 | unit | `cd web && pnpm vitest run src/__tests__/profile-summary.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 3 | UI-04 | smoke | `cd web && pnpm vitest run src/__tests__/analysis-page.test.ts` | Existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/profile-actions.test.ts` — stubs for PROF-01 through PROF-05: server action logic with mocked Supabase
- [ ] `web/src/__tests__/profile-card.test.tsx` — covers PROF-06: card rendering, active badge, summary display
- [ ] `web/src/__tests__/preferences-form.test.tsx` — covers PREF-11, PREF-12: dealbreaker toggle, importance chips
- [ ] `web/src/__tests__/profile-summary.test.ts` — covers PREF-15: deterministic summary generation
- [ ] Update `web/src/__tests__/analysis-page.test.ts` — covers UI-04: updated component structure
- [ ] No additional framework install needed (vitest + jsdom already configured)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Active profile reflected in navbar immediately | PROF-05 | Server revalidation timing | Set active profile, verify navbar updates without full refresh |
| Preferences form visual layout (6 accordion sections) | PREF-11, PREF-12 | Visual layout verification | Open preferences form, verify all 6 sections present and styled |
| Analysis page professional visual hierarchy | UI-04 | Visual design quality | View redesigned analysis page with sample data, verify demo readiness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
