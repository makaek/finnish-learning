/**
 * grader.contract.ts
 *
 * The grading contract for the Finnish Trainer. This file defines TYPES ONLY — the
 * stable interface that the implementation (grader.ts) and the tests are written
 * against. v1 grades by local lookup over data/sentences.seed.json (no LLM, no network).
 *
 * Keeping this as a pure contract means a future LLM fallback (free Gemini/Groq tier or
 * local Ollama) can be slotted in behind `grade()` without changing callers or tests.
 */

/** A single learner attempt to grade. */
export interface GradeInput {
  /** id of the sentence item being attempted (from sentences.seed.json). */
  sentenceId: string;
  /** Raw text the learner typed. */
  answer: string;
}

/** Why an answer was marked wrong, with feedback already in Russian. */
export interface GradeError {
  /** The differing/incorrect span, if identifiable (e.g. "menen työssä"). */
  span?: string;
  /** Learner-facing explanation IN RUSSIAN. */
  ru: string;
}

export interface GradeResult {
  correct: boolean;
  /** The model answer to show regardless of outcome. */
  canonical: string;
  /**
   * "exact"   — matched the accepted set after normalization
   * "known"   — matched a precomputed known-wrong pattern (best feedback)
   * "near"    — didn't match; diffed against canonical to locate the slip
   * "unknown" — couldn't classify (candidate for the optional LLM fallback later)
   */
  via: "exact" | "known" | "near" | "unknown";
  errors: GradeError[];
  /** Short Russian praise when correct (optional). */
  praiseRu?: string;
}

/**
 * Normalize before matching. Implementation MUST: trim, lowercase, collapse internal
 * whitespace to single spaces, and strip a single trailing . ? or !.
 * Pure and deterministic — unit-test this directly.
 */
export type Normalize = (raw: string) => string;

/**
 * The grader. v1 implementation reads the matching sentence item from the loaded
 * sentence data and returns a GradeResult purely from lookup + diff. No async needed in
 * v1; kept Promise-returning so an LLM fallback can be added without changing the
 * signature.
 */
export type Grade = (input: GradeInput) => Promise<GradeResult>;

/**
 * OPTIONAL future hook — DO NOT implement in v1. If added, it runs only when
 * via === "unknown", behind the same Grade interface, calling a FREE tier or local
 * model. Documented here so the contract anticipates it.
 */
export type LlmFallback = (input: GradeInput) => Promise<GradeResult>;
