import { describe, it, expect } from "vitest";
import type { VocabItem } from "./dictionary";
import {
  normalizeFi,
  gradeTyped,
  buildProductionSession,
  DEFAULT_SESSION_SIZE,
} from "./produce";

const pool: VocabItem[] = [
  { id: "n1", fi: "työ", ru: "работа", pos: "noun" },
  { id: "n2", fi: "koti", ru: "дом", pos: "noun" },
  { id: "n3", fi: "kauppa", ru: "магазин", pos: "noun" },
  { id: "v1", fi: "olla", ru: "быть", pos: "verb" },
  { id: "v2", fi: "syödä", ru: "есть", pos: "verb" },
  { id: "a1", fi: "hyvä", ru: "хороший", pos: "adj" },
];

describe("normalizeFi", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeFi("  Menen   Töihin ")).toBe("menen töihin");
  });

  it("strips a single trailing . ? or !", () => {
    expect(normalizeFi("työ.")).toBe("työ");
    expect(normalizeFi("työ?")).toBe("työ");
    expect(normalizeFi("työ!")).toBe("työ");
  });

  it("strips only one trailing punctuation mark", () => {
    expect(normalizeFi("työ!!")).toBe("työ!");
  });

  it("preserves Finnish dotted vowels", () => {
    expect(normalizeFi("TYÖ")).toBe("työ");
  });
});

describe("gradeTyped", () => {
  it("accepts an exact answer (case/space insensitive)", () => {
    const g = gradeTyped("työ", "  Työ ");
    expect(g.correct).toBe(true);
    expect(g.via).toBe("exact");
  });

  it("marks a missing-diacritics answer WRONG but flags it as such", () => {
    const g = gradeTyped("työ", "tyo");
    expect(g.correct).toBe(false);
    expect(g.via).toBe("diacritics");
    expect(g.feedbackRu).toContain("työ"); // canonical revealed in the hint
  });

  it("treats a wrong dotted vowel as a diacritics slip too", () => {
    expect(gradeTyped("talo", "tälo").via).toBe("diacritics");
  });

  it("does not fold y to u (y is a real vowel, not a diacritic)", () => {
    // 'hyvä' typed as 'huvä' differs by a true vowel, not a missing dot.
    expect(gradeTyped("hyvä", "huvä").via).toBe("wrong");
  });

  it("folds the rare å to o (loan vowel), not to a", () => {
    // Synthetic: å is absent from the A1 deck but the fold must stay phonetically sound.
    expect(gradeTyped("råök", "rook").via).toBe("diacritics");
    expect(gradeTyped("råök", "raak").via).toBe("wrong");
  });

  it("marks an unrelated answer wrong and reveals the canonical", () => {
    const g = gradeTyped("työ", "koti");
    expect(g.correct).toBe(false);
    expect(g.via).toBe("wrong");
    expect(g.feedbackRu).toContain("työ");
  });

  it("treats empty input as wrong, not a diacritics near-miss", () => {
    expect(gradeTyped("työ", "   ").via).toBe("wrong");
  });

  it("always returns the canonical answerFi unchanged", () => {
    expect(gradeTyped("työ", "tyo").answerFi).toBe("työ");
  });
});

describe("buildProductionSession", () => {
  it("builds the requested number of questions", () => {
    expect(buildProductionSession(pool, 1, 4)).toHaveLength(4);
  });

  it("caps the session at the pool size", () => {
    expect(buildProductionSession(pool, 1, 100)).toHaveLength(pool.length);
  });

  it("draws each target word at most once", () => {
    const ids = buildProductionSession(pool, 4, pool.length).map((q) => q.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries the Russian prompt and canonical Finnish answer", () => {
    const session = buildProductionSession(pool, 4, pool.length);
    for (const q of session) {
      const source = pool.find((i) => i.id === q.itemId);
      expect(q.promptRu).toBe(source?.ru);
      expect(q.answerFi).toBe(source?.fi);
    }
  });

  it("returns an empty session for empty items or zero size", () => {
    expect(buildProductionSession([], 1, 10)).toEqual([]);
    expect(buildProductionSession(pool, 1, 0)).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    expect(buildProductionSession(pool, 8, 5)).toEqual(buildProductionSession(pool, 8, 5));
  });

  it("defaults to the shared session size when size is omitted", () => {
    expect(DEFAULT_SESSION_SIZE).toBe(10);
    // pool has fewer than DEFAULT_SESSION_SIZE items, so the default run is pool-capped.
    expect(buildProductionSession(pool, 1)).toHaveLength(
      Math.min(DEFAULT_SESSION_SIZE, pool.length),
    );
  });
});
