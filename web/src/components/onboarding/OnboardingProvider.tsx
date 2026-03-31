'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, Driver, type PopoverDOM, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from '@/hooks/use-onboarding';

// ─── Issue 3 fix: Move close button into footer ───────────────────────────────
//
// The driver.js close button is `position:absolute; top:0; right:0` inside the
// popover — it renders over the title text and appears to overflow the box.
// Fix: relabel it "Exit Tutorial" and physically move it into the footer element
// so it renders alongside the other footer buttons inside the padded container.

function patchCloseButton(popover: PopoverDOM) {
  const btn = popover.closeButton;

  // Relabel
  btn.innerHTML = 'Exit Tutorial';

  // Move from absolute-positioned top-right into the footer (left side)
  // Only move if not already in footer (guard against double calls)
  if (btn.parentElement !== popover.footer) {
    btn.style.cssText = [
      'all:unset',
      'display:inline-block',
      'box-sizing:border-box',
      'font-size:12px',
      'font-weight:500',
      'color:#888',
      'cursor:pointer',
      'padding:3px 7px',
      'border:1px solid #ccc',
      'border-radius:3px',
      'line-height:1.3',
    ].join(';');
    // Insert before progress text / navigation buttons so it sits on the left
    popover.footer.insertBefore(btn, popover.footer.firstChild);
  }
}

// ─── Issue 1 fix: overlay click hides popover without destroying driver ────────
//
// driver.js `overlayClickBehavior` can be a DriverHook. We use it to toggle
// the popover's visibility. The driver instance stays alive — state is preserved
// and the user can resume exactly where they left off via a floating button.

function handleOverlayClick(): void {
  const popover = document.querySelector<HTMLElement>('.driver-popover');
  const existing = document.getElementById('driver-resume-btn');

  if (!popover) return;

  const isHidden = popover.style.opacity === '0';

  if (isHidden) {
    // Re-show popover
    popover.style.opacity = '';
    popover.style.pointerEvents = '';
    existing?.remove();
  } else {
    // Hide popover without destroying driver
    popover.style.opacity = '0';
    popover.style.pointerEvents = 'none';

    if (!existing) {
      const btn = document.createElement('button');
      btn.id = 'driver-resume-btn';
      btn.textContent = 'Resume Tutorial';
      btn.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'z-index:100001',
        'background:#fff',
        'border:1px solid #e2e8f0',
        'border-radius:8px',
        'padding:8px 16px',
        'font-size:13px',
        'font-weight:500',
        'color:#374151',
        'cursor:pointer',
        'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
      ].join(';');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pop = document.querySelector<HTMLElement>('.driver-popover');
        if (pop) {
          pop.style.opacity = '';
          pop.style.pointerEvents = '';
        }
        btn.remove();
      });
      document.body.appendChild(btn);
    }
  }
}

// ─── Shared driver config factory ─────────────────────────────────────────────
//
// Builds the common config options used by every driver instance so they don't
// have to be repeated. Per-instance overrides (steps, onCloseClick) are merged in.

function makeDriverConfig(overrides: Partial<Config>): Config {
  return {
    showProgress: false,
    overlayColor: 'black',
    overlayOpacity: 0.5,
    // Issue 1 fix: overlayClickBehavior hides/shows popover instead of destroying driver
    overlayClickBehavior: handleOverlayClick,
    // Issue 3 fix: move close button into footer and relabel it
    onPopoverRender: patchCloseButton,
    ...overrides,
  };
}

// ─── Context types ────────────────────────────────────────────────────────────

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

