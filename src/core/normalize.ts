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
 *
 * Curly/typographic apostrophes (’ ‘ ´ `) are folded to a straight ASCII apostrophe BEFORE the
 * punctuation pass so an English contraction matches regardless of which quote glyph was typed
 * ("don’t" → "don't"). Harmless to Finnish, whose word-internal apostrophe (raa'an) is the
 * straight ASCII one. The same canonical normalizer therefore serves every target language.
 */

import type { Normalize } from "./grader.contract";

/** Sentence punctuation you can't speak: , . ! ? ; : … – — and the various quotes/brackets. */
const PUNCTUATION = /[.,!?;:()[\]{}"«»„“”…–—]/g;
/** Typographic apostrophe variants folded to a straight ' so contractions match either way. */
const APOSTROPHES = /[’‘´`]/g;

export const normalizeFi: Normalize = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
