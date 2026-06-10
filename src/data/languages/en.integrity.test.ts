import { describe, it, expect } from "vitest";
import { enPack } from "./en";
import { levelOf } from "../../core/levels";
import { glossKey, tokenizeLine } from "../../core/reading";
import { THEMES } from "../themes";

/**
 * Data-integrity guard for the authored ENGLISH A1 pack. Mirrors the Finnish integrity tests:
 * it checks shape + self-consistency against the real grading engine, making NO judgement about
 * whether the English is correct (that is the english-linguist's job). Catches structural
 * authoring slips — bad ids, unresolved `uses`, an accepted answer the grader rejects, a level
 * that gates a sentence behind a higher-level word, etc.
 */

const { vocab, sentences, texts, grade, gradeQuestion } = enPack;
const dictIds = new Set(vocab.map((v) => v.id));
const levelById = new Map(vocab.map((v) => [v.id, levelOf(v)]));

describe("english pack — dictionary", () => {
  it("has unique vocab ids and non-empty fields", () => {
    const ids = vocab.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of vocab) {
      expect(v.fi.trim().length, `${v.id} word`).toBeGreaterThan(0);
      expect(v.ru.trim().length, `${v.id} ru`).toBeGreaterThan(0);
    }
  });
});

describe("english pack — sentences", () => {
  it("has unique sentence ids", () => {
    const ids = sentences.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every sentence has non-empty ru/canonical/accepted and resolvable `uses`", () => {
    for (const s of sentences) {
      expect(s.ru.trim().length, `${s.id} ru`).toBeGreaterThan(0);
      expect(s.canonical.trim().length, `${s.id} canonical`).toBeGreaterThan(0);
      expect(s.accepted.length, `${s.id} accepted`).toBeGreaterThan(0);
      for (const u of s.uses) {
        expect(dictIds.has(u), `${s.id} uses unknown dictionary id "${u}"`).toBe(true);
      }
    }
  });

  it("never gates a sentence behind a word from a higher level than its own", () => {
    for (const s of sentences) {
      const maxWordLevel = s.uses.reduce((m, u) => Math.max(m, levelById.get(u) ?? 1), 1);
      expect(
        levelOf(s),
        `${s.id}: level ${levelOf(s)} < its words' max ${maxWordLevel}`,
      ).toBeGreaterThanOrEqual(maxWordLevel);
    }
  });

  it("grades the canonical and every accepted form as correct", async () => {
    for (const s of sentences) {
      const c = await grade({ sentenceId: s.id, answer: s.canonical });
      expect(c.correct, `${s.id}: canonical not accepted`).toBe(true);
      for (const a of s.accepted) {
        const r = await grade({ sentenceId: s.id, answer: a });
        expect(r.correct, `${s.id}: accepted form rejected: "${a}"`).toBe(true);
      }
    }
  });

  it("classifies every known-wrong pattern as 'known', never correct", async () => {
    for (const s of sentences) {
      for (const w of s.wrong) {
        expect(w.match.trim().length, `${s.id} wrong.match`).toBeGreaterThan(0);
        expect(w.ru.trim().length, `${s.id} wrong.ru`).toBeGreaterThan(0);
        const r = await grade({ sentenceId: s.id, answer: w.match });
        expect(r.correct, `${s.id}: wrong pattern accepted: "${w.match}"`).toBe(false);
        expect(r.via, `${s.id}: wrong pattern not 'known': "${w.match}"`).toBe("known");
      }
    }
  });
});

describe("english pack — reading", () => {
  it("has unique text + question ids", () => {
    const tIds = texts.map((t) => t.id);
    expect(new Set(tIds).size).toBe(tIds.length);
    const qIds = texts.flatMap((t) => (t.questions ?? []).map((q) => q.id));
    expect(new Set(qIds).size).toBe(qIds.length);
  });

  it("grades every comprehension canonical/accepted correct and wrong as 'known'", async () => {
    for (const t of texts) {
      for (const q of t.questions ?? []) {
        const c = await gradeQuestion({ sentenceId: q.id, answer: q.canonical });
        expect(c.correct, `${q.id}: canonical not accepted`).toBe(true);
        for (const a of q.accepted) {
          const r = await gradeQuestion({ sentenceId: q.id, answer: a });
          expect(r.correct, `${q.id}: accepted rejected: "${a}"`).toBe(true);
        }
        for (const w of q.wrong) {
          const r = await gradeQuestion({ sentenceId: q.id, answer: w.match });
          expect(r.correct, `${q.id}: wrong accepted: "${w.match}"`).toBe(false);
        }
      }
    }
  });

  it("has unique text ids and every gloss key is a real token in its line", () => {
    const tIds = texts.map((t) => t.id);
    expect(new Set(tIds).size).toBe(tIds.length);
    for (const t of texts) {
      for (const line of t.lines) {
        if (!line.glosses) continue;
        const lineKeys = new Set(tokenizeLine(line.fi).map(glossKey));
        for (const key of Object.keys(line.glosses)) {
          expect(lineKeys.has(key), `${t.id}: gloss key "${key}" not a token of: "${line.fi}"`).toBe(true);
        }
      }
    }
  });

  it("every word carries a theme that resolves in the registry; sentence/text themes resolve too", () => {
    for (const v of vocab) {
      expect(v.theme, `word ${v.id} has no theme`).toBeTruthy();
      expect(THEMES.has(v.theme!), `word ${v.id} theme "${v.theme}" not in registry`).toBe(true);
    }
    for (const s of sentences) if (s.theme) expect(THEMES.has(s.theme), `sentence ${s.id}`).toBe(true);
    for (const t of texts) if (t.theme) expect(THEMES.has(t.theme), `text ${t.id}`).toBe(true);
  });

  // Per the content rule: every English level that has reading must offer at least TWO monologue
  // texts AND at least TWO dialogs, so neither home reading card is ever thin on any level.
  it("gives every level at least 2 texts and 2 dialogs", () => {
    const levels = [...new Set(texts.map((t) => t.level))].sort((a, b) => a - b);
    for (const lv of levels) {
      const atLevel = texts.filter((t) => t.level === lv);
      const monologues = atLevel.filter((t) => (t.type ?? "text") === "text").length;
      const dialogs = atLevel.filter((t) => t.type === "dialog").length;
      expect(monologues, `level ${lv}: only ${monologues} text(s), need ≥2`).toBeGreaterThanOrEqual(2);
      expect(dialogs, `level ${lv}: only ${dialogs} dialog(s), need ≥2`).toBeGreaterThanOrEqual(2);
    }
  });
});