// ─── Provider ────────────────────────────────────────────────────────────────

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
   * Issue 2 fix: MutationObserver watches for Radix/shadcn Dialog portals.
   *
   * When a [role=dialog] appears in the DOM (e.g. the "Create Profile" dialog on
   * the dashboard), we push the driver.js overlay behind the dialog so the user
   * can interact with the dialog unobstructed. When the dialog closes we restore
   * the driver overlay z-index.
   *
   * We also hide the popover while the dialog is open so it doesn't render at a
   * lower z-index awkwardly on top of the dialog background.
   */
  useEffect(() => {
    let dialogWasOpen = false;

    const observer = new MutationObserver(() => {
      const dialogOpen = !!document.querySelector('[role="dialog"]');
      const overlay = document.querySelector<HTMLElement>('.driver-overlay');
      const popover = document.querySelector<HTMLElement>('.driver-popover');
      const resumeBtn = document.getElementById('driver-resume-btn');

      if (dialogOpen && !dialogWasOpen) {
        dialogWasOpen = true;
        // Push driver UI behind the dialog (Radix Dialog uses z-index 50)
        if (overlay) overlay.style.zIndex = '40';
        if (popover) {
          popover.style.zIndex = '41';
          popover.style.opacity = '0';
          popover.style.pointerEvents = 'none';
        }
        if (resumeBtn) resumeBtn.style.display = 'none';
      } else if (!dialogOpen && dialogWasOpen) {
        dialogWasOpen = false;
        // Restore driver UI — remove inline z-index overrides
        if (overlay) overlay.style.zIndex = '';
        if (popover) {
          popover.style.zIndex = '';
          // Only restore visibility if the user hadn't already hidden it manually
          // (indicated by the resume button being absent)
          if (!document.getElementById('driver-resume-btn')) {
            popover.style.opacity = '';
            popover.style.pointerEvents = '';
          }
        }
        if (resumeBtn) resumeBtn.style.display = '';
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
   *   - No allowClose:false — overlay clicks are handled by overlayClickBehavior
   *   - overlayClickBehavior hides the popover without destroying driver state
   *   - onCloseClick is the ONLY way to fully exit — labelled "Exit Tutorial" and
   *     placed inside the footer (via patchCloseButton in onPopoverRender)
   */
  const launchTourForCurrentPage = useCallback(() => {
    if (!state) return;

    const step = state.onboarding_step;

    // Destroy any running tour first
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    // Remove any stale resume button from a previous driver instance
    document.getElementById('driver-resume-btn')?.remove();

    if (step === 1) {
      // Step 1: Welcome — no DOM target, centered popover on any page
      const driverInstance = driver(makeDriverConfig({
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
          document.getElementById('driver-resume-btn')?.remove();
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
                document.getElementById('driver-resume-btn')?.remove();
                await advance();
                router.push('/download');
              },
            },
          },
        ],
      }));
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/download' && step === 2) {
      // Step 2: Highlight install CTA on download page
      // overlayClickBehavior hides the popover so user can interact with install steps
      const driverInstance = driver(makeDriverConfig({
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
          document.getElementById('driver-resume-btn')?.remove();
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
      }));
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname === '/dashboard' && step === 3) {
      // Step 3: Highlight the profile creation section on dashboard
      // Popover placed below the selection cards (side: 'bottom')
      const driverInstance = driver(makeDriverConfig({
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
          document.getElementById('driver-resume-btn')?.remove();
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
      }));
      driverRef.current = driverInstance;
      driverInstance.drive();
    } else if (pathname.startsWith('/profiles/') && step === 4) {
      // Step 4: On the profile edit page
      // Sub-step 1: Save Preferences — delayed 3s so user has time to fill the form first
      // Sub-step 2: Open Flatfox — appears after save is confirmed (via advanceToOpenFlatfox)
      const driverInstance = driver(makeDriverConfig({
        onCloseClick: () => {
          skip();
          driverInstance.destroy();
          driverRef.current = null;
          document.getElementById('driver-resume-btn')?.remove();
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
      }));
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
          },
        }));

      if (existingSteps.length > 0) {
        const driverInstance = driver(makeDriverConfig({
          overlayOpacity: 0.3,
          onCloseClick: () => {
            skip();
            driverInstance.destroy();
            driverRef.current = null;
            document.getElementById('driver-resume-btn')?.remove();
          },
          onDestroyStarted: () => {
            // Only called when driver naturally ends (last step "Done")
            skip();
            driverInstance.destroy();
            driverRef.current = null;
            document.getElementById('driver-resume-btn')?.remove();
          },
          steps: existingSteps,
        }));
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
