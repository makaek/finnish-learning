import { describe, it, expect } from "vitest";
import type { VocabItem } from "./dictionary";
import {
  makeRng,
  shuffle,
  buildQuestion,
  buildSession,
  DEFAULT_OPTION_COUNT,
} from "./quiz";

const nouns: VocabItem[] = [
  { id: "n1", fi: "työ", ru: "работа", pos: "noun" },
  { id: "n2", fi: "koti", ru: "дом", pos: "noun" },
  { id: "n3", fi: "kauppa", ru: "магазин", pos: "noun" },
  { id: "n4", fi: "talo", ru: "здание", pos: "noun" },
  { id: "n5", fi: "auto", ru: "машина", pos: "noun" },
];
const verbs: VocabItem[] = [
  { id: "v1", fi: "olla", ru: "быть", pos: "verb" },
  { id: "v2", fi: "mennä", ru: "идти", pos: "verb" },
  { id: "v3", fi: "syödä", ru: "есть", pos: "verb" },
  { id: "v4", fi: "juoda", ru: "пить", pos: "verb" },
];
const adjectives: VocabItem[] = [
  { id: "a1", fi: "hyvä", ru: "хороший", pos: "adj" },
  { id: "a2", fi: "iso", ru: "большой", pos: "adj" },
];
const pool: VocabItem[] = [...nouns, ...verbs, ...adjectives];

/** Read a fixture element, failing loudly (not with `T | undefined`) if it's missing. */
function at<T>(arr: readonly T[], i: number): T {
  const value = arr[i];
  if (value === undefined) throw new Error(`fixture missing index ${i}`);
  return value;
}

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("returns floats in [0, 1)", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    expect(makeRng(1)()).not.toEqual(makeRng(2)());
  });

  it("handles seed 0 without producing a degenerate constant stream", () => {
    const rng = makeRng(0);
    const seq = [rng(), rng(), rng()];
    expect(new Set(seq).size).toBe(3);
    for (const n of seq) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const out = shuffle(input, makeRng(3));
    expect(input).toEqual(copy); // not mutated
    expect([...out].sort((a, b) => a - b)).toEqual(copy); // same elements
  });

  it("is deterministic for a given seed", () => {
    expect(shuffle([1, 2, 3, 4, 5], makeRng(9))).toEqual(
      shuffle([1, 2, 3, 4, 5], makeRng(9)),
    );
  });
});

describe("buildQuestion", () => {
  const target = at(nouns, 0); // työ

  it("produces optionCount options by default", () => {
    const q = buildQuestion(target, pool, makeRng(1));
    expect(q.options).toHaveLength(DEFAULT_OPTION_COUNT);
  });

  it("always includes the correct answer", () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = buildQuestion(target, pool, makeRng(seed));
      expect(q.correctFi).toBe("työ");
      expect(q.options).toContain("työ");
    }
  });

  it("never repeats an option", () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = buildQuestion(target, pool, makeRng(seed));
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it("carries the Russian prompt and source id", () => {
    const q = buildQuestion(target, pool, makeRng(1));
    expect(q.promptRu).toBe("работа");
    expect(q.itemId).toBe("n1");
  });

  it("prefers same-part-of-speech distractors when the group is large enough", () => {
    const nounFi = new Set(nouns.map((n) => n.fi));
    for (let seed = 0; seed < 25; seed++) {
      const q = buildQuestion(target, pool, makeRng(seed));
      for (const option of q.options) {
        expect(nounFi.has(option)).toBe(true); // every option is a noun
      }
    }
  });

  it("pads from the wider pool when the same-pos group is too small", () => {
    const adjTarget = at(adjectives, 0); // hyvä — only one other adjective exists
    const q = buildQuestion(adjTarget, pool, makeRng(2));
    expect(q.options).toHaveLength(DEFAULT_OPTION_COUNT);
    expect(q.options).toContain("hyvä");
  });

  it("degrades gracefully when the pool cannot supply enough distractors", () => {
    const tinyPool = adjectives; // only 2 items total
    const q = buildQuestion(at(adjectives, 0), tinyPool, makeRng(1));
    expect(q.options).toHaveLength(2);
    expect(q.options).toContain("hyvä");
    expect(q.options).toContain("iso");
  });

  it("is deterministic for a given seed", () => {
    expect(buildQuestion(target, pool, makeRng(5))).toEqual(
      buildQuestion(target, pool, makeRng(5)),
    );
  });
});

describe("buildSession", () => {
  it("builds the requested number of questions", () => {
    const session = buildSession(pool, 1, 5);
    expect(session).toHaveLength(5);
  });

  it("caps the session at the pool size", () => {
    const session = buildSession(pool, 1, 100);
    expect(session).toHaveLength(pool.length);
  });

  it("draws each target word at most once", () => {
    const session = buildSession(pool, 4, pool.length);
    const ids = session.map((q) => q.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every question a non-repeating set of options", () => {
    const session = buildSession(pool, 4, pool.length);
    for (const q of session) {
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options).toContain(q.correctFi);
    }
  });

  it("returns an empty session for empty items or zero size", () => {
    expect(buildSession([], 1, 10)).toEqual([]);
    expect(buildSession(pool, 1, 0)).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    expect(buildSession(pool, 8, 5)).toEqual(buildSession(pool, 8, 5));
  });

  it("a question's options don't depend on session length (per-question seeding)", () => {
    // The first target is chosen by makeRng(seed); with the same seed the session-of-3
    // and session-of-10 share that first target, and its options must be identical.
    const short = buildSession(pool, 99, 3);
    const long = buildSession(pool, 99, 10);
    expect(short[0]).toEqual(long[0]);
  });
});
