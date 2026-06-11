/**
 * Reading.tsx — the reading library (LibR): texts/dialogs grouped by level, each row showing its
 * two-part mastery («Прочитано» = вопросы + наизусть). Browsing + difficulty gating only; the
 * reading, quiz, and recite live in TextReader. Opened from the home "Чтение" cards, so it takes a
 * `filterType` and an `onBack`.
 */

import { useMemo, useState } from "react";
import {
  activeLevel,
  levelStats,
  readingLearned,
  readingMastered,
  reciteComplete,
  unlockedLevelsWith,
  type VocabLike,
} from "../core/levels";
import type { ProgressMap } from "../core/progress";
import { isTextUnlocked, type ReadingText } from "../core/reading";
import type { Grade } from "../core/grader.contract";
import { UiIcon } from "./icons";
import { Avatar, MasteryMark, type MasteryState } from "./readingKit";
import TextReader from "./TextReader";

interface ReadingProps {
  vocab: readonly VocabLike[];
  /** The active language's reading library (levelled, sorted). */
  texts: readonly ReadingText[];
  /** The active language's reading-comprehension grader. */
  gradeQuestion: Grade;
  /** BCP-47 locale for TTS/recognition so the target language sounds native (e.g. "en-US"). */
  speechLang: string;
  progress: ProgressMap;
  testMode: boolean;
  /** Mark a text/dialog as finished (counts a lesson / sets the read flag). */
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

/** The mastery state of one library item, given the learner's progress and whether it's unlocked. */
function itemState(
  progress: ProgressMap,
  textId: string,
  hasQuestions: boolean,
  unlocked: boolean,
): { state: MasteryState; quizDone: boolean } {
  const quizDone = hasQuestions && readingLearned(progress, textId);
  const reciteDone = reciteComplete(progress, textId);
  if (!unlocked) return { state: "locked", quizDone };
  if (readingMastered(progress, textId, hasQuestions)) return { state: "mastered", quizDone };
  // Only a quizzed text has a meaningful "1 of 2" middle state (a question-less text has just the
  // one recite task, so it goes straight new → mastered).
  if (hasQuestions && (quizDone || reciteDone)) return { state: "progress", quizDone };
  return { state: "new", quizDone };
}

export default function Reading({
  vocab,
  texts,
  gradeQuestion,
  speechLang,
  progress,
  testMode,
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

  const isDialog = filterType === "dialog";
  const shown: ReadingText[] = useMemo(
    () => (filterType ? texts.filter((t) => (t.type ?? "text") === filterType) : [...texts]),
    [texts, filterType],
  );
  const title = isDialog ? "Диалоги" : filterType === "text" ? "Тексты" : "Чтение";

  // texts are already sorted by level then id; group consecutively by level.
  const groups = useMemo(() => {
    const out: { lv: number; items: ReadingText[] }[] = [];
    for (const t of shown) {
      const g = out.find((x) => x.lv === t.level);
      if (g) g.items.push(t);
      else out.push({ lv: t.level, items: [t] });
    }
    return out;
  }, [shown]);

  const masteredCount = shown.filter((t) =>
    readingMastered(progress, t.id, (t.questions?.length ?? 0) > 0),
  ).length;

  const openText = openId ? texts.find((t) => t.id === openId) : undefined;
  if (openText) {
    return (
      <TextReader
        key={openText.id}
        text={openText}
        progress={progress}
        grade={gradeQuestion}
        speechLang={speechLang}
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
        <div className="rd-libhead">
          <span className="rd-tile">
            <UiIcon name={isDialog ? "masks" : "book"} size={25} />
          </span>
          <h1 className="rd-libhead__title">{title}</h1>
          <div className="rd-counter">
            <div>
              <span className="rd-counter__n">{masteredCount}</span>
              <span className="rd-counter__d">/{shown.length}</span>
            </div>
            <div className="rd-counter__k">ПРОЧИТАНО</div>
          </div>
        </div>

        <div className="rd-legend">
          <span className="rd-legend__k">Прочитано =</span>
          <span className="rd-legend__part">
            <span style={{ display: "flex", color: "var(--rd-teal)" }}>
              <UiIcon name="rules" size={14} />
            </span>
            вопросы
          </span>
          <span className="rd-legend__k">+</span>
          <span className="rd-legend__part">
            <span style={{ display: "flex", color: "var(--rd-violet)" }}>
              <UiIcon name="mic" size={14} />
            </span>
            наизусть
          </span>
        </div>

        {groups.map((g) => (
          <div className="rd-group" key={g.lv}>
            <div className="rd-grouphd">
              <span className="rd-grouphd__t">УРОВЕНЬ {g.lv}</span>
              <span className="rd-grouphd__line" />
            </div>
            <ul className="rd-rows" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {g.items.map((t) => {
                const hasQuestions = (t.questions?.length ?? 0) > 0;
                const unlocked = testMode || isTextUnlocked(t, currentLevel);
                const { state, quizDone } = itemState(progress, t.id, hasQuestions, unlocked);
                const tone =
                  state === "mastered"
                    ? "var(--read)"
                    : state === "progress"
                      ? "var(--rd-violet)"
                      : "var(--muted)";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={
                        "rd-row" +
                        (state === "mastered" ? " rd-row--mastered" : "") +
                        (state === "locked" ? " rd-row--locked" : "")
                      }
                      disabled={state === "locked"}
                      onClick={() => setOpenId(t.id)}
                      aria-label={`${t.title}, уровень ${t.level}${
                        state === "mastered" ? " — прочитано" : state === "locked" ? " — закрыто" : ""
                      }`}
                    >
                      <Avatar letter={t.title[0] ?? "•"} color={tone} size={36} />
                      <div className="rd-row__main">
                        <div className="rd-row__title">{t.title}</div>
                        {state === "progress" && (
                          <div className="rd-row__sub">
                            {quizDone ? "вопросы ✓ · осталось наизусть" : "наизусть ✓ · остались вопросы"}
                          </div>
                        )}
                      </div>
                      <MasteryMark state={state} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {shown.length === 0 && <p className="hint">Здесь пока пусто.</p>}
        {!testMode && shown.length > 0 && currentLevel < Math.max(...shown.map((t) => t.level)) && (
          <p className="hint">Новые тексты открываются по мере роста уровня.</p>
        )}
      </section>
    </main>
  );
}
