# Finnish Trainer (for Russian speakers)

A single-user daily web app to learn basic Finnish: vocabulary drills + a sentence
builder that grades Russian->Finnish translations with feedback in Russian.

**v1 runs at $0:** static front-end, local persistence, grading by local lookup — no
backend, no API key, no GPU. The hard linguistic work is done at build time by a Claude
Code subagent, not at runtime.

## Start here
1. Read `PROJECT_GUIDE.md` — the full Product -> Design -> Implementation -> Testing
   playbook and the multi-agent / PowerShell setup.
2. `CLAUDE.md` is the project memory (loads automatically in Claude Code).

## Layout
```
.
├─ CLAUDE.md                       # project memory (auto-loaded)
├─ PROJECT_GUIDE.md                # the playbook
├─ README.md
├─ .gitignore
├─ .claude/
│  ├─ agents/
│  │  ├─ finnish-linguist.md       # owns Finnish correctness (Opus)
│  │  ├─ code-reviewer.md          # read-only review (Sonnet)
│  │  └─ test-runner.md            # runs tests, reports summaries (Haiku)
│  └─ commands/
│     └─ expand-sentences.md       # /expand-sentences  (build-time authoring)
├─ data/
│  ├─ dictionary.seed.json         # seed words + grammatical metadata
│  └─ sentences.seed.json          # accepted-answer sets for the grader
└─ src/core/
   └─ grader.contract.ts           # the grading interface to implement against
```

## First moves in Claude Code (PowerShell)
```
cd finnish-trainer
claude
```
Then, in plan mode, build the first vertical slice (word-recognition exercise). Use
`/expand-sentences` to grow the sentence bank, `@finnish-linguist` to verify any Finnish,
`@code-reviewer` after each slice, and the `test-runner` subagent before calling a slice
done. Restart Claude Code once after first checkout so the subagents load from disk.
