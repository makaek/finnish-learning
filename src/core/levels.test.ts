import { describe, expect, it } from "vitest";
import {
  activeLevel,
  activeVocab,
  eligibleSentences,
  LEARNED_BOX,
  levelCompletionLearnProgress,
  levelCompletionStats,
  levelLearnProgress,
  levelOf,
  levelStats,
  listLevels,
  lowestUnmasteredLevel,
  masteringLevel,
  overallProgress,
  readingLearnProgress,
  readingLearned,
  readingMastery,
  sentenceLearned,
  sentenceMastery,
  unlockedLevels,
  unmasteredInLevel,
  wordLearned,
  wordLearnProgress,
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
  it("threshold is 2 clean answers", () => {
    expect(LEARNED_BOX).toBe(2);
  });

  it("counts a word learned via recognition alone", () => {
    expect(wordLearned(box("recognition", "a1", 3), "a1")).toBe(true);
  });

  it("counts a word learned via production alone", () => {
    expect(wordLearned(box("production", "a1", 3), "a1")).toBe(true);
  });

  it("does not count a word below the threshold in either track", () => {
    expect(wordLearned(box("recognition", "a1", 1), "a1")).toBe(false);
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

describe("wordLearnProgress / levelLearnProgress (smooth HUD bar)", () => {
  it("is 0, 0.5, 1 at box 0, 1, >= LEARNED_BOX (best mode, capped)", () => {
    expect(wordLearnProgress(new Map(), "a1")).toBe(0);
    expect(wordLearnProgress(box("recognition", "a1", 1), "a1")).toBe(0.5);
    expect(wordLearnProgress(box("recognition", "a1", 2), "a1")).toBe(1);
    expect(wordLearnProgress(box("production", "a1", 5), "a1")).toBe(1);
  });

  it("averages over a level's words (1 when all learned, 0 when none)", () => {
    expect(levelLearnProgress(vocab, new Map(), 1)).toBe(0);
    expect(levelLearnProgress(vocab, learned(["a1", "a2", "a3", "a4", "a5"]), 1)).toBe(1);
    // One of five at box 1 (0.5) → 0.5/5 = 0.1.
    expect(levelLearnProgress(vocab, box("recognition", "a1", 1), 1)).toBeCloseTo(0.1);
  });

  it("is 1 for an empty level", () => {
    expect(levelLearnProgress(vocab, new Map(), 99)).toBe(1);
  });
});

describe("masteringLevel (the level being completed)", () => {
  it("is the lowest level not yet fully learned", () => {
    expect(masteringLevel(levelStats(vocab, new Map()))).toBe(1);
    expect(masteringLevel(levelStats(vocab, learned(["a1", "a2", "a3", "a4", "a5"])))).toBe(2);
  });

  it("is the highest level once everything is learned", () => {
    const all = learned(["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4", "b5"]);
    expect(masteringLevel(levelStats(vocab, all))).toBe(2);
  });

  it("advances once a level is >= LEVEL_COMPLETE_FRACTION learned (stragglers don't pin it)", () => {
    // 9/10 learned (0.9) → complete enough to move on; 8/10 (0.8) → still completing this level.
    const stat = (level: number, learnedN: number) => ({ level, total: 10, learned: learnedN, fraction: learnedN / 10 });
    expect(masteringLevel([stat(1, 9), stat(2, 0)])).toBe(2);
    expect(masteringLevel([stat(1, 8), stat(2, 0)])).toBe(1);
  });
});

describe("lowestUnmasteredLevel (per-mode selection boost target)", () => {
  it("is the lowest level with an item below mastery in that kind", () => {
    expect(lowestUnmasteredLevel(vocab, new Map(), "recognition")).toBe(1);
    const lvl1Done = learned(["a1", "a2", "a3", "a4", "a5"]); // box 3 in recognition
    expect(lowestUnmasteredLevel(vocab, lvl1Done, "recognition")).toBe(2);
  });

  it("is undefined once every item is mastered in that kind", () => {
    const all = learned(["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4", "b5"]);
    expect(lowestUnmasteredLevel(vocab, all, "recognition")).toBeUndefined();
  });

  it("is per-kind: a word learned in recognition is still unmastered in production", () => {
    const recOnly = learned(["a1", "a2", "a3", "a4", "a5"]);
    expect(lowestUnmasteredLevel(vocab, recOnly, "production")).toBe(1);
  });
});

describe("wordMastery (depth across the four word modes)", () => {
  const merge = (...maps: ProgressMap[]): ProgressMap =>
    new Map(maps.flatMap((m) => [...m]));

  it("is 0 with nothing learned", () => {
    expect(wordMastery(new Map(), "a1")).toBe(0);
  });

  it("is 1/4 for one mastered mode, 2/4 for two", () => {
    expect(wordMastery(box("recognition", "a1", 3), "a1")).toBeCloseTo(1 / 4);
    expect(
      wordMastery(merge(box("recognition", "a1", 3), box("production", "a1", 4)), "a1"),
    ).toBeCloseTo(2 / 4);
  });

  it("is 1 only when all four word modes are mastered", () => {
    const all = merge(
      box("recognition", "a1", 3),
      box("production", "a1", 3),
      box("say_word", "a1", 5),
      box("listen_word", "a1", 4),
    );
    expect(wordMastery(all, "a1")).toBe(1);
  });

  it("ignores sub-threshold boxes", () => {
    expect(wordMastery(box("production", "a1", 1), "a1")).toBe(0);
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
    // 4 of 5 L1 words learned in recognition only → each 1/4 mastered → avg = (4 * 1/4)/5.
    const stats = levelStats(vocab, learned(["a1", "a2", "a3", "a4"]));
    expect(stats[0]!.fraction).toBeCloseTo(4 / 4 / 5); // = 0.2, NOT 0.8
  });

  it("fraction reaches 1 only when every word is mastered in all four modes", () => {
    const ids = ["a1", "a2", "a3", "a4", "a5"];
    const map: ProgressMap = new Map();
    for (const id of ids) {
      for (const kind of ["recognition", "production", "say_word", "listen_word"] as ItemKind[]) {
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

describe("sentence helpers (analogues of the word ones)", () => {
  it("sentenceLearned keys off the typed translation track at LEARNED_BOX", () => {
    expect(sentenceLearned(box("sentences", "s1", 2), "s1")).toBe(true);
    expect(sentenceLearned(box("sentences", "s1", 1), "s1")).toBe(false);
    // A spoken/dictation box alone does NOT make it 'learned' (mirrors the dashboard).
    expect(sentenceLearned(box("say_sentence", "s1", 5), "s1")).toBe(false);
  });

  it("sentenceMastery is the fraction of the three sentence modes mastered", () => {
    expect(sentenceMastery(new Map(), "s1")).toBe(0);
    expect(sentenceMastery(box("sentences", "s1", 2), "s1")).toBeCloseTo(1 / 3);
    const all = new Map([
      ...box("sentences", "s1", 2),
      ...box("say_sentence", "s1", 3),
      ...box("listen_sentence", "s1", 4),
    ]);
    expect(sentenceMastery(all, "s1")).toBe(1);
  });

  it("reading helpers key off the reading track (learned at LEARNED_BOX)", () => {
    expect(readingLearned(new Map(), "t1")).toBe(false);
    expect(readingLearned(box("reading", "t1", 2), "t1")).toBe(true);
    expect(readingMastery(box("reading", "t1", 1), "t1")).toBe(0); // below learned
    expect(readingMastery(box("reading", "t1", 2), "t1")).toBe(1);
    expect(readingLearnProgress(new Map(), "t1")).toBe(0);
    expect(readingLearnProgress(box("reading", "t1", 1), "t1")).toBe(0.5);
    expect(readingLearnProgress(box("reading", "t1", 5), "t1")).toBe(1); // capped
  });
});

describe("unmasteredInLevel (mode-card finish badge)", () => {
  it("counts pool items at a level still below mastery in that kind", () => {
    expect(unmasteredInLevel(vocab, new Map(), "recognition", 1)).toBe(5);
    const lvl1Rec = learned(["a1", "a2", "a3"]); // box 3 recognition for 3 of L1
    expect(unmasteredInLevel(vocab, lvl1Rec, "recognition", 1)).toBe(2);
    expect(unmasteredInLevel(vocab, lvl1Rec, "recognition", 2)).toBe(5); // none of L2 touched
  });

  it("is per-kind and per-level", () => {
    const recOnly = learned(["a1", "a2", "a3", "a4", "a5"]); // L1 done in recognition
    expect(unmasteredInLevel(vocab, recOnly, "recognition", 1)).toBe(0);
    expect(unmasteredInLevel(vocab, recOnly, "production", 1)).toBe(5); // production untouched
  });
});

describe("levelCompletionStats / levelCompletionLearnProgress (combined completion)", () => {
  const texts: VocabLike[] = [
    { id: "t1", level: 1 },
    { id: "t2", level: 2 },
  ];

  it("folds words + sentences + texts into each level's total/learned", () => {
    // L1: words a1..a5 (5) + sentence s1 (1) + text t1 (1) = total 7.
    const stats = levelCompletionStats(vocab, sentences, texts, new Map());
    const l1 = stats.find((s) => s.level === 1)!;
    expect(l1.total).toBe(7);
    expect(l1.learned).toBe(0);
  });

  it("counts a learned word, a learned sentence, and a learned (quizzed) text", () => {
    const progress = new Map([
      ...learned(["a1"]), // a1 learned (recognition)
      ...box("sentences", "s1", 2), // s1 learned (translation)
      ...box("reading", "t1", 2), // t1 comprehension mastered
    ]);
    const stats = levelCompletionStats(vocab, sentences, texts, progress);
    const l1 = stats.find((s) => s.level === 1)!;
    expect(l1.learned).toBe(3); // a1 + s1 + t1
  });

  it("adding sentences/texts lowers a level previously 100% by words alone", () => {
    // All L1 words fully mastered in all four modes → words-only fraction would be 1.
    const wordMap: ProgressMap = new Map();
    for (const id of ["a1", "a2", "a3", "a4", "a5"]) {
      for (const kind of ["recognition", "production", "say_word", "listen_word"] as ItemKind[]) {
        wordMap.set(progressKey(kind, id), {
          kind, itemId: id, box: 3, correctStreak: 3, totalCorrect: 3, totalSeen: 3, lastSeen: 1,
        });
      }
    }
    expect(levelStats(vocab, wordMap)[0]!.fraction).toBe(1); // words-only: complete
    const combined = levelCompletionStats(vocab, sentences, texts, wordMap);
    // Now s1 (mastery 0) and t1 (0) drag the level below 1: (5*1 + 0 + 0) / 7.
    expect(combined.find((s) => s.level === 1)!.fraction).toBeCloseTo(5 / 7);
  });

  it("masteringLevel over combined stats waits for sentences/texts too", () => {
    // L1 words all learned, but its sentence + text are not → still 'completing' L1.
    const progress = learned(["a1", "a2", "a3", "a4", "a5"]);
    expect(masteringLevel(levelStats(vocab, progress))).toBe(2); // words-only: L1 done
    const combined = levelCompletionStats(vocab, sentences, texts, progress);
    expect(masteringLevel(combined)).toBe(1); // combined: L1 not done (s1/t1 pending)
  });

  it("learn-progress blends word/sentence/reading progress over the level", () => {
    // Empty: 0. One text quizzed-to-learned out of 7 L1 items → 1/7.
    expect(levelCompletionLearnProgress(vocab, sentences, texts, new Map(), 1)).toBe(0);
    expect(
      levelCompletionLearnProgress(vocab, sentences, texts, box("reading", "t1", 2), 1),
    ).toBeCloseTo(1 / 7);
  });

  it("is 1 for an empty level", () => {
    expect(levelCompletionLearnProgress(vocab, sentences, texts, new Map(), 99)).toBe(1);
  });
});
