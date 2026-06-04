/**
 * rules.ts — pure model for the grammar "book".
 *
 * A small, curated set of major fundamental Finnish rules (authored/verified by the
 * finnish-linguist in data/rules.seed.json). Each rule carries Russian explanations plus a
 * `match` block that links it to lessons: to a SENTENCE by keyword-matching the sentence's
 * `teaches` tag, and to a WORD by its part of speech. So a lesson can highlight the rules
 * relevant to the current word/sentence without a hand-maintained per-item mapping.
 *
 * PURE: no UI/DB imports, never reads the file itself — callers pass the parsed object in.
 */

/** A worked example shown under a rule: a Finnish phrase with its Russian translation. */
export interface RuleExample {
  fi: string;
  ru: string;
}

/** How a rule links to lessons. */
export interface RuleMatch {
  /** Lowercase keywords; a rule links to a sentence when ANY is a substring of its `teaches`. */
  teaches: string[];
  /** Parts of speech (dictionary `pos`) this rule is relevant to, for word lessons. */
  pos: string[];
}

/** One fundamental grammar rule. */
export interface RuleItem {
  /** Stable kebab-case id. */
  id: string;
  /** Short Russian title. */
  title: string;
  /** One Russian line shown when the rule is collapsed. */
  summary: string;
  /** Short Russian explanation (a few sentences). */
  body: string;
  examples: RuleExample[];
  match: RuleMatch;
}

/** A raw rule entry from the seed; only the fields we read are typed. */
interface RawRule {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  body?: unknown;
  examples?: unknown;
  match?: unknown;
}

/** The shape of data/rules.seed.json. */
export interface RawRulesFile {
  rules?: RawRule[];
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function parseExamples(v: unknown): RuleExample[] {
  if (!Array.isArray(v)) return [];
  const out: RuleExample[] = [];
  for (const e of v) {
    if (e && typeof e === "object") {
      const { fi, ru } = e as { fi?: unknown; ru?: unknown };
      if (typeof fi === "string" && typeof ru === "string") out.push({ fi, ru });
    }
  }
  return out;
}

function parseMatch(v: unknown): RuleMatch {
  if (!v || typeof v !== "object") return { teaches: [], pos: [] };
  const { teaches, pos } = v as { teaches?: unknown; pos?: unknown };
  return {
    teaches: (isStringArray(teaches) ? teaches : []).map((s) => s.toLowerCase()),
    pos: isStringArray(pos) ? pos : [],
  };
}

function isRule(r: RawRule): r is RawRule & { id: string; title: string; body: string } {
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.title === "string" &&
    r.title.length > 0 &&
    typeof r.body === "string" &&
    r.body.length > 0
  );
}

/**
 * Flatten the seed into a validated rule list, skipping malformed entries (so a partial seed
 * still yields a usable book). `summary` falls back to an empty string when absent.
 */
export function flattenRules(raw: RawRulesFile): RuleItem[] {
  const rules = raw.rules;
  if (!Array.isArray(rules)) return [];
  const out: RuleItem[] = [];
  for (const r of rules) {
    if (!isRule(r)) continue;
    out.push({
      id: r.id,
      title: r.title,
      summary: typeof r.summary === "string" ? r.summary : "",
      body: r.body,
      examples: parseExamples(r.examples),
      match: parseMatch(r.match),
    });
  }
  return out;
}

/**
 * Rules relevant to a sentence, found by matching the sentence's `teaches` tag: a rule applies
 * when ANY of its (lowercased) `match.teaches` keywords is a substring of the tag. Returns an
 * empty list for a missing/blank tag. Order follows `rules` (the book's own order).
 */
export function rulesForTeaches(teaches: string | undefined, rules: readonly RuleItem[]): RuleItem[] {
  if (!teaches) return [];
  const hay = teaches.toLowerCase();
  return rules.filter((r) => r.match.teaches.some((kw) => kw.length > 0 && hay.includes(kw)));
}

/** Rules relevant to a word, by its part of speech (`match.pos` contains the word's `pos`). */
export function rulesForPos(pos: string, rules: readonly RuleItem[]): RuleItem[] {
  return rules.filter((r) => r.match.pos.includes(pos));
}
