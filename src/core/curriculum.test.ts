import { describe, expect, it } from "vitest";
import { CEFR_ORDER, cefrOfLevel, cefrProgress, majorBand } from "./curriculum";
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

describe("cefrOfLevel / majorBand", () => {
  it("maps levels to A1.1/A1.2/A1.3/A2 (linguist banding)", () => {
    expect([1, 2, 3].map(cefrOfLevel)).toEqual(["A1.1", "A1.1", "A1.1"]);
    expect([4, 5, 6].map(cefrOfLevel)).toEqual(["A1.2", "A1.2", "A1.2"]);
    expect([7, 8, 9].map(cefrOfLevel)).toEqual(["A1.3", "A1.3", "A1.3"]);
    expect([10, 12].map(cefrOfLevel)).toEqual(["A2", "A2"]);
  });
  it("levels beyond the last boundary take the final band", () => {
    expect(cefrOfLevel(99)).toBe("A2");
  });
  it("majorBand folds the A1 sub-bands into A1", () => {
    expect((["A1.1", "A1.2", "A1.3"] as const).map(majorBand)).toEqual(["A1", "A1", "A1"]);
    expect(majorBand("A2")).toBe("A2");
  });
  it("CEFR_ORDER is the ascending milestone ladder", () => {
    expect(CEFR_ORDER).toEqual(["A1.1", "A1.2", "A1.3", "A2"]);
  });
});

describe("cefrProgress", () => {
  it("nothing done → milestone A1.1 (major A1) at 0, next is A1.2", () => {
    const p = cefrProgress(upTo(0));
    expect(p).toMatchObject({
      band: "A1.1",
      major: "A1",
      nextBand: "A1.2",
      levelsTotal: 3,
      levelsDone: 0,
      complete: false,
    });
    expect(p.fraction).toBe(0);
  });

  it("two of three A1.1 levels done → still A1.1, ~2/3 progress", () => {
    const p = cefrProgress(upTo(2)); // levels 1–2 done of 1–3
    expect(p.band).toBe("A1.1");
    expect(p.levelsDone).toBe(2);
    expect(p.fraction).toBeCloseTo(2 / 3);
  });

  it("A1.1 done → milestone advances to A1.2", () => {
    expect(cefrProgress(upTo(3))).toMatchObject({ band: "A1.2", nextBand: "A1.3", levelsDone: 0 });
  });

  it("all of A1 (levels 1–9) done → milestone A2", () => {
    expect(cefrProgress(upTo(9))).toMatchObject({ band: "A2", major: "A2", nextBand: null });
  });

  it("a level at the completion threshold reads as done", () => {
    const stats = upTo(0).map((s) => (s.level === 1 ? stat(1, LEVEL_COMPLETE_FRACTION, 100) : s));
    expect(cefrProgress(stats).levelsDone).toBe(1);
  });

  it("everything done → final band, complete", () => {
    expect(cefrProgress(upTo(12))).toMatchObject({ band: "A2", nextBand: null, complete: true, fraction: 1 });
  });

  it("empty levels in a band don't block it", () => {
    // Only levels 1–2 exist (both A1.1), both done → A1.1 complete; later empty bands → complete.
    expect(cefrProgress([stat(1, 1), stat(2, 1)]).complete).toBe(true);
  });
});
