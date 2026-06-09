/**
 * language.ts — the learner's chosen TARGET language (the L2 they're studying), persisted locally.
 *
 * A device preference (not learning data), so it never touches the backend — same rationale and
 * shape as theme.ts. Stored under a single, NON-namespaced key (the choice is global; it's the
 * thing that selects which namespace the per-language progress lives in). Default: Finnish, the
 * app's original language.
 */

import type { LangId } from "../data/languages/types";

const STORAGE_KEY = "finnish-trainer/lang";

export function loadLang(): LangId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "fi" || v === "en") return v;
  } catch {
    /* storage unavailable — fall through to default */
  }
  return "fi";
}

export function saveLang(lang: LangId): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* best-effort */
  }
}
