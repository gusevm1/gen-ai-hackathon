'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from '@/hooks/use-onboarding';
import { updateOnboardingState } from '@/lib/onboarding-state';

type OnboardingContextValue = ReturnType<typeof useOnboarding>;

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingContext must be used inside OnboardingProvider');
  return ctx;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const onboarding = useOnboarding();
  const { state, isLoading, skip, advance } = onboarding;
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);

  /**
   * Launch driver.js tour steps appropriate for the current page + onboarding step.
   *
   * Step mapping:
   *   Step 1 — Welcome intro (any page, no DOM target)
   *   Step 2 — Install extension (/download, #install-extension-cta)
   *   Step 3 — Create profile (/dashboard, #create-profile-section)
   *   Step 4 — Open Flatfox (/dashboard, #open-flatfox-cta) — writes step=5 before opening
   *   Steps 5-8 — Extension side (handled in content script)
   *   Step 9 — Post-analysis tooltips (/analyses or /analysis, step===9)
   *
   * IMPORTANT: onDestroyStarted fires for BOTH user-close AND clicking "Done" on the last
   * step of a driver instance. We use onCloseClick to call skip() and onNextClick to call
   * advance() + navigate so that "Done" properly advances the tour instead of stopping it.
   */
  const launchTourForCurrentPage = useCallback(() => {
    if (!state) return;

    const step = state.onboarding_step;

    // Destroy any running tour first
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    if (step === 1) {
      // Step 1: Welcome — no DOM target, centered popover on any page
      const driverInstance = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
        },
        steps: [
          {
            popover: {
              title: 'Welcome to HomeMatch!',
              description:
                "Let's take a quick tour to show you how to find your perfect home. This will only take a minute.",
              align: 'center',
              showButtons: ['next', 'close'],
              disableButtons: ['previous'],
              onNextClick: async () => {
                driverInstance.destroy();
                driverRef.current = null;
                await advance();
                router.push('/download');
              },
            },
          },
        ],
      });
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/download' && step === 2) {
      // Step 2: Highlight install CTA on download page
      const driverInstance = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
        },
        steps: [
          {
            element: '#install-extension-cta',
            popover: {
              title: 'Install the HomeMatch Extension',
              description:
                'Download and install the HomeMatch Chrome extension to score Flatfox listings. Once installed, click "I\'ve installed it!" below.',
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
            },
          },
        ],
      });
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/dashboard') {
      if (step === 3) {
        // Step 3: Highlight the profile creation section
        const driverInstance = driver({
          showProgress: true,
          allowClose: true,
          overlayColor: 'black',
          overlayOpacity: 0.5,
          onCloseClick: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          steps: [
            {
              element: '#create-profile-section',
              popover: {
                title: 'Create Your First Profile',
                description:
                  'Choose manual or AI-powered profile creation to define your search criteria.',
                side: 'top',
                align: 'center',
                showButtons: ['close'],
                disableButtons: ['previous'],
              },
            },
          ],
        });
        driverRef.current = driverInstance;
        driverInstance.drive();
      } else if (step === 4) {
        // Step 4: Highlight "Open Flatfox" CTA
        const driverInstance = driver({
          showProgress: true,
          allowClose: true,
          overlayColor: 'black',
          overlayOpacity: 0.5,
          onCloseClick: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          steps: [
            {
              element: '#open-flatfox-cta',
              popover: {
                title: 'Head to Flatfox',
                description:
                  'Open Flatfox and the extension will guide you through scoring your first listing.',
                side: 'top',
                align: 'center',
                showButtons: ['next', 'close'],
                disableButtons: ['previous'],
                onNextClick: async () => {
                  // Write step=5, active=true to Supabase BEFORE opening Flatfox
                  // This prevents stale state when extension reads onboarding step
                  await updateOnboardingState(5, true, state.onboarding_completed);
                  driverInstance.destroy();
                  driverRef.current = null;
                  window.open('https://flatfox.ch/en/search/', '_blank');
                },
              },
            },
          ],
        });
        driverRef.current = driverInstance;
        driverInstance.drive();
      }
    } else if ((pathname.startsWith('/analyses') || pathname.startsWith('/analysis')) && step === 9) {
      // Step 9: Light non-blocking tooltips for post-analysis feature awareness
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

      // Filter to targets that exist in the DOM
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
        const driverInstance = driver({
          showProgress: false,
          allowClose: true,
          overlayColor: 'black',
          overlayOpacity: 0.3,
          onDestroyStarted: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          steps: existingSteps,
        });
        driverRef.current = driverInstance;
        driverInstance.drive();
      }
    }
  }, [state, pathname, skip, advance, router]);

  // Resume an in-progress active tour after page load, state change, or manual start.
  // Does NOT auto-start for users who have never started the tour (only fires when active=true).
  useEffect(() => {
    if (isLoading) return;
    if (!state?.onboarding_active) return;

    // Small delay to allow DOM to settle after navigation
    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, state?.onboarding_active, state?.onboarding_step]);

  // Re-launch tour when pathname changes (navigation to new page mid-tour)
  useEffect(() => {
    if (!state?.onboarding_active) return;
    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * Start the tour from step 1, then navigate to the current page to show the welcome step.
   * Called by TakeATourButton and NavUser "Take a quick tour" menu item.
   */
  const startTourAndNavigate = useCallback(async () => {
    await onboarding.startTour();
    // Step 1 (welcome) can show on any page — no navigation needed; launchTourForCurrentPage
    // will fire via the onboarding_active effect above.
  }, [onboarding]);

  // Expose helpers via context
  const contextValue = {
    ...onboarding,
    startTour: startTourAndNavigate,
    launchTourForCurrentPage,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
