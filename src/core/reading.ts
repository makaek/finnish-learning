/**
 * reading.ts — pure model for the Reading library (texts & dialogs).
 *
 * Deliberately OUTSIDE the quiz/SRS world: reading is content consumption + self-paced
 * recitation, not graded answering. This module only flattens/validates the authored seed,
 * derives a dialog's roles, and gates texts by curriculum level. No UI/DB imports.
 */

import { LEARNED_BOX, levelOf } from "./levels";
import { getProgress, type ProgressMap } from "./progress";
import { normalizeFi } from "./normalize";

/** One line of a text or dialog. `speaker` is set only on dialog lines. */
export interface ReadingLine {
  speaker?: string;
  fi: string;
  ru: string;
  /**
   * Optional per-word Russian glosses for click-to-translate, keyed by {@link glossKey} of the
   * surface token (lowercased, edge punctuation stripped). Authored at build time — Finnish is
   * too inflected to gloss surface forms from the dictionary at runtime.
   */
  glosses?: Record<string, string>;
}

/**
 * One comprehension question about a text/dialog. Shares the gradable shape of a sentence item
 * ({@link SentenceItem}: id/canonical/accepted/wrong) so the SAME grader can score it; adds the
 * Finnish question `q` and its Russian translation `qRu`. Answers are graded locally.
 */
export interface ReadingQuestion {
  id: string;
  /** The question, in Finnish. */
  q: string;
  /** Russian translation of the question (revealable help). */
  qRu: string;
  /** Single model answer to display. */
  canonical: string;
  /** Every correct phrasing the linguist authored (pronoun-drop variants are derived). */
  accepted: string[];
  /** Known mistakes with a prepared Russian explanation. `match` is already normalized. */
  wrong: { match: string; ru: string }[];
  needs_review?: boolean;
}

/** A readable piece: a monologue ("text") or a multi-speaker "dialog". */
export interface ReadingText {
  id: string;
  /** The displayed name, in Finnish. */
  title: string;
  /** Russian translation of the title, revealed on the reader's "show translation" toggle. */
  titleRu?: string;
  level: number;
  type: "text" | "dialog";
  lines: ReadingLine[];
  /** Thematic group id (see VocabItem.theme); used to group items in the level browser. */
  theme?: string;
  /** Optional comprehension questions, shown after reading/rehearsing (any `type`). */
  questions?: ReadingQuestion[];
}

/** Shape of the raw seed file (validated by {@link flattenTexts}). */
export interface RawReading {
  texts?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Strip non-letter/digit edges and lowercase, so "Hei!" and "hei" share a gloss key. */
export function glossKey(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
}

/** Split a Finnish line into whitespace-separated surface tokens (punctuation kept for display). */
export function tokenizeLine(fi: string): string[] {
  return fi.split(/\s+/).filter((t) => t.length > 0);
}

/** Parse an authored gloss map into normalized keys, dropping non-string entries. */
function parseGlosses(raw: unknown): Record<string, string> | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isNonEmptyString(value)) {
      const k = glossKey(key);
      if (k.length > 0) out[k] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseLine(raw: unknown): ReadingLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.fi) || !isNonEmptyString(r.ru)) return null;
  const line: ReadingLine = { fi: r.fi, ru: r.ru };
  if (isNonEmptyString(r.speaker)) line.speaker = r.speaker;
  const glosses = parseGlosses(r.glosses);
  if (glosses) line.glosses = glosses;
  return line;
}

function parseWrong(raw: unknown): { match: string; ru: string } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.match) || !isNonEmptyString(r.ru)) return null;
  return { match: r.match, ru: r.ru };
}

function parseQuestion(raw: unknown): ReadingQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.q) ||
    !isNonEmptyString(r.qRu) ||
    !isNonEmptyString(r.canonical)
  ) {
    return null;
  }
  const accepted = Array.isArray(r.accepted)
    ? r.accepted.filter((a): a is string => isNonEmptyString(a))
    : [];
  if (accepted.length === 0) return null;
  const wrong = Array.isArray(r.wrong)
    ? r.wrong.map(parseWrong).filter((w): w is { match: string; ru: string } => w !== null)
    : [];
  const question: ReadingQuestion = { id: r.id, q: r.q, qRu: r.qRu, canonical: r.canonical, accepted, wrong };
  if (r.needs_review === true) question.needs_review = true;
  return question;
}

