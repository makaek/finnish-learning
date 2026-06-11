/**
 * useSpeechSynthesis — thin React wrapper over the browser Web Speech *synthesis* API
 * (window.speechSynthesis), the playback counterpart to useSpeechRecognition. FREE and
 * key-less: it speaks Finnish text aloud using an OS/browser voice. No network needed once a
 * voice is installed; quality depends on whether the device has a Finnish (fi-*) voice — if
 * not, it falls back to the default voice reading Finnish text (rough phonetics, still useful).
 * `supported` is false where the API is absent.
 *
 * Unlike SpeechRecognition, the synthesis types ARE in the standard TS DOM lib, so no manual
 * shapes are declared here.
 */

import { useCallback, useEffect, useRef, useState } from "react";

function getSynth(): SpeechSynthesis | undefined {
  if (typeof window === "undefined") return undefined;
  return window.speechSynthesis;
}

/**
 * Whether some installed voice can speak `lang` WITHOUT the network: a language-prefix match
 * that is `localService` (on-device). Remote voices (e.g. desktop Chrome's "Google …" set)
 * silently produce no audio offline, so this is the signal the offline mode-locks need.
 */
export function hasLocalVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): boolean {
  const base = lang.slice(0, 2).toLowerCase();
  return voices.some((v) => v.localService && v.lang?.toLowerCase().startsWith(base));
}

export interface SpeechSynthesisApi {
  supported: boolean;
  speaking: boolean;
  /** A LOCAL (on-device) voice exists for the language — TTS will work offline. */
  offlineCapable: boolean;
  /** Speak the given text (cancels anything already playing). No-op when unsupported/empty.
   * `onDone` fires only on natural completion (not when preempted by cancel/another speak). */
  speak: (text: string, onDone?: () => void) => void;
  /** Speak several parts back-to-back, chained on each utterance's end (cancels first). */
  speakMany: (parts: readonly string[]) => void;
  /** Stop any in-flight speech. */
  cancel: () => void;
}

export function useSpeechSynthesis(lang = "fi-FI"): SpeechSynthesisApi {
  // getSynth() already guards `window`, so it short-circuits to false under SSR before the
  // `in window` check runs.
  const supported = getSynth() !== undefined && "SpeechSynthesisUtterance" in window;
  const [speaking, setSpeaking] = useState(false);
  // True when an on-device voice can speak the language (TTS works offline). State, not a ref:
  // the offline locks must re-render when Chrome's async getVoices() population lands.
  const [offlineCapable, setOfflineCapable] = useState(false);
  // Resolved target-language voice (voices can load asynchronously, hence the voiceschanged listener).
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Stamps each utterance so a cancelled one's late onerror/onend can't flip `speaking` for a
  // newer utterance (cancel() fires an "interrupted" error on the preempted one).
  const speakIdRef = useRef(0);

  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;
    const base = lang.slice(0, 2).toLowerCase();
    const pick = () => {
      const voices = synth.getVoices();
      const matches = voices.filter((v) => v.lang?.toLowerCase().startsWith(base));
      // Prefer an on-device voice: remote ones (desktop Chrome's "Google …") silently fail
      // offline; preferring local is harmless online.
      voiceRef.current = matches.find((v) => v.localService) ?? matches[0] ?? null;
      setOfflineCapable(hasLocalVoice(voices, lang));
    };
    pick();
    synth.addEventListener("voiceschanged", pick);
    return () => synth.removeEventListener("voiceschanged", pick);
  }, [lang]);

  // Never leave speech playing after the card unmounts.
  useEffect(() => {
    return () => {
      try {
        getSynth()?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const synth = getSynth();
      if (!synth || !text) return;
      try {
        synth.cancel(); // avoid overlap with a previous utterance
        const id = ++speakIdRef.current;
        const current = () => speakIdRef.current === id;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.rate = 0.95; // a touch slower, easier for a learner to follow
        utterance.onstart = () => current() && setSpeaking(true);
        utterance.onend = () => {
          if (!current()) return;
          setSpeaking(false);
          onDone?.();
        };
        utterance.onerror = (e) => {
          // "interrupted" is the cancel() of the PREVIOUS utterance — ignore it.
          if (e.error !== "interrupted" && current()) setSpeaking(false);
        };
        synth.speak(utterance);
        // Chrome quirk: a preceding cancel() can leave the engine *paused*, silently swallowing
        // the next utterance — no audio AND no onend. That wedges callers that advance on onend
        // (e.g. auto-dialog) and kills every later speak() until reload. resume() unsticks it and
        // is a harmless no-op when the engine isn't paused.
        synth.resume();
      } catch {
        setSpeaking(false);
      }
    },
    [lang],
  );

  // Speak a list of parts in order. Reuses the same speakId generation guard as `speak`, so a
  // later speak()/speakMany()/cancel() preempts an in-flight sequence cleanly.
  const speakMany = useCallback(
    (parts: readonly string[]) => {
      const synth = getSynth();
      const queue = parts.filter((p) => p && p.trim().length > 0);
      if (!synth || queue.length === 0) return;
      try {
        synth.cancel();
        // Reflect playback immediately — onstart can lag a few hundred ms on a long queue,
        // and the caller's button relies on `speaking` to switch into a stop affordance.
        setSpeaking(true);
        const id = ++speakIdRef.current;
        const current = () => speakIdRef.current === id;
        let i = 0;
        const next = () => {
          if (!current() || i >= queue.length) {
            if (current()) setSpeaking(false);
            return;
          }
          const utterance = new SpeechSynthesisUtterance(queue[i++]!);
          utterance.lang = lang;
          if (voiceRef.current) utterance.voice = voiceRef.current;
          utterance.rate = 0.95;
          utterance.onstart = () => current() && setSpeaking(true);
          utterance.onend = () => current() && next();
          utterance.onerror = (e) => {
            if (e.error !== "interrupted" && current()) setSpeaking(false);
          };
          synth.speak(utterance);
          synth.resume(); // see speak(): unstick Chrome's post-cancel paused state
        };
        next();
      } catch {
        setSpeaking(false);
      }
    },
    [lang],
  );

  const cancel = useCallback(() => {
    try {
      // Bump the id BEFORE cancelling so any in-flight utterance's onend sees current()===false
      // and can't fire a stale onDone (which could schedule an advance after teardown).
      speakIdRef.current++;
      getSynth()?.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, []);

  return { supported, speaking, offlineCapable, speak, speakMany, cancel };
}

/**
 * Standalone "does TTS work offline for this language?" signal — same getVoices() +
 * voiceschanged subscription as the full hook, without instantiating the speak/cancel API.
 * Used by App to compute the offline mode-locks without mounting a card.
 */
export function useLocalTtsVoice(lang: string): boolean {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    const synth = getSynth();
    if (!synth) {
      setCapable(false);
      return;
    }
    const check = () => setCapable(hasLocalVoice(synth.getVoices(), lang));
    check();
    synth.addEventListener("voiceschanged", check);
    return () => synth.removeEventListener("voiceschanged", check);
  }, [lang]);
  return capable;
}
