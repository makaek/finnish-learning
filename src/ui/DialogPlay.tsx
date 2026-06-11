/**
 * DialogPlay.tsx — recite a text/dialog by memory (наизусть), hands-free, chat-styled
 * (RolesR role picker + ReciteR line view). Works for dialogs (recite each role) and monologues
 * (recite the whole thing). The app plays the partner's line, then LISTENS on yours — you say it
 * from memory and must say it (near-)correctly to advance (lenient match, with show / accept /
 * skip). Each finished role is recorded immediately (the second part of mastery). Never graded.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadingText } from "../core/reading";
import { SOLO_ROLE, rolesOf, spokenMatches } from "../core/reading";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useOnline } from "./useOnline";
import { UiIcon } from "./icons";
import { Avatar, ChatHead, IconBtn } from "./readingKit";
import { plReplika, speakerColor } from "./readingFormat";

interface DialogPlayProps {
  text: ReadingText;
  /** BCP-47 locale for TTS/recognition so the target language sounds native (e.g. "en-US"). */
  speechLang: string;
  /** Roles already recited (from saved progress) — shown as done in the picker. */
  recitedRoles: ReadonlySet<string>;
  /** Called when a role is fully recited; `role` is the speaker (or {@link SOLO_ROLE} for a monologue). */
  onRoleComplete: (role: string) => void;
  onExit: () => void;
}

// Pacing (ms). Recall scales with line length; gaps make the exchange feel natural.
const GAP_MS = 550;
const recallMs = (fi: string) => Math.min(6000, 1800 + fi.length * 55);
/** Fallback timing when there's no TTS voice — how long to leave a line on screen to read. */
const readMs = (fi: string) => Math.min(7000, 1200 + fi.length * 55);
const SOLO = SOLO_ROLE;

