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

import { getProgress, type ItemKind, type ProgressMap } from "./progress";

/** A word is "learned" once its Leitner box reaches this (≈ 3 clean first-attempt answers). */
export const LEARNED_BOX = 3;
/** Fraction of a level's words that must be learned before the next level unlocks. */
export const UNLOCK_FRACTION = 0.8;

/** The three ways a single word is practised; level progress averages mastery across them. */
export const WORD_MODES: readonly ItemKind[] = ["recognition", "production", "say_word"];

/**
 * A word counts as learned (for level UNLOCKS + overall progress) once it is mastered
 * (>= LEARNED_BOX) in ANY word exercise — recognition, production, or say_word. A single
 * mastered skill is enough to keep the curriculum flowing; depth across modes is measured
 * separately by {@link wordMastery}.
 */
export function wordLearned(progress: ProgressMap, vocabId: string): boolean {
  return WORD_MODES.some((kind) => getProgress(progress, kind, vocabId).box >= LEARNED_BOX);
}

/**
 * How deeply a word is mastered, in [0, 1]: the fraction of the three word modes
 * (recognition / production / say_word) in which it's at or above LEARNED_BOX. This is what
 * makes a level's progress bar grow as you practise DIFFERENT activities on the same words —
 * recognition alone is 1/3, adding writing 2/3, adding speech 3/3.
 */
export function wordMastery(progress: ProgressMap, vocabId: string): number {
  const mastered = WORD_MODES.filter(
    (kind) => getProgress(progress, kind, vocabId).box >= LEARNED_BOX,
  ).length;
  return mastered / WORD_MODES.length;
}

/** Gentler bar for *using* a word in a sentence: at least one net-correct answer. */
export const SENTENCE_WORD_BOX = 1;

/**
 * Whether a word is familiar enough to appear in a sentence exercise — a lower bar than
 * full mastery, so sentences become available as you start learning words (not only after
 * you've mastered every one). Keeps the "build from words you know" spirit without
 * requiring all of them to be fully mastered first.
 */
export function wordUsableInSentence(progress: ProgressMap, vocabId: string): boolean {
  return (
    getProgress(progress, "recognition", vocabId).box >= SENTENCE_WORD_BOX ||
    getProgress(progress, "production", vocabId).box >= SENTENCE_WORD_BOX
  );
}

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
  /** Words learned in ≥1 word mode — the UNLOCK metric (keeps the curriculum flowing). */
  learned: number;
  /**
   * Average {@link wordMastery} across the level's words, in [0, 1] (1 for an empty level) —
   * the DISPLAY metric. Unlike `learned`, this rises as you practise more modes on the same
   * words, so the level bar reflects ALL activities, not just the first one that "learned" a
   * word. (Unlocks still use `learned`, so the bar can sit below 100% past an unlock.)
   */
  fraction: number;
}

/** Per-level vocab mastery, in ascending level order. */
export function levelStats(vocab: readonly VocabLike[], progress: ProgressMap): LevelStat[] {
  return listLevels(vocab).map((level) => {
    const inLevel = vocab.filter((v) => levelOf(v) === level);
    const total = inLevel.length;
    const learned = inLevel.filter((v) => wordLearned(progress, v.id)).length;
    const masterySum = inLevel.reduce((sum, v) => sum + wordMastery(progress, v.id), 0);
    return { level, total, learned, fraction: total === 0 ? 1 : masterySum / total };
  });
}

/** A level's unlock readiness: fraction of its words learned in ≥1 mode (1 for empty). */
function unlockReadiness(stat: LevelStat): number {
  return stat.total === 0 ? 1 : stat.learned / stat.total;
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
    if (unlocked.has(prev.level) && unlockReadiness(prev) >= UNLOCK_FRACTION) unlocked.add(stat.level);
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

/**
 * The learner's current level: the FRONTIER — the highest level they've unlocked. (Earlier
 * levels keep growing in the background as more modes are practised, but "current level" is
 * the furthest reached, which is what a game-style header shows.)
 */
export function activeLevel(stats: readonly LevelStat[], unlocked: ReadonlySet<number>): number {
  const open = stats.filter((s) => unlocked.has(s.level)).map((s) => s.level);
  return open.length === 0 ? 1 : Math.max(...open);
}

export interface Progress {
  learned: number;
  total: number;
  fraction: number;
}

/** Overall vocab mastery across all levels. */
export function overallProgress(vocab: readonly VocabLike[], progress: ProgressMap): Progress {
  const total = vocab.length;
  const learned = vocab.filter((v) => wordLearned(progress, v.id)).length;
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
  return sentences.filter(
    (s) => unlocked.has(levelOf(s)) && s.uses.every((id) => wordUsableInSentence(progress, id)),
  );
}
