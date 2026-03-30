# Phase 33 — Plan Verification

**Verified:** 2026-03-30
**Plans checked:** 33-01-PLAN.md, 33-02-PLAN.md
**Overall result:** FAIL — 1 blocker, 2 warnings

---

## Requirement Coverage

| Req ID | Description | Plan | Task | Status |
|--------|-------------|------|------|--------|
| HOME-01 | Dashboard home page with welcome text + two cards | 33-01 | Task 1 + 2 | Covered |
| HOME-02 | ProfileCreationChooser reusable component | 33-01 | Task 1 | Covered |
| NAV-01 | Home nav item in TopNavbar | 33-01 | Task 2 | Covered |
| PROF-01 | + New Profile shows two-card chooser | 33-02 | Task 1 | Covered |
| DOWN-01 | Download page renders inside dashboard layout | 33-02 | Task 2 | Covered |
| ANA-01 | English title priority in scoring.py | 33-02 | Task 2 | Covered |

All 6 requirements have covering tasks. Requirement coverage: PASS.

---

## Issues

### BLOCKER — `pathname.startsWith("/dashboard")` will permanently highlight the Home nav item on all dashboard sub-routes

**Dimension:** key_links_planned / task_completeness
**Plan:** 33-01, Task 2

**The problem:**
The current TopNavbar uses `pathname.startsWith(item.url)` for active-state detection (line 25 of `top-navbar.tsx`). Adding Home with `url: "/dashboard"` means **every route inside the `(dashboard)` layout** will have Home highlighted as active, because `/profiles`, `/analyses`, `/ai-search` etc. all start with the path prefix `/` but the route group name `(dashboard)` is not part of the URL — all routes under it are still root-level paths like `/profiles`, `/analyses`. The path for the dashboard home specifically is `/dashboard`.

Actually the concrete collision is narrower: `pathname.startsWith("/dashboard")` only matches `/dashboard` itself and hypothetical `/dashboard/...` sub-routes. The other nav items (`/profiles`, `/analyses` etc.) will NOT match `/dashboard`. So the active-state logic is not universally broken — Home will only show as active when on `/dashboard` or a sub-route of it.

**However**, a real secondary collision exists: the existing nav items already use `pathname.startsWith`. If a user is on `/dashboard`, none of the current 5 nav items (`/ai-search`, `/profiles`, `/analyses`, `/download`, `/settings`) will match — the topbar will show no active item. After adding Home with `/dashboard`, it will correctly activate on `/dashboard`. This part is fine.

**The actual blocker:** The plan states "The existing active-state logic (`pathname.startsWith(item.url)`) will work automatically." This claim needs explicit verification because the check is `pathname.startsWith("/dashboard")` — if any future sub-routes like `/dashboard/settings` or `/dashboard/profile-setup` are ever added, they will spuriously activate Home. More immediately relevant: the plan must specify whether to use `pathname === "/dashboard"` (exact match, future-proof) or `pathname.startsWith("/dashboard")` (prefix match, current behavior). The plan does not address this and leaves it ambiguous, which means the executor may ship the prefix version.

**Severity:** BLOCKER — the plan says "will work automatically" without specifying the exact match approach. The executor must use `pathname === item.url` for the `/dashboard` item or apply a special `exact` flag. If left to `startsWith`, any future `/dashboard/*` sub-route will show Home as active when it should not.

**Fix:** In Task 2 of 33-01, add an explicit instruction:
- Either use `pathname === "/dashboard"` for the Home item (add an `exact?: boolean` field to navItems and gate the `isActive` check accordingly), or
- Confirm the `startsWith` check is intentional and acceptable for the `/dashboard` URL with no sub-routes planned.

The plan must not leave this as implicit.

---

### WARNING — `createProfile` returns the new profile ID but the plan gives a conditional fallback that is less clear

**Dimension:** task_completeness
**Plan:** 33-01, Task 2

**The situation:**
The plan says: "Note: `createProfile` returns the new profile ID — check the server action return type. If it just creates without returning ID, call `createProfile(name)` then `router.push('/profiles')` and `router.refresh()`."

The codebase confirms `createProfile` at line 42 of actions.ts returns `data.id as string`. So the conditional is dead code — the ID is always returned. Leaving the conditional note in the plan risks the executor implementing the weaker fallback path (`router.push('/profiles')`) instead of the direct `router.push('/profiles/${id}')`.

**Fix:** Remove the conditional from the plan. State definitively: "Call `createProfile(name)`, receive the returned `id: string`, then call `router.push(\`/profiles/${id}\`)`. The server action always returns the new profile ID."

---

### WARNING — 33-02 wave assignment and dependency inconsistency

**Dimension:** dependency_correctness
**Plan:** 33-02

**The situation:**
33-02 is assigned `wave: 1` and `depends_on: []`. However, 33-02 Task 1 explicitly depends on `ProfileCreationChooser` created in 33-01:
- 33-02 `interfaces` block documents the component as "created in plan 33-01"
- 33-02 `key_links` states `via: "import ProfileCreationChooser from plan 33-01"`
- The `files_modified` for 33-02 include `profile-list.tsx` which imports from `profile-creation-chooser.tsx`

