---
phase: 4
slug: extension-ui-analysis-page
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 (extension) / Vitest 4.0.18 (web) |
| **Config file** | `extension/vitest.config.ts` (exists) / `web/vitest.config.ts` (Wave 0 — Plan 00) |
| **Quick run command** | `cd extension && pnpm test` |
| **Full suite command** | `cd extension && pnpm test && cd ../web && pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd extension && pnpm test`
- **After every plan wave:** Run `cd extension && pnpm test && cd ../web && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-00-01 | 00 | 0 | EXT-01,EXT-03,EXT-04,EXT-07,EXT-08 | scaffold | `cd extension && pnpm vitest run src/__tests__/content-matches.test.ts src/__tests__/flatfox-parser.test.ts src/__tests__/scoring-types.test.ts src/__tests__/auth-flow.test.ts src/__tests__/loading-state.test.ts` | Creates stubs | ⬜ pending |
| 04-00-02 | 00 | 0 | WEB-01,WEB-02 | scaffold | `cd web && npx vitest run src/__tests__/` | Creates stubs + config | ⬜ pending |
| 04-01-01 | 01 | 1 | EXT-04 | unit | `cd extension && pnpm vitest run src/__tests__/scoring-types.test.ts -x` | ⬜ W0 stub | ⬜ pending |
| 04-01-02 | 01 | 1 | EXT-07 | unit | `cd extension && pnpm vitest run src/__tests__/auth-flow.test.ts -x` | ⬜ W0 stub | ⬜ pending |
| 04-02-01 | 02 | 1 | WEB-01 | unit | `cd web && npx vitest run src/__tests__/analysis-page.test.ts -x` | ⬜ W0 stub | ⬜ pending |
| 04-02-02 | 02 | 1 | WEB-02 | unit | `cd web && npx vitest run src/__tests__/category-breakdown.test.ts -x` | ⬜ W0 stub | ⬜ pending |
| 04-02-03 | 02 | 1 | WEB-03 | integration | Already verified in Phase 3 e2e testing | ✅ | ⬜ pending |
| 04-03-01 | 03 | 2 | EXT-01,EXT-03,EXT-08 | unit | `cd extension && pnpm vitest run src/__tests__/content-matches.test.ts src/__tests__/flatfox-parser.test.ts src/__tests__/loading-state.test.ts -x` | ⬜ W0 stub | ⬜ pending |
| 04-04-01 | 04 | 1 | EXT-04,EXT-05 | unit | `cd backend && python -m pytest tests/test_image_scoring.py -x -v` | Creates own | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (Plan 04-00)

- [ ] `extension/src/__tests__/content-matches.test.ts` — stubs for EXT-01 (content script match pattern)
- [ ] `extension/src/__tests__/flatfox-parser.test.ts` — stubs for EXT-03 (listing PK extraction)
- [ ] `extension/src/__tests__/scoring-types.test.ts` — stubs for EXT-04 (ScoreResponse type validation)
- [ ] `extension/src/__tests__/auth-flow.test.ts` — stubs for EXT-07 (Supabase auth in extension)
- [ ] `extension/src/__tests__/loading-state.test.ts` — stubs for EXT-08 (loading state rendering)
- [ ] `web/vitest.config.ts` — web project needs vitest config
- [ ] `web/src/__tests__/analysis-page.test.ts` — stubs for WEB-01 (analysis page rendering)
- [ ] `web/src/__tests__/category-breakdown.test.ts` — stubs for WEB-02 (category breakdown component)

**Created by:** Plan 04-00 (Wave 0)
**Filled by:** Plans 04-01, 04-02, 04-03 (during implementation)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FAB appears on Flatfox page | EXT-02 | Requires live browser with extension loaded on flatfox.ch | Load extension, navigate to flatfox.ch/search, verify FAB button is visible |
| Badge expands summary panel | EXT-05 | Requires injected badges on live Flatfox page | Click score badge, verify panel shows 3-5 bullets and "See full analysis" link |
| "See full analysis" link opens website | EXT-06 | Cross-origin navigation between extension and web app | Click "See full analysis", verify opens analysis page on web app |
| Extension popup shows auth state | EXT-07 | Requires Chrome extension popup context | Click extension icon, verify login state and "Edit Preferences" link |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 04-00 creates all stubs)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
