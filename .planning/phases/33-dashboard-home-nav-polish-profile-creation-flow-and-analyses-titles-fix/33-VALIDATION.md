---
phase: 33
slug: dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (webapp) + pytest (backend) |
| **Config file** | `webapp/vitest.config.ts` / `backend/pytest.ini` |
| **Quick run command** | `cd webapp && npm run typecheck` |
| **Full suite command** | `cd webapp && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd webapp && npm run typecheck`
- **After every plan wave:** Run `cd webapp && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | HOME-01 | build | `cd webapp && npm run typecheck` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | HOME-02 | build | `cd webapp && npm run typecheck` | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 2 | NAV-01 | build | `cd webapp && npm run typecheck` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | PROF-01 | build | `cd webapp && npm run typecheck` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 1 | DOWN-01 | build | `cd webapp && npm run typecheck` | ❌ W0 | ⬜ pending |
| 33-02-03 | 02 | 2 | ANA-01 | build | `cd webapp && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (Vitest + TypeScript already installed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard home cards navigate correctly | HOME-02 | Requires browser interaction | Click Manual card → assert form page loads; click AI card → assert chat page loads |
| "+ New Profile" shows chooser | PROF-01 | Requires browser interaction | On /profiles, click "+ New Profile" → assert two-card chooser appears |
| Download page nav visible | DOWN-01 | Requires browser navigation | Navigate to /download → assert TopNavbar items visible and clickable |
| Analyses titles in English | ANA-01 | Requires real Flatfox data | Open an analysis card → assert title is English (e.g. "4 rooms apartment") not German |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
