/**
 * Roadmap.tsx — the home screen: overall progress, the level ladder (locked/active/done),
 * and the exercise picker. Pure presentation over `levels.ts` computations; all gating
 * logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeVocab,
  eligibleSentences,
  levelCompletionStats,
  levelOf,
  levelProgressToNext,
  masteringLevel,
  overallProgress,
  readingLearned,
  remainingForLevel,
  sentenceLearned,
  wordLearned,
  LEARNED_BOX,
  type SentenceLike,
  type VocabLike,
} from "../core/levels";
import { groupReadiness, type ModeReadiness } from "../core/stats";
import type { ProgressMap } from "../core/progress";
import {
  currentStreak,
  dateKey,
  goalMet,
  todayAccuracy,
  todayLessons,
  DAILY_LESSONS_GOAL,
  type UserState,
} from "../core/daily";
import { hiddenKey } from "./hidden";
import ThemeToggle from "./ThemeToggle";

export type Mode =
  | "recognition"
  | "production"
  | "sentences"
  | "say_word"
  | "say_sentence"
  | "listen_word"
  | "listen_sentence";

/** Reading library entry the home grid needs (real ReadingText satisfies it). */
export interface ReadingLike extends VocabLike {
  type?: "text" | "dialog";
}

interface RoadmapProps {
  vocab: readonly VocabLike[];
  sentences: readonly SentenceLike[];
  /** Reading texts/dialogs (levelled) — folded into level completion AND the Чтение home cards. */
  texts: readonly ReadingLike[];
  progress: ProgressMap;
  daily: UserState;
  /** Items hidden from lessons — excluded from the per-mode readiness pools. */
  hidden: ReadonlySet<string>;
  testMode: boolean;
  ready: boolean;
  onStart: (mode: Mode) => void;
  /** Open the reading library, filtered to texts or dialogs. */
  onOpenReading: (type: "text" | "dialog") => void;
  /** Open the read-only progress-details screen (also reachable from the bottom nav). */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

/** One exercise button: icon + short label, a top-left count of current-level items practising
 *  this card could still add to the level bar, and a continuous readiness bar (which replaced the
 *  old traffic-light dot). */
function ModeButton({
  icon,
  label,
  name,
  r,
  levelLeft,
  onClick,
}: {
  icon: string;
  label: string;
  /** Full accessible name (the short visible `label` repeats across groups). */
  name: string;
  r: ModeReadiness;
  /** Current-level items in this group not yet learned — how many this card can still add to the
   *  level progress bar (0 ⇒ this group no longer moves the bar). */
  levelLeft: number;
  onClick: () => void;
}) {
  const freshness =
    r.level === "green"
      ? "в форме"
      : r.level === "yellow"
        ? "пора повторить"
        : r.level === "red"
          ? "заброшено"
          : "пока нечего учить";
  const leftHint = levelLeft > 0 ? ` · ещё ${levelLeft} для прогресса уровня` : "";
  const status =
    (r.level === "none" ? "пока нечего учить" : `освоено ${r.mastered} из ${r.total} · ${freshness}`) +
    leftHint;
  return (
    <button type="button" className="modebtn" aria-label={`${name}: ${status}`} onClick={onClick}>
      {/* Top-left: how many current-level items this card can still add to the level progress bar. */}
      {levelLeft > 0 && (
        <span
          className="modebtn__count"
          aria-hidden="true"
          title={`Ещё ${levelLeft} для прогресса текущего уровня`}
        >
          {levelLeft}
        </span>
      )}
      <span className="modebtn__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="modebtn__label">{label}</span>
      {/* Continuous recency standing vs the freshest mode, so a little practice visibly moves it. */}
      <span className="modebtn__bar" aria-hidden="true" title={status}>
        <span
          className={`modebtn__fill modebtn__fill--${r.level}`}
          style={{ width: `${Math.round(r.ratio * 100)}%` }}
        />
      </span>
    </button>
  );
}

export default function Roadmap({
  vocab,
  sentences,
  texts,
  progress,
  daily,
  hidden,
  testMode,
  ready,
  onStart,
  onOpenReading,
  onShowStats,
  onTestFill,
}: RoadmapProps) {
  // "Current level" is the level being completed (lowest not fully done), shown with a smooth
  // learn-progress bar — not the unlocked frontier, which jumped the bar to ~0% on every unlock.
  // Completion now spans words + sentences + dialogs/texts, so finishing a level's phrases and
  // dialogs fills the bar and advances the level. (Unlocks stay word-driven, so nothing relocks.)
  const { active, overall, levelPct } = useMemo(() => {
    const s = levelCompletionStats(vocab, sentences, texts, progress);
    const a = masteringLevel(s);
    const rem = remainingForLevel(vocab, sentences, texts, progress, a);
    const itemsLeft = rem.words + rem.sentences + rem.texts;
    // Bar = progress toward completing the level (= learned fraction, since completion needs 100%).
    // Cap below 100 while anything remains so the bar can't round up to "done" with items left —
    // 100% is shown only when nothing's left, keeping the bar and the level consistent. (What's
    // left per mode is shown as a corner count on each card, not as a header line.)
    const pct = Math.round(levelProgressToNext(s, a) * 100);
    return {
      active: a,
      overall: overallProgress(vocab, progress),
      levelPct: itemsLeft === 0 ? 100 : Math.min(99, pct),
    };
  }, [vocab, sentences, texts, progress]);

  // Per-mode readiness, RELATIVE within each group (words / sentences) so the bar flags which
  // mode is lagging behind the others — nudging the learner to keep them balanced. Also `affects`:
  // how many CURRENT-level items in each group are not yet LEARNED — i.e. how many items practising
  // this card could still push into the level's progress bar. An item learned in ANY mode no longer
  // moves the bar, so this is per-GROUP (same for every word card, every sentence card), matching
  // the bar's learned/total maths exactly.
  const { readiness, affects } = useMemo(() => {
    const wordPool = activeVocab(vocab, progress, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sentPool = eligibleSentences(sentences, vocab, progress, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    // Reading is gated only by level, not hidden/eligibility; split by type for the two cards.
    const textPool = texts.filter((t) => t.type !== "dialog");
    const dialogPool = texts.filter((t) => t.type === "dialog");
    const wordModes = ["recognition", "production", "say_word", "listen_word"] as const;
    const sentModes = ["sentences", "say_sentence", "listen_sentence"] as const;
    const w = groupReadiness(wordPool, progress, wordModes, LEARNED_BOX);
    const s = groupReadiness(sentPool, progress, sentModes, LEARNED_BOX);
    const rText = groupReadiness(textPool, progress, ["reading"], LEARNED_BOX);
    const rDialog = groupReadiness(dialogPool, progress, ["reading"], LEARNED_BOX);
    // Count over the raw level lists (not the hidden/eligibility pools) so it tracks the bar.
    const words = vocab.filter((v) => levelOf(v) === active && !wordLearned(progress, v.id)).length;
    const sents = sentences.filter(
      (x) => levelOf(x) === active && !sentenceLearned(progress, x.id),
    ).length;
    const text = textPool.filter(
      (t) => levelOf(t) === active && !readingLearned(progress, t.id),
    ).length;
    const dialog = dialogPool.filter(
      (t) => levelOf(t) === active && !readingLearned(progress, t.id),
    ).length;
    return {
      readiness: {
        recognition: w.get("recognition")!,
        production: w.get("production")!,
        say_word: w.get("say_word")!,
        listen_word: w.get("listen_word")!,
        sentences: s.get("sentences")!,
        say_sentence: s.get("say_sentence")!,
        listen_sentence: s.get("listen_sentence")!,
        text: rText.get("reading")!,
        dialog: rDialog.get("reading")!,
      },
      affects: {
        recognition: words,
        production: words,
        say_word: words,
        listen_word: words,
        sentences: sents,
        say_sentence: sents,
        listen_sentence: sents,
        text,
        dialog,
      },
    };
  }, [vocab, sentences, texts, progress, testMode, hidden, active]);

  const today = dateKey();
  const streak = currentStreak(daily, today);
  const lessons = todayLessons(daily, today);
  const accuracyPct = Math.round(todayAccuracy(daily, today) * 100);
  const goalPct = Math.min(100, Math.round((lessons / DAILY_LESSONS_GOAL) * 100));
  const goalReached = goalMet(daily, today);

  const settings = (
    <details className="settings">
      <summary className="settings__btn" aria-label="Настройки" title="Настройки">
        ⚙️
      </summary>
      <div className="settings__menu">
        <ThemeToggle />
      </div>
    </details>
  );

  if (!ready) {
    return (
      <main className="app app--home">
        <section className="card card--summary">
          {settings}
          <h1 className="prompt">Финский тренажёр</h1>
          <p className="hint">Загрузка прогресса…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app app--home">
      <section className="card card--summary">
        {settings}
        <h1 className="prompt prompt--home">Финский тренажёр</h1>

        <button
          type="button"
          className="ghead"
          onClick={onShowStats}
          aria-label="Открыть мой прогресс"
        >
          <span className="ghead__more" aria-hidden="true">
            📊&nbsp;›
          </span>
          <span className="ghead__stats">
            <span className="gstat">
              <span className="gstat__icon" aria-hidden="true">🔥</span>
              <span className="gstat__value gstat__value--streak">{streak}</span>
              <span className="gstat__label">серия</span>
            </span>
            <span className="gstat">
              <span className="gstat__icon" aria-hidden="true">🏆</span>
              <span className="gstat__value gstat__value--level">{active}</span>
              <span className="gstat__label">уровень</span>
            </span>
            <span className="gstat">
              <span className="gstat__icon" aria-hidden="true">✦</span>
              <span className="gstat__value gstat__value--words">{overall.learned}</span>
              <span className="gstat__label">из {overall.total}</span>
            </span>
          </span>

          <span className="ghead__bar">
            <span className="ghead__fill ghead__fill--level" style={{ width: `${levelPct}%` }} />
          </span>
          <span
            className="ghead__caption"
            title="Освоение уровня: слова, предложения и тексты/диалоги. Уровень открывается, когда освоено почти всё его содержимое."
          >
            Уровень {active} · {levelPct}% освоено
          </span>

          <span className="ghead__bar">
            <span className="ghead__fill ghead__fill--daily" style={{ width: `${goalPct}%` }} />
          </span>
          <span className="ghead__caption">
            🎯{" "}
            {goalReached
              ? "Цель выполнена! 🎉"
              : `Сегодня: ${lessons}/${DAILY_LESSONS_GOAL} · ${accuracyPct}%`}
          </span>
        </button>

        {testMode && (
          <div className="testbar">
            <p className="hint hint--test">🔧 Тестовый режим: все уровни открыты</p>
            <button type="button" className="option" onClick={onTestFill}>
              Засчитать всё выученным
            </button>
          </div>
        )}

        <div className="modegroup">
          <h3 className="modegroup__title">Слова</h3>
          <div className="modegroup__row">
            <ModeButton
              icon="👁"
              label="Узнавание"
              name="Узнавание слов"
              r={readiness.recognition}
              levelLeft={affects.recognition}
              onClick={() => onStart("recognition")}
            />
            <ModeButton
              icon="✍️"
              label="Написание"
              name="Написание слов"
              r={readiness.production}
              levelLeft={affects.production}
              onClick={() => onStart("production")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение слов"
              r={readiness.say_word}
              levelLeft={affects.say_word}
              onClick={() => onStart("say_word")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование слов"
              r={readiness.listen_word}
              levelLeft={affects.listen_word}
              onClick={() => onStart("listen_word")}
            />
          </div>
        </div>
        <div className="modegroup">
          <h3 className="modegroup__title">Предложения</h3>
          <div className="modegroup__row">
            <ModeButton
              icon="💬"
              label="Перевод"
              name="Перевод предложений"
              r={readiness.sentences}
              levelLeft={affects.sentences}
              onClick={() => onStart("sentences")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение предложений"
              r={readiness.say_sentence}
              levelLeft={affects.say_sentence}
              onClick={() => onStart("say_sentence")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование предложений"
              r={readiness.listen_sentence}
              levelLeft={affects.listen_sentence}
              onClick={() => onStart("listen_sentence")}
            />
          </div>
        </div>
        <div className="modegroup">
          <h3 className="modegroup__title">Чтение</h3>
          <div className="modegroup__row">
            <ModeButton
              icon="📖"
              label="Тексты"
              name="Чтение текстов"
              r={readiness.text}
              levelLeft={affects.text}
              onClick={() => onOpenReading("text")}
            />
            <ModeButton
              icon="🎭"
              label="Диалоги"
              name="Чтение диалогов"
              r={readiness.dialog}
              levelLeft={affects.dialog}
              onClick={() => onOpenReading("dialog")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
