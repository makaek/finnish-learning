import { describe, it, expect } from "vitest";
import { flattenRules, rulesForPos, rulesForTeaches, type RawRulesFile } from "./rules";

const raw: RawRulesFile = {
  rules: [
    {
      id: "partitive",
      title: "Партитив",
      summary: "Частичный объект.",
      body: "Объясняет партитив.",
      examples: [{ fi: "Juon kahvia.", ru: "Я пью кофе." }],
      match: { teaches: ["Partitive"], pos: ["noun", "num"] },
    },
    {
      id: "negation",
      title: "Отрицание",
      summary: "ei + коннегатив.",
      body: "Объясняет отрицание.",
      examples: [],
      match: { teaches: ["negation"], pos: ["neg_verb", "verb"] },
    },
    // malformed: missing body — must be skipped.
    { id: "broken", title: "Нет тела", match: { teaches: ["x"], pos: [] } },
  ],
};

describe("flattenRules", () => {
  const rules = flattenRules(raw);

  it("parses valid rules and skips malformed ones", () => {
    expect(rules.map((r) => r.id)).toEqual(["partitive", "negation"]);
  });

  it("defaults a missing summary to empty and lowercases teaches keywords", () => {
    const partitive = rules.find((r) => r.id === "partitive")!;
    expect(partitive.match.teaches).toEqual(["partitive"]); // lowercased from "Partitive"
    expect(rules.find((r) => r.id === "negation")!.examples).toEqual([]);
  });

  it("returns [] for a missing rules array", () => {
    expect(flattenRules({})).toEqual([]);
  });
});

describe("rulesForTeaches", () => {
  const rules = flattenRules(raw);

  it("matches a rule when a keyword is a substring of the (case-insensitive) teaches tag", () => {
    const got = rulesForTeaches("past tense + PARTITIVE plural object", rules);
    expect(got.map((r) => r.id)).toEqual(["partitive"]);
  });

  it("can match several rules for one tag", () => {
    const got = rulesForTeaches("negation + connegative + partitive object", rules);
    expect(got.map((r) => r.id).sort()).toEqual(["negation", "partitive"]);
  });

  it("returns [] for a missing/blank tag", () => {
    expect(rulesForTeaches(undefined, rules)).toEqual([]);
    expect(rulesForTeaches("", rules)).toEqual([]);
    expect(rulesForTeaches("inessive of place", rules)).toEqual([]); // no keyword matches
  });
});

describe("rulesForPos", () => {
  const rules = flattenRules(raw);

  it("matches rules whose match.pos contains the word's pos", () => {
    expect(rulesForPos("num", rules).map((r) => r.id)).toEqual(["partitive"]);
    expect(rulesForPos("verb", rules).map((r) => r.id)).toEqual(["negation"]);
    expect(rulesForPos("adv", rules)).toEqual([]);
  });
});
