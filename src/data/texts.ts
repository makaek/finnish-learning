/**
 * data/texts.ts — infrastructure boundary for the Reading library.
 *
 * The ONLY module that imports the raw texts seed. It flattens/validates the JSON once and
 * hands a typed, ordered list to the UI. Keeping the file import here (not in src/core)
 * preserves the "core is pure / no I/O" rule from CLAUDE.md.
 */

import seed from "../../data/texts.seed.json";
import { flattenTexts, sortTexts, type ReadingText, type RawReading } from "../core/reading";

/** The authored reading library, validated and ordered by level. */
export const TEXTS: ReadingText[] = sortTexts(flattenTexts(seed as RawReading));