If both plans run in wave 1 in parallel, the executor of 33-02 may start before `profile-creation-chooser.tsx` exists. The `depends_on: []` combined with `wave: 1` implies parallel execution. The plan context instructs 33-02 to read `33-01-SUMMARY.md` (which only exists after 33-01 completes), suggesting sequential intent — but the frontmatter does not enforce this.

**Fix:** Change 33-02 frontmatter to:
```
wave: 2
depends_on: ["01"]
```

This makes the dependency explicit and prevents parallel execution.

---

## Task Completeness Check

| Plan | Task | Files | Action | Verify | Done | Status |
|------|------|-------|--------|--------|------|--------|
| 33-01 | Task 1 | Yes | Specific | Yes (tsc) | Yes | PASS |
| 33-01 | Task 2 | Yes | Specific (with ambiguity — see blocker) | Yes (tsc) | Yes | WARN |
| 33-02 | Task 1 | Yes | Specific | Yes (tsc) | Yes | PASS |
| 33-02 | Task 2 | Yes | Specific | Yes (tsc + python) | Yes | PASS |

---

## Key Links Check

| Link | From | To | Via | Planned? |
|------|------|----|-----|----------|
| Dashboard page -> Chooser | dashboard/page.tsx | profile-creation-chooser.tsx | import + render | Yes (33-01 Task 2 action step 3) |
| TopNavbar -> /dashboard | top-navbar.tsx | /dashboard | nav item url | Yes (33-01 Task 2 action step 2) |
| profile-list.tsx -> ProfileCreationChooser | profile-list.tsx | profile-creation-chooser.tsx | import | Yes (33-02 Task 1 step 1) |
| scoring.py title priority | scoring.py line 155-156 | short_title field | field order change | Yes (33-02 Task 2 step 3) |
| download page -> dashboard layout | (dashboard)/download/page.tsx | layout.tsx | route group membership | Yes (implicit via move) |

All key links are planned. However the active-state wiring for Home nav item has the blocker noted above.

---

## Scope Check

| Plan | Tasks | Files | Status |
|------|-------|-------|--------|
| 33-01 | 2 | 4 | PASS (within 2-3 target) |
| 33-02 | 2 | 4 | PASS (within 2-3 target) |

---

## Context Compliance Check

Locked decisions from CONTEXT.md vs plan implementation:

| Decision | Plan | Task | Status |
|----------|------|------|--------|
| Welcome header: "Welcome to HomeMatch" | 33-01 | Task 1 (translation key `dashboard_welcome`) | Compliant |
| Subheader: "Let's create your profile" | 33-01 | Task 1 (translation key `dashboard_subtitle`) | Compliant |
| AI card description: exact copy | 33-01 | Task 1 action item 1 | Compliant |
| Manual card description: exact copy | 33-01 | Task 1 action item 1 | Compliant |
| Two side-by-side cards | 33-01 | Task 1 (grid layout specified) | Compliant |
| Home nav item | 33-01 | Task 2 | Compliant |
| Logo -> landing page unchanged | Neither plan | N/A | Not needed (no change planned) |
| "+ New Profile" shows two-card chooser | 33-02 | Task 1 | Compliant |
| Download page: all nav items visible | 33-02 | Task 2 | Compliant |
| Analyses: English titles | 33-02 | Task 2 (scoring.py fix) | Compliant |

CONTEXT.md note: "No backend change expected; this is likely a frontend field selection fix" was listed as a user belief, not a locked decision. The plan correctly identifies the root cause is in `scoring.py` (backend) after research confirmed it. This is appropriate use of Claude's discretion.

Deferred ideas check: No onboarding flows, no animations beyond basic hover transitions, no multi-step wizard improvements found in plans. Compliant.

---

## Backend Fix Correctness Check

The plan changes `scoring.py` line 155-156 from:
```python
listing.description_title or listing.public_title or listing.short_title or None
```
to:
```python
listing.short_title or listing.pitch_title or listing.public_title or listing.description_title or None
```

Verification of model fields: `FlatfoxListing` in `backend/app/models/listing.py` has both `short_title` (line 65) and `pitch_title` (line 67) already defined as `Optional[str]`. The plan's concern in the RESEARCH.md open question 3 ("pitch_title is not in current model") is resolved — it IS in the model. The backend fix will work without any model changes.

---

## Summary

**Result: FAIL**

**Must fix before execution:**

1. **[BLOCKER] 33-01 Task 2 — active-state nav logic for Home item.** The plan says `startsWith` "will work automatically" but does not specify whether to use exact match (`pathname === "/dashboard"`) or prefix match. The executor needs an explicit instruction. Specify exact match (`pathname === item.url`) for the Home entry, or add an `exact` flag to the navItem type and gate `isActive` accordingly.

**Should fix before execution:**

2. **[WARNING] 33-01 Task 2 — remove the conditional createProfile note.** The server action provably returns an ID. Replace the conditional with a direct: "call `createProfile(name)`, get back `id`, push to `/profiles/${id}`."

3. **[WARNING] 33-02 frontmatter — wave/depends_on mismatch.** Change `wave: 1, depends_on: []` to `wave: 2, depends_on: ["01"]` to reflect that 33-02 Task 1 requires `profile-creation-chooser.tsx` from 33-01.

Once the blocker is addressed, the plans are otherwise well-structured, atomic, and executable.
