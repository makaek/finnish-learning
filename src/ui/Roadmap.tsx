/**
 * Roadmap.tsx — the home screen: overall progress, the level ladder (locked/active/done),
 * and the exercise picker. Pure presentation over `levels.ts` computations; all gating
 * logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeVocab,
  eligibleSentences,
  levelCompletionLearnProgress,
  levelCompletionStats,
  masteringLevel,
  overallProgress,
  unmasteredInLevel,
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

interface RoadmapProps {
  vocab: readonly VocabLike[];
  sentences: readonly SentenceLike[];
  /** Reading texts/dialogs (levelled) — folded into the displayed level completion. */
  texts: readonly VocabLike[];
  progress: ProgressMap;
  daily: UserState;
  /** Items hidden from lessons — excluded from the per-mode readiness pools. */
  hidden: ReadonlySet<string>;
  /** Texts/dialogs finished — counted toward level completion. */
  read: ReadonlySet<string>;
  testMode: boolean;
  ready: boolean;
  onStart: (mode: Mode) => void;
  /** Open the read-only progress-details screen (also reachable from the bottom nav). */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

/** One exercise button: icon + short label + a traffic-light dot for that mode's readiness. */
function ModeButton({
  icon,
  label,
  name,
  r,
  finishCount,
  onClick,
}: {
  icon: string;
  label: string;
  /** Full accessible name (the short visible `label` repeats across groups). */
  name: string;
  r: ModeReadiness;
  /** Unmastered items of the CURRENT level in this mode — shows a 🎯 "finish-the-level" badge. */
  finishCount: number;
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
  const finishHint = finishCount > 0 ? ` · 🎯 ещё ${finishCount} в текущем уровне` : "";
  const status =
    (r.level === "none" ? "пока нечего учить" : `освоено ${r.mastered} из ${r.total} · ${freshness}`) +
    finishHint;
  return (
    <button type="button" className="modebtn" aria-label={`${name}: ${status}`} onClick={onClick}>
      <span className={`dot dot--${r.level}`} aria-hidden="true" title={status} />
      {/* Top-left slot: the actionable 🎯 "finish the current level" count takes priority; when
          there's nothing left to finish here, it falls back to the lifetime mastered total. */}
      {finishCount > 0 ? (
        <span
          className="modebtn__count modebtn__count--finish"
          aria-hidden="true"
          title={`Осталось ${finishCount} в текущем уровне — закройте, чтобы перейти на следующий`}
        >
          🎯 {finishCount}
        </span>
      ) : (
        r.level !== "none" && (
          <span className="modebtn__count" aria-hidden="true" title={status}>
            {r.mastered}
          </span>
        )
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
  read,
  testMode,
  ready,
  onStart,
  onShowStats,
  onTestFill,
}: RoadmapProps) {
  // "Current level" is the level being completed (lowest not fully done), shown with a smooth
  // learn-progress bar — not the unlocked frontier, which jumped the bar to ~0% on every unlock.
  // Completion now spans words + sentences + dialogs/texts, so finishing a level's phrases and
  // dialogs fills the bar and advances the level. (Unlocks stay word-driven, so nothing relocks.)
  const { active, overall } = useMemo(() => {
    const s = levelCompletionStats(vocab, sentences, texts, progress, read);
    return { active: masteringLevel(s), overall: overallProgress(vocab, progress) };
  }, [vocab, sentences, texts, progress, read]);

  // Per-mode readiness, RELATIVE within each group (words / sentences) so the lights flag
  // which mode is lagging behind the others — nudging the learner to keep them balanced. Also
  // the per-mode count of CURRENT-level items still unmastered, driving the 🎯 finish-the-level
  // badge (so the learner can see exactly which modes hold the items between them and the next
  // level).
  const { readiness, finish } = useMemo(() => {
    const wordPool = activeVocab(vocab, progress, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sentPool = eligibleSentences(sentences, vocab, progress, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    const wordModes = ["recognition", "production", "say_word", "listen_word"] as const;
    const sentModes = ["sentences", "say_sentence", "listen_sentence"] as const;
    const w = groupReadiness(wordPool, progress, wordModes, LEARNED_BOX);
    const s = groupReadiness(sentPool, progress, sentModes, LEARNED_BOX);
    const finish = {
      recognition: unmasteredInLevel(wordPool, progress, "recognition", active),
      production: unmasteredInLevel(wordPool, progress, "production", active),
      say_word: unmasteredInLevel(wordPool, progress, "say_word", active),
      listen_word: unmasteredInLevel(wordPool, progress, "listen_word", active),
      sentences: unmasteredInLevel(sentPool, progress, "sentences", active),
      say_sentence: unmasteredInLevel(sentPool, progress, "say_sentence", active),
      listen_sentence: unmasteredInLevel(sentPool, progress, "listen_sentence", active),
    };
    return {
      readiness: {
        recognition: w.get("recognition")!,
        production: w.get("production")!,
        say_word: w.get("say_word")!,
        listen_word: w.get("listen_word")!,
        sentences: s.get("sentences")!,
        say_sentence: s.get("say_sentence")!,
        listen_sentence: s.get("listen_sentence")!,
      },
      finish,
    };
  }, [vocab, sentences, progress, testMode, hidden, active]);

  const today = dateKey();
  const streak = currentStreak(daily, today);
  const lessons = todayLessons(daily, today);
  const accuracyPct = Math.round(todayAccuracy(daily, today) * 100);
  const goalPct = Math.min(100, Math.round((lessons / DAILY_LESSONS_GOAL) * 100));
  const goalReached = goalMet(daily, today);
  const levelPct = Math.round(
    levelCompletionLearnProgress(vocab, sentences, texts, progress, read, active) * 100,
  );

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
            title="Среднее освоение уровня: слова (все режимы), предложения и диалоги/тексты. Закрывайте режимы с 🎯, чтобы перейти на следующий уровень."
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
              finishCount={finish.recognition}
              onClick={() => onStart("recognition")}
            />
            <ModeButton
              icon="✍️"
              label="Написание"
              name="Написание слов"
              r={readiness.production}
              finishCount={finish.production}
              onClick={() => onStart("production")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение слов"
              r={readiness.say_word}
              finishCount={finish.say_word}
              onClick={() => onStart("say_word")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование слов"
              r={readiness.listen_word}
              finishCount={finish.listen_word}
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
              finishCount={finish.sentences}
              onClick={() => onStart("sentences")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение предложений"
              r={readiness.say_sentence}
              finishCount={finish.say_sentence}
              onClick={() => onStart("say_sentence")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование предложений"
              r={readiness.listen_sentence}
              finishCount={finish.listen_sentence}
              onClick={() => onStart("listen_sentence")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
