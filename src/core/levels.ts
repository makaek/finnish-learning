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

/** A word is "learned" once its Leitner box reaches this (≈ 2 clean first-attempt answers). */
export const LEARNED_BOX = 2;
/** Fraction of a level's words that must be learned before the next level unlocks. */
export const UNLOCK_FRACTION = 0.8;

/**
 * Fraction of a level's items (words + sentences + texts) that must be learned for it to count as
 * "complete" when advancing the DISPLAYED level ({@link masteringLevel}). Below 1 on purpose: the
 * last few stragglers shouldn't pin the learner near the top of a level (the user got stuck at
 * 97%). The home bar consistency is preserved separately — Roadmap caps the shown percent below
 * 100 until the level actually advances, so the bar can't read "done" with items still left.
 * Distinct from {@link UNLOCK_FRACTION} (content gating, words only).
 */
export const LEVEL_COMPLETE_FRACTION = 0.93;

/** The four ways a single word is practised; level progress averages mastery across them. */
export const WORD_MODES: readonly ItemKind[] = [
  "recognition",
  "production",
  "say_word",
  "listen_word",
];

/** The three ways a single sentence is practised — the sentence analogue of {@link WORD_MODES}. */
export const SENTENCE_MODES: readonly ItemKind[] = [
  "sentences",
  "say_sentence",
  "listen_sentence",
];

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
 * How deeply a word is mastered, in [0, 1]: the fraction of the four word modes (recognition /
 * production / say_word / listen_word) in which it's at or above LEARNED_BOX. This is what
 * makes a level's progress bar grow as you practise DIFFERENT activities on the same words —
 * each mode is worth a quarter (recognition alone 1/4, adding writing 2/4, and so on).
 */
export function wordMastery(progress: ProgressMap, vocabId: string): number {
  const mastered = WORD_MODES.filter(
    (kind) => getProgress(progress, kind, vocabId).box >= LEARNED_BOX,
  ).length;
  return mastered / WORD_MODES.length;
}

/**
 * Continuous learn-progress for a word, in [0, 1]: how close its BEST word-mode is to "learned"
 * (`maxBox / LEARNED_BOX`, capped at 1). Rises with every correct answer in any mode and reaches
 * 1 exactly when the word is {@link wordLearned}. Drives the smooth home progress bar.
 */
export function wordLearnProgress(progress: ProgressMap, vocabId: string): number {
  const maxBox = Math.max(...WORD_MODES.map((kind) => getProgress(progress, kind, vocabId).box));
  return Math.min(1, maxBox / LEARNED_BOX);
}

/**
 * Whether a sentence is "learned" — mastered (>= LEARNED_BOX) in ANY of its three modes
 * (translation / spoken / dictation), mirroring {@link wordLearned}. A single mastered skill is
 * enough to keep the curriculum flowing, so practising a sentence in any mode counts toward level
 * completion; depth across the modes is measured separately by {@link sentenceMastery}.
 */
export function sentenceLearned(progress: ProgressMap, sentenceId: string): boolean {
  return SENTENCE_MODES.some((kind) => getProgress(progress, kind, sentenceId).box >= LEARNED_BOX);
}

/**
 * How deeply a sentence is mastered, in [0, 1]: the fraction of the three sentence modes
 * (translation / spoken / dictation) at or above LEARNED_BOX. The sentence analogue of
 * {@link wordMastery} — each mode is worth a third.
 */
export function sentenceMastery(progress: ProgressMap, sentenceId: string): number {
  const mastered = SENTENCE_MODES.filter(
    (kind) => getProgress(progress, kind, sentenceId).box >= LEARNED_BOX,
  ).length;
  return mastered / SENTENCE_MODES.length;
}

/**
 * Continuous learn-progress for a sentence, in [0, 1]: how close its BEST sentence-mode is to
 * "learned" (`maxBox / LEARNED_BOX`, capped at 1). The sentence analogue of
 * {@link wordLearnProgress}; drives the smooth combined level bar.
 */
export function sentenceLearnProgress(progress: ProgressMap, sentenceId: string): number {
  const maxBox = Math.max(
    ...SENTENCE_MODES.map((kind) => getProgress(progress, kind, sentenceId).box),
  );
  return Math.min(1, maxBox / LEARNED_BOX);
}

