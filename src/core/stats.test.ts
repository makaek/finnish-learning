import { describe, expect, it } from "vitest";
import { masteryRows, mergeByItem } from "./stats";
import { progressKey, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));

function p(id: string, box: number, streak: number, correct: number, seen: number): ItemProgress {
  return { kind: "recognition", itemId: id, box, correctStreak: streak, totalCorrect: correct, totalSeen: seen, lastSeen: 1 };
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
    expect(masteryRows(items, items, progress, "recognition").map((r) => r.id)).toEqual(["a"]);
  });

  it("carries box, streak and accuracy counters", () => {
    const row = masteryRows(items, items, map(p("a", 3, 3, 5, 6)), "recognition")[0]!;
    expect(row).toMatchObject({ id: "a", box: 3, streak: 3, totalCorrect: 5, totalSeen: 6 });
  });

  it("sorts by box desc, then streak desc, then totalCorrect desc", () => {
    const progress = map(
      p("a", 1, 1, 1, 1),
      p("b", 4, 0, 9, 9),
      p("c", 4, 2, 2, 2),
      p("d", 4, 2, 7, 7),
    );
    expect(masteryRows(items, items, progress, "recognition").map((r) => r.id)).toEqual([
      "d", // box4 streak2 correct7
      "c", // box4 streak2 correct2
      "b", // box4 streak0
      "a", // box1
    ]);
  });

  it("computes chance as the item's weight share of the active pool", () => {
    // a at box0 (weight 32), b at box5 (weight 1); pool = both → a's chance = 32/33.
    const progress = map(p("a", 0, 0, 1, 1), p("b", 5, 5, 5, 5));
    const rows = masteryRows([items[0]!, items[1]!], [items[0]!, items[1]!], progress, "recognition");
    const a = rows.find((r) => r.id === "a")!;
    const b = rows.find((r) => r.id === "b")!;
    expect(a.chance).toBeCloseTo(32 / 33, 6);
    expect(b.chance).toBeCloseTo(1 / 33, 6);
    expect(a.chance + b.chance).toBeCloseTo(1, 6);
  });

  it("reports chance 0 for an answered item that is not in the active pool", () => {
    // 'a' was learned but is no longer in play (e.g. level locked) → chance 0, still listed.
    const progress = map(p("a", 3, 3, 3, 3));
    const rows = masteryRows(items, [items[1]!], progress, "recognition"); // active pool excludes 'a'
    expect(rows).toHaveLength(1);
    expect(rows[0]!.chance).toBe(0);
  });
});

describe("mergeByItem", () => {
  const pair = [{ id: "a" }, { id: "b" }];
  const WORD_KINDS = ["recognition", "production", "say_word"] as const;
  const rec = (kind: ItemKind, id: string, box: number, seen: number): ItemProgress => ({
    kind,
    itemId: id,
    box,
    correctStreak: box,
    totalCorrect: box,
    totalSeen: seen,
    lastSeen: id === "a" ? 2 : 1,
  });
  const mk = (...rows: ItemProgress[]): ProgressMap => {
    const m: ProgressMap = new Map();
    for (const r of rows) m.set(progressKey(r.kind, r.itemId), r);
    return m;
  };

  it("shows only practiced tracks, but is NOT mastered while a lesson type is untried", () => {
    const progress = mk(
      rec("recognition", "a", 3, 3),
      rec("production", "a", 4, 5), // say_word for 'a' never tried (box 0)
      rec("recognition", "b", 1, 2),
    );
    const merged = mergeByItem(pair, pair, progress, WORD_KINDS, 3);
    const a = merged.find((x) => x.id === "a")!;
    expect(a.tracks.map((t) => t.kind)).toEqual(["recognition", "production"]); // untried omitted
    expect(a.mastered).toBe(false); // say_word untried → not fully mastered
    expect(merged.find((x) => x.id === "b")!.mastered).toBe(false);
  });

  it("is mastered only when EVERY lesson type reaches the box", () => {
    const progress = mk(
      rec("recognition", "a", 3, 3),
      rec("production", "a", 3, 3),
      rec("say_word", "a", 5, 5),
    );
    const a = mergeByItem(pair, pair, progress, WORD_KINDS, 3).find((x) => x.id === "a")!;
    expect(a.mastered).toBe(true);
  });

  it("omits items with no practiced track and sorts unmastered first", () => {
    const progress = mk(
      rec("recognition", "a", 5, 5),
      rec("production", "a", 5, 5),
      rec("say_word", "a", 5, 5), // 'a' fully mastered
      rec("recognition", "b", 1, 2), // 'b' not
    );
    expect(mergeByItem(pair, pair, progress, WORD_KINDS, 3).map((x) => x.id)).toEqual(["b", "a"]);
  });
});
