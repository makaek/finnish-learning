import { describe, expect, it } from "vitest";
import { masteryRows } from "./stats";
import { progressKey, type ItemProgress, type ProgressMap } from "./progress";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));

function p(id: string, box: number, streak: number, correct: number, seen: number): ItemProgress {
  return { kind: "vocab", itemId: id, box, correctStreak: streak, totalCorrect: correct, totalSeen: seen, lastSeen: 1 };
}

function map(...rows: ItemProgress[]): ProgressMap {
  const m: ProgressMap = new Map();
  for (const r of rows) m.set(progressKey(r.kind, r.itemId), r);
  return m;
}

describe("masteryRows", () => {
  it("lists only items answered correctly at least once", () => {
    const progress = map(
      p("a", 2, 2, 3, 4), // shown
      p("b", 0, 0, 0, 2), // seen but never correct → hidden
    );
    expect(masteryRows(items, items, progress, "vocab").map((r) => r.id)).toEqual(["a"]);
  });

  it("carries box, streak and accuracy counters", () => {
    const row = masteryRows(items, items, map(p("a", 3, 3, 5, 6)), "vocab")[0]!;
    expect(row).toMatchObject({ id: "a", box: 3, streak: 3, totalCorrect: 5, totalSeen: 6 });
  });

  it("sorts by box desc, then streak desc, then totalCorrect desc", () => {
    const progress = map(
      p("a", 1, 1, 1, 1),
      p("b", 4, 0, 9, 9),
      p("c", 4, 2, 2, 2),
      p("d", 4, 2, 7, 7),
    );
    expect(masteryRows(items, items, progress, "vocab").map((r) => r.id)).toEqual([
      "d", // box4 streak2 correct7
      "c", // box4 streak2 correct2
      "b", // box4 streak0
      "a", // box1
    ]);
  });

  it("computes chance as the item's weight share of the active pool", () => {
    // a at box0 (weight 32), b at box5 (weight 1); pool = both → a's chance = 32/33.
    const progress = map(p("a", 0, 0, 1, 1), p("b", 5, 5, 5, 5));
    const rows = masteryRows([items[0]!, items[1]!], [items[0]!, items[1]!], progress, "vocab");
    const a = rows.find((r) => r.id === "a")!;
    const b = rows.find((r) => r.id === "b")!;
    expect(a.chance).toBeCloseTo(32 / 33, 6);
    expect(b.chance).toBeCloseTo(1 / 33, 6);
    expect(a.chance + b.chance).toBeCloseTo(1, 6);
  });

  it("reports chance 0 for an answered item that is not in the active pool", () => {
    // 'a' was learned but is no longer in play (e.g. level locked) → chance 0, still listed.
    const progress = map(p("a", 3, 3, 3, 3));
    const rows = masteryRows(items, [items[1]!], progress, "vocab"); // active pool excludes 'a'
    expect(rows).toHaveLength(1);
    expect(rows[0]!.chance).toBe(0);
  });
});
