/**
 * levels.ts — pure curriculum model: levels, mastery, unlocks, and exercise gating.
 *
 * The dictionary and sentence bank are split into 1-based levels. A learner starts with
 * only level 1 in play; mastering enough of a level unlocks the next, so new words and
 * longer sentences appear gradually. Pools:
 *   - vocab pool   = words in any UNLOCKED level,
 *   - sentence pool = sentences in any UNLOCKED level (word progress no longer gates them —
 *     the whole level's sentences are drillable as soon as the level is open).
 *
 * Everything here is a pure function of the content lists + a `ProgressMap` (plus an opt-in
 * `testMode` that bypasses all gating). No UI/DB imports — trivially unit-testable.
 */

import { getProgress, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";
import { GATE_TARGET, type BalanceGroup } from "./balance";
import { topicMastered, topicMasteryPct } from "./grammar";

/** A word is "learned" once its Leitner box reaches this (≈ 2 clean first-attempt answers). */
export const LEARNED_BOX = 2;
/** Fraction of a level's words that must be learned before the next level unlocks. */
export const UNLOCK_FRACTION = 0.8;

/**
 * Fraction of a level's items (words + sentences + texts) that must be learned for it to count as
 * "complete" when advancing the DISPLAYED level ({@link masteringLevelGated}). Below 1 on purpose: the
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
 * Whether a text/dialog is "learned" — its comprehension-quiz `reading` track is at/above
 * LEARNED_BOX. The reading analogue of {@link wordLearned}/{@link sentenceLearned} (a single
 * track, so "learned" is the whole signal).
 */
export function readingLearned(progress: ProgressMap, textId: string): boolean {
  return getProgress(progress, "reading", textId).box >= LEARNED_BOX;
}

/**
 * Whether a text's by-memory recitation is complete — the aggregate `recite` record (written
 * once EVERY role has been recited) is at/above LEARNED_BOX. The per-role records live under
 * `recite:${textId}::${role}` (see {@link reciteRoleId}); this reads only the role-agnostic
 * aggregate so the level math needs no knowledge of a text's roles.
 */
export function reciteComplete(progress: ProgressMap, textId: string): boolean {
  return getProgress(progress, "recite", textId).box >= LEARNED_BOX;
}

/**
 * Whether a text/dialog is MASTERED («Прочитано») — the two-part rule: its comprehension quiz is
 * passed ({@link readingLearned}) AND it has been recited наизусть in every role
 * ({@link reciteComplete}). A text with no comprehension questions has its quiz part vacuously
 * satisfied, so recitation alone masters it. THIS is what counts toward level completion.
 */
export function readingMastered(
  progress: ProgressMap,
  textId: string,
  hasQuestions: boolean,
): boolean {
  const quizDone = hasQuestions ? readingLearned(progress, textId) : true;
  return quizDone && reciteComplete(progress, textId);
}

/** Reading mastery for a text, in {0, 1}: fully mastered (quiz + recite) or not. */
export function readingMastery(progress: ProgressMap, textId: string, hasQuestions: boolean): number {
  return readingMastered(progress, textId, hasQuestions) ? 1 : 0;
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
/**
 * Minimal reading-item shape for the level math: a text/dialog tag plus its comprehension
 * questions (only the count is read, to know whether the quiz part of mastery applies). Real
 * {@link ReadingText} satisfies it.
 */
export interface ReadingLike extends VocabLike {
  type?: "text" | "dialog";
  questions?: readonly unknown[];
}

/** Whether a reading item carries a comprehension quiz (so the quiz part of mastery applies). */
export function hasComprehensionQuiz(text: ReadingLike): boolean {
  return (text.questions?.length ?? 0) > 0;
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
 * Per-level COMBINED completion: words + sentences + texts/dialogs + grammar topics, each item
 * weighted equally.
 *
 * Unlike {@link levelStats} (words only, which drives unlocks and must NOT change), this folds in
 * the level's sentences, reading texts and grammar topics so the home level and progress reflect
 * ALL the level's content. A level's `total` = its words + sentences + texts + grammar topics;
 * `learned` = learned words ({@link wordLearned}) + learned sentences ({@link sentenceLearned}) +
 * completed texts + mastered topics ({@link topicMastered}); `fraction` = mean per-item mastery
 * (word→{@link wordMastery}, sentence→{@link sentenceMastery}, text→done 0/1,
 * topic→{@link topicMasteryPct}). Empty groups simply contribute nothing (an empty level →
 * fraction 1, as in {@link levelStats}). Pass the result to {@link masteringLevelGated} for the
 * combined current level. `grammar` defaults to [] so languages without grammar lessons are
 * unaffected.
 */
export function levelCompletionStats(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly ReadingLike[],
  progress: ProgressMap,
  grammar: readonly VocabLike[] = [],
): LevelStat[] {
  const levels = listLevels([...vocab, ...sentences, ...texts, ...grammar]);
  return levels.map((level) => {
    const w = vocab.filter((v) => levelOf(v) === level);
    const s = sentences.filter((x) => levelOf(x) === level);
    const t = texts.filter((x) => levelOf(x) === level);
    const g = grammar.filter((x) => levelOf(x) === level);
    const total = w.length + s.length + t.length + g.length;
    const learned =
      w.filter((v) => wordLearned(progress, v.id)).length +
      s.filter((x) => sentenceLearned(progress, x.id)).length +
      t.filter((x) => readingMastered(progress, x.id, hasComprehensionQuiz(x))).length +
      g.filter((x) => topicMastered(progress, x.id)).length;
    const masterySum =
      w.reduce((sum, v) => sum + wordMastery(progress, v.id), 0) +
      s.reduce((sum, x) => sum + sentenceMastery(progress, x.id), 0) +
      t.reduce((sum, x) => sum + readingMastery(progress, x.id, hasComprehensionQuiz(x)), 0) +
      g.reduce((sum, x) => sum + topicMasteryPct(progress, x.id), 0);
    return { level, total, learned, fraction: total === 0 ? 1 : masterySum / total };
  });
}

/** Per-group counts of a level's items not yet learned — what's left to reach the next level. */
export interface LevelRemaining {
  words: number;
  sentences: number;
  texts: number;
  grammar: number;
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
  texts: readonly ReadingLike[],
  progress: ProgressMap,
  level: number,
  grammar: readonly VocabLike[] = [],
): LevelRemaining {
  return {
    words: vocab.filter((v) => levelOf(v) === level && !wordLearned(progress, v.id)).length,
    sentences: sentences.filter((s) => levelOf(s) === level && !sentenceLearned(progress, s.id))
      .length,
    texts: texts.filter(
      (t) => levelOf(t) === level && !readingMastered(progress, t.id, hasComprehensionQuiz(t)),
    ).length,
    grammar: grammar.filter((g) => levelOf(g) === level && !topicMastered(progress, g.id)).length,
  };
}

/**
 * Progress of one level toward triggering the NEXT level, in [0, 1] (1 for an empty/absent level).
 * It scales the level's learned-fraction so that reaching {@link LEVEL_COMPLETE_FRACTION} reads as a
 * full 100% — i.e. the displayed level advances exactly when {@link masteringLevelGated} rolls over.
 * Deliberately uses the SAME quantity that drives advancement (`learned / total`, not the gentler
 * per-item learn-progress), so the bar can't over-report the true distance to the next level.
 */
export function levelProgressToNext(stats: readonly LevelStat[], level: number): number {
  const s = stats.find((x) => x.level === level);
  if (!s || s.total === 0) return 1;
  return Math.min(1, s.learned / s.total / LEVEL_COMPLETE_FRACTION);
}

/** A reading-style content item with a text/dialog tag (real ReadingText satisfies it). */
export type TypedItem = ReadingLike;

/**
 * Per-mode, CURRENT-LEVEL mastery — the nine home-ring spokes for one level. For each mode,
 * `total` = the level's items that mode drills and `mastered` = those at/above {@link LEARNED_BOX}
 * (≈2 clean answers) in that mode's track. Reading is split into текст/диалог (both on the single
 * `reading` track) to mirror the two home cards. A group with no items at the level yields
 * `total: 0` (→ the ring/gate treat it as "nothing to do here", not as a drag). The shape matches
 * core/balance.ts's `ModeInput` minus the UI label/icon, which the Roadmap attaches.
 */
export interface LevelModeStat {
  id: string;
  group: BalanceGroup;
  mastered: number;
  total: number;
}

const masteredIn = (
  items: readonly { id: string }[],
  progress: ProgressMap,
  kind: ItemKind,
): number => items.filter((i) => getProgress(progress, kind, i.id).box >= LEARNED_BOX).length;

export function levelModeStats(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly TypedItem[],
  progress: ProgressMap,
  level: number,
  grammar: readonly VocabLike[] = [],
): LevelModeStat[] {
  const w = vocab.filter((v) => levelOf(v) === level);
  const s = sentences.filter((x) => levelOf(x) === level);
  const t = texts.filter((x) => levelOf(x) === level && x.type !== "dialog");
  const d = texts.filter((x) => levelOf(x) === level && x.type === "dialog");
  const g = grammar.filter((x) => levelOf(x) === level);
  // Reading spokes use the full two-part mastery (quiz + recite all roles), not the quiz track
  // alone, so the ring/gate only credit a text once it's truly «Прочитано».
  const masteredReading = (items: readonly ReadingLike[]): number =>
    items.filter((i) => readingMastered(progress, i.id, hasComprehensionQuiz(i))).length;
  const stats: LevelModeStat[] = [
    { id: "recognition", group: "words", mastered: masteredIn(w, progress, "recognition"), total: w.length },
    { id: "production", group: "words", mastered: masteredIn(w, progress, "production"), total: w.length },
    { id: "say_word", group: "words", mastered: masteredIn(w, progress, "say_word"), total: w.length },
    { id: "listen_word", group: "words", mastered: masteredIn(w, progress, "listen_word"), total: w.length },
    { id: "sentences", group: "sent", mastered: masteredIn(s, progress, "sentences"), total: s.length },
    { id: "say_sentence", group: "sent", mastered: masteredIn(s, progress, "say_sentence"), total: s.length },
    { id: "listen_sentence", group: "sent", mastered: masteredIn(s, progress, "listen_sentence"), total: s.length },
    { id: "read:text", group: "read", mastered: masteredReading(t), total: t.length },
    { id: "read:dialog", group: "read", mastered: masteredReading(d), total: d.length },
  ];
  // The grammar spoke joins the ring + gate only when the language HAS grammar lessons — for a
  // pack without them no row appears at all (vs. an always-green empty spoke on the ring).
  if (grammar.length > 0) {
    stats.push({
      id: "grammar",
      group: "gram",
      mastered: g.filter((x) => topicMastered(progress, x.id)).length,
      total: g.length,
    });
  }
  return stats;
}

/**
 * The level "ceiling": the weakest mode's current-level mastery, in [0, 1] (1 when the level has
 * nothing left to drill in any mode). This is exactly `computeBalance(...).gate`, recomputed here
 * without the UI layer so {@link masteringLevelGated} can gate advancement on it.
 */
export function levelGate(stats: readonly LevelModeStat[]): number {
  let min = 1;
  let any = false;
  for (const m of stats) {
    if (m.total === 0) continue;
    any = true;
    min = Math.min(min, m.mastered / m.total);
  }
  return any ? min : 1;
}

/**
 * Finds the current level like a simple learned-fraction scan, but a level only counts as complete when it is ALSO balanced — its
 * weakest mode's mastery has reached {@link GATE_TARGET} (the "balance to progress" rule). The
 * content-UNLOCK gate is untouched ({@link unlockedLevels}/{@link levelStats} still drive what's in
 * play), so nothing relocks: this only ever DELAYS the displayed current level past a level that's
 * learned-enough but lopsided, until its laggard modes catch up. Returns the lowest such level, or
 * the highest level once every level is both learned-enough and balanced.
 */
export function masteringLevelGated(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly TypedItem[],
  progress: ProgressMap,
  grammar: readonly VocabLike[] = [],
): number {
  const ordered = [...levelCompletionStats(vocab, sentences, texts, progress, grammar)].sort(
    (a, b) => a.level - b.level,
  );
  const blocked = ordered.find((s) => {
    if (s.total === 0) return false;
    if (s.learned / s.total < LEVEL_COMPLETE_FRACTION) return true; // not learned enough yet
    return (
      levelGate(levelModeStats(vocab, sentences, texts, progress, s.level, grammar)) < GATE_TARGET
    );
  });
  return blocked ? blocked.level : (ordered[ordered.length - 1]?.level ?? 1);
}

/**
 * Unified "% toward completing (advancing past) a level", in [0, 1] — the SINGLE progress number
 * every surface should show (home CEFR meter + Levels screen + Metrics rail), so they can never
 * disagree. It reads 100% EXACTLY when {@link masteringLevelGated} would stop blocking the level,
 * being the lesser of the two conditions that drive advancement:
 *   • learned breadth: (learned / total) / {@link LEVEL_COMPLETE_FRACTION}, and
 *   • balance depth:   the MEAN over non-empty modes of each mode's mastery toward {@link GATE_TARGET}
 *     (each capped at 1).
 * The balance term is a SMOOTH MEAN, deliberately NOT {@link levelGate} (the min). The gate/min is
 * the right rule for ADVANCEMENT (a single lagging mode must catch up), but as a progress BAR it
 * reads 0 the moment any one mode is untouched — so marking words «Уже знаю» wouldn't move the bar
 * while sentences/reading still sit at 0. The mean rises as ANY mode improves, yet still equals 1
 * only when EVERY mode has reached the target (so the bar hits 100% exactly when the level advances).
 * Taking the min with the learned term keeps it from ever claiming more than the weaker dimension.
 * 1 for an empty level.
 */
export function levelCompletionProgress(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly TypedItem[],
  progress: ProgressMap,
  level: number,
  grammar: readonly VocabLike[] = [],
): number {
  const stat = levelCompletionStats(vocab, sentences, texts, progress, grammar).find(
    (s) => s.level === level,
  );
  if (!stat || stat.total === 0) return 1;
  const learnedPct = stat.learned / stat.total / LEVEL_COMPLETE_FRACTION;
  let sum = 0;
  let n = 0;
  for (const m of levelModeStats(vocab, sentences, texts, progress, level, grammar)) {
    if (m.total === 0) continue; // a mode with nothing to drill at this level isn't a gap
    sum += Math.min(1, m.mastered / m.total / GATE_TARGET);
    n += 1;
  }
  const balancePct = n === 0 ? 1 : sum / n;
  return Math.min(1, learnedPct, balancePct);
}

/**
 * Heal the "hidden ⇒ mastered" invariant. «Уже знаю» both HIDES an item (a device-local view flag)
 * and writes its mastery to progress; but the two can drift apart — most easily when the mastery
 * write is lost to a failed sync that a later server load overwrites, leaving the item hidden yet
 * unmastered. That desyncs every screen: the ring and lessons EXCLUDE hidden items (so the level
 * looks "done"), while level completion + the gate COUNT them (so the level sits below 100% and
 * can't advance). This returns the progress records needed to make every hidden item read as
 * mastered (box ≥ {@link LEARNED_BOX} in each of its group's modes), skipping ones already there —
 * so a reload self-heals and stays idempotent. `isHidden` keeps this core fn free of the UI's
 * hidden-key format. Pure; empty result when nothing needs healing.
 */
export function hiddenMasteryWrites(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  isHidden: (group: "word" | "sentence", id: string) => boolean,
  progress: ProgressMap,
  now: number,
): ItemProgress[] {
  const writes: ItemProgress[] = [];
  const ensure = (modes: readonly ItemKind[], id: string) => {
    for (const kind of modes) {
      const prev = getProgress(progress, kind, id);
      if (prev.box >= LEARNED_BOX) continue; // already mastered in this mode — nothing to write
      writes.push({
        ...prev,
        kind,
        itemId: id,
        box: LEARNED_BOX,
        correctStreak: Math.max(prev.correctStreak, LEARNED_BOX),
        totalCorrect: Math.max(prev.totalCorrect, LEARNED_BOX),
        totalSeen: Math.max(prev.totalSeen, prev.totalCorrect, LEARNED_BOX),
        lastSeen: prev.lastSeen || now,
      });
    }
  };
  for (const v of vocab) if (isHidden("word", v.id)) ensure(WORD_MODES, v.id);
  for (const s of sentences) if (isHidden("sentence", s.id)) ensure(SENTENCE_MODES, s.id);
  return writes;
}

/**
 * The lowest level among `items` that still has an item below mastery (`box < masteredBox`) in a
 * given exercise `kind`, or `undefined` if every item is mastered in that kind. Drives the
 * per-mode selection boost: practising a mode pushes the EARLIEST level you're weak in there to
 * the front, so each skill is trained level-by-level (and earlier levels get finished first).
 *
 * Assumes `items` is already the in-play pool (callers pass `activeVocab` / `eligibleSentences`);
 * on a raw, ungated list it could target a still-locked level. Note this "lowest weak level in
 * THIS mode" can differ from the displayed {@link masteringLevelGated} ("lowest not learned in ANY mode")
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
 * Sentences the learner may build now: every sentence whose LEVEL is unlocked. Word progress no
 * longer gates this — the whole level's sentences are available as soon as the level opens (the old
 * "every used word must be practised first" rule was removed). Test mode returns them all.
 */
export function eligibleSentences<S extends SentenceLike>(
  sentences: readonly S[],
  vocab: readonly VocabLike[],
  progress: ProgressMap,
  testMode = false,
): S[] {
  if (testMode) return [...sentences];
  const unlocked = unlockedLevels(levelStats(vocab, progress));
  return sentences.filter((s) => unlocked.has(levelOf(s)));
}

/* ------------------------------------------------------------------ «Уровни» screen helpers
 * Pure, progress-derived models that back the Levels list/detail and the Metrics hero rail.
 * They reuse the same predicates as the rest of this module so the screens never diverge from
 * what actually gates advancement. */

/** Where a level sits relative to the learner's current (gated) level. */
export type LevelStatus = "done" | "current" | "locked";

/** Per-level rollup for the Levels list and the Metrics hero rail. */
export interface LevelSummary {
  level: number;
  status: LevelStatus;
  /** Item counts in the level, by group. */
  counts: { words: number; sentences: number; texts: number; grammar: number };
  /** Combined completion fraction in [0, 1] (mean per-item mastery, as in {@link levelCompletionStats}). */
  fraction: number;
  /**
   * Unified "% toward completing this level" in [0, 1] — {@link levelCompletionProgress}, the SAME
   * number the home CEFR meter shows, so the Levels card and the home header never disagree. Reads
   * 100% exactly when the level advances. (Distinct from `fraction`, which is mean per-mode mastery.)
   */
  completion: number;
  /** Items in the level not yet learned (`total − learned`) — what marking it passed would skip. */
  remaining: number;
}

/**
 * One {@link LevelSummary} per level present in the content, in ascending order. `status` is derived
 * from {@link masteringLevelGated} (below it = done, equal = current, above = locked); `fraction`,
 * `completion` and `remaining` come from the combined {@link levelCompletionStats}/
 * {@link levelCompletionProgress}. Pure — drives the Levels timeline and the hero rail without either
 * re-deriving level state.
 */
export function levelSummaries(
  vocab: readonly VocabLike[],
  sentences: readonly SentenceLike[],
  texts: readonly TypedItem[],
  progress: ProgressMap,
  grammar: readonly VocabLike[] = [],
): LevelSummary[] {
  const current = masteringLevelGated(vocab, sentences, texts, progress, grammar);
  const stats = levelCompletionStats(vocab, sentences, texts, progress, grammar);
  const byLevel = new Map(stats.map((s) => [s.level, s]));
  return listLevels([...vocab, ...sentences, ...texts, ...grammar]).map((level) => {
    const stat = byLevel.get(level);
    return {
      level,
      status: level < current ? "done" : level === current ? "current" : "locked",
      counts: {
        words: vocab.filter((v) => levelOf(v) === level).length,
        sentences: sentences.filter((s) => levelOf(s) === level).length,
        texts: texts.filter((t) => levelOf(t) === level).length,
        grammar: grammar.filter((g) => levelOf(g) === level).length,
      },
      fraction: stat?.fraction ?? 1,
      completion: levelCompletionProgress(vocab, sentences, texts, progress, level, grammar),
      remaining: stat ? Math.max(0, stat.total - stat.learned) : 0,
    };
  });
}

