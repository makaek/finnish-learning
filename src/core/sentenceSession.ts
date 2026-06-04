/**
 * sentenceSession.ts — pure logic for the sentence-builder exercise.
 *
 * Picks which Russian sentences to drill this session. Deterministic for a given seed
 * (reuses the quiz RNG), and gated by an optional `isEligible` predicate so a future SRS
 * slice can restrict the pool to sentences whose words the learner has "learned" — without
 * touching the grader. PURE: no UI/DB imports.
 */

import type { SentenceItem } from "./grader";
import { makeRng, shuffle, DEFAULT_SESSION_SIZE, SENTENCE_SESSION_SIZE } from "./quiz";
import { getProgress, type ItemKind, type ProgressMap } from "./progress";
import { selectionWeight, levelBoostMultiplier } from "./srs";
import { levelOf, lowestUnmasteredLevel } from "./levels";
import { weightedSample } from "./select";

export { DEFAULT_SESSION_SIZE, SENTENCE_SESSION_SIZE };

/** A single sentence question ready to render. */
export interface SentenceQuestion {
  /** Source sentence id (passed back to grade()). */
  id: string;
  /** Russian sentence shown to the learner. */
  promptRu: string;
  /** Canonical Finnish answer — used by the listening (dictation) mode to speak the prompt. */
  fi: string;
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
 *
 * When `progress` is supplied, eligible sentences are drawn by mastery weight (well-known
 * sentences appear far less often); without it the selection is a plain uniform shuffle
 * (unchanged behavior).
 */
export function buildSentenceSession(
  items: readonly SentenceItem[],
  seed: number,
  size: number = DEFAULT_SESSION_SIZE,
  isEligible: IsEligible = () => true,
  progress?: ProgressMap,
  weightKind: ItemKind = "sentences",
): SentenceQuestion[] {
  const eligible = items.filter((item) => isEligible(item.uses));
  // Boost over the ELIGIBLE pool (not all items) on purpose: never push a level whose sentences
  // aren't actually practisable this session. The vocab builders pass an already-gated pool, so
  // this matches their behaviour.
  const boost = progress ? lowestUnmasteredLevel(eligible, progress, weightKind) : undefined;
  const chosen = progress
    ? weightedSample(
        eligible,
        (item) =>
          selectionWeight(getProgress(progress, weightKind, item.id)) *
          levelBoostMultiplier(levelOf(item), boost),
        makeRng(seed),
        size,
      )
    : shuffle(eligible, makeRng(seed)).slice(0, Math.min(size, eligible.length));
  return chosen.map((item) => ({ id: item.id, promptRu: item.ru, fi: item.canonical }));
}
