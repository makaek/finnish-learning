/**
 * srs.ts — pure spaced-repetition logic (Leitner boxes).
 *
 * Two responsibilities, both pure functions over `ItemProgress` (no UI/DB imports):
 *  - `applyOutcome`: advance an item's mastery after an answer.
 *  - `selectionWeight`: turn mastery into a sampling weight, so well-known items are
 *    drawn far less often (see `weightedSample` in select.ts).
 *
 * Model: a correct answer promotes the item one box (and grows its streak); a miss resets
 * the streak and demotes one box. Weight halves per box, so 3 correct-in-a-row (box 0 → 3)
 * already makes an item 8× less likely than a brand-new one, and a fully mastered item
 * (box 5) is 32× less likely — matching "more clean answers → much lower probability".
 */

import { MAX_BOX, MIN_BOX, type ItemProgress } from "./progress";

/**
 * Fold an answer outcome into an item's progress. Returns a new record (never mutates).
 * `now` is injected for testability; defaults to wall-clock time for callers that don't care.
 */
export function applyOutcome(
  prev: ItemProgress,
  wasCorrect: boolean,
  now: number = Date.now(),
): ItemProgress {
  return {
    ...prev,
    box: wasCorrect ? Math.min(MAX_BOX, prev.box + 1) : Math.max(MIN_BOX, prev.box - 1),
    correctStreak: wasCorrect ? prev.correctStreak + 1 : 0,
    totalCorrect: prev.totalCorrect + (wasCorrect ? 1 : 0),
    totalSeen: prev.totalSeen + 1,
    lastSeen: now,
  };
}

/**
 * Sampling weight for an item: `2^(MAX_BOX - box)`, so box 0 = 32 (heavily favored) down
 * to box 5 = 1. Always ≥ 1, so even a mastered item retains a small chance to resurface.
 */
export function selectionWeight(p: ItemProgress): number {
  return 2 ** (MAX_BOX - p.box);
}

/**
 * Extra weight for items at the learner's current (frontier) level. Each lesson type tracks
 * mastery separately, so starting a NEW mode resets every word to box 0 in that track — which
 * flattens the weights and lets the whole back-catalogue crowd out the newest words, making the
 * active level feel "stuck". Multiplying the frontier level's weight keeps fresh material in
 * front of the learner across every mode, so the current level fills (and unlocks) faster.
 */
export const FRONTIER_BOOST = 4;

/** Weight multiplier for an item, given its level and the frontier (1 when not at the frontier). */
export function frontierMultiplier(level: number, frontierLevel?: number): number {
  return frontierLevel !== undefined && level === frontierLevel ? FRONTIER_BOOST : 1;
}
