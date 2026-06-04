/**
 * TextReader.tsx — reads one text/dialog: speaker labels, Finnish lines with Russian beneath
 * (toggleable), per-line and play-all TTS, a "read" marker, and — for dialogs — a launch into
 * role-play (DialogPlay). Pure presentation over a ReadingText; all TTS via useSpeechSynthesis.
 */

import { useState } from "react";
import type { ReadingText } from "../core/reading";
import { rolesOf } from "../core/reading";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import DialogPlay from "./DialogPlay";

interface TextReaderProps {
  text: ReadingText;
  isRead: boolean;
  onBack: () => void;
  onMarkRead: () => void;
  /** Count a finished role-play toward today's lessons. */
  onLessonDone: () => void;
}

export default function TextReader({ text, isRead, onBack, onMarkRead, onLessonDone }: TextReaderProps) {
  const [showRu, setShowRu] = useState(true);
  const [playing, setPlaying] = useState(false);
  const tts = useSpeechSynthesis("fi-FI");
  const isDialog = text.type === "dialog" && rolesOf(text).length >= 2;

  if (playing) {
    return (
      <DialogPlay
        text={text}
        onExit={() => setPlaying(false)}
        onComplete={() => {
          onMarkRead();
          onLessonDone();
          setPlaying(false);
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

        <ul className="lines">
          {text.lines.map((line, i) => (
            <li key={`${text.id}-${i}`} className="line">
              {line.speaker && <span className="line__who">{line.speaker}</span>}
              <div className="line__body">
                <span className="line__fi" lang="fi">
                  {line.fi}
                </span>
                {showRu && (
                  <span className="line__ru" lang="ru">
                    {line.ru}
                  </span>
                )}
              </div>
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
          ))}
        </ul>

        <div className="textreader__actions">
          <button type="button" className="next" onClick={() => setPlaying(true)}>
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
