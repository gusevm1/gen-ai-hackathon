import { supabase } from '@/lib/supabase';

/**
 * Message types for popup <-> background communication.
 */
export type AuthMessage =
  | { action: 'signIn'; credentials: { email: string; password: string } }
  | { action: 'signOut' }
  | { action: 'getSession' }
  | { action: 'getUser' };

/**
 * Handle the onInstalled event. Exported for testability.
 */
export async function handleInstalled(details: { reason: string }) {
  if (details.reason === 'install') {
    await browser.tabs.create({
      url: browser.runtime.getURL('/onboarding.html'),
    });
  }
}

/**
 * Handle auth-related messages from the popup.
 * Returns a promise that resolves with the auth result.
 */
export async function handleMessage(
  message: AuthMessage,
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
    default:
      return { error: { message: 'Unknown action' } };
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(handleInstalled);

  browser.runtime.onMessage.addListener(
    (message: AuthMessage, _sender, sendResponse) => {
      handleMessage(message).then(sendResponse);
      // Return true to indicate async response
      return true;
    },
  );
});
