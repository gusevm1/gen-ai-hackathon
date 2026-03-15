# Phase 10: Extension Profile Switcher - Research

**Researched:** 2026-03-15
**Domain:** Chrome Extension (WXT/MV3) -- popup UI, content script communication, Supabase client queries
**Confidence:** HIGH

## Summary

Phase 10 adds profile awareness to the Chrome extension: the popup shows the active profile, provides a switcher dropdown, detects stale scores when the profile changes, performs session health checks, and polishes badge/panel design. The extension already has a working popup with auth (Dashboard.tsx), a content script with Shadow DOM badge injection (App.tsx), and background messaging for auth operations. The key technical challenge is propagating profile state changes from the popup to the content script so badges can be marked stale.

The project already uses `wxt/utils/storage` with `storage.defineItem` for local storage (profile-storage.ts, theme.ts). WXT storage items support `.watch()` which fires across all extension contexts (popup, background, content script) when a value changes. This is the natural mechanism for profile change propagation -- no new messaging infrastructure needed.

The Supabase client already exists in the extension (`lib/supabase.ts`) with a `browser.storage.local` adapter. Profile queries can go through the background script (which already handles auth messages) or directly from the popup since the popup shares the same Supabase client configuration.

**Primary recommendation:** Use WXT `storage.defineItem` for active profile state, `.watch()` in the content script to detect profile changes and mark existing badges as stale, and query Supabase profiles via the background script's existing message handler pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-09 | Extension popup shows active profile name | Popup queries Supabase for profiles via background message, stores active profile in WXT storage item, displays in Dashboard.tsx |
| EXT-10 | Profile switcher dropdown in extension popup | Reuse same dropdown pattern from web app's ProfileSwitcher component, call `set_active_profile` RPC via Supabase client in background |
| EXT-11 | Session health check on FAB click with "Connected" indicator in popup | Background `getSession` + `getUser` calls already exist; add health status to popup Dashboard; FAB click already calls `getSession` |
| EXT-12 | Stale badge indicator when active profile changes mid-session | WXT `storage.watch()` on active profile storage item fires in content script; content script re-renders badges with stale overlay |
| EXT-13 | Improved badge and summary panel design | Pure UI work -- align with web app's CSS custom properties (hsl-based design tokens from globals.css) |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.18 | Extension framework (MV3) | Already used; provides storage, content scripts, Shadow DOM |
| React | 19.2.4 | UI rendering (popup + content) | Already used in popup and content script |
| @supabase/supabase-js | 2.99.1 | Auth + DB queries | Already configured with chrome storage adapter |
| Tailwind CSS | 3.4.19 | Styling | Already used in both popup and content script |
| Radix UI (various) | Various | UI primitives (select, separator, etc.) | Already installed for popup components |
| lucide-react | 0.577.0 | Icons | Already used in popup |
| zod | 4.3.6 | Schema validation | Already used for profile schema |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.0.18 | Testing | For unit tests |
| @testing-library/react | 16.3.2 | React component testing | For popup component tests |
| happy-dom | 20.8.3 | DOM environment for tests | Test environment |

### No New Dependencies Needed

The existing stack covers all Phase 10 requirements. The Radix UI `@radix-ui/react-select` is already installed for the dropdown. No new libraries are needed.

## Architecture Patterns

### Current Extension Architecture
```
extension/src/
  entrypoints/
    background.ts          # Auth message handler (sendMessage/onMessage)
    popup/
      App.tsx              # Renders Dashboard
      main.tsx             # React mount + theme init
    content/
      index.tsx            # Shadow DOM overlay for FAB
      App.tsx              # Scoring logic + per-badge injection
      components/
        Fab.tsx            # FAB button
        ScoreBadge.tsx     # Score circle + tier label
        SummaryPanel.tsx   # Expandable bullet panel
        LoadingSkeleton.tsx
  components/
    popup/
      Dashboard.tsx        # Main popup view (auth state, actions)
      LoginForm.tsx        # Email/password form
  lib/
    supabase.ts           # Supabase client (chrome storage adapter)
    api.ts                # Edge function scoring API
    flatfox.ts            # DOM parser for listing PKs
    theme.ts              # WXT storage item for theme
  storage/
    profile-storage.ts    # WXT storage items (local profile, wizard state)
  schema/
    profile.ts            # Zod schema for preferences
```

