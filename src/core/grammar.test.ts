import { describe, it, expect } from "vitest";
import {
  applyLessonOutcome,
  editDistanceCapped,
  errorWord,
  flattenGrammar,
  GRAMMAR_KIND,
  GRAMMAR_MASTERED_BOX,
  gradeCell,
  gradeTyped,
  grammarStats,
  lessonItems,
  newlyUnlocked,
  parseForm,
  parseRu,
  reviewPatterns,
  stripForm,
  topicMasteryPct,
  topicStates,
  weakestTopic,
  type GrammarItem,
  type GrammarTopic,
  type RawGrammarFile,
  type TypedFormItem,
} from "./grammar";
import { emptyProgress, progressKey, type ProgressMap } from "./progress";

/* ------------------------------------------------------------------ fixtures
 * Finnish forms come straight from verified dictionary entries (nukkua, asua)
 * and the design handoff — no new Finnish is invented here. */

const rawSeed: RawGrammarFile = {
  modules: [{ id: "verb", title: "Глагол", n: 1 }],
  topics: [
    {
      id: "vt1",
      module: "verb",
      order: 2,
      title: "Тип глагола 1",
      summary: "puhua, asua",
      tags: ["verbtype", "grad", "bogus-tag"],
      prereq: ["endings"],
      rule_ids: ["verb-conjugation"],
      theory: {
        title: "Тип глагола 1",
        summary: "Глаголы на -a/-ä.",
        body_ru: "Основа + окончания. Сильная ступень *kk* — у hän.",
        examples: [{ fi: "Hän nukkuu hyvin.", ru: "Он крепко спит." }],
        paradigm: {
          caption: "nukkua · настоящее время",
          rows: [
            { l: "minä", f: "nu[k]u{n}" },
            { l: "hän", f: "nu[kk]{uu}" },
          ],
          key: [
            { hl: "main", label: "личное окончание" },
            { hl: "alt", label: "чередование kk → k" },
          ],
        },
        note_ru: "Слабая ступень перед *-n*.",
      },
    },
    {
      id: "endings",
      module: "verb",
      order: 1,
      title: "Личные окончания",
      summary: "-n, -t, …",
      tags: [],
      prereq: [],
      rule_ids: [],
      theory: { title: "Личные окончания", summary: "", body_ru: "Окончания лиц.", examples: [] },
    },
    { id: "broken" }, // malformed → skipped
  ],
  items: [
    {
      id: "vt1-w1",
      topic: "vt1",
      stage: "warmup",
      type: "classify",
      prompt_fi: "lukea",
      prompt_ru: "какой это тип глагола?",
      options_ru: ["Тип 1", "Тип 2", "Тип 3"],
      answer: 0,
      reasons_ru: { "2": "Тип 3 — глаголы на *-lla*." },
      ok_ru: "Верно!",
      correct_ru: "Правильный ответ — тип 1.",
      review_ru: "тип глагола",
    },
    {
      id: "vt1-d1",
      topic: "vt1",
      stage: "drill",
      type: "produce_form",
      prompt_fi: "nukkua → hän",
      hint_ru: "настоящее время",
      canonical: "nu[kk]{uu}",
      accepted: ["nukkuu", "hän nukkuu"],
      wrong: [{ match: "nukkua", ru: "Это словарная форма." }],
      ok_ru: "Верно! Сильная ступень *kk*.",
      near_ru: "Почти! Не хватает одной буквы.",
      review_ru: "чередование kk → k",
    },
    {
      id: "vt1-d2",
      topic: "vt1",
      stage: "drill",
      type: "fill_table",
      prompt_fi: "asua",
      prompt_ru: "заполните формы",
      cells: [
        { l: "minä", canonical: "asu{n}", accepted: ["asun"] },
        { l: "te", canonical: "asu{tte}", accepted: ["asutte"] },
      ],
      summary_ru: "Повторите окончания.",
    },
    { id: "broken-item", topic: "vt1", stage: "drill", type: "produce_form" }, // malformed → skipped
  ],
};

const content = flattenGrammar(rawSeed);

function progressWith(records: Record<string, number>): ProgressMap {
  const map: ProgressMap = new Map();
  for (const [topicId, box] of Object.entries(records)) {
    map.set(progressKey(GRAMMAR_KIND, topicId), {
      ...emptyProgress(GRAMMAR_KIND, topicId),
      box,
      totalSeen: box > 0 ? 1 : 0,
    });
  }
  return map;
}

