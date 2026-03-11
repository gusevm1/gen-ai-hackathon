import { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ScoreResponse } from '@/types/scoring';
import { extractVisibleListingPKs, findListingCardElement } from '@/lib/flatfox';
import { scoreListings } from '@/lib/api';
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
 */
export default function App({ ctx }: AppProps) {
  const [scores, setScores] = useState<Map<number, ScoreResponse>>(new Map());
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPanelId, setOpenPanelId] = useState<number | null>(null);

  // Keep track of mounted shadow UIs for badges
  const badgeMountsRef = useRef<Map<number, BadgeMount>>(new Map());

  /**
   * Render or update a badge inside its per-badge Shadow DOM root.
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
              onTogglePanel={handleTogglePanel}
              isPanelOpen={panelOpenId === pk}
            />
            <SummaryPanel score={score} listingId={pk} isOpen={panelOpenId === pk} />
          </div>,
        );
      } else {
        mount.root.render(<LoadingSkeleton />);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Toggle panel expansion for a badge.
   * Broadcasts via custom DOM event so all badge Shadow DOM roots update.
   */
  const handleTogglePanel = useCallback(
    (id: number) => {
      setOpenPanelId((prev) => {
        const newId = prev === id ? null : id;

        // Re-render all badges with updated panel state
        for (const [pk, score] of scores.entries()) {
          renderBadge(pk, score, newId);
        }

        return newId;
      });
    },
    [scores, renderBadge],
  );

  /**
   * Listen for panel toggle events from badge shadow roots.
   */
  const setupPanelToggleListener = useCallback(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: number }>).detail;
      handleTogglePanel(detail.id);
    };
    document.addEventListener('homematch:panel-toggle', handler);
    ctx.onInvalidated(() =>
      document.removeEventListener('homematch:panel-toggle', handler),
    );
  }, [ctx, handleTogglePanel]);

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
   * 1. Gets session JWT from background script
   * 2. Extracts visible listing PKs from DOM
   * 3. Injects loading skeletons as per-badge Shadow DOM
   * 4. Scores listings sequentially, updating badges progressively
   */
  const handleScore = useCallback(async () => {
    setError(null);

    // 1. Get session JWT from background script
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

    // 2. Extract listing PKs from DOM
    const pks = extractVisibleListingPKs();
    if (pks.length === 0) {
      setError('No listings found on this page');
      return;
    }

    // 3. Set loading state and inject loading skeletons
    setIsScoring(true);

    for (const pk of pks) {
      await injectBadge(pk);
    }

    // 4. Score listings and update badges progressively
    try {
      await scoreListings(pks, jwt, (id, result) => {
        // Update scores state
        setScores((prev) => {
          const next = new Map(prev);
          next.set(id, result);
          return next;
        });

        // Update the badge shadow root content
        renderBadge(id, result, null);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Scoring failed';
      setError(message);
      // Cleanup loading skeletons for PKs that didn't get scored
      const unscoredPks = pks.filter(
        (pk) => !badgeMountsRef.current.has(pk) || !scores.has(pk),
      );
      cleanupBadges(unscoredPks);
    } finally {
      setIsScoring(false);
    }
  }, [injectBadge, renderBadge, cleanupBadges, scores]);

  // Set up panel toggle listener on first render
  useState(() => {
    setupPanelToggleListener();
  });

  return (
    <Fab
      onClick={handleScore}
      isScoring={isScoring}
      scoredCount={scores.size}
      error={error}
    />
  );
}
