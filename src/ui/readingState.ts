/**
 * readingState.ts — the set of reading texts the learner has finished (read or rehearsed).
 * Persisted in localStorage (a device-local view marker, not graded learning data, so it
 * stays off the backend — same rationale and shape as `hidden.ts`).
 */

const KEY = "finnish-trainer/reading";

export function loadRead(): Set<string> {
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

export function saveRead(set: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* best-effort */
  }
}
