import { describe, expect, it } from "vitest";
import { hasLocalVoice } from "./useSpeechSynthesis";

/** Minimal fake voice — only the fields hasLocalVoice reads. */
function voice(lang: string, localService: boolean): SpeechSynthesisVoice {
  return { lang, localService } as SpeechSynthesisVoice;
}

describe("hasLocalVoice", () => {
  it("true only when a LANGUAGE-matching voice is localService", () => {
    expect(hasLocalVoice([voice("fi-FI", true)], "fi-FI")).toBe(true);
    expect(hasLocalVoice([voice("fi-FI", false)], "fi-FI")).toBe(false); // remote-only → offline TTS fails
    expect(hasLocalVoice([voice("en-US", true)], "fi-FI")).toBe(false); // wrong language
  });

  it("matches on the 2-letter prefix, case-insensitively", () => {
    expect(hasLocalVoice([voice("FI", true)], "fi-FI")).toBe(true);
    expect(hasLocalVoice([voice("en-GB", true)], "en-US")).toBe(true); // any English local voice counts
  });

  it("false for an empty voice list (Chrome's async first getVoices())", () => {
    expect(hasLocalVoice([], "fi-FI")).toBe(false);
  });

  it("a single local match among remote voices is enough", () => {
    const voices = [voice("fi-FI", false), voice("en-US", true), voice("fi-FI", true)];
    expect(hasLocalVoice(voices, "fi-FI")).toBe(true);
  });
});
