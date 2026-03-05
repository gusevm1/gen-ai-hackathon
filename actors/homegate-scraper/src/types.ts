/**
 * Actor input parameters for the Homegate scraper.
 */
export interface ActorInput {
  /** Type of listings to scrape */
  listingType: 'rent' | 'buy' | 'both';
  /** Maximum number of listings to scrape (0 = unlimited) */
  maxItems?: number;
}

/**
 * Top-level structure of the window.__INITIAL_STATE__ JSON on search pages.
 *
 * JSON path: data.resultList.search.fullSearch.result
 * Based on Scrapfly homegate-scraper reference implementation (MEDIUM confidence).
 */
export interface HomegateSearchResult {
  resultList: {
    search: {
      fullSearch: {
        result: {
          listings: HomegateListingCard[];
          pageCount: number;
        };
      };
    };
  };
}

/**
 * Individual listing card from Homegate search results.
 *
 * Fields based on Scrapfly scraper analysis and Homegate page structure.
 * Some fields may be absent depending on the listing.
 */
export interface HomegateListingCard {
  /** Unique listing identifier */
  id: string;

  /** Listing type metadata */
  listingType: {
    type: 'RENT' | 'BUY';
  };

  /** Offer type (e.g., apartment, house) */
  offerType?: string;

  /** Property categories */
  categories?: string[];

  /** Property characteristics */
  characteristics: {
    livingSpace?: number;
    numberOfRooms?: number;
    floor?: number;
    yearBuilt?: number;
    lotSize?: number;
  };

  /** Property address */
  address: {
    street?: string;
    postalCode?: string;
    locality?: string;
    geoCoordinates?: {
      latitude: number;
      longitude: number;
      accuracy?: string;
    };
  };

  /** Lister/agency information */
  lister?: {
    name?: string;
    phone?: string;
  };

  /** Pricing information */
  prices: {
    rent?: {
      gross?: number;
      net?: number;
      interval?: string;
    };
    buy?: {
      price?: number;
    };
    currency?: string;
  };

  /** Localized title (keyed by locale code, e.g., "de", "fr") */
  title?: {
    [locale: string]: string;
  };

  /** Localized description (keyed by locale code) */
  description?: {
    [locale: string]: string;
  };

  /** Localized URL paths */
  localization?: {
    [locale: string]: {
      urls?: {
        detail?: string;
      };
    };
  };

  /** Property images */
  pictures?: Array<{
    url: string;
    [key: string]: unknown;
  }>;
}
