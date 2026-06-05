import { describe, it, expect } from "vitest";
import { computeDashboard, type DashVocab } from "./dashboard";
import { progressKey, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";
import { emptyState, type UserState } from "./daily";
import type { SentenceLike } from "./levels";

const NOW = Date.parse("2026-06-04T12:00:00");
const TODAY = "2026-06-04";
const DAY = 86_400_000;

const vocab: DashVocab[] = [
  { id: "w1", pos: "noun", level: 1 },
  { id: "w2", pos: "verb", level: 1 },
  { id: "w3", pos: "noun", level: 2 },
  { id: "w4", pos: "adj", level: 2 },
];
const sentences: SentenceLike[] = [
  { id: "s1", uses: ["w1", "w2"], level: 1 },
  { id: "s2", uses: ["w3"], level: 2 },
];

function p(kind: ItemKind, id: string, box: number, correct: number, seen: number, lastSeen: number): ItemProgress {
  return { kind, itemId: id, box, correctStreak: 0, totalCorrect: correct, totalSeen: seen, lastSeen };
}
function map(...rows: ItemProgress[]): ProgressMap {
  const m: ProgressMap = new Map();
  for (const r of rows) m.set(progressKey(r.kind, r.itemId), r);
  return m;
}

const progress = map(
  p("recognition", "w1", 5, 5, 5, NOW), // today
  p("production", "w1", 2, 2, 3, NOW), // today
  p("recognition", "w2", 2, 2, 2, NOW - 3 * DAY), // this week
  p("sentences", "s1", 3, 3, 4, NOW - 10 * DAY), // this month
);

const daily: UserState = {
  ...emptyState(),
  streak: 2,
  bestStreak: 5,
  lastQualifiedDate: TODAY,
  todayDate: TODAY,
  lessons: 3,
  answered: 10,
  correct: 8,
};

const d = computeDashboard(vocab, sentences, progress, daily, TODAY, NOW, true);

describe("computeDashboard KPIs", () => {
  it("counts learned words, sentences, level and streaks", () => {
    expect(d.kpis.wordsLearned).toBe(2); // w1 (box5), w2 (box2)
    expect(d.kpis.wordsTotal).toBe(4);
    expect(d.kpis.sentencesLearned).toBe(1); // s1 sentences track box3
    expect(d.kpis.sentencesTotal).toBe(2);
    expect(d.kpis.level).toBe(2); // masteringLevel: L1 fully learned (w1,w2), L2 not (w3,w4)
    expect(d.kpis.streak).toBe(2);
    expect(d.kpis.bestStreak).toBe(5);
  });

  it("computes lifetime accuracy and reps over all tracks", () => {
    expect(d.kpis.totalCorrect).toBe(12);
    expect(d.kpis.totalReps).toBe(14);
    expect(d.kpis.accuracy).toBeCloseTo(12 / 14);
  });

  it("counts fully-mastered items (every mode)", () => {
    expect(d.kpis.fullyMastered).toBe(0); // w1 only mastered in 2 of 4 word modes
  });
});

describe("computeDashboard charts", () => {
  it("per-mode mastered + accuracy", () => {
    const rec = d.modes.find((m) => m.mode === "recognition")!;
    expect(rec.mastered).toBe(2);
    expect(rec.total).toBe(4);
    expect(rec.accuracy).toBeCloseTo(1); // 7 correct / 7 seen
    const sent = d.modes.find((m) => m.mode === "sentences")!;
    expect(sent.mastered).toBe(1);
    expect(sent.total).toBe(2);
  });

  it("Leitner box distribution over seen tracks, split words/sentences", () => {
    const box = (n: number) => d.boxes.find((b) => b.box === n)!;
    expect(box(5).words).toBe(1); // w1 recognition
    expect(box(2).words).toBe(2); // w1 production + w2 recognition
    expect(box(3).sentences).toBe(1); // s1 sentences
    expect(box(0).words + box(0).sentences).toBe(0); // untouched tracks excluded
  });

  it("recency buckets by lastSeen", () => {
    const r = Object.fromEntries(d.recency.map((x) => [x.key, x.count]));
    expect(r.today).toBe(2);
    expect(r.week).toBe(1);
    expect(r.month).toBe(1);
    expect(r.older).toBe(0);
  });

  it("vocabulary coverage by part of speech", () => {
    const noun = d.pos.find((x) => x.pos === "noun")!;
    expect(noun).toMatchObject({ learned: 1, total: 2 });
    expect(d.pos.find((x) => x.pos === "verb")).toMatchObject({ learned: 1, total: 1 });
  });

  it("today panel reflects daily state", () => {
    expect(d.today.lessons).toBe(3);
    expect(d.today.accuracy).toBeCloseTo(0.8);
    expect(d.today.goalMet).toBe(false);
  });
});

describe("computeDashboard reading metrics", () => {
  const texts = [
    { id: "t1", level: 1, type: "dialog" as const },
    { id: "t2", level: 2, type: "text" as const },
    { id: "t3", level: 2, type: "text" as const },
  ];
  const dr = computeDashboard(vocab, sentences, progress, daily, TODAY, NOW, true, texts, new Set(["t1"]));

  it("counts completed texts/dialogs in the KPI and reading summary", () => {
    expect(dr.kpis.textsDone).toBe(1);
    expect(dr.kpis.textsTotal).toBe(3);
    expect(dr.reading).toEqual({ done: 1, total: 3 });
  });

  it("folds texts into the displayed level bars (combined completion)", () => {
    // L2 now has w3, w4, s2, t2, t3 = 5 items; none learned → fraction 0, total 5.
    const l2 = dr.levels.find((l) => l.level === 2)!;
    expect(l2.total).toBe(5);
    expect(l2.learned).toBe(0);
  });
});
