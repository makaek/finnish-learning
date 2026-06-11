/**
 * languages/types.ts — the contract for a pluggable LANGUAGE PACK.
 *
 * The app's engine (src/core/*) is language-agnostic: it operates on generic vocab /
 * sentence / reading lists + a progress map. A `LanguagePack` bundles everything that IS
 * language-specific — the content decks, the (precomputed) graders, the droppable-pronoun
 * set, and the per-level topic titles — behind one value the UI selects at runtime.
 *
 * Adding a new target language = author its seeds + build one pack here; no engine changes.
 */

import type { VocabItem } from "../../core/dictionary";
import type { SentenceItem, Pronouns } from "../../core/grader";
import type { ReadingText } from "../../core/reading";
import type { RuleItem } from "../../core/rules";
import type { Grade } from "../../core/grader.contract";
import type { LevelTitle } from "../../core/levelTitles";
import type { Cefr } from "../../core/curriculum";

/** The target languages the learner can study (the L2). The L1 is always Russian. */
export type LangId = "fi" | "en";

/** Everything language-specific, resolved once per target language. */
export interface LanguagePack {
  id: LangId;
  /** Native-script name for the switch ("Suomi" / "English"). */
  label: string;
  /** Flag emoji for the switch. */
  flag: string;
  /** Home wordmark in Russian ("Финский" / "Английский"). */
  brand: string;
  /** BCP-47 locale for speech synthesis (TTS) and recognition, so the target language is
   * spoken/heard with a native voice (e.g. "fi-FI" / "en-US") instead of a Finnish accent. */
  speechLang: string;
  vocab: VocabItem[];
  sentences: SentenceItem[];
  texts: ReadingText[];
  rules: RuleItem[];
  /** Sentence-builder grader (precomputed O(1) lookup index). */
  grade: Grade;
  /** Reading-comprehension grader (same shape, over the texts' questions). */
  gradeQuestion: Grade;
  /** Personal subject pronouns that may be dropped in an answer (empty where N/A, e.g. English). */
  pronouns: Pronouns;
  /** Topic title per curriculum level (the `fi` field holds the TARGET-language topic name). */
  titles: Readonly<Record<number, LevelTitle>>;
  /** Russian display name per CEFR band. */
  bands: Readonly<Record<Cefr, string>>;
}
