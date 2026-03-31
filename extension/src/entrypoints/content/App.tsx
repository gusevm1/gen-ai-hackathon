import { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';

console.log('[HM] content script loaded');

// Intercept URL mutations to detect Flatfox rewriting query params
const _origPush = history.pushState.bind(history);
history.pushState = function(...args: Parameters<typeof history.pushState>) {
  console.log('[HM] pushState:', args[2]);
  return _origPush(...args);
};
const _origReplace = history.replaceState.bind(history);
history.replaceState = function(...args: Parameters<typeof history.replaceState>) {
  console.log('[HM] replaceState:', args[2]);
  return _origReplace(...args);
};
window.addEventListener('popstate', () => {
  console.log('[HM] popstate URL:', window.location.href);
});
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ScoreResponse } from '@/types/scoring';
import { extractVisibleListingPKs, findListingCardElement } from '@/lib/flatfox';
import { scoreListings } from '@/lib/api';
import { activeProfileStorage } from '@/storage/active-profile';
import { getOnboardingState, updateOnboardingState } from '@/lib/onboarding';
import type { OnboardingState } from '@/lib/onboarding';
import { Fab } from './components/Fab';
import { ScoreBadge } from './components/ScoreBadge';
import { SummaryPanel } from './components/SummaryPanel';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { OnboardingOverlay } from './components/OnboardingOverlay';

/** Extension onboarding steps 5-8 that run on the Flatfox page. */
interface ExtensionStepConfig {
  step: number;
  title: string;
  instruction: string;
  targetSelector: string | null;
  targetShadowHost: string | null;
  nextLabel: string | null;
}

