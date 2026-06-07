import { describe, expect, it } from "vitest";
import {
  computeBalance,
  isLevelBalanced,
  GATE_TARGET,
  PAUSE_GAP,
  type ModeInput,
} from "./balance";

/** Build a ModeInput with sensible defaults; only id/group/mastered/total usually matter. */
function mode(id: string, group: ModeInput["group"], mastered: number, total: number): ModeInput {
  return { id, group, label: id, icon: "•", mastered, total };
}

describe("computeBalance — mastery", () => {
  it("mastery = mastered/total, and an empty mode (total 0) is fully done", () => {
    const b = computeBalance([mode("a", "words", 1, 4), mode("b", "words", 0, 0)], 1);
    const a = b.cells.find((c) => c.id === "a")!;
    const empty = b.cells.find((c) => c.id === "b")!;
    expect(a.mastery).toBeCloseTo(0.25);
    expect(empty.mastery).toBe(1);
    expect(empty.state).toBe("done");
  });

  it("colour states: red ≤30%, yellow >30% & <100%, green at 100% (or nothing to drill)", () => {
    const b = computeBalance(
      [
        mode("red", "words", 3, 10), //    .3 → weak (boundary is inclusive)
        mode("red2", "words", 1, 10), //   .1 → weak
        mode("yellow", "words", 4, 10), // .4 → ok
        mode("yellow2", "words", 9, 10), // .9 → ok (no more "strong")
        mode("green", "words", 10, 10), // 1  → done
        mode("empty", "words", 0, 0), //   nothing → done
      ],
      1,
    );
    const s = Object.fromEntries(b.cells.map((c) => [c.id, c.state]));
    expect(s).toEqual({
      red: "weak",
      red2: "weak",
      yellow: "ok",
      yellow2: "ok",
      green: "done",
      empty: "done",
    });
  });
});

describe("computeBalance — weakest", () => {
  it("weakest = the single lowest-mastery unfinished mode; ties resolve to first in order", () => {
    const b = computeBalance(
      [mode("a", "words", 3, 10), mode("b", "sent", 1, 10), mode("c", "read", 1, 10)],
      2,
    );
    expect(b.weakest?.id).toBe("b");
    expect(b.cells.filter((c) => c.weakest)).toHaveLength(1);
  });

  it("a fully-finished level has no weakest and gate 1", () => {
    const b = computeBalance([mode("a", "words", 4, 4), mode("b", "words", 0, 0)], 3);
    expect(b.weakest).toBeNull();
    expect(b.gate).toBe(1);
  });
});

describe("computeBalance — pause (leaders only)", () => {
  it("pauses a leader that runs >= PAUSE_GAP ahead of its group floor", () => {
    // group floor = .2; leader at .2 + PAUSE_GAP should pause, the laggard never does.
    const lead = Math.round((0.2 + PAUSE_GAP) * 10);
    const b = computeBalance(
      [mode("lead", "words", lead, 10), mode("lag", "words", 2, 10)],
      1,
    );
    expect(b.cells.find((c) => c.id === "lead")!.paused).toBe(true);
    expect(b.cells.find((c) => c.id === "lag")!.paused).toBe(false);
  });

  it("does not pause when the gap is below PAUSE_GAP", () => {
    const b = computeBalance(
      [mode("lead", "words", 4, 10), mode("lag", "words", 2, 10)], // gap .2 < .3
      1,
    );
    expect(b.cells.every((c) => !c.paused)).toBe(true);
  });

  it("never pauses a finished mode", () => {
    const b = computeBalance(
      [mode("done", "words", 10, 10), mode("lag", "words", 1, 10)],
      1,
    );
    expect(b.cells.find((c) => c.id === "done")!.paused).toBe(false);
  });
});

describe("computeBalance — score (evenness)", () => {
  it("is 100 when all unfinished modes are equal", () => {
    const b = computeBalance(
      [mode("a", "words", 3, 10), mode("b", "sent", 3, 10)],
      1,
    );
    expect(b.score).toBe(100);
  });

  it("drops as modes diverge", () => {
    const even = computeBalance([mode("a", "words", 3, 10), mode("b", "sent", 3, 10)], 1);
    const skew = computeBalance([mode("a", "words", 1, 10), mode("b", "sent", 9, 10)], 1);
    expect(skew.score).toBeLessThan(even.score);
  });

  it("ignores finished modes (they don't count against balance)", () => {
    const b = computeBalance(
      [mode("a", "words", 3, 10), mode("b", "sent", 3, 10), mode("done", "read", 5, 5)],
      1,
    );
    expect(b.score).toBe(100);
  });
});

describe("computeBalance — gate / isLevelBalanced", () => {
  it("gate equals the weakest mode's mastery", () => {
    const b = computeBalance([mode("a", "words", 8, 10), mode("b", "sent", 3, 10)], 1);
    expect(b.gate).toBeCloseTo(0.3);
  });

  it("isLevelBalanced flips at GATE_TARGET", () => {
    const below = computeBalance(
      [mode("a", "words", Math.round((GATE_TARGET - 0.1) * 10), 10), mode("b", "sent", 9, 10)],
      1,
    );
    const at = computeBalance(
      [mode("a", "words", Math.round(GATE_TARGET * 10), 10), mode("b", "sent", 9, 10)],
      1,
    );
    expect(isLevelBalanced(below)).toBe(false);
    expect(isLevelBalanced(at)).toBe(true);
  });

  it("a fully-done level is balanced", () => {
    const b = computeBalance([mode("a", "words", 4, 4)], 1);
    expect(isLevelBalanced(b)).toBe(true);
  });
});
