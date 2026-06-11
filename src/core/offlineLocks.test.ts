import { describe, expect, it } from "vitest";
import { lockedModes } from "./offlineLocks";

describe("lockedModes", () => {
  it("locks nothing while online (regardless of TTS capability)", () => {
    expect(lockedModes(true, true).size).toBe(0);
    expect(lockedModes(true, false).size).toBe(0);
  });

  it("offline with a local TTS voice: only the mic (say_*) modes lock", () => {
    const locked = lockedModes(false, true);
    expect([...locked].sort()).toEqual(["say_sentence", "say_word"]);
  });

  it("offline without a local TTS voice: dictation (listen_*) locks too", () => {
    const locked = lockedModes(false, false);
    expect([...locked].sort()).toEqual([
      "listen_sentence",
      "listen_word",
      "say_sentence",
      "say_word",
    ]);
  });

  it("never locks the typed/tap modes or reading", () => {
    const locked = lockedModes(false, false);
    for (const id of ["recognition", "production", "sentences", "mix", "read:text", "read:dialog"]) {
      expect(locked.has(id)).toBe(false);
    }
  });
});
