/**
 * levelTitles.ts — Finnish-first topic name (+ Russian translation) for each curriculum
 * level, plus Russian display names for the four CEFR bands.
 *
 * Authored by the finnish-linguist from the ACTUAL seed content, not from a fixed syllabus:
 * the dominant theme of each level was read off the vocabulary in data/dictionary.seed.json,
 * the sentence prompts in data/sentences.seed.json, and the reading-text titles in
 * data/texts.seed.json. The Finnish title is a natural, heading-cased nominative topic noun
 * or phrase; the Russian field is its translation. Inline comments cite the backing content.
 *
 * Band mapping mirrors curriculum.ts (the single source of truth): A1.1 → levels 1–3,
 * A1.2 → 4–6, A1.3 → 7–9, A2 → 10–12. If the band boundaries move there, only BAND_NAMES
 * labels need re-checking here.
 *
 * PURE data + a lookup helper; no UI/DB imports.
 */

import type { Cefr } from "./curriculum";

export interface LevelTitle {
  /** Finnish topic name, heading-cased (shown first). */
  fi: string;
  /** Russian translation. */
  ru: string;
}

/**
 * Topic name per curriculum level (1–19), assigned by the finnish-linguist in the 2026-06 curriculum
 * REBALANCE (the old 15 levels were very uneven — L4 had 104 words; now ≤45/level, theme-grouped).
 * Finnish + Russian titles in sentence case (capitalise the first word + proper nouns; «ja»/«и»
 * stay lowercase). Each level's themes live on the items themselves (the `theme` field).
 */
export const LEVEL_TITLES: Readonly<Record<number, LevelTitle>> = {
  1: { fi: "Tervehdykset ja minä", ru: "Приветствия и я" },
  2: { fi: "Arki ja toiminta", ru: "Будни и действия" },
  3: { fi: "Koulu ja eläimet", ru: "Школа и животные" },
  4: { fi: "Numerot", ru: "Числительные" },
  5: { fi: "Suuret numerot ja kielet", ru: "Большие числа и языки" },
  6: { fi: "Ruoka ja kahvila", ru: "Еда и кафе" },
  7: { fi: "Kaupungissa ja kalenteri", ru: "В городе и календарь" },
  8: { fi: "Sää ja kello", ru: "Погода и часы" },
  9: { fi: "Päivän rytmi ja huone", ru: "Распорядок дня и комната" },
  10: { fi: "Perhe ja ammatit", ru: "Семья и профессии" },
  11: { fi: "Liikkuminen ja värit", ru: "Передвижение и цвета" },
  12: { fi: "Luonto ja matka", ru: "Природа и путешествие" },
  13: { fi: "Kalenteri, vuodenajat ja tunteet", ru: "Календарь, времена года и чувства" },
  14: { fi: "Koti sisältä", ru: "Дом изнутри" },
  15: { fi: "Kaupunki ja ostokset", ru: "Город и покупки" },
  16: { fi: "Harrastukset ja mielipiteet", ru: "Хобби и мнения" },
  17: { fi: "Keho ja terveys", ru: "Тело и здоровье" },
  18: { fi: "Vuodenajat ja menneisyys", ru: "Времена года и прошлое" },
  19: { fi: "Koti, muutto ja terveelliset tavat", ru: "Дом, переезд и здоровый образ жизни" },
};

/**
 * Russian display name for each CEFR band, sanity-checked against the band's actual content:
 *  - A1.1 (L1–3): greetings, family — the foundations.
 *  - A1.2 (L4–6): food/café, weather/time, daily routine — everyday situations.
 *  - A1.3 (L7–9): travel, nature, town, feelings — living in the city / wider world.
 *  - A2.1 (L10–12): home interior, errands & shopping, health — confident everyday life.
 *  - A2.2 (L13–15): personal history, moving, cooking/doctor depth — towards independence.
 */
export const BAND_NAMES: Readonly<Record<Cefr, string>> = {
  "A1.1": "Основы",
  "A1.2": "Повседневность",
  "A1.3": "Город и быт",
  "A2.1": "Уверенный быт",
  "A2.2": "Самостоятельность",
};

/** Title for a level, with a safe fallback for any level outside the authored range. */
export function levelTitle(level: number): LevelTitle {
  return LEVEL_TITLES[level] ?? { fi: `Taso ${level}`, ru: `Уровень ${level}` };
}
