import { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ScoreResponse } from '@/types/scoring';
import { extractVisibleListingPKs, findListingCardElement } from '@/lib/flatfox';
import { scoreListings } from '@/lib/api';
import { activeProfileStorage } from '@/storage/active-profile';
import { Fab } from './components/Fab';
import { ScoreBadge } from './components/ScoreBadge';
import { SummaryPanel } from './components/SummaryPanel';
import { LoadingSkeleton } from './components/LoadingSkeleton';

interface AppProps {
  ctx: ContentScriptContext;
}

/** Track mounted shadow roots for per-badge injection. */
interface BadgeMount {
  ui: Awaited<ReturnType<typeof createShadowRootUi>>;
  root: ReactDOM.Root;
}

/**
 * Root React component for the HomeMatch content script.
 * Manages FAB, scoring state, and per-badge Shadow DOM injection.
 *
 * Uses refs for scores/openPanel to avoid stale closures in Shadow DOM roots.
 */
export default function App({ ctx }: AppProps) {
  const [scores, setScores] = useState<Map<number, ScoreResponse>>(new Map());
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Refs to avoid stale closures in separate React roots
  const scoresRef = useRef<Map<number, ScoreResponse>>(new Map());
  const openPanelRef = useRef<number | null>(null);
  const badgeMountsRef = useRef<Map<number, BadgeMount>>(new Map());
  const isStaleRef = useRef(false);
  const staleReasonRef = useRef<'profile-switch' | 'preferences-changed' | null>(null);
  const scoredProfileIdRef = useRef<string | null>(null);
  const profileNameRef = useRef<string | null>(null);

  /**
   * Render or update a badge inside its per-badge Shadow DOM root.
   * Reads from refs (not state) so it always has fresh data.
   */
  const renderBadge = useCallback(
    (pk: number, score: ScoreResponse | null, panelOpenId: number | null) => {
      const mount = badgeMountsRef.current.get(pk);
      if (!mount) return;

      if (score) {
        mount.root.render(
          <div className="inline-block">
            <ScoreBadge
              score={score}
              listingId={pk}
              isPanelOpen={panelOpenId === pk}
              isStale={isStaleRef.current}
              staleReason={staleReasonRef.current ?? undefined}
            />
            <SummaryPanel
              score={score}
              listingId={pk}
              isOpen={panelOpenId === pk}
              isStale={isStaleRef.current}
              staleReason={staleReasonRef.current ?? undefined}
              profileName={profileNameRef.current ?? undefined}
            />
          </div>,
        );
      } else {
        mount.root.render(<LoadingSkeleton />);
      }
    },
    [],
  );

  /**
   * Re-render all scored badges with current panel state.
   */
  const rerenderAllBadges = useCallback(
    (panelId: number | null) => {
      for (const [pk, score] of scoresRef.current.entries()) {
        renderBadge(pk, score, panelId);
      }
    },
    [renderBadge],
  );

  /**
   * Load the current active profile on mount.
   */
  useEffect(() => {
    activeProfileStorage.getValue().then((profile) => {
      scoredProfileIdRef.current = profile?.id ?? null;
      profileNameRef.current = profile?.name ?? null;
    });
  }, []);

  /**
   * Watch for active profile changes and mark existing badges as stale.
   */
  useEffect(() => {
    const unwatch = activeProfileStorage.watch((newProfile, oldProfile) => {
      // Update profile name ref for SummaryPanel display
      profileNameRef.current = newProfile?.name ?? null;

      if (oldProfile && newProfile && oldProfile.id !== newProfile.id) {
        // Profile changed -- mark existing badges as stale
        isStaleRef.current = true;
        staleReasonRef.current = 'profile-switch';
        setIsStale(true);
        rerenderAllBadges(openPanelRef.current);
      }
    });
    ctx.onInvalidated(() => unwatch());
    return () => unwatch();
  }, [ctx, rerenderAllBadges]);

  /**
   * Listen for panel toggle events dispatched from badge Shadow DOM roots.
   * Uses refs so the handler always has fresh state.
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: number }>).detail;
      const id = detail.id;
      const newId = openPanelRef.current === id ? null : id;
      openPanelRef.current = newId;
      rerenderAllBadges(newId);
    };
    document.addEventListener('homematch:panel-toggle', handler);
    ctx.onInvalidated(() =>
      document.removeEventListener('homematch:panel-toggle', handler),
    );
    return () => document.removeEventListener('homematch:panel-toggle', handler);
  }, [ctx, rerenderAllBadges]);

  /**
   * Inject a per-badge Shadow DOM root next to a listing card element.
   */
  const injectBadge = useCallback(
    async (pk: number) => {
      const anchor = findListingCardElement(pk);
      if (!anchor) return;

      // Avoid duplicate mounts
      if (badgeMountsRef.current.has(pk)) return;

      const ui = await createShadowRootUi(ctx, {
        name: `homematch-badge-${pk}`,
        position: 'inline',
        anchor,
        append: 'after',
        onMount: (container) => {
          const el = document.createElement('div');
          el.style.display = 'inline-block';
          el.style.margin = '4px 0';
          container.append(el);
          const root = ReactDOM.createRoot(el);
          root.render(<LoadingSkeleton />);
          badgeMountsRef.current.set(pk, { ui, root });
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
          badgeMountsRef.current.delete(pk);
        },
      });

      ui.mount();
    },
    [ctx],
  );

  /**
   * Cleanup all badge shadow roots (e.g., on error).
   */
  const cleanupBadges = useCallback((pks: number[]) => {
    for (const pk of pks) {
      const mount = badgeMountsRef.current.get(pk);
      if (mount) {
        mount.ui.remove();
        badgeMountsRef.current.delete(pk);
      }
    }
  }, []);

  /**
   * Main scoring handler: triggered by clicking the FAB.
   * Skips already-scored listings unless re-scoring after profile switch.
   */
  const handleScore = useCallback(async (forceRescore: boolean = false) => {
    setError(null);

    // 1. Get session JWT from background script (serves as health check)
    let jwt: string;
    try {
      const response = await browser.runtime.sendMessage({ action: 'getSession' });
      const session = response?.session;
      if (!session?.access_token) {
        setError('Please log in via the HomeMatch popup first');
        return;
      }
      jwt = session.access_token;
    } catch {
      setError('Could not connect to HomeMatch extension');
      return;
    }

    // 2. Record which profile we're scoring with
    const activeProfile = await activeProfileStorage.getValue();
    scoredProfileIdRef.current = activeProfile?.id ?? null;
    profileNameRef.current = activeProfile?.name ?? null;

    // 3. Extract listing PKs from DOM
    const allPks = extractVisibleListingPKs();

    // If stale or forceRescore, re-score all listings; otherwise skip already scored
    const pks = (isStaleRef.current || forceRescore)
      ? allPks
      : allPks.filter((pk) => !scoresRef.current.has(pk));

    if (pks.length === 0) {
      // All visible listings already scored — nothing to do
      return;
    }

    // 4. Set loading state and inject loading skeletons
    setIsScoring(true);

    for (const pk of pks) {
      await injectBadge(pk);
    }

    // 5. Score listings and update badges progressively
    try {
      await scoreListings(pks, jwt, (id, result, prefStale) => {
        // If any result signals preference-staleness, set the stale reason
        if (prefStale) {
          staleReasonRef.current = 'preferences-changed';
          isStaleRef.current = true;
          setIsStale(true);
        }

        // Update both ref and state
        scoresRef.current.set(id, result);
        setScores((prev) => {
          const next = new Map(prev);
          next.set(id, result);
          return next;
        });

        // Update the badge shadow root content
        renderBadge(id, result, null);
      }, forceRescore);

      // Clear stale state after successful re-score
      isStaleRef.current = false;
      staleReasonRef.current = null;
      setIsStale(false);
      rerenderAllBadges(openPanelRef.current);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Scoring failed';
      setError(message);
      const unscoredPks = pks.filter(
        (pk) => !scoresRef.current.has(pk),
      );
      cleanupBadges(unscoredPks);
    } finally {
      setIsScoring(false);
    }
  }, [injectBadge, renderBadge, cleanupBadges, rerenderAllBadges]);

  const handleForceRescore = useCallback(() => {
    handleScore(true);
  }, [handleScore]);

  return (
    <Fab
      onClick={handleScore}
      onLongPress={handleForceRescore}
      isScoring={isScoring}
      scoredCount={scores.size}
      error={error}
    />
  );
}
