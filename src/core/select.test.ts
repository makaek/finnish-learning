import { describe, expect, it } from "vitest";
import { weightedSample } from "./select";
import { makeRng } from "./quiz";

const ID = (x: { id: string }) => x.id;
const items = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

describe("weightedSample", () => {
  it("returns [] for empty input or size 0", () => {
    expect(weightedSample([], () => 1, makeRng(1), 3)).toEqual([]);
    expect(weightedSample(items, () => 1, makeRng(1), 0)).toEqual([]);
  });

  it("returns a distinct subset capped at min(size, n)", () => {
    const out = weightedSample(items, () => 1, makeRng(7), 3);
    expect(out).toHaveLength(3);
    expect(new Set(out.map(ID)).size).toBe(3); // no repeats
    for (const o of out) expect(items).toContain(o);
  });

  it("returns every item (a permutation) when size exceeds the pool", () => {
    const out = weightedSample(items, () => 1, makeRng(7), 99);
    expect(new Set(out.map(ID))).toEqual(new Set(items.map(ID)));
  });

  it("is deterministic for a given rng seed", () => {
    const a = weightedSample(items, () => 1, makeRng(42), 4).map(ID);
    const b = weightedSample(items, () => 1, makeRng(42), 4).map(ID);
    expect(a).toEqual(b);
  });

  it("excludes weight≤0 items unless needed to fill the size", () => {
    const weights: Record<string, number> = { a: 10, b: 10, c: 0, d: 0, e: 0 };
    // Two positive-weight items, asking for two → the zero-weight ones never appear.
    for (let seed = 0; seed < 25; seed++) {
      const out = weightedSample(items, (i) => weights[i.id]!, makeRng(seed), 2).map(ID);
      expect(out.sort()).toEqual(["a", "b"]);
    }
    // Asking for more than the positive pool forces zero-weight items in to fill.
    expect(weightedSample(items, (i) => weights[i.id]!, makeRng(1), 4)).toHaveLength(4);
  });

  it("draws heavy-weight items far more often than light ones", () => {
    const weights: Record<string, number> = { a: 32, b: 1, c: 1, d: 1, e: 1 };
    let heavyPicks = 0;
    const trials = 400;
    for (let seed = 0; seed < trials; seed++) {
      const top = weightedSample(items, (i) => weights[i.id]!, makeRng(seed), 1)[0];
      if (top?.id === "a") heavyPicks++;
    }
    // "a" carries half the total weight (32 of 36); expect a clear majority of single picks.
    expect(heavyPicks).toBeGreaterThan(trials * 0.6);
  });
});
