/**
 * DialogPlay.tsx — rehearse a text by role (наизусть practice), in two modes.
 *
 * Works for dialogs (pick a role) AND monologues (recite every line yourself).
 *  - MANUAL: step through line by line. The app reads the OTHER parts aloud and shows them; on
 *    YOUR lines it shows a Russian hint with a "Показать" reveal (+🔊) and an optional mic.
 *  - AUTO: hands-free. The app plays the partner's line, then on YOUR line it LISTENS — you say
 *    the line from memory and must say it (near-)correctly to advance (lenient match, with a
 *    manual override / show / skip). Then it reveals + confirms aloud and moves on. Never graded.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReadingText } from "../core/reading";
import { rolesOf, spokenMatches } from "../core/reading";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useSpeechRecognition } from "./useSpeechRecognition";

interface DialogPlayProps {
  text: ReadingText;
  onExit: () => void;
  onComplete: () => void;
}

type Mode = "manual" | "auto";

// Auto-mode pacing (ms). Recall scales with line length; gaps make the exchange feel natural.
const GAP_MS = 550;
const recallMs = (fi: string) => Math.min(6000, 1800 + fi.length * 55);
/** Fallback timing when there's no TTS voice — how long to leave a line on screen to read. */
const readMs = (fi: string) => Math.min(7000, 1200 + fi.length * 55);
/** Sentinel "role" for a monologue, where every line is the learner's to recite. (Reserved —
 *  authored texts must not use "__solo__" as a speaker name.) */
const SOLO = "__solo__";

