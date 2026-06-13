import { describe, it, expect } from "vitest";
import {
  buildGrammarTrainer,
  studiedTopics,
  topicWeight,
  trainerFocus,
  trainerReview,
} from "./grammarTrainer";
import { flattenGrammar, GRAMMAR_KIND, type GrammarContent, type RawGrammarFile } from "./grammar";
import { emptyProgress, progressKey, type ProgressMap } from "./progress";

/* A two-topic fixture: `endings` (no prereq) → `vt1` (prereq endings), plus a handful of items
 * spread across both. Finnish strings are reused verbatim from grammar.test.ts (no new Finnish). */
const rawSeed: RawGrammarFile = {
  modules: [{ id: "verb", title: "Глагол", n: 1 }],
  topics: [
    {
      id: "endings",
      module: "verb",
      order: 1,
      title: "Личные окончания",
      summary: "-n, -t",
      tags: [],
      prereq: [],
      rule_ids: ["verb-conjugation"],
      theory: { title: "Личные окончания", summary: "", body_ru: "Окончания.", examples: [] },
    },
    {
      id: "vt1",
      module: "verb",
      order: 2,
      title: "Тип глагола 1",
      summary: "puhua",
      tags: ["verbtype"],
      prereq: ["endings"],
      rule_ids: [],
      theory: { title: "Тип 1", summary: "", body_ru: "Основа.", examples: [] },
    },
  ],
  items: [
    mkClassify("endings-w1", "endings"),
    mkProduce("endings-d1", "endings"),
    mkClassify("vt1-w1", "vt1"),
    mkProduce("vt1-d1", "vt1"),
    mkProduce("vt1-d2", "vt1"),
  ],
};

function mkClassify(id: string, topic: string) {
  return {
    id,
    topic,
    stage: "warmup",
    type: "classify",
    prompt_fi: "lukea",
    prompt_ru: "какой тип?",
    options_ru: ["Тип 1", "Тип 2"],
    answer: 0,
    reasons_ru: {},
    ok_ru: "Верно!",
    correct_ru: "Тип 1.",
  };
}
function mkProduce(id: string, topic: string) {
  return {
    id,
    topic,
    stage: "drill",
    type: "produce_form",
    prompt_fi: "nukkua → hän",
    canonical: "nukkuu",
    accepted: ["nukkuu"],
    ok_ru: "Верно!",
  };
}

const content: GrammarContent = flattenGrammar(rawSeed);
const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

/** ProgressMap from {topicId: {box, lastSeen}} on the grammar track. */
function progressWith(records: Record<string, { box: number; lastSeen?: number }>): ProgressMap {
  const map: ProgressMap = new Map();
  for (const [topicId, { box, lastSeen }] of Object.entries(records)) {
    map.set(progressKey(GRAMMAR_KIND, topicId), {
      ...emptyProgress(GRAMMAR_KIND, topicId),
      box,
      totalSeen: box > 0 ? 1 : 0,
      lastSeen: lastSeen ?? 0,
    });
  }
  return map;
}

describe("studiedTopics", () => {
  it("includes reached topics and excludes prereq-locked ones", () => {
    expect(studiedTopics(content, new Map()).map((t) => t.id)).toEqual(["endings"]); // vt1 locked
    const open = progressWith({ endings: { box: 4 } }); // master endings → vt1 unlocks
    expect(studiedTopics(content, open).map((t) => t.id).sort()).toEqual(["endings", "vt1"]);
  });
});

describe("topicWeight", () => {
  it("is higher for weaker topics", () => {
    const p = progressWith({ endings: { box: 4, lastSeen: NOW }, vt1: { box: 1, lastSeen: NOW } });
    expect(topicWeight(p, "vt1", NOW)).toBeGreaterThan(topicWeight(p, "endings", NOW));
  });

  it("is higher for staler topics (and a never-seen topic is maximally stale)", () => {
    const recent = progressWith({ endings: { box: 2, lastSeen: NOW } });
    const stale = progressWith({ endings: { box: 2, lastSeen: NOW - 30 * DAY } });
    expect(topicWeight(stale, "endings", NOW)).toBeGreaterThan(topicWeight(recent, "endings", NOW));
    // Never seen (lastSeen 0) → full staleness, same as a very old lastSeen.
    expect(topicWeight(new Map(), "endings", NOW)).toBeCloseTo(0.15 + 1.0 + 0.6); // base+weak+stale
  });
});

describe("buildGrammarTrainer", () => {
  const open = progressWith({ endings: { box: 4, lastSeen: NOW }, vt1: { box: 0, lastSeen: 0 } });

  it("draws only from reached topics", () => {
    // Fresh progress: only `endings` is reachable, so vt1 items never appear.
    const items = buildGrammarTrainer(content, new Map(), 1, NOW);
    expect(items.length).toBe(2); // both endings items
    expect(items.every((i) => i.topic === "endings")).toBe(true);
  });

  it("caps at the requested size and returns distinct items", () => {
    const items = buildGrammarTrainer(content, open, 7, NOW, 3);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
  });

  it("is deterministic for a given seed", () => {
    const a = buildGrammarTrainer(content, open, 42, NOW, 4);
    const b = buildGrammarTrainer(content, open, 42, NOW, 4);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it("returns nothing when no topic is reached and there are no items", () => {
    expect(buildGrammarTrainer({ modules: [], topics: [], items: [] }, new Map(), 1, NOW)).toEqual([]);
  });
});

describe("trainerFocus", () => {
  it("lists the queue's distinct topics weakest-first with a low flag", () => {
    const p = progressWith({ endings: { box: 4, lastSeen: NOW }, vt1: { box: 1, lastSeen: NOW } });
    const items = [content.items[0]!, content.items[2]!]; // endings-w1, vt1-w1
    const focus = trainerFocus(content, items, p);
    expect(focus.map((f) => f.topic.id)).toEqual(["vt1", "endings"]); // vt1 (25%) before endings (100%)
    expect(focus.find((f) => f.topic.id === "vt1")!.low).toBe(true);
    expect(focus.find((f) => f.topic.id === "endings")!.low).toBe(false);
  });
});

describe("trainerReview", () => {
  it("keeps only topics with a miss, worst accuracy first", () => {
    const items = [
      content.items[0]!, // endings
      content.items[1]!, // endings
      content.items[2]!, // vt1
      content.items[3]!, // vt1
    ];
    const results = [true, true, false, false]; // endings 2/2, vt1 0/2
    const review = trainerReview(content, items, results);
    expect(review.map((r) => r.topic.id)).toEqual(["vt1"]); // endings perfect → dropped
    expect(review[0]!.acc).toBe(0);
  });

  it("returns nothing on a clean run", () => {
    const items = [content.items[0]!, content.items[2]!];
    expect(trainerReview(content, items, [true, true])).toEqual([]);
  });
});
