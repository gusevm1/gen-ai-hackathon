import { describe, it } from 'vitest';

describe('extractVisibleListingPKs', () => {
  it.todo('extracts PKs from /en/flat/{slug}/{pk}/ href patterns');

  it.todo('extracts PKs from /de/flat/{slug}/{pk}/ href patterns');

  it.todo('deduplicates PKs from multiple links to same listing');

  it.todo('returns empty array when no listing links present');

  it.todo('ignores non-flat URLs containing /flat/ substring');

  describe('findListingCardElement', () => {
    it.todo('returns the closest card-like parent for a given PK');
  });
});