const EXTENSION_STEPS: ExtensionStepConfig[] = [
  {
    step: 5,
    title: 'Open the HomeMatch Extension',
    instruction: 'Click the HomeMatch icon in the top-right of your browser toolbar to open the extension.',
    targetSelector: null, // Points to extension icon area via fallback rect in OnboardingOverlay
    targetShadowHost: null,
    nextLabel: "Got it",
  },
  {
    step: 6,
    title: 'Log In to HomeMatch',
    instruction: 'Log in with your HomeMatch account in the extension popup that just opened.',
    targetSelector: null, // Extension popup is outside the DOM — uses fallback rect
    targetShadowHost: null,
    nextLabel: "I'm logged in",
  },
  {
    step: 7,
    title: 'Analyze Listings',
    instruction: 'Click the HomeMatch button (bottom-right) to score all listings on this page against your profile.',
    targetSelector: null,
    targetShadowHost: 'homematch-fab',
    nextLabel: null, // Auto-advances when scoring completes
  },
  {
    step: 8,
    title: 'View Full Analysis',
    instruction: 'Click "Show full analysis" on any scored listing to see the detailed breakdown in HomeMatch.',
    targetSelector: null, // Dynamically set to first badge shadow host
    targetShadowHost: null,
    nextLabel: 'Done',
  },
];

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

  // Onboarding state (steps 4-7 handled by this extension content script)
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [onboardingStatusMsg, setOnboardingStatusMsg] = useState<string | null>(null);

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
   * Load onboarding state on mount (once per page load).
   * Only activates if step is in extension range (5-8) and onboarding is active.
   *
   * Fallback: if the user is not yet logged into the extension (step 5 scenario),
   * `getOnboardingState()` returns null because the background script gate-checks auth.
   * In that case, read `homematch_onboarding` from the URL query string — this param
   * is injected by the web app's OpenInFlatfoxButton when transitioning from step 4→5.
   */
  useEffect(() => {
    console.log('[HM] search at effect:', window.location.search);
    console.log('[HM] full URL:', window.location.href);

    getOnboardingState().then((state) => {
      console.log('[HM] getOnboardingState result:', state);

      if (
        state &&
        state.onboarding_active &&
        state.onboarding_step >= 5 &&
        state.onboarding_step <= 8
      ) {
        console.log('[HM] setting onboarding from Supabase, step:', state.onboarding_step);
        setOnboardingState(state);
        return;
      }

      // Fallback: read step from URL for the pre-auth case (step 5 / step 6)
      const params = new URLSearchParams(window.location.search);
      const urlStep = params.get('homematch_onboarding');
      console.log('[HM] URL param homematch_onboarding:', urlStep);
      if (urlStep) {
        const step = parseInt(urlStep, 10);
        if (step >= 5 && step <= 6) {
          console.log('[HM] setting onboarding from URL, step:', step);
          setOnboardingState({
            onboarding_step: step,
            onboarding_active: true,
            onboarding_completed: false,
          });
        }
      }
    });
  }, []);

  /**
   * Advance to the next onboarding step and persist to Supabase.
   */
  const advanceOnboarding = useCallback(async () => {
    setOnboardingState((prev) => {
      if (!prev) return null;
      const next = prev.onboarding_step + 1;
      // Extension handles steps 5-8; step 9 is post-analysis on the web app.
      // After step 8 ("View Full Analysis"), redirect to the web app analyses page.
      const completed = next > 9;
      const newState: OnboardingState = {
        onboarding_step: completed ? 9 : next,
        onboarding_active: !completed,
        onboarding_completed: prev.onboarding_completed || completed,
      };
      // Write async, don't block UI
      updateOnboardingState(
        newState.onboarding_step,
        newState.onboarding_active,
        newState.onboarding_completed,
      );
      // On step 8 -> 9, redirect to web app (step 9 = post-analysis tooltips)
      if (prev.onboarding_step === 8) {
        window.open('https://homematch.ch/analyses', '_blank');
        return null; // Hide overlay
      }
      return completed ? null : newState;
    });
    setOnboardingStatusMsg(null);
  }, []);

  /**
   * Skip onboarding — set active=false in Supabase and hide overlay.
   */
  const skipOnboarding = useCallback(async () => {
    setOnboardingState((prev) => {
      if (!prev) return null;
      updateOnboardingState(prev.onboarding_step, false, prev.onboarding_completed);
      return null; // Hide overlay immediately
    });
    setOnboardingStatusMsg(null);
  }, []);

  /**
   * Handle "Next" for step 6 (login verification).
   * Verifies auth before advancing; shows error if not logged in.
   */
  const handleLoginVerify = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getSession' });
      const session = response?.session;
      if (!session?.access_token) {
        setOnboardingStatusMsg('Please log in first via the extension popup.');
        return;
      }
    } catch {
      setOnboardingStatusMsg('Could not verify login status. Please try again.');
      return;
    }
    await advanceOnboarding();
  }, [advanceOnboarding]);

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
    console.log('[HomeMatch] handleScore called, forceRescore=', forceRescore);
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
    console.log('[HomeMatch] JWT obtained, extracted PKs:', allPks);

    // If stale or forceRescore, re-score all listings; otherwise skip already scored
    const pks = (isStaleRef.current || forceRescore)
      ? allPks
      : allPks.filter((pk) => !scoresRef.current.has(pk));

    if (allPks.length === 0) {
      setError('No Flatfox listings found on this page');
      return;
    }

    if (pks.length === 0) {
      // All visible listings already scored — nothing to do
      return;
    }

    // 4. Set loading state and inject loading skeletons
    setIsScoring(true);

    for (const pk of pks) {
      await injectBadge(pk);
      // On force rescore, immediately reset existing badges to grey placeholder
      if (forceRescore && scoresRef.current.has(pk)) {
        scoresRef.current.delete(pk);
        renderBadge(pk, null, openPanelRef.current);
      }
    }

    // 5. Score listings and update badges progressively
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

    // Clean up loading skeletons for any listings that failed
    const unscoredPks = pks.filter((pk) => !scoresRef.current.has(pk));
    if (unscoredPks.length > 0) {
      setError(`${unscoredPks.length} listing(s) failed to score`);
      cleanupBadges(unscoredPks);
    }

    // Clear stale state after scoring completes
    isStaleRef.current = false;
    staleReasonRef.current = null;
    setIsStale(false);
    rerenderAllBadges(openPanelRef.current);
    setIsScoring(false);

    // Onboarding step 7: auto-advance to step 8 when scoring finishes with results
    setOnboardingState((prev) => {
      if (prev && prev.onboarding_step === 7 && scoresRef.current.size > 0) {
        const newState: OnboardingState = {
          ...prev,
          onboarding_step: 8,
        };
        updateOnboardingState(8, newState.onboarding_active, newState.onboarding_completed);
        return newState;
      }
      return prev;
    });
  }, [injectBadge, renderBadge, cleanupBadges, rerenderAllBadges]);

  const handleForceRescore = useCallback(() => {
    handleScore(true);
  }, [handleScore]);

  // Determine active onboarding step config
  const activeStepConfig = onboardingState
    ? EXTENSION_STEPS.find((s) => s.step === onboardingState.onboarding_step) ?? null
    : null;

  console.log('[HM] render — onboardingState:', onboardingState, '| activeStepConfig:', activeStepConfig);

  // For step 8 ("View Full Analysis"), dynamically target the first scored badge shadow host
  const step8TargetShadowHost =
    onboardingState?.onboarding_step === 8 && scoresRef.current.size > 0
      ? `homematch-badge-${[...scoresRef.current.keys()][0]}`
      : null;

  return (
    <>
      <Fab
        onClick={handleScore}
        onLongPress={handleForceRescore}
        isScoring={isScoring}
        scoredCount={scores.size}
        error={error}
      />
      {activeStepConfig && onboardingState && createPortal(
        <OnboardingOverlay
          step={onboardingState.onboarding_step}
          totalSteps={9}
          title={activeStepConfig.title}
          instruction={activeStepConfig.instruction}
          targetSelector={activeStepConfig.targetSelector}
          targetShadowHost={
            activeStepConfig.step === 8
              ? step8TargetShadowHost
              : activeStepConfig.targetShadowHost
          }
          onNext={activeStepConfig.step === 6 ? handleLoginVerify : advanceOnboarding}
          onSkip={skipOnboarding}
          nextLabel={activeStepConfig.nextLabel ?? 'Next'}
          statusMessage={onboardingStatusMsg}
        />,
        document.body,
      )}
    </>
  );
}
