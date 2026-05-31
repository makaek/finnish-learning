import { describe, it, expect } from "vitest";
import type { SentenceItem } from "./grader";
import { buildSentenceSession, DEFAULT_SESSION_SIZE } from "./sentenceSession";

const items: SentenceItem[] = [
  { id: "s1", ru: "A", uses: ["v1"], canonical: "a", accepted: ["a"], wrong: [] },
  { id: "s2", ru: "B", uses: ["v2", "n1"], canonical: "b", accepted: ["b"], wrong: [] },
  { id: "s3", ru: "C", uses: ["v3"], canonical: "c", accepted: ["c"], wrong: [] },
  { id: "s4", ru: "D", uses: ["v4", "n2"], canonical: "d", accepted: ["d"], wrong: [] },
];

describe("buildSentenceSession", () => {
  it("builds the requested number of questions", () => {
    expect(buildSentenceSession(items, 1, 3)).toHaveLength(3);
  });

  it("caps at the eligible pool size", () => {
    expect(buildSentenceSession(items, 1, 100)).toHaveLength(items.length);
  });

  it("draws each sentence at most once and carries the Russian prompt", () => {
    const session = buildSentenceSession(items, 7, items.length);
    const ids = session.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of session) {
      expect(q.promptRu).toBe(items.find((i) => i.id === q.id)?.ru);
    }
  });

  it("applies the eligibility gate (future SRS seam)", () => {
    // Only sentences whose words are all "learned" — here, ids that use v1 or v3.
    const learned = new Set(["v1", "v3"]);
    const isEligible = (uses: readonly string[]) => uses.every((u) => learned.has(u));
    const session = buildSentenceSession(items, 1, 10, isEligible);
    expect(session.map((q) => q.id).sort()).toEqual(["s1", "s3"]);
  });

  it("returns empty for no items, zero size, or nothing eligible", () => {
    expect(buildSentenceSession([], 1, 10)).toEqual([]);
    expect(buildSentenceSession(items, 1, 0)).toEqual([]);
    expect(buildSentenceSession(items, 1, 10, () => false)).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    expect(buildSentenceSession(items, 8, 4)).toEqual(buildSentenceSession(items, 8, 4));
  });

  it("defaults to the shared session size when size is omitted", () => {
    expect(DEFAULT_SESSION_SIZE).toBe(10);
    expect(buildSentenceSession(items, 1)).toHaveLength(
      Math.min(DEFAULT_SESSION_SIZE, items.length),
    );
  });
});
