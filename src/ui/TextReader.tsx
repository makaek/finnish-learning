/**
 * TextReader.tsx — reads one text/dialog: speaker labels, Finnish lines with Russian beneath
 * (toggleable), tap-a-word glosses + per-line translate, per-line and play-all TTS, a "read"
 * marker, a launch into the comprehension quiz, and — for dialogs — role-play (DialogPlay).
 * Pure presentation over a ReadingText; all TTS via useSpeechSynthesis.
 */

import { useState } from "react";
import type { ReadingText } from "../core/reading";
import type { Grade } from "../core/grader.contract";
import { glossKey, rolesOf, tokenizeLine } from "../core/reading";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import DialogPlay from "./DialogPlay";
import ReadingQuiz from "./ReadingQuiz";

interface TextReaderProps {
  text: ReadingText;
  isRead: boolean;
  /** Comprehension grader (from data/texts.ts), used by the quiz. */
  grade: Grade;
  onBack: () => void;
  onMarkRead: () => void;
  /** Count a finished role-play / quiz toward today's lessons. */
  onLessonDone: () => void;
  /** Record a finished comprehension quiz on this text's reading track. */
  onReadingResult: (textId: string, allCorrect: boolean) => void;
  /** Record that this text was recited наизусть in one role (the second part of mastery). */
  onRecited: (textId: string, role: string) => void;
}

export default function TextReader({
  text,
  isRead,
  grade,
  onBack,
  onMarkRead,
  onLessonDone,
  onReadingResult,
  onRecited,
}: TextReaderProps) {
  const [showRu, setShowRu] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [quizzing, setQuizzing] = useState(false);
  // Per-line RU revealed individually (in addition to the global toggle).
  const [lineRu, setLineRu] = useState<Set<number>>(new Set());
  // The single open word gloss, as "lineIndex:tokenIndex" → its Russian.
  const [openGloss, setOpenGloss] = useState<{ key: string; ru: string } | null>(null);
  const tts = useSpeechSynthesis("fi-FI");
  const isDialog = text.type === "dialog" && rolesOf(text).length >= 2;
  const hasQuestions = (text.questions?.length ?? 0) > 0;

  const toggleLineRu = (i: number) =>
    setLineRu((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (playing) {
    return (
      <DialogPlay
        text={text}
        onExit={() => setPlaying(false)}
        onComplete={(role) => {
          onRecited(text.id, role);
          onMarkRead();
          onLessonDone();
          setPlaying(false);
        }}
      />
    );
  }

  if (quizzing) {
    return (
      <ReadingQuiz
        text={text}
        grade={grade}
        onExit={() => setQuizzing(false)}
        onComplete={(allCorrect) => {
          // Two intentional writes: the graded `reading` track (level completion + dashboard) and
          // the device-local read-set (library ✓ + the "Прочитано без вопросов" fallback label).
          onReadingResult(text.id, allCorrect);
          onMarkRead();
          onLessonDone();
          setQuizzing(false);
        }}
      />
    );
  }

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← Назад
      </button>
      <section className="card">
        <h1 className="prompt prompt--home">{text.title}</h1>

        <div className="textreader__bar">
          <button
            type="button"
            className="chip"
            onClick={() => setShowRu((v) => !v)}
            aria-pressed={showRu}
          >
            {showRu ? "🙈 Скрыть перевод" : "👁 Показать перевод"}
          </button>
          {tts.supported && (
            <button
              type="button"
              className={"chip" + (tts.speaking ? " chip--on" : "")}
              onClick={() =>
                tts.speaking ? tts.cancel() : tts.speakMany(text.lines.map((l) => l.fi))
              }
              aria-label={tts.speaking ? "Остановить" : "Прослушать всё"}
            >
              {tts.speaking ? "⏹ Остановить" : "▶ Прослушать всё"}
            </button>
          )}
        </div>

        <p className="hint hint--quiet">Нажмите на слово — перевод; 🌐 — перевод строки.</p>
        <ul className="lines">
          {text.lines.map((line, i) => {
            const showLineRu = showRu || lineRu.has(i);
            return (
              <li key={`${text.id}-${i}`} className="line">
                {line.speaker && <span className="line__who">{line.speaker}</span>}
                <div className="line__body">
                  <span className="line__fi" lang="fi">
                    {tokenizeLine(line.fi).map((token, t) => {
                      const gloss = line.glosses?.[glossKey(token)];
                      if (!gloss) return <span key={t}>{token} </span>;
                      const key = `${i}:${t}`;
                      const open = openGloss?.key === key;
                      return (
                        <span key={t}>
                          <button
                            type="button"
                            className={"word" + (open ? " word--on" : "")}
                            onClick={() => setOpenGloss(open ? null : { key, ru: gloss })}
                          >
                            {token}
                          </button>{" "}
                        </span>
                      );
                    })}
                  </span>
                  {openGloss && openGloss.key.startsWith(`${i}:`) && (
                    <span className="line__gloss" lang="ru">
                      {openGloss.ru}
                    </span>
                  )}
                  {showLineRu && (
                    <span className="line__ru" lang="ru">
                      {line.ru}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="line__play"
                  onClick={() => toggleLineRu(i)}
                  aria-label="Перевести строку"
                  title="Перевод строки"
                >
                  🌐
                </button>
                {tts.supported && (
                  <button
                    type="button"
                    className="line__play"
                    onClick={() => tts.speak(line.fi)}
                    aria-label="Прослушать строку"
                  >
                    🔊
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="textreader__actions">
          {hasQuestions && (
            <button type="button" className="next" onClick={() => setQuizzing(true)}>
              ❓ Ответить на вопросы
            </button>
          )}
          <button type="button" className={hasQuestions ? "option" : "next"} onClick={() => setPlaying(true)}>
            {isDialog ? "🎭 Разыграть диалог" : "🎙 Рассказать наизусть"}
          </button>
          <button
            type="button"
            className="option"
            onClick={onMarkRead}
            disabled={isRead}
          >
            {isRead ? "✓ Прочитано" : "Отметить прочитанным"}
          </button>
        </div>
      </section>
    </main>
  );
}
