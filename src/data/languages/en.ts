/**
 * languages/en.ts — the English language pack (target = English, L1 = Russian).
 *
 * Builds the pack from the English A1 seeds the same way the Finnish data modules build theirs:
 * flatten the dictionary (the target word lives in the seed's `en` field), index the sentences and
 * the reading questions for O(1) grading, and flatten the texts/rules. English keeps the SUBJECT in
 * an answer (no pronoun-drop), so the droppable-pronoun set is EMPTY — the only grammar knob that
 * differs from Finnish here; normalization is shared (see core/normalize.ts).
 */

import dictSeed from "../../../data/en/dictionary.seed.json";
import sentenceSeed from "../../../data/en/sentences.seed.json";
import textSeed from "../../../data/en/texts.seed.json";
import ruleSeed from "../../../data/en/rules.seed.json";

import { flattenDictionary, type RawDictionary } from "../../core/dictionary";
import {
  makeSentenceIndex,
  makeGrader,
  type SentenceItem,
  type GradableItem,
  type Pronouns,
} from "../../core/grader";
import { flattenTexts, sortTexts, type RawReading } from "../../core/reading";
import { flattenRules, type RawRulesFile } from "../../core/rules";
import { BAND_NAMES, type LevelTitle } from "../../core/levelTitles";
import type { LanguagePack } from "./types";

/** English keeps the subject pronoun, so nothing is droppable from an accepted answer. */
const NO_PRONOUNS: Pronouns = new Set<string>();

const vocab = flattenDictionary(dictSeed as RawDictionary, "en");

const rawSentences = sentenceSeed as { sentences?: unknown };
const sentences: SentenceItem[] = Array.isArray(rawSentences.sentences)
  ? (rawSentences.sentences as SentenceItem[])
  : [];
const grade = makeGrader(makeSentenceIndex(sentences, NO_PRONOUNS));

const texts = sortTexts(flattenTexts(textSeed as RawReading));
const questions: GradableItem[] = texts.flatMap((t) => t.questions ?? []);
const gradeQuestion = makeGrader(makeSentenceIndex(questions, NO_PRONOUNS));

const rules = flattenRules(ruleSeed as RawRulesFile);

/** A1 topic titles (levels 1–3). The `fi` field holds the TARGET (English) topic name. */
const TITLES: Readonly<Record<number, LevelTitle>> = {
  1: { fi: "Greetings", ru: "Приветствия" },
  2: { fi: "Family & home", ru: "Семья и дом" },
  3: { fi: "Food & daily life", ru: "Еда и быт" },
};

export const enPack: LanguagePack = {
  id: "en",
  label: "English",
  flag: "🇬🇧",
  brand: "Английский",
  vocab,
  sentences,
  texts,
  rules,
  grade,
  gradeQuestion,
  pronouns: NO_PRONOUNS,
  titles: TITLES,
  // CEFR band names are generic (Russian); reuse the shared set — only A1.1 has A1 content for now.
  bands: BAND_NAMES,
};
