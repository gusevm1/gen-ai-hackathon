# Architecture Research

**Domain:** Multi-profile integration for HomeMatch v1.1 — Chrome Extension + Next.js + FastAPI + Supabase
**Researched:** 2026-03-13
**Confidence:** HIGH (direct codebase analysis, no external verification needed for integration design)

---

## Existing Architecture (v1.0 Baseline)

Before documenting changes, this is what v1.0 actually built:

```
┌────────────────────┐     ┌────────────────────────┐     ┌──────────────────┐
│  Next.js (Vercel)  │────►│  Supabase              │────►│  FastAPI (EC2)   │
│                    │     │  - Auth (email/pw)      │     │                  │
│  /              (home)   │  - user_preferences     │     │  POST /score     │
│  /dashboard     (prefs)  │    (one row per user,   │     │  - Flatfox API   │
│  /analysis/[id] (full)   │     JSONB)              │     │  - Claude API    │
└────────────────────┘     │  - analyses             │     │  - save results  │
                           │    (one per user+       │     └──────────────────┘
┌────────────────────┐     │     listing, JSONB)     │
│  Chrome Extension  │     │  - Edge Function:       │
│  (WXT MV3)         │     │    score-proxy          │
│                    │     │    (validates JWT,       │
│  Popup:            │     │     proxies to EC2)     │
│  - Login/logout    │     └────────────────────────┘
│  - Link to web     │
│                    │
│  Content Script:   │
│  - FAB button      │
│  - Shadow DOM      │
│    score badges    │
│  - Summary panels  │
└────────────────────┘
```

### Current DB Schema (v1.0)

```sql
-- One row per user. Preferences stored as flat JSONB.
user_preferences (
  id uuid PK,
  user_id uuid FK auth.users UNIQUE,  -- enforced single profile per user
  preferences jsonb,                   -- { location, offerType, budgetMin, ..., weights }
  updated_at timestamptz,
  created_at timestamptz
)

-- One row per user+listing pair.
analyses (
  id uuid PK,
  user_id uuid FK auth.users,
  listing_id text,
  score numeric,
  breakdown jsonb,   -- full ScoreResponse
  summary text,
  created_at timestamptz,
  UNIQUE(user_id, listing_id)  -- one analysis per user per listing
)
```

### Current Storage: Two-source Problem

The extension stores a single `local:userProfile` in `browser.storage.local` (WXT wrapper for `chrome.storage.local`). The web app stores preferences in Supabase `user_preferences`. These are **two separate sources** that can diverge:

- Extension wizard saves to `browser.storage.local` — the backend reads from Supabase
- Web dashboard saves to Supabase `user_preferences` — extension does not sync back
- Backend `supabase_service.get_preferences(user_id)` reads from Supabase, not extension storage

**Result:** In v1.0, the extension wizard and web form are essentially independent data entry points for the same single profile. The backend always uses the Supabase copy.

---

## Target Architecture (v1.1 Multi-Profile)