### Pattern 1: Profile State via WXT Storage (Cross-Context Propagation)

**What:** Store the active profile ID and name in a WXT `storage.defineItem`. When the popup switches profiles, update this storage item. The content script watches it with `.watch()` and reacts to changes.

**When to use:** Any time profile state needs to propagate between popup and content script.

**Example:**
```typescript
// storage/active-profile.ts
import { storage } from 'wxt/utils/storage';

export interface ActiveProfileData {
  id: string;
  name: string;
  updatedAt: string; // ISO timestamp of when profile was set active
}

export const activeProfileStorage = storage.defineItem<ActiveProfileData | null>(
  'local:activeProfile',
  { fallback: null },
);
```

```typescript
// In content script App.tsx -- watch for profile changes
useEffect(() => {
  const unwatch = activeProfileStorage.watch((newProfile, oldProfile) => {
    if (oldProfile && newProfile && oldProfile.id !== newProfile.id) {
      // Profile changed -- mark existing badges as stale
      markBadgesStale();
    }
  });
  return () => unwatch();
}, []);
```

### Pattern 2: Background Message Handler for Supabase Queries

**What:** Extend the existing `handleMessage` in background.ts to handle profile-related queries (list profiles, switch active profile). The popup sends messages to the background, which uses the Supabase client.

**When to use:** For any Supabase query from the popup or content script, since the background service worker is the canonical auth context.

**Example:**
```typescript
// Extend AuthMessage type
export type ExtMessage =
  | AuthMessage
  | { action: 'getProfiles' }
  | { action: 'setActiveProfile'; profileId: string }
  | { action: 'healthCheck' };
```

**Why background, not popup direct:** The Supabase client in `lib/supabase.ts` uses `browser.storage.local` for session persistence. The background service worker is the single source of truth for auth state. Querying from the popup could work, but routing through the background ensures consistent session handling and avoids duplicate client initialization.

### Pattern 3: Stale Badge Indicator via Re-Render

**What:** When the active profile changes, re-render all existing badge shadow roots with a visual stale indicator (semi-transparent overlay + "Outdated" label). The existing `renderBadge` function already supports re-rendering.

**When to use:** When `activeProfileStorage.watch()` fires in the content script.

**Example:**
```typescript
// ScoreBadge.tsx with stale prop
interface ScoreBadgeProps {
  score: ScoreResponse;
  listingId: number;
  isPanelOpen: boolean;
  isStale?: boolean;  // New prop
}

// Visual: reduced opacity + small "outdated" indicator
{isStale && (
  <span className="absolute -bottom-1 left-0 right-0 text-[9px] text-center text-amber-600 font-medium">
    outdated
  </span>
)}
```

### Pattern 4: Session Health Check

**What:** Add a `healthCheck` action to the background message handler that calls `supabase.auth.getUser()` (validates JWT with Supabase server, not just local cache). Return connected/disconnected status to both popup and content script.

**When to use:** On popup open and on FAB click.

**Example:**
```typescript
case 'healthCheck': {
  try {
    const { data, error } = await supabase.auth.getUser();
    return {
      connected: !error && !!data.user,
      user: data.user,
    };
  } catch {
    return { connected: false, user: null };
  }
}
```

### Anti-Patterns to Avoid

