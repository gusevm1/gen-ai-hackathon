/**
 * Parse Swiss-format price strings to numbers.
 * Examples: "CHF 1'200'000" -> 1200000, "CHF 2'500.--" -> 2500
 */
export function parseSwissPrice(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/CHF\s*/i, '')
    .replace(/'/g, '')
    .replace(/\.\u2014$/, '')
    .replace(/\.—$/, '')
    .replace(/\.\-\-$/, '')
    .replace(/\s*\/\s*(month|year|mois|an)\s*/i, '')
    .replace(/\s/g, '')
    .trim();
  if (cleaned === '') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse Swiss-format room strings to numbers.
 * Examples: "3.5 Zimmer" -> 3.5, "4" -> 4
 */
export function parseSwissRooms(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Parse Swiss-format area strings to numbers.
 * Examples: "120 m2" -> 120, "85.5 m2" -> 85.5
 */
export function parseSwissArea(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}
