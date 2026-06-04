/**
 * DialogPlay.tsx — rehearse a dialog by role (наизусть practice), in two modes.
 *
 * MANUAL: step through line by line. The app reads the OTHER parts aloud and shows them; on
 * YOUR lines it shows a Russian hint with a "Показать" reveal (+🔊) and an optional mic.
 * AUTO: hands-free. The app plays the partner's line, then pauses a recall window for you to
 * say YOUR line from memory (no reveal), then plays your line back as confirmation and moves
 * on — a natural, automatic conversation. Lenient and self-paced; never graded.
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

type Mode = "manual" | "auto";

// Auto-mode pacing (ms). The recall window scales with line length so longer lines get more
// thinking time; the gaps make the exchange feel like a real conversation.
const GAP_MS = 550;
const recallMs = (fi: string) => Math.min(6000, 1800 + fi.length * 55);
/** Fallback timing when there's no TTS voice — how long to leave a line on screen to read. */
const readMs = (fi: string) => Math.min(7000, 1200 + fi.length * 55);

export default function DialogPlay({ text, onExit, onComplete }: DialogPlayProps) {
  const roles = useMemo(() => rolesOf(text), [text]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("manual");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState("");
  // Auto-mode play/pause.
  const [running, setRunning] = useState(true);

  const tts = useSpeechSynthesis("fi-FI");
  const { supported: ttsSupported, speak, cancel } = tts;

  const line = idx < text.lines.length ? text.lines[idx] : undefined;
  const mine = !!(myRole && line && line.speaker === myRole);

  // Manual-mode mic: capture the learner's speech on their turn; shown, never graded.
  const speech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: mode === "manual" && mine,
    onResult: (alts) => setHeard(alts[0] ?? ""),
  });

  // MANUAL: on each new line reset the per-line UI and auto-play the partner's line.
  useEffect(() => {
    if (mode !== "manual") return;
    setRevealed(false);
    setHeard("");
    const l = text.lines[idx];
    if (myRole && l && l.speaker !== myRole && ttsSupported) speak(l.fi);
  }, [idx, myRole, mode, text, ttsSupported, speak]);

  // AUTO: drive the conversation hands-free. Speaks the partner's line then advances; on your
  // line it waits a recall window, then speaks it back as confirmation and advances. All timers
  // and TTS are torn down on pause/stop/line-change/unmount so nothing runs away.
  useEffect(() => {
    if (mode !== "auto" || myRole === null || !running) return;
    const l = text.lines[idx];
    if (!l) return; // reached the end — completion screen handles it
    let cancelled = false;
    let timer = 0;
    const after = (ms: number, fn: () => void) => {
      if (cancelled) return;
      timer = window.setTimeout(() => !cancelled && fn(), ms);
    };
    const goNext = () => !cancelled && setIdx((i) => i + 1);

    setHeard("");
    if (l.speaker !== myRole) {
      // Partner's turn: show + speak, then advance.
      setRevealed(true);
      if (ttsSupported) speak(l.fi, () => after(GAP_MS, goNext));
      else after(readMs(l.fi), goNext);
    } else {
      // Your turn: cue only (say it from memory), then reveal + speak as confirmation.
      setRevealed(false);
      after(recallMs(l.fi), () => {
        setRevealed(true);
        if (ttsSupported) speak(l.fi, () => after(GAP_MS, goNext));
        else goNext();
      });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancel();
    };
  }, [idx, running, mode, myRole, text, ttsSupported, speak, cancel]);

  const startAs = (role: string) => {
    setIdx(0);
    setRunning(true);
    setMyRole(role);
  };
  const stopAuto = () => {
    cancel();
    setMyRole(null);
    setIdx(0);
  };

  // --- Role picker -----------------------------------------------------------------------
  if (myRole === null) {
    return (
      <main className="app app--scroll">
        <button type="button" className="exit" onClick={onExit}>
          ← Назад
        </button>
        <section className="card card--summary">
          <h1 className="prompt">🎭 {text.title}</h1>
          <div className="textreader__bar dialog__modes">
            <button
              type="button"
              className={"chip" + (mode === "manual" ? " chip--on" : "")}
              onClick={() => setMode("manual")}
              aria-pressed={mode === "manual"}
            >
              ✋ Ручной
            </button>
            <button
              type="button"
              className={"chip" + (mode === "auto" ? " chip--on" : "")}
              onClick={() => setMode("auto")}
              aria-pressed={mode === "auto"}
            >
              ▶ Авто
            </button>
          </div>
          <p className="hint">
            {mode === "auto"
              ? "Авто: слушайте реплики и отвечайте по памяти — без подсказок."
              : "Выберите роль — остальные реплики озвучит приложение."}
          </p>
          <div className="rolepick">
            {roles.map((r) => (
              <button key={r} type="button" className="next" onClick={() => startAs(r)}>
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
            <button
              type="button"
              className="option"
              onClick={() => {
                setIdx(0);
                setRunning(true);
              }}
            >
              Ещё раз
            </button>
            <button type="button" className="option" onClick={stopAuto}>
              Сменить роль
            </button>
          </div>
        </section>
      </main>
    );
  }

  // --- Auto step -------------------------------------------------------------------------
  if (mode === "auto") {
    return (
      <main className="app app--scroll">
        <button type="button" className="exit" onClick={onExit}>
          ← Выйти
        </button>
        <section className="card" aria-live="polite">
          <p className="progress">
            Реплика {idx + 1} из {text.lines.length} · роль: {myRole} · ▶ авто
          </p>
          <div className={"turn" + (mine ? " turn--mine" : "")}>
            <span className="line__who">{line.speaker}</span>
            {mine ? (
              <>
                <p className="hint" lang="ru">
                  Ваша очередь: «{line.ru}»
                </p>
                {revealed ? (
                  <p className="turn__fi" lang="fi">
                    {line.fi}
                  </p>
                ) : (
                  <p className="hint">🎤 Скажите свою реплику по памяти…</p>
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
              </>
            )}
          </div>
          <div className="rolepick">
            <button type="button" className="next" onClick={() => setRunning((r) => !r)}>
              {running ? "⏸ Пауза" : "▶ Продолжить"}
            </button>
            <button type="button" className="option" onClick={stopAuto}>
              ⏹ Стоп
            </button>
          </div>
        </section>
      </main>
    );
  }

  // --- Manual step -----------------------------------------------------------------------
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
