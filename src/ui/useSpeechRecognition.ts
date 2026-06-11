/**
 * useSpeechRecognition — thin React wrapper over the browser Web Speech API
 * (window.SpeechRecognition / webkitSpeechRecognition). FREE and key-less, but only works
 * on supporting browsers (Chrome/Edge desktop, Chrome on Android) over HTTPS with mic
 * permission; Finnish recognition (fi-FI) uses the browser's cloud service, so it needs the
 * network. `supported` is false where the API is absent (e.g. Firefox), and callers fall
 * back to typing.
 *
 * The Web Speech API isn't in the TS DOM lib, so the minimal shapes are declared here.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechAlternativeLike>>;
}
interface SpeechRecognitionErrorLike {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface SpeechRecognitionApi {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Russian description of a recognition problem worth surfacing on a card, or null for routine
 * noise ("no-speech" fires whenever the learner stays quiet; "aborted" is our own teardown).
 * The offline case is keyed on BOTH navigator.onLine and the recognizer's own "network" error —
 * a captive portal reads as online but still fails with "network" at runtime.
 */
export function speechTroubleRu(online: boolean, error: string | null): string | null {
  if (!online || error === "network")
    return "Нет соединения — распознавание речи не работает офлайн.";
  if (error === "not-allowed" || error === "service-not-allowed")
    return "Нет доступа к микрофону — разрешите его в настройках браузера.";
  if (!error || error === "no-speech" || error === "aborted") return null;
  return `Ошибка распознавания: ${error}`;
}

export function useSpeechRecognition(opts: {
  lang: string;
  enabled: boolean;
  /** Receives the recognizer's N-best transcripts, best-first (so the card can pick the
   * Finnish hypothesis that actually matches the target). */
  onResult: (alternatives: string[]) => void;
}): SpeechRecognitionApi {
  const { lang, enabled } = opts;
  const supported = getCtor() !== undefined;
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback without re-creating the recognizer.
  const onResultRef = useRef(opts.onResult);
  onResultRef.current = opts.onResult;

  useEffect(() => {
    if (!enabled) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    // Ask for several hypotheses so the card can prefer the one matching the Finnish target
    // (the cloud recognizer's #1 guess is sometimes an English word for a clear Finnish answer).
    rec.maxAlternatives = 6;
    rec.continuous = false;
    rec.onresult = (e) => {
      const first = e.results[0];
      const alternatives: string[] = [];
      if (first) {
        for (let i = 0; i < first.length; i++) {
          const t = first[i]?.transcript?.trim();
          if (t) alternatives.push(t);
        }
      }
      if (alternatives.length > 0) onResultRef.current(alternatives);
    };
    rec.onerror = (e) => setError(e.error ?? "speech-error");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, [enabled, lang]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started / not allowed */
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
