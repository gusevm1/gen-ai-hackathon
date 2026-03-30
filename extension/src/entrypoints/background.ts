import { supabase } from '@/lib/supabase';

/**
 * Message types for popup <-> background communication.
 * Covers auth actions + profile management + health checks.
 */
export type AuthMessage =
  | { action: 'signIn'; credentials: { email: string; password: string } }
  | { action: 'signOut' }
  | { action: 'getSession' }
  | { action: 'getUser' };

export type ExtMessage =
  | AuthMessage
  | { action: 'getProfiles' }
  | { action: 'switchProfile'; profileId: string }
  | { action: 'healthCheck' }
  | { action: 'getOnboardingState' }
  | { action: 'updateOnboardingState'; step: number; active: boolean; completed: boolean };

/**
 * Handle messages from the popup and content scripts.
 * Returns a promise that resolves with the result.
 */
export async function handleMessage(
  message: ExtMessage,
): Promise<unknown> {
  switch (message.action) {
    case 'signIn': {
      const { data, error } = await supabase.auth.signInWithPassword(
        message.credentials,
      );
      return { data, error: error ? { message: error.message } : null };
    }
    case 'signOut': {
      const { error } = await supabase.auth.signOut();
      return { error: error ? { message: error.message } : null };
    }
    case 'getSession': {
      const { data } = await supabase.auth.getSession();
      return { session: data.session };
    }
    case 'getUser': {
      const { data, error } = await supabase.auth.getUser();
      return { user: data.user, error: error ? { message: error.message } : null };
    }
    case 'getProfiles': {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, is_default')
        .order('created_at', { ascending: true });
      return { profiles: data ?? [], error };
    }
    case 'switchProfile': {
      const { error } = await supabase.rpc('set_active_profile', {
        target_profile_id: message.profileId,
      });
      return { error: error ? { message: error.message } : null };
    }
    case 'healthCheck': {
      try {
        const { data, error } = await supabase.auth.getUser();
        return {
          connected: !error && !!data.user,
          email: data.user?.email ?? null,
        };
      } catch {
        return { connected: false, email: null };
      }
    }
    case 'getOnboardingState': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { onboarding: null };
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('is_default', true)
        .single();
      return { onboarding: (data?.preferences as Record<string, unknown> | null)?.onboarding ?? null };
    }
    case 'updateOnboardingState': {
      const { step, active, completed } = message as {
        action: 'updateOnboardingState';
        step: number;
        active: boolean;
        completed: boolean;
      };
      const { error } = await supabase.rpc('update_onboarding_state', {
        p_step: step,
        p_active: active,
        p_completed: completed,
      });
      return { error: error ? { message: error.message } : null };
    }
    default:
      return { error: { message: 'Unknown action' } };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ExtMessage, _sender, sendResponse) => {
      handleMessage(message).then(sendResponse);
      // Return true to indicate async response
      return true;
    },
  );
});
