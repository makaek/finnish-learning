/**
 * data/sentences.ts — infrastructure boundary for the sentence builder.
 *
 * The ONLY module that imports the raw sentence seed. It builds the grading index once
 * (reusing the dictionary's pronoun set for accepted-answer expansion) and exposes a ready
 * `grade` function plus the ordered sentence list. Keeping the file import here preserves
 * the "core is pure / no I/O" rule from CLAUDE.md.
 */

import seed from "../../data/sentences.seed.json";
import {
  makeSentenceIndex,
  makeGrader,
  type SentenceItem,
  type SentenceIndex,
  type Pronouns,
} from "../core/grader";
import type { Grade } from "../core/grader.contract";
import { VOCAB } from "./dictionary";

/** The authored sentences, in seed order. */
const rawSeed = seed as { sentences?: unknown };
if (!Array.isArray(rawSeed.sentences)) {
  throw new Error("sentences.seed.json: missing or invalid 'sentences' array");
}
export const SENTENCES: SentenceItem[] = rawSeed.sentences as SentenceItem[];

/**
 * Only PERSONAL SUBJECT pronouns are droppable in Finnish ("Menen" = "Minä menen"). The
 * dictionary's `pronoun` pos also covers interrogatives (mikä/kuka) and demonstratives
 * (tämä/se), which must NEVER be stripped, so the drop-set is the closed personal-pronoun set.
 */
// Closed class by design (Finnish has exactly these 6); intersected with the dictionary
// below so the lemmas are still validated, not invented here.
const SUBJECT_PRONOUNS = new Set(["minä", "sinä", "hän", "me", "te", "he"]);
/** Exported so the reading-comprehension grader (data/texts.ts) reuses the same drop-set. */
export const PRONOUNS: Pronouns = new Set(
  VOCAB.filter(
    (item) => item.pos === "pronoun" && SUBJECT_PRONOUNS.has(item.fi.toLowerCase()),
  ).map((item) => item.fi.toLowerCase()),
);

/** Precomputed grading index (O(1) lookup by sentence id). */
export const SENTENCE_INDEX: SentenceIndex = makeSentenceIndex(SENTENCES, PRONOUNS);

/** Runtime grader, ready to call as `grade({ sentenceId, answer })`. */
export const grade: Grade = makeGrader(SENTENCE_INDEX);
