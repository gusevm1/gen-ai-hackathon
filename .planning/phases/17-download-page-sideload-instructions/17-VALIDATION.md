---
phase: 17
slug: download-page-sideload-instructions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + React Testing Library 16.3.2 |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd web && npx vitest run src/__tests__/download-page.test.tsx src/__tests__/top-navbar.test.tsx` |
| **Full suite command** | `cd web && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run src/__tests__/download-page.test.tsx src/__tests__/top-navbar.test.tsx`
- **After every plan wave:** Run `cd web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 0 | HOST-01 | smoke | `test -f web/public/homematch-extension.zip && echo "OK"` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 0 | DL-01 | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -x` | Exists (needs update) | ⬜ pending |
| 17-01-03 | 01 | 0 | DL-02, DL-03, DL-04 | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 1 | DL-01 | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -x` | Exists (needs update) | ⬜ pending |
| 17-02-02 | 02 | 1 | DL-02 | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | ❌ W0 | ⬜ pending |
| 17-02-03 | 02 | 1 | DL-03, DL-04 | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/download-page.test.tsx` — stubs for DL-02, DL-03, DL-04
- [ ] Update `web/src/__tests__/top-navbar.test.tsx` — update nav order assertion to include "Download"
- [ ] Copy `extension/dist/homematch-extension-0.4.0-chrome.zip` to `web/public/homematch-extension.zip`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| chrome://extensions cannot be linked from web | DL-04 | Browser security blocks chrome:// links | 1. Click copy button 2. Verify clipboard contains chrome://extensions 3. Paste in address bar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