- **Do NOT create a second Supabase client in the popup.** The popup should communicate through the background service worker to maintain a single auth context. Creating multiple clients leads to session desync.
- **Do NOT use `chrome.tabs.sendMessage` for profile changes.** WXT storage watchers are simpler and work across all contexts automatically. Tab messaging requires knowing the tab ID and is fragile.
- **Do NOT store the full preferences object in extension storage.** Only store the active profile ID and name. The edge function resolves preferences server-side (it already does this in score-proxy).
- **Do NOT poll for profile changes.** Use `storage.watch()` which is event-driven and instant.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-context state propagation | Custom messaging between popup/content | WXT `storage.defineItem` + `.watch()` | Built-in, handles all edge cases of storage change events across contexts |
| Active profile switching (DB) | Direct SQL/REST call | Existing `set_active_profile` RPC via Supabase client | Atomic switching with partial unique index enforcement already built in Phase 5 |
| Session validation | Custom JWT parsing | `supabase.auth.getUser()` | Server-side JWT validation, handles expiry/refresh automatically |
| Shadow DOM UI isolation | Manual style injection | Existing `createShadowRootUi` pattern | Already proven in the codebase, handles style isolation perfectly |
| Dropdown component | Custom dropdown from scratch | Existing Radix `@radix-ui/react-select` (already installed) | Accessible, keyboard-navigable, tested |

**Key insight:** The extension already has all the infrastructure pieces needed. Phase 10 is about wiring them together, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Supabase Session Stale in Background Service Worker
**What goes wrong:** MV3 service workers can be terminated and restarted by Chrome. If the Supabase client session expires between wake-ups, queries will fail silently.
**Why it happens:** Service workers don't persist in memory. The Supabase client reinitializes on each wake-up.
**How to avoid:** The existing `chromeStorageAdapter` in `lib/supabase.ts` already handles this by persisting session to `browser.storage.local`. The client has `autoRefreshToken: true` and `persistSession: true`. Just ensure `getUser()` is called (which validates server-side) rather than relying solely on `getSession()` (which only checks local cache).
**Warning signs:** 401 errors after the extension has been idle for a while.

### Pitfall 2: Race Condition Between Profile Switch and FAB Click
**What goes wrong:** User switches profile in popup, immediately clicks FAB. The content script might score with the old profile because the edge function resolves the active profile server-side.
**How to avoid:** The edge function (`score-proxy`) queries `profiles.is_default = true` on each request. The RPC `set_active_profile` is atomic. As long as the RPC completes before the FAB triggers scoring, the correct profile is used. The popup should await the RPC response before closing/updating state.
**Warning signs:** Score results don't match the newly selected profile.

### Pitfall 3: Content Script Not Receiving Storage Watch Events
**What goes wrong:** `storage.watch()` doesn't fire in the content script after profile change in popup.
**Why it happens:** If the content script was invalidated (e.g., extension reloaded during development), watchers stop working.
**How to avoid:** Use `ctx.onInvalidated()` to clean up watchers. The existing code already does this for the panel-toggle event listener. Apply the same pattern for storage watchers.
**Warning signs:** Badges don't show stale indicator after profile switch.

### Pitfall 4: Popup Width Constraints
**What goes wrong:** Adding a dropdown and health indicator makes the popup too wide or causes layout overflow.
**Why it happens:** Chrome extension popups have default constraints. The current popup uses `min-w-[320px] max-w-[380px]`.
**How to avoid:** Keep the profile switcher compact. Use a truncated profile name with a ChevronDown icon, similar to the web app's ProfileSwitcher. Test with long profile names.
**Warning signs:** Text overflow, horizontal scrollbar in popup.

### Pitfall 5: Stale Indicator Not Clearing After Re-Score
**What goes wrong:** After switching profiles and re-scoring, badges still show the stale indicator.
**Why it happens:** The stale state is tracked separately from scores. Need to clear the stale flag when new scores arrive for the current active profile.
**How to avoid:** When `handleScore` runs, clear the stale state for all badges. Track which profile ID the current scores belong to.
**Warning signs:** Permanent "outdated" labels on badges.

