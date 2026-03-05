// TODO: After first --dry-run test, inspect actual Apify actor output fields
// and tighten the fallback chains below to match the real schema.
// Current field mappings use broad fallbacks for multiple possible naming conventions.

import { parseSwissPrice, parseSwissRooms, parseSwissArea } from '../../parsers/swiss-numbers.js';

type RawRecord = Record<string, unknown>;

/**
 * Normalize a raw Apify Homegate record into a shape compatible with PropertyListingSchema.
 * Missing required fields return undefined — Zod safeParse will reject them with clear errors.
 */
export function normalizeHomegate(raw: RawRecord): Record<string, unknown> {
  const scrapedAt = new Date().toISOString();
  const source = 'homegate';

  // Determine listing type from URL or offer type field
  const url = String(raw.url || raw.link || '');
  const listingType = inferListingType(url, raw);

  // Parse price — handle Swiss formatting
  const rawPrice = raw.price ?? raw.sellingPrice ?? raw.rentPrice ?? raw.priceFormatted;
  const price = typeof rawPrice === 'number' ? rawPrice : parseSwissPrice(rawPrice as string);

  // Parse rooms — handle Swiss formatting
  const rawRooms = raw.rooms ?? raw.numberOfRooms ?? raw.roomCount;
  const rooms = typeof rawRooms === 'number' ? rawRooms : parseSwissRooms(rawRooms as string);

  // Parse living space
  const rawArea = raw.livingSpace ?? raw.surfaceLiving ?? raw.area ?? raw.floorSpace;
  const livingSpace = typeof rawArea === 'number' ? rawArea : parseSwissArea(rawArea as string);

  // Parse address — dual format per user decision (raw string + structured)
  const address = normalizeAddress(raw);

  // Parse floor
  const rawFloor = raw.floor ?? raw.floorNumber;
  const floor = typeof rawFloor === 'number'
    ? rawFloor
    : rawFloor
      ? parseInt(String(rawFloor), 10)
      : undefined;

  // Image URLs — store URLs only, never download per user decision
  const imageUrls = normalizeImageUrls(raw);

  // Geo coordinates — handle nested and flat formats
  const geoObj = raw.geo as RawRecord | undefined;
  const coordsObj = raw.coordinates as RawRecord | undefined;

  const latitude = typeof raw.latitude === 'number'
    ? raw.latitude
    : (geoObj && typeof geoObj.latitude === 'number' ? geoObj.latitude : undefined)
      ?? (coordsObj && typeof coordsObj.lat === 'number' ? coordsObj.lat : undefined);

  const longitude = typeof raw.longitude === 'number'
    ? raw.longitude
    : (geoObj && typeof geoObj.longitude === 'number' ? geoObj.longitude : undefined)
      ?? (coordsObj && typeof coordsObj.lng === 'number' ? coordsObj.lng : undefined);

  return {
    url,
    title: raw.title ?? raw.name ?? '',
    listingType,
    price: price ?? undefined, // Zod requires positive number — null becomes undefined (rejected by schema)
    rooms: rooms ?? undefined,
    address,
    source,
    scrapedAt,
    livingSpace: livingSpace ?? undefined,
    floor: floor !== undefined && !isNaN(floor) ? floor : undefined,
    yearBuilt: (raw.yearBuilt ?? raw.constructionYear) as number | undefined,
    description: (raw.description ?? raw.text) as string | undefined, // Full text, no truncation per user decision
    imageUrls,
    features: Array.isArray(raw.features) ? raw.features.map(String) : undefined,
    propertyType: (raw.propertyType ?? raw.category) as string | undefined,
    agencyName: (raw.agencyName ?? raw.agency) as string | undefined,
    agencyContact: raw.agencyContact as string | undefined,
    latitude,
    longitude,
    currency: (raw.currency as string) ?? 'CHF',
  };
}

/**
 * Infer listing type from URL path or raw data fields.
 */
