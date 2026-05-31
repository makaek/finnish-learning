# Building the Finnish Trainer with Claude — a phase-by-phase playbook

A guide for building a Finnish-for-Russian-speakers web app **properly** with Claude,
keeping Product, Design, Implementation and Testing separate, and using Claude Code's
multi-agent features where they actually help.

---

## 0. The honest mental model of "multi-agent"

It's tempting to imagine "one AI agent per phase." That's not how it works well, and
it's worth being precise so you don't over-engineer.

- A **subagent** is an isolated Claude instance with its own context window, system
  prompt, and tool permissions. The parent delegates a focused task; only the
  subagent's *summary* comes back. The exploratory noise (file reads, searches,
  verbose logs) stays out of your main conversation.
- The value is **context hygiene + specialization**, not extra intelligence. A long
  session fills its context with noise and answer quality drops; subagents keep the
  main thread clean and let you pin domain rules (Finnish grammar) and tool limits
  (read-only reviewer) to a worker.
- Subagents **cannot spawn other subagents**. For workers that must talk to each other,
  there are **agent teams** (experimental, off by default) — you almost certainly
  don't need them for this project.

So the four phases below are run mostly as a **guided sequence in your main session**
(planning -> implementation -> testing share context and belong together). You reach
for subagents *inside* phases for the three recurring specialist jobs: **Finnish
correctness, code review, running tests.** Those are the three subagent files in the
starter kit.

---

## Phase 1 — PRODUCT (decide what you're building, before any code)

Do this in the Claude.ai chat app, or in Claude Code **plan mode** — somewhere with no
pressure to write code. Output is a short PRD you keep in the repo.

Decisions to lock down:
- **The daily loop.** You open the app and do N short exercises. Define N, target
  session length (~10 min), and what "done for today" looks like.
- **Exercise types** (start with three):
  1. *Recognize* — RU prompt, pick the Finnish word from 4 options.
  2. *Produce* — RU prompt, type the Finnish word.
  3. *Sentence builder* — RU sentence, type the Finnish sentence, graded with feedback.
- **Vocabulary gating.** The sentence builder may only use words you've already
  "learned." Define what "learned" means (e.g. answered correctly 3× across sessions).
- **Progress / motivation.** Daily streak, words-due-today count, % of deck mastered.
- **Success metric.** e.g. "I come back ≥5 days/week and can produce 20 basic
  sentences unaided after a month."
- **Scope cut for v1.** No accounts, single user, local data first. Add sync later.

Prompt to drive it: *"Act as a product manager. Interview me with one question at a
time to turn this idea into a one-page PRD with the daily loop, three exercise types,
the 'learned word' rule, and a v1 scope cut."*

---

## Phase 2 — DESIGN (data + grading + UX, still no app code)

This is where the project lives or dies, because of Finnish grammar.

**Data model.** The dictionary is not a flat word list. Each entry carries grammatical
metadata so the app can produce/accept inflected forms — see `data/dictionary.seed.json`.
Nouns store key cases (partitive, inessive, illative, genitive) + gradation notes;
verbs store the person paradigm + past + connegative + verb type.

**The grading strategy — DECIDED for v1: pure local lookup ($0, offline, instant).**
The sentence builder is not truly free-form, because vocabulary is gated to words you've
already learned, so the set of correct answers per prompt is small and enumerable. For
each Russian prompt we precompute (at build time) a set of accepted Finnish answers plus
known-wrong patterns with Russian explanations — see `data/sentences.seed.json`. The
runtime grader (`src/core/grader.contract.ts`):
1. normalizes the typed answer (trim, lowercase, collapse spaces, strip optional punctuation),
2. matches it against the accepted set -> correct,
3. matches a known-wrong pattern -> shows the prepared Russian explanation,
4. otherwise -> diffs against the canonical answer and points at the differing word.

The expensive part — authoring/verifying correct Finnish — happens at BUILD time via the
`finnish-linguist` subagent (your Claude Code subscription), NOT at runtime. Run
`/expand-sentences` to generate accepted-answer sets for new prompts.

> Rejected alternatives and why: a runtime Claude API call costs per answer; a rented GPU
> VM running Ollama costs the most AND grades Finnish worst (small local models are weak
> at Finnish morphology). **Documented upgrade path, not built in v1:** if you later want
> an LLM to handle unexpected answers, add a fallback behind the same `grade()` interface
> pointing at a FREE hosted tier (Gemini/Groq) via a tiny proxy, or local Ollama on your
> own desktop. No rearchitecting required.

**Spaced repetition.** Use a simple, well-understood algorithm (Leitner boxes or SM-2).
Keep it a pure function: `(card, grade, now) -> nextCard`. Easy to unit test, no UI/DB.

**UX flows.** Sketch: home (streak + "start"), an exercise card, the answer/feedback
state, end-of-session summary. Keep it phone-friendly since the goal is a daily habit.

