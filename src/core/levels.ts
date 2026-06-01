/**
 * levels.ts — pure curriculum model: levels, mastery, unlocks, and exercise gating.
 *
 * The dictionary and sentence bank are split into 1-based levels. A learner starts with
 * only level 1 in play; mastering enough of a level unlocks the next, so new words and
 * longer sentences appear gradually. Two gates:
 *   - vocab pool   = words in any UNLOCKED level,
 *   - sentence pool = sentences whose level is unlocked AND whose every used word is LEARNED
 *     (the "you can only build sentences from words you know" rule).
 *
 * Everything here is a pure function of the content lists + a `ProgressMap` (plus an opt-in
 * `testMode` that bypasses all gating). No UI/DB imports — trivially unit-testable.
 */

import { getProgress, type ProgressMap } from "./progress";

/** A word is "learned" once its Leitner box reaches this. */
export const LEARNED_BOX = 2;
/** Fraction of a level's words that must be learned before the next level unlocks. */
export const UNLOCK_FRACTION = 0.8;

/** Minimal shapes these functions need; real VocabItem/SentenceItem satisfy them. */
export interface VocabLike {
  id: string;
  level?: number;
}
export interface SentenceLike {
  id: string;
  level?: number;
  uses: readonly string[];
}

/** Level of an item, defaulting to 1 when unset or invalid. */
export function levelOf(item: { level?: number }): number {
  return typeof item.level === "number" && item.level >= 1 ? Math.floor(item.level) : 1;
}

/** The sorted, de-duplicated list of levels present in `items` (always includes 1). */
export function listLevels(items: readonly { level?: number }[]): number[] {
  const set = new Set<number>([1]);
  for (const item of items) set.add(levelOf(item));
  return [...set].sort((a, b) => a - b);
}

export interface LevelStat {
  level: number;
  total: number;
  /** Words at or above LEARNED_BOX. */
  learned: number;
  /** learned / total, or 1 for an empty level. */
  fraction: number;
}

/** Per-level vocab mastery, in ascending level order. */
export function levelStats(vocab: readonly VocabLike[], progress: ProgressMap): LevelStat[] {
  return listLevels(vocab).map((level) => {
    const inLevel = vocab.filter((v) => levelOf(v) === level);
    const learned = inLevel.filter(
      (v) => getProgress(progress, "vocab", v.id).box >= LEARNED_BOX,
    ).length;
    const total = inLevel.length;
    return { level, total, learned, fraction: total === 0 ? 1 : learned / total };
  });
}

/**
 * Which levels are unlocked. Level 1 is always unlocked; each subsequent level unlocks only
 * if the one before it is unlocked AND at least `UNLOCK_FRACTION` of its words are learned.
 * Unlocking stops at the first level that fails the gate (no skipping ahead).
 */
export function unlockedLevels(stats: readonly LevelStat[]): Set<number> {
  const ordered = [...stats].sort((a, b) => a.level - b.level);
  const unlocked = new Set<number>();
  for (let i = 0; i < ordered.length; i++) {
    const stat = ordered[i]!;
    if (i === 0) {
      unlocked.add(stat.level);
      continue;
    }
    const prev = ordered[i - 1]!;
    if (unlocked.has(prev.level) && prev.fraction >= UNLOCK_FRACTION) unlocked.add(stat.level);
    else break;
  }
  return unlocked;
}

/** Unlocked levels with the test-mode bypass applied (test mode opens every level). */
export function unlockedLevelsWith(
  stats: readonly LevelStat[],
  testMode = false,
): Set<number> {
  return testMode ? new Set(stats.map((s) => s.level)) : unlockedLevels(stats);
}

/** The level to focus on: the lowest unlocked level not yet fully mastered, else the highest. */
export function activeLevel(stats: readonly LevelStat[], unlocked: ReadonlySet<number>): number {
  const open = stats.filter((s) => unlocked.has(s.level)).sort((a, b) => a.level - b.level);
  if (open.length === 0) return 1;
  return (open.find((s) => s.fraction < 1) ?? open[open.length - 1]!).level;
}

export interface Progress {
  learned: number;
  total: number;
  fraction: number;
}

/** Overall vocab mastery across all levels. */
export function overallProgress(vocab: readonly VocabLike[], progress: ProgressMap): Progress {
  const total = vocab.length;
  const learned = vocab.filter(
    (v) => getProgress(progress, "vocab", v.id).box >= LEARNED_BOX,
  ).length;
  return { learned, total, fraction: total === 0 ? 0 : learned / total };
}

/** Vocabulary currently in play: everything in an unlocked level (all of it in test mode). */
export function activeVocab<T extends VocabLike>(
  vocab: readonly T[],
  progress: ProgressMap,
  testMode = false,
): T[] {
  if (testMode) return [...vocab];
  const unlocked = unlockedLevels(levelStats(vocab, progress));
  return vocab.filter((v) => unlocked.has(levelOf(v)));
}

/**
 * Sentences the learner may build now: level unlocked AND every word it uses is learned.
 * Test mode returns them all (bypasses both gates).
 */
export function eligibleSentences<S extends SentenceLike>(
  sentences: readonly S[],
  vocab: readonly VocabLike[],
  progress: ProgressMap,
  testMode = false,
): S[] {
  if (testMode) return [...sentences];
  const unlocked = unlockedLevels(levelStats(vocab, progress));
  const isLearned = (vocabId: string) => getProgress(progress, "vocab", vocabId).box >= LEARNED_BOX;
  return sentences.filter(
    (s) => unlocked.has(levelOf(s)) && s.uses.every(isLearned),
  );
}