export default function DialogPlay({ text, speechLang, recitedRoles, onRoleComplete, onExit }: DialogPlayProps) {
  const roles = useMemo(() => rolesOf(text), [text]);
  const isMonologue = roles.length < 2;

  const [myRole, setMyRole] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState("");
  const [matched, setMatched] = useState(false);
  const [running, setRunning] = useState(true); // play/pause
  const [localDone, setLocalDone] = useState<Set<string>>(new Set());
  const [justFinished, setJustFinished] = useState(false);
  const finishedRef = useRef(false);

  const tts = useSpeechSynthesis(speechLang);
  const { supported: ttsSupported, speak, cancel } = tts;

  const started = myRole !== null;
  const line = idx < text.lines.length ? text.lines[idx] : undefined;
  const mine = !!(started && line && (isMonologue || line.speaker === myRole));
  const doneRole = (r: string) => recitedRoles.has(r) || localDone.has(r);

  // Offline / recognizer-failure handling: recognition needs the cloud service, so when offline
  // (or after a runtime "network" error — captive portals read as online) the recite falls back
  // to the SAME timed-recall flow used for unsupported browsers, instead of wedging the learner
  // on a mic that will never hear them. `recogFailed` clears once connectivity returns.
  const online = useOnline();
  const [recogFailed, setRecogFailed] = useState(false);

  // Recognition is available on the learner's turn and gates advancing (a matching utterance
  // passes the line). Disabled once `matched` so the recognizer is released between turns, and
  // while voice is unusable (offline) so a dead recognizer is never started.
  const speech = useSpeechRecognition({
    lang: speechLang,
    enabled: started && mine && running && !matched && online && !recogFailed,
    onResult: (alts) => {
      setHeard(alts[0] ?? "");
      if (line && alts.some((a) => spokenMatches(line.fi, a))) setMatched(true);
    },
  });
  const { supported: recogSupported, listening, start: startListening, stop: stopListening } =
    speech;

  useEffect(() => {
    if (speech.error === "network") setRecogFailed(true);
  }, [speech.error]);
  useEffect(() => {
    if (online) setRecogFailed(false);
  }, [online]);

  /** Voice can actually gate this turn (API present AND the cloud service reachable). */
  const voiceUsable = recogSupported && online && !recogFailed;

  // Stage: partner line → speak then advance; your line → wait for voice (or, with no recognizer,
  // a timed recall then reveal + advance). Timers/TTS are torn down on every change.
  useEffect(() => {
    if (!started || !running) return;
    const l = text.lines[idx];
    if (!l) return; // reached the end — the completion effect handles it
    let cancelled = false;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => {
      if (cancelled) return;
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };
    let advanced = false;
    const goNext = () => {
      if (cancelled || advanced) return;
      advanced = true;
      setIdx((i) => i + 1);
    };
    const speakThenAdvance = (fi: string) => {
      speak(fi, () => after(GAP_MS, goNext));
      after(readMs(fi) + 2500, goNext);
    };

    setHeard("");
    setMatched(false);
    const isMine = isMonologue || l.speaker === myRole;
    if (!isMine) {
      setRevealed(true);
      if (ttsSupported) speakThenAdvance(l.fi);
      else after(readMs(l.fi), goNext);
    } else if (!voiceUsable) {
      setRevealed(false);
      after(recallMs(l.fi), () => {
        setRevealed(true);
        if (ttsSupported) speakThenAdvance(l.fi);
        else after(GAP_MS, goNext);
      });
    } else {
      setRevealed(false);
    }

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      cancel();
    };
    // `voiceUsable` IS a dep: a mid-line network error re-runs the stage into the timed branch
    // (resetting heard/matched — acceptable), which un-wedges the learner.
  }, [idx, running, myRole, text, ttsSupported, speak, cancel, started, isMonologue, voiceUsable]);

  // Listening: keep the mic open on a voice-gated turn until the learner says the line.
  useEffect(() => {
    if (!started || !running || !mine || matched || !voiceUsable) return;
    if (listening) return;
    const id = window.setTimeout(() => startListening(), 300);
    return () => clearTimeout(id);
  }, [started, running, mine, matched, voiceUsable, listening, startListening, idx]);

  // Advance-on-match: once the line is said (or force-accepted), briefly reveal it and move on.
  useEffect(() => {
    if (!matched || !running) return;
    let cancelled = false;
    setRevealed(true);
    stopListening();
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
  }, [matched, running, cancel, stopListening]);

  // End of a role's playthrough → record it ONCE (guarded so re-renders from the parent's new
  // onRoleComplete identity can't double-fire), then flip `justFinished`.
  useEffect(() => {
    if (!started || idx < text.lines.length || finishedRef.current) return;
    finishedRef.current = true;
    const role = myRole ?? SOLO;
    onRoleComplete(role);
    setLocalDone((prev) => new Set(prev).add(role));
    setJustFinished(true);
  }, [started, idx, text.lines.length, myRole, onRoleComplete]);

  // Return to the picker shortly after finishing. Depends ONLY on `justFinished`, so the parent
  // re-rendering (new onRoleComplete) can't tear down its timer and strand the completion flash.
  useEffect(() => {
    if (!justFinished) return;
    const t = window.setTimeout(() => {
      setMyRole(null);
      setIdx(0);
      setJustFinished(false);
    }, 950);
    return () => clearTimeout(t);
  }, [justFinished]);

  const startAs = (role: string) => {
    finishedRef.current = false;
    setJustFinished(false);
    setIdx(0);
    setRunning(true);
    setMatched(false);
    setMyRole(role);
  };

  // --- Role picker (RolesR) --------------------------------------------------------------
  if (!started) {
    const pickRoles = isMonologue ? [SOLO] : roles;
    return (
      <main className="app app--scroll">
        <button type="button" className="exit" onClick={onExit}>
          ← Назад
        </button>
        <section className="card">
          <div className="rd-libhead">
            <span className="rd-tile">
              <UiIcon name="mic" size={24} />
            </span>
            <div style={{ flex: 1 }}>
              <h1 className="rd-libhead__title" style={{ fontSize: "1.4rem" }}>
                Наизусть
              </h1>
              <div className="rd-head__sub rd-head__sub--read">
                {isMonologue ? "расскажите текст по памяти" : "за все роли"}
              </div>
            </div>
          </div>
          <p className="hint">
            {voiceUsable
              ? isMonologue
                ? "Произнесите каждую реплику по памяти — приложение слушает."
                : "Чтобы освоить диалог, расскажите его наизусть в каждой роли. Можно в любом порядке."
              : recogSupported
                ? "Нет сети — рассказывайте по памяти, по таймеру."
                : "Микрофон недоступен — отвечайте по памяти, по таймеру."}
          </p>
          <div className="rd-rolepick">
            {pickRoles.map((r) => {
              const ok = doneRole(r);
              const count = text.lines.filter((l) => isMonologue || l.speaker === r).length;
              return (
                <button key={r} type="button" className="rd-row" onClick={() => startAs(r)}>
                  <Avatar
                    letter={isMonologue ? "Я" : (r[0] ?? "•")}
                    color={ok ? "var(--rd-green)" : isMonologue ? "var(--read)" : speakerColor(r, roles)}
                    size={38}
                  />
                  <div className="rd-row__main">
                    <div className="rd-row__title">
                      {isMonologue ? "Рассказать целиком" : `Роль · ${r}`}
                    </div>
                    <div className="rd-row__sub" style={ok ? { color: "var(--rd-green)" } : undefined}>
                      {ok ? "рассказано" : plReplika(count)}
                    </div>
                  </div>
                  {ok ? (
                    <span className="rd-discbtn rd-discbtn--done">
                      <UiIcon name="check" size={15} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="rd-discbtn">
                      <UiIcon name="play" size={15} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!isMonologue && (
            <div className="rd-note">
              <span style={{ color: "var(--read)", display: "flex" }}>
                <UiIcon name="trophy" size={18} />
              </span>
              <span>
                «Наизусть» зачтётся, когда пройдёте <b>все роли</b>.
              </span>
            </div>
          )}
        </section>
      </main>
    );
  }

  // --- Completion flash (between a finished role and the picker) --------------------------
  if (!line) {
    return (
      <main className="app">
        <section className="card">
          <div className="rd-center">
            <div className="rd-disc">
              <UiIcon name="check" size={38} strokeWidth={2.6} />
            </div>
            <div className="rd-title">{isMonologue ? "Готово!" : "Роль освоена"}</div>
          </div>
        </section>
      </main>
    );
  }

  // --- Recite step (ReciteR) -------------------------------------------------------------
  const who = isMonologue ? undefined : line.speaker;
  const whoColor = who ? speakerColor(who, roles) : "var(--muted)";
  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onExit}>
        ← Выйти
      </button>
      <section className="card" aria-live="polite">
        <ChatHead
          title={isMonologue ? "Наизусть" : `Наизусть · роль ${myRole}`}
          sub={`Реплика ${idx + 1} из ${text.lines.length}`}
          right={
            <IconBtn
              name={running ? "pause" : "play"}
              label={running ? "Пауза" : "Продолжить"}
              size={17}
              onClick={() => setRunning((r) => !r)}
            />
          }
        />

        <div className="rd-thread">
          {mine ? (
            <>
              <div className="rd-bubble">
                <Avatar letter="М" color="var(--muted)" size={32} />
                <div className="rd-bubble__col">
                  <div className="rd-msg" style={{ cursor: "default" }}>
                    <div className="rd-bubble__who" style={{ color: "var(--muted)", margin: "0 0 0.25rem" }}>
                      ВАША РЕПЛИКА
                    </div>
                    <div className="rd-msg__fi" lang="ru">
                      «{line.ru}»
                    </div>
                  </div>
                </div>
              </div>
              <div className="rd-bubble rd-bubble--right">
                <Avatar letter="Я" color="var(--read)" size={32} />
                <div className="rd-bubble__col">
                  <div className="rd-msg rd-msg--right rd-mine" style={{ cursor: "default" }}>
                    {revealed ? (
                      <div className="rd-msg__fi" lang="fi">
                        {line.fi}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="rd-wave" aria-hidden="true">
                          {[10, 16, 8, 14, 6].map((h, i) => (
                            <span key={i} style={{ height: h }} />
                          ))}
                        </span>
                        <span style={{ color: "var(--read)", fontWeight: 700, fontSize: "0.9rem" }}>
                          {voiceUsable
                            ? listening
                              ? "Слушаю…"
                              : "Скажите реплику"
                            : "Вспоминайте…"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {heard && !matched && (
                <div className="rd-threadhint" lang="fi">
                  Распознано: {heard}
                </div>
              )}
            </>
          ) : (
            <div className="rd-bubble">
              <Avatar letter={who?.[0] ?? "•"} color={whoColor} size={32} />
              <div className="rd-bubble__col">
                {who && (
                  <div className="rd-bubble__who" style={{ color: whoColor }}>
                    {who}
                  </div>
                )}
                <div className="rd-msg" style={{ cursor: "default" }}>
                  <div className="rd-msg__fi" lang="fi">
                    {line.fi}
                  </div>
                  <div className="rd-msg__ru" lang="ru">
                    {line.ru}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {mine ? (
          <>
            <div className="rd-controls">
              <button type="button" className="rd-ghost" onClick={() => setRevealed(true)}>
                <UiIcon name="eye" size={17} />
                Показать
              </button>
              <button
                type="button"
                className="rd-hero"
                aria-label={voiceUsable ? "Слушать" : "Дальше"}
                onClick={() =>
                  voiceUsable ? (listening ? stopListening() : startListening()) : setMatched(true)
                }
              >
                <UiIcon name="mic" size={30} />
              </button>
              <button
                type="button"
                className="rd-ghost"
                onClick={() => {
                  setMatched(false);
                  setIdx((i) => i + 1);
                }}
              >
                <UiIcon name="skip" size={16} />
                Пропустить
              </button>
            </div>
            {voiceUsable && !matched && (
              <button
                type="button"
                className="rd-ghost"
                style={{ marginTop: "0.5rem" }}
                onClick={() => setMatched(true)}
              >
                <UiIcon name="check" size={15} />
                Засчитать как верное
              </button>
            )}
          </>
        ) : (
          <div className="rd-controls">
            <span className="rd-threadhint" style={{ flex: 1 }}>
              Слушайте реплику…
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
