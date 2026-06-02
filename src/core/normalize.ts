/**
 * normalize.ts — the single canonical text normalizer for Finnish answers.
 *
 * Implements the `Normalize` contract documented in grader.contract.ts: trim, lowercase,
 * collapse internal whitespace to single spaces, and DROP punctuation entirely. Pure and
 * deterministic — shared by the typed-production grader (produce.ts) and the sentence grader
 * (grader.ts) so matching behaves identically everywhere.
 *
 * Punctuation is removed (not just a trailing mark) because voice mode can't dictate it: a
 * spoken "Kiitos, en halua kahvia" comes back without the comma, and must still match the
 * authored "Kiitos, en halua kahvia." Removed marks are replaced with a space (then collapsed)
 * so a missing space around a mark — "kahvia,en" — doesn't fuse two words. Word-internal
 * apostrophes and hyphens (part of Finnish spelling, e.g. raa'an) are intentionally kept.
 */

import type { Normalize } from "./grader.contract";

/** Sentence punctuation you can't speak: , . ! ? ; : … – — and the various quotes/brackets. */
const PUNCTUATION = /[.,!?;:()[\]{}"«»„“”…–—]/g;

export const normalizeFi: Normalize = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
