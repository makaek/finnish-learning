/**
 * dictionary.ts — pure dictionary model.
 *
 * Turns the raw seed JSON (data/dictionary.seed.json) into a flat list of vocab items
 * the exercises consume. PURE: no UI/DB imports, never reads the file itself — callers
 * pass the already-parsed object in. Trivially unit-testable.
 */

/** Part of speech as it appears in the seed (`pos` field). */
export type Pos =
  | "pronoun"
  | "verb"
  | "noun"
  | "adj"
  | "conj"
  | "adv"
  | "adp"
  | "neg_verb"
  | "num"
  | "interj";

/** A single learnable word, normalized across the seed's categories. */
export interface VocabItem {
  /** Stable id from the seed (e.g. "v2", "n1"). */
  id: string;
  /** The Finnish dictionary form. */
  fi: string;
  /** The Russian gloss shown as the prompt. */
  ru: string;
  /** Part of speech (used to group same-category distractors). */
  pos: Pos;
  /**
   * Curriculum level (1-based); items unlock level by level. The flattener always sets it
   * (defaulting to 1), but it stays optional so test fixtures and callers that don't care
   * about leveling can omit it. `levels.ts` treats a missing value as level 1.
   */
  level?: number;
}

/** A raw entry from any category in the seed; only the fields we read are typed. The
 * target-language surface form may live under `fi` (Finnish seed) or `en` (English seed) —
 * see {@link flattenDictionary}'s `wordField`. */
interface RawEntry {
  id?: unknown;
  fi?: unknown;
  en?: unknown;
  ru?: unknown;
  pos?: unknown;
  level?: unknown;
}

/** The shape of data/dictionary.seed.json (only the categories we flatten). */
export interface RawDictionary {
  pronouns?: RawEntry[];
  verbs?: RawEntry[];
  nouns?: RawEntry[];
  adjectives?: RawEntry[];
  function_words?: RawEntry[];
}

/** Categories merged into the vocab pool, in display order. `example_sentences` and
 * `_meta` are intentionally excluded. */
const VOCAB_CATEGORIES = [
  "pronouns",
  "verbs",
  "nouns",
  "adjectives",
  "function_words",
] as const satisfies readonly (keyof RawDictionary)[];

const VALID_POS = new Set<string>([
  "pronoun",
  "verb",
  "noun",
  "adj",
  "conj",
  "adv",
  "adp",
  "neg_verb",
  "num",
  "interj",
]);

/** Which seed field holds the target-language surface form: `fi` (Finnish) or `en` (English). */
export type WordField = "fi" | "en";

function isVocabItem(
  entry: RawEntry,
  wordField: WordField,
): entry is { id: string; ru: string; pos: Pos; level?: unknown } & Record<WordField, string> {
  const word = entry[wordField];
  return (
    typeof entry.id === "string" &&
    typeof word === "string" &&
    word.length > 0 &&
    typeof entry.ru === "string" &&
    entry.ru.length > 0 &&
    typeof entry.pos === "string" &&
    VALID_POS.has(entry.pos)
  );
}

/**
 * Flatten the seed into a single vocab list. Entries missing a usable id/word/ru/pos are
 * skipped rather than throwing, so a partial seed still yields a playable deck. `wordField`
 * selects which seed field carries the target word (`fi` for Finnish, `en` for English); it is
 * always stored in {@link VocabItem.fi}, the engine's generic "form to learn".
 */
export function flattenDictionary(raw: RawDictionary, wordField: WordField = "fi"): VocabItem[] {
  const items: VocabItem[] = [];
  for (const category of VOCAB_CATEGORIES) {
    const entries = raw[category];
    if (!entries) continue;
    for (const entry of entries) {
      if (isVocabItem(entry, wordField)) {
        const level =
          typeof entry.level === "number" && entry.level >= 1 ? Math.floor(entry.level) : 1;
        items.push({ id: entry.id, fi: entry[wordField], ru: entry.ru, pos: entry.pos, level });
      }
    }
  }
  return items;
}
