/**
 * Reading.tsx — the reading library, a level-sorted list of texts & dialogs.
 *
 * Browsing + difficulty gating only; the actual reading, comprehension quiz, and role-play live
 * in TextReader. Reached from the home "Чтение" cards (Тексты / Диалоги), so it takes a
 * `filterType` to show one kind and an `onBack` to return home (it's no longer a footer tab).
 */

import { useMemo, useState } from "react";
import {
  activeLevel,
  levelStats,
  readingMastered,
  unlockedLevelsWith,
  type VocabLike,
} from "../core/levels";
import type { ProgressMap } from "../core/progress";
import { isTextUnlocked } from "../core/reading";
import { TEXTS, gradeQuestion } from "../data/texts";
import TextReader from "./TextReader";

interface ReadingProps {
  vocab: readonly VocabLike[];
  progress: ProgressMap;
  testMode: boolean;
  /** Texts/dialogs finished so far (owned by App, since it folds into level completion). */
  read: ReadonlySet<string>;
  /** Mark a text/dialog as finished. */
  onMarkRead: (id: string) => void;
  /** Count a completed role-play toward today's lessons (no accuracy effect). */
  onLessonDone: () => void;
  /** Record a finished comprehension quiz on the text's reading track. */
  onReadingResult: (textId: string, allCorrect: boolean) => void;
  /** Record that the text was recited наизусть in one role (drives the second part of mastery). */
  onRecited: (textId: string, role: string) => void;
  /** Show only this kind ("text" monologues or "dialog"s); both when omitted. */
  filterType?: "text" | "dialog";
  /** Return to the home grid (the library is opened from there, not the footer). */
  onBack: () => void;
}

export default function Reading({
  vocab,
  progress,
  testMode,
  read,
  onMarkRead,
  onLessonDone,
  onReadingResult,
  onRecited,
  filterType,
  onBack,
}: ReadingProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const currentLevel = useMemo(() => {
    const s = levelStats(vocab, progress);
    return activeLevel(s, unlockedLevelsWith(s, testMode));
  }, [vocab, progress, testMode]);

  const shown = filterType ? TEXTS.filter((t) => (t.type ?? "text") === filterType) : TEXTS;
  const title = filterType === "dialog" ? "🎭 Диалоги" : filterType === "text" ? "📖 Тексты" : "📚 Чтение";

  const openText = openId ? TEXTS.find((t) => t.id === openId) : undefined;
  if (openText) {
    return (
      <TextReader
        key={openText.id}
        text={openText}
        isRead={read.has(openText.id)}
        grade={gradeQuestion}
        onBack={() => setOpenId(null)}
        onMarkRead={() => onMarkRead(openText.id)}
        onLessonDone={onLessonDone}
        onReadingResult={onReadingResult}
        onRecited={onRecited}
      />
    );
  }

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← Главная
      </button>
      <section className="card">
        <h1 className="prompt prompt--home">{title}</h1>
        <p className="hint">От простого к сложному — открываются по мере роста уровня.</p>

        <ul className="reading">
          {shown.map((t) => {
            const unlocked = testMode || isTextUnlocked(t, currentLevel);
            // «Прочитано» (the 🏆) = the two-part mastery that counts toward the level: comprehension
            // quiz passed (if any) AND recited наизусть in every role. The ✓ below is the lighter
            // "opened/read at least once" marker (read-set), a distinct, partial state.
            const hasQuestions = (t.questions?.length ?? 0) > 0;
            const done = readingMastered(progress, t.id, hasQuestions);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={"readrow" + (unlocked ? "" : " readrow--locked")}
                  disabled={!unlocked}
                  onClick={() => setOpenId(t.id)}
                  aria-label={`${t.title}, уровень ${t.level}${done ? " — выполнено" : ""}${unlocked ? "" : " — закрыто"}`}
                >
                  <span className="readrow__lv">Ур. {t.level}</span>
                  <span className="readrow__title">{t.title}</span>
                  <span className="readrow__badges" aria-hidden="true">
                    {done ? (
                      <span
                        className="readrow__mastered"
                        title={hasQuestions ? "Задание выполнено — вопросы пройдены" : "Выполнено"}
                      >
                        🏆
                      </span>
                    ) : (
                      read.has(t.id) && (
                        <span className="readrow__done" title="Прочитано">
                          ✓
                        </span>
                      )
                    )}
                    {t.type === "dialog" && <span title="Диалог">🎭</span>}
                    {!unlocked && <span title={`Откройте уровень ${t.level}`}>🔒</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && <p className="hint">Здесь пока пусто.</p>}
        {!testMode && shown.length > 0 && currentLevel < Math.max(...shown.map((t) => t.level)) && (
          <p className="hint">Новые тексты открываются по мере роста уровня.</p>
        )}
      </section>
    </main>
  );
}
