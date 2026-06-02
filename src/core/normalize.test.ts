import { describe, it, expect } from "vitest";
import { normalizeFi } from "./normalize";

describe("normalizeFi", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeFi("  Menen   Töihin ")).toBe("menen töihin");
  });

  it("strips trailing . ? or !", () => {
    expect(normalizeFi("työ.")).toBe("työ");
    expect(normalizeFi("työ?")).toBe("työ");
    expect(normalizeFi("työ!")).toBe("työ");
    expect(normalizeFi("työ!!")).toBe("työ");
  });

  it("drops internal punctuation so voice answers match (commas can't be spoken)", () => {
    expect(normalizeFi("Kiitos, en halua kahvia.")).toBe("kiitos en halua kahvia");
    expect(normalizeFi("kiitos en halua kahvia")).toBe("kiitos en halua kahvia");
  });

  it("replaces a mark with a space so adjacent words don't fuse", () => {
    expect(normalizeFi("kahvia,en")).toBe("kahvia en");
    expect(normalizeFi("«Anteeksi» – sanoi hän")).toBe("anteeksi sanoi hän");
  });

  it("keeps word-internal apostrophes and hyphens", () => {
    expect(normalizeFi("raa'an")).toBe("raa'an");
    expect(normalizeFi("Helsinki-Vantaa")).toBe("helsinki-vantaa");
  });

  it("preserves Finnish dotted vowels", () => {
    expect(normalizeFi("TYÖ")).toBe("työ");
  });
});
