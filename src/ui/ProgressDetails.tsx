/**
 * ProgressDetails.tsx — read-only screen so the learner can confirm the SRS/gating per
 * exercise. Progress is tracked separately for each card type, so this shows three sections
 * (Узнавание / Написание / Предложения), each listing items answered correctly at least once
 * with mastery box, current streak, first-attempt accuracy, and live selection chance. A
 * collapsible legend explains every metric. All numbers come from pure core helpers.
 */

import { useMemo, type ReactElement } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import { DEFAULT_SESSION_SIZE } from "../core/quiz";
import { activeVocab, eligibleSentences, LEARNED_BOX } from "../core/levels";
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

function boxPips(box: number): string {
  return "●".repeat(box) + "○".repeat(Math.max(0, MAX_BOX - box));
}

function chanceLabel(chance: number): string {
  if (chance <= 0) return "—";
  const pct = Math.min(1, chance * DEFAULT_SESSION_SIZE) * 100;
  if (pct >= 99.5) return "~100%";
  return pct < 1 ? "<1%" : `~${Math.round(pct)}%`;
}

function Row({ label, sub, row }: { label: string; sub?: string; row: MasteryRow }) {
  const accuracy = row.totalSeen > 0 ? Math.round((row.totalCorrect / row.totalSeen) * 100) : 0;
  const learned = row.box >= LEARNED_BOX;
  return (
    <li className="statrow">
      <div className="statrow__head">
        <span className="statrow__label">
          {learned && <span className="statrow__learned" title="Выучено">✓ </span>}
          {label}
        </span>
        <span className="statrow__pips" title={`Освоение ${row.box}/${MAX_BOX}`}>
          {boxPips(row.box)}
        </span>
      </div>
      {sub && <div className="statrow__sub">{sub}</div>}
      <div className="statrow__metrics">
        <span title="Серия верных ответов подряд (с первой попытки)">🔥 {row.streak}</span>
        <span title="Верных с первой попытки из показов">
          ✓ {row.totalCorrect}/{row.totalSeen} ({accuracy}%)
        </span>
        <span title="Примерный шанс встретить в одной сессии из 10 вопросов">
          🎲 {chanceLabel(row.chance)}
        </span>
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  render,
}: {
  title: string;
  rows: MasteryRow[];
  render: (r: MasteryRow) => ReactElement;
}) {
  return (
    <>
      <h2 className="stats__heading">
        {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="hint">Пока нет верных ответов.</p>
      ) : (
        <ul className="stats">{rows.map(render)}</ul>
      )}
    </>
  );
}

export default function ProgressDetails({
  vocab,
  sentences,
  progress,
  testMode,
  onBack,
}: ProgressDetailsProps) {
  const pool = useMemo(() => activeVocab(vocab, progress, testMode), [vocab, progress, testMode]);
  const sentencePool = useMemo(
    () => eligibleSentences(sentences, vocab, progress, testMode),
    [sentences, vocab, progress, testMode],
  );

  // One row set per exercise type — the same word has independent recognition/production rows.
  const recognitionRows = useMemo(
    () => masteryRows(vocab, pool, progress, "recognition"),
    [vocab, pool, progress],
  );
  const productionRows = useMemo(
    () => masteryRows(vocab, pool, progress, "production"),
    [vocab, pool, progress],
  );
  const sayWordRows = useMemo(
    () => masteryRows(vocab, pool, progress, "say_word"),
    [vocab, pool, progress],
  );
  const sentenceRows = useMemo(
    () => masteryRows(sentences, sentencePool, progress, "sentences"),
    [sentences, sentencePool, progress],
  );
  const saySentenceRows = useMemo(
    () => masteryRows(sentences, sentencePool, progress, "say_sentence"),
    [sentences, sentencePool, progress],
  );

  const vocabById = useMemo(() => new Map(vocab.map((v) => [v.id, v])), [vocab]);
  const sentenceById = useMemo(() => new Map(sentences.map((s) => [s.id, s])), [sentences]);

  const empty =
    recognitionRows.length === 0 &&
    productionRows.length === 0 &&
    sayWordRows.length === 0 &&
    sentenceRows.length === 0 &&
    saySentenceRows.length === 0;

  const wordRow = (row: MasteryRow) => {
    const v = vocabById.get(row.id);
    return <Row key={`${row.kind}-${row.id}`} label={v ? `${v.fi} — ${v.ru}` : row.id} row={row} />;
  };

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← В меню
      </button>
      <section className="card">
        <h1 className="prompt">Мой прогресс</h1>
        <p className="hint">
          Прогресс считается отдельно для каждого типа упражнения. Засчитывается только первая
          попытка.
        </p>

        <details className="legend">
          <summary>❓ Что значат метрики</summary>
          <ul className="legend__list">
            <li>
              <b>●●●○○ — освоение</b> (0–{MAX_BOX}). «Выучено» (✓) после {LEARNED_BOX} верных
              ответов; ошибка с первой попытки понижает уровень.
            </li>
            <li>
              <b>🔥 — серия</b>: сколько раз подряд вы ответили верно с первой попытки.
            </li>
            <li>
              <b>✓ N/M (%)</b>: верных ответов <b>с первой попытки</b> из показов. Если ошиблись —
              попытка неудачная, даже если потом исправили.
            </li>
            <li>
              <b>🎲 — шанс</b> встретить слово в следующей сессии (10 вопросов): чем лучше освоено,
              тем реже показывается.
            </li>
            <li>Слово учится отдельно в «Узнавании» и «Написании»; для новых уровней засчитывается любой из них.</li>
          </ul>
        </details>

        {empty ? (
          <p className="hint">Пока нет верных ответов — пройдите упражнение.</p>
        ) : (
          <>
            <Section title="Узнавание слов" rows={recognitionRows} render={wordRow} />
            <Section title="Написание слов" rows={productionRows} render={wordRow} />
            <Section title="🎤 Скажи слово" rows={sayWordRows} render={wordRow} />
            <Section
              title="Перевод предложений"
              rows={sentenceRows}
              render={(row) => {
                const s = sentenceById.get(row.id);
                return (
                  <Row key={`s-${row.id}`} label={s ? s.ru : row.id} sub={s?.canonical} row={row} />
                );
              }}
            />
            <Section
              title="🎤 Скажи предложение"
              rows={saySentenceRows}
              render={(row) => {
                const s = sentenceById.get(row.id);
                return (
                  <Row
                    key={`ss-${row.id}`}
                    label={s ? s.ru : row.id}
                    sub={s?.canonical}
                    row={row}
                  />
                );
              }}
            />
          </>
        )}
      </section>
    </main>
  );
}
