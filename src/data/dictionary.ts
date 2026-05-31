/**
 * data/dictionary.ts — infrastructure boundary.
 *
 * The ONLY module that imports the raw seed file. It parses the JSON once and hands a
 * flat, typed vocab list to the rest of the app. Keeping the file import here (not in
 * src/core) preserves the "core is pure / no I/O" rule from CLAUDE.md.
 */

import seed from "../../data/dictionary.seed.json";
import { flattenDictionary, type RawDictionary, type VocabItem } from "../core/dictionary";

/** The full vocab deck, flattened from the seed. */
export const VOCAB: VocabItem[] = flattenDictionary(seed as RawDictionary);
