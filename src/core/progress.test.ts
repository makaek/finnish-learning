import { describe, expect, it } from "vitest";
import {
  emptyProgress,
  getProgress,
  MIN_BOX,
  progressKey,
  toProgressMap,
  type ItemProgress,
} from "./progress";

describe("progressKey", () => {
  it("namespaces by kind so vocab and sentence ids never collide", () => {
    expect(progressKey("recognition", "s1")).toBe("recognition:s1");
    expect(progressKey("sentences", "s1")).toBe("sentences:s1");
    expect(progressKey("recognition", "s1")).not.toBe(progressKey("sentences", "s1"));
  });
});

describe("emptyProgress", () => {
  it("starts a never-seen item in the lowest box with zeroed counters", () => {
    expect(emptyProgress("recognition", "v1")).toEqual({
      kind: "recognition",
      itemId: "v1",
      box: MIN_BOX,
      correctStreak: 0,
      totalCorrect: 0,
      totalSeen: 0,
      lastSeen: 0,
    });
  });
});

describe("getProgress", () => {
  it("returns the stored record when present", () => {
    const stored: ItemProgress = {
      kind: "recognition",
      itemId: "v1",
      box: 3,
      correctStreak: 3,
      totalCorrect: 5,
      totalSeen: 6,
      lastSeen: 1000,
    };
    const map = toProgressMap([stored]);
    expect(getProgress(map, "recognition", "v1")).toBe(stored);
  });

  it("returns a fresh empty record when absent (no undefined leaks out)", () => {
    expect(getProgress(new Map(), "sentences", "s9")).toEqual(emptyProgress("sentences", "s9"));
  });
});

describe("toProgressMap", () => {
  it("keys each item by kind+id", () => {
    const map = toProgressMap([emptyProgress("recognition", "v1"), emptyProgress("sentences", "v1")]);
    expect(map.size).toBe(2);
    expect(map.has("recognition:v1")).toBe(true);
    expect(map.has("sentences:v1")).toBe(true);
  });
});
