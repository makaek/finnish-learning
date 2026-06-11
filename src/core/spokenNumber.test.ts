import { describe, expect, it } from "vitest";
import {
  digitsToFinnish,
  numberToFinnish,
  spokenCandidates,
  pickBestSpoken,
  pickBestSpokenAsync,
} from "./spokenNumber";

describe("numberToFinnish (0–9999 cardinals)", () => {
  it("handles ones, teens, tens and compounds", () => {
    expect(numberToFinnish(0)).toBe("nolla");
    expect(numberToFinnish(7)).toBe("seitsemän");
    expect(numberToFinnish(11)).toBe("yksitoista");
    expect(numberToFinnish(19)).toBe("yhdeksäntoista");
    expect(numberToFinnish(20)).toBe("kaksikymmentä");
    expect(numberToFinnish(25)).toBe("kaksikymmentäviisi");
    expect(numberToFinnish(90)).toBe("yhdeksänkymmentä");
  });

  it("handles hundreds and a thousand", () => {
    expect(numberToFinnish(100)).toBe("sata");
    expect(numberToFinnish(125)).toBe("satakaksikymmentäviisi");
    expect(numberToFinnish(200)).toBe("kaksisataa");
    expect(numberToFinnish(1000)).toBe("tuhat");
  });

  it("handles thousands and years", () => {
    expect(numberToFinnish(1001)).toBe("tuhatyksi");
    expect(numberToFinnish(1990)).toBe("tuhatyhdeksänsataayhdeksänkymmentä");
    expect(numberToFinnish(2000)).toBe("kaksituhatta");
    expect(numberToFinnish(2026)).toBe("kaksituhattakaksikymmentäkuusi");
    expect(numberToFinnish(9999)).toBe("yhdeksäntuhattayhdeksänsataayhdeksänkymmentäyhdeksän");
  });

  it("returns null outside the supported range", () => {
    expect(numberToFinnish(-1)).toBeNull();
    expect(numberToFinnish(10000)).toBeNull();
    expect(numberToFinnish(2.5)).toBeNull();
  });
});

describe("digitsToFinnish", () => {
  it("rewrites a bare digit to its Finnish number word", () => {
    expect(digitsToFinnish("2")).toBe("kaksi");
    expect(digitsToFinnish("10")).toBe("kymmenen");
    expect(digitsToFinnish("100")).toBe("sata");
    expect(digitsToFinnish("25")).toBe("kaksikymmentäviisi"); // now covers compounds
  });

  it("keeps trailing punctuation", () => {
    expect(digitsToFinnish("2.")).toBe("kaksi.");
    expect(digitsToFinnish("3?")).toBe("kolme?");
  });

  it("rewrites digit tokens inside a phrase, leaving words alone", () => {
    expect(digitsToFinnish("minulla on 2 kissaa")).toBe("minulla on kaksi kissaa");
  });

  it("passes through non-digit text and out-of-range numbers unchanged", () => {
    expect(digitsToFinnish("kaksi")).toBe("kaksi");
    expect(digitsToFinnish("the cat")).toBe("the cat");
    expect(digitsToFinnish("10000")).toBe("10000"); // out of the 0–9999 range
  });
});

describe("spokenCandidates (digits + euro sign)", () => {
  it("offers both euro forms for the «€» sign", () => {
    expect(spokenCandidates("5 €")).toEqual(["viisi euroa", "viisi euro"]);
    expect(spokenCandidates("1€")).toEqual(["yksi euroa", "yksi euro"]);
  });

  it("just digit-normalizes when there's no euro sign", () => {
    expect(spokenCandidates("25 kissaa")).toEqual(["kaksikymmentäviisi kissaa"]);
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

  it("accepts a euro amount the engine returned with the «€» sign", () => {
    // "viisi euroa" came back as "5 €" → must still grade correct.
    expect(pickBestSpoken(["5 €"], (c) => c === "viisi euroa")).toBe("viisi euroa");
    // nominative "yksi euro" from "1 €" too.
    expect(pickBestSpoken(["1 €"], (c) => c === "yksi euro")).toBe("yksi euro");
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
