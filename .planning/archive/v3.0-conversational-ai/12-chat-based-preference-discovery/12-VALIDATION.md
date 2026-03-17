---
phase: 12
slug: chat-based-preference-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + @testing-library/react |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd web && npx vitest run src/__tests__/chat*.test.ts src/__tests__/extraction*.test.ts` |
| **Full suite command** | `cd web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run src/__tests__/chat*.test.ts src/__tests__/extraction*.test.ts`
- **After every plan wave:** Run `cd web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | CHAT-03 | unit | `cd web && npx vitest run src/__tests__/extraction-schema.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | CHAT-05 | unit | `cd web && npx vitest run src/__tests__/chat-merge.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 0 | CHAT-06 | unit | `cd web && npx vitest run src/__tests__/chat-persistence.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 0 | CHAT-01 | unit | `cd web && npx vitest run src/__tests__/chat-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 0 | CHAT-04 | unit | `cd web && npx vitest run src/__tests__/extracted-fields-review.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | CHAT-01 | unit | `cd web && npx vitest run src/__tests__/chat-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | CHAT-02 | integration | Manual -- requires live API | N/A | ⬜ pending |
| 12-02-03 | 02 | 1 | CHAT-03 | unit | `cd web && npx vitest run src/__tests__/extraction-schema.test.ts` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | CHAT-04 | unit | `cd web && npx vitest run src/__tests__/extracted-fields-review.test.tsx` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | CHAT-05 | unit | `cd web && npx vitest run src/__tests__/chat-merge.test.ts` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | CHAT-06 | unit | `cd web && npx vitest run src/__tests__/chat-persistence.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/extraction-schema.test.ts` — stubs for CHAT-03 (Zod extraction schema validation)
- [ ] `web/src/__tests__/chat-merge.test.ts` — stubs for CHAT-05 (JSONB merge preserves standard fields)
- [ ] `web/src/__tests__/chat-persistence.test.ts` — stubs for CHAT-06 (sessionStorage save/restore)
- [ ] `web/src/__tests__/chat-panel.test.tsx` — stubs for CHAT-01 (render + toggle)
- [ ] `web/src/__tests__/extracted-fields-review.test.tsx` — stubs for CHAT-04 (review/edit UI)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat engages in multi-turn streaming conversation | CHAT-02 | Requires live Claude API and streaming validation | 1. Open profile edit page 2. Toggle chat open 3. Send a message 4. Verify streaming response 5. Send follow-up 6. Verify multi-turn context |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
