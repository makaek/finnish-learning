---
description: Generate & verify accepted-answer sets for new sentence prompts (build-time, free).
argument-hint: [Russian prompt(s), or a theme like "daily routine"]
---

Expand `data/sentences.seed.json` using the **finnish-linguist** subagent.

Agent reuse (do this first):
- If a `finnish-linguist` agent named `linguist` is already running in this session,
  send this task to it via `SendMessage({to: "linguist"})` so it keeps the dictionary
  and gradation context it already built up this batch.
- Otherwise spawn it with `Agent({subagent_type: "finnish-linguist", name: "linguist"})`
  so follow-up rounds in this session can reuse it.
- Leave it running between rounds; do not re-spawn cold per prompt.

Task: $ARGUMENTS

Rules:
- Only use vocabulary that exists in `data/dictionary.seed.json`. If a prompt needs a
  word that isn't there yet, FIRST add the verified word to the dictionary (with all
  required inflected forms per that file's schema), then write the sentence item.
- For each new Russian prompt produce a full item matching the schema in
  `data/sentences.seed.json`:
  - `canonical` (single model answer),
  - `accepted` (every correct phrasing: with AND without the dropped subject pronoun,
    plus legitimate word-order variants),
  - `wrong` (2-4 realistic Russian-speaker mistakes — wrong case, wrong tense, missing
    partitive, mis-conjugated negation — each with a short explanation IN RUSSIAN),
  - `uses`, `teaches`.
- Mark every new item and any new dictionary entry `"needs_review": true` unless you are
  fully certain of every form.
- Output the new/updated JSON only; do not touch unrelated entries. Keep it valid JSON.

After writing, briefly summarize what was added and flag anything you were unsure about.
