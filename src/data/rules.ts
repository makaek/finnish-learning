/**
 * data/rules.ts — infrastructure boundary for the grammar book.
 *
 * The ONLY module that imports the raw rules seed. It parses the JSON once and hands a flat,
 * typed rule list to the rest of the app. Keeping the file import here (not in src/core)
 * preserves the "core is pure / no I/O" rule from CLAUDE.md.
 */

import seed from "../../data/rules.seed.json";
import { flattenRules, type RawRulesFile, type RuleItem } from "../core/rules";

/** The grammar book, flattened from the seed. */
export const RULES: RuleItem[] = flattenRules(seed as RawRulesFile);
