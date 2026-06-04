/**
 * weighting.test.ts — integration: progress → selectionWeight → weightedSample → session.
 *
 * The unit tests for `weightedSample` (select.test.ts) and `selectionWeight` (srs.test.ts)
 * cover the pieces in isolation; this asserts the wiring through all three session builders,
 * i.e. that a fully-mastered (box 5) item is drawn far less often than brand-new ones.
 */

import { describe, expect, it } from "vitest";
import type { VocabItem } from "./dictionary";
import type { SentenceItem } from "./grader";
import { buildSession } from "./quiz";
import { buildProductionSession } from "./produce";
import { buildSentenceSession } from "./sentenceSession";
import { progressKey, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";

const vocab: VocabItem[] = [
  { id: "n1", fi: "työ", ru: "работа", pos: "noun" },
  { id: "n2", fi: "koti", ru: "дом", pos: "noun" },
  { id: "n3", fi: "kauppa", ru: "магазин", pos: "noun" },
  { id: "v1", fi: "olla", ru: "быть", pos: "verb" },
  { id: "v2", fi: "syödä", ru: "есть", pos: "verb" },
];

const sentences: SentenceItem[] = [
  { id: "s1", ru: "A", uses: ["v1"], canonical: "a", accepted: ["a"], wrong: [] },
  { id: "s2", ru: "B", uses: ["v2"], canonical: "b", accepted: ["b"], wrong: [] },
  { id: "s3", ru: "C", uses: ["v1"], canonical: "c", accepted: ["c"], wrong: [] },
  { id: "s4", ru: "D", uses: ["v2"], canonical: "d", accepted: ["d"], wrong: [] },
  { id: "s5", ru: "E", uses: ["v1"], canonical: "e", accepted: ["e"], wrong: [] },
];

function mastered(kind: ItemKind, id: string): ItemProgress {
  return { kind, itemId: id, box: 5, correctStreak: 5, totalCorrect: 5, totalSeen: 5, lastSeen: 1 };
}

const TRIALS = 300;

/** Fraction of single-item sessions (size 1) whose target is `id`, over many seeds. */
function pickRate(draw: (seed: number) => string | undefined, id: string): number {
  let hits = 0;
  for (let seed = 0; seed < TRIALS; seed++) if (draw(seed) === id) hits++;
  return hits / TRIALS;
}

describe("mastery weighting through the session builders", () => {
  it("buildSession draws a mastered word far less than the field", () => {
    const progress: ProgressMap = new Map([
      [progressKey("recognition", "n1"), mastered("recognition", "n1")],
    ]);
    const rate = pickRate(
      (seed) => buildSession(vocab, seed, 1, 4, progress)[0]?.itemId,
      "n1",
    );
    // n1 weight 1 vs four box-0 words at 32 each → expected ≈ 1/129 ≈ 0.8%.
    expect(rate).toBeLessThan(0.1);
  });

  it("buildProductionSession draws a mastered word far less than the field", () => {
    const progress: ProgressMap = new Map([
      [progressKey("production", "n1"), mastered("production", "n1")],
    ]);
    const rate = pickRate(
      (seed) => buildProductionSession(vocab, seed, 1, progress)[0]?.itemId,
      "n1",
    );
    expect(rate).toBeLessThan(0.1);
  });

  it("buildSentenceSession draws a mastered sentence far less than the field", () => {
    const progress: ProgressMap = new Map([
      [progressKey("sentences", "s1"), mastered("sentences", "s1")],
    ]);
    const rate = pickRate(
      (seed) => buildSentenceSession(sentences, seed, 1, undefined, progress)[0]?.id,
      "s1",
    );
    expect(rate).toBeLessThan(0.1);
  });

  it("still returns the mastered item when it is the only one left", () => {
    const progress: ProgressMap = new Map([
      [progressKey("recognition", "n1"), mastered("recognition", "n1")],
    ]);
    const ids = buildSession([vocab[0]!], 1, 1, 4, progress).map((q) => q.itemId);
    expect(ids).toEqual(["n1"]);
  });
});

describe("lowest-unmastered-level boost through the session builders", () => {
  const leveled: VocabItem[] = [
    { id: "a", fi: "a", ru: "a", pos: "noun", level: 1 },
    { id: "b", fi: "b", ru: "b", pos: "noun", level: 2 },
  ];

  it("over-samples the lowest unmastered level (≈ LEVEL_BOOST : 1)", () => {
    // Both words box 0 → the lowest unmastered level (1) is boosted → "a" (level 1) dominates.
    const rate = pickRate((seed) => buildSession(leveled, seed, 1, 4, new Map())[0]?.itemId, "a");
    // a weight 32×4 vs b 32 → expected 4/5 = 80%.
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.95);
  });

  it("applies no boost once every item is mastered (≈ 50/50)", () => {
    const progress: ProgressMap = new Map([
      [progressKey("recognition", "a"), mastered("recognition", "a")],
      [progressKey("recognition", "b"), mastered("recognition", "b")],
    ]);
    const rate = pickRate((seed) => buildSession(leveled, seed, 1, 4, progress)[0]?.itemId, "a");
    expect(rate).toBeGreaterThan(0.35);
    expect(rate).toBeLessThan(0.65);
  });
});
