/**
 * hidden.ts — the set of progress items the learner has manually hidden from the progress
 * screen (mastered words/sentences they no longer want to see). Persisted in localStorage
 * (a device-local view preference; not learning data, so it stays off the backend).
 */

const KEY = "finnish-trainer/hidden";

export type Group = "word" | "sentence";

export function hiddenKey(group: Group, id: string): string {
  return `${group}:${id}`;
}

export function loadHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
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
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* best-effort */
  }
}
