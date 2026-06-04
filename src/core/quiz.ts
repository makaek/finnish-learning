/**
 * quiz.ts — pure logic for the word-recognition exercise.
 *
 * Given the vocab pool, builds "show the Russian gloss, pick the Finnish word" questions.
 * Randomness is injected via a seedable RNG so every function is deterministic and
 * unit-testable. PURE: no UI/DB imports.
 */

import type { VocabItem } from "./dictionary";
import { getProgress, type ProgressMap } from "./progress";
import { selectionWeight, levelBoostMultiplier } from "./srs";
import { levelOf, lowestUnmasteredLevel } from "./levels";
import { weightedSample } from "./select";

/** A deterministic pseudo-random generator returning floats in [0, 1). */
export type Rng = () => number;

/** A single recognition question ready to render. */
export interface RecognitionQuestion {
  /** Source vocab id (for scoring / future SRS). */
  itemId: string;
  /** Russian gloss shown to the learner. */
  promptRu: string;
  /** The correct Finnish answer (always present in `options`). */
  correctFi: string;
  /** The answer plus distractors, shuffled. */
  options: string[];
}

export const DEFAULT_OPTION_COUNT = 4;
export const DEFAULT_SESSION_SIZE = 10;
/** Sentence lessons are shorter than word lessons: sentences are slower to read and type. */
export const SENTENCE_SESSION_SIZE = 5;

/**
 * mulberry32 — a tiny, well-known seedable PRNG. Same seed → same sequence, which is
 * what makes the quiz functions testable.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle. Decorate-sort by random key (avoids in-place index juggling);
 * returns a new array and never mutates the input. Uniform as long as the random keys
 * don't collide — with mulberry32's 32-bit output, collisions over these tiny arrays are
 * negligible, so a full Fisher-Yates isn't worth the extra index bookkeeping here.
 */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  return arr
    .map((value) => ({ key: rng(), value }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.value);
}

/**
 * Choose up to `count` distractor Finnish forms for `target`. Prefers entries that share
 * the target's part of speech; if that group is too small, pads from the rest of the
 * pool. Distractors are de-duplicated by Finnish form and never equal the correct answer.
 */
function pickDistractors(
  target: VocabItem,
  pool: readonly VocabItem[],
  rng: Rng,
  count: number,
): string[] {
  const usedFi = new Set<string>([target.fi]);
  const samePos = pool.filter((i) => i.id !== target.id && i.pos === target.pos);
  const otherPos = pool.filter((i) => i.id !== target.id && i.pos !== target.pos);

  const chosen: string[] = [];
  for (const group of [samePos, otherPos]) {
    if (chosen.length >= count) break;
    for (const item of shuffle(group, rng)) {
      if (chosen.length >= count) break;
      if (usedFi.has(item.fi)) continue;
      usedFi.add(item.fi);
      chosen.push(item.fi);
    }
  }
  return chosen;
}

/**
 * Build one recognition question for `target`, drawing distractors from `pool`. Normally
 * returns `optionCount` options; if the pool can't supply enough distinct distractors it
 * returns fewer (graceful degradation) rather than throwing.
 */
export function buildQuestion(
  target: VocabItem,
  pool: readonly VocabItem[],
  rng: Rng,
  optionCount: number = DEFAULT_OPTION_COUNT,
): RecognitionQuestion {
  const distractors = pickDistractors(target, pool, rng, Math.max(0, optionCount - 1));
  const options = shuffle([target.fi, ...distractors], rng);
  return {
    itemId: target.id,
    promptRu: target.ru,
    correctFi: target.fi,
    options,
  };
}

/**
 * Build a session of up to `size` distinct questions, each target drawn once from
 * `items`. Distractors are pulled from the whole pool so even rarely-seen words appear.
 *
 * Takes a numeric `seed` (not a shared Rng) and derives an independent generator per
 * question, so a given question's options depend only on its own target + index — not on
 * how many RNG draws earlier questions consumed. That keeps a single question reproducible
 * on its own (useful for a future "replay this card" feature) while the whole session
 * stays deterministic for a seed.
 *
 * When `progress` is supplied, targets are drawn by mastery weight (well-known words appear
 * far less often); without it the selection is a plain uniform shuffle (unchanged behavior).
 */
export function buildSession(
  items: readonly VocabItem[],
  seed: number,
  size: number = DEFAULT_SESSION_SIZE,
  optionCount: number = DEFAULT_OPTION_COUNT,
  progress?: ProgressMap,
): RecognitionQuestion[] {
  const boost = progress ? lowestUnmasteredLevel(items, progress, "recognition") : undefined;
  const targets = progress
    ? weightedSample(
        items,
        (item) =>
          selectionWeight(getProgress(progress, "recognition", item.id)) *
          levelBoostMultiplier(levelOf(item), boost),
        makeRng(seed),
        size,
      )
    : shuffle(items, makeRng(seed)).slice(0, Math.min(size, items.length));
  return targets.map((target, i) =>
    buildQuestion(target, items, makeRng(seed + (i + 1) * 0x9e3779b9), optionCount),
  );
}
