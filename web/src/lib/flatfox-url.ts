/**
 * Build a pre-filtered Flatfox search URL from user preferences.
 * Maps internal preference fields to Flatfox URL query parameters.
 */

interface FlatfoxUrlPreferences {
  location?: string
  offerType?: string
  objectCategory?: string
  budgetMin?: number | null
  budgetMax?: number | null
  roomsMin?: number | null
  roomsMax?: number | null
}

export function buildFlatfoxUrl(prefs: FlatfoxUrlPreferences): string {
  const params = new URLSearchParams()

  // Offer type
  if (prefs.offerType === "RENT") {
    params.set("offer_type", "RENT")
  } else if (prefs.offerType === "SALE") {
    params.set("offer_type", "SALE")
  }

  // Location — Flatfox expects place_name + query + place_type
  if (prefs.location) {
    params.set("place_name", prefs.location)
    params.set("query", prefs.location)
    params.set("place_type", "place")
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
