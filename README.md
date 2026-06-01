# Finnish Trainer (for Russian speakers)

A single-user daily web app to learn basic Finnish: vocabulary drills + a sentence
builder that grades Russian->Finnish translations with feedback in Russian.

**v1 runs at $0:** static front-end, grading by local lookup — no API key, no GPU. The
hard linguistic work is done at build time by a Claude Code subagent, not at runtime.
Progress persists to **Supabase** when configured, and falls back to the browser's
`localStorage` otherwise, so the app works offline and with zero credentials in dev.

## Deploy (Vercel + Supabase)
The build output is a static SPA (`npm run build` -> `dist/`), so any static host works;
these steps target the user's existing Vercel + Supabase accounts.

1. **Supabase** — create/choose a project, then:
   - Run `supabase/migrations/0001_progress.sql` (Supabase SQL editor or `supabase db push`).
     It creates the `progress` table with row-level security.
   - Enable **Anonymous sign-ins**: Authentication -> Providers -> Anonymous. This gives
     every visitor a stable `user_id` with no login screen.
   - Copy the project URL and the **anon/publishable** key (Settings -> API). The anon key
     is public by design; RLS keeps each user to their own rows.
2. **Local dev** — copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (or leave them blank to use the localStorage fallback).
3. **Vercel** — import the repo (framework auto-detected as Vite; `vercel.json` is checked
   in), set the two `VITE_SUPABASE_*` env vars, deploy, then attach the custom domain under
   Project -> Settings -> Domains and point the DNS as Vercel instructs.

**Smoke test:** open the deployed URL in a fresh browser profile (a `sb-*` auth entry
appears in localStorage = anonymous session created), answer a few items in a later slice,
and confirm rows land in the Supabase `progress` table.

### Install on your phone (PWA)
The app is a Progressive Web App (via `vite-plugin-pwa`): once deployed over HTTPS, open
the site in the phone browser and use **Add to Home Screen**. It then launches full-screen
like a native app, and a service worker precaches the shell so it opens and runs **offline**
(answers sync to Supabase when back online, and fall back to local storage meanwhile). The
service worker auto-updates on the next visit after a deploy.

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
