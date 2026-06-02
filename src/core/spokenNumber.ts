/**
 * spokenNumber.ts — make voice recognition stricter about Finnish.
 *
 * The browser's `fi-FI` recognizer sometimes (a) transcribes a spoken number as a digit
 * ("kaksi" → "2") and (b) returns an English-sounding top guess ("the", "two") even when the
 * learner clearly said the Finnish word. Two pure helpers fix both at the card layer:
 *
 *   - `digitsToFinnish` rewrites bare digit tokens back to their Finnish number word, so a
 *     "2" the engine returned still matches the expected "kaksi".
 *   - `pickBestSpoken` chooses, among the recognizer's alternatives, the FIRST that the grader
 *     accepts — so if the learner said the right Finnish and it appears anywhere in the N-best
 *     list, that hypothesis wins over an English-looking top guess. If none match, the top
 *     (digit-normalized) hypothesis is kept so the learner sees the best guess and can retry.
 *
 * The Finnish number words below mirror the verified dictionary entries (f14–f26).
 */

/** Digit → Finnish number word, for the values the curriculum teaches (0–10, 20, 100). */
const DIGIT_WORDS: Readonly<Record<string, string>> = {
  "0": "nolla",
  "1": "yksi",
  "2": "kaksi",
  "3": "kolme",
  "4": "neljä",
  "5": "viisi",
  "6": "kuusi",
  "7": "seitsemän",
  "8": "kahdeksan",
  "9": "yhdeksän",
  "10": "kymmenen",
  "20": "kaksikymmentä",
  "100": "sata",
};

/**
 * Rewrite each bare-digit token in `text` to its Finnish number word (keeping any trailing
 * punctuation). Non-digit tokens, and digits with no curriculum word, pass through unchanged.
 */
export function digitsToFinnish(text: string): string {
  return text
    .split(/\s+/)
    .map((tok) => {
      const m = /^(\d+)([.,!?]*)$/.exec(tok);
      if (!m) return tok;
      const word = DIGIT_WORDS[m[1]!];
      return word ? word + m[2]! : tok;
    })
    .join(" ");
}

/**
 * Pick the best Finnish hypothesis from a recognizer's N-best `alternatives`: digit-normalize
 * each, then return the first one the grader `accept`s; if none are accepted, return the
 * top (digit-normalized) hypothesis, or "" when the list is empty.
 */
export function pickBestSpoken(
  alternatives: readonly string[],
  accept: (candidate: string) => boolean,
): string {
  const normalized = alternatives.map(digitsToFinnish);
  return normalized.find(accept) ?? normalized[0] ?? "";
}

/** Async variant of {@link pickBestSpoken} for the (Promise-based) sentence grader. */
export async function pickBestSpokenAsync(
  alternatives: readonly string[],
  accept: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const normalized = alternatives.map(digitsToFinnish);
  for (const candidate of normalized) {
    if (await accept(candidate)) return candidate;
  }
  return normalized[0] ?? "";
}
