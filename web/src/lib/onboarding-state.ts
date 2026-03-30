import { createClient } from '@/lib/supabase/client';

export interface OnboardingState {
  onboarding_step: number;       // 1-8
  onboarding_active: boolean;    // true while tour is running
  onboarding_completed: boolean; // true after first full completion
}

export const DEFAULT_ONBOARDING: OnboardingState = {
  onboarding_step: 1,
  onboarding_active: false,
  onboarding_completed: false,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('is_default', true)
    .single();
  return data?.preferences?.onboarding ?? DEFAULT_ONBOARDING;
}

export async function updateOnboardingState(
  step: number,
  active: boolean,
  completed: boolean,
): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('update_onboarding_state', {
    p_step: step,
    p_active: active,
    p_completed: completed,
  });
}
