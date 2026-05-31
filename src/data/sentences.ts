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

/** Subject pronouns drawn from the dictionary — single source of truth for expansion. */
const PRONOUNS: Pronouns = new Set(
  VOCAB.filter((item) => item.pos === "pronoun").map((item) => item.fi.toLowerCase()),
);

/** Precomputed grading index (O(1) lookup by sentence id). */
export const SENTENCE_INDEX: SentenceIndex = makeSentenceIndex(SENTENCES, PRONOUNS);

/** Runtime grader, ready to call as `grade({ sentenceId, answer })`. */
export const grade: Grade = makeGrader(SENTENCE_INDEX);