export default function DialogPlay({ text, onExit, onComplete }: DialogPlayProps) {
  const roles = useMemo(() => rolesOf(text), [text]);
  const isMonologue = roles.length < 2;

  const [myRole, setMyRole] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("manual");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState("");
  const [matched, setMatched] = useState(false);
  const [running, setRunning] = useState(true); // auto play/pause

  const tts = useSpeechSynthesis("fi-FI");
  const { supported: ttsSupported, speak, cancel } = tts;

  const started = myRole !== null;
  const line = idx < text.lines.length ? text.lines[idx] : undefined;
  const mine = !!(started && line && (isMonologue || line.speaker === myRole));

  // Recognition is available on the learner's turn. In AUTO it gates advancing (a matching
  // utterance passes the line); in MANUAL it's an optional self-check. Disabled once `matched`
  // so the recognizer is released between turns.
  const speech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: started && mine && running && !matched,
    onResult: (alts) => {
      setHeard(alts[0] ?? "");
      if (mode === "auto" && line && alts.some((a) => spokenMatches(line.fi, a))) {
        setMatched(true);
      }
    },
  });
  const { supported: recogSupported, listening, start: startListening, stop: stopListening } =
    speech;

  // MANUAL: reset the per-line UI and auto-play the partner's line.
  useEffect(() => {
    if (mode !== "manual") return;
    setRevealed(false);
    setHeard("");
    setMatched(false);
    const l = text.lines[idx];
    if (started && l && !(isMonologue || l.speaker === myRole) && ttsSupported) speak(l.fi);
  }, [idx, myRole, mode, text, ttsSupported, speak, started, isMonologue]);

  // AUTO stage: partner line → speak then advance; your line → wait for voice (or, with no
  // recognizer, a timed recall then reveal + advance). Timers/TTS are torn down on every change.
  useEffect(() => {
    if (mode !== "auto" || !started || !running) return;
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
    setMatched(false);
    const isMine = isMonologue || l.speaker === myRole;
    if (!isMine) {
      setRevealed(true);
      if (ttsSupported) speak(l.fi, () => after(GAP_MS, goNext));
      else after(readMs(l.fi), goNext);
    } else if (!recogSupported) {
      // No mic: time the recall, then reveal + confirm + advance.
      setRevealed(false);
      after(recallMs(l.fi), () => {
        setRevealed(true);
        if (ttsSupported) speak(l.fi, () => after(GAP_MS, goNext));
        else after(GAP_MS, goNext);
      });
    } else {
      // Voice-gated: the listening + match effects below drive the advance.
      setRevealed(false);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancel();
    };
  }, [idx, running, mode, myRole, text, ttsSupported, speak, cancel, started, isMonologue, recogSupported]);

  // AUTO listening: keep the mic open on a voice-gated turn until the learner says the line.
  useEffect(() => {
    if (mode !== "auto" || !started || !running || !mine || matched || !recogSupported) return;
    if (listening) return;
    const id = window.setTimeout(() => startListening(), 300);
    return () => clearTimeout(id);
  }, [mode, started, running, mine, matched, recogSupported, listening, startListening, idx]);

  // AUTO advance-on-match: once the line is said (or force-accepted), briefly reveal it and move
  // on — WITHOUT re-speaking it (the app repeating your own line just killed the rhythm).
  useEffect(() => {
    if (mode !== "auto" || !matched || !running) return;
    let cancelled = false;
    setRevealed(true);
    stopListening();
    // Clear `matched` together with the advance so the NEXT line doesn't re-trigger this effect
    // in the same commit (which would spoil a your-turn line by revealing it early).
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setMatched(false);
      setIdx((i) => i + 1);
    }, GAP_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancel();
    };
  }, [matched, mode, running, cancel, stopListening]);

  const startAs = (role: string) => {
    setIdx(0);
    setRunning(true);
    setMatched(false);
    setMyRole(role);
  };
  const reset = () => {
    cancel();
    stopListening();
    setMyRole(null);
    setIdx(0);
    setMatched(false);
  };

  // --- Start screen (role picker / monologue start) --------------------------------------
  if (!started) {
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
              ? recogSupported
                ? "Авто: слушайте реплики и произносите свои вслух — нужно сказать правильно, чтобы продолжить."
                : "Авто: слушайте реплики и отвечайте по памяти (микрофон недоступен — по таймеру)."
              : isMonologue
                ? "Рассказывайте текст по памяти, строка за строкой."
                : "Выберите роль — остальные реплики озвучит приложение."}
          </p>
          <div className="rolepick">
            {isMonologue ? (
              <button type="button" className="next" onClick={() => startAs(SOLO)}>
                ▶ Начать
              </button>
            ) : (
              roles.map((r) => (
                <button key={r} type="button" className="next" onClick={() => startAs(r)}>
                  {r}
                </button>
              ))
            )}
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
          <p className="hint">
            {isMonologue ? "Вы рассказали текст." : `Вы прошли диалог в роли «${myRole}».`}
          </p>
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
                setMatched(false);
              }}
            >
              Ещё раз
            </button>
            <button type="button" className="option" onClick={reset}>
              {isMonologue ? "В начало" : "Сменить роль"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  const who = isMonologue ? "Вы" : line.speaker;

  // --- Auto step -------------------------------------------------------------------------
  if (mode === "auto") {
    return (
      <main className="app app--scroll">
        <button type="button" className="exit" onClick={onExit}>
          ← Выйти
        </button>
        <section className="card" aria-live="polite">
          <p className="progress">
            Реплика {idx + 1} из {text.lines.length}
            {isMonologue ? "" : ` · роль: ${myRole}`} · ▶ авто
          </p>
          <div className={"turn" + (mine ? " turn--mine" : "")}>
            <span className="line__who">{who}</span>
            {mine ? (
              <>
                <p className="hint" lang="ru">
                  Ваша реплика: «{line.ru}»
                </p>
                {revealed ? (
                  <p className="turn__fi" lang="fi">
                    {line.fi}
                  </p>
                ) : (
                  <p className="hint">
                    {recogSupported
                      ? listening
                        ? "🎤 Слушаю… произнесите реплику"
                        : "🎤 Скажите свою реплику по памяти"
                      : "🤔 Вспоминайте реплику…"}
                  </p>
                )}
                {heard && !matched && (
                  <p className="hint" lang="fi">
                    Распознано: {heard}
                  </p>
                )}
                {recogSupported && !matched && (
                  <div className="textreader__bar">
                    <button type="button" className="chip" onClick={() => setRevealed(true)}>
                      👁 Показать
                    </button>
                    <button type="button" className="chip" onClick={() => setMatched(true)}>
                      ✓ Засчитать
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        setMatched(false);
                        setIdx((i) => i + 1);
                      }}
                    >
                      ⏭ Пропустить
                    </button>
                  </div>
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
            <button type="button" className="option" onClick={reset}>
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
          Реплика {idx + 1} из {text.lines.length}
          {isMonologue ? "" : ` · ваша роль: ${myRole}`}
        </p>

        <div className={"turn" + (mine ? " turn--mine" : "")}>
          <span className="line__who">{who}</span>

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
              {recogSupported && (
                <button
                  type="button"
                  className={"mic" + (listening ? " mic--on" : "")}
                  onClick={() => (listening ? stopListening() : startListening())}
                  aria-label="Сказать реплику"
                >
                  {listening ? "● Слушаю…" : "🎤 Сказать"}
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
