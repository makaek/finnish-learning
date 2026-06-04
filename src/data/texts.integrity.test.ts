import { describe, it, expect } from "vitest";
import { TEXTS } from "./texts";
import { rolesOf } from "../core/reading";

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