/**
 * Whether a text/dialog is "learned" — its comprehension-quiz `reading` track is at/above
 * LEARNED_BOX. The reading analogue of {@link wordLearned}/{@link sentenceLearned} (a single
 * track, so "learned" is the whole signal).
 */
export function readingLearned(progress: ProgressMap, textId: string): boolean {
  return getProgress(progress, "reading", textId).box >= LEARNED_BOX;
}

/** Reading mastery for a text, in {0, 1}: learned or not (single track — no partial depth). */
export function readingMastery(progress: ProgressMap, textId: string): number {
  return readingLearned(progress, textId) ? 1 : 0;
}

/**
 * Continuous reading learn-progress for a text, in [0, 1]: `box / LEARNED_BOX` capped at 1. The
 * reading analogue of {@link wordLearnProgress}; drives the smooth combined level bar.
 */
export function readingLearnProgress(progress: ProgressMap, textId: string): number {
  return Math.min(1, getProgress(progress, "reading", textId).box / LEARNED_BOX);
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

/**
 * Average {@link wordLearnProgress} over a level's words, in [0, 1] (1 for an empty level). The
 * home HUD bar shows this for the CURRENT {@link masteringLevel}: it grows smoothly toward 1 as
 * the level is learned. Note the bar tracks the level being completed, so at the instant a level
 * finishes it re-points to the NEXT level — which may already read above 0 (later-level words can
 * carry boxes from the per-mode boost / incidental draws). So the bar need not display 100% for
 * the just-finished level; the residual step is far smaller than the old frontier-display jump.
 */
export function levelLearnProgress(
  vocab: readonly VocabLike[],
  progress: ProgressMap,
  level: number,
): number {
  const inLevel = vocab.filter((v) => levelOf(v) === level);
  if (inLevel.length === 0) return 1;
  return inLevel.reduce((sum, v) => sum + wordLearnProgress(progress, v.id), 0) / inLevel.length;
}

/**
 * Per-level COMBINED completion: words + sentences + texts/dialogs, each item weighted equally.
 *
 * Unlike {@link levelStats} (words only, which drives unlocks and must NOT change), this folds in
 * the level's sentences and reading texts so the home header level and progress bar reflect ALL
 * the level's content. A level's `total` = its words + sentences + texts; `learned` = learned
 * words ({@link wordLearned}) + learned sentences ({@link sentenceLearned}) + completed texts;
 * `fraction` = mean per-item mastery (word→{@link wordMastery}, sentence→{@link sentenceMastery},
 * text→done 0/1). Empty groups simply contribute nothing (an empty level → fraction 1, as in
 * {@link levelStats}). Pass the result to {@link masteringLevel} for the combined "current level".
 */
export function levelCompletionStats(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly VocabLike[],
  progress: ProgressMap,
): LevelStat[] {
  const levels = listLevels([...vocab, ...sentences, ...texts]);
  return levels.map((level) => {
    const w = vocab.filter((v) => levelOf(v) === level);
    const s = sentences.filter((x) => levelOf(x) === level);
    const t = texts.filter((x) => levelOf(x) === level);
    const total = w.length + s.length + t.length;
    const learned =
      w.filter((v) => wordLearned(progress, v.id)).length +
      s.filter((x) => sentenceLearned(progress, x.id)).length +
      t.filter((x) => readingLearned(progress, x.id)).length;
    const masterySum =
      w.reduce((sum, v) => sum + wordMastery(progress, v.id), 0) +
      s.reduce((sum, x) => sum + sentenceMastery(progress, x.id), 0) +
      t.reduce((sum, x) => sum + readingMastery(progress, x.id), 0);
    return { level, total, learned, fraction: total === 0 ? 1 : masterySum / total };
  });
}

/** Per-group counts of a level's items not yet learned — what's left to reach the next level. */
export interface LevelRemaining {
  words: number;
  sentences: number;
  texts: number;
}

/**
 * How many of a level's items are still NOT learned, split by group (words / sentences / texts).
 * Uses the same per-item predicates that drive level completion ({@link wordLearned},
 * {@link sentenceLearned}, {@link readingLearned}), so the home "to next level" hint names exactly
 * what's between the learner and advancement. Pure; mirrors {@link levelCompletionStats}'s grouping.
 */
export function remainingForLevel(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly VocabLike[],
  progress: ProgressMap,
  level: number,
): LevelRemaining {
  return {
    words: vocab.filter((v) => levelOf(v) === level && !wordLearned(progress, v.id)).length,
    sentences: sentences.filter((s) => levelOf(s) === level && !sentenceLearned(progress, s.id))
      .length,
    texts: texts.filter((t) => levelOf(t) === level && !readingLearned(progress, t.id)).length,
  };
}

/**
 * Progress of one level toward triggering the NEXT level, in [0, 1] (1 for an empty/absent level).
 * It scales the level's learned-fraction so that reaching {@link LEVEL_COMPLETE_FRACTION} reads as a
 * full 100% — i.e. the home HUD bar fills to 100% exactly when {@link masteringLevel} rolls over.
 * Deliberately uses the SAME quantity that drives advancement (`learned / total`, not the gentler
 * per-item learn-progress), so the bar can't over-report the true distance to the next level.
 */
export function levelProgressToNext(stats: readonly LevelStat[], level: number): number {
  const s = stats.find((x) => x.level === level);
  if (!s || s.total === 0) return 1;
  return Math.min(1, s.learned / s.total / LEVEL_COMPLETE_FRACTION);
}

/**
 * The level the learner is currently completing: the LOWEST level not yet "complete enough" —
 * fewer than {@link LEVEL_COMPLETE_FRACTION} of its items learned — or the highest level once all
 * are done. Using a <100% threshold means a couple of stragglers no longer pin the displayed level
 * (the learner advances without grinding every last item in every mode). Unlike {@link activeLevel}
 * (the unlocked frontier), this advances only when a level is largely finished, avoiding the
 * mid-level jump the frontier display produced. NOTE: derived from `learned`, which can regress (a
 * miss demotes a box), so forgetting enough items can move this back a level.
 */
export function masteringLevel(stats: readonly LevelStat[]): number {
  const ordered = [...stats].sort((a, b) => a.level - b.level);
  const incomplete = ordered.find(
    (s) => s.total > 0 && s.learned / s.total < LEVEL_COMPLETE_FRACTION,
  );
  return incomplete ? incomplete.level : (ordered[ordered.length - 1]?.level ?? 1);
}

/**
 * The lowest level among `items` that still has an item below mastery (`box < masteredBox`) in a
 * given exercise `kind`, or `undefined` if every item is mastered in that kind. Drives the
 * per-mode selection boost: practising a mode pushes the EARLIEST level you're weak in there to
 * the front, so each skill is trained level-by-level (and earlier levels get finished first).
 *
 * Assumes `items` is already the in-play pool (callers pass `activeVocab` / `eligibleSentences`);
 * on a raw, ungated list it could target a still-locked level. Note this "lowest weak level in
 * THIS mode" can differ from the HUD's {@link masteringLevel} ("lowest not learned in ANY mode")
 * — intended, so an already-"learned" level still gets its weak modes finished.
 */
export function lowestUnmasteredLevel(
  items: readonly VocabLike[],
  progress: ProgressMap,
  kind: ItemKind,
  masteredBox: number = LEARNED_BOX,
): number | undefined {
  let lowest: number | undefined;
  for (const item of items) {
    if (getProgress(progress, kind, item.id).box < masteredBox) {
      const lv = levelOf(item);
      if (lowest === undefined || lv < lowest) lowest = lv;
    }
  }
  return lowest;
}

/**
 * How many pool items at a given `level` are NOT yet mastered (`box < masteredBox`) in `kind`.
 * Drives the home mode-card "finish-the-level" badge: a positive count flags a mode that still
 * holds current-level items to complete. Assumes `items` is the in-play pool (callers pass
 * `activeVocab` / `eligibleSentences`).
 */
export function unmasteredInLevel(
  items: readonly VocabLike[],
  progress: ProgressMap,
  kind: ItemKind,
  level: number,
  masteredBox: number = LEARNED_BOX,
): number {
  let count = 0;
  for (const item of items) {
    if (levelOf(item) === level && getProgress(progress, kind, item.id).box < masteredBox) {
      count += 1;
    }
  }
  return count;
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
