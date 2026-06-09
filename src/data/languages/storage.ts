/**
 * languages/storage.ts — per-language namespacing for ALL locally persisted learner state.
 *
 * Progress, daily-loop state, the hidden set, and the read-texts set are stored SEPARATELY per
 * target language, so switching between Finnish and English keeps two independent learners. The
 * active language is a process-wide value (set by App on load / on switch); persistence modules
 * derive their storage keys from it via {@link nsKey}. The Supabase path uses {@link storageLang}
 * as the `language` column value.
 *
 * A one-time migration ({@link migrateBareToFi}) moves any pre-multilang bare keys
 * (`finnish-trainer/progress` …) into the `fi` namespace so existing learners keep their data.
 */

import type { LangId } from "./types";

const ROOT = "finnish-trainer";

/** The four locally persisted state buckets, each namespaced per language. */
const SUFFIXES = ["progress", "state", "hidden", "reading"] as const;

let active: LangId = "fi";

/** Point persistence at a language. Called by App on initial load and on every switch. */
export function setStorageLang(lang: LangId): void {
  active = lang;
}

/** The active storage language (used as the Supabase `language` column value). */
export function storageLang(): LangId {
  return active;
}

/** localStorage key for `suffix` in the active language's namespace, e.g. `finnish-trainer/en/progress`. */
export function nsKey(suffix: string): string {
  return `${ROOT}/${active}/${suffix}`;
}

/**
 * One-time, idempotent migration: copy each legacy bare key (`finnish-trainer/<suffix>`) into the
 * `fi` namespace (`finnish-trainer/fi/<suffix>`) if the namespaced key doesn't already exist. The
 * bare keys are left in place (harmless) so an older build still reads them. Runs on import.
 */
export function migrateBareToFi(): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    for (const suffix of SUFFIXES) {
      const bare = ls.getItem(`${ROOT}/${suffix}`);
      if (bare === null) continue;
      const target = `${ROOT}/fi/${suffix}`;
      if (ls.getItem(target) === null) ls.setItem(target, bare);
    }
  } catch {
    /* storage unavailable — best-effort only */
  }
}

migrateBareToFi();
