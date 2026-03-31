'use client';

import { useState, useEffect } from 'react';
import {
  OnboardingState,
  DEFAULT_ONBOARDING,
  getOnboardingState,
  updateOnboardingState,
} from '@/lib/onboarding-state';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getOnboardingState()
      .then((s) => setState(s))
      .catch(() => setState(DEFAULT_ONBOARDING))
      .finally(() => setIsLoading(false));
  }, []);

  const isActive = state?.onboarding_active ?? false;

  /**
   * Advance to the next step. If step > 9, mark completed and deactivate.
   *
   * Web steps 1-4, extension steps 5-8, post-analysis step 9.
   * Advancing past step 4 sets step=5/active=true so the extension can read the state
   * and take over (handled by OnboardingProvider's onNextClick for step 4).
   */
  async function advance() {
    if (!state) return;
    const nextStep = state.onboarding_step + 1;
    if (nextStep > 9) {
      const newState: OnboardingState = {
        onboarding_step: 9,
        onboarding_active: false,
        onboarding_completed: true,
      };
      setState(newState);
      await updateOnboardingState(9, false, true);
    } else {
      const newState: OnboardingState = {
        ...state,
        onboarding_step: nextStep,
        onboarding_active: true,
      };
      setState(newState);
      await updateOnboardingState(nextStep, true, state.onboarding_completed);
    }
  }

  /**
   * Skip/exit the tour — deactivate without resetting step.
   */
  async function skip() {
    if (!state) return;
    const newState: OnboardingState = {
      ...state,
      onboarding_active: false,
    };
    setState(newState);
    await updateOnboardingState(state.onboarding_step, false, state.onboarding_completed);
  }

  /**
   * Start or restart the tour from Step 1.
   * Preserves onboarding_completed so we know the user has done this before.
   */
  async function startTour() {
    const completed = state?.onboarding_completed ?? false;
    const newState: OnboardingState = {
      onboarding_step: 1,
      onboarding_active: true,
      onboarding_completed: completed,
    };
    setState(newState);
    await updateOnboardingState(1, true, completed);
  }

  /**
   * Complete the tour — set active=false, completed=true.
   */
  async function completeTour() {
    if (!state) return;
    const newState: OnboardingState = {
      ...state,
      onboarding_active: false,
      onboarding_completed: true,
    };
    setState(newState);
    await updateOnboardingState(state.onboarding_step, false, true);
  }

  return {
    state,
    isActive,
    isLoading,
    advance,
    skip,
    startTour,
    completeTour,
  };
}
