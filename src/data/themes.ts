/**
 * data/themes.ts — the thematic-group registry (id → Russian label + sort order).
 *
 * Content items (words/sentences/texts) tag themselves with a `theme` id; the level browser
 * resolves that id here to a label and orders the sub-sections. Language-agnostic ids, Russian
 * labels (the L1). A safe fallback handles a missing or unknown id so untagged content (e.g.
 * English, which has no themes yet) still renders.
 */

import seed from "../../data/themes.seed.json";
import type { UiIconName } from "../ui/icons";

export interface Theme {
  id: string;
  ru: string;
  order: number;
  icon?: UiIconName;
}

/** Sentinel id + label for content with no (or an unknown) theme. */
export const OTHER_THEME = "__other__";
const FALLBACK: Theme = { id: OTHER_THEME, ru: "Другое", order: Number.MAX_SAFE_INTEGER };

function flatten(raw: unknown): Map<string, Theme> {
  const out = new Map<string, Theme>();
  const list = (raw as { themes?: unknown }).themes;
  if (!Array.isArray(list)) return out;
  for (const t of list) {
    if (typeof t !== "object" || t === null) continue;
    const r = t as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.ru !== "string") continue;
    const theme: Theme = {
      id: r.id,
      ru: r.ru,
      order: typeof r.order === "number" ? r.order : 9999,
    };
    if (typeof r.icon === "string") theme.icon = r.icon as UiIconName;
    out.set(theme.id, theme);
  }
  return out;
}

/** All registered themes, keyed by id. */
export const THEMES: ReadonlyMap<string, Theme> = flatten(seed);

/** Resolve a theme id to its registry entry, or the "Другое" fallback for a missing/unknown id. */
export function themeOf(id: string | undefined): Theme {
  return (id && THEMES.get(id)) || FALLBACK;
}

/** Russian label for a theme id (фолбэк «Другое»). */
export function themeLabel(id: string | undefined): string {
  return themeOf(id).ru;
}

/** Sort key for a theme id (untagged content sorts last). */
export function themeOrder(id: string | undefined): number {
  return themeOf(id).order;
}
