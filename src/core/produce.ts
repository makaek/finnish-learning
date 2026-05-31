/**
 * produce.ts — pure logic for the typed-production exercise.
 *
 * Given the vocab pool, builds "show the Russian gloss, TYPE the Finnish word" questions
 * and grades a typed answer against the single dictionary form. This is a WORD-level
 * grader and is deliberately separate from grader.contract.ts, which is sentence-level
 * (sentenceId -> sentences.seed.json). PURE: no UI/DB imports.
 *
 * Randomness is injected via the same seedable RNG as quiz.ts so sessions are
 * deterministic and unit-testable.
 */

import type { VocabItem } from "./dictionary";
import { makeRng, shuffle, DEFAULT_SESSION_SIZE } from "./quiz";

export { DEFAULT_SESSION_SIZE };

/** A single typed-production question ready to render. */
export interface ProductionQuestion {
  /** Source vocab id (for scoring / future SRS). */
  itemId: string;
  /** Russian gloss shown to the learner. */
  promptRu: string;
  /** The canonical Finnish answer to grade against and to reveal. */
  answerFi: string;
}

/**
 * How a typed answer was classified:
 * - "exact"      — matched the answer after normalization (the only correct outcome).
 * - "diacritics" — would match if Finnish dotted vowels (ä/ö/å) were restored. Counted
 *                  WRONG (production should train spelling) but earns a targeted hint.
 * - "wrong"      — neither; show the canonical answer.
 */
export type TypedVia = "exact" | "diacritics" | "wrong";

export interface TypedGrade {
  correct: boolean;
  via: TypedVia;
  /** Canonical Finnish answer, always returned so the UI can reveal it. */
  answerFi: string;
  /** Learner-facing feedback, IN RUSSIAN. */
  feedbackRu: string;
}

/**
 * Normalize before matching. Mirrors the rules documented in grader.contract.ts: trim,
 * lowercase, collapse internal whitespace to single spaces, strip a single trailing
 * . ? or !. Pure and deterministic.
 */
export function normalizeFi(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.?!]$/, "");
}

/**
 * Fold Finnish dotted vowels to their bare Latin lookalikes. ä/ö are the only dotted
 * vowels in the deck; the rare å (loan-only) folds to o, matching its pronunciation. y is
 * a distinct vowel, NOT a diacritic, so it is left alone. Used only to detect "right word,
 * missing dots" — never to accept such answers. (Verified against the A1 deck by the
 * finnish-linguist: no two deck words collide under this fold, so the near-miss hint is
 * never misleading.)
 */
function foldDiacritics(s: string): string {
  return s.replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "o");
}

/** Grade a typed Finnish answer against the question's canonical form. */
export function gradeTyped(answerFi: string, raw: string): TypedGrade {
  const target = normalizeFi(answerFi);
  const attempt = normalizeFi(raw);

  // Empty input is never correct, even against an (unexpected) empty canonical — the pure
  // grader must not depend on the UI disabling submit for a blank field.
  if (attempt.length === 0) {
    return { correct: false, via: "wrong", answerFi, feedbackRu: `Правильный ответ: «${answerFi}».` };
  }

  if (attempt === target) {
    return { correct: true, via: "exact", answerFi, feedbackRu: "Правильно! 🎉" };
  }

  if (foldDiacritics(attempt) === foldDiacritics(target)) {
    return {
      correct: false,
      via: "diacritics",
      answerFi,
      feedbackRu: `Почти! Не хватает точек над гласными (ä, ö) — в финском это отдельные буквы и звуки. Правильно: «${answerFi}».`,
    };
  }

  return {
    correct: false,
    via: "wrong",
    answerFi,
    feedbackRu: `Правильный ответ: «${answerFi}».`,
  };
}

/**
 * Build a session of up to `size` distinct typed-production questions, each target drawn
 * once from `items`. Deterministic for a given numeric `seed`. (App reseeds on every mode
 * entry, so a production run never shares a seed — and thus an order — with a recognition
 * run; a future mixed-mode would need to offset the seed to keep the two decks distinct.)
 */
export function buildProductionSession(
  items: readonly VocabItem[],
  seed: number,
  size: number = DEFAULT_SESSION_SIZE,
): ProductionQuestion[] {
  const targets = shuffle(items, makeRng(seed)).slice(0, Math.min(size, items.length));
  return targets.map((target) => ({
    itemId: target.id,
    promptRu: target.ru,
    answerFi: target.fi,
  }));
}
