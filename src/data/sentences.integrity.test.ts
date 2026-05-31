import { describe, it, expect } from "vitest";
import { SENTENCES, grade } from "./sentences";
import { VOCAB } from "./dictionary";

/**
 * Data-integrity guard for the authored sentence bank. As the bank grows (via
 * /expand-sentences), these invariants catch structural authoring slips early. They make NO
 * judgement about whether the Finnish is correct — that is the finnish-linguist's job; this
 * only checks shape and self-consistency against the real grading engine.
 */

const dictIds = new Set(VOCAB.map((v) => v.id));

describe("sentences.seed.json integrity", () => {
  it("has unique sentence ids", () => {
    const ids = SENTENCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every sentence has non-empty ru/canonical/accepted and resolvable `uses`", () => {
    for (const s of SENTENCES) {
      expect(s.ru.trim().length, `${s.id} ru`).toBeGreaterThan(0);
      expect(s.canonical.trim().length, `${s.id} canonical`).toBeGreaterThan(0);
      expect(s.accepted.length, `${s.id} accepted`).toBeGreaterThan(0);
      expect(Array.isArray(s.uses)).toBe(true);
      for (const u of s.uses) {
        expect(dictIds.has(u), `${s.id} uses unknown dictionary id "${u}"`).toBe(true);
      }
    }
  });

  it("every wrong entry has a non-empty match and Russian explanation", () => {
    for (const s of SENTENCES) {
      for (const w of s.wrong) {
        expect(w.match.trim().length, `${s.id} wrong.match`).toBeGreaterThan(0);
        expect(w.ru.trim().length, `${s.id} wrong.ru`).toBeGreaterThan(0);
      }
    }
  });

  it("grades the canonical and every accepted form as correct", async () => {
    for (const s of SENTENCES) {
      const c = await grade({ sentenceId: s.id, answer: s.canonical });
      expect(c.correct, `${s.id}: canonical is not accepted`).toBe(true);
      for (const a of s.accepted) {
        const r = await grade({ sentenceId: s.id, answer: a });
        expect(r.correct, `${s.id}: accepted form rejected: "${a}"`).toBe(true);
      }
    }
  });

  it("classifies every known-wrong pattern as 'known', never correct", async () => {
    for (const s of SENTENCES) {
      for (const w of s.wrong) {
        const r = await grade({ sentenceId: s.id, answer: w.match });
        expect(r.correct, `${s.id}: wrong pattern accepted as correct: "${w.match}"`).toBe(
          false,
        );
        expect(r.via, `${s.id}: wrong pattern not classified 'known': "${w.match}"`).toBe(
          "known",
        );
      }
    }
  });

  it("never lets a wrong pattern's dropped-pronoun variant grade as correct", async () => {
    // Guards the collision trap: if a wrong.match begins with a subject pronoun, the grader
    // auto-derives the pronoun-less form — which must NOT coincide with an accepted answer.
    for (const s of SENTENCES) {
      for (const w of s.wrong) {
        const dropped = w.match.replace(/^(minä|sinä|hän|me|te|he)\s+/i, "");
        if (dropped === w.match) continue;
        const r = await grade({ sentenceId: s.id, answer: dropped });
        expect(
          r.correct,
          `${s.id}: dropped-pronoun of wrong "${w.match}" wrongly accepted: "${dropped}"`,
        ).toBe(false);
      }
    }
  });
});
