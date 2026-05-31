/**
 * sentenceSession.ts — pure logic for the sentence-builder exercise.
 *
 * Picks which Russian sentences to drill this session. Deterministic for a given seed
 * (reuses the quiz RNG), and gated by an optional `isEligible` predicate so a future SRS
 * slice can restrict the pool to sentences whose words the learner has "learned" — without
 * touching the grader. PURE: no UI/DB imports.
 */

import type { SentenceItem } from "./grader";
import { makeRng, shuffle, DEFAULT_SESSION_SIZE } from "./quiz";

export { DEFAULT_SESSION_SIZE };

/** A single sentence question ready to render. */
export interface SentenceQuestion {
  /** Source sentence id (passed back to grade()). */
  id: string;
  /** Russian sentence shown to the learner. */
  promptRu: string;
}

/**
 * Predicate deciding whether a sentence is eligible this session, given the dictionary ids
 * it `uses`. Defaults to "everything is eligible" (no SRS yet); the SRS slice will pass a
 * real "all words learned?" check here.
 */
export type IsEligible = (uses: readonly string[]) => boolean;

/**
 * Build a session of up to `size` distinct sentence questions, drawn once each from the
 * eligible items. Deterministic for a given numeric `seed`.
 */
export function buildSentenceSession(
  items: readonly SentenceItem[],
  seed: number,
  size: number = DEFAULT_SESSION_SIZE,
  isEligible: IsEligible = () => true,
): SentenceQuestion[] {
  const eligible = items.filter((item) => isEligible(item.uses));
  const chosen = shuffle(eligible, makeRng(seed)).slice(0, Math.min(size, eligible.length));
  return chosen.map((item) => ({ id: item.id, promptRu: item.ru }));
}
