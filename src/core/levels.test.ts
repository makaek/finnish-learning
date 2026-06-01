import { describe, expect, it } from "vitest";
import {
  activeLevel,
  activeVocab,
  eligibleSentences,
  levelOf,
  levelStats,
  listLevels,
  overallProgress,
  unlockedLevels,
  type SentenceLike,
  type VocabLike,
} from "./levels";
import { progressKey, type ItemProgress, type ProgressMap } from "./progress";

const vocab: VocabLike[] = [
  ...["a1", "a2", "a3", "a4", "a5"].map((id) => ({ id, level: 1 })),
  ...["b1", "b2", "b3", "b4", "b5"].map((id) => ({ id, level: 2 })),
];

const sentences: SentenceLike[] = [
  { id: "s1", level: 1, uses: ["a1", "a2"] },
  { id: "s2", level: 2, uses: ["b1"] },
];

/** Build a ProgressMap marking the given vocab ids learned (box 3). */
function learned(ids: string[]): ProgressMap {
  const map: ProgressMap = new Map();
  for (const id of ids) {
    const p: ItemProgress = {
      kind: "vocab",
      itemId: id,
      box: 3,
      correctStreak: 3,
      totalCorrect: 3,
      totalSeen: 3,
      lastSeen: 1,
    };
    map.set(progressKey("vocab", id), p);
  }
  return map;
}

describe("levelOf / listLevels", () => {
  it("defaults missing or invalid levels to 1", () => {
    expect(levelOf({})).toBe(1);
    expect(levelOf({ level: 0 })).toBe(1);
    expect(levelOf({ level: 2.9 })).toBe(2);
  });

  it("lists distinct levels in order, always including 1", () => {
    expect(listLevels(vocab)).toEqual([1, 2]);
    expect(listLevels([{ level: 3 }])).toEqual([1, 3]);
  });
});

describe("levelStats", () => {
  it("counts learned per level", () => {
    const stats = levelStats(vocab, learned(["a1", "a2", "a3", "a4"]));
    expect(stats).toEqual([
      { level: 1, total: 5, learned: 4, fraction: 0.8 },
      { level: 2, total: 5, learned: 0, fraction: 0 },
    ]);
  });
});

describe("unlockedLevels", () => {
  it("opens only level 1 for a brand-new learner", () => {
    expect(unlockedLevels(levelStats(vocab, new Map()))).toEqual(new Set([1]));
  });

  it("unlocks level 2 once level 1 hits the 80% threshold", () => {
    expect(unlockedLevels(levelStats(vocab, learned(["a1", "a2", "a3", "a4"])))).toEqual(
      new Set([1, 2]),
    );
  });

  it("keeps level 2 locked below the threshold", () => {
    expect(unlockedLevels(levelStats(vocab, learned(["a1", "a2", "a3"])))).toEqual(new Set([1]));
  });

  it("does not skip a locked level to unlock a later one", () => {
    // Level 2 not mastered → level 3 stays locked even if its words were somehow learned.
    const three: VocabLike[] = [...vocab, { id: "c1", level: 3 }];
    expect(unlockedLevels(levelStats(three, learned(["a1", "a2", "a3", "a4"])))).toEqual(
      new Set([1, 2]),
    );
  });
});

describe("activeLevel", () => {
  it("is the lowest unlocked level that is not fully mastered", () => {
    const p = learned(["a1", "a2", "a3", "a4"]); // L1 at 80%, L2 unlocked but empty progress
    const stats = levelStats(vocab, p);
    expect(activeLevel(stats, unlockedLevels(stats))).toBe(1); // L1 still < 100%
  });

  it("falls back to the highest unlocked level when all are mastered", () => {
    const p = learned(["a1", "a2", "a3", "a4", "a5"]); // L1 fully mastered, L2 unlocked
    const stats = levelStats(vocab, p);
    expect(activeLevel(stats, unlockedLevels(stats))).toBe(2);
  });
});

describe("overallProgress", () => {
  it("aggregates learned/total across all levels", () => {
    expect(overallProgress(vocab, learned(["a1", "a2", "b1"]))).toEqual({
      learned: 3,
      total: 10,
      fraction: 0.3,
    });
  });
});

describe("activeVocab", () => {
  it("includes only words from unlocked levels", () => {
    expect(activeVocab(vocab, new Map()).map((v) => v.id)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
    expect(activeVocab(vocab, learned(["a1", "a2", "a3", "a4"]))).toHaveLength(10);
  });

  it("returns everything in test mode", () => {
    expect(activeVocab(vocab, new Map(), true)).toHaveLength(10);
  });
});

describe("eligibleSentences", () => {
  it("requires the level unlocked AND every used word learned", () => {
    // Brand new: L1 unlocked but a1/a2 not learned → s1 ineligible.
    expect(eligibleSentences(sentences, vocab, new Map())).toEqual([]);
    // Learn a1,a2 → s1 eligible; s2 still locked (L2) and b1 not learned.
    expect(eligibleSentences(sentences, vocab, learned(["a1", "a2"])).map((s) => s.id)).toEqual([
      "s1",
    ]);
  });

  it("gates a higher-level sentence behind both its unlock and its words", () => {
    // L1 mastered (unlocks L2) and b1 learned → s2 becomes eligible.
    const p = learned(["a1", "a2", "a3", "a4", "b1"]);
    expect(eligibleSentences(sentences, vocab, p).map((s) => s.id).sort()).toEqual(["s1", "s2"]);
  });

  it("returns everything in test mode", () => {
    expect(eligibleSentences(sentences, vocab, new Map(), true)).toHaveLength(2);
  });
});
