/**
 * Roadmap.tsx — the home screen: overall progress, the level ladder (locked/active/done),
 * and the exercise picker. Pure presentation over `levels.ts` computations; all gating
 * logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeLevel,
  levelStats,
  overallProgress,
  unlockedLevelsWith,
  type VocabLike,
} from "../core/levels";
import type { ProgressMap } from "../core/progress";

export type Mode = "recognition" | "production" | "sentences";

interface RoadmapProps {
  vocab: readonly VocabLike[];
  progress: ProgressMap;
  testMode: boolean;
  ready: boolean;
  onStart: (mode: Mode) => void;
  /** Open the read-only progress-details screen. */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

export default function Roadmap({
  vocab,
  progress,
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

  if (!ready) {
    return (
      <main className="app">
        <section className="card card--summary">
          <h1 className="prompt">Финский тренажёр</h1>
          <p className="hint">Загрузка прогресса…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="card card--summary">
        <h1 className="prompt">Финский тренажёр</h1>

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

        <p className="hint">Выберите упражнение:</p>
        <div className="options">
          <button type="button" className="option" onClick={() => onStart("recognition")}>
            Узнавание слов
          </button>
          <button type="button" className="option" onClick={() => onStart("production")}>
            Написание слов
          </button>
          <button type="button" className="option" onClick={() => onStart("sentences")}>
            Перевод предложений
          </button>
        </div>
      </section>
    </main>
  );
}
