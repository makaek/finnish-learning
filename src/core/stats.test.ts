import { describe, expect, it } from "vitest";
import { masteryRows, mergeByItem, groupReadiness } from "./stats";
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

  it("sorts mastered (hideable) items first", () => {
    const progress = mk(
      rec("recognition", "a", 5, 5),
      rec("production", "a", 5, 5),
      rec("say_word", "a", 5, 5), // 'a' fully mastered → on top
      rec("recognition", "b", 1, 2), // 'b' not
    );
    expect(mergeByItem(pair, pair, progress, WORD_KINDS, 3).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("groupReadiness (relative balance across modes)", () => {
  const KINDS: ItemKind[] = ["recognition", "production", "say_word"];
  const pool = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}` }));
  // Master `n` items of `pool` in `kind` (box 5).
  const masterN = (kind: ItemKind, n: number): ItemProgress[] =>
    pool.slice(0, n).map((it) => ({
      kind,
      itemId: it.id,
      box: 5,
      correctStreak: 5,
      totalCorrect: 5,
      totalSeen: 5,
      lastSeen: 1,
    }));

  it("colours each mode relative to the leader with forgiving bands: 10/4/1 → green/yellow/red", () => {
    const progress = map(...masterN("recognition", 10), ...masterN("production", 4), ...masterN("say_word", 1));
    const r = groupReadiness(pool, progress, KINDS, 3);
    expect(r.get("recognition")).toEqual({ mastered: 10, leader: 10, ratio: 1, level: "green" }); // 10/10
    expect(r.get("production")!.level).toBe("yellow"); // 4/10 = 0.4 (≥0.15, <0.5)
    expect(r.get("production")!.ratio).toBeCloseTo(0.4);
    expect(r.get("say_word")!.level).toBe("red"); // 1/10 = 0.1 (<0.15)
  });

  it("treats half the leader's count as green (forgiving threshold)", () => {
    const progress = map(...masterN("recognition", 10), ...masterN("production", 5));
    expect(groupReadiness(pool, progress, KINDS, 3).get("production")!.level).toBe("green"); // 5/10
  });

  it("calls balanced modes all green (it's about balance, not the whole deck)", () => {
    const progress = map(...masterN("recognition", 3), ...masterN("production", 3), ...masterN("say_word", 3));
    const r = groupReadiness(pool, progress, KINDS, 3);
    for (const k of KINDS) expect(r.get(k)!.level).toBe("green"); // 3/3/3 → all green
  });

  it("is 'none' for everything until something is mastered, or for an empty pool", () => {
    for (const k of KINDS) expect(groupReadiness(pool, new Map(), KINDS, 3).get(k)!.level).toBe("none");
    for (const k of KINDS) expect(groupReadiness([], new Map(), KINDS, 3).get(k)!.level).toBe("none");
  });
});
