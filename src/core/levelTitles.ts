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

/** Topic name per curriculum level (1–12), authored from each level's actual seed content. */
export const LEVEL_TITLES: Readonly<Record<number, LevelTitle>> = {
  // L1: hei/kiitos/anteeksi greetings, "minä olen…", juoda/syödä, työ/koti; texts
  // "Tutustuminen", "Hyvää huomenta", "Kahvia ja leipää" — first contact & greetings.
  1: { fi: "Tervehdykset", ru: "Приветствия" },
  // L2: talo/auto/koulu/kirja/kissa/koira + asua/lukea/ostaa/tehdä; texts "Kotona",
  // "Koulussa", "Uusi kirja" — home, school, everyday possessions.
  2: { fi: "Koti ja koulu", ru: "Дом и школа" },
  // L3: äiti/isä/lapsi/mies/nainen + demonstratives (tämä/se/kuka); texts "Minun perheeni",
  // "Kuka tuo on?", "Lemmikkini" — family & describing people.
  3: { fi: "Perhe", ru: "Семья" },
  // L4: food (kala/liha/kana/juusto/leipä…), euro, maksaa/tilata + café/restaurant/shop;
  // texts "Kahvilassa", "Ravintolassa", "Kaupassa" — eating out & food. (Months & language
  // names are parked here as A1.2 breadth, but the dominant theme is food & café.)
  4: { fi: "Ruoka ja kahvila", ru: "Еда и кафе" },
  // L5: sää/ilma/päivä/aamu/kello + voida/osata/saada/pitää/täytyä + asema/kirjasto;
  // texts "Millainen sää on?", "Paljonko kello on?", "Matka töihin" — weather, time, getting around.
  5: { fi: "Sää ja aika", ru: "Погода и время" },
  // L6: tunti/viikko/ilta/yö/kello + huone/pöytä/ovi/ikkuna + nukkua/herätä/katsoa/kuunnella;
  // texts "Minun päiväni", "Aamulla", "Mitä teet illalla?" — clock time & the daily routine.
  6: { fi: "Kello ja päivä", ru: "Время и день" },
  // L7: perhe/veli/sisko/poika/tyttö + juna/bussi/polkupyörä/matka; texts "Perheeni ja minä",
  // "Minä matkustan junalla", "Polkupyörällä kouluun" — family revisited + getting around.
  7: { fi: "Perhe ja liikkuminen", ru: "Семья и передвижение" },
  // L8: metsä/järvi/meri/puu/aurinko/sade/lumi, days of week, hotelli/lentokenttä/lippu/kartta;
  // texts "Junamatka", "Metsässä", "Matka merelle" — travelling & nature.
  8: { fi: "Matkustaminen ja luonto", ru: "Путешествия и природа" },
  // L9: kysymys/vastaus/asia/onni/tunne + seasons; texts "Hyvä kysymys", "Iloinen päivä",
  // "Vuodenajat", "Lentokentällä" — questions, feelings and abstract talk.
  9: { fi: "Kysymykset ja tunteet", ru: "Вопросы и чувства" },
  // L10: keittiö/makuuhuone/olohuone + tuoli/sohva/kaappi/lamppu/matto…; texts "Minun huoneeni",
  // "Keittiössä", "Olohuoneessa", "Kotini" — the home interior, rooms & furniture.
  10: { fi: "Koti ja huonekalut", ru: "Дом и мебель" },
  // L11: tori/pankki/posti/apteekki/keskusta/kauppakeskus + clothes takki/kenkä/paita/kortti/kassa;
  // texts "Keskustassa", "Vaatekaupassa", "Miten pääsen pankkiin?" — running errands & shopping in town.
  11: { fi: "Kaupungilla ja ostoksilla", ru: "В городе и за покупками" },
  // L12: body keho/pää/käsi/jalka + kuume/flunssa/lääke/terveys + seasons kevät/kesä/syksy/talvi;
  // texts "Lääkärissä", "Syksyn sää", "Kesäsuunnitelmani" — health & seasons.
  12: { fi: "Terveys ja vuodenajat", ru: "Здоровье и времена года" },
  // --- A2.2 (new levels 13–15, authored by the finnish-linguist for the A2 build-out) ---
  // L13: personal history → imperfect + perfect contrast (syntyä/kasvaa/muutto/lapsuus/elämä).
  13: { fi: "Menneisyys ja muistot", ru: "Прошлое и воспоминания" },
  // L14: household problems, moving → passive + conditional hypothetical (hana/putki/vuokranantaja).
  14: { fi: "Koti, muutto ja arki", ru: "Дом, переезд и быт" },
  // L15: cooking/store/doctor/hobbies depth → 3rd/4th infinitive + rektio, full conjunctions.
  15: { fi: "Ruoka, terveys ja harrastukset", ru: "Еда, здоровье и хобби" },
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