**Architecture (v1, $0).** A **static front-end** — e.g. React + Vite — with **local
persistence (IndexedDB)**. No backend and no API key anywhere, because grading is local
lookup. Hosting is a free static host or a $4/month VPS serving files. Keep learning
logic (SRS + grader) as pure modules in `src/core/` with no UI/DB imports. If you later
add the optional LLM fallback, that's the *only* time you introduce a tiny proxy to hold
a free-tier key — keep it out of v1.

Prompt to drive it: *"Be a software designer. From the PRD, produce: the dictionary
schema, the SRS function signature and algorithm choice with rationale, the sentence
grader interface (input/output JSON), and the screen flow. Don't write app code yet."*

---

## Phase 3 — IMPLEMENTATION (now use Claude Code)

Work in your main Claude Code session, in the repo that contains the starter kit
(`CLAUDE.md`, `.claude/agents/`, `data/`).

Recommended rhythm:
1. **Plan mode first.** Start the task in plan mode so Claude researches the repo (via
   the built-in Explore/Plan subagents) and proposes a plan before editing. Approve or
   adjust the plan, then let it build.
2. **Build vertical slices, not layers.** Slice 1: the word-recognition exercise
   end-to-end (data -> logic -> one screen). Slice 2: typed production. Slice 3: SRS
   scheduling. Slice 4: the sentence builder + grader. Each slice is a "definition of
   done" unit (see `CLAUDE.md`).
3. **Delegate the noisy/specialist bits.**
   - Any Finnish content (expanding the dictionary, writing grading keys/fixtures) ->
     `@finnish-linguist`. Never hand-write Finnish yourself.
   - After a slice compiles -> `@code-reviewer`.
4. **Keep the main session for the connective work** — wiring slices together, quick
   edits, decisions. Don't push iterative back-and-forth into subagents; that's slower.

---

## Phase 4 — TESTING (separate, and partly about *content* not just code)

Four layers, in priority order:
1. **Unit tests for pure logic.** The SRS function (interval math, due-date handling,
   edge cases) and the grader's answer-normalization. These are deterministic — easy
   wins, high value.
2. **Content correctness.** The risk that's unique to this app: *is the Finnish right?*
   Have `@finnish-linguist` audit the dictionary and the accepted-answer sets, and flag
   `needs_review`. This is QA you can't get from a normal test runner.
3. **Integration.** Exercise selection respects the "learned words" gate; a correct
   answer actually advances the SRS schedule; the grader's hybrid path (lookup ->
   API fallback) returns the right shape.
4. **End-to-end / acceptance.** Walk the real daily loop: open -> do a session ->
   streak increments -> words become due again later. This is your real metric.

Run everything through `@test-runner` so failures come back as a clean summary instead
of flooding your context. Loop: failing test -> fix in main session (or a debugger
subagent) -> re-run.

---

## Multi-agent setup on Windows PowerShell

You already have the three subagent files under `.claude/agents/`. Because they're
files on disk, **restart Claude Code** (or recreate them via `/agents`) so they load.

Manage them interactively:
```
/agents
```
This opens the Library tab — view, edit tool access, or generate new ones with Claude.

Invoke explicitly when you want a specific one:
```
@finnish-linguist verify the past-tense forms in data/dictionary.seed.json
@code-reviewer look at my recent changes
Use the test-runner subagent and report only failures
```

Define a throwaway subagent for one session without a file (PowerShell here-string):
```powershell
claude --agents @'
{
  "debugger": {
    "description": "Root-cause failing tests and fix them.",
    "prompt": "You are an expert debugger. Find the root cause, make a minimal fix, verify.",
    "tools": ["Read","Edit","Bash","Grep","Glob"]
  }
}
'@
```

Useful flags/ideas:
- Start a session driven entirely by one agent: `claude --agent code-reviewer`
- Cost control: the `test-runner` is pinned to Haiku (fast/cheap), the `finnish-linguist`
  to Opus (accuracy matters), the reviewer to Sonnet.
- You don't need agent teams. If you ever want parallel workers that message each
  other, they're gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — skip for now.

---

## Which Claude surface for which phase

| Phase | Where | Why |
|---|---|---|
| Product | Claude.ai chat or Claude Code plan mode | thinking, no code pressure |
| Design | Claude.ai chat (+ artifact to prototype the grader) | iterate on data model & grader contract |
| Implementation | Claude Code (main session + subagents) | edits the repo, delegates specialist work |
| Testing | Claude Code (`test-runner`, `finnish-linguist` for content) | runs suite, audits Finnish |

---

## Suggested repo layout
```
finnish-trainer/
├─ CLAUDE.md                      # project memory (loads every session)
├─ .claude/agents/                # subagents (check into git, share/improve over time)
│   ├─ finnish-linguist.md
│   ├─ code-reviewer.md
│   └─ test-runner.md
├─ data/
│   └─ dictionary.seed.json       # seed dictionary w/ grammatical metadata
├─ src/
│   ├─ core/                      # pure: srs.ts, grader.ts  (unit-tested, no UI/DB)
│   ├─ ui/                        # thin React components
│   └─ server/                    # holds the Claude API key, proxies grading
└─ tests/
```
