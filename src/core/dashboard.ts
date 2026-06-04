/**
 * dashboard.ts — pure derivation for the metrics dashboard.
 *
 * Folds the raw ProgressMap + daily state + content lists into the numbers the dashboard
 * renders: headline KPIs, per-level progress, per-mode balance & accuracy, the Leitner-box
 * mastery distribution, vocabulary coverage by part of speech, and a recency breakdown.
 *
 * Everything is a SNAPSHOT of current state — the app persists only the latest per-item record
 * (no per-day history), so there is no time-series here; these are distributions and totals.
 * PURE: no UI/DB imports, trivially unit-testable.
 */

import { getProgress, MAX_BOX, type ItemKind, type ProgressMap } from "./progress";
import {
  LEARNED_BOX,
  WORD_MODES,
  activeLevel,
  eligibleSentences,
  levelOf,
  levelStats,
  listLevels,
  overallProgress,
  unlockedLevelsWith,
  wordLearned,
  type SentenceLike,
  type VocabLike,
} from "./levels";
import {
  DAILY_LESSONS_GOAL,
  currentStreak,
  goalMet,
  todayAccuracy,
  todayLessons,
  type UserState,
} from "./daily";

export const SENTENCE_MODES: readonly ItemKind[] = ["sentences", "say_sentence", "listen_sentence"];
export const ALL_MODES: readonly ItemKind[] = [...WORD_MODES, ...SENTENCE_MODES];

/** Russian labels for each lesson mode, for chart axes. */
export const MODE_LABEL: Record<ItemKind, string> = {
  recognition: "Узнавание",
  production: "Написание",
  say_word: "Речь · слова",
  listen_word: "Аудио · слова",
  sentences: "Перевод",
  say_sentence: "Речь · фразы",
  listen_sentence: "Аудио · фразы",
};

/** Russian labels for parts of speech (dictionary `pos`). */
export const POS_LABEL: Record<string, string> = {
  pronoun: "Местоимения",
  verb: "Глаголы",
  noun: "Существительные",
  adj: "Прилагательные",
  conj: "Союзы",
  adv: "Наречия",
  neg_verb: "Отрицание",
  num: "Числа",
  interj: "Междометия",
};

/** Minimal vocab shape the dashboard needs (real VocabItem satisfies it). */
export interface DashVocab extends VocabLike {
  pos: string;
}

export interface Kpis {
  wordsLearned: number;
  wordsTotal: number;
  wordsFraction: number;
  sentencesLearned: number;
  sentencesTotal: number;
  sentencesEligible: number;
  level: number;
  levelsTotal: number;
  streak: number;
  bestStreak: number;
  /** Lifetime accuracy across all tracks, in [0, 1] (totalCorrect / totalSeen). */
  accuracy: number;
  /** Lifetime answers given across all tracks. */
  totalReps: number;
  totalCorrect: number;
  /** Items mastered in EVERY applicable track (words across 4 modes, sentences across 3). */
  fullyMastered: number;
}

export interface LevelBar {
  level: number;
  learned: number;
  total: number;
  fraction: number;
  unlocked: boolean;
  sentencesTotal: number;
}

export interface ModeStat {
  mode: ItemKind;
  label: string;
  group: "word" | "sentence";
  mastered: number;
  total: number;
  fraction: number;
  accuracy: number;
  reps: number;
}

/** One column of the Leitner-box mastery distribution (over SEEN tracks only). */
export interface BoxBucket {
  box: number;
  words: number;
  sentences: number;
}

export interface PosStat {
  pos: string;
  label: string;
  learned: number;
  total: number;
}

export interface RecencyBucket {
  key: "today" | "week" | "month" | "older";
  label: string;
  count: number;
}

export interface TodayStat {
  lessons: number;
  goal: number;
  accuracy: number;
  answered: number;
  correct: number;
  goalMet: boolean;
}

export interface DashboardData {
  kpis: Kpis;
  levels: LevelBar[];
  modes: ModeStat[];
  boxes: BoxBucket[];
  pos: PosStat[];
  recency: RecencyBucket[];
  today: TodayStat;
}

const DAY_MS = 86_400_000;

/** Whether an item is mastered (>= LEARNED_BOX) in EVERY mode of the group. */
function masteredInAll(progress: ProgressMap, id: string, modes: readonly ItemKind[]): boolean {
  return modes.every((m) => getProgress(progress, m, id).box >= LEARNED_BOX);
}

/** A sentence counts as "learned" once its typed-translation track reaches LEARNED_BOX. */
function sentenceLearned(progress: ProgressMap, id: string): boolean {
  return getProgress(progress, "sentences", id).box >= LEARNED_BOX;
}

/** Per-mode mastered count + accuracy over a pool. */
function modeStat(
  mode: ItemKind,
  group: "word" | "sentence",
  pool: readonly { id: string }[],
  progress: ProgressMap,
): ModeStat {
  let mastered = 0;
  let correct = 0;
  let seen = 0;
  for (const item of pool) {
    const p = getProgress(progress, mode, item.id);
    if (p.box >= LEARNED_BOX) mastered += 1;
    correct += p.totalCorrect;
    seen += p.totalSeen;
  }
  const total = pool.length;
  return {
    mode,
    label: MODE_LABEL[mode],
    group,
    mastered,
    total,
    fraction: total === 0 ? 0 : mastered / total,
    accuracy: seen === 0 ? 0 : correct / seen,
    reps: seen,
  };
}

