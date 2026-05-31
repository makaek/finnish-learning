import { describe, it, expect } from "vitest";
import { normalizeFi } from "./normalize";

describe("normalizeFi", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeFi("  Menen   Töihin ")).toBe("menen töihin");
  });

  it("strips a single trailing . ? or !", () => {
    expect(normalizeFi("työ.")).toBe("työ");
    expect(normalizeFi("työ?")).toBe("työ");
    expect(normalizeFi("työ!")).toBe("työ");
  });

  it("strips only one trailing punctuation mark", () => {
    expect(normalizeFi("työ!!")).toBe("työ!");
  });

  it("preserves Finnish dotted vowels", () => {
    expect(normalizeFi("TYÖ")).toBe("työ");
  });
});
