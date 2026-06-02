import { describe, expect, it } from "vitest";
import { digitsToFinnish, pickBestSpoken, pickBestSpokenAsync } from "./spokenNumber";

describe("digitsToFinnish", () => {
  it("rewrites a bare digit to its Finnish number word", () => {
    expect(digitsToFinnish("2")).toBe("kaksi");
    expect(digitsToFinnish("10")).toBe("kymmenen");
    expect(digitsToFinnish("100")).toBe("sata");
  });

  it("keeps trailing punctuation", () => {
    expect(digitsToFinnish("2.")).toBe("kaksi.");
    expect(digitsToFinnish("3?")).toBe("kolme?");
  });

  it("rewrites digit tokens inside a phrase, leaving words alone", () => {
    expect(digitsToFinnish("minulla on 2 kissaa")).toBe("minulla on kaksi kissaa");
  });

  it("passes through non-digit text and uncovered numbers unchanged", () => {
    expect(digitsToFinnish("kaksi")).toBe("kaksi");
    expect(digitsToFinnish("the cat")).toBe("the cat");
    expect(digitsToFinnish("21")).toBe("21"); // not in the curriculum map
  });
});

describe("pickBestSpoken", () => {
  it("returns the first accepted alternative, not the top guess", () => {
    const alts = ["the", "kissa", "kissaa"];
    expect(pickBestSpoken(alts, (c) => c === "kissa")).toBe("kissa");
  });

  it("digit-normalizes before testing acceptance", () => {
    const alts = ["2"]; // engine heard "kaksi" but transcribed a digit
    expect(pickBestSpoken(alts, (c) => c === "kaksi")).toBe("kaksi");
  });

  it("falls back to the top (normalized) hypothesis when none match", () => {
    expect(pickBestSpoken(["two", "to"], () => false)).toBe("two");
    expect(pickBestSpoken(["2", "to"], () => false)).toBe("kaksi");
  });

  it("returns empty string for an empty list", () => {
    expect(pickBestSpoken([], () => true)).toBe("");
  });
});

describe("pickBestSpokenAsync", () => {
  it("returns the first alternative the async grader accepts", async () => {
    const alts = ["the dog", "koira"];
    const best = await pickBestSpokenAsync(alts, async (c) => Promise.resolve(c === "koira"));
    expect(best).toBe("koira");
  });

  it("digit-normalizes before testing the async grader", async () => {
    const best = await pickBestSpokenAsync(["2"], async (c) => Promise.resolve(c === "kaksi"));
    expect(best).toBe("kaksi");
  });

  it("falls back to the top hypothesis when none are accepted", async () => {
    const best = await pickBestSpokenAsync(["2", "two"], async () => Promise.resolve(false));
    expect(best).toBe("kaksi");
  });
});
