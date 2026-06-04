/**
 * ProgressDetails.tsx — read-only "Мой прогресс" screen. Shows ONE card per word/sentence,
 * with a compact line per lesson-type track it has been practiced in (so a word's recognition
 * / writing / speaking progress sit together instead of in five separate lists). Mastered
 * items can be hidden (persisted) to keep the list short; a toggle reveals hidden ones.
 */

import { useMemo, useState, type ReactNode } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import { DEFAULT_SESSION_SIZE, SENTENCE_SESSION_SIZE } from "../core/quiz";
import { activeVocab, eligibleSentences, levelOf, LEARNED_BOX } from "../core/levels";
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
}

const WORD_KINDS: ItemKind[] = ["recognition", "production", "say_word", "listen_word"];
const SENTENCE_KINDS: ItemKind[] = ["sentences", "say_sentence", "listen_sentence"];
const TRACK_LABEL: Record<ItemKind, string> = {
  recognition: "Узнавание",
  production: "Написание",
  say_word: "🎤 Скажи",
  sentences: "Перевод",
  say_sentence: "🎤 Скажи",
  listen_word: "🎧 На слух",
  listen_sentence: "🎧 На слух",
};

function boxPips(box: number): string {
  return "●".repeat(box) + "○".repeat(Math.max(0, MAX_BOX - box));
}

/** Per-pick chance scaled to a whole session — sentence sessions are smaller than word ones. */
function chanceLabel(chance: number, kind: ItemKind): string {
  if (chance <= 0) return "—";
  const sessionSize = SENTENCE_KINDS.includes(kind) ? SENTENCE_SESSION_SIZE : DEFAULT_SESSION_SIZE;
  const pct = Math.min(1, chance * sessionSize) * 100;
  if (pct >= 99.5) return "~100%";
  return pct < 1 ? "<1%" : `~${Math.round(pct)}%`;
}

