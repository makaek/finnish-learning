/**
 * offlineLocks.ts — which exercise modes are unavailable without a network connection.
 *
 * The say_* modes are voice-ONLY (mic input); Web Speech recognition runs on the browser's
 * cloud service, so they simply cannot work offline. The listen_* (dictation) modes depend on
 * TTS, which DOES work offline when the device has a LOCAL voice for the target language —
 * so they lock only when no such voice exists (the caller detects that via
 * SpeechSynthesisVoice.localService; see ui/useSpeechSynthesis.hasLocalVoice).
 *
 * PURE and transient: this is UI availability only. It must never feed core/balance.ts or
 * core/levels.ts — level progression stays connectivity-independent.
 */

/** Modes that require the network for speech RECOGNITION (mic input) — always locked offline. */
const VOICE_MODES = ["say_word", "say_sentence"] as const;
/** Modes that require TTS — locked offline only when no local voice can speak the language. */
const LISTEN_MODES = ["listen_word", "listen_sentence"] as const;

const NONE: ReadonlySet<string> = new Set();

/**
 * The set of mode ids that must not be startable right now. Empty when online. Recognition,
 * production, sentences, mix and the reading library are never locked (typed/tap input only;
 * the mix excludes locked kinds itself via buildMixedSession's `exclude`).
 */
export function lockedModes(online: boolean, ttsOfflineCapable: boolean): ReadonlySet<string> {
  if (online) return NONE;
  return new Set<string>(
    ttsOfflineCapable ? VOICE_MODES : [...VOICE_MODES, ...LISTEN_MODES],
  );
}
