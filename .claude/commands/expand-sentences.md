---
description: Generate & verify accepted-answer sets for new sentence prompts (build-time, free).
argument-hint: "[fi|en] [Russian prompt(s), or a theme like \"daily routine\"]"
---

Expand the sentence bank for a target language using its linguist subagent.

**Pick the language** from the first argument (default `fi` if omitted):
- `fi` → **finnish-linguist**, editing `data/sentences.seed.json` (vocab in `data/dictionary.seed.json`).
- `en` → **english-linguist**, editing `data/en/sentences.seed.json` (vocab in `data/en/dictionary.seed.json`).

Agent reuse (do this first):
- If a linguist agent named `linguist` is already running in this session for THIS language,
  send the task to it via `SendMessage({to: "linguist"})` so it keeps the dictionary/context it
  built up this batch.
- Otherwise spawn it: `Agent({subagent_type: "finnish-linguist" | "english-linguist", name: "linguist"})`.
- Leave it running between rounds; do not re-spawn cold per prompt. If you switch languages, spawn
  the other linguist under a distinct name (e.g. `linguist-en`).

Task: $ARGUMENTS

Rules:
- Only use vocabulary that exists in that language's dictionary seed. If a prompt needs a word that
  isn't there yet, FIRST add the verified word (with every field the schema requires — for English
  the target word goes in the `en` field), then write the sentence item.
- For each new Russian prompt produce a full item matching the sentence schema:
  - `canonical` (single model answer),
  - `accepted` (the DISTINCT correct phrasings — genuine variants/contractions. For Finnish do NOT
    list the dropped-subject-pronoun pair: the grader derives it. For English the subject is never
    dropped, so list it; include natural contractions),
  - `wrong` (2–4 realistic Russian-speaker mistakes, each with a short RUSSIAN explanation;
    `wrong.match` PRE-NORMALIZED: lowercase, no punctuation, straight apostrophes),
  - `uses`, `teaches`. Keep `level` ≥ the max level of every vocab id it `uses`.
- Mark every new item and any new dictionary entry `"needs_review": true` unless fully certain.
- Output the new/updated JSON only; do not touch unrelated entries. Keep it valid JSON.

After writing, briefly summarize what was added and flag anything you were unsure about. Run the
relevant integrity test (`*.integrity.test.ts`) to confirm shapes and that every accepted form
grades correct.