## Code Examples

### Example 1: Active Profile Storage Item
```typescript
// Source: Based on existing pattern in extension/src/storage/profile-storage.ts
import { storage } from 'wxt/utils/storage';

export interface ActiveProfileData {
  id: string;
  name: string;
}

export const activeProfileStorage = storage.defineItem<ActiveProfileData | null>(
  'local:activeProfile',
  { fallback: null },
);
```

### Example 2: Extended Background Message Handler
```typescript
// Source: Extending existing pattern in extension/src/entrypoints/background.ts
import { supabase } from '@/lib/supabase';

export type ExtMessage =
  | { action: 'signIn'; credentials: { email: string; password: string } }
  | { action: 'signOut' }
  | { action: 'getSession' }
  | { action: 'getUser' }
  | { action: 'getProfiles' }
  | { action: 'switchProfile'; profileId: string }
  | { action: 'healthCheck' };

// In handleMessage switch:
case 'getProfiles': {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, is_default')
    .order('created_at', { ascending: true });
  return { profiles: data ?? [], error: error ? { message: error.message } : null };
}

case 'switchProfile': {
  const { error } = await supabase.rpc('set_active_profile', {
    target_profile_id: message.profileId,
  });
  return { error: error ? { message: error.message } : null };
}

case 'healthCheck': {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { connected: !error && !!data.user, email: data.user?.email };
  } catch {
    return { connected: false, email: null };
  }
}
```

### Example 3: Profile Switcher in Popup
```typescript
// Source: Modeled after web/src/components/profile-switcher.tsx
// Simplified for extension popup (no Next.js router, no server actions)
interface Profile {
  id: string;
  name: string;
  is_default: boolean;
}

function ProfileSection({ profiles, onSwitch }: {
  profiles: Profile[];
  onSwitch: (id: string) => void;
}) {
  const active = profiles.find(p => p.is_default);
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground">Active Profile</p>
        <select
          value={active?.id ?? ''}
          onChange={(e) => onSwitch(e.target.value)}
          className="..."
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
```

