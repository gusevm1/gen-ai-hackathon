---
phase: 10
slug: extension-profile-switcher
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `extension/vitest.config.ts` |
| **Quick run command** | `cd extension && npx vitest run` |
| **Full suite command** | `cd extension && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd extension && npx vitest run`
- **After every plan wave:** Run `cd extension && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | EXT-09, EXT-10 | unit | `cd extension && npx vitest run src/__tests__/popup-profile.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | EXT-12 | unit | `cd extension && npx vitest run src/__tests__/stale-badge.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 0 | EXT-11 | unit | `cd extension && npx vitest run src/__tests__/background.test.ts` | ✅ extend | ⬜ pending |
| 10-02-01 | 02 | 1 | EXT-09 | unit | `cd extension && npx vitest run src/__tests__/popup-profile.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | EXT-10 | unit | `cd extension && npx vitest run src/__tests__/popup-profile.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 1 | EXT-11 | unit | `cd extension && npx vitest run src/__tests__/background.test.ts` | ✅ extend | ⬜ pending |
| 10-04-01 | 04 | 1 | EXT-12 | unit | `cd extension && npx vitest run src/__tests__/stale-badge.test.ts` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 2 | EXT-13 | manual-only | N/A (visual inspection) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/popup-profile.test.ts` — stubs for EXT-09, EXT-10 (profile display + switching messages)
- [ ] `src/__tests__/stale-badge.test.ts` — stubs for EXT-12 (stale state logic)
- [ ] Extend `src/__tests__/background.test.ts` — add healthCheck and getProfiles message tests
- [ ] Note: 1 pre-existing test failure in `profile-schema.test.ts` (feature enum mismatch) — not blocking

*Existing vitest infrastructure covers framework setup. Only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Badge/panel visual polish | EXT-13 | Visual design quality cannot be unit tested | 1. Open Flatfox listing, 2. Verify badge matches web app design language, 3. Check summary panel typography and spacing |
| Profile switcher UX flow | EXT-10 | E2E dropdown interaction in extension popup | 1. Open popup, 2. Click switcher, 3. Select different profile, 4. Verify active profile updates |
| Stale badge visual indicator | EXT-12 | Visual overlay appearance in content script | 1. Switch profile in popup, 2. Observe existing badges on page, 3. Verify stale indicator appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
