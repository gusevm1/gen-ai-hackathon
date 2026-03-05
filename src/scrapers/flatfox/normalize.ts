import type { RawRecord } from '../types.js';

const RESIDENTIAL_CATEGORIES = new Set([
  'APARTMENT',
  'HOUSE',
  'SHARED',
  'SECONDARY',
]);

/**
 * Normalize a FlatFox API listing record to a PropertyListing-compatible shape.
 * Returns null for non-residential categories (client-side filtering since
 * the FlatFox API ignores server-side filter parameters).
 */
export function normalizeFlatfox(
  raw: RawRecord,
): Record<string, unknown> | null {
  // Filter non-residential listings
  const category = raw.object_category as string;
  if (!RESIDENTIAL_CATEGORIES.has(category)) return null;

  // Map offer type: SALE -> 'buy', everything else -> 'rent'
  const offerType = raw.offer_type as string;
  const listingType = offerType === 'SALE' ? 'buy' : 'rent';

  // price_display is already a number -- use directly
  const price = (raw.price_display as number | null) ?? undefined;

  // number_of_rooms is a string like "3.5" -- parse with parseFloat
  const roomsStr = raw.number_of_rooms as string | null;
  const rooms = roomsStr ? parseFloat(roomsStr) : undefined;

  // URL is relative -- prepend base
  const url = `https://flatfox.ch${raw.url as string}`;

  // Images need expand=images; URLs are relative
  const images =
    Array.isArray(raw.images) && raw.images.length > 0 && typeof raw.images[0] === 'object'
      ? (raw.images as Array<{ url: string }>).map(
          (img) => `https://flatfox.ch${img.url}`,
        )
      : undefined;

  // Title priority: short_title > public_title > description_title
  const title =
    (raw.short_title as string | null) ||
    (raw.public_title as string | null) ||
    (raw.description_title as string | null) ||
    '';

  // Address: prefer public_address, fall back to constructed
  const street = raw.street as string | null;
  const zipcode = raw.zipcode as number | null;
  const city = raw.city as string;
  const publicAddress = raw.public_address as string | null;
  const addressRaw =
    publicAddress ||
    `${street || ''} ${zipcode} ${city}`.trim();

  // Features from attributes array
  const features = Array.isArray(raw.attributes)
    ? (raw.attributes as Array<{ name: string }>).map((a) => a.name)
    : undefined;

  // Agency name
  const agency = raw.agency as { name?: string } | null;
  const agencyName = agency?.name ?? undefined;

  return {
    url,
    title,
    listingType,
    price,
    rooms,
    address: {
      raw: addressRaw,
      street: street ?? undefined,
      zip: zipcode != null ? String(zipcode) : undefined,
      city,
      canton: '', // FlatFox does not provide canton
    },
    source: 'flatfox',
    scrapedAt: new Date().toISOString(),
    livingSpace: (raw.surface_living as number | null) ?? undefined,
    floor: (raw.floor as number | null) ?? undefined,
    yearBuilt: (raw.year_built as number | null) ?? undefined,
    description: (raw.description as string | null) ?? undefined,
    imageUrls: images,
    features,
    propertyType: (raw.object_type as string | null) ?? undefined,
    agencyName,
    latitude: (raw.latitude as number | null) ?? undefined,
    longitude: (raw.longitude as number | null) ?? undefined,
    currency: 'CHF',
  };
}
