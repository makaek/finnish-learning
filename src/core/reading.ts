/**
 * reading.ts — pure model for the Reading library (texts & dialogs).
 *
 * Deliberately OUTSIDE the quiz/SRS world: reading is content consumption + self-paced
 * recitation, not graded answering. This module only flattens/validates the authored seed,
 * derives a dialog's roles, and gates texts by curriculum level. No UI/DB imports.
 */

import { levelOf } from "./levels";
import { normalizeFi } from "./normalize";

/** One line of a text or dialog. `speaker` is set only on dialog lines. */
export interface ReadingLine {
  speaker?: string;
  fi: string;
  ru: string;
}

/** A readable piece: a monologue ("text") or a multi-speaker "dialog". */
export interface ReadingText {
  id: string;
  /** Russian title shown in the library. */
  title: string;
  level: number;
  type: "text" | "dialog";
  lines: ReadingLine[];
}

/** Shape of the raw seed file (validated by {@link flattenTexts}). */
export interface RawReading {
  texts?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseLine(raw: unknown): ReadingLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.fi) || !isNonEmptyString(r.ru)) return null;
  const line: ReadingLine = { fi: r.fi, ru: r.ru };
  if (isNonEmptyString(r.speaker)) line.speaker = r.speaker;
  return line;
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
  return { id: r.id, title: r.title, level: levelOf(r as { level?: number }), type, lines };
}

/** Flatten + validate the seed into typed texts, dropping malformed entries. */
export function flattenTexts(raw: RawReading): ReadingText[] {
  if (!Array.isArray(raw.texts)) return [];
  return raw.texts.map(parseText).filter((t): t is ReadingText => t !== null);
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
