import { describe, it, expect } from 'vitest';

/**
 * Wave 0 test scaffolds for stale badge detection logic.
 * Tests the pure function that determines if a badge score
 * is stale because the active profile has changed since scoring.
 */

/**
 * Determines if a badge is stale (scored with a different profile than active).
 * This is a pure function that will live in the content script utilities.
 */
function isStale(
  scoredProfileId: string | null,
  activeProfileId: string | null,
): boolean {
  // Not stale if there's no active profile (first load / logged out)
  if (activeProfileId === null) return false;
  // Stale if scored profile differs from active profile
  return scoredProfileId !== activeProfileId;
}

describe('stale badge detection', () => {
  it('returns true when scored profile differs from active profile', () => {
    expect(isStale('abc', 'xyz')).toBe(true);
  });

  it('returns false when scored profile matches active profile', () => {
    expect(isStale('abc', 'abc')).toBe(false);
  });

  it('returns false when no active profile', () => {
    expect(isStale(null, null)).toBe(false);
    expect(isStale('abc', null)).toBe(false);
  });
});
