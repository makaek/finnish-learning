/**
 * Roadmap.tsx — the home screen: overall progress, the level ladder (locked/active/done),
 * and the exercise picker. Pure presentation over `levels.ts` computations; all gating
 * logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeLevel,
  activeVocab,
  eligibleSentences,
  levelStats,
  overallProgress,
  unlockedLevelsWith,
  LEARNED_BOX,
  type SentenceLike,
  type VocabLike,
} from "../core/levels";
import { modeReadiness, type ModeReadiness } from "../core/stats";
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
  | "say_sentence";

interface RoadmapProps {
  vocab: readonly VocabLike[];
  sentences: readonly SentenceLike[];
  progress: ProgressMap;
  daily: UserState;
  /** Items hidden from lessons — excluded from the per-mode readiness pools. */
  hidden: ReadonlySet<string>;
  testMode: boolean;
  ready: boolean;
  onStart: (mode: Mode) => void;
  /** Open the read-only progress-details screen. */
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
  onClick,
}: {
  icon: string;
  label: string;
  /** Full accessible name (the short visible `label` repeats across groups). */
  name: string;
  r: ModeReadiness;
  onClick: () => void;
}) {
  const status =
    r.level === "none" ? "пока нечего учить" : `освоено ${r.mastered} из ${r.total}`;
  return (
    <button type="button" className="modebtn" aria-label={`${name}: ${status}`} onClick={onClick}>
      <span className={`dot dot--${r.level}`} aria-hidden="true" title={status} />
      <span className="modebtn__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="modebtn__label">{label}</span>
    </button>
  );
}

export default function Roadmap({
  vocab,
  sentences,
  progress,
  daily,
  hidden,
  testMode,
  ready,
  onStart,
  onShowStats,
  onTestFill,
}: RoadmapProps) {
  const { stats, unlocked, active, overall } = useMemo(() => {
    const s = levelStats(vocab, progress);
    const u = unlockedLevelsWith(s, testMode);
    return { stats: s, unlocked: u, active: activeLevel(s, u), overall: overallProgress(vocab, progress) };
  }, [vocab, progress, testMode]);
  const pct = Math.round(overall.fraction * 100);

  // Per-mode readiness over the in-play (unlocked, non-hidden) pools — flags neglected modes.
  const readiness = useMemo(() => {
    const wordPool = activeVocab(vocab, progress, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sentPool = eligibleSentences(sentences, vocab, progress, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    return {
      recognition: modeReadiness(wordPool, progress, "recognition", LEARNED_BOX),
      production: modeReadiness(wordPool, progress, "production", LEARNED_BOX),
      say_word: modeReadiness(wordPool, progress, "say_word", LEARNED_BOX),
      sentences: modeReadiness(sentPool, progress, "sentences", LEARNED_BOX),
      say_sentence: modeReadiness(sentPool, progress, "say_sentence", LEARNED_BOX),
    };
  }, [vocab, sentences, progress, testMode, hidden]);

  const today = dateKey();
  const streak = currentStreak(daily, today);
  const lessons = todayLessons(daily, today);
  const accuracyPct = Math.round(todayAccuracy(daily, today) * 100);
  const goalPct = Math.min(100, Math.round((lessons / DAILY_LESSONS_GOAL) * 100));
  const goalReached = goalMet(daily, today);

  if (!ready) {
    return (
      <main className="app">
        <section className="card card--summary">
          <ThemeToggle />
          <h1 className="prompt">Финский тренажёр</h1>
          <p className="hint">Загрузка прогресса…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="card card--summary">
        <ThemeToggle />
        <h1 className="prompt">Финский тренажёр</h1>

        <div className="daily">
          <span className="daily__streak" title="Серия дней подряд">
            🔥 {streak}
          </span>
          <div className="daily__goal">
            <div className="daily__bar">
              <div className="daily__fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="daily__label">
              {goalReached
                ? "Цель на сегодня выполнена! 🎉"
                : `Уроки: ${lessons} / ${DAILY_LESSONS_GOAL} · точность ${accuracyPct}%`}
            </span>
          </div>
        </div>

        <button type="button" className="meter meter--button" onClick={onShowStats}>
          <div className="meter__bar">
            <div className="meter__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="hint meter__label">
            Выучено слов: {overall.learned} из {overall.total} ({pct}%) · мой прогресс →
          </span>
        </button>

        <ul className="levels">
          {stats.map((s) => {
            const open = unlocked.has(s.level);
            const done = open && s.fraction >= 1;
            const state = !open ? "locked" : done ? "done" : "active";
            const badge = !open ? "🔒" : done ? "✓" : s.level === active ? "●" : "○";
            return (
              <li key={s.level} className={`level level--${state}`}>
                <span className="level__badge">{badge}</span>
                <span className="level__name">Уровень {s.level}</span>
                <span className="level__count">
                  {s.learned}/{s.total}
                </span>
              </li>
            );
          })}
        </ul>

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
              onClick={() => onStart("recognition")}
            />
            <ModeButton
              icon="✍️"
              label="Написание"
              name="Написание слов"
              r={readiness.production}
              onClick={() => onStart("production")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение слов"
              r={readiness.say_word}
              onClick={() => onStart("say_word")}
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
              onClick={() => onStart("sentences")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение предложений"
              r={readiness.say_sentence}
              onClick={() => onStart("say_sentence")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
