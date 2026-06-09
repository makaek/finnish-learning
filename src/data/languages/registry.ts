/**
 * languages/registry.ts — the single place that lists the target languages and resolves a pack.
 *
 * The UI asks for a pack by {@link LangId}; everything language-specific flows from the returned
 * {@link LanguagePack}. To add a language: author its seeds, build a pack, and register it here.
 */

import type { LangId, LanguagePack } from "./types";
import { fiPack } from "./fi";
import { enPack } from "./en";

const PACKS: Record<LangId, LanguagePack> = {
  fi: fiPack,
  en: enPack,
};

/** Target languages in switch order. */
export const LANGUAGES: readonly LanguagePack[] = [fiPack, enPack];

/** Resolve the pack for a language id (defaults to Finnish for an unknown id). */
export function getPack(id: LangId): LanguagePack {
  return PACKS[id] ?? fiPack;
}
