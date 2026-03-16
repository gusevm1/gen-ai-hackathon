import type { UIMessage } from 'ai'

const STORAGE_KEY_PREFIX = 'chat-'

/**
 * Save chat messages to sessionStorage, keyed by profileId.
 * Does not write when messages array is empty (avoids clearing on mount).
 */
export function saveMessages(profileId: string, messages: UIMessage[]): void {
  if (messages.length === 0) return
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${profileId}`,
      JSON.stringify(messages)
    )
  } catch {
    // sessionStorage full or unavailable -- silently fail
  }
}

/**
 * Load chat messages from sessionStorage for the given profileId.
 * Returns empty array when no stored messages exist or on parse errors.
 */
export function loadMessages(profileId: string): UIMessage[] {
  try {
    const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${profileId}`)
    if (!stored) return []
    return JSON.parse(stored) as UIMessage[]
  } catch {
    return []
  }
}
