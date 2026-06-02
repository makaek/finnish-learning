import { describe, it, expect } from "vitest";
import {
  expandDroppedPronoun,
  makeSentenceIndex,
  makeGrader,
  type SentenceItem,
  type Pronouns,
} from "./grader";

const PRONOUNS: Pronouns = new Set(["minä", "sinä", "hän", "me", "te", "he"]);

const items: SentenceItem[] = [
  {
    id: "s1",
    ru: "Я иду на работу.",
    uses: ["v2", "n1"],
    canonical: "Menen töihin.",
    // Only the full (pronoun) form is authored — the dropped form must be derived.
    accepted: ["Minä menen töihin."],
    // Authored with the pronoun — the dropped form ("menen työssä") must also be 'known'.
    wrong: [
      { match: "minä menen työssä", ru: "Нужно направление «куда?» (töihin), а не «где?» (työssä)." },
    ],
    teaches: "illative idiom",
  },
  {
    id: "s2",
    ru: "Я пью кофе.",
    uses: ["v4", "n8"],
    canonical: "Juon kahvia.",
    accepted: ["Juon kahvia.", "Minä juon kahvia."],
    wrong: [{ match: "juon kahvi", ru: "Объект-вещество в партитиве: kahvia." }],
  },
  {
    id: "s3",
    ru: "Спасибо, я не хочу кофе.",
    uses: ["n8"],
    canonical: "Kiitos, en halua kahvia.",
    accepted: ["Kiitos, en halua kahvia."],
    wrong: [],
  },
];

describe("expandDroppedPronoun", () => {
  it("drops a leading subject pronoun", () => {
    expect(expandDroppedPronoun("minä menen töihin", PRONOUNS)).toBe("menen töihin");
    expect(expandDroppedPronoun("he syövät", PRONOUNS)).toBe("syövät");
  });

  it("returns null when there is no leading pronoun", () => {
    expect(expandDroppedPronoun("menen töihin", PRONOUNS)).toBeNull();
  });

  it("returns null for a bare pronoun with nothing after it", () => {
    expect(expandDroppedPronoun("minä", PRONOUNS)).toBeNull();
  });

  it("does not drop a word that merely starts like a pronoun", () => {
    // "menen" is not a pronoun even though it is the first token.
    expect(expandDroppedPronoun("menen kotiin", PRONOUNS)).toBeNull();
  });
});

describe("makeGrader", () => {
  const grade = makeGrader(makeSentenceIndex(items, PRONOUNS));

  it("accepts an explicitly authored form (exact)", async () => {
    const r = await grade({ sentenceId: "s1", answer: "Minä menen töihin." });
    expect(r.correct).toBe(true);
    expect(r.via).toBe("exact");
    expect(r.canonical).toBe("Menen töihin.");
    expect(r.praiseRu).toBeTruthy();
  });

  it("accepts the derived pronoun-dropped form (exact)", async () => {
    // "Menen töihin" was never listed — only the full form was — yet it must be accepted.
    const r = await grade({ sentenceId: "s1", answer: "Menen töihin" });
    expect(r.correct).toBe(true);
    expect(r.via).toBe("exact");
  });

  it("forgives case, spacing, and ALL punctuation via normalization", async () => {
    // Case, extra spaces, and any number of marks are all forgiven (punctuation is dropped).
    const r = await grade({ sentenceId: "s2", answer: "  JUON   kahvia!! " });
    expect(r.correct).toBe(true);
    expect(r.via).toBe("exact");
  });

  it("accepts a spoken answer without the comma it can't dictate", async () => {
    // Canonical is "Kiitos, en halua kahvia." — voice mode returns it without the comma.
    const spoken = await grade({ sentenceId: "s3", answer: "Kiitos en halua kahvia" });
    expect(spoken.correct).toBe(true);
    expect(spoken.via).toBe("exact");
    // The typed form with the comma still matches too.
    const typed = await grade({ sentenceId: "s3", answer: "Kiitos, en halua kahvia." });
    expect(typed.correct).toBe(true);
  });

  it("returns the prepared Russian explanation for a known mistake", async () => {
    const r = await grade({ sentenceId: "s1", answer: "Minä menen työssä" });
    expect(r.correct).toBe(false);
    expect(r.via).toBe("known");
    expect(r.errors[0]?.ru).toContain("töihin");
  });

  it("matches a known mistake even when the subject pronoun is dropped", async () => {
    // The wrong form was authored as "minä menen työssä"; the dropped variant must also be
    // classified 'known' (not a generic near-miss), mirroring the accepted-set expansion.
    const r = await grade({ sentenceId: "s1", answer: "Menen työssä" });
    expect(r.via).toBe("known");
    expect(r.errors[0]?.ru).toContain("töihin");
  });

  it("classifies an unrecognized answer as near and points at the first slip", async () => {
    const r = await grade({ sentenceId: "s2", answer: "Juon teetä" });
    expect(r.correct).toBe(false);
    expect(r.via).toBe("near");
    expect(r.canonical).toBe("Juon kahvia.");
    expect(r.errors[0]?.span).toBe("teetä"); // first word differing from the canonical
  });

  it("handles an empty answer gracefully (near, no span)", async () => {
    const r = await grade({ sentenceId: "s2", answer: "   " });
    expect(r.via).toBe("near");
    expect(r.errors[0]?.span).toBeUndefined();
    expect(r.canonical).toBe("Juon kahvia.");
  });

  it("throws on an unknown sentence id", async () => {
    await expect(grade({ sentenceId: "nope", answer: "x" })).rejects.toThrow(/unknown/i);
  });

  it("is deterministic", async () => {
    const a = await grade({ sentenceId: "s1", answer: "Menen työssä" });
    const b = await grade({ sentenceId: "s1", answer: "Menen työssä" });
    expect(a).toEqual(b);
  });
});