### Example 4: Stale Badge Indicator
```typescript
// Source: Based on existing ScoreBadge.tsx pattern
export function ScoreBadge({ score, listingId, isPanelOpen, isStale }: ScoreBadgeProps) {
  const tierColor = TIER_COLORS[score.match_tier];

  return (
    <button
      onClick={handleClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-2 py-1 shadow-md cursor-pointer
        ${isStale ? 'opacity-60 ring-2 ring-amber-400' : 'hover:shadow-lg'}
        bg-white border border-gray-200 transition-shadow duration-150`}
    >
      {/* Score circle */}
      <span className="..." style={{ backgroundColor: tierColor.bg, color: tierColor.text }}>
        {score.overall_score}
      </span>
      {/* Match tier */}
      <span className="..." style={{ color: tierColor.bg }}>
        {score.match_tier}
      </span>
      {/* Stale indicator */}
      {isStale && (
        <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full px-1.5 py-0.5 border border-amber-300">
          !
        </span>
      )}
    </button>
  );
}
```

### Example 5: Health Check Status in Popup
```typescript
// Source: New component for popup Dashboard
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
      <span className="text-muted-foreground">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.runtime.sendMessage` raw | WXT `browser.runtime.sendMessage` (same API, WXT polyfill) | Already in use | WXT abstracts browser differences |
| `localStorage` in extension | `browser.storage.local` via WXT `storage.defineItem` | Already in use | Works in MV3 service workers |
| Single profile per user | Multi-profile with `set_active_profile` RPC | Phase 5-9 (complete) | Extension needs to be profile-aware |

**Key change since v1.0:** The extension was built for a single implicit profile. Phase 5 added multi-profile DB support, Phase 9 added web UI for profile management. Phase 10 brings this awareness to the extension.

## Open Questions

1. **Should the content script clear existing badges when profile switches?**
   - What we know: The stale indicator (EXT-12) marks them visually. User can re-click FAB to re-score.
   - What's unclear: Should old badges be removed entirely, or just marked stale?
   - Recommendation: Mark as stale (don't remove) -- user can see old scores while re-scoring. This matches the requirement "show a visual stale indicator."

2. **Should profile list be cached in extension storage or fetched fresh each popup open?**
   - What we know: Popup lifetime is short (open/close). Profile list is small (typically 1-5 profiles).
   - What's unclear: Whether caching adds unnecessary complexity.
   - Recommendation: Fetch fresh on every popup open. Profiles rarely change and the query is fast. Simpler code, no cache invalidation needed.

3. **How polished should EXT-13 badge redesign be?**
   - What we know: Current badges use hardcoded colors (TIER_COLORS) and basic Tailwind. Web app uses HSL CSS custom properties.
   - What's unclear: Whether to fully align extension CSS vars with web app, or just improve the visual quality.
   - Recommendation: Improve visual quality (shadows, borders, typography) without full CSS variable unification. Extension badges live in Shadow DOM on Flatfox, so they need self-contained styles anyway. Match the feel, not the exact implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `extension/vitest.config.ts` |
| Quick run command | `cd extension && npx vitest run` |
| Full suite command | `cd extension && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-09 | Popup shows active profile name | unit | `cd extension && npx vitest run src/__tests__/popup-profile.test.ts -x` | No -- Wave 0 |
| EXT-10 | Profile switcher calls switchProfile message | unit | `cd extension && npx vitest run src/__tests__/popup-profile.test.ts -x` | No -- Wave 0 |
| EXT-11 | healthCheck message returns connected status | unit | `cd extension && npx vitest run src/__tests__/background.test.ts -x` | Partial -- extend |
| EXT-12 | Storage watch triggers stale state | unit | `cd extension && npx vitest run src/__tests__/stale-badge.test.ts -x` | No -- Wave 0 |
| EXT-13 | Badge/panel render correctly | manual-only | N/A (visual inspection) | N/A |

### Sampling Rate
- **Per task commit:** `cd extension && npx vitest run`
- **Per wave merge:** `cd extension && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/popup-profile.test.ts` -- covers EXT-09, EXT-10 (profile display + switching messages)
- [ ] `src/__tests__/stale-badge.test.ts` -- covers EXT-12 (stale state logic)
- [ ] Extend `src/__tests__/background.test.ts` -- add healthCheck and getProfiles message tests
- [ ] Note: 1 pre-existing test failure in `profile-schema.test.ts` (feature enum mismatch) -- not blocking

## Sources

### Primary (HIGH confidence)
- Extension source code -- direct file reads of all entrypoints, components, lib, storage, schema, tests
- WXT storage documentation (https://wxt.dev/storage) -- storage.defineItem, .watch(), cross-context propagation
- WXT content scripts documentation (https://wxt.dev/guide/essentials/content-scripts.html) -- Shadow DOM, createShadowRootUi
- Supabase migrations (002_profiles_schema.sql) -- profiles table schema, set_active_profile RPC
- Web app profile-switcher.tsx -- reference implementation for dropdown UI pattern
- Web app profiles/actions.ts -- setActiveProfile server action using RPC

### Secondary (MEDIUM confidence)
- WXT messaging guide (https://wxt.dev/guide/essentials/messaging) -- recommends @webext-core/messaging or raw browser APIs
- Chrome messaging docs (https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

### Tertiary (LOW confidence)
- None -- all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in use and verified via package.json
- Architecture: HIGH -- patterns directly based on existing codebase (storage.defineItem, background messaging, Shadow DOM)
- Pitfalls: HIGH -- derived from actual code analysis (service worker lifecycle, stale closures, popup constraints)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- no fast-moving dependencies)
