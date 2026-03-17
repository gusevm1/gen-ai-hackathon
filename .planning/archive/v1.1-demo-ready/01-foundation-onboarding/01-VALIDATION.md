---
phase: 01
slug: foundation-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (extension), Vitest (web - Wave 0 setup) |
| **Config file** | `extension/vitest.config.ts` (exists), `web/vitest.config.ts` (Wave 0) |
| **Quick run command** | `pnpm test` (in respective directory) |
| **Full suite command** | `cd extension && pnpm test && cd ../web && pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` in modified directory
- **After every plan wave:** Run full suite across all directories
- **Before `/gsd:verify-work`:** Full suite must be green + all manual smoke tests pass
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | smoke (manual) | Manual: visit site, sign up, log in | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-02 | smoke (manual) | Manual: open popup, enter credentials | N/A | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-03 | integration | `supabase functions serve` + curl with JWT | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | INFRA-01 | smoke (manual) | `curl -f https://[deployment-url]` | N/A | ⬜ pending |
| 01-01-05 | 01 | 1 | INFRA-02 | smoke | `curl -f http://[ec2-ip]:8000/health` | N/A | ⬜ pending |
| 01-01-06 | 01 | 1 | INFRA-03 | integration (manual) | `supabase db push` + verify in dashboard | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extension Vitest config — reuse existing pattern for fresh scaffold
- [ ] Web app Vitest setup — if unit tests desired (not critical for Phase 1)
- [ ] No automated integration tests for auth flows — all manual verification for Phase 1

*Phase 1 is primarily infrastructure/deployment — most validation is manual smoke testing of deployed services.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login/signup on Next.js website | AUTH-01 | Browser interaction required | Visit site, sign up with email/password, verify redirect to dashboard |
| Login in extension popup | AUTH-02 | Extension popup browser interaction | Install extension, open popup, enter credentials, verify login state |
| Next.js deployed on Vercel | INFRA-01 | Deployment verification | `curl -f https://[deployment-url]` returns 200 |
| FastAPI on EC2 health check | INFRA-02 | External service check | `curl -f http://[ec2-ip]:8000/health` returns 200 |
| Supabase tables + auth configured | INFRA-03 | Dashboard verification | Check Supabase dashboard for tables, RLS policies, auth config |
| Edge function proxies to EC2 | AUTH-03 | End-to-end integration | `supabase functions serve` + curl with valid JWT header |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
