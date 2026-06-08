import { describe, expect, it } from "vitest";
import { CEFR_ORDER, cefrOfLevel, cefrProgress } from "./curriculum";
import { LEVEL_COMPLETE_FRACTION, type LevelStat } from "./levels";

const stat = (level: number, fracLearned: number, total = 10): LevelStat => ({
  level,
  total,
  learned: Math.round(fracLearned * total),
  fraction: fracLearned,
});

/** All levels complete (learned ≥ threshold) up to `through`, the rest at 0. */
const upTo = (through: number, maxLevel = 12): LevelStat[] =>
  Array.from({ length: maxLevel }, (_, i) => stat(i + 1, i + 1 <= through ? 1 : 0));

describe("cefrOfLevel", () => {
  it("maps 1–6 to A1 and 7–12 to A2 (linguist banding)", () => {
    expect([1, 3, 6].map(cefrOfLevel)).toEqual(["A1", "A1", "A1"]);
    expect([7, 10, 12].map(cefrOfLevel)).toEqual(["A2", "A2", "A2"]);
  });
  it("levels beyond the last boundary take the final band", () => {
    expect(cefrOfLevel(99)).toBe("A2");
  });
  it("CEFR_ORDER ascends", () => {
    expect(CEFR_ORDER).toEqual(["A1", "A2"]);
  });
});

describe("cefrProgress", () => {
  it("nothing done → milestone A1 at 0, next is A2", () => {
    const p = cefrProgress(upTo(0));
    expect(p).toMatchObject({ band: "A1", nextBand: "A2", levelsTotal: 6, levelsDone: 0, complete: false });
    expect(p.fraction).toBe(0);
  });

  it("half of A1 done → still A1, ~half progress", () => {
    const p = cefrProgress(upTo(3)); // levels 1–3 done of 1–6
    expect(p.band).toBe("A1");
    expect(p.levelsDone).toBe(3);
    expect(p.fraction).toBeCloseTo(0.5);
  });

  it("all A1 done → milestone advances to A2", () => {
    const p = cefrProgress(upTo(6));
    expect(p).toMatchObject({ band: "A2", nextBand: null, levelsTotal: 6, levelsDone: 0 });
  });

  it("a level at the completion threshold reads as done", () => {
    // total=100 so learned lands exactly on the threshold (round(0.93*100)=93 → 0.93 ≥ 0.93).
    const stats = upTo(0).map((s) => (s.level === 1 ? stat(1, LEVEL_COMPLETE_FRACTION, 100) : s));
    expect(cefrProgress(stats).levelsDone).toBe(1);
  });

  it("everything done → final band, complete", () => {
    const p = cefrProgress(upTo(12));
    expect(p).toMatchObject({ band: "A2", nextBand: null, complete: true, fraction: 1 });
  });

  it("empty levels in a band don't block it", () => {
    // A1 = levels 1–6 but only 1–2 exist, both done → A1 complete, milestone A2 (empty → complete).
    const p = cefrProgress([stat(1, 1), stat(2, 1)]);
    expect(p.complete).toBe(true);
  });
});
