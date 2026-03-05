import { Actor } from 'apify';
import { log } from 'crawlee';
import type { CheerioCrawlingContext, CheerioCrawler } from 'crawlee';

import { parseInitialState } from './parsers/initial-state.js';
import type { HomegateListingCard } from './types.js';

/**
 * Extract the first available locale value from a locale-keyed object.
 * Prefers 'de' locale, then falls back to the first available key.
 */
function getLocalizedValue(localeMap: Record<string, string> | undefined): string | undefined {
  if (!localeMap) return undefined;
  return localeMap.de ?? Object.values(localeMap)[0];
}

/**
 * Transform a Homegate listing card from the __INITIAL_STATE__ JSON
 * into a flat object compatible with normalizeHomegate() expectations.
 *
 * Field names are chosen to match the access patterns in
 * src/scrapers/homegate/normalize.ts (the main project normalizer).
 */
function transformListing(listing: HomegateListingCard): Record<string, unknown> {
  const listingTypeLower = listing.listingType?.type?.toLowerCase() as 'rent' | 'buy' | undefined;

  // Build URL from localization or construct from id
  let url: string | undefined;
  if (listing.localization) {
    const deLocale = listing.localization.de;
    if (deLocale?.urls?.detail) {
      url = `https://www.homegate.ch${deLocale.urls.detail}`;
    }
  }
  if (!url && listing.id) {
    const type = listingTypeLower ?? 'rent';
    url = `https://www.homegate.ch/${type}/${listing.id}`;
  }

  // Extract price based on listing type
  let price: number | undefined;
  if (listingTypeLower === 'rent') {
    price = listing.prices?.rent?.gross ?? listing.prices?.rent?.net;
  } else if (listingTypeLower === 'buy') {
    price = listing.prices?.buy?.price;
  } else {
    // Fallback: try both
    price = listing.prices?.rent?.gross ?? listing.prices?.rent?.net ?? listing.prices?.buy?.price;
  }

  // Build structured address
  const address: Record<string, unknown> = {};
  if (listing.address) {
    if (listing.address.street) address.street = listing.address.street;
    if (listing.address.postalCode) address.zip = listing.address.postalCode;
    if (listing.address.locality) address.city = listing.address.locality;
    // Build raw address string for fallback
    const parts = [listing.address.street, listing.address.postalCode, listing.address.locality]
      .filter(Boolean);
    if (parts.length > 0) address.raw = parts.join(', ');
  }

  return {
    id: listing.id,
    url,
    title: getLocalizedValue(listing.title),
    listingType: listingTypeLower,
    price,
    currency: listing.prices?.currency ?? 'CHF',
    rooms: listing.characteristics?.numberOfRooms,
    livingSpace: listing.characteristics?.livingSpace,
    floor: listing.characteristics?.floor,
    yearBuilt: listing.characteristics?.yearBuilt,
    address: Object.keys(address).length > 0 ? address : undefined,
    latitude: listing.address?.geoCoordinates?.latitude,
    longitude: listing.address?.geoCoordinates?.longitude,
    description: getLocalizedValue(listing.description),
    images: listing.pictures?.map((pic) => pic.url).filter(Boolean),
    propertyType: listing.categories?.[0] ?? listing.offerType,
    agencyName: listing.lister?.name,
  };
}

/**
 * Create the search page request handler for the CheerioCrawler.
 *
 * Extracts listings from the __INITIAL_STATE__ JSON, transforms them
 * to the expected output format, pushes to Apify Dataset, and enqueues
 * pagination pages.
 *
 * @param maxItems - Maximum listings to scrape (0 = unlimited)
 * @param crawlerRef - Reference to the crawler for addRequests (pagination)
 */
export function createRequestHandler(maxItems: number, crawlerRef: { crawler: CheerioCrawler | null }) {
  let totalPushed = 0;

  return async function requestHandler({ request, $ }: CheerioCrawlingContext): Promise<void> {
    const currentPage = (request.userData.page as number | undefined) ?? 1;

    const state = parseInitialState($);
    if (!state) {
      log.warning(`No __INITIAL_STATE__ found on ${request.url}`);
      return;
    }

    // Navigate the JSON structure to get listings and page count
    const resultList = state.resultList as Record<string, unknown> | undefined;
    const search = (resultList?.search as Record<string, unknown>)?.fullSearch as Record<string, unknown> | undefined;
    const result = search?.result as { listings?: unknown[]; pageCount?: number } | undefined;

    const listings = (result?.listings ?? []) as HomegateListingCard[];
    const pageCount = result?.pageCount ?? 1;

    log.info(`Page ${currentPage}/${pageCount}: found ${listings.length} listings on ${request.url}`);

    if (listings.length === 0) {
      log.warning(`No listings found on page ${currentPage}. Response may be blocked or structure changed.`);
      return;
    }

    // Transform and push listings (respecting maxItems limit)
    const transformed: Record<string, unknown>[] = [];
    for (const listing of listings) {
      if (maxItems > 0 && totalPushed >= maxItems) {
        log.info(`Reached maxItems limit (${maxItems}). Stopping extraction.`);
        return;
      }
      transformed.push(transformListing(listing));
      totalPushed++;
    }

    await Actor.pushData(transformed);
    log.info(`Pushed ${transformed.length} listings to dataset (total: ${totalPushed})`);

    // Enqueue remaining pages on first page only
    if (currentPage === 1 && pageCount > 1 && crawlerRef.crawler) {
      const maxPages = maxItems > 0
        ? Math.min(pageCount, Math.ceil(maxItems / 20))
        : pageCount;

      const requests = [];
      for (let page = 2; page <= maxPages; page++) {
        const pageUrl = new URL(request.url);
        pageUrl.searchParams.set('ep', String(page));
        requests.push({
          url: pageUrl.toString(),
          userData: { page },
        });
      }

      if (requests.length > 0) {
        await crawlerRef.crawler.addRequests(requests);
        log.info(`Enqueued ${requests.length} additional pages (2..${maxPages})`);
      }
    }
  };
}
