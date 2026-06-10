# english-linguist memory

Verified error patterns and conventions for the English-for-Russian-speakers content
(`data/en/*.seed.json`). Append concise, reusable facts — not one-off notes.

## Russian-speaker error patterns (author these as `wrong` entries)
- **Missing copula:** "I student" → needs "I am a student". Russian drops "to be".
- **Missing article:** "I have dog", "she lives in big house" → "a dog", "a big house".
- **Article on uncountable:** "a coffee", "a water", "a bread" → drop the article (or "some").
- **No do-support in negation:** "I not know", "I not drink tea" → "I don't know", "I don't drink tea".
- **No do-support in question:** "You speak English?" → "Do you speak English?".
- **Missing 3rd-person -s:** "he like", "she live" → "he likes", "she lives".
- **Subject/object pronoun:** "me have a dog" → "I have a dog".
- **Adverb placement:** "I am happy very" → "very happy" (degree adverb before the adjective).
- **Calqued preposition:** "speak on English" → "speak English" (no preposition).

## Conventions
- Target word lives in the seed `en` field (loaded into VocabItem.fi). `ru` is the Russian gloss.
- English drop-set is EMPTY — subjects are never optional. Build the grader with `new Set()`.
- `accepted` should include natural contractions ("I'm", "don't", "he's", "I'd like").
- `wrong.match` is pre-normalized: lowercase, no punctuation, straight apostrophes.
- A1 = levels 1–3 (1 Greetings, 2 Family & home, 3 Food & daily life). Keep sentence.level ≥ the
  max level of every vocab id it `uses`, or the unlock ladder never surfaces it.

## Recurring authoring-quality watch-items (found in review)
- **Generic vs definite in `accepted`:** for a definite RU prompt ("Кофе горячий" = a specific cup),
  do NOT accept the bare-noun generic ("Coffee is hot") as equivalent — keep "The coffee is hot."
  Bare-plural/uncountable generics shift meaning to "X in general".
- When a sentence's `uses` names a specific verb (e.g. eat=v7), an `accepted` paraphrase using a
  different verb (have) is grammatical but doesn't exercise the taught vocab — acceptable, just be aware.

## Status
- 2026-06-10: Seeded A1 (levels 1–3): ~55 vocab, 17 sentences, 2 dialogs, 5 grammar rules.
  Authored by Claude during the multi-language build; all carry `needs_review: true` pending a
  dedicated linguist verification pass. The integrity test (en.integrity.test.ts) confirms shapes
  + that every accepted form grades correct and every `wrong` grades as a known mistake.
- 2026-06-10: Reviewed the EXPANDED A1 deck (~120 vocab levels 1–4, sentences s1–s46, texts t1–t16,
  10 rules). Verdict: broadly correct. Only required fix: s35 drop "Coffee is hot." from accepted.
  Polish: s17 add "I'd like water, please."; a12 gloss reword; n54 "o'clock" pos noun→adv;
  t16 "I work from Monday." reads awkward (deck lacks Friday so left as-is). All `wrong` patterns
  verified genuinely incorrect; rules.seed.json fully accurate. Safe to clear needs_review after s35.
