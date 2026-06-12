/**
 * languages/fi.ts — the Finnish language pack.
 *
 * Wraps the existing, already-built Finnish content + graders (the original single-language data
 * modules) into the generic {@link LanguagePack} shape. Nothing is recomputed here — it just
 * re-exposes VOCAB / SENTENCES / TEXTS / RULES and their precomputed graders so the registry can
 * hand them to the UI exactly as before.
 */

import { VOCAB } from "../dictionary";
import { SENTENCES, grade, PRONOUNS } from "../sentences";
import { TEXTS, gradeQuestion } from "../texts";
import { RULES } from "../rules";
import { GRAMMAR } from "../grammar";
import { LEVEL_TITLES, BAND_NAMES } from "../../core/levelTitles";
import type { LanguagePack } from "./types";

export const fiPack: LanguagePack = {
  id: "fi",
  label: "Suomi",
  flag: "🇫🇮",
  brand: "Финский",
  speechLang: "fi-FI",
  vocab: VOCAB,
  sentences: SENTENCES,
  texts: TEXTS,
  rules: RULES,
  grammar: GRAMMAR,
  grade,
  gradeQuestion,
  pronouns: PRONOUNS,
  titles: LEVEL_TITLES,
  bands: BAND_NAMES,
};
