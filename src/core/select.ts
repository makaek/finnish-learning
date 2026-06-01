/**
 * select.ts — deterministic weighted sampling WITHOUT replacement.
 *
 * Shared by all three session builders to pick which items to drill, so mastery weighting
 * (srs.ts `selectionWeight`) lives in one tested place instead of being re-derived per
 * exercise. PURE: no UI/DB imports; randomness is injected via the quiz RNG.
 */

import type { Rng } from "./quiz";

/**
 * Pick up to `size` distinct items, favouring higher weights. Uses the Efraimidis–Spirakis
 * weighted-reservoir key `u^(1/w)` (u uniform in [0,1)): items with larger weight get keys
 * skewed toward 1, so sorting by descending key yields a weighted sample without replacement.
 *
 * Deterministic for a given `rng`. Items with weight ≤ 0 are effectively excluded (sorted
 * last, chosen only if needed to reach `size`). Never mutates `items`.
 */
export function weightedSample<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
  size: number,
): T[] {
  const n = Math.max(0, Math.min(size, items.length));
  if (n === 0) return [];
  return items
    .map((item) => {
      const w = weightOf(item);
      // Positive-weight keys live in [0, 1); -Infinity sorts zero-weight items strictly last.
      const key = w > 0 ? Math.pow(rng(), 1 / w) : -Infinity;
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map((entry) => entry.item);
}
