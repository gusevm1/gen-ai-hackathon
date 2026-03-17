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

  // Location (city or free-text)
  if (prefs.location) {
    params.set("location", prefs.location)
  }

  // Price range
  if (prefs.budgetMin != null) {
    params.set("price_display_from", String(prefs.budgetMin))
  }
  if (prefs.budgetMax != null) {
    params.set("price_display_to", String(prefs.budgetMax))
  }

  // Room range
  if (prefs.roomsMin != null) {
    params.set("number_of_rooms_from", String(prefs.roomsMin))
  }
  if (prefs.roomsMax != null) {
    params.set("number_of_rooms_to", String(prefs.roomsMax))
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