function parseText(raw: unknown): ReadingText | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.title)) return null;
  const type = r.type === "dialog" ? "dialog" : "text";
  const lines = Array.isArray(r.lines)
    ? r.lines.map(parseLine).filter((l): l is ReadingLine => l !== null)
    : [];
  if (lines.length === 0) return null;
  const text: ReadingText = { id: r.id, title: r.title, level: levelOf(r as { level?: number }), type, lines };
  if (isNonEmptyString(r.titleRu)) text.titleRu = r.titleRu;
  if (isNonEmptyString(r.theme)) text.theme = r.theme;
  const questions = Array.isArray(r.questions)
    ? r.questions.map(parseQuestion).filter((q): q is ReadingQuestion => q !== null)
    : [];
  if (questions.length > 0) text.questions = questions;
  return text;
}

/** Flatten + validate the seed into typed texts, dropping malformed entries. */
export function flattenTexts(raw: RawReading): ReadingText[] {
  if (!Array.isArray(raw.texts)) return [];
  return raw.texts.map(parseText).filter((t): t is ReadingText => t !== null);
}

/**
 * Sentinel "role" for a monologue, where reciting the whole thing once satisfies "all roles".
 * Reserved — authored texts must not use "__solo__" as a speaker name.
 */
export const SOLO_ROLE = "__solo__";

/**
 * The roles a learner must recite by memory to MASTER a text (the "наизусть за все роли" set):
 * a dialog's distinct speakers, or a single {@link SOLO_ROLE} for a monologue (a "dialog" that
 * turns out to have <2 speakers is treated as a monologue too).
 */
export function reciteRoles(text: ReadingText): string[] {
  const roles = rolesOf(text);
  return roles.length >= 2 ? roles : [SOLO_ROLE];
}

/** Progress `itemId` for one recited role of a text (the per-role `recite` track record). */
export function reciteRoleId(textId: string, role: string): string {
  return `${textId}::${role}`;
}

/** Whether a single role of a text has been recited by memory (its per-role `recite` record is set). */
export function reciteRoleDone(progress: ProgressMap, textId: string, role: string): boolean {
  return getProgress(progress, "recite", reciteRoleId(textId, role)).box >= LEARNED_BOX;
}

/** How many of a text's roles have been recited so far (drives the «N/total» recite progress). */
export function recitedRoleCount(progress: ProgressMap, text: ReadingText): number {
  return reciteRoles(text).filter((r) => reciteRoleDone(progress, text.id, r)).length;
}

/** Distinct speakers of a text, in first-appearance order (empty for a monologue). */
export function rolesOf(text: ReadingText): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const line of text.lines) {
    if (line.speaker && !seen.has(line.speaker)) {
      seen.add(line.speaker);
      roles.push(line.speaker);
    }
  }
  return roles;
}

/** A text is available once the learner has reached its level (test mode opens all). */
export function isTextUnlocked(text: ReadingText, currentLevel: number): boolean {
  return text.level <= currentLevel;
}

/** Texts ordered for the library: by level ascending, then by id. */
export function sortTexts(texts: readonly ReadingText[]): ReadingText[] {
  return [...texts].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

/** Levenshtein edit distance between two strings (classic two-row DP). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/** Similarity threshold for accepting a spoken recitation (1 = identical). */
export const SPOKEN_MATCH_THRESHOLD = 0.8;

/**
 * Lenient match of a spoken Finnish attempt against the expected line — the auto-mode
 * recitation gate. Both sides are normalized (lowercased, punctuation dropped), then accepted
 * on an exact match or a high character similarity (≥ {@link SPOKEN_MATCH_THRESHOLD}), to
 * tolerate the recognizer's small slips. Recognition stays imperfect, so the UI also offers a
 * manual override.
 */
export function spokenMatches(expected: string, heard: string): boolean {
  const a = normalizeFi(expected);
  const b = normalizeFi(heard);
  if (a.length === 0 || b.length === 0) return false;
  if (a === b) return true;
  const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return sim >= SPOKEN_MATCH_THRESHOLD;
}
