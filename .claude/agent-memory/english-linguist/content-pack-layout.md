---
name: content-pack-layout
description: Structure of the English-for-Russian A1 content pack — files, id ranges, level→topic map, and the integrity-test constraints every entry must satisfy
metadata:
  type: project
---

The English (target) A1 deck for Russian speakers lives under `data/en/`:
`dictionary.seed.json` (groups: pronouns p*, verbs v*, nouns n*, adjectives a*, function_words f*),
`sentences.seed.json` (key `sentences`, ids s*), `texts.seed.json` (key `texts`, ids t*, question ids t#q#).
Level titles are in `src/data/languages/en.ts` (TITLES record; the `fi` field holds the ENGLISH topic name).

Level → topic map (as of 2026-06-10):
1 Greetings, 2 Family & home, 3 Food & daily life, 4 Numbers & time, 5 City & directions
(can, there is/are, prepositions), 6 Past Simple + shopping/money. Past tense is deliberately
gated to level 6 (mirrors the Finnish curriculum).

Highest ids used after the L5/L6 expansion: p15, v37, n73, a22, f51, s74, t24.

**Integrity test** (`src/data/languages/en.integrity.test.ts`) enforces, and authoring MUST satisfy:
- all ids unique; every sentence `uses` id resolves; sentence.level >= max level of any word it uses.
- canonical + every accepted form must grade CORRECT; every `wrong.match` must grade as `via:"known"`
  (false). The grader lowercases, strips ALL punctuation, collapses spaces — so a `wrong.match` must
  NOT normalize to any accepted form, and must be pre-normalized (lowercase, no punctuation, straight
  apostrophes, internal apostrophes kept).
- reading gloss KEYS must each be a token of that line after `tokenizeLine` (whitespace split) +
  `glossKey` (lowercase, strip leading/trailing non-alphanumerics, KEEP internal apostrophe). Multi-word
  prepositions like "next to" must be glossed as two separate keys "next" and "to".
- every word/sentence/text `theme` must be a registered id in `src/data/themes.ts` (THEMES) — do NOT invent.
- EACH level with reading needs >=2 monologue texts (type "text") AND >=2 dialogs (type "dialog").

The user runs the integrity test + build after authoring and reports failures back. See [[ru-error-patterns]].