The core change: one user can have **N named profiles** (e.g., "Family in Zurich", "Studio near Basel"). The active profile drives scoring. The extension popup shows which profile is active and lets the user switch.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                                       │
│                                                                         │
│  /                         (landing / sign-in)                          │
│  /dashboard                (profile list + "New Profile" CTA)           │
│  /profiles/[id]            (edit a single profile's preferences)        │
│  /analysis/[listingId]     (full analysis — now profile-aware)          │
│                                                                         │
│  Server Actions:                                                        │
│  - listProfiles(userId)         → profiles[]                           │
│  - createProfile(userId, name)  → profile                              │
│  - updateProfile(profileId, data)                                       │
│  - deleteProfile(profileId)                                             │
│  - setActiveProfile(userId, profileId)                                  │
└────────────────────────────────────────────────────────────────────────┘
        │ writes/reads Supabase
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Supabase                                                               │
│                                                                         │
│  profiles (NEW TABLE)                                                   │
│    id uuid PK                                                           │
│    user_id uuid FK auth.users                                           │
│    name text                     -- "Family in Zurich"                  │
│    preferences jsonb             -- same shape as old user_preferences  │
│    is_default boolean default false                                     │
│    created_at / updated_at                                              │
│                                                                         │
│  user_active_profile (NEW TABLE or column)                              │
│    user_id uuid FK auth.users UNIQUE                                    │
│    profile_id uuid FK profiles                                          │
│    updated_at                                                           │
│                                                                         │
│  analyses (MODIFIED)                                                    │
│    + profile_id uuid FK profiles   -- which profile scored this         │
│    UNIQUE changed: (user_id, listing_id, profile_id)                   │
│                                                                         │
│  user_preferences (DEPRECATED, kept for migration only)                │
│                                                                         │
│  Edge Function: score-proxy (MODIFIED)                                  │
│    Accepts optional profile_id in request body                          │
│    If no profile_id: use user's active profile                          │
│    Fetches from profiles table instead of user_preferences              │
└────────────────────────────────────────────────────────────────────────┘
        │ proxies to EC2
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FastAPI (EC2)                                                          │
│                                                                         │
│  POST /score (MODIFIED)                                                 │
│    ScoreRequest now accepts profile_id (optional)                       │
│    SupabaseService.get_preferences(user_id, profile_id=None)           │
│      - if profile_id: fetch from profiles table by profile_id          │
│      - else: fetch user's active profile from user_active_profile      │
│                                                                         │
│  SupabaseService.save_analysis(user_id, listing_id, score_data,        │
│                                profile_id)   ← NEW param               │
└────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Chrome Extension (WXT MV3)                                            │
│                                                                         │
│  Popup (MODIFIED):                                                      │
│    - Shows active profile name (fetched from Supabase or extension     │
│      storage)                                                           │
│    - Profile switcher: dropdown or list of profiles                    │
│    - "Manage profiles" → opens web dashboard                           │
│                                                                         │
│  browser.storage.local (MODIFIED key structure):                       │
│    local:activeProfileId   → uuid string                               │
│    local:activeProfileData → full preferences JSONB (cached copy)      │
│    (old local:userProfile deprecated)                                  │
│                                                                         │
│  Content Script (UNCHANGED for scoring):                               │
│    Sends { listing_id } to score-proxy                                 │
│    Edge function resolves active profile server-side                   │
│    No change needed here                                               │
│                                                                         │
│  Background Service Worker (MODIFIED):                                 │
│    New message: { action: 'getProfiles' }                              │
│    New message: { action: 'setActiveProfile', profileId }              │
│    Fetches profile list from Supabase REST API on demand               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## DB Schema Changes

### New Tables

```sql
-- Migration: 002_multi_profile.sql

-- Profiles: one-to-many, user can have N profiles
CREATE TABLE profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enforce max one default per user at DB level via partial unique index
CREATE UNIQUE INDEX profiles_one_default_per_user
  ON profiles (user_id)
  WHERE is_default = true;

-- Active profile pointer per user (alternative: just query is_default)
-- Simple approach: active = is_default = true. No separate table needed.

-- Analyses: add profile_id foreign key, relax unique constraint
ALTER TABLE analyses
  ADD COLUMN profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Old unique(user_id, listing_id) → new unique(user_id, listing_id, profile_id)
ALTER TABLE analyses DROP CONSTRAINT analyses_user_id_listing_id_key;
CREATE UNIQUE INDEX analyses_unique_per_profile
  ON analyses (user_id, listing_id, profile_id);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profiles"
  ON profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Backfill: migrate existing user_preferences → profiles (one default profile each)
INSERT INTO profiles (user_id, name, preferences, is_default, created_at, updated_at)
SELECT user_id, 'My Profile', preferences, true, created_at, updated_at
FROM user_preferences
ON CONFLICT DO NOTHING;
```

### Active Profile Approach

Use `is_default = true` as the active profile marker. This avoids a separate `user_active_profile` join table. The partial unique index guarantees exactly one default per user at the DB level.

Switching active profile = a transaction that:
1. `UPDATE profiles SET is_default = false WHERE user_id = $1`
2. `UPDATE profiles SET is_default = true WHERE id = $2 AND user_id = $1`

This must be done atomically to avoid a window where no profile is default.

---

## Component Boundaries: New vs Modified

### New Components

| Component | Location | What It Is |
|-----------|----------|------------|
| `profiles` DB table | Supabase | Replaces `user_preferences` for multi-profile |
| `ProfileList` | `web/src/components/profiles/` | Dashboard list: name, edit, delete, set-active |
| `ProfileForm` | `web/src/components/profiles/` | Create/edit a profile (wraps preferences form) |
| `ProfileSwitcher` | `extension/src/components/popup/` | Dropdown in popup for switching active profile |
| `listProfiles` server action | `web/src/app/dashboard/` | Load all profiles for user |
| `createProfile` server action | `web/src/app/dashboard/` | Create new named profile |
| `setActiveProfile` server action | `web/src/app/dashboard/` | Set `is_default` flag |
| `deleteProfile` server action | `web/src/app/dashboard/` | Delete profile (guard: can't delete last one) |
| `/profiles/[id]` route | `web/src/app/profiles/[id]/` | Edit a specific profile |
| `002_multi_profile.sql` | `supabase/migrations/` | DB schema migration |
| `local:activeProfileId` storage key | Extension | Cached active profile UUID |
| `local:activeProfileData` storage key | Extension | Cached active preferences data |

### Modified Components

| Component | Location | Change |
|-----------|----------|--------|
| `score-proxy` edge function | `supabase/functions/score-proxy/` | Read from `profiles` (active) instead of `user_preferences` |
| `ScoreRequest` model | `backend/app/models/scoring.py` | Add optional `profile_id` field |
| `SupabaseService.get_preferences` | `backend/app/services/supabase.py` | Query `profiles` table; resolve active by `is_default` |
| `SupabaseService.save_analysis` | `backend/app/services/supabase.py` | Include `profile_id` when saving to `analyses` |
| `UserPreferences` model | `backend/app/models/preferences.py` | No schema change; source table changes |
| `Dashboard` popup component | `extension/src/components/popup/` | Add profile name display + switcher |
| `background.ts` | `extension/src/entrypoints/` | Add `getProfiles` and `setActiveProfile` message handlers |
| `api.ts` | `extension/src/lib/` | Add `fetchProfiles(jwt)` function calling Supabase REST |
| `profile-storage.ts` | `extension/src/storage/` | Add `activeProfileId` and `activeProfileData` storage items |
| `DashboardPage` | `web/src/app/dashboard/` | Replace single preferences form with profile list |
| `analyses` DB table | Supabase | Add `profile_id` FK, update unique constraint |
| `AnalysisPage` | `web/src/app/analysis/[listingId]/` | Show which profile was used |

### Unchanged Components

| Component | Reason |
|-----------|--------|
| Content script (`App.tsx`, `Fab`, `ScoreBadge`, `SummaryPanel`) | No change: scoring flow unchanged from extension's perspective |
| Scoring pipeline in FastAPI (orchestration logic in `scoring.py`) | Only the preferences-fetch method changes, not the flow |
| Claude scorer and prompts | Preferences data shape is unchanged |
| Flatfox API client | No relation to profiles |
| Auth flow (background.ts signIn/signOut) | Unchanged |
| Web analysis page structure | Minor addition only (which profile label) |

---

## Data Flow Changes

### Scoring Flow (v1.1)

```
User clicks FAB on Flatfox
    |
    v
Content script: sends { action: 'getSession' } to background
    |
    v
Background: returns JWT access_token
    |
    v
Content script: POST to score-proxy edge function
  body: { listing_id: 12345 }        <-- no profile_id sent (server resolves)
  headers: Authorization: Bearer JWT
    |
    v
score-proxy edge function:
  1. Validate JWT → get user_id
  2. Query: SELECT * FROM profiles
            WHERE user_id = $1 AND is_default = true
            LIMIT 1
  3. If no profile found → 404 "Please create a profile"
  4. Proxy to EC2: { listing_id, user_id, profile_id: profile.id }
    |
    v
FastAPI POST /score:
  1. Fetch listing from Flatfox
  2. get_preferences(user_id, profile_id) → reads from profiles table
  3. Fetch images
  4. Claude scoring (unchanged)
  5. save_analysis(user_id, listing_id, score_data, profile_id)
  6. Return ScoreResponse
```

### Profile Switch Flow (Extension)

```
User opens popup
    |
    v
Dashboard component: sends { action: 'getProfiles' } to background
    |
    v
Background: fetches from Supabase REST API
  GET /rest/v1/profiles?user_id=eq.{uid}&select=id,name,is_default
  Authorization: Bearer JWT
    |
    v
Background: returns profiles[] to popup
    |
    v
Dashboard: renders ProfileSwitcher with list of profiles
    |
    v
User selects different profile
    |
    v
Dashboard: sends { action: 'setActiveProfile', profileId } to background
    |
    v
Background: calls Supabase REST API (PATCH to set is_default)
  OR: Next.js server action via fetch (simpler, keeps business logic in web)
    |
    v
Background: updates local:activeProfileId and local:activeProfileData in storage
    |
    v
Next FAB click uses updated active profile (resolved server-side)
```

**Decision: Where to handle setActiveProfile from extension**

Option A: Extension background calls Supabase REST API directly (PATCH profiles).
Option B: Extension background calls a Next.js API route or server action endpoint.

Recommendation: **Option A** (direct Supabase REST from background). Simpler, fewer hops. The background already has the JWT and the Supabase URL/anon key. RLS ensures users can only update their own profiles.

### Profile Management Flow (Web)

```
User visits /dashboard (now a profile list page)
    |
    v
Server component: listProfiles(userId) → profiles[]
    |
    v
ProfileList rendered with cards: name, "Edit", "Delete", active indicator
    |
    v
User clicks "New Profile" → modal or /profiles/new route
    |
    v
createProfile server action: INSERT INTO profiles (user_id, name, preferences)
  First profile: is_default = true automatically
  Subsequent profiles: is_default = false
    |
    v
User clicks "Edit" → /profiles/[id] route
    |
    v
updateProfile server action: UPDATE profiles SET preferences = $1 WHERE id = $2
    |
    v
User clicks "Set Active" → setActiveProfile server action (transaction)
```

---

## Extension Profile Sync Strategy

The extension needs to know the active profile to display it in the popup. Two approaches:

**Approach 1: Always server-authoritative (no local cache)**
- Popup always fetches profile list from Supabase on open
- No `local:activeProfileId` storage needed
- Pro: Always accurate. Con: 200-400ms network call on every popup open.

**Approach 2: Cache active profile in extension storage**
- On login or profile switch: store `activeProfileId` and `activeProfileData` locally
- Popup reads from local storage first, shows stale data instantly, refreshes in background
- Pro: Fast popup. Con: Stale if user switches profile on web.

Recommendation: **Approach 1** for v1.1. The popup is opened infrequently (a few times per session). Network latency is acceptable. Avoids stale-cache bugs entirely. Cache can be added later if needed.

The critical insight: **scoring does not use the extension's local profile at all**. The backend resolves the active profile server-side using the JWT. Extension storage is only needed for popup display, not for scoring correctness.

---

## Architectural Patterns

### Pattern 1: Server-Authoritative Active Profile

**What:** The active profile is resolved server-side on every score request. The extension never sends `profile_id` in the score request body — the edge function queries Supabase for `is_default = true`.

**When to use:** Always, for scoring. This eliminates the class of bugs where the extension's local `activeProfileId` diverges from what Supabase considers active.

**Trade-offs:** One extra DB query per score request (cheap). Eliminates need to sync active profile ID to extension before scoring.

**Example (edge function):**
```typescript
// score-proxy/index.ts — modified preference fetch
const { data: profile, error } = await supabase
  .from('profiles')
  .select('preferences, id')
  .eq('user_id', data.user.id)
  .eq('is_default', true)
  .single();

if (!profile) {
  return new Response(
    JSON.stringify({ error: 'No active profile. Please create one at homematch.app' }),
    { status: 404, headers: corsHeaders }
  );
}

// Forward profile_id to backend for analysis attribution
const backendPayload = { ...body, user_id: data.user.id, profile_id: profile.id };
```

### Pattern 2: Partial Unique Index for Single Default

**What:** A PostgreSQL partial unique index enforces "at most one default profile per user" at the database level, not in application code.

**When to use:** Any time you need a "selected one" from a one-to-many relationship.

**Trade-offs:** Requires a transaction to switch the active profile (SET old to false, SET new to true atomically). If you only SET new to true without clearing old, the index constraint fires.

**Example:**
```sql
-- Partial unique index
CREATE UNIQUE INDEX profiles_one_default_per_user
  ON profiles (user_id)
  WHERE is_default = true;

-- Switch active profile (must be atomic)
BEGIN;
  UPDATE profiles SET is_default = false WHERE user_id = $1 AND is_default = true;
  UPDATE profiles SET is_default = true WHERE id = $2 AND user_id = $1;
COMMIT;
```

In Supabase, this transaction can be done via a Postgres function (RPC) called from the edge function, or via a server action using the service role client.

### Pattern 3: Profile-Aware Analysis Attribution

**What:** Every analysis row now stores `profile_id`. When viewing past analyses on the web, filter by the currently-selected profile to show relevant history.

**When to use:** Once multi-profile is live. Before, all analyses were implicitly "for the user." Now they're "for a specific profile of that user."

**Trade-offs:** `analyses` unique constraint changes from `(user_id, listing_id)` to `(user_id, listing_id, profile_id)`. This means the same listing can be scored under different profiles, producing different results. This is the desired behavior.

**Example (analysis page query):**
```typescript
// web/src/app/analysis/[listingId]/page.tsx
const { data: analysis } = await supabase
  .from('analyses')
  .select('*')
  .eq('user_id', user.id)
  .eq('listing_id', listingId)
  .eq('profile_id', activeProfileId)  // NEW: filter by profile
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### Pattern 4: Extension Popup Profile Switcher

**What:** The popup fetches all profiles for the user, displays the active one prominently, and allows switching via a dropdown or list. Profile switching calls Supabase REST directly from the background service worker.

**When to use:** On every popup open (Approach 1 — always fresh).

**Trade-offs:** One network call per popup open. Acceptable given popup usage patterns.

**Example (background.ts additions):**
```typescript
type ProfileMessage =
  | { action: 'getProfiles' }
  | { action: 'setActiveProfile'; profileId: string };

case 'getProfiles': {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { profiles: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, is_default')
    .order('created_at', { ascending: true });

  return { profiles: data ?? [], error: error?.message ?? null };
}

case 'setActiveProfile': {
  // Use a Supabase RPC for atomic swap, or two sequential updates
  const { error } = await supabase.rpc('set_active_profile', {
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_profile_id: message.profileId,
  });
  return { error: error?.message ?? null };
}
```

---

## Integration Points

### New Integration Points (v1.1)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Extension popup → Supabase REST | Background fetches `profiles` table via REST API with JWT | Background already has supabase client — add `getProfiles` message handler |
| Extension background → Supabase RPC | `setActiveProfile` calls a Postgres function for atomic default swap | Alternative: two PATCH requests (not atomic, but acceptable if error handled) |
| score-proxy → `profiles` table | Edge function queries `profiles WHERE is_default = true` instead of `user_preferences` | Requires edge function update; critical path change |
| FastAPI → `profiles` table | `SupabaseService.get_preferences` queries `profiles` by `profile_id` | Requires Python model update |
| `analyses` → `profiles` | FK relationship; analysis stores which profile scored it | Requires migration + upsert key change |
| Web `/profiles/[id]` → `PreferencesForm` | Reuse existing form component with profile data | The form component itself is unchanged — it gets different `defaultValues` |
| Web `/dashboard` → `ProfileList` | New component replaces single preferences form | Dashboard page is substantially rewritten |

### Unchanged Integration Points

| Boundary | Notes |
|----------|-------|
| Content script → background → score-proxy | Same message flow, no change |
| score-proxy → FastAPI EC2 | Same HTTP proxy pattern, adds `profile_id` to body |
| FastAPI → Flatfox API | Completely unchanged |
| FastAPI → Claude API | Completely unchanged |
| Supabase Auth | Completely unchanged |
| Extension login/logout | Completely unchanged |

---

## Build Order (Dependency Graph)

Build in this exact order — each step unblocks the next:

```
Step 1: DB Migration (002_multi_profile.sql)
  - Creates profiles table with is_default flag + partial unique index
  - Adds profile_id FK to analyses, updates unique constraint
  - Backfills existing user_preferences → one default profile per user
  - No code changes needed yet; can validate schema independently
  - MUST be deployed before any backend or edge function changes

Step 2: FastAPI Backend (supabase.py + scoring.py models)
  - Update SupabaseService.get_preferences to query profiles table
  - Update SupabaseService.save_analysis to accept + store profile_id
  - Add profile_id to ScoreRequest model
  - Deploy to EC2 before edge function update
  - Backend is now profile-aware but edge function still sends no profile_id (OK:
    backend will resolve via active profile)

Step 3: Edge Function (score-proxy)
  - Change preference fetch: user_preferences → profiles WHERE is_default = true
  - Add profile_id to backend proxy payload
  - Deploy to Supabase
  - End-to-end scoring now uses profiles table — test with existing seeded profile

Step 4: Web Dashboard Overhaul (new profile management UI)
  - New server actions: listProfiles, createProfile, updateProfile,
    deleteProfile, setActiveProfile
  - New /profiles/[id] route for editing a profile
  - Rewrite /dashboard page to show ProfileList instead of single form
  - Navbar component (new — no deps)
  - This is the biggest chunk; can develop against migration-seeded test profiles

Step 5: Extension Popup Profile Switcher
  - Add getProfiles + setActiveProfile message handlers to background.ts
  - Add ProfileSwitcher component to popup Dashboard
  - Fetch and display active profile name on popup open
  - Depends on Step 1 (profiles table) and Step 3 (active profile semantics)

Step 6: Analysis Page + Cross-profile polish
  - Update analysis queries to filter by profile_id
  - Add "scored with profile: X" label on analysis page
  - Verify scoring produces separate rows for same listing under different profiles
```

**Rationale:**
- DB first: nothing works without the schema
- Backend before edge function: edge function now sends `profile_id` which backend must accept
- Edge function before frontend: ensures scoring works before building the UI that drives it
- Web before extension popup: web is the primary profile management surface; extension popup is secondary display
- Analysis page last: low-risk, no blockers once profiles exist

---

## Recommended Project Structure Changes

Only additions/modifications to existing structure:

```
web/src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              (REWRITE: profile list, not single form)
│   │   └── actions.ts            (ADD: listProfiles, createProfile, deleteProfile, setActiveProfile)
│   └── profiles/                 (NEW)
│       ├── new/
│       │   └── page.tsx          (NEW: create profile form)
│       └── [id]/
│           ├── page.tsx          (NEW: edit profile — reuses PreferencesForm)
│           └── actions.ts        (NEW: updateProfile server action)
├── components/
│   ├── layout/                   (NEW)
│   │   └── Navbar.tsx            (NEW: top nav with logo, user menu)
│   └── profiles/                 (NEW)
│       ├── ProfileList.tsx       (NEW: list of profile cards)
│       ├── ProfileCard.tsx       (NEW: single profile card with actions)
│       └── ProfileForm.tsx       (NEW: wraps PreferencesForm with name field)

extension/src/
├── components/popup/
│   ├── Dashboard.tsx             (MODIFY: add ProfileSwitcher, active profile display)
│   └── ProfileSwitcher.tsx       (NEW: dropdown list of profiles)
├── entrypoints/
│   └── background.ts             (MODIFY: add getProfiles + setActiveProfile handlers)
└── storage/
    └── profile-storage.ts        (MODIFY: add activeProfileId storage item; deprecate userProfile)

backend/app/
├── models/
│   └── scoring.py                (MODIFY: add profile_id to ScoreRequest)
└── services/
    └── supabase.py               (MODIFY: query profiles table; accept profile_id in save_analysis)

supabase/
├── migrations/
│   └── 002_multi_profile.sql     (NEW: profiles table, analyses FK, backfill)
└── functions/
    └── score-proxy/
        └── index.ts              (MODIFY: query profiles WHERE is_default=true)
```

---

## Anti-Patterns

### Anti-Pattern 1: Passing profile_id from Extension to Edge Function

**What people do:** Store `activeProfileId` in `browser.storage.local`, read it in the content script, and send it in the score request body.

**Why it's wrong:** This creates a sync problem. If the user switches their active profile on the web, the extension still has the stale `activeProfileId`. The next scoring request uses the wrong profile silently.

**Do this instead:** Never send `profile_id` from the extension. Let the edge function resolve the active profile server-side from `is_default = true`. The extension is a thin client for scoring — it does not own profile state.

### Anti-Pattern 2: Non-Atomic Default Profile Switch

**What people do:** Two separate UPDATE statements without a transaction:
```sql
UPDATE profiles SET is_default = true WHERE id = $newId;
UPDATE profiles SET is_default = false WHERE id = $oldId;
```

**Why it's wrong:** If the second UPDATE fails, two profiles are simultaneously `is_default = true`. The partial unique index will prevent this for the first update pattern (SET true first) but not the second (SET false first still leaves two rows if the second SET true fails). Either way, partial failure leads to zero or two active profiles.

**Do this instead:** Use a Postgres function (RPC) called via Supabase:
```sql
CREATE OR REPLACE FUNCTION set_active_profile(p_user_id uuid, p_profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET is_default = false WHERE user_id = p_user_id;
  UPDATE profiles SET is_default = true WHERE id = p_profile_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Anti-Pattern 3: Rewriting the Preferences Form Component

**What people do:** Create a new `ProfilePreferencesForm` component that duplicates `PreferencesForm` logic with a profile name field added.

**Why it's wrong:** Doubles the maintenance surface. Any improvement to the preferences form must be made twice.

**Do this instead:** Wrap the existing `PreferencesForm` in a `ProfileForm` that adds only the `name` input above it. Pass `defaultValues` (including the profile name) down. Keep `PreferencesForm` focused on preferences only.

### Anti-Pattern 4: Storing Full Preferences in Extension Storage

**What people do:** Cache all N profiles' preferences in `browser.storage.local` for offline use.

**Why it's wrong:** `browser.storage.local` has a 10MB quota. Preferences data can grow large (many soft criteria, free text). With many profiles, this approaches the limit. More importantly, the extension only needs to *score* — which is a network operation anyway. There's no offline use case.

**Do this instead:** Cache only the active profile's ID (and optionally display name) for popup rendering. Resolve preferences server-side on every score request.

### Anti-Pattern 5: Changing the `analyses` Unique Constraint Without Backfilling

**What people do:** Drop `UNIQUE(user_id, listing_id)` and add `UNIQUE(user_id, listing_id, profile_id)` without ensuring existing rows have a non-null `profile_id`.

**Why it's wrong:** Existing rows have `profile_id = NULL`. NULL values are not equal to each other in SQL unique constraints, meaning the old uniqueness guarantee is lost entirely — you can end up with multiple analyses for the same user+listing once `profile_id` is NULL.

**Do this instead:** In the migration, first backfill `profile_id` on existing analyses rows using the user's (newly created) default profile, then change the unique constraint:
```sql
-- Backfill profile_id on existing analyses
UPDATE analyses a
SET profile_id = p.id
FROM profiles p
WHERE p.user_id = a.user_id AND p.is_default = true;

-- Then add the new constraint (all rows now have non-null profile_id)
CREATE UNIQUE INDEX analyses_unique_per_profile
  ON analyses (user_id, listing_id, profile_id);
```

---

## Scaling Considerations

| Scale | Architecture Notes |
|-------|-------------------|
| 1-10 users (pilot) | Current EC2 + Supabase architecture is fine. No changes needed. |
| 100 users | Profile queries are indexed (user_id, is_default). Supabase free tier handles this comfortably. |
| 10k users | Profiles table is small per user. Main bottleneck remains EC2 LLM cost per score, not DB. |

The multi-profile feature adds minimal DB overhead: profiles table has ~3-5 rows per user on average. The `is_default` partial unique index makes the "get active profile" query O(1).

---

## Sources

- Direct codebase analysis: `/Users/maximgusev/workspace/gen-ai-hackathon/` — HIGH confidence
- Supabase partial unique index docs (known pattern) — HIGH confidence
- Supabase RLS and RPC patterns (established in existing schema) — HIGH confidence
- PostgreSQL atomic UPDATE pattern for single-default row — HIGH confidence

---
*Architecture research for: HomeMatch v1.1 Multi-Profile Integration*
*Researched: 2026-03-13*
