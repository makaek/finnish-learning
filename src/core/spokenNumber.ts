/**
 * spokenNumber.ts — make voice recognition stricter about Finnish.
 *
 * The browser's `fi-FI` recognizer sometimes (a) transcribes a spoken number as digits
 * ("kaksi" → "2", "kaksikymmentäviisi" → "25"), (b) returns the euro amount with the «€» sign
 * ("viisi euroa" → "5 €"), and (c) returns an English-sounding top guess even when the learner
 * clearly said the Finnish word. Pure helpers fix all three at the card layer so these are never
 * an annoying false-reject:
 *
 *   - `numberToFinnish` / `digitsToFinnish` rewrite bare digit tokens back to their Finnish
 *     cardinal word across the whole curriculum range (0–1000, incl. the 11–99 compounds), so a
 *     "25" the engine returned still matches "kaksikymmentäviisi".
 *   - `spokenCandidates` additionally expands the euro sign («€») to its word — both the partitive
 *     "euroa" ("5 €" → "viisi euroa") and the nominative "euro" ("1 €" → "yksi euro") — since voice
 *     can't disambiguate sign vs word.
 *   - `pickBestSpoken` chooses, among the recognizer's alternatives (each expanded into the above
 *     candidates), the FIRST the grader accepts; if none match, the top candidate is kept so the
 *     learner sees the best guess and can retry.
 */

const ONES = [
  "nolla",
  "yksi",
  "kaksi",
  "kolme",
  "neljä",
  "viisi",
  "kuusi",
  "seitsemän",
  "kahdeksan",
  "yhdeksän",
];

/** Finnish cardinal for 0–99 (the "-toista" teens and "-kymmentä" compounds). */
function under100(n: number): string {
  if (n < 10) return ONES[n]!;
  if (n < 20) return n === 10 ? "kymmenen" : ONES[n - 10]! + "toista";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ONES[tens]! + "kymmentä" + (ones ? ONES[ones]! : "");
}

/**
 * Finnish cardinal for 0–1000 (the curriculum's number range), as a single written-together word
 * ("kaksikymmentäviisi", "satakaksikymmentäviisi", "tuhat"), or null outside the range.
 */
export function numberToFinnish(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 1000) return null;
  if (n < 100) return under100(n);
  if (n === 1000) return "tuhat";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds === 1 ? "sata" : ONES[hundreds]! + "sataa";
  return head + (rest ? under100(rest) : "");
}

/**
 * Rewrite each bare-digit token in `text` to its Finnish number word (keeping any trailing
 * punctuation). Non-digit tokens, and digits outside 0–1000, pass through unchanged.
 */
export function digitsToFinnish(text: string): string {
  return text
    .split(/\s+/)
    .map((tok) => {
      const m = /^(\d+)([.,!?]*)$/.exec(tok);
      if (!m) return tok;
      const word = numberToFinnish(Number(m[1]));
      return word ? word + m[2]! : tok;
    })
    .join(" ");
}

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

/**
 * Expand one recognizer hypothesis into the candidate strings to grade it against: digits →
 * Finnish number words, and the euro sign → its word. Voice can't dictate digit-vs-word or «€»
 * vs "euro(a)", so both euro forms (partitive "euroa" and nominative "euro") are offered.
 */
export function spokenCandidates(text: string): string[] {
  // Detach «€» (incl. "5€") so the digit pass sees bare number tokens.
  const digits = digitsToFinnish(collapse(text.replace(/€/g, " € ")));
  if (!digits.includes("€")) return [digits];
  return [...new Set([collapse(digits.replace(/€/g, "euroa")), collapse(digits.replace(/€/g, "euro"))])];
}

/**
 * Pick the best Finnish hypothesis from a recognizer's N-best `alternatives`: expand each into its
 * digit/euro candidates, then return the first one the grader `accept`s; if none are accepted,
 * return the top candidate (best guess), or "" when the list is empty.
 */
export function pickBestSpoken(
  alternatives: readonly string[],
  accept: (candidate: string) => boolean,
): string {
  const candidates = alternatives.flatMap(spokenCandidates);
  return candidates.find(accept) ?? candidates[0] ?? "";
}

/** Async variant of {@link pickBestSpoken} for the (Promise-based) sentence grader. */
export async function pickBestSpokenAsync(
  alternatives: readonly string[],
  accept: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const candidates = alternatives.flatMap(spokenCandidates);
  for (const candidate of candidates) {
    if (await accept(candidate)) return candidate;
  }
  return candidates[0] ?? "";
}
