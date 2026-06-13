/**
 * en.grammar.integrity.test.ts — invariants over the authored ENGLISH grammar seed
 * (data/en/grammar.seed.json), the counterpart to grammar.integrity.test.ts for Finnish.
 *
 * Checks the same authoring contract between the seed and the runtime (parser + grader):
 * markup balance, plain accepted/wrong strings, option/answer consistency, the accepted∩wrong
 * collision trap, even level spread, and topic-graph integrity (prereqs/modules/rules resolve,
 * no cycles, no impossible gates). It makes NO judgement about whether the English is correct —
 * that is the english-linguist's job. A failure here means the CONTENT is malformed, not the code.
 */

import { describe, it, expect } from "vitest";
import { enPack } from "./en";
import ruleSeed from "../../../data/en/rules.seed.json";
import { lessonItems, setCount, stripForm } from "../../core/grammar";
import { flattenRules, type RawRulesFile } from "../../core/rules";
import { normalizeFi } from "../../core/normalize";

const content = enPack.grammar;
const ruleIds = new Set(flattenRules(ruleSeed as RawRulesFile).map((r) => r.id));

const MARKUP = /[{}[\]*]/;

function assertBalancedMarkup(s: string, where: string) {
  let inBrace = false;
  let inBracket = false;
  for (const ch of s) {
    if (ch === "{") {
      expect(inBrace, `${where}: nested/unclosed { in "${s}"`).toBe(false);
      inBrace = true;
    } else if (ch === "}") {
      expect(inBrace, `${where}: stray } in "${s}"`).toBe(true);
      inBrace = false;
    } else if (ch === "[") {
      expect(inBracket, `${where}: nested/unclosed [ in "${s}"`).toBe(false);
      inBracket = true;
    } else if (ch === "]") {
      expect(inBracket, `${where}: stray ] in "${s}"`).toBe(true);
      inBracket = false;
    }
  }
  expect(inBrace, `${where}: unclosed { in "${s}"`).toBe(false);
  expect(inBracket, `${where}: unclosed [ in "${s}"`).toBe(false);
}

describe("english grammar seed: shape", () => {
  it("has a usable curriculum (modules, topics, items all present)", () => {
    expect(content.modules.length).toBeGreaterThanOrEqual(2);
    expect(content.topics.length).toBeGreaterThanOrEqual(10);
    expect(content.items.length).toBeGreaterThanOrEqual(50);
  });

  it("has unique topic and item ids", () => {
    const topicIds = content.topics.map((t) => t.id);
    expect(new Set(topicIds).size).toBe(topicIds.length);
    const itemIds = content.items.map((i) => i.id);
    expect(new Set(itemIds).size).toBe(itemIds.length);
  });

  it("gives every topic ≥2 variant sets, each a complete lesson (warmup + drill)", () => {
    for (const t of content.topics) {
      const sets = setCount(content.items, t.id);
      expect(sets, `${t.id}: needs ≥2 variant sets`).toBeGreaterThanOrEqual(2);
      for (let s = 1; s <= sets; s++) {
        const items = lessonItems(content.items, t.id, s);
        expect(items.some((i) => i.stage === "warmup"), `${t.id} set ${s}: no warmup`).toBe(true);
        expect(items.some((i) => i.stage === "drill"), `${t.id} set ${s}: no drill`).toBe(true);
      }
    }
  });

  it("spreads grammar evenly: every level up to the last has 1–3 topics (no gaps, no dumps)", () => {
    const byLevel = new Map<number, number>();
    for (const t of content.topics) byLevel.set(t.level, (byLevel.get(t.level) ?? 0) + 1);
    const last = Math.max(...content.topics.map((t) => t.level));
    for (let l = 1; l <= last; l++) {
      const n = byLevel.get(l) ?? 0;
      expect(n, `level ${l} has no grammar topic (gap in the curriculum)`).toBeGreaterThanOrEqual(1);
      expect(n, `level ${l} dumps ${n} topics at once`).toBeLessThanOrEqual(3);
    }
  });

  it("attaches every item to an existing topic", () => {
    const ids = new Set(content.topics.map((t) => t.id));
    for (const i of content.items)
      expect(ids.has(i.topic), `${i.id}: unknown topic ${i.topic}`).toBe(true);
  });
});

