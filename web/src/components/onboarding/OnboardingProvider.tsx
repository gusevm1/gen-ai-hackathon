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
  const tourLaunchedRef = useRef(false);

  /**
   * Launch driver.js tour steps appropriate for the current page + onboarding step.
   */
  const launchTourForCurrentPage = useCallback(() => {
    if (!state) return;

    const step = state.onboarding_step;

    // Destroy any running tour first
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    if (pathname === '/download' && step === 1) {
      // Step 1: Highlight install CTA on download page
      const driverInstance = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onDestroyStarted: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
        },
        steps: [
          {
            element: '#install-extension-cta',
            popover: {
              title: 'Install the HomeMatch Extension',
              description: 'Download and install the HomeMatch Chrome extension to score Flatfox listings.',
              side: 'bottom',
              align: 'center',
            },
          },
        ],
      });
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/dashboard') {
      if (step === 2) {
        // Step 2: Highlight the profile creation section
        const driverInstance = driver({
          showProgress: true,
          allowClose: true,
          overlayColor: 'black',
          overlayOpacity: 0.5,
          onDestroyStarted: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          steps: [
            {
              element: '#create-profile-section',
              popover: {
                title: 'Create Your First Profile',
                description: 'Choose manual or AI-powered profile creation to define your search criteria.',
                side: 'top',
                align: 'center',
              },
            },
          ],
        });
        driverRef.current = driverInstance;
        driverInstance.drive();
      } else if (step === 3) {
        // Step 3: Highlight "Open Flatfox" CTA
        const driverInstance = driver({
          showProgress: true,
          allowClose: true,
          overlayColor: 'black',
          overlayOpacity: 0.5,
          onDestroyStarted: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          steps: [
            {
              element: '#open-flatfox-cta',
              popover: {
                title: 'Head to Flatfox',
                description: "Open Flatfox and the extension will guide you through scoring your first listing.",
                side: 'top',
                align: 'center',
                onNextClick: async () => {
                  // Write step=4, active=true to Supabase BEFORE opening Flatfox
                  // This prevents stale state when extension reads onboarding step
                  await updateOnboardingState(4, true, state.onboarding_completed);
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
    } else if ((pathname.startsWith('/analyses') || pathname.startsWith('/analysis')) && step === 8) {
      // Step 8: Light non-blocking tooltips for post-analysis feature awareness
      const step8Targets = [
        {
          selector: '#analyses-list',
          title: 'Your Analyses',
          description: 'See all your scored listings here. Each analysis shows the match score and reasoning.',
        },
        {
          selector: '#profile-switcher',
          title: 'Switch Profiles',
          description: 'Use different search profiles to compare the same listing against different criteria.',
        },
      ];

      // Filter to targets that exist in the DOM
      const existingSteps = step8Targets
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
  }, [state, pathname, skip]);

  // Auto-start tour for first-time users (no onboarding state in DB yet)
  useEffect(() => {
    if (isLoading || tourLaunchedRef.current) return;
    if (!state) return;

    // A brand-new user has onboarding_active=false and step=1 and completed=false
    // Auto-start the tour for them
    if (!state.onboarding_active && !state.onboarding_completed && state.onboarding_step === 1) {
      tourLaunchedRef.current = true;
      onboarding.startTour().then(() => {
        // Navigate to download page to start Step 1
        if (pathname !== '/download') {
          router.push('/download');
        }
      });
    } else if (state.onboarding_active) {
      tourLaunchedRef.current = true;
      // Small delay to allow DOM to settle
      const timer = setTimeout(() => {
        launchTourForCurrentPage();
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, state?.onboarding_active, state?.onboarding_step]);

  // Re-launch tour when pathname changes (navigation to new page)
  useEffect(() => {
    if (!state?.onboarding_active) return;
    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Expose launchTourForCurrentPage via context
  const contextValue: OnboardingContextValue & { launchTourForCurrentPage: () => void } = {
    ...onboarding,
    launchTourForCurrentPage,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
