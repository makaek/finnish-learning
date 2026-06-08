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

/** Share of a session drawn from the CURRENT level; the rest comes from earlier-level leftovers. */
export const CURRENT_LEVEL_SHARE = 0.7;

/**
 * Level-aware sampling: build a session that is ~`currentShare` items from the CURRENT level and
 * the rest from EARLIER levels' leftovers, and NEVER draws from levels above `currentLevel`.
 *
 * Within each tier items are still weighted by `weightOf` (so the SRS mastery weighting holds —
 * well-known items stay rare). The split is by COUNT (stratified, not weight-tuned), so it's
 * predictable: with enough items in each tier a size-N session has round(N·share) current-level
 * items and the remainder earlier-level ones. If a tier is short, the other absorbs the shortfall
 * (so an early level with no leftovers → all current; a current level with too few → fill from
 * earlier). Deterministic for a given `rng` (the two tier draws + final reshuffle share its stream).
 */
export function levelStratifiedSample<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  levelOf: (item: T) => number,
  currentLevel: number,
  rng: Rng,
  size: number,
  currentShare: number = CURRENT_LEVEL_SHARE,
): T[] {
  const pool = items.filter((i) => levelOf(i) <= currentLevel); // future levels never appear
  const target = Math.max(0, Math.min(size, pool.length));
  if (target === 0) return [];

  const current = pool.filter((i) => levelOf(i) === currentLevel);
  const earlier = pool.filter((i) => levelOf(i) < currentLevel);

  // Desired counts; whichever tier is short hands its slots to the other so we always reach target.
  const nCur = Math.min(current.length, Math.round(target * currentShare));
  const nEarlier = Math.min(earlier.length, target - nCur);
  const nCurFinal = target - nEarlier;

  const picked = [
    ...weightedSample(current, weightOf, rng, nCurFinal),
    ...weightedSample(earlier, weightOf, rng, nEarlier),
  ];
  // Reshuffle so the session interleaves the two tiers instead of "all current, then all earlier".
  return weightedSample(picked, () => 1, rng, picked.length);
}
