---
quick_task: 260329
subsystem: quick-apply
tags: [quick-apply, fastapi, supabase, edge-functions, phone, applications, ai-messages]
tech_stack:
  added: [requests (backend), QuickApplyPanel component, applications DB table]
  patterns: [server-action phone save, edge-function JWT proxy, client-side session fetch]
key_files:
  created:
    - supabase/migrations/013_add_phone_to_profiles.sql
    - supabase/migrations/014_applications_table.sql
    - web/src/components/profiles/ContactDetailsCard.tsx
    - web/src/components/quick-apply/QuickApplyPanel.tsx
    - web/src/app/(dashboard)/applications/actions.ts
    - web/src/app/(dashboard)/applications/page.tsx
    - backend/app/routers/quick_apply.py
    - backend/app/routers/message_gen.py
    - supabase/functions/quick-apply/index.ts
    - supabase/functions/generate-message/index.ts
  modified:
    - web/src/app/(dashboard)/profiles/actions.ts
    - web/src/app/(dashboard)/profiles/[profileId]/page.tsx
    - web/src/components/top-matches/TopMatchCard.tsx
    - web/src/app/(dashboard)/top-matches/page.tsx
    - web/src/components/top-navbar.tsx
    - backend/app/main.py
    - backend/requirements.txt
decisions:
  - Phone column is nullable text with no constraints (trim-or-null at save time)
  - Migration 013 + 014 applied via db query due to migration history desync (had both numeric and full-name versions in remote schema_migrations); used INSERT INTO supabase_migrations.schema_migrations to record completion
  - EC2 deployment skipped: project_key.pem not available on dev machine; code pushed to GitHub for EC2 to pull
  - requests added to backend requirements.txt (was missing but needed for quick_apply.py)
  - recordApplication called client-side after successful send (server action from client component via 'use server' import)
  - TopMatchCard openPanelId/onOpenPanel/onClosePanel/onApplied have no defaults to avoid callers accidentally omitting them; null openPanelId gracefully shows button state
  - Applied badge shows "Applied" text without checkmark unicode to avoid font rendering issues
metrics:
  completed_date: "2026-04-02"
  plans_executed: 5
  total_commits: 3
---

# Quick Task 260329: v7.0 Quick Apply Milestone (Phases 42-46) Summary

One-liner: Full Quick Apply pipeline — phone on profiles, FastAPI CSRF-extract-and-POST endpoint, Claude-drafted German messages, inline apply panel on TopMatches cards, and applications tracking table + page.

## Plans Executed

| Plan | Phase | Description | Status |
|------|-------|-------------|--------|
| 01 | 42 | Profile Contact Details (phone column + ContactDetailsCard) | Complete |
| 02 | 43 | Backend /quick-apply endpoint + edge function proxy | Complete (EC2 deploy pending SSH key) |
| 03 | 44 | Backend /generate-message endpoint + edge function proxy | Complete (EC2 deploy pending SSH key) |
| 04 | 45 | Quick Apply UI (QuickApplyPanel + TopMatchCard wiring) | Complete |
| 05 | 46 | Apply Tracking (applications table + page + navbar) | Complete |

## Commits

| Hash | Description |
|------|-------------|
| efd8fd7 | feat(42-01): add phone to profiles + Contact Details card |
| b987de3 | feat(43-44-02-03): quick-apply + generate-message backend endpoints + edge functions |
| 6d10da0 | feat(45-46-04-05): Quick Apply UI + Apply Tracking |

## What Was Built

### Phase 42: Profile Contact Details
- `supabase/migrations/013_add_phone_to_profiles.sql`: `ALTER TABLE profiles ADD COLUMN phone text;`
- `saveProfilePhone` server action in `profiles/actions.ts`
- `ContactDetailsCard` client component — read-only name/email, editable phone with Save button
- Profile edit page updated to select phone and render ContactDetailsCard above PreferencesForm

### Phase 43: Backend Send Endpoint
- `backend/app/routers/quick_apply.py`: `POST /quick-apply` — uses `requests.Session` to GET Flatfox listing page, extracts CSRF token via regex, POSTs contact form. Returns structured `{success, error?}` JSON. All error paths return structured responses (no unhandled 500s).
- `supabase/functions/quick-apply/index.ts`: JWT-authenticated edge function proxy to EC2 `/quick-apply`

### Phase 44: AI Message Generation
- `backend/app/routers/message_gen.py`: `POST /generate-message` — calls Claude with German system prompt to draft 80-100 word rental inquiry. Falls back to template on API error.
- `supabase/functions/generate-message/index.ts`: JWT-authenticated edge function proxy to EC2 `/generate-message`

### Phase 45: Quick Apply UI
- `QuickApplyPanel.tsx`: Shows AI-drafted textarea, Regenerate button, Send/Cancel controls with loading states
- `TopMatchCard.tsx`: Added Quick Apply button, inline panel (one at a time), Applied badge
- `top-matches/page.tsx`: Fetches user session + active profile + existing applications on mount; passes Quick Apply props to all cards

### Phase 46: Apply Tracking
- `supabase/migrations/014_applications_table.sql`: `applications` table with RLS, unique constraint on (user_id, profile_id, listing_id)
- `applications/actions.ts`: `recordApplication` server action with upsert + ignoreDuplicates
- `applications/page.tsx`: Server component listing sent applications per active profile
- `top-navbar.tsx`: Applications link added after Analyses

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing `requests` library in backend requirements.txt**
- Found during: Plan 02 Task 1
- Issue: `quick_apply.py` uses `import requests` but requirements.txt had no `requests` dependency
- Fix: Added `requests` to `backend/requirements.txt`
- Files modified: backend/requirements.txt

**2. [Rule 3 - Blocking] Missing `@googlemaps/js-api-loader` npm package**
- Found during: Plan 01 Task 2 (build verification)
- Issue: Phase 41 PropertyMapView.tsx imports from `@googlemaps/js-api-loader` but it wasn't installed
- Fix: `npm install @googlemaps/js-api-loader` in web/
- Pre-existing regression from Phase 41, fixed as part of build verification

**3. [Rule 1 - Migration History] Supabase migration history desync**
- Found during: Plan 01 Task 1
- Issue: Remote schema_migrations had both `005` and `005_listing_profiles` (duplicate with/without filename suffix). `supabase db push --linked` failed.
- Fix: Used `npx supabase migration repair --status applied 006..012 --linked` to fix numeric versions, then applied SQL directly via `npx supabase db query` and manually inserted into `schema_migrations`
- Both migration 013 and 014 applied this way

### Auth Gates

**EC2 SSH Deployment**
- Found during: Plan 02 (deploy step)
- `~/.ssh/project_key.pem` referenced in CLAUDE.md does not exist on this dev machine
- Action taken: Code pushed to GitHub (`git push origin main`)
- Required action: SSH into EC2 with the project key from wherever it is stored and run the deploy command:
  ```bash
  ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 "cd gen-ai-hackathon && git pull && pkill -f uvicorn; cd backend && nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &"
  ```

## Self-Check: PASSED

All 10 created files verified present.
All 3 commits exist in git log.
Both edge functions deployed and ACTIVE (verified via `supabase functions list`).
Both DB migrations applied (verified via `supabase db query` checking columns + table existence).
TypeScript check showed no errors in any new/modified files.
