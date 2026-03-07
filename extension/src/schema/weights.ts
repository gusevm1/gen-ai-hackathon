import { z } from 'zod';

export const WeightsSchema = z.record(z.string(), z.number().min(0).max(100));

export type Weights = z.infer<typeof WeightsSchema>;

/**
 * Validates that weight values sum to 100 within a tolerance of 0.5.
 */
export function validateWeightsSum(weights: Record<string, number>): boolean {
  const sum = Object.values(weights).reduce((s, v) => s + v, 0);
  return Math.abs(sum - 100) <= 0.5;
}
