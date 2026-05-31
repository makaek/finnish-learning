# CLAUDE.md — Finnish Trainer (for Russian speakers)

Loaded automatically into every Claude Code session and every custom subagent in
this project. Keep it short and high-signal.

## What this is
A web app for a single daily user (a Russian speaker) to learn basic Finnish:
- vocabulary drills (RU prompt -> choose/type the Finnish word),
- short exercises (~2-4 min each, several per day),
- a **sentence builder**: show a Russian sentence (e.g. "Я иду на работу"), the user
  types Finnish built from vocabulary they've already learned.

## The core technical truth (read before designing anything)
Finnish is heavily inflected. You CANNOT grade by matching dictionary forms. Words
change by **case** (~15) and **consonant gradation**; verbs conjugate by
**person/tense**; objects are often **partitive**; negation uses the verb *ei* +
connegative. The dictionary stores grammatical metadata (`data/dictionary.seed.json`),
and grading must accept MULTIPLE correct answers.

## Cost decision (v1 = $0, runs anywhere, no GPU, no paid API)
- **Runtime grading is pure local lookup.** No LLM call when the user answers. For each
  Russian prompt we ship a precomputed set of accepted Finnish answers + known-wrong
  patterns with Russian explanations (`data/sentences.seed.json`). The runtime
  normalizes the typed answer and matches it; on a near miss it diffs against the
  canonical answer. Deterministic, instant, offline, free.
- **The expensive linguistic work happens at BUILD time**, not runtime: the
  `finnish-linguist` subagent (running under your Claude Code subscription) generates
  and verifies those answer sets. See `/expand-sentences`.
- **Documented upgrade path (do NOT build in v1):** if you ever want LLM grading for
  unexpected answers, add a fallback that calls a FREE hosted tier (e.g. Gemini/Groq
  free tier) from a tiny proxy, or local Ollama on your own machine. A rented GPU VM is
  explicitly rejected: costs more and grades Finnish worse than a free frontier tier.
- v1 ships as a **static front-end with local persistence (IndexedDB)** — no backend,
  no API key anywhere.

## Division of labor
- **Finnish correctness** is owned by `finnish-linguist`. Never hand-write Finnish
  forms, accepted-answer sets, or fixtures containing Finnish without routing through it.
- Code review -> `code-reviewer`. Tests -> `test-runner`.

## Conventions
- TypeScript, strict mode. Learning logic (SRS + grader) lives in pure modules under
  `src/core/` with NO UI/DB imports, so it's trivially unit-testable.
- The grader implements the contract in `src/core/grader.contract.ts`.
- Dictionary/sentence edits follow the schemas in `data/*.seed.json`. Unverified
  entries carry `"needs_review": true` until the linguist confirms them.

## Definition of done for a feature
Builds + lint passes + `test-runner` green + `code-reviewer` has no Critical findings +
any new Finnish content verified by `finnish-linguist`.
