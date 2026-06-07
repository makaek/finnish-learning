import { describe, expect, it } from "vitest";
import { buildMixedSession } from "./mixed";
import type { VocabItem } from "./dictionary";
import type { SentenceItem } from "./grader";
import { progressKey, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";
import { LEARNED_BOX } from "./levels";

const vocab: VocabItem[] = [
  { id: "w1", fi: "kissa", ru: "кошка", pos: "noun", level: 1 },
  { id: "w2", fi: "koira", ru: "собака", pos: "noun", level: 1 },
  { id: "x1", fi: "talo", ru: "дом", pos: "noun", level: 2 },
];

const sentences: SentenceItem[] = [
  { id: "s1", ru: "Я иду", uses: ["w1"], canonical: "minä menen", accepted: ["minä menen"], wrong: [] },
];

/** ProgressMap from [kind, id, box] rows (everything not listed sits at box 0 = not mastered). */
function mk(...rows: [ItemKind, string, number][]): ProgressMap {
  const m: ProgressMap = new Map();
  for (const [kind, id, b] of rows) {
    const p: ItemProgress = {
      kind,
      itemId: id,
      box: b,
      correctStreak: b,
      totalCorrect: b,
      totalSeen: b,
      lastSeen: 1,
    };
    m.set(progressKey(kind, id), p);
  }
  return m;
}

describe("buildMixedSession", () => {
  it("covers every word & sentence mode for not-mastered current-level items (no reading)", () => {
    // Nothing mastered → L1 has w1,w2 × 4 word modes (8) + s1 × 3 sentence modes (3) = 11 tasks.
    const session = buildMixedSession(vocab, sentences, new Map(), 1, 7, 99);
    expect(session).toHaveLength(11);
    // Never a reading task.
    expect(session.every((q) => q.kind !== ("reading" as ItemKind))).toBe(true);
    // The four word kinds and three sentence kinds all appear.
    const kinds = new Set<string>(session.map((q) => q.kind));
    for (const k of ["recognition", "production", "say_word", "listen_word", "sentences", "say_sentence", "listen_sentence"]) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("excludes items already mastered IN THAT mode, but keeps their other modes", () => {
    // w1 mastered in recognition+production; w2 fully mastered in all 4 word modes.
    const progress = mk(
      ["recognition", "w1", LEARNED_BOX],
      ["production", "w1", LEARNED_BOX],
      ["recognition", "w2", LEARNED_BOX],
      ["production", "w2", LEARNED_BOX],
      ["say_word", "w2", LEARNED_BOX],
      ["listen_word", "w2", LEARNED_BOX],
      ["sentences", "s1", LEARNED_BOX],
      ["say_sentence", "s1", LEARNED_BOX],
      ["listen_sentence", "s1", LEARNED_BOX],
    );
    const session = buildMixedSession(vocab, sentences, progress, 1, 7, 99);
    // Remaining: w1 say_word + w1 listen_word only.
    expect(session.map((q) => q.kind).sort()).toEqual(["listen_word", "say_word"]);
    expect(session.every((q) => q.card === "production" && (q.q as { itemId: string }).itemId === "w1")).toBe(true);
  });

  it("only includes items at the requested level", () => {
    // Level 2 holds just x1 → 4 word-mode tasks, no sentences (s1 is L1).
    const session = buildMixedSession(vocab, sentences, new Map(), 2, 7, 99);
    expect(session).toHaveLength(4);
    expect(session.every((q) => q.card !== "sentence")).toBe(true);
  });

  it("tags voice / listen variants and caps to size", () => {
    const session = buildMixedSession(vocab, sentences, new Map(), 1, 7, 4);
    expect(session).toHaveLength(4);
    for (const q of session) {
      if (q.kind === "say_word" || q.kind === "say_sentence") expect(q.voice).toBe(true);
      if (q.kind === "listen_word" || q.kind === "listen_sentence") expect(q.listen).toBe(true);
    }
  });

  it("orders weakest-box-first so the least-known leftovers lead", () => {
    // Give w1's recognition box 1 (still < LEARNED_BOX=2) and everything else box 0.
    const progress = mk(["recognition", "w1", 1]);
    const session = buildMixedSession(vocab, sentences, progress, 1, 7, 99);
    // The box-0 tasks must all come before the single box-1 (w1 recognition) task.
    const idx = session.findIndex((q) => q.card === "recognition" && (q.q as { itemId: string }).itemId === "w1");
    expect(idx).toBe(session.length - 1);
  });
});
