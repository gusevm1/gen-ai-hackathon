import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

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
 * Initializes all categories to a neutral midpoint (50).
 */
function defaultWeights(categories: string[]): Record<string, number> {
  if (categories.length === 0) return {};

  const result: Record<string, number> = {};
  categories.forEach((cat) => {
    result[cat] = 50;
  });

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
    return defaultWeights(categories);
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

    // Preserve retained values; initialize new categories to neutral 50
    if (retained.length === 0) {
      setWeights(defaultWeights(categories));
      return;
    }

    const next: Record<string, number> = {};
    retained.forEach((cat) => {
      next[cat] = weights[cat];
    });
    added.forEach((cat) => {
      next[cat] = 50;
    });

    setWeights(next);
  }, [categories]);

  const setWeight = useCallback(
    (category: string, value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      setWeights((current) => ({ ...current, [category]: clamped }));
    },
    [],
  );

  const resetToEqual = useCallback(() => {
    setWeights(defaultWeights(categories));
  }, [categories]);

  const total = useMemo(() => {
    const sum = Object.values(weights).reduce((s, v) => s + v, 0);
    return Math.round(sum * 10) / 10;
  }, [weights]);

  return { weights, setWeight, resetToEqual, total };
}
