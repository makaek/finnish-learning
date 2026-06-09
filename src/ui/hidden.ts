/**
 * hidden.ts — the set of progress items the learner has manually hidden from the progress
 * screen (mastered words/sentences they no longer want to see). Persisted in localStorage
 * (a device-local view preference; not learning data, so it stays off the backend). Namespaced
 * per target language via {@link nsKey} — a hidden word in Finnish must not hide one in English.
 */

import { nsKey } from "../data/languages/storage";

export type Group = "word" | "sentence";

export function hiddenKey(group: Group, id: string): string {
  return `${group}:${id}`;
}

export function loadHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(nsKey("hidden"));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((x): x is string => typeof x === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveHidden(set: ReadonlySet<string>): void {
  try {
    localStorage.setItem(nsKey("hidden"), JSON.stringify([...set]));
  } catch {
    /* best-effort */
  }
}
