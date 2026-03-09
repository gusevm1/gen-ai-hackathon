/**
 * Weight utilities: simple normalization (value / sum of values).
 * This keeps the raw slider inputs independent while producing
 * relative weights that always sum to 1.
 */

/**
 * Normalize raw weights by dividing each by the sum of all values.
 * Returns 0 for all categories if the sum is 0.
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights || {});
  if (entries.length === 0) return {};

  const sum = entries.reduce((acc, [, val]) => acc + (val ?? 0), 0);
  if (sum <= 0) {
    // Avoid NaN — keep everything at 0
    return Object.fromEntries(entries.map(([key]) => [key, 0]));
  }

  const normalized: Record<string, number> = {};
  entries.forEach(([key, val]) => {
    normalized[key] = Number(((val ?? 0) / sum).toFixed(6));
  });

  return normalized;
}

/**
 * Ensure values sum to 1 by normalizing when needed.
 * If they already look normalized (sum ~= 1 and max <= 1), return as-is.
 */
export function ensureNormalizedWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights || {});
  if (entries.length === 0) return {};

  const values = entries.map(([, value]) => value ?? 0);
  const max = Math.max(...values);
  const sum = values.reduce((s, v) => s + v, 0);

  const looksNormalized = max <= 1 && sum > 0 && Math.abs(sum - 1) < 0.05;
  if (looksNormalized) return weights;

  return normalizeWeights(weights);
}
