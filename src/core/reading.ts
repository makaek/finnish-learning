/**
 * reading.ts — pure model for the Reading library (texts & dialogs).
 *
 * Deliberately OUTSIDE the quiz/SRS world: reading is content consumption + self-paced
 * recitation, not graded answering. This module only flattens/validates the authored seed,
 * derives a dialog's roles, and gates texts by curriculum level. No UI/DB imports.
 */

import { levelOf } from "./levels";

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
