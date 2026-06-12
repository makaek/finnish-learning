/**
 * data/grammar.ts — infrastructure boundary for the «Грамматика» mode content.
 *
 * The ONLY module that imports the raw grammar seed. It parses the JSON once and hands the
 * typed module/topic/item content to the rest of the app (same pattern as data/rules.ts:
 * the file import stays out of src/core so core remains pure).
 */

import seed from "../../data/grammar.seed.json";
import { flattenGrammar, type GrammarContent, type RawGrammarFile } from "../core/grammar";

/** The grammar curriculum (Module B slice and onward), flattened from the seed. */
export const GRAMMAR: GrammarContent = flattenGrammar(seed as RawGrammarFile);
