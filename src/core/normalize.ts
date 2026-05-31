/**
 * normalize.ts — the single canonical text normalizer for Finnish answers.
 *
 * Implements the `Normalize` contract documented in grader.contract.ts: trim, lowercase,
 * collapse internal whitespace to single spaces, and strip a single trailing . ? or !.
 * Pure and deterministic — shared by the typed-production grader (produce.ts) and the
 * sentence grader (grader.ts) so matching behaves identically everywhere.
 */

import type { Normalize } from "./grader.contract";

export const normalizeFi: Normalize = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.?!]$/, "");
