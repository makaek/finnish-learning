import { describe, it, expect } from "vitest";
import { TEXTS, gradeQuestion } from "./texts";
import { glossKey, rolesOf, tokenizeLine } from "../core/reading";
import { normalizeFi } from "../core/normalize";

/**
 * Data-integrity guard for the authored reading library. Checks shape and self-consistency
 * only — it makes NO judgement about whether the Finnish/Russian is correct (that's the
 * finnish-linguist's job). Catches authoring slips as the library grows.
 */
describe("texts.seed.json integrity", () => {
  it("loads a non-empty library with unique ids", () => {
    expect(TEXTS.length).toBeGreaterThan(0);
    const ids = TEXTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every text has a title, an integer level >= 1, and >=1 line with non-empty fi/ru", () => {
    for (const t of TEXTS) {
      expect(t.title.trim().length, `${t.id} title`).toBeGreaterThan(0);
      expect(Number.isInteger(t.level) && t.level >= 1, `${t.id} level ${t.level}`).toBe(true);
      expect(t.lines.length, `${t.id} lines`).toBeGreaterThan(0);
      for (const l of t.lines) {
        expect(l.fi.trim().length, `${t.id} fi`).toBeGreaterThan(0);
        expect(l.ru.trim().length, `${t.id} ru`).toBeGreaterThan(0);
      }
    }
  });

  it("dialogs have >=2 lines, a speaker on every line, and >=2 distinct speakers", () => {
    for (const t of TEXTS.filter((x) => x.type === "dialog")) {
      expect(t.lines.length, `${t.id} dialog lines`).toBeGreaterThanOrEqual(2);
      for (const l of t.lines) {
        expect(
          typeof l.speaker === "string" && l.speaker.length > 0,
          `${t.id} line missing speaker`,
        ).toBe(true);
      }
      expect(rolesOf(t).length, `${t.id} distinct speakers`).toBeGreaterThanOrEqual(2);
    }
  });

  it("monologue ('text') lines carry no speaker", () => {
    for (const t of TEXTS.filter((x) => x.type === "text")) {
      for (const l of t.lines) {
        expect(l.speaker, `${t.id} monologue line has a speaker`).toBeUndefined();
      }
    }
  });
});

describe("texts.seed.json glosses + questions integrity", () => {
  const allGlossed = TEXTS.flatMap((t) => t.lines).filter((l) => l.glosses);
  const allQuestions = TEXTS.flatMap((t) => t.questions ?? []);

  it("authored some click-to-translate glosses and comprehension questions", () => {
    // Sanity: catch a totally un-authored seed (the feature ships with content).
    expect(allGlossed.length, "no lines have glosses").toBeGreaterThan(0);
    expect(allQuestions.length, "no texts have questions").toBeGreaterThan(0);
  });

  it("every gloss key is a real (normalized) token of its line", () => {
    for (const t of TEXTS) {
      for (const l of t.lines) {
        if (!l.glosses) continue;
        const keys = new Set(tokenizeLine(l.fi).map(glossKey));
        for (const k of Object.keys(l.glosses)) {
          expect(keys.has(k), `${t.id}: gloss key "${k}" not a token of "${l.fi}"`).toBe(true);
        }
      }
    }
  });

  it("question ids are unique across the whole library", () => {
    const ids = allQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every question has non-empty q/qRu/canonical/accepted", () => {
    for (const t of TEXTS) {
      for (const q of t.questions ?? []) {
        expect(q.q.trim().length, `${q.id} q`).toBeGreaterThan(0);
        expect(q.qRu.trim().length, `${q.id} qRu`).toBeGreaterThan(0);
        expect(q.canonical.trim().length, `${q.id} canonical`).toBeGreaterThan(0);
        expect(q.accepted.length, `${q.id} accepted`).toBeGreaterThan(0);
        expect(normalizeFi(q.canonical).length, `${q.id} canonical normalizes empty`).toBeGreaterThan(0);
      }
    }
  });

  it("grades the canonical and every accepted form as correct", async () => {
    for (const q of allQuestions) {
      const c = await gradeQuestion({ sentenceId: q.id, answer: q.canonical });
      expect(c.correct, `${q.id}: canonical is not accepted`).toBe(true);
      for (const a of q.accepted) {
        const r = await gradeQuestion({ sentenceId: q.id, answer: a });
        expect(r.correct, `${q.id}: accepted form rejected: "${a}"`).toBe(true);
      }
    }
  });

  it("classifies every known-wrong pattern as 'known', never correct", async () => {
    for (const q of allQuestions) {
      for (const w of q.wrong) {
        expect(w.match.trim().length, `${q.id} wrong.match`).toBeGreaterThan(0);
        expect(w.ru.trim().length, `${q.id} wrong.ru`).toBeGreaterThan(0);
        const r = await gradeQuestion({ sentenceId: q.id, answer: w.match });
        expect(r.correct, `${q.id}: wrong pattern accepted: "${w.match}"`).toBe(false);
        expect(r.via, `${q.id}: wrong pattern not 'known': "${w.match}"`).toBe("known");
      }
    }
  });
});