function ItemCard({
  entry,
  label,
  sub,
  level,
  hidden,
  onToggleHide,
}: {
  entry: MergedProgress;
  label: string;
  sub?: string;
  /** Curriculum level of the word/sentence, shown as a small badge. */
  level: number;
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
        <span className="icard__right">
          <span className="icard__level" title={`Уровень ${level}`}>
            Ур. {level}
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
        </span>
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
                <span title="Шанс встретить в сессии">🎲 {chanceLabel(t.chance, t.kind)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** A collapsible list section with a count in its header. */
function Section({
  title,
  count,
  open,
  disabled,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  /** When true (e.g. while searching) the section is force-open and the toggle is inert. */
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="psection">
      <button
        type="button"
        className="psection__head"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="psection__chev" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        {title} ({count})
      </button>
      {open && <ul className="stats">{children}</ul>}
    </div>
  );
}

export default function ProgressDetails({
  vocab,
  sentences,
  progress,
  testMode,
  hidden,
  onToggleHide,
}: ProgressDetailsProps) {
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQuery] = useState("");
  const [wordsOpen, setWordsOpen] = useState(true);
  const [sentsOpen, setSentsOpen] = useState(true);
  // Optional sort: by curriculum level, lowest first (otherwise mergeByItem's mastered/recency order).
  const [sortByLevel, setSortByLevel] = useState(false);

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
  const baseWords = showHidden
    ? hiddenFirst(words, "word")
    : words.filter((e) => !isHidden("word", e.id));
  const baseSentences = showHidden
    ? hiddenFirst(sentenceEntries, "sentence")
    : sentenceEntries.filter((e) => !isHidden("sentence", e.id));

  // Search filters by the visible text (word fi+ru, or sentence + canonical).
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const wordText = (e: MergedProgress) => {
    const v = vocabById.get(e.id);
    return (v ? `${v.fi} ${v.ru}` : e.id).toLowerCase();
  };
  const sentText = (e: MergedProgress) => {
    const s = sentenceById.get(e.id);
    return (s ? `${s.ru} ${s.canonical}` : e.id).toLowerCase();
  };
  const filteredWords = searching ? baseWords.filter((e) => wordText(e).includes(q)) : baseWords;
  const filteredSentences = searching
    ? baseSentences.filter((e) => sentText(e).includes(q))
    : baseSentences;

  // Level lookups + optional stable sort by level ascending (keeps the prior order within a level).
  const wordLevelOf = (e: MergedProgress) => levelOf(vocabById.get(e.id) ?? {});
  const sentLevelOf = (e: MergedProgress) => levelOf(sentenceById.get(e.id) ?? {});
  const shownWords = sortByLevel
    ? [...filteredWords].sort((a, b) => wordLevelOf(a) - wordLevelOf(b))
    : filteredWords;
  const shownSentences = sortByLevel
    ? [...filteredSentences].sort((a, b) => sentLevelOf(a) - sentLevelOf(b))
    : filteredSentences;

  // While searching, force sections open so matches are visible; only show a section that has
  // anything to display.
  const showWordsSection = searching ? shownWords.length > 0 : baseWords.length > 0;
  const showSentSection = searching ? shownSentences.length > 0 : baseSentences.length > 0;

  const empty = words.length === 0 && sentenceEntries.length === 0;
  const noResults = !empty && searching && shownWords.length === 0 && shownSentences.length === 0;

  return (
    <main className="app app--scroll">
      <section className="card">
        <h1 className="prompt prompt--home">Мой прогресс</h1>

        <details className="legend">
          <summary>❓ Что значат метрики · как скрывать</summary>
          <ul className="legend__list">
            <li>
              <b>●●●○○ — освоение</b> (0–{MAX_BOX}). «Выучено» (✓) после {LEARNED_BOX} верных
              ответов в каждом типе упражнения (учатся отдельно); ошибка с первой попытки
              понижает уровень.
            </li>
            <li>
              <b>🔥 — серия</b> верных подряд; <b>✓ N/M</b> — верных из показов; <b>🎲</b> — шанс
              встретить в следующей сессии.
            </li>
            <li>Выученное во всех типах (✓) можно скрыть 🙈 — оно исчезнет из упражнений.</li>
          </ul>
        </details>

        <div className="psearch">
          <input
            type="search"
            className="psearch__input"
            placeholder="🔍 Поиск слова или предложения…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск"
          />
          {hiddenCount > 0 && (
            <button
              type="button"
              className="psearch__hidden"
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? "Скрыть выученные" : `Скрытые (${hiddenCount})`}
            </button>
          )}
        </div>

        <div className="psort">
          <button
            type="button"
            className={"chip" + (sortByLevel ? " chip--on" : "")}
            onClick={() => setSortByLevel((v) => !v)}
            aria-pressed={sortByLevel}
          >
            ↕ По уровню
          </button>
        </div>

        {empty ? (
          <p className="hint">Пока нет верных ответов — пройдите упражнение.</p>
        ) : noResults ? (
          <p className="hint">Ничего не найдено по запросу «{query.trim()}».</p>
        ) : (
          <>
            {showWordsSection && (
              <Section
                title="Слова"
                count={shownWords.length}
                open={searching || wordsOpen}
                disabled={searching}
                onToggle={() => setWordsOpen((o) => !o)}
              >
                {shownWords.map((e) => {
                  const v = vocabById.get(e.id);
                  return (
                    <ItemCard
                      key={e.id}
                      entry={e}
                      label={v ? `${v.fi} — ${v.ru}` : e.id}
                      level={levelOf(v ?? {})}
                      hidden={isHidden("word", e.id)}
                      onToggleHide={() => onToggleHide(hiddenKey("word", e.id))}
                    />
                  );
                })}
              </Section>
            )}
            {showSentSection && (
              <Section
                title="Предложения"
                count={shownSentences.length}
                open={searching || sentsOpen}
                disabled={searching}
                onToggle={() => setSentsOpen((o) => !o)}
              >
                {shownSentences.map((e) => {
                  const s = sentenceById.get(e.id);
                  return (
                    <ItemCard
                      key={e.id}
                      entry={e}
                      label={s ? s.ru : e.id}
                      sub={s?.canonical}
                      level={levelOf(s ?? {})}
                      hidden={isHidden("sentence", e.id)}
                      onToggleHide={() => onToggleHide(hiddenKey("sentence", e.id))}
                    />
                  );
                })}
              </Section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
