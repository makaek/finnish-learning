import { describe, it, expect } from "vitest";
import { VOCAB } from "./dictionary";
import { SENTENCES } from "./sentences";
import { TEXTS } from "./texts";
import { THEMES } from "./themes";
import { cefrBandSizes } from "../core/curriculum";
import { levelOf } from "../core/levels";

/**
 * Guards the Finnish curriculum REBALANCE (2026-06): 19 theme-grouped levels, none oversized. These
 * invariants keep the rebalance self-consistent as content grows. (Per-level reading coverage and
 * sentence-vs-word leveling are checked by texts.integrity / sentences.integrity.)
 */

describe("finnish curriculum (post-rebalance)", () => {
  it("no level exceeds 55 words", () => {
    const byLevel = new Map<number, number>();
    for (const v of VOCAB) byLevel.set(levelOf(v), (byLevel.get(levelOf(v)) ?? 0) + 1);
    for (const [lv, n] of byLevel) expect(n, `level ${lv} has ${n} words`).toBeLessThanOrEqual(55);
  });

  it("every word carries a theme that resolves in the registry", () => {
    for (const v of VOCAB) {
      expect(v.theme, `word ${v.id} has no theme`).toBeTruthy();
      expect(THEMES.has(v.theme!), `word ${v.id} theme "${v.theme}" not in registry`).toBe(true);
    }
  });

  it("every sentence/text theme (when present) resolves in the registry", () => {
    for (const s of SENTENCES) if (s.theme) expect(THEMES.has(s.theme), `sentence ${s.id}`).toBe(true);
    for (const t of TEXTS) if (t.theme) expect(THEMES.has(t.theme), `text ${t.id}`).toBe(true);
  });

  it("cefrBandSizes() sums to the max curriculum level (rail covers every level)", () => {
    const maxLevel = Math.max(...VOCAB.map(levelOf));
    const sum = cefrBandSizes().reduce((acc, b) => acc + b.levels, 0);
    expect(sum).toBe(maxLevel);
  });
});
