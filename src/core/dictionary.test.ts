import { describe, it, expect } from "vitest";
import { flattenDictionary, type RawDictionary } from "./dictionary";

const sample: RawDictionary = {
  pronouns: [{ id: "p1", fi: "minä", ru: "я", pos: "pronoun" }],
  verbs: [{ id: "v1", fi: "olla", ru: "быть", pos: "verb" }],
  nouns: [
    { id: "n1", fi: "työ", ru: "работа", pos: "noun" },
    { id: "n2", fi: "koti", ru: "дом", pos: "noun" },
  ],
  adjectives: [{ id: "a1", fi: "hyvä", ru: "хороший", pos: "adj" }],
  function_words: [{ id: "f1", fi: "ja", ru: "и", pos: "conj" }],
};

describe("flattenDictionary", () => {
  it("merges every vocab category into one flat list", () => {
    const items = flattenDictionary(sample);
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.id)).toEqual(["p1", "v1", "n1", "n2", "a1", "f1"]);
  });

  it("keeps id, fi, ru and pos for each item", () => {
    const [first] = flattenDictionary(sample);
    expect(first).toEqual({ id: "p1", fi: "minä", ru: "я", pos: "pronoun" });
  });

  it("skips entries missing a usable fi or ru", () => {
    const partial: RawDictionary = {
      nouns: [
        { id: "n1", fi: "työ", ru: "работа", pos: "noun" },
        { id: "n2", fi: "", ru: "пусто", pos: "noun" },
        { id: "n3", fi: "talo", pos: "noun" },
        { id: "n4", fi: "auto", ru: "машина", pos: "noun" },
      ],
    };
    expect(flattenDictionary(partial).map((i) => i.id)).toEqual(["n1", "n4"]);
  });

  it("returns an empty list for an empty dictionary", () => {
    expect(flattenDictionary({})).toEqual([]);
  });
});
