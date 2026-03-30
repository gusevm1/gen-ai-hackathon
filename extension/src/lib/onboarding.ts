/**
 * Content-script-friendly helpers for reading and writing onboarding state.
 * Communicates with the background script via browser.runtime.sendMessage.
 * Returns null on any error — content script treats null as "no onboarding active."
 */

export interface OnboardingState {
  onboarding_step: number;
  onboarding_active: boolean;
  onboarding_completed: boolean;
}

/**
 * Fetch the current onboarding state for the authenticated user.
 * Returns null if the user is not logged in or if the background script is unavailable.
 */
export async function getOnboardingState(): Promise<OnboardingState | null> {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getOnboardingState' });
    return (response?.onboarding as OnboardingState) ?? null;
  } catch {
    return null;
  }
}

/**
 * Write updated onboarding state back to Supabase via the background script.
 * Errors are silently swallowed — the UI should not block on a failed write.
 */
export async function updateOnboardingState(
  step: number,
  active: boolean,
  completed: boolean,
): Promise<void> {
  try {
    await browser.runtime.sendMessage({
      action: 'updateOnboardingState',
      step,
      active,
      completed,
    });
  } catch {
    // Silently fail — content script may load before background script is ready
  }
}
