/**
 * DOM parser utilities for extracting listing data from Flatfox search pages.
 */

/**
 * Extract visible listing PKs from the current Flatfox search results page.
 * Looks for anchor elements with hrefs matching the pattern /flat/{slug}/{pk}/
 * and returns a deduplicated array of integer PKs.
 */
export function extractVisibleListingPKs(): number[] {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/flat/"]',
  );

  const pkSet = new Set<number>();

  for (const link of links) {
    // Flatfox listing URLs: /flat/{slug}/{pk}/
    const match = link.href.match(/\/flat\/[^/]+\/(\d+)\//);
    if (match) {
      pkSet.add(Number(match[1]));
    }
  }

  return Array.from(pkSet);
}

/**
 * Find the listing card DOM element for a given PK.
 * Used to position score badges next to listing cards.
 *
 * @param pk - Flatfox listing PK
 * @returns The card container element, or null if not found
 */
export function findListingCardElement(pk: number): HTMLElement | null {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/flat/"]',
  );

  for (const link of links) {
    const match = link.href.match(/\/flat\/[^/]+\/(\d+)\//);
    if (match && Number(match[1]) === pk) {
      // Walk up to the nearest card-like parent container
      const card =
        link.closest('[class*="listing"]') ||
        link.parentElement?.parentElement;
      return (card as HTMLElement) ?? null;
    }
  }

  return null;
}