function inferListingType(url: string, raw: RawRecord): 'rent' | 'buy' | string {
  // Check URL for /rent/ or /buy/
  if (url.includes('/rent/') || url.includes('/mieten/') || url.includes('/louer/')) {
    return 'rent';
  }
  if (url.includes('/buy/') || url.includes('/kaufen/') || url.includes('/acheter/')) {
    return 'buy';
  }

  // Check raw fields
  const offerType = String(raw.offerType ?? raw.listingType ?? raw.type ?? '').toLowerCase();
  if (offerType.includes('rent') || offerType.includes('miet')) {
    return 'rent';
  }
  if (offerType.includes('buy') || offerType.includes('kauf') || offerType.includes('sale')) {
    return 'buy';
  }

  // Default to rent if cannot determine (Zod will validate the enum)
  return 'rent';
}

/**
 * Build address object with raw string + structured fields.
 * Per user decision: dual format (raw string preserved as-is + structured fields parsed where available).
 */
function normalizeAddress(raw: RawRecord): Record<string, unknown> {
  // Try to get raw address string
  const rawAddress = raw.address ?? raw.location ?? raw.fullAddress;
  const rawStr = typeof rawAddress === 'string'
    ? rawAddress
    : typeof rawAddress === 'object' && rawAddress !== null
      ? formatAddressObject(rawAddress as RawRecord)
      : '';

  // Try structured fields (might be top-level or nested in address object)
  const addrObj = typeof rawAddress === 'object' && rawAddress !== null
    ? rawAddress as RawRecord
    : raw;

  const street = (addrObj.street ?? raw.street) as string | undefined;
  const zip = String(addrObj.zip ?? addrObj.zipCode ?? addrObj.postalCode ?? raw.zip ?? raw.zipCode ?? '');
  const city = String(addrObj.city ?? addrObj.locality ?? raw.city ?? '');
  const canton = String(addrObj.canton ?? addrObj.state ?? addrObj.region ?? raw.canton ?? '');

  // If city is empty, try to parse from raw address string
  let parsedCity = city;
  let parsedCanton = canton;
  if (!parsedCity && rawStr) {
    const parts = parseAddressString(rawStr);
    parsedCity = parts.city;
    parsedCanton = parts.canton || parsedCanton;
  }

  return {
    raw: rawStr || `${street ?? ''} ${zip} ${parsedCity}`.trim(),
    ...(street ? { street } : {}),
    ...(zip ? { zip } : {}),
    city: parsedCity,
    canton: parsedCanton,
  };
}

/**
 * Format an address object into a raw string.
 */
function formatAddressObject(addr: RawRecord): string {
  const parts = [
    addr.street,
    addr.zip ?? addr.zipCode ?? addr.postalCode,
    addr.city ?? addr.locality,
    addr.canton ?? addr.state ?? addr.region,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Attempt to parse city and canton from a Swiss address string.
 * Common formats: "Bahnhofstrasse 1, 8001 Zurich, ZH" or "8001 Zurich (ZH)"
 */
function parseAddressString(addr: string): { city: string; canton: string } {
  // Try pattern: "... ZIP City, Canton" or "... ZIP City (Canton)"
  const match = addr.match(/(\d{4})\s+([^,(]+?)(?:\s*[,(]\s*([A-Z]{2})\s*[)]?\s*)?$/);
  if (match) {
    return {
      city: match[2].trim(),
      canton: match[3] ?? '',
    };
  }
  // Try last comma-separated part as city
  const parts = addr.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    return { city: parts[parts.length - 1], canton: '' };
  }
  return { city: addr.trim(), canton: '' };
}

/**
 * Extract image URLs from various possible field names.
 * Filters to valid URL strings only.
 */
function normalizeImageUrls(raw: RawRecord): string[] | undefined {
  const candidates = raw.images ?? raw.imageUrls ?? raw.photos ?? raw.pictures;

  if (!candidates) return undefined;

  if (Array.isArray(candidates)) {
    const urls = candidates
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          // Handle { url: "..." } or { src: "..." } patterns
          const obj = item as RawRecord;
          return String(obj.url ?? obj.src ?? obj.href ?? '');
        }
        return '';
      })
      .filter((url) => url.startsWith('http'));

    return urls.length > 0 ? urls : undefined;
  }

  return undefined;
}