describe("flattenGrammar", () => {
  it("parses modules, topics (sorted by order) and items, skipping malformed entries", () => {
    expect(content.modules).toEqual([{ id: "verb", title: "Глагол", n: 1 }]);
    expect(content.topics.map((t) => t.id)).toEqual(["endings", "vt1"]);
    expect(content.items.map((i) => i.id)).toEqual(["vt1-w1", "vt1-d1", "vt1-d2"]);
  });

  it("drops unknown tags and keeps known ones", () => {
    const vt1 = content.topics.find((t) => t.id === "vt1")!;
    expect(vt1.tags).toEqual(["verbtype", "grad"]);
  });

  it("parses the paradigm with caption, rows and key", () => {
    const vt1 = content.topics.find((t) => t.id === "vt1")!;
    expect(vt1.theory.paradigm?.rows).toHaveLength(2);
    expect(vt1.theory.paradigm?.key[1]).toEqual({ hl: "alt", label: "чередование kk → k" });
  });

  it("parses classify reasons keyed by numeric index", () => {
    const w1 = content.items[0]!;
    expect(w1.type).toBe("classify");
    if (w1.type === "classify") expect(w1.reasonsRu[2]).toContain("Тип 3");
  });

  it("yields empty content from an empty file", () => {
    expect(flattenGrammar({})).toEqual({ modules: [], topics: [], items: [] });
  });
});

describe("form markup", () => {
  it("parses {main} and [alt] highlight spans", () => {
    expect(parseForm("nu[kk]{uu}")).toEqual([
      { text: "nu" },
      { text: "kk", hl: "alt" },
      { text: "uu", hl: "main" },
    ]);
  });

  it("treats unclosed brackets as plain text", () => {
    expect(parseForm("nuk{uu")).toEqual([{ text: "nuk{uu" }]);
  });

  it("strips markup to the plain form", () => {
    expect(stripForm("nu[kk]{uu}")).toBe("nukkuu");
    expect(stripForm("asun")).toBe("asun");
  });
});

describe("parseRu", () => {
  it("marks *…* runs as Finnish fragments", () => {
    expect(parseRu("Сильная ступень *kk* — у hän.")).toEqual([
      { text: "Сильная ступень ", fi: false },
      { text: "kk", fi: true },
      { text: " — у hän.", fi: false },
    ]);
  });

  it("degrades an unbalanced trailing star to plain text", () => {
    expect(parseRu("после en глагол *puhu")).toEqual([
      { text: "после en глагол ", fi: false },
      { text: "puhu", fi: false },
    ]);
  });
});

describe("editDistanceCapped", () => {
  it("returns 0 for equal, 1 for one edit, 2 (cap) otherwise", () => {
    expect(editDistanceCapped("nukkuu", "nukkuu")).toBe(0);
    expect(editDistanceCapped("nukuu", "nukkuu")).toBe(1); // missing letter
    expect(editDistanceCapped("nukkua", "nukkuu")).toBe(1); // substitution
    expect(editDistanceCapped("nakkua", "nukkuu")).toBe(2);
    expect(editDistanceCapped("nu", "nukkuu")).toBe(2);
  });
});

const typedItem = content.items.find((i) => i.id === "vt1-d1") as TypedFormItem;

describe("gradeTyped", () => {
  it("accepts any accepted variant, normalized", () => {
    expect(gradeTyped("Nukkuu", typedItem).verdict).toBe("correct");
    expect(gradeTyped("  hän nukkuu. ", typedItem).verdict).toBe("correct");
  });

  it("prefers a predicted wrong-pattern explanation (here also 1 edit away → near)", () => {
    const g = gradeTyped("nukkua", typedItem);
    expect(g.verdict).toBe("near"); // nukkua → nukkuu is one substitution
    expect(g.explainRu).toBe("Это словарная форма.");
  });

  it("flags a one-letter slip as near with the fallback copy", () => {
    const g = gradeTyped("nukuu", typedItem);
    expect(g.verdict).toBe("near");
    expect(g.explainRu).toBe("Почти! Не хватает одной буквы.");
  });

  it("treats ä↔a as a single-substitution near-miss", () => {
    const g = gradeTyped("nukkuü".replace("ü", "y"), typedItem); // nukkuy: 1 sub from nukkuu
    expect(g.verdict).toBe("near");
  });

  it("marks everything else wrong without an explanation", () => {
    const g = gradeTyped("puhun", typedItem);
    expect(g.verdict).toBe("wrong");
    expect(g.explainRu).toBeUndefined();
  });
});

describe("gradeCell", () => {
  const cell = { l: "te", canonical: "asu{tte}", accepted: ["asutte"] };
  it("matches normalized; no near-miss at cell level", () => {
    expect(gradeCell("Asutte", cell)).toBe(true);
    expect(gradeCell("asute", cell)).toBe(false);
  });
});

