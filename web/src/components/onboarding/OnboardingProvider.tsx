'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, Driver, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from '@/hooks/use-onboarding';

/**
 * Replace the driver.js "X" close icon with a text "Exit Tutorial" button.
 * Called via onPopoverRender on every step.
 */
function patchCloseButton(popover: PopoverDOM) {
  const btn = popover.closeButton;
  // Clear the SVG icon and replace with text
  btn.textContent = 'Exit Tutorial';
  btn.style.cssText = [
    'font-size:12px',
    'font-weight:500',
    'color:#888',
    'background:transparent',
    'border:none',
    'cursor:pointer',
    'padding:4px 8px',
    'border-radius:4px',
    'white-space:nowrap',
  ].join(';');
}

type OnboardingContextValue = ReturnType<typeof useOnboarding> & {
  startTour: () => Promise<void>;
  launchTourForCurrentPage: () => void;
  advanceToOpenFlatfox: () => void;
};

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
  // Tracks whether the user saved preferences during onboarding step 4.
  // Used to skip the "Save Preferences" sub-step and jump to "Open in Flatfox" directly.
  const step4SavedRef = useRef(false);

  /**
   * Launch driver.js tour steps appropriate for the current page + onboarding step.
   *
   * Step mapping:
   *   Step 1 — Welcome intro (any page, no DOM target)
   *   Step 2 — Install extension (/download, #install-extension-cta)
   *   Step 3 — Create profile (/dashboard, #create-profile-section)
   *   Step 4 — Save Preferences then Open Flatfox (/profiles/*, #save-preferences-btn then #open-flatfox-profile-btn)
   *   Steps 5-8 — Extension side (handled in content script)
   *   Step 9 — Post-analysis tooltips (/analyses or /analysis, step===9)
   *
   * Global UX rules:
   *   - allowClose: false on ALL steps (clicking outside NEVER exits the tour)
   *   - onCloseClick is the ONLY way to exit — labelled "Exit Tutorial"
   *   - A hint "Click outside to temporarily hide this tip" is shown on step 2
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
        showProgress: false,
        allowClose: false,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onPopoverRender: patchCloseButton,
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
              progressText: 'Step 1 of 9',
              nextBtnText: 'Start Tour',

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
      // allowClose: false — clicking outside temporarily hides the popover without exiting
      const driverInstance = driver({
        showProgress: false,
        allowClose: false,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onPopoverRender: patchCloseButton,
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
                'Follow the installation instructions shown on this screen. Once you\'ve completed all steps, click "I\'ve installed it!" below.\n\nClick outside to temporarily hide this tip.',
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 2 of 9',

            },
          },
        ],
      });
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/dashboard' && step === 3) {
      // Step 3: Highlight the profile creation section on dashboard
      // Popover placed below the selection cards (side: 'bottom')
      const driverInstance = driver({
        showProgress: false,
        allowClose: false,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onPopoverRender: patchCloseButton,
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
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 3 of 9',

            },
          },
        ],
      });
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname.startsWith('/profiles/') && step === 4) {
      // Step 4: On the profile edit page
      // Sub-step 1: Save Preferences — delayed 3s so user has time to fill the form first
      // Sub-step 2: Open Flatfox — appears after save is confirmed (via advanceToOpenFlatfox)
      // The "Open in Flatfox" popover has NO "next" button — user must click the actual button
      const driverInstance = driver({
        showProgress: false,
        allowClose: false,
        overlayColor: 'black',
        overlayOpacity: 0.5,
        onPopoverRender: patchCloseButton,
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
        },
        steps: [
          {
            element: '#save-preferences-btn',
            popover: {
              title: 'Save Your Preferences',
              description:
                'Fill in your search criteria — location, budget, rooms — then save. These preferences will be used to score Flatfox listings.',
              side: 'top',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 4 of 9',

            },
          },
          {
            element: '#open-flatfox-profile-btn',
            popover: {
              title: 'Head to Flatfox',
              description:
                'Open Flatfox with your filters pre-applied. The HomeMatch extension will guide you through scoring your first listing.',
              side: 'bottom',
              align: 'center',
              showButtons: ['close'],
              disableButtons: ['previous'],
              progressText: 'Step 4 of 9',

            },
          },
        ],
      });
      driverRef.current = driverInstance;
      // If user already saved, skip to "Open in Flatfox" sub-step immediately.
      // Otherwise delay 3s so the user has time to fill the form before the popover appears.
      if (step4SavedRef.current) {
        driverInstance.drive(1);
      } else {
        setTimeout(() => {
          // Check again in case user saved during the delay
          if (step4SavedRef.current) {
            driverInstance.drive(1);
          } else {
            driverInstance.drive();
          }
        }, 3000);
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
            closeBtnText: 'Exit Tutorial',
          },
        }));

      if (existingSteps.length > 0) {
        const driverInstance = driver({
          showProgress: false,
          allowClose: false,
          overlayColor: 'black',
          overlayOpacity: 0.3,
          onPopoverRender: patchCloseButton,
          onCloseClick: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
          },
          onDestroyStarted: () => {
            // Only called when driver naturally ends (last step "Done")
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
    // Reset step 4 save flag when navigating to a different page
    if (!pathname.startsWith('/profiles/')) {
      step4SavedRef.current = false;
    }
    const timer = setTimeout(() => {
      launchTourForCurrentPage();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * Advance from the "Save Preferences" sub-step to the "Open in Flatfox" sub-step.
   * Called by PreferencesForm after a successful save when onboarding step === 4.
   *
   * If the driver hasn't started yet (user saved before the 3-second delay elapsed),
   * we move directly to the second sub-step by driving from index 1.
   */
  const advanceToOpenFlatfox = useCallback(() => {
    // Mark that save has happened so subsequent driver launches skip to Open Flatfox
    step4SavedRef.current = true;
    if (driverRef.current) {
      try {
        driverRef.current.moveNext();
      } catch {
        // Driver finished or errored — re-launch which will now jump to index 1
        launchTourForCurrentPage();
      }
    } else {
      // Driver not started yet (user saved before the 3-second delay elapsed)
      // launchTourForCurrentPage will see step4SavedRef=true and drive(1) directly
      launchTourForCurrentPage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchTourForCurrentPage]);

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
    advanceToOpenFlatfox,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
