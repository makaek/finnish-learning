/**
 * DialogPlay.tsx — rehearse a dialog by role (наизусть practice).
 *
 * Pick a role; the app reads the OTHER parts aloud (TTS) and shows them, and steps through
 * line by line. On YOUR lines it shows a Russian hint with a "Показать" reveal (+🔊) and an
 * optional microphone — lenient and self-paced, NOT graded (recitation aid, not a quiz).
 */

import { useEffect, useMemo, useState } from "react";
import type { ReadingText } from "../core/reading";
import { rolesOf } from "../core/reading";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useSpeechRecognition } from "./useSpeechRecognition";

interface DialogPlayProps {
  text: ReadingText;
  onExit: () => void;
  onComplete: () => void;
}

export default function DialogPlay({ text, onExit, onComplete }: DialogPlayProps) {
  const roles = useMemo(() => rolesOf(text), [text]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState("");

  const tts = useSpeechSynthesis("fi-FI");
  const { supported: ttsSupported, speak } = tts;

  const line = idx < text.lines.length ? text.lines[idx] : undefined;
  const mine = !!(myRole && line && line.speaker === myRole);

  // Capture the learner's speech only on their turn; result is shown, never graded.
  const speech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: mine,
    onResult: (alts) => setHeard(alts[0] ?? ""),
  });

  // On each new line: reset the per-line UI and auto-play the partner's line.
  useEffect(() => {
    setRevealed(false);
    setHeard("");
    const l = text.lines[idx];
    if (myRole && l && l.speaker !== myRole && ttsSupported) speak(l.fi);
  }, [idx, myRole, text, ttsSupported, speak]);

  // --- Role picker -----------------------------------------------------------------------
  if (myRole === null) {
    return (
      <main className="app app--scroll">
        <button type="button" className="exit" onClick={onExit}>
          ← Назад
        </button>
        <section className="card card--summary">
          <h1 className="prompt">🎭 {text.title}</h1>
          <p className="hint">Выберите свою роль — остальные реплики озвучит приложение:</p>
          <div className="rolepick">
            {roles.map((r) => (
              <button key={r} type="button" className="next" onClick={() => setMyRole(r)}>
                {r}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  // --- Completion ------------------------------------------------------------------------
  if (!line) {
    return (
      <main className="app">
        <section className="card card--summary">
          <h1 className="prompt">🎉 Готово!</h1>
          <p className="hint">Вы прошли диалог в роли «{myRole}».</p>
          <div className="rolepick">
            <button type="button" className="next" onClick={onComplete}>
              Готово
            </button>
            <button type="button" className="option" onClick={() => setIdx(0)}>
              Ещё раз
            </button>
            <button
              type="button"
              className="option"
              onClick={() => {
                setMyRole(null);
                setIdx(0);
              }}
            >
              Сменить роль
            </button>
          </div>
        </section>
      </main>
    );
  }

  // --- Step through ----------------------------------------------------------------------
  const advance = () => setIdx((i) => i + 1);

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onExit}>
        ← Выйти
      </button>
      <section className="card" aria-live="polite">
        <p className="progress">
          Реплика {idx + 1} из {text.lines.length} · ваша роль: {myRole}
        </p>

        <div className={"turn" + (mine ? " turn--mine" : "")}>
          <span className="line__who">{line.speaker}</span>

          {mine ? (
            <>
              <p className="hint" lang="ru">
                Ваша реплика: «{line.ru}»
              </p>
              {revealed ? (
                <p className="turn__fi" lang="fi">
                  {line.fi}{" "}
                  {ttsSupported && (
                    <button
                      type="button"
                      className="line__play"
                      onClick={() => speak(line.fi)}
                      aria-label="Прослушать"
                    >
                      🔊
                    </button>
                  )}
                </p>
              ) : (
                <button type="button" className="chip" onClick={() => setRevealed(true)}>
                  👁 Показать
                </button>
              )}
              {speech.supported && (
                <button
                  type="button"
                  className={"mic" + (speech.listening ? " mic--on" : "")}
                  onClick={() => (speech.listening ? speech.stop() : speech.start())}
                  aria-label="Сказать реплику"
                >
                  {speech.listening ? "● Слушаю…" : "🎤 Сказать"}
                </button>
              )}
              {heard && (
                <p className="hint" lang="fi">
                  Распознано: {heard}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="turn__fi" lang="fi">
                {line.fi}
              </p>
              <p className="hint" lang="ru">
                {line.ru}
              </p>
              {ttsSupported && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => speak(line.fi)}
                  aria-label="Прослушать ещё раз"
                >
                  🔊 Ещё раз
                </button>
              )}
            </>
          )}
        </div>

        <button type="button" className="next" onClick={advance}>
          {idx + 1 >= text.lines.length ? "Завершить" : "Дальше →"}
        </button>
      </section>
    </main>
  );
}
