import { describe, it, expect } from "vitest";
import { RULES } from "./rules";
import { SENTENCES } from "./sentences";
import { VOCAB } from "./dictionary";
import { rulesForPos, rulesForTeaches } from "../core/rules";

/**
 * Data-integrity guard for the authored grammar book. Checks shape and that the rule↔lesson
 * links actually fire — so a learner always sees at least one relevant rule. Makes NO judgement
 * about whether the Finnish/Russian content is correct (that's the finnish-linguist's job).
 */
describe("rules.seed.json integrity", () => {
  it("loads a non-empty book with unique ids", () => {
    expect(RULES.length).toBeGreaterThan(0);
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule has non-empty title/summary/body", () => {
    for (const r of RULES) {
      expect(r.title.trim().length, `${r.id} title`).toBeGreaterThan(0);
      expect(r.summary.trim().length, `${r.id} summary`).toBeGreaterThan(0);
      expect(r.body.trim().length, `${r.id} body`).toBeGreaterThan(0);
    }
  });

  it("every sentence's `teaches` tag maps to at least one rule", () => {
    for (const s of SENTENCES) {
      const hits = rulesForTeaches(s.teaches, RULES);
      expect(hits.length, `${s.id} (${s.teaches}) matches no rule`).toBeGreaterThan(0);
    }
  });

  it("every content part of speech maps to at least one rule", () => {
    // Interjections (kiitos, hei…) carry no grammar rule by design — a word lesson there simply
    // opens the book with nothing highlighted. The grammatical classes must each have a rule.
    const CONTENT_POS = ["noun", "verb", "adj", "pronoun", "neg_verb", "num", "conj"] as const;
    const present = new Set(VOCAB.map((v) => v.pos));
    for (const pos of CONTENT_POS) {
      if (!present.has(pos)) continue;
      expect(rulesForPos(pos, RULES).length, `pos "${pos}" matches no rule`).toBeGreaterThan(0);
    }
  });
});
