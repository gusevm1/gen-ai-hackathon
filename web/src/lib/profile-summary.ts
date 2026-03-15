import type { Preferences } from '@/lib/schemas/preferences'

/**
 * Generates a natural-language summary of a profile's preferences.
 * Pure deterministic function -- no side effects, no async.
 */
export function generateProfileSummary(prefs: Partial<Preferences>): string {
  const parts: string[] = []

  // Location and offer type
  const offerLabel = prefs.offerType === 'SALE' ? 'buy' : 'rent'
  if (prefs.location) {
    parts.push(`Looking to ${offerLabel} in ${prefs.location}`)
  } else {
    parts.push(`Looking to ${offerLabel}`)
  }

  // Property type
  if (prefs.objectCategory && prefs.objectCategory !== 'ANY') {
    const typeLabel = prefs.objectCategory === 'APARTMENT' ? 'an apartment' : 'a house'
    parts.push(typeLabel)
  }

  // Budget range
  const budgetParts: string[] = []
  if (prefs.budgetMin != null && prefs.budgetMax != null) {
    budgetParts.push(`CHF ${prefs.budgetMin.toLocaleString('de-CH')}-${prefs.budgetMax.toLocaleString('de-CH')}`)
  } else if (prefs.budgetMin != null) {
    budgetParts.push(`from CHF ${prefs.budgetMin.toLocaleString('de-CH')}`)
  } else if (prefs.budgetMax != null) {
    budgetParts.push(`up to CHF ${prefs.budgetMax.toLocaleString('de-CH')}`)
  }
  if (budgetParts.length > 0) {
    if (prefs.budgetDealbreaker) budgetParts.push('(hard limit)')
    parts.push(budgetParts.join(' '))
  }

  // Rooms range
  const roomParts: string[] = []
  if (prefs.roomsMin != null && prefs.roomsMax != null) {
    roomParts.push(`${prefs.roomsMin}-${prefs.roomsMax} rooms`)
  } else if (prefs.roomsMin != null) {
    roomParts.push(`${prefs.roomsMin}+ rooms`)
  } else if (prefs.roomsMax != null) {
    roomParts.push(`up to ${prefs.roomsMax} rooms`)
  }
  if (roomParts.length > 0) {
    if (prefs.roomsDealbreaker) roomParts.push('(hard limit)')
    parts.push(roomParts.join(' '))
  }

  // Living space range
  const spaceParts: string[] = []
  if (prefs.livingSpaceMin != null && prefs.livingSpaceMax != null) {
    spaceParts.push(`${prefs.livingSpaceMin}-${prefs.livingSpaceMax} sqm`)
  } else if (prefs.livingSpaceMin != null) {
    spaceParts.push(`${prefs.livingSpaceMin}+ sqm`)
  } else if (prefs.livingSpaceMax != null) {
    spaceParts.push(`up to ${prefs.livingSpaceMax} sqm`)
  }
  if (spaceParts.length > 0) {
    if (prefs.livingSpaceDealbreaker) spaceParts.push('(hard limit)')
    parts.push(spaceParts.join(' '))
  }

  // Floor preference
  if (prefs.floorPreference && prefs.floorPreference !== 'any') {
    const floorLabel = prefs.floorPreference === 'ground' ? 'ground floor' : 'not ground floor'
    parts.push(floorLabel)
  }

  // Features (first 3 + count)
  if (prefs.features && prefs.features.length > 0) {
    const shown = prefs.features.slice(0, 3).join(', ')
    const remaining = prefs.features.length - 3
    if (remaining > 0) {
      parts.push(`${shown} +${remaining} more`)
    } else {
      parts.push(shown)
    }
  }

  // Dynamic fields (custom criteria)
  if (prefs.dynamicFields && prefs.dynamicFields.length > 0) {
    const count = prefs.dynamicFields.length
    const shown = prefs.dynamicFields.slice(0, 2).map((f) => f.name).join(', ')
    const remaining = count - 2
    if (remaining > 0) {
      parts.push(`${count} custom criteria: ${shown} +${remaining} more`)
    } else {
      parts.push(`${count} custom criteria: ${shown}`)
    }

    // Highlight critical dynamic fields specifically
    const criticalFields = prefs.dynamicFields.filter((f) => f.importance === 'critical')
    if (criticalFields.length > 0) {
      const critNames = criticalFields.map((f) => f.name).join(', ')
      parts.push(`Must-have: ${critNames}`)
    }
  }

  // Critical importance categories
  if (prefs.importance) {
    const critical = Object.entries(prefs.importance)
      .filter(([, level]) => level === 'critical')
      .map(([cat]) => cat)
    if (critical.length > 0) {
      parts.push(`Critical: ${critical.join(', ')}`)
    }
  }

  // If only the default "Looking to rent" with no specifics, show empty message
  if (parts.length <= 1 && !prefs.location) {
    return 'No preferences set yet.'
  }

  return parts.join(' \u00b7 ')
}
