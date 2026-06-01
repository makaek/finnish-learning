/**
 * ProgressDetails.tsx — read-only screen listing every word and sentence the learner has
 * answered correctly at least once, with its mastery box, current streak, accuracy, and live
 * selection chance. Lets the user confirm the SRS/gating behave as expected. All numbers come
 * from pure core helpers (stats.ts, levels.ts); this only maps rows to markup.
 */

import { useMemo } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import { DEFAULT_SESSION_SIZE } from "../core/quiz";
import { activeVocab, eligibleSentences } from "../core/levels";
import { masteryRows, type MasteryRow } from "../core/stats";
import { MAX_BOX } from "../core/progress";
import type { ProgressMap } from "../core/progress";

interface ProgressDetailsProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  progress: ProgressMap;
  testMode: boolean;
  onBack: () => void;
}

/** Mastery box as filled/empty pips, e.g. ●●●○○ for box 3. */
function boxPips(box: number): string {
  return "●".repeat(box) + "○".repeat(Math.max(0, MAX_BOX - box));
}

/**
 * Show the approximate chance of meeting the item in one session. `chance` is the per-pick
 * probability; a session draws DEFAULT_SESSION_SIZE distinct items, so scale by that (capped
 * at 100%). Approximate (sampling is without replacement) but far more intuitive than the
 * raw per-pick value, and the ordering across items is identical.
 */
function chanceLabel(chance: number): string {
  if (chance <= 0) return "—";
  const pct = Math.min(1, chance * DEFAULT_SESSION_SIZE) * 100;
  if (pct >= 99.5) return "~100%";
  return pct < 1 ? "<1%" : `~${Math.round(pct)}%`;
}

function Row({ label, sub, row }: { label: string; sub?: string; row: MasteryRow }) {
  const accuracy = row.totalSeen > 0 ? Math.round((row.totalCorrect / row.totalSeen) * 100) : 0;
  return (
    <li className="statrow">
      <div className="statrow__head">
        <span className="statrow__label">{label}</span>
        <span className="statrow__pips" title={`Освоение ${row.box}/${MAX_BOX}`}>
          {boxPips(row.box)}
        </span>
      </div>
      {sub && <div className="statrow__sub">{sub}</div>}
      <div className="statrow__metrics">
        <span title="Текущая серия верных ответов">🔥 {row.streak}</span>
        <span title="Верно из показов">
          ✓ {row.totalCorrect}/{row.totalSeen} ({accuracy}%)
        </span>
        <span title="Примерный шанс встретить в одной сессии из 10 вопросов">
          🎲 {chanceLabel(row.chance)}
        </span>
      </div>
    </li>
  );
}

export default function ProgressDetails({
  vocab,
  sentences,
  progress,
  testMode,
  onBack,
}: ProgressDetailsProps) {
  const vocabRows = useMemo(
    () => masteryRows(vocab, activeVocab(vocab, progress, testMode), progress, "vocab"),
    [vocab, progress, testMode],
  );
  const sentenceRows = useMemo(
    () =>
      masteryRows(
        sentences,
        eligibleSentences(sentences, vocab, progress, testMode),
        progress,
        "sentence",
      ),
    [sentences, vocab, progress, testMode],
  );

  const vocabById = useMemo(() => new Map(vocab.map((v) => [v.id, v])), [vocab]);
  const sentenceById = useMemo(() => new Map(sentences.map((s) => [s.id, s])), [sentences]);

  const empty = vocabRows.length === 0 && sentenceRows.length === 0;

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← В меню
      </button>
      <section className="card">
        <h1 className="prompt">Мой прогресс</h1>
        <p className="hint">
          Слова и предложения, на которые вы хотя бы раз ответили верно. 🔥 — текущая серия,
          ✓ — верно из показов, 🎲 — примерный шанс встретить в сессии (10 вопросов).
        </p>

        {empty ? (
          <p className="hint">Пока нет верных ответов — пройдите упражнение.</p>
        ) : (
          <>
            <h2 className="stats__heading">Слова ({vocabRows.length})</h2>
            <ul className="stats">
              {vocabRows.map((row) => {
                const v = vocabById.get(row.id);
                return <Row key={`v-${row.id}`} label={v ? `${v.fi} — ${v.ru}` : row.id} row={row} />;
              })}
            </ul>

            {sentenceRows.length === 0 ? (
              <p className="hint">Предложения: пока нет верных ответов.</p>
            ) : (
              <>
                <h2 className="stats__heading">Предложения ({sentenceRows.length})</h2>
                <ul className="stats">
                  {sentenceRows.map((row) => {
                    const s = sentenceById.get(row.id);
                    return (
                      <Row
                        key={`s-${row.id}`}
                        label={s ? s.ru : row.id}
                        sub={s?.canonical}
                        row={row}
                      />
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
