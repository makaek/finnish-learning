import { describe, expect, it } from "vitest";
import { applyOutcome, selectionWeight, frontierMultiplier, FRONTIER_BOOST } from "./srs";
import { emptyProgress, MAX_BOX, MIN_BOX, type ItemProgress } from "./progress";

const at = (box: number): ItemProgress => ({ ...emptyProgress("recognition", "v1"), box });

describe("applyOutcome", () => {
  it("promotes a box, grows the streak, and bumps counters on a correct answer", () => {
    const next = applyOutcome(emptyProgress("recognition", "v1"), true, 1000);
    expect(next).toEqual({
      kind: "recognition",
      itemId: "v1",
      box: 1,
      correctStreak: 1,
      totalCorrect: 1,
      totalSeen: 1,
      lastSeen: 1000,
    });
  });

  it("demotes a box and resets the streak on a wrong answer (totalCorrect unchanged)", () => {
    const prev: ItemProgress = {
      kind: "recognition",
      itemId: "v1",
      box: 3,
      correctStreak: 3,
      totalCorrect: 3,
      totalSeen: 3,
      lastSeen: 1,
    };
    const next = applyOutcome(prev, false, 2000);
    expect(next.box).toBe(2);
    expect(next.correctStreak).toBe(0);
    expect(next.totalCorrect).toBe(3);
    expect(next.totalSeen).toBe(4);
    expect(next.lastSeen).toBe(2000);
  });

  it("clamps at MAX_BOX when already mastered", () => {
    expect(applyOutcome(at(MAX_BOX), true, 0).box).toBe(MAX_BOX);
  });

  it("clamps at MIN_BOX when already at the bottom", () => {
    expect(applyOutcome(at(MIN_BOX), false, 0).box).toBe(MIN_BOX);
  });

  it("does not mutate the input", () => {
    const prev = emptyProgress("recognition", "v1");
    applyOutcome(prev, true, 1);
    expect(prev).toEqual(emptyProgress("recognition", "v1"));
  });

  it("reaches box 3 after three correct in a row", () => {
    let p = emptyProgress("recognition", "v1");
    for (let i = 0; i < 3; i++) p = applyOutcome(p, true, i);
    expect(p.box).toBe(3);
    expect(p.correctStreak).toBe(3);
  });
});

describe("selectionWeight", () => {
  it("is 2^(MAX_BOX - box): 32 at box 0, 1 at box 5", () => {
    expect(selectionWeight(at(0))).toBe(32);
    expect(selectionWeight(at(MAX_BOX))).toBe(1);
  });

  it("halves with each box and stays strictly decreasing", () => {
    for (let box = 0; box < MAX_BOX; box++) {
      expect(selectionWeight(at(box))).toBe(2 * selectionWeight(at(box + 1)));
    }
  });

  it("makes a 3-in-a-row item 8x less likely than a new one", () => {
    expect(selectionWeight(at(0)) / selectionWeight(at(3))).toBe(8);
  });
});

describe("frontierMultiplier", () => {
  it("boosts only items whose level matches the frontier", () => {
    expect(frontierMultiplier(3, 3)).toBe(FRONTIER_BOOST);
    expect(frontierMultiplier(2, 3)).toBe(1);
    expect(frontierMultiplier(4, 3)).toBe(1);
  });

  it("is a no-op when no frontier is given", () => {
    expect(frontierMultiplier(3)).toBe(1);
  });
});
