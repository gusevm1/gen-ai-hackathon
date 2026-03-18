/**
 * Build a pre-filtered Flatfox search URL from user preferences.
 * Maps internal preference fields to Flatfox URL query parameters.
 */

export interface FlatfoxUrlPreferences {
  location?: string
  offerType?: string
  objectCategory?: string
  budgetMin?: number | null
  budgetMax?: number | null
  roomsMin?: number | null
  roomsMax?: number | null
  boundingBox?: { north: number; south: number; east: number; west: number }
}

export function buildFlatfoxUrl(prefs: FlatfoxUrlPreferences): string {
  const params = new URLSearchParams()

  // Offer type
  if (prefs.offerType === "RENT") {
    params.set("offer_type", "RENT")
  } else if (prefs.offerType === "SALE") {
    params.set("offer_type", "SALE")
  }

  // Location — use bounding box if available, otherwise fall back to query
  if (prefs.boundingBox) {
    params.set("north", String(prefs.boundingBox.north))
    params.set("south", String(prefs.boundingBox.south))
    params.set("east", String(prefs.boundingBox.east))
    params.set("west", String(prefs.boundingBox.west))
    if (prefs.location) {
      params.set("query", prefs.location)
    }
  } else if (prefs.location) {
    params.set("query", prefs.location)
  }

  // Price — use max_price (not price_display_to)
  if (prefs.budgetMax != null) {
    params.set("max_price", String(prefs.budgetMax))
  }

  // Rooms — Flatfox uses min_rooms with integer values (floor float buckets)
  if (prefs.roomsMin != null) {
    params.set("min_rooms", String(Math.floor(prefs.roomsMin)))
  }

  // Object category
  if (prefs.objectCategory === "APARTMENT") {
    params.set("object_category", "APARTMENT")
  } else if (prefs.objectCategory === "HOUSE") {
    params.set("object_category", "HOUSE")
  }

  const query = params.toString()
  return `https://flatfox.ch/en/search/${query ? `?${query}` : ""}`
}

/**
 * Geocode a location string via the Next.js API proxy, then build a Flatfox
 * URL with bounding box coordinates for proper geographic scoping.
 */
export async function buildFlatfoxUrlWithGeocode(
  prefs: FlatfoxUrlPreferences
): Promise<string> {
  if (!prefs.location) {
    return buildFlatfoxUrl(prefs)
  }

  try {
    const resp = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: prefs.location }),
    })

    if (!resp.ok) {
      return buildFlatfoxUrl(prefs)
    }

    const data = await resp.json()
    if (data.boundingBox) {
      return buildFlatfoxUrl({ ...prefs, boundingBox: data.boundingBox })
    }
  } catch {
    // Geocoding failed — fall back to query-only URL
  }

  return buildFlatfoxUrl(prefs)
}
