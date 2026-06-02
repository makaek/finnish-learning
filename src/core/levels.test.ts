import { describe, expect, it } from "vitest";
import {
  activeLevel,
  activeVocab,
  eligibleSentences,
  LEARNED_BOX,
  levelOf,
  levelStats,
  listLevels,
  overallProgress,
  unlockedLevels,
  wordLearned,
  wordMastery,
  type SentenceLike,
  type VocabLike,
} from "./levels";
import { progressKey, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";

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
      kind: "recognition",
      itemId: id,
      box: 3,
      correctStreak: 3,
      totalCorrect: 3,
      totalSeen: 3,
      lastSeen: 1,
    };
    map.set(progressKey("recognition", id), p);
  }
  return map;
}

/** ProgressMap with one item at a given box in a given exercise track. */
function box(kind: ItemKind, id: string, b: number): ProgressMap {
  return new Map([
    [
      progressKey(kind, id),
      { kind, itemId: id, box: b, correctStreak: b, totalCorrect: b, totalSeen: b, lastSeen: 1 },
    ],
  ]);
}

describe("wordLearned (per-type, either skill)", () => {
  it("threshold is 3 clean answers", () => {
    expect(LEARNED_BOX).toBe(3);
  });

  it("counts a word learned via recognition alone", () => {
    expect(wordLearned(box("recognition", "a1", 3), "a1")).toBe(true);
  });

  it("counts a word learned via production alone", () => {
    expect(wordLearned(box("production", "a1", 3), "a1")).toBe(true);
  });

  it("does not count a word below the threshold in either track", () => {
    expect(wordLearned(box("recognition", "a1", 2), "a1")).toBe(false);
    expect(wordLearned(new Map(), "a1")).toBe(false);
  });

  it("recognition and production progress are independent records", () => {
    // Learned in recognition only: it's 'learned' for unlocks, but production stays empty.
    const p = box("recognition", "a1", 5);
    expect(wordLearned(p, "a1")).toBe(true);
    expect(p.has(progressKey("production", "a1"))).toBe(false);
  });

  it("counts a word learned via speech (say_word) alone too", () => {
    expect(wordLearned(box("say_word", "a1", 3), "a1")).toBe(true);
  });
});

describe("wordMastery (depth across the three word modes)", () => {
  const merge = (...maps: ProgressMap[]): ProgressMap =>
    new Map(maps.flatMap((m) => [...m]));

  it("is 0 with nothing learned", () => {
    expect(wordMastery(new Map(), "a1")).toBe(0);
  });

  it("is 1/3 for one mastered mode, 2/3 for two", () => {
    expect(wordMastery(box("recognition", "a1", 3), "a1")).toBeCloseTo(1 / 3);
    expect(
      wordMastery(merge(box("recognition", "a1", 3), box("production", "a1", 4)), "a1"),
    ).toBeCloseTo(2 / 3);
  });

  it("is 1 only when all three word modes are mastered", () => {
    const all = merge(
      box("recognition", "a1", 3),
      box("production", "a1", 3),
      box("say_word", "a1", 5),
    );
    expect(wordMastery(all, "a1")).toBe(1);
  });

  it("ignores sub-threshold boxes", () => {
    expect(wordMastery(box("production", "a1", 2), "a1")).toBe(0);
  });
});

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
  it("counts learned per level (the unlock metric)", () => {
    const stats = levelStats(vocab, learned(["a1", "a2", "a3", "a4"]));
    expect(stats.map((s) => ({ level: s.level, total: s.total, learned: s.learned }))).toEqual([
      { level: 1, total: 5, learned: 4 },
      { level: 2, total: 5, learned: 0 },
    ]);
  });

  it("fraction is the average mastery across modes, not just learned/total", () => {
    // 4 of 5 L1 words learned in recognition only → each 1/3 mastered → avg = (4 * 1/3)/5.
    const stats = levelStats(vocab, learned(["a1", "a2", "a3", "a4"]));
    expect(stats[0]!.fraction).toBeCloseTo(4 / 3 / 5); // ≈0.267, NOT 0.8
  });

  it("fraction reaches 1 only when every word is mastered in all three modes", () => {
    const ids = ["a1", "a2", "a3", "a4", "a5"];
    const map: ProgressMap = new Map();
    for (const id of ids) {
      for (const kind of ["recognition", "production", "say_word"] as ItemKind[]) {
        map.set(progressKey(kind, id), {
          kind, itemId: id, box: 3, correctStreak: 3, totalCorrect: 3, totalSeen: 3, lastSeen: 1,
        });
      }
    }
    expect(levelStats(vocab, map)[0]!.fraction).toBe(1);
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

describe("activeLevel (the frontier — highest unlocked)", () => {
  it("is the highest unlocked level, even before it's fully mastered", () => {
    const p = learned(["a1", "a2", "a3", "a4"]); // L1 at 80% → L2 unlocked
    const stats = levelStats(vocab, p);
    expect(activeLevel(stats, unlockedLevels(stats))).toBe(2);
  });

  it("stays at level 1 until the next level unlocks", () => {
    const p = learned(["a1", "a2", "a3"]); // L1 at 60% → L2 still locked
    const stats = levelStats(vocab, p);
    expect(activeLevel(stats, unlockedLevels(stats))).toBe(1);
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

  it("uses a gentler bar than 'learned' — a word at box 1 already opens its sentence", () => {
    // a1, a2 only net-correct once (box 1): not 'learned' for unlocks, but usable in s1.
    const mk = (id: string): ItemProgress => ({
      kind: "recognition",
      itemId: id,
      box: 1,
      correctStreak: 1,
      totalCorrect: 1,
      totalSeen: 2,
      lastSeen: 1,
    });
    const p: ProgressMap = new Map([
      [progressKey("recognition", "a1"), mk("a1")],
      [progressKey("recognition", "a2"), mk("a2")],
    ]);
    expect(wordLearned(p, "a1")).toBe(false); // not mastered for level unlocks
    expect(eligibleSentences(sentences, vocab, p).map((s) => s.id)).toEqual(["s1"]);
  });
});
