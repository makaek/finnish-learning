/**
 * data/texts.ts — infrastructure boundary for the Reading library.
 *
 * The ONLY module that imports the raw texts seed. It flattens/validates the JSON once and
 * hands a typed, ordered list to the UI. Keeping the file import here (not in src/core)
 * preserves the "core is pure / no I/O" rule from CLAUDE.md.
 */

import seed from "../../data/texts.seed.json";
import { flattenTexts, sortTexts, type ReadingText, type RawReading } from "../core/reading";
import { makeSentenceIndex, makeGrader, type SentenceIndex } from "../core/grader";
import type { Grade } from "../core/grader.contract";
import { PRONOUNS } from "./sentences";

/** The authored reading library, validated and ordered by level. */
export const TEXTS: ReadingText[] = sortTexts(flattenTexts(seed as RawReading));

/** Every comprehension question across all texts, flattened (ids are unique across the seed). */
export const READING_QUESTIONS = TEXTS.flatMap((t) => t.questions ?? []);

/**
 * Comprehension grader — reuses the sentence grader (questions share the gradable shape) and the
 * same droppable-pronoun set, so a typed/spoken answer is scored by O(1) local lookup.
 */
export const QUESTION_INDEX: SentenceIndex = makeSentenceIndex(READING_QUESTIONS, PRONOUNS);

/** Runtime comprehension grader, ready to call as `gradeQuestion({ sentenceId: questionId, answer })`. */
export const gradeQuestion: Grade = makeGrader(QUESTION_INDEX);