describe("english grammar seed: topic graph", () => {
  const ids = new Set(content.topics.map((t) => t.id));
  const moduleIds = new Set(content.modules.map((m) => m.id));

  it("resolves every prereq, module and rule id", () => {
    for (const t of content.topics) {
      expect(moduleIds.has(t.module), `${t.id}: unknown module ${t.module}`).toBe(true);
      for (const p of t.prereq) expect(ids.has(p), `${t.id}: unknown prereq ${p}`).toBe(true);
      for (const r of t.ruleIds) expect(ruleIds.has(r), `${t.id}: unknown rule ${r}`).toBe(true);
    }
  });

  it("never places a prereq at a LATER level than its dependent (no impossible gates)", () => {
    const byId = new Map(content.topics.map((t) => [t.id, t]));
    for (const t of content.topics) {
      for (const p of t.prereq) {
        const pre = byId.get(p);
        if (!pre) continue;
        expect(
          pre.level,
          `${t.id} (L${t.level}) requires ${p} (L${pre.level}) from a later level`,
        ).toBeLessThanOrEqual(t.level);
      }
    }
  });

  it("has no prereq cycles (and at least one entry topic)", () => {
    const byId = new Map(content.topics.map((t) => [t.id, t]));
    const seen = new Map<string, "visiting" | "done">();
    const visit = (id: string): void => {
      const state = seen.get(id);
      expect(state, `prereq cycle through ${id}`).not.toBe("visiting");
      if (state === "done") return;
      seen.set(id, "visiting");
      for (const p of byId.get(id)?.prereq ?? []) visit(p);
      seen.set(id, "done");
    };
    for (const t of content.topics) visit(t.id);
    expect(content.topics.some((t) => t.prereq.length === 0)).toBe(true);
  });
});

describe("english grammar seed: items", () => {
  it("keeps accepted/wrong answers plain (no markup characters)", () => {
    for (const i of content.items) {
      if (i.type === "produce_form" || i.type === "transform") {
        for (const a of i.accepted)
          expect(MARKUP.test(a), `${i.id}: markup in accepted "${a}"`).toBe(false);
        for (const w of i.wrong)
          expect(MARKUP.test(w.match), `${i.id}: markup in wrong "${w.match}"`).toBe(false);
      }
      if (i.type === "fill_table") {
        for (const c of i.cells)
          for (const a of c.accepted)
            expect(MARKUP.test(a), `${i.id}: markup in cell accepted "${a}"`).toBe(false);
      }
    }
  });

  it("balances highlight markup and keeps canonical ⊆ accepted", () => {
    for (const i of content.items) {
      if (i.type === "produce_form" || i.type === "transform") {
        assertBalancedMarkup(i.canonical, i.id);
        const plain = normalizeFi(stripForm(i.canonical));
        expect(
          i.accepted.some((a) => normalizeFi(a) === plain),
          `${i.id}: stripped canonical "${plain}" not in accepted`,
        ).toBe(true);
      }
      if (i.type === "fill_table") {
        for (const c of i.cells) {
          assertBalancedMarkup(c.canonical, `${i.id} · ${c.l}`);
          const plain = normalizeFi(stripForm(c.canonical));
          expect(
            c.accepted.some((a) => normalizeFi(a) === plain),
            `${i.id} · ${c.l}: stripped canonical "${plain}" not in accepted`,
          ).toBe(true);
        }
      }
    }
  });

  it("never lists a predicted-wrong form that is also accepted", () => {
    for (const i of content.items) {
      if (i.type !== "produce_form" && i.type !== "transform") continue;
      const acc = new Set(i.accepted.map(normalizeFi));
      for (const w of i.wrong)
        expect(acc.has(normalizeFi(w.match)), `${i.id}: wrong "${w.match}" is also accepted`).toBe(
          false,
        );
    }
  });

  it("keeps classify/case_id answers and reasons consistent", () => {
    for (const i of content.items) {
      if (i.type !== "classify" && i.type !== "case_id") continue;
      expect(i.answer, `${i.id}: answer out of range`).toBeLessThan(i.optionsRu.length);
      for (const k of Object.keys(i.reasonsRu)) {
        const idx = Number(k);
        expect(idx, `${i.id}: reason index ${k} out of range`).toBeLessThan(i.optionsRu.length);
        expect(idx, `${i.id}: reason given for the CORRECT option`).not.toBe(i.answer);
      }
    }
  });

  it("keeps choose_form options consistent (one correct, wrong ones explained)", () => {
    for (const i of content.items) {
      if (i.type !== "choose_form") continue;
      expect(
        i.options.filter((o) => o.fi === i.answer).length,
        `${i.id}: answer must match exactly one option`,
      ).toBe(1);
      expect(i.promptFi.includes("___"), `${i.id}: choose_form prompt needs a ___ gap`).toBe(true);
      for (const o of i.options) {
        if (o.fi === i.answer) continue;
        expect(o.whyRu, `${i.id}: wrong option "${o.fi}" lacks why_ru`).toBeTruthy();
      }
    }
  });

  it("gives every fill_table ≥4 cells with unique labels", () => {
    for (const i of content.items) {
      if (i.type !== "fill_table") continue;
      expect(i.cells.length, `${i.id}: too few cells`).toBeGreaterThanOrEqual(4);
      const labels = i.cells.map((c) => c.l);
      expect(new Set(labels).size, `${i.id}: duplicate person labels`).toBe(labels.length);
    }
  });
});
