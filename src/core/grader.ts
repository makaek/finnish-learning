/**
 * grader.ts — v1 implementation of the sentence grader contract (grader.contract.ts).
 *
 * Pure local lookup: no LLM, no network. For each sentence we precompute a normalized set
 * of ACCEPTED answers and a map of KNOWN-WRONG patterns -> Russian explanation, then grade
 * a typed answer by:
 *   1. exact  — normalized answer is in the accepted set,
 *   2. known  — normalized answer matches a precomputed wrong pattern (best feedback),
 *   3. near   — neither; diff against the canonical answer to point at the first slip.
 * "unknown" is never produced in v1 — it is reserved for the optional future LLM fallback.
 *
 * PURE: no UI/DB/JSON imports. The data layer (src/data/sentences.ts) builds the index from
 * the seed file and wires `makeGrader` to it.
 */

import type { GradeInput, GradeResult, Grade } from "./grader.contract";
import { normalizeFi } from "./normalize";

/** A sentence item as authored in data/sentences.seed.json. */
export interface SentenceItem {
  id: string;
  ru: string;
  /** Dictionary entry ids this sentence draws on (used by the future "learned" gate). */
  uses: string[];
  /** The single model answer to display. */
  canonical: string;
  /** Every correct phrasing the linguist authored (pronoun-drop variants are derived). */
  accepted: string[];
  /** Known mistakes with a prepared Russian explanation. `match` is already normalized. */
  wrong: { match: string; ru: string }[];
  /** Curriculum level (1-based). Defaults to 1 when absent; gated by `levels.ts`. */
  level?: number;
  teaches?: string;
  needs_review?: boolean;
}

/** A sentence with its accepted/wrong lookups precomputed once, for O(1) grading. */
interface PreparedSentence {
  canonical: string;
  acceptedNorm: Set<string>;
  wrongByNorm: Map<string, string>;
}

export type SentenceIndex = Map<string, PreparedSentence>;

/** Finnish subject pronouns; the canonical source is the dictionary (pos === "pronoun"). */
export type Pronouns = ReadonlySet<string>;

/**
 * If `normForm` (already normalized) begins with a subject pronoun followed by at least one
 * more word, return the form with that leading pronoun removed; otherwise null.
 *
 * Only DROPS a pronoun — never restores one. Dropping is unambiguous ("Minä menen" ->
 * "Menen"); restoring is not (a pronoun-less form could belong to any person), so the
 * linguist owns the full forms and we mechanically derive the dropped variant.
 */
export function expandDroppedPronoun(normForm: string, pronouns: Pronouns): string | null {
  const spaceIndex = normForm.indexOf(" ");
  if (spaceIndex <= 0) return null; // no pronoun + remainder
  const first = normForm.slice(0, spaceIndex);
  if (!pronouns.has(first)) return null;
  return normForm.slice(spaceIndex + 1);
}

/** Build the grading index from authored sentence items + the dictionary's pronoun set. */
export function makeSentenceIndex(
  items: readonly SentenceItem[],
  pronouns: Pronouns,
): SentenceIndex {
  const index: SentenceIndex = new Map();
  for (const item of items) {
    const acceptedNorm = new Set<string>();
    for (const form of item.accepted) {
      const norm = normalizeFi(form);
      acceptedNorm.add(norm);
      const dropped = expandDroppedPronoun(norm, pronouns);
      if (dropped) acceptedNorm.add(dropped);
    }

    const wrongByNorm = new Map<string, string>();
    for (const w of item.wrong) {
      // `match` is authored already-normalized, but normalize again so authoring slips
      // (stray capital/period) can't silently break a known-wrong match.
      const wNorm = normalizeFi(w.match);
      wrongByNorm.set(wNorm, w.ru);
      // Mirror the accepted-set expansion: a learner who drops the subject pronoun on a
      // known mistake should still get its prepared explanation, not a generic near-miss.
      const wDropped = expandDroppedPronoun(wNorm, pronouns);
      if (wDropped) wrongByNorm.set(wDropped, w.ru);
    }

    index.set(item.id, { canonical: item.canonical, acceptedNorm, wrongByNorm });
  }
  return index;
}

/**
 * Index of the first word that differs between two token lists, or -1 if one is simply a
 * prefix of the other (no in-place divergence).
 */
function firstDivergingIndex(a: readonly string[], b: readonly string[]): number {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}

/**
 * Build a grader bound to a prepared index. Implements the contract's async `Grade` — the
 * function is async so the signature stays Promise-returning for the documented LLM-fallback
 * upgrade path, and an unknown-id throw surfaces as a rejected promise.
 */
export function makeGrader(index: SentenceIndex): Grade {
  return async (input: GradeInput): Promise<GradeResult> => {
    const prepared = index.get(input.sentenceId);
    if (!prepared) {
      throw new Error(`grade(): unknown sentenceId "${input.sentenceId}"`);
    }
    const { canonical, acceptedNorm, wrongByNorm } = prepared;
    const attempt = normalizeFi(input.answer);

    if (acceptedNorm.has(attempt)) {
      return { correct: true, canonical, via: "exact", errors: [], praiseRu: "Правильно! 🎉" };
    }

    const knownRu = wrongByNorm.get(attempt);
    if (knownRu !== undefined) {
      return { correct: false, canonical, via: "known", errors: [{ ru: knownRu }] };
    }

    // Near miss: locate the first diverging word against the canonical to anchor feedback.
    const attemptTokens = attempt.split(" ").filter(Boolean);
    const canonicalTokens = normalizeFi(canonical).split(" ").filter(Boolean);
    const at = firstDivergingIndex(attemptTokens, canonicalTokens);
    const span = at >= 0 ? attemptTokens[at] : undefined;

    // The UI always reveals the canonical separately, so these hints only locate the slip.
    const ru =
      attemptTokens.length === 0
        ? "Введите ответ."
        : span !== undefined
          ? `Не совсем. Посмотрите на слово «${span}».`
          : "Почти! Кажется, чего-то не хватает или есть лишнее — проверьте окончания и пропущенные слова.";

    return {
      correct: false,
      canonical,
      via: "near",
      errors: [span !== undefined ? { span, ru } : { ru }],
    };
  };
}
