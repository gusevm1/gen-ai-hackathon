/**
 * Proportional weight redistribution algorithm.
 *
 * When a user moves one weight slider, all other sliders adjust proportionally
 * so the total always equals exactly 100%.
 *
 * @param weights - Current weight values keyed by category
 * @param changedKey - The key of the slider that was moved
 * @param newValue - The new value for the changed slider
 * @returns New weights record with all values summing to exactly 100
 */
export function redistributeWeights(
  weights: Record<string, number>,
  changedKey: string,
  newValue: number,
): Record<string, number> {
  const clampedValue = Math.max(0, Math.min(100, newValue));
  const otherKeys = Object.keys(weights).filter((k) => k !== changedKey);
  const otherSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);
  const remaining = 100 - clampedValue;

  const result: Record<string, number> = { [changedKey]: clampedValue };

  if (otherKeys.length === 0) {
    return result;
  }

  if (otherSum === 0) {
    // Edge case: all others are 0, distribute remaining equally
    const equalShare = remaining / otherKeys.length;
    otherKeys.forEach((k) => {
      result[k] = Math.round(equalShare * 10) / 10;
    });
  } else {
    // Proportional redistribution
    otherKeys.forEach((k) => {
      result[k] = Math.round(((weights[k] / otherSum) * remaining) * 10) / 10;
    });
  }

  // Fix rounding to ensure exact 100% sum
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  const roundedTotal = Math.round(total * 10) / 10;
  if (roundedTotal !== 100 && otherKeys.length > 0) {
    result[otherKeys[0]] = Math.round((result[otherKeys[0]] + (100 - roundedTotal)) * 10) / 10;
  }

  return result;
}
