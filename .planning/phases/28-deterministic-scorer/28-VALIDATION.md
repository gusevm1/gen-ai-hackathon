---
phase: 28
slug: deterministic-scorer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (asyncio_mode = "auto") |
| **Config file** | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `cd /Users/singhs/gen-ai-hackathon/backend && python3.11 -m pytest tests/test_deterministic_scorer.py -x` |
| **Full suite command** | `cd /Users/singhs/gen-ai-hackathon/backend && python3.11 -m pytest tests/ -m "not integration"` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3.11 -m pytest tests/test_deterministic_scorer.py -x`
- **After every plan wave:** Run `python3.11 -m pytest tests/ -m "not integration"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 0 | DS-01–DS-06 | unit stubs | `pytest tests/test_deterministic_scorer.py -x` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 1 | DS-01 | unit | `pytest tests/test_deterministic_scorer.py::TestPriceScorer -x` | ❌ W0 | ⬜ pending |
| 28-02-02 | 02 | 1 | DS-02 | unit | `pytest tests/test_deterministic_scorer.py::TestDistanceScorer -x` | ❌ W0 | ⬜ pending |
| 28-02-03 | 02 | 1 | DS-03 | unit | `pytest tests/test_deterministic_scorer.py::TestSizeScorer -x` | ❌ W0 | ⬜ pending |
| 28-02-04 | 02 | 1 | DS-04 | unit | `pytest tests/test_deterministic_scorer.py::TestBinaryFeatureScorer -x` | ❌ W0 | ⬜ pending |
| 28-02-05 | 02 | 1 | DS-05 | unit | `pytest tests/test_deterministic_scorer.py::TestProximityQualityScorer -x` | ❌ W0 | ⬜ pending |
| 28-02-06 | 02 | 1 | DS-06 | unit | `pytest tests/test_deterministic_scorer.py::TestBuiltinSynthesizer -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_deterministic_scorer.py` — stubs covering DS-01 through DS-06 (failing until Wave 1 implementation)

*Wave 0 creates the test file with failing tests; Wave 1 creates the implementation making them green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| German synonym alias completeness | DS-04 | FEATURE_ALIAS_MAP coverage is judgment-based | Review map for common German Flatfox terms (Balkon, Aufzug, Parkplatz) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
