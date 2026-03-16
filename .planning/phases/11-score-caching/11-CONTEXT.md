# Phase 11: Score Caching - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

When the extension FAB is clicked, return a cached result from the `analyses` table for listing_id + profile_id combinations that already exist — instead of calling Claude. Cache is invalidated (soft-marked stale) when the user saves updated preferences for a profile. User can force a fresh score via long-press on the FAB. Covers CACHE-01, CACHE-02, CACHE-03.

</domain>

<decisions>
## Implementation Decisions

### Cache Invalidation (CACHE-02)
- Soft-mark strategy: add a `stale` boolean column to the `analyses` table (default `false`)
- When `saveProfilePreferences()` is called, UPDATE all analyses for that profile_id to `stale = true`
- Do NOT delete existing analyses — stale scores remain in DB and remain visible in UI with a warning
- Fresh scores from re-scoring set `stale = false` (via existing upsert path)

### Force Re-Score UX (CACHE-03)
- Long-press on the FAB triggers a forced fresh score (ignores cache)
- Circular progress indicator animates around the FAB button while holding — completes at ~2 seconds
- Re-score triggers automatically when the circle completes; user does NOT need to release
- Must work on both desktop (mousedown/mouseup) and mobile touch (touchstart/touchend)
- Regular tap/click on FAB continues to use cached scores (existing behavior)

### Cache Check Location (CACHE-01)
- Edge function checks Supabase for an existing non-stale analysis before proxying to backend
- If `analyses` row exists for (user_id, listing_id, profile_id) AND `stale = false` → return cached result directly, skip backend call
- If no row exists OR `stale = true` → proceed with full scoring pipeline (backend → Claude)
- Extension always calls the edge function — never bypasses it or hits Supabase directly for scoring

### Stale Score Display
- Stale scores are shown greyed out with a "⚠ preferences changed" icon in the badge and summary panel
- This is distinct from the existing stale-profile indicator (which fires on profile switch) — this fires on preference change within the active profile
- User can trigger a re-score for stale listings using the FAB long-press

### Claude's Discretion
- Exact grey styling values for stale badges
- Whether to debounce the stale-mark write in `saveProfilePreferences` (e.g., write after DB confirm)
- Circular progress indicator implementation details (CSS animation vs canvas)
- Whether to show a tooltip on long-press start ("Hold to re-score...")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CACHE-01, CACHE-02, CACHE-03 acceptance criteria

### Existing scoring pipeline
- `supabase/functions/score-proxy/index.ts` — Edge function that needs cache check logic added
- `backend/app/routers/scoring.py` — Backend scoring endpoint (no changes needed for cache — cache handled upstream)
- `backend/app/services/supabase.py` — `save_analysis()` upsert; needs to clear `stale` flag on write
- `web/src/app/(dashboard)/profiles/actions.ts` — `saveProfilePreferences()` — hook point for CACHE-02 stale-mark

### Extension FAB / scoring
- `extension/src/entrypoints/content/App.tsx` — `handleScore()` and FAB render; long-press needs to be added here
- `extension/src/entrypoints/content/components/Fab.tsx` — FAB component; needs long-press interaction + progress ring
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` — Badge component; needs stale display state
- `extension/src/entrypoints/content/components/SummaryPanel.tsx` — Summary panel; needs stale display state

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `analyses` table with `unique(user_id, listing_id, profile_id)` — already the cache store; needs `stale` column added via migration
- `supabase_service.save_analysis()` — existing upsert; needs to set `stale = false` explicitly on write
- Stale badge UI (`isStale` prop) — already exists on `ScoreBadge` and `SummaryPanel` from v1.1 profile switching; can be reused/extended for preference-change staleness
- `isStaleRef` + `setIsStale()` pattern in `App.tsx` — existing stale state management

### Established Patterns
- Edge function uses service-role Supabase client with RLS-enforced user context — can query `analyses` table directly
- Backend scoring fire-and-forget save pattern (`asyncio.to_thread`) — no blocking on DB write
- Shadow DOM badge injection pattern — badge re-renders via `renderBadge()` ref callback

### Integration Points
- **New `stale` column**: Supabase migration needed; edge function reads it, `save_analysis()` clears it, `saveProfilePreferences()` sets it
- **Edge function cache check**: Insert before the `fetch($backendUrl/score)` call; query `analyses` for matching row with `stale=false`
- **FAB long-press**: New interaction layer in `Fab.tsx` + `App.tsx` `handleScore` needs a `forceRescore` parameter
- **Stale display from preferences**: `App.tsx` needs to detect when loaded cached scores have `stale=true` and set `isStale`

</code_context>

<specifics>
## Specific Ideas

- Long-press feel: 2-second circular progress ring around the FAB, auto-fires on completion (no release needed)
- Stale display: greyed-out badge with "⚠ preferences changed" — distinct visual from profile-switch stale
- Cache hit is transparent to UX — cached vs fresh scores look identical once displayed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-score-caching*
*Context gathered: 2026-03-16*