/**
 * Compute the full dashboard snapshot. `now` is injectable for deterministic recency/today
 * in tests. `testMode` opens every level (mirrors the rest of the app's bypass).
 */
export function computeDashboard(
  vocab: readonly DashVocab[],
  sentences: readonly SentenceLike[],
  progress: ProgressMap,
  daily: UserState,
  today: string,
  now: number = Date.now(),
  testMode = false,
): DashboardData {
  const stats = levelStats(vocab, progress);
  const unlocked = unlockedLevelsWith(stats, testMode);
  const words = overallProgress(vocab, progress);
  const eligible = eligibleSentences(sentences, vocab, progress, testMode);

  // Per-level bars (words drive the fraction; sentence counts shown alongside).
  const sentencesByLevel = new Map<number, number>();
  for (const s of sentences) sentencesByLevel.set(levelOf(s), (sentencesByLevel.get(levelOf(s)) ?? 0) + 1);
  const levels: LevelBar[] = stats.map((s) => ({
    level: s.level,
    learned: s.learned,
    total: s.total,
    fraction: s.fraction,
    unlocked: unlocked.has(s.level),
    sentencesTotal: sentencesByLevel.get(s.level) ?? 0,
  }));

  // Per-mode balance + accuracy.
  const modes: ModeStat[] = [
    ...WORD_MODES.map((m) => modeStat(m, "word", vocab, progress)),
    ...SENTENCE_MODES.map((m) => modeStat(m, "sentence", sentences, progress)),
  ];

  // Leitner-box distribution over SEEN tracks only (so box 0 isn't swamped by untouched items).
  const boxes: BoxBucket[] = Array.from({ length: MAX_BOX + 1 }, (_, box) => ({
    box,
    words: 0,
    sentences: 0,
  }));
  // Recency over the same seen tracks.
  const recencyCounts = { today: 0, week: 0, month: 0, older: 0 };
  const tally = (modesList: readonly ItemKind[], pool: readonly { id: string }[], group: "word" | "sentence") => {
    for (const mode of modesList) {
      for (const item of pool) {
        const p = getProgress(progress, mode, item.id);
        if (p.totalSeen < 1) continue;
        const bucket = boxes[Math.max(0, Math.min(MAX_BOX, p.box))]!;
        if (group === "word") bucket.words += 1;
        else bucket.sentences += 1;
        if (p.lastSeen > 0) {
          const days = (now - p.lastSeen) / DAY_MS;
          if (days < 1) recencyCounts.today += 1;
          else if (days < 7) recencyCounts.week += 1;
          else if (days < 30) recencyCounts.month += 1;
          else recencyCounts.older += 1;
        }
      }
    }
  };
  tally(WORD_MODES, vocab, "word");
  tally(SENTENCE_MODES, sentences, "sentence");

  const recency: RecencyBucket[] = [
    { key: "today", label: "Сегодня", count: recencyCounts.today },
    { key: "week", label: "На этой неделе", count: recencyCounts.week },
    { key: "month", label: "В этом месяце", count: recencyCounts.month },
    { key: "older", label: "Давно", count: recencyCounts.older },
  ];

  // Vocabulary coverage by part of speech.
  const posMap = new Map<string, { learned: number; total: number }>();
  for (const v of vocab) {
    const entry = posMap.get(v.pos) ?? { learned: 0, total: 0 };
    entry.total += 1;
    if (wordLearned(progress, v.id)) entry.learned += 1;
    posMap.set(v.pos, entry);
  }
  const pos: PosStat[] = [...posMap.entries()]
    .map(([p, e]) => ({ pos: p, label: POS_LABEL[p] ?? p, learned: e.learned, total: e.total }))
    .sort((a, b) => b.total - a.total);

  // Lifetime accuracy / reps over every persisted track.
  let totalCorrect = 0;
  let totalReps = 0;
  for (const p of progress.values()) {
    totalCorrect += p.totalCorrect;
    totalReps += p.totalSeen;
  }

  const fullyMastered =
    vocab.filter((v) => masteredInAll(progress, v.id, WORD_MODES)).length +
    sentences.filter((s) => masteredInAll(progress, s.id, SENTENCE_MODES)).length;

  const kpis: Kpis = {
    wordsLearned: words.learned,
    wordsTotal: words.total,
    wordsFraction: words.fraction,
    sentencesLearned: sentences.filter((s) => sentenceLearned(progress, s.id)).length,
    sentencesTotal: sentences.length,
    sentencesEligible: eligible.length,
    level: activeLevel(stats, unlocked),
    levelsTotal: listLevels(vocab).length,
    streak: currentStreak(daily, today),
    bestStreak: daily.bestStreak,
    accuracy: totalReps === 0 ? 0 : totalCorrect / totalReps,
    totalReps,
    totalCorrect,
    fullyMastered,
  };

  const todayStat: TodayStat = {
    lessons: todayLessons(daily, today),
    goal: DAILY_LESSONS_GOAL,
    accuracy: todayAccuracy(daily, today),
    answered: daily.todayDate === today ? daily.answered : 0,
    correct: daily.todayDate === today ? daily.correct : 0,
    goalMet: goalMet(daily, today),
  };

  return { kpis, levels, modes, boxes, pos, recency, today: todayStat };
}
