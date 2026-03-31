'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from '@/hooks/use-onboarding';
import { createClient } from '@/lib/supabase/client';

// ─── Context types ────────────────────────────────────────────────────────────

type OnboardingContextValue = ReturnType<typeof useOnboarding> & {
  startTour: () => Promise<void>;
  launchTourForCurrentPage: () => void;
  showOpenFlatfoxStep: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingContext must be used inside OnboardingProvider');
  return ctx;
}

// ─── Welcome modal (Step 1) ───────────────────────────────────────────────────
//
// A simple React modal replaces driver.js for step 1 to avoid the white-square
// artifact that appears when driver.js tries to highlight a null/body element.

interface WelcomeModalProps {
  onStart: () => void;
  onExit: () => void;
}

function WelcomeModal({ onStart, onExit }: WelcomeModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // No dark backdrop — non-blocking
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '28px 32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          maxWidth: '400px',
          width: '90vw',
          pointerEvents: 'auto',
          fontFamily: 'inherit',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#111' }}>
          Welcome to HomeMatch!
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#555', lineHeight: 1.5 }}>
          Let&apos;s take a quick tour to show you how to find your perfect home. This will only take a minute.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onStart}
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Tour
          </button>
          <button
            onClick={onExit}
            style={{
              background: 'transparent',
              color: '#888',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Exit Tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const onboarding = useOnboarding();
  const { state, isLoading, skip, advance } = onboarding;
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);

  // Controls visibility of the Step 1 welcome modal
  const [showWelcome, setShowWelcome] = useState(false);

  // ─── Helper: destroy any active driver instance ──────────────────────────

  const destroyDriver = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  // ─── Exit handler — called by "Exit Tutorial" buttons on all steps ───────

  const exitTutorial = useCallback(() => {
    destroyDriver();
    setShowWelcome(false);
    skip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyDriver, skip]);

  // ─── launchTourForCurrentPage ─────────────────────────────────────────────
  //
  // Shows the appropriate step for the current page + onboarding step.
  //
  // Step 1: Welcome modal (React, no driver.js)
  // Step 2: /download — highlight install CTA
  // Step 3: /dashboard — highlight create profile section
  // Step 4: /profiles/* — inline banner shown by preferences-form.tsx; Open Flatfox popover fired by showOpenFlatfoxStep() after save
  // Step 9: /analyses or /analysis — post-analysis tooltips

  const launchTourForCurrentPage = useCallback(() => {
    if (!state) return;

    const step = state.onboarding_step;

    // Destroy any running driver first
    destroyDriver();

    if (step === 1) {
      // Step 1: Use React welcome modal — no driver.js to avoid white-square artifact
      setShowWelcome(true);
    } else if (pathname === '/download' && step === 2) {
      // Step 2: Highlight install CTA
      const inst = driver({
        showProgress: false,
        overlayOpacity: 0,
        onCloseClick: exitTutorial,
        steps: [
          {
            element: '#install-extension-cta',
            popover: {
              title: 'Install the HomeMatch Extension',
              description:
                'Follow the installation instructions shown on this screen. Once you\'ve completed all steps, click "I\'ve installed it!" below.',
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 2 of 9',
            },
          },
        ],
      });
      driverRef.current = inst;
      inst.drive();
    } else if (pathname === '/dashboard' && step === 3) {
      // Step 3: Highlight create profile section
      const inst = driver({
        showProgress: false,
        overlayOpacity: 0,
        onCloseClick: exitTutorial,
        steps: [
          {
            element: '#create-profile-section',
            popover: {
              title: 'Create Your First Profile',
              description:
                'Choose manual or AI-powered profile creation to define your search criteria.',
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 3 of 9',
            },
          },
        ],
      });
      driverRef.current = inst;
      inst.drive();
    } else if ((pathname.startsWith('/analyses') || pathname.startsWith('/analysis')) && step === 9) {
      // Step 9: Post-analysis feature awareness tooltips
      const step9Targets = [
        {
          selector: '#analyses-list',
          title: 'Your Analyses',
          description: 'See all your scored listings here. Each analysis shows the match score and reasoning.',
        },
        {
          selector: '#profile-switcher',
          title: 'Switch Profiles',
          description:
            'Use different search profiles to compare the same listing against different criteria.',
        },
      ];

      const existingSteps = step9Targets
        .filter(({ selector }) => document.querySelector(selector) !== null)
        .map(({ selector, title, description }) => ({
          element: selector,
          popover: {
            title,
            description,
            side: 'bottom' as const,
            align: 'center' as const,
          },
        }));

      if (existingSteps.length > 0) {
        const inst = driver({
          showProgress: false,
          overlayOpacity: 0,
          onCloseClick: exitTutorial,
          onDestroyStarted: () => {
            // Natural end (last step "Done") — mark completed
            skip();
            driverRef.current = null;
          },
          steps: existingSteps,
        });
        driverRef.current = inst;
        inst.drive();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pathname, exitTutorial, destroyDriver]);

  // ─── Auto-trigger for new users (no profiles) ────────────────────────────
  //
  // Only fires when the user has never created a profile — this avoids showing
  // the tour to existing users who have profiles but happen to have
  // onboarding_active:true stuck in their DB from a previous partial tour.

  useEffect(() => {
    if (isLoading) return;
    if (!state) return;
    // Only auto-start for first-time users: step=1, not active, not completed
    if (state.onboarding_active) return;
    if (state.onboarding_completed) return;
    if (state.onboarding_step !== 1) return;

    // Check if user has any profiles — if so, they're not a new user
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if ((count ?? 0) === 0) {
          // Truly new user — auto-start after a short delay
          const timer = setTimeout(() => {
            onboarding.startTour();
          }, 800);
          return () => clearTimeout(timer);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ─── Resume active tour after state change or navigation ─────────────────

  useEffect(() => {
    if (isLoading) return;
    if (!state?.onboarding_active) return;

    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, state?.onboarding_active, state?.onboarding_step]);

  // ─── Re-launch tour on page navigation ───────────────────────────────────

  useEffect(() => {
    if (!state?.onboarding_active) return;
    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ─── Show the "Open Flatfox" driver step after preferences are saved ──────
  //
  // Creates a fresh standalone driver pointing at #open-flatfox-profile-btn.
  // Called by preferences-form.tsx after a successful save during onboarding step 4.
  // Does NOT rely on driverRef.current (avoids stale-destroyed-instance bugs).

  const showOpenFlatfoxStep = useCallback(() => {
    destroyDriver();
    const inst = driver({
      showProgress: false,
      overlayOpacity: 0,
      onCloseClick: exitTutorial,
      steps: [
        {
          element: '#open-flatfox-profile-btn',
          popover: {
            title: 'Head to Flatfox',
            description:
              'Open Flatfox with your filters pre-applied. The HomeMatch extension will guide you through scoring your first listing.',
            side: 'top',
            align: 'center',
            showButtons: ['close'],
            disableButtons: ['previous'],
            progressText: 'Step 4 of 9',
          },
        },
      ],
    });
    driverRef.current = inst;
    inst.drive();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyDriver, exitTutorial]);

  // ─── Manual start (TakeATourButton, NavUser menu) ────────────────────────

  const startTourAndNavigate = useCallback(async () => {
    destroyDriver();
    setShowWelcome(false);
    await onboarding.startTour();
    // State change triggers the onboarding_active effect which calls launchTourForCurrentPage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding, destroyDriver]);

  // ─── Welcome modal handlers ───────────────────────────────────────────────

  const handleWelcomeStart = useCallback(async () => {
    setShowWelcome(false);
    await advance();
    router.push('/download');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, router]);

  const handleWelcomeExit = useCallback(() => {
    setShowWelcome(false);
    skip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  // ─── Context value ────────────────────────────────────────────────────────

  const contextValue = {
    ...onboarding,
    startTour: startTourAndNavigate,
    launchTourForCurrentPage,
    showOpenFlatfoxStep,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {showWelcome && (
        <WelcomeModal onStart={handleWelcomeStart} onExit={handleWelcomeExit} />
      )}
    </OnboardingContext.Provider>
  );
}
