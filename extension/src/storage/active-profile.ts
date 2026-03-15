import { storage } from 'wxt/utils/storage';

/**
 * Represents the currently active profile for scoring.
 * Stored in extension local storage for cross-context access
 * (background, popup, content script).
 */
export interface ActiveProfileData {
  id: string;
  name: string;
}

/**
 * WXT storage item for the active profile.
 * Null means no profile is active (e.g., user not logged in or no profiles exist).
 */
export const activeProfileStorage = storage.defineItem<ActiveProfileData | null>(
  'local:activeProfile',
  { fallback: null },
);
