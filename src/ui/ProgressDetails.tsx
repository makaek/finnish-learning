/**
 * ProgressDetails.tsx — read-only "Мой прогресс" screen. Shows ONE card per word/sentence,
 * with a compact line per lesson-type track it has been practiced in (so a word's recognition
 * / writing / speaking progress sit together instead of in five separate lists). Mastered
 * items can be hidden (persisted) to keep the list short; a toggle reveals hidden ones.
 */

import { useMemo, useState } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import { DEFAULT_SESSION_SIZE } from "../core/quiz";
import { activeVocab, eligibleSentences, LEARNED_BOX } from "../core/levels";
import { mergeByItem, type MergedProgress } from "../core/stats";
import { MAX_BOX, type ItemKind } from "../core/progress";
import type { ProgressMap } from "../core/progress";
import { hiddenKey, type Group } from "./hidden";

interface ProgressDetailsProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  progress: ProgressMap;
  testMode: boolean;
  /** Hidden item keys (owned by App, since hiding also removes items from lessons). */
  hidden: ReadonlySet<string>;
  onToggleHide: (key: string) => void;
  onBack: () => void;
}

const WORD_KINDS: ItemKind[] = ["recognition", "production", "say_word"];
const SENTENCE_KINDS: ItemKind[] = ["sentences", "say_sentence"];
const TRACK_LABEL: Record<ItemKind, string> = {
  recognition: "Узнавание",
  production: "Написание",
  say_word: "🎤 Скажи",
  sentences: "Перевод",
  say_sentence: "🎤 Скажи",
};

function boxPips(box: number): string {
  return "●".repeat(box) + "○".repeat(Math.max(0, MAX_BOX - box));
}

function chanceLabel(chance: number): string {
  if (chance <= 0) return "—";
  const pct = Math.min(1, chance * DEFAULT_SESSION_SIZE) * 100;
  if (pct >= 99.5) return "~100%";
  return pct < 1 ? "<1%" : `~${Math.round(pct)}%`;
}