describe("topic states + mastery", () => {
  it("locks a topic until its prereqs are mastered", () => {
    const fresh = topicStates(content.topics, new Map());
    expect(fresh.get("endings")).toBe("available");
    expect(fresh.get("vt1")).toBe("locked");
  });

  it("unlocks when the prereq reaches the mastered box and tracks in-progress", () => {
    const p = progressWith({ endings: GRAMMAR_MASTERED_BOX, vt1: 1 });
    const states = topicStates(content.topics, p);
    expect(states.get("endings")).toBe("mastered");
    expect(states.get("vt1")).toBe("in-progress");
  });

  it("ignores prereq ids that don't exist in the content", () => {
    const topics: GrammarTopic[] = [
      { ...content.topics[0]!, id: "solo", prereq: ["ghost"] },
    ];
    expect(topicStates(topics, new Map()).get("solo")).toBe("available");
  });

  it("computes mastery pct toward the mastered box", () => {
    const p = progressWith({ vt1: 2 });
    expect(topicMasteryPct(p, "vt1")).toBe(0.5);
    expect(topicMasteryPct(p, "endings")).toBe(0);
  });
});

describe("applyLessonOutcome", () => {
  const prev = emptyProgress(GRAMMAR_KIND, "vt1");
  it("climbs 2 boxes on a strong run (≥85%)", () => {
    expect(applyLessonOutcome(prev, 9, 10, 1).box).toBe(2);
  });
  it("climbs 1 box on a decent run (≥60%)", () => {
    expect(applyLessonOutcome(prev, 7, 10, 1).box).toBe(1);
  });
  it("drops a box (not below MIN) on a weak run and resets the streak", () => {
    const seasoned = { ...prev, box: 3, correctStreak: 2 };
    const next = applyLessonOutcome(seasoned, 3, 10, 1);
    expect(next.box).toBe(2);
    expect(next.correctStreak).toBe(0);
    expect(applyLessonOutcome(prev, 0, 10, 1).box).toBe(0);
  });
  it("counts lesson runs, not items", () => {
    const next = applyLessonOutcome(prev, 9, 10, 7);
    expect(next.totalSeen).toBe(1);
    expect(next.totalCorrect).toBe(1);
    expect(next.lastSeen).toBe(7);
  });
});

describe("lessonItems", () => {
  it("returns the topic's warmup items then drill items", () => {
    expect(lessonItems(content.items, "vt1").map((i) => i.id)).toEqual([
      "vt1-w1",
      "vt1-d1",
      "vt1-d2",
    ]);
    expect(lessonItems(content.items, "endings")).toEqual([]);
  });
});

describe("rollups", () => {
  it("grammarStats counts mastered/remaining and averages mastery", () => {
    const p = progressWith({ endings: GRAMMAR_MASTERED_BOX, vt1: 2 });
    const s = grammarStats(content.topics, p);
    expect(s).toEqual({ mastered: 1, total: 2, mastery: 0.75, remaining: 1 });
  });

  it("grammarStats on empty content reads as nothing to do", () => {
    expect(grammarStats([], new Map())).toEqual({ mastered: 0, total: 0, mastery: 1, remaining: 0 });
  });

  it("weakestTopic picks the lowest-mastery startable topic and skips locked/mastered", () => {
    expect(weakestTopic(content.topics, new Map())?.id).toBe("endings");
    const p = progressWith({ endings: GRAMMAR_MASTERED_BOX, vt1: 1 });
    expect(weakestTopic(content.topics, p)?.id).toBe("vt1");
    const done = progressWith({ endings: GRAMMAR_MASTERED_BOX, vt1: GRAMMAR_MASTERED_BOX });
    expect(weakestTopic(content.topics, done)).toBeUndefined();
  });

  it("newlyUnlocked reports topics whose lock lifted between two progress states", () => {
    const before = new Map();
    const after = progressWith({ endings: GRAMMAR_MASTERED_BOX });
    expect(newlyUnlocked(content.topics, before, after).map((t) => t.id)).toEqual(["vt1"]);
    expect(newlyUnlocked(content.topics, after, after)).toEqual([]);
  });
});

describe("summary review", () => {
  it("groups missed items by review label, most frequent first", () => {
    const missed = [
      content.items[1]!,
      content.items[1]!,
      content.items[0]!,
      content.items[2]!, // no review_ru → skipped
    ] as GrammarItem[];
    expect(reviewPatterns(missed)).toEqual([
      { label: "чередование kk → k", count: 2 },
      { label: "тип глагола", count: 1 },
    ]);
  });

  it("declines «ошибка» correctly", () => {
    expect(errorWord(1)).toBe("ошибка");
    expect(errorWord(2)).toBe("ошибки");
    expect(errorWord(5)).toBe("ошибок");
    expect(errorWord(11)).toBe("ошибок");
    expect(errorWord(21)).toBe("ошибка");
  });
});
