import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { redistributeWeights } from '@/utils/weight-redistribution';

export interface UseWeightSlidersOptions {
  categories: string[];
  initialWeights?: Record<string, number>;
}

export interface UseWeightSlidersReturn {
  weights: Record<string, number>;
  setWeight: (category: string, value: number) => void;
  resetToEqual: () => void;
  total: number;
}

/**
 * Distributes 100 equally across the given categories, handling rounding
 * so the total is exactly 100.
 *
 * Example: 3 categories -> 33.4, 33.3, 33.3
 */
function distributeEqually(categories: string[]): Record<string, number> {
  if (categories.length === 0) return {};

  const base = Math.floor((100 / categories.length) * 10) / 10;
  const result: Record<string, number> = {};

  categories.forEach((cat) => {
    result[cat] = base;
  });

  // Fix rounding remainder -- add difference to the first category
  const currentTotal = Math.round(base * categories.length * 10) / 10;
  if (currentTotal !== 100) {
    result[categories[0]] = Math.round((result[categories[0]] + (100 - currentTotal)) * 10) / 10;
  }

  return result;
}

/**
 * React hook that manages weight slider state using proportional redistribution.
 *
 * When categories change (e.g. user goes back and modifies Steps 1/2),
 * weights are re-initialized: preserved for categories that still exist,
 * with remaining weight redistributed among new ones.
 */
export function useWeightSliders(options: UseWeightSlidersOptions): UseWeightSlidersReturn {
  const { categories, initialWeights } = options;

  const [weights, setWeights] = useState<Record<string, number>>(() => {
    if (initialWeights && categories.length > 0) {
      // Check if initialWeights keys match categories
      const matchesAll = categories.every((cat) => cat in initialWeights);
      if (matchesAll) {
        // Use provided weights for matching categories
        const result: Record<string, number> = {};
        categories.forEach((cat) => {
          result[cat] = initialWeights[cat];
        });
        return result;
      }
    }
    return distributeEqually(categories);
  });

  // Track previous categories to detect changes
  const prevCategoriesRef = useRef<string[]>(categories);

  useEffect(() => {
    const prev = prevCategoriesRef.current;
    const categoriesChanged =
      prev.length !== categories.length ||
      prev.some((cat, i) => cat !== categories[i]);

    if (!categoriesChanged) return;

    prevCategoriesRef.current = categories;

    if (categories.length === 0) {
      setWeights({});
      return;
    }

    // Separate categories into retained (still exist) and new
    const retained = categories.filter((cat) => cat in weights);
    const added = categories.filter((cat) => !(cat in weights));

    if (retained.length === 0) {
      // All categories are new -- distribute equally
      setWeights(distributeEqually(categories));
      return;
    }

    // Calculate how much weight the retained categories use
    const retainedSum = retained.reduce((sum, cat) => sum + weights[cat], 0);

    // Removed categories free up weight; new categories need weight allocated
    // Redistribute: keep retained weights proportionally, share remainder among new
    const removed = prev.filter((cat) => !categories.includes(cat));
    const freedWeight = removed.reduce((sum, cat) => sum + (weights[cat] || 0), 0);

    if (added.length === 0) {
      // Categories were only removed -- scale up retained to fill 100
      if (retainedSum === 0) {
        setWeights(distributeEqually(retained));
      } else {
        const newWeights: Record<string, number> = {};
        retained.forEach((cat) => {
          newWeights[cat] = Math.round(((weights[cat] / retainedSum) * 100) * 10) / 10;
        });
        // Fix rounding
        const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
        const roundedTotal = Math.round(total * 10) / 10;
        if (roundedTotal !== 100 && retained.length > 0) {
          newWeights[retained[0]] = Math.round((newWeights[retained[0]] + (100 - roundedTotal)) * 10) / 10;
        }
        setWeights(newWeights);
      }
    } else {
      // Some categories added -- give them a share of freed weight (or equal share if none freed)
      const weightForNew = freedWeight > 0 ? freedWeight : (100 / categories.length) * added.length;
      const weightForRetained = 100 - weightForNew;

      const newWeights: Record<string, number> = {};

      // Scale retained proportionally
      if (retainedSum > 0) {
        retained.forEach((cat) => {
          newWeights[cat] = Math.round(((weights[cat] / retainedSum) * weightForRetained) * 10) / 10;
        });
      } else {
        const share = weightForRetained / retained.length;
        retained.forEach((cat) => {
          newWeights[cat] = Math.round(share * 10) / 10;
        });
      }

      // Distribute among new categories equally
      const newShare = Math.round((weightForNew / added.length) * 10) / 10;
      added.forEach((cat) => {
        newWeights[cat] = newShare;
      });

      // Fix rounding
      const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
      const roundedTotal = Math.round(total * 10) / 10;
      if (roundedTotal !== 100 && categories.length > 0) {
        newWeights[categories[0]] = Math.round((newWeights[categories[0]] + (100 - roundedTotal)) * 10) / 10;
      }

      setWeights(newWeights);
    }
  }, [categories]);

  const setWeight = useCallback(
    (category: string, value: number) => {
      setWeights((current) => redistributeWeights(current, category, value));
    },
    [],
  );

  const resetToEqual = useCallback(() => {
    setWeights(distributeEqually(categories));
  }, [categories]);

  const total = useMemo(() => {
    const sum = Object.values(weights).reduce((s, v) => s + v, 0);
    return Math.round(sum * 10) / 10;
  }, [weights]);

  return { weights, setWeight, resetToEqual, total };
}