function ItemCard({
  entry,
  label,
  sub,
  hidden,
  onToggleHide,
}: {
  entry: MergedProgress;
  label: string;
  sub?: string;
  hidden: boolean;
  onToggleHide: () => void;
}) {
  return (
    <li className={"icard" + (hidden ? " icard--hidden" : "")}>
      <div className="icard__head">
        <span className="icard__label">
          {entry.mastered && <span className="icard__check" title="Выучено">✓ </span>}
          {label}
        </span>
        {entry.mastered && (
          <button
            type="button"
            className="icard__hide"
            onClick={onToggleHide}
            title={hidden ? "Показать в списке" : "Скрыть из списка"}
          >
            {hidden ? "👁" : "🙈"}
          </button>
        )}
      </div>
      {sub && <div className="icard__sub">{sub}</div>}
      <ul className="tracks">
        {entry.tracks.map((t) => {
          const accuracy = t.totalSeen > 0 ? Math.round((t.totalCorrect / t.totalSeen) * 100) : 0;
          return (
            <li className="track" key={t.kind}>
              <span className="track__name">{TRACK_LABEL[t.kind]}</span>
              <span className="track__pips" title={`Освоение ${t.box}/${MAX_BOX}`}>
                {boxPips(t.box)}
              </span>
              <span className="track__metrics">
                <span title="Серия верных подряд">🔥 {t.streak}</span>
                <span title="Верных с первой попытки из показов">
                  ✓ {t.totalCorrect}/{t.totalSeen} ({accuracy}%)
                </span>
                <span title="Шанс встретить в сессии">🎲 {chanceLabel(t.chance)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default function ProgressDetails({
  vocab,
  sentences,
  progress,
  testMode,
  hidden,
  onToggleHide,
  onBack,
}: ProgressDetailsProps) {
  const [showHidden, setShowHidden] = useState(false);

  const words = useMemo(
    () => mergeByItem(vocab, activeVocab(vocab, progress, testMode), progress, WORD_KINDS, LEARNED_BOX),
    [vocab, progress, testMode],
  );
  const sentenceEntries = useMemo(
    () =>
      mergeByItem(
        sentences,
        eligibleSentences(sentences, vocab, progress, testMode),
        progress,
        SENTENCE_KINDS,
        LEARNED_BOX,
      ),
    [sentences, vocab, progress, testMode],
  );

  const vocabById = useMemo(() => new Map(vocab.map((v) => [v.id, v])), [vocab]);
  const sentenceById = useMemo(() => new Map(sentences.map((s) => [s.id, s])), [sentences]);

  const isHidden = (group: Group, id: string) => hidden.has(hiddenKey(group, id));
  const hiddenCount =
    words.filter((e) => isHidden("word", e.id)).length +
    sentenceEntries.filter((e) => isHidden("sentence", e.id)).length;

  // When "show hidden" is on, float the hidden items to the very top; the stable sort keeps
  // mergeByItem's mastered-first/recency order within the hidden and non-hidden groups.
  const hiddenFirst = (entries: MergedProgress[], group: Group) =>
    [...entries].sort((a, b) => Number(isHidden(group, b.id)) - Number(isHidden(group, a.id)));
  const shownWords = showHidden
    ? hiddenFirst(words, "word")
    : words.filter((e) => !isHidden("word", e.id));
  const shownSentences = showHidden
    ? hiddenFirst(sentenceEntries, "sentence")
    : sentenceEntries.filter((e) => !isHidden("sentence", e.id));

  const empty = words.length === 0 && sentenceEntries.length === 0;

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← В меню
      </button>
      <section className="card">
        <h1 className="prompt">Мой прогресс</h1>
        <p className="hint">
          Одна карточка на слово/предложение со всеми типами упражнений. Засчитывается только
          первая попытка. Выученное во всех типах (✓) можно скрыть 🙈 — оно перестанет
          появляться в упражнениях.
        </p>

        <details className="legend">
          <summary>❓ Что значат метрики</summary>
          <ul className="legend__list">
            <li>
              <b>●●●○○ — освоение</b> (0–{MAX_BOX}). «Выучено» (✓) после {LEARNED_BOX} верных
              ответов в каждом упражнении; ошибка с первой попытки понижает уровень.
            </li>
            <li>
              <b>🔥 — серия</b> верных подряд; <b>✓ N/M</b> — верных с первой попытки из показов;
              <b> 🎲</b> — шанс встретить в следующей сессии.
            </li>
            <li>Каждый тип упражнения (узнавание/написание/речь) учится отдельно.</li>
          </ul>
        </details>

        {hiddenCount > 0 && (
          <button
            type="button"
            className="option showhidden"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? "Скрыть выученные" : `Показать скрытые (${hiddenCount})`}
          </button>
        )}

        {empty ? (
          <p className="hint">Пока нет верных ответов — пройдите упражнение.</p>
        ) : (
          <>
            {shownWords.length > 0 && (
              <>
                <h2 className="stats__heading">Слова ({shownWords.length})</h2>
                <ul className="stats">
                  {shownWords.map((e) => {
                    const v = vocabById.get(e.id);
                    return (
                      <ItemCard
                        key={e.id}
                        entry={e}
                        label={v ? `${v.fi} — ${v.ru}` : e.id}
                        hidden={isHidden("word", e.id)}
                        onToggleHide={() => onToggleHide(hiddenKey("word", e.id))}
                      />
                    );
                  })}
                </ul>
              </>
            )}
            {shownSentences.length > 0 && (
              <>
                <h2 className="stats__heading">Предложения ({shownSentences.length})</h2>
                <ul className="stats">
                  {shownSentences.map((e) => {
                    const s = sentenceById.get(e.id);
                    return (
                      <ItemCard
                        key={e.id}
                        entry={e}
                        label={s ? s.ru : e.id}
                        sub={s?.canonical}
                        hidden={isHidden("sentence", e.id)}
                        onToggleHide={() => onToggleHide(hiddenKey("sentence", e.id))}
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
