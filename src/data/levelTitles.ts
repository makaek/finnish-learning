/**
 * data/levelTitles.ts — language-aware resolver for per-level topic titles and CEFR band names.
 *
 * `core/levelTitles.ts` stays a PURE data module (the Finnish titles). The UI, however, must show
 * the ACTIVE language's titles, so the swappable selection lives here in the data layer (the same
 * place that already owns a mutable process-wide store, `backend.ts`). App points this at the
 * active pack's `titles`/`bands` on load and on every language switch; `core` never imports it.
 */

import {
  LEVEL_TITLES as FI_TITLES,
  BAND_NAMES as FI_BANDS,
  type LevelTitle,
} from "../core/levelTitles";
import type { Cefr } from "../core/curriculum";

let activeTitles: Readonly<Record<number, LevelTitle>> = FI_TITLES;
let activeBands: Readonly<Record<Cefr, string>> = FI_BANDS;

/** Point the resolver at a language pack's titles/bands (called by App). */
export function setActiveTitles(
  titles: Readonly<Record<number, LevelTitle>>,
  bands: Readonly<Record<Cefr, string>>,
): void {
  activeTitles = titles;
  activeBands = bands;
}

/** Title for a level in the active language, with a safe fallback outside the authored range. */
export function levelTitle(level: number): LevelTitle {
  return activeTitles[level] ?? { fi: `#${level}`, ru: `Уровень ${level}` };
}

/** Russian display name for a CEFR band in the active language. */
export function bandName(band: Cefr): string {
  return activeBands[band] ?? band;
}
