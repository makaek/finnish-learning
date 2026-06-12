# Handoff: «Грамматика» — четвёртый режим тренажёра Suomi

## Overview

A new **Grammar mode** for the Suomi Finnish trainer (Russian-speaking learners, A1→A2): a
prerequisite-gated tree of 3–5-minute lessons (Модули → Темы → Урок), where every lesson is the
fixed sequence **Теория → Разминка → Дрилл**, six reusable exercise item types with
correct / near-miss / wrong feedback, an end-of-lesson summary, and integration with the existing
home screen (a 4th group on the «Кольцо баланса» + an action card).

Target codebase: `makaek/finnish-learning` (the production app whose `src/ui/styles.css` this
design system mirrors verbatim). Everything here was designed to be **append-only** on top of the
existing token set and component CSS.

## About the Design Files

The files in this bundle are **design references created in HTML/JSX** — prototypes showing the
intended look and behavior, not production code to copy directly. The task is to **recreate these
designs in the target codebase's existing environment** (the production app is React + TypeScript
with a single global stylesheet) using its established patterns: production class names, the
`light-dark()` token set, the existing `BalanceRing.tsx`, `Option`/`ProduceInput`/`Feedback`
primitives, etc. `gram-app.jsx` / the `DesignCanvas` / `TweaksPanel` scaffolding are
**presentation-only** (an artboard viewer) — ignore them entirely during implementation.

The live, viewable version is the project root file `Грамматика — дизайн.html` (it needs the
project's `styles.css` and the canvas scaffolding, so the copy in this bundle won't render
standalone — it's included for reference reading only).

## Fidelity

**High-fidelity.** Colors, type sizes, spacing, radii and copy patterns are final and composed
from the production token set. Recreate pixel-perfectly with the codebase's existing CSS
conventions. The demo lesson **content** (nukkua / -ssa/-sta) is realistic but illustrative — the
content team supplies final text; you implement the containers.

## The one new token

```css
--gram: #a8487f;   /* grammar mode accent — «ягода» */
```

Recommended `light-dark()` pair: `light-dark(#a8487f, #d77fae)`. Every derived tint is composed,
never hard-coded:

```css
--gram-deep: color-mix(in srgb, var(--gram) 82%, #2d2733);  /* example fi-text on cream */
--gram-soft: color-mix(in srgb, var(--gram) 10%, var(--card)); /* tile/banner washes */
--gram-line: color-mix(in srgb, var(--gram) 28%, var(--border)); /* tinted borders */
--gram-wash: color-mix(in srgb, var(--gram) 18%, transparent); /* letter highlight, shadows */
```

Alternates explored (kept as Tweaks in the prototype): слива `#7c4fae`, индиго `#4453c4`.
Default shipped: `#a8487f`. Do **not** reuse `--rd-violet` (taken by Слова) or `--accent`
(navigation blue).

All other colors are existing token roles: `--ok/--no/--known` for grading, `--gold` for
gradation highlights, group hues for concept tags (see below).

## Screens / Views

### 1 · Topic map (`GramTopicMap`, grammar home)

Entry: home action card or the ring's grammar chip. Standard scrolling column
(`.app--home`-style shell, 18px gutters, 13px column gap, cards max-width 30rem, bottom nav visible).

- **Header row**: back pill (36×36, `--card` bg, 12px radius, muted ✕/← icon) · H1 «Грамматика»
  (1.45rem/800/−0.02em) · CEFR chip «A1.2» (0.68rem/800, teal on teal-12% wash, 7px radius).
- **Progress hero** (card, 18px radius, 13/15px padding, row gap 13px): 46px mastery ring at 31% ·
  «Освоено 2 из 9 тем» (0.95rem/800) · 7px progress bar (track `--surface-2`, fill `--gram`,
  pill) · sub line «Слабая тема: **Отрицание** · повторите сегодня» (0.72rem/600 muted, topic
  name in `--gram`).
- **Module header** (`.gmod`): eyebrow «МОДУЛЬ 1» (0.66rem/800/+0.06em uppercase, `--gram`) ·
  module name (0.86rem/800) · 1px hairline filler · count «1/3» (0.7rem/700 muted).
- **Topic card** (`.gtopic`): full-width button row — 40px tile (12px radius) · title
  (0.95rem/800) + one-line summary (0.72rem/600 muted) + optional concept-tag row (6px gap,
  margin-top 6px) · trailing state slot. 16px radius, `--card` bg, 1px `--border`, `--shadow-sm`,
  padding 12/13px, press = scale(0.985).

  Four states:
  | State | Tile | Trailing | Card |
  |---|---|---|---|
  | **mastered** | green check on `--ok-soft` | pill «✓ Освоено» (`--ok` on `--ok-soft`, 0.72rem/800) | normal |
  | **in-progress** | pen icon, `--gram` on `--gram-soft` + `--gram-line` border | mastery ring/bar + «NN%» | normal |
  | **available** | same as in-progress | muted-free chevron-right in `--gram` | normal |
  | **locked** | lock, muted on `--surface-2` | — | `opacity: 0.62`, no shadow, transparent bg, `disabled`; below the summary a hint row «🔒 Сначала пройдите: <Тема>» (0.7rem/700 muted, 12px lock icon); tags hidden |

### 2 · Lesson chrome (shared by Теория/Разминка/Дрилл)

- **Top row**: exit button (36×36 ✕) · middle: topic eyebrow (0.64rem/800 uppercase, `--gram`)
  over stage line «Теория **· шаг 1 из 3**» (0.98rem/800; the counter part 700/muted) · right:
  optional item counter pill «3 / 5» (0.74rem/800 muted, `--card` bg, pill, tabular-nums).
- **Step segments**: 3 equal 5px pills, 5px gap. Done = `--gram` @45% mix into `--surface-2`,
  current = `--gram`, upcoming = `--surface-2`.
- **Primary button** (`.gnext`): full-width, min-height 3.25rem, pill radius, 1.05rem/800 white
  on `--gram`, shadow `0 6px 16px var(--gram-wash)`, press scale(0.98). Ghost variant: `--card`
  bg, `--border`, `--text`. The button is bottom-anchored (flex spacer pushes it down).

### 2a · Теория (`GramTheoryVerb`, `GramTheoryCase`)

One `.card` (22px radius, `--shadow`), compact padding 1.1rem:

1. Concept-tag row.
2. Title 1.45rem/800/−0.02em; one-line summary 0.9rem/600 muted; body paragraph 0.92rem/1.5
   (2 sentences max, Finnish fragments in `<b lang="fi">`).
3. Section eyebrow «ПРИМЕРЫ» (0.64rem/800 uppercase muted) → example pairs: `--surface` rows,
   12px radius, 8/11px padding; Finnish 0.98rem/700 in `--gram-deep`, Russian 0.8rem/500 muted
   beneath.
4. Section eyebrow with the paradigm word («NUKKUA · НАСТОЯЩЕЕ ВРЕМЯ») → **paradigm table**
   (`.gpara`): CSS grid `minmax(4.2rem,auto) 1fr`, 14px outer radius, 1px borders. Left cell =
   person/question (0.8rem/700 muted on `--surface`); right cell = form (1.06rem/700 on
   `--card`), with optional inline Russian gloss (0.76rem/500 muted, 7px left margin). Always
   2 columns — never a wide grid.
5. **Letter highlights** (`mark.ghl`): background wash, not color alone (a11y). Two channels:
   - `.ghl` — личное окончание / падежное окончание: `var(--gram-wash)` bg, 800 weight, 4px radius, 2px x-padding.
   - `.ghl--alt` — чередование / гласная основы: `color-mix(in srgb, var(--gold) 24%, transparent)`.
   Followed by a key row (12px swatch squares + 0.7rem/700 muted labels).
6. An info explanation block stating the rule (see Explanation block).

### 2b · Разминка (`GramWarmup`) — recognition

4–6 multiple-choice items. Card: prompt 1.25rem/700 (the gap rendered as a 2px `--gram`
underline `gblank`, or — after a correct answer — the filled word in `gfill-in`: `--ok` on
`--ok-soft`, 5px radius) + production `.options` / `.option` list (existing classes:
`--correct` = `--ok` border + `--ok-soft` bg; `--wrong` = `--no` versions; others `--muted`
opacity 0.5; all `disabled` after answer). Explanation block after grading. «Дальше» button.

### 2c · Дрилл (`GramDrill`) — production

6–10 items, mostly typed. Existing `.produce__input` (1.2rem, 2px border, focus = `--accent`)
plus the **quick-insert keys** row beneath: `ä` and `ö` buttons, flex 1 each, **min-height 44px**
(tap target), `--card` bg, 1px border, 12px radius, 1.2rem/700, press scale(0.95). Inserting
appends at caret. Submit button label «Проверить»; grading is instant and offline — no spinners.

### 3 · End-of-lesson summary (`GramSummary`)

Vertically centered column:
- 108px mastery ring animating to the new % (`stroke-dashoffset` transition), overlapped chip
  «+27%» (white on `--gram`, pill, 0.74rem/800, margin-top −14px).
- Title «Хорошо!» 1.6rem/800 · sub «Тип глагола 1 · освоение 72%» 0.88rem/600 muted · score
  «8/10» 2rem/800 `--gram` (denominator 1.05rem muted).
- «ПОВТОРИТЕ» card: stack of explanation blocks (near/no tones) naming error patterns
  («Чередование kk → k — две ошибки в дрилле»).
- **Unlock banner** (only when mastery threshold crossed): `--gram-soft` bg + `--gram-line`
  border, 16px radius; 38px `--gram` disc with open-lock icon; eyebrow «ОТКРЫТА ТЕМА» (0.64rem
  uppercase `--gram`) + topic name 0.95rem/800. Celebrate lightly — no confetti.
- Button row: ghost «Ещё раз» + primary «К темам», 9px gap, equal flex.

### 4 · Home integration (`GramHomeMock`, `gram-ring.jsx`)

- **Balance ring**: add a 4th group `gram` to `BalanceRing.tsx` — label «Грамматика», chip shape
  **diamond** (square rotated 45°, side `r*1.52`, corner radius `r*0.34`) so the group reads
  without color, mode icon = pen, hue `var(--gram)`, soft fill = `color-mix(in srgb,
  var(--gram) 13%, #fffdfa)`. Group arc, mastery spoke fill, badge and weak-flag logic are
  unchanged. Legend gains a diamond swatch entry.
- **Action card**: a full-width horizontal `.ctacard` with `--acc: var(--gram)` — 42px pen tile ·
  kicker «ГРАММАТИКА» · title «Слабая тема: <N>» · sub «3–5 мин · продолжить урок» · 32px play
  disc. Deep-links to the topic map (weakest topic preselected).
- «Правила» (the reference grammar book) **stays** in the bottom nav — Грамматика is the trainer,
  Правила the reference; cross-link lessons to their rule via the existing `.ruleslink--inline`.

## The six item types (`gram-items.jsx`)

All items share: Russian prompt (1.25rem/700, optional hint line 0.8rem/600 muted), answer area,
instant offline grading, and an explanation block in every feedback state.

1. **classify** — chips grid `repeat(3, 1fr)` of `.option--chip` (min-height 2.8rem, centered,
   0.95rem/700): «Тип 1…Тип 6». Wrong pick shows **that option's own stored reason** (red block)
   *and* highlights the correct chip green with its reason.
2. **choose_form** — prompt with gap + 4 full-width `.option`s. Each distractor has a stored
   Russian reason rendered *inside the picked option* (`.option__why`, 0.74rem/600 `--no`),
   followed by a green «Правильный ответ: …» block.
3. **case_id** — prompt sentence with the ending pre-highlighted (`.ghl`), options are case names
   with their question word: «инессив (где?)» etc. Same wrong-pick pattern as choose_form.
4. **produce_form** — typed. States: default (input + ä/ö keys) · correct (input gets
   `--ok` border + `--ok-soft` bg, disabled) · **near-miss** (`--known` border + `--known-soft`
   bg — visually distinct from wrong; gentle copy «Почти! …») · wrong (`--no` border +
   `--no-soft`, the user's answer **struck through** in `--no`). Near-miss and wrong both append
   the **canonical answer row** (`.gcanon`): «ВЕРНО» eyebrow + the correct form at 1.12rem/800
   with the same letter highlights as the theory table.
5. **transform** — identical affordances, full-phrase input («En puhu suomea»).
6. **fill_table** — the 2-column paradigm as a stacked list: person label (3.6rem, 0.8rem/700
   muted) + compact input (11px radius) per row, 7px gap; ä/ö keys below. **Each cell grades
   independently** green/red; a red cell gets a correction line beneath («→ asutte», 0.74rem/800
   `--ok`). Summary explanation: «4 из 6 верно. Повторите окончания -tte и -vat.»

### Near-miss detection
Levenshtein distance 1 (one missing/extra/substituted letter, including ä↔a, ö↔o confusions) =
amber near-miss; anything else wrong = red. Case-insensitive compare; trim whitespace.

## Reusable system components

### Explanation block (`.gx` / `GExplain`) — the learning moment
One component everywhere (theory note, every feedback state, summary review). Flex row, 9px gap,
12px radius, padding 10/12px; bg = tone @9% into `--card`, border = tone @22% into `--border`;
22px round icon disc (white glyph on tone). Text 0.85rem/600/1.45; Finnish fragments 800-weight
in the tone color. Tones: `ok`(✓, `--ok`) · `no`(✕, `--no`) · `near`(⚡, `--known`) ·
`info`(i, `--gram`). Copy: 1–2 Russian sentences, names the rule (гармония гласных, чередование,
партитив, коннегатив). Never show gender/article hints — Finnish has none.

### Concept tags (`.gtag` / `GTag`)
Pill-ish chips (7px radius, 3/8px padding, 0.68rem/800) with a 7px square dot; color = existing
token roles, consistent app-wide:

| Concept | Token |
|---|---|
| падеж | `--rd-teal` |
| тип глагола 1–6 | `--rd-violet` |
| чередование согласных | `--gold` |
| коннегатив / отрицание | `--weak-deep` |
| партитив | `--read` |
| гармония гласных | `--rd-green` |

Used on topic cards, theory headers, and (by the content schema) attachable to items.

### Mastery indicator (`Mastery`)
0–100% per topic, surfaced from the existing SRS. Two equivalent renderings (a product decision
to make — the prototype exposes both via Tweaks): 28px SVG ring (r 10.5, stroke 4.5, track
`--surface-2`, round cap, −90° start) **or** 52×6px pill bar. Fill `--gram`; at 100% switch to
`--ok` / the «✓ Освоено» pill. % label 0.76rem/800 muted, tabular-nums.

## Interactions & Behavior

- **Grading**: instant, local. MC: lock options, color picked + correct, show reason(s), enable
  «Дальше». Typed: «Проверить» → state + explanation + canonical answer (if not correct) →
  button becomes «Дальше». Correct answers may auto-advance after ~800ms (kept as a «Дальше»
  button in the design; either is acceptable — keep it consistent).
- **Transitions**: production motion rules — 0.1–0.2s ease, press scale 0.94–0.985, no bounces,
  no infinite loops. Summary ring fill: 0.5s ease `stroke-dashoffset` (respect
  `prefers-reduced-motion`).
- **Locking**: a topic unlocks when all prerequisites reach the mastery threshold; unlock is
  announced on the summary screen.
- **Focus**: 3px ring `color-mix(in srgb, var(--accent) 60%, transparent)` (existing rule).
- **Responsive**: phone-first at 390px. Column centers at `max-width: 30rem` (existing shell).
  ≥768px the topic map MAY become a 2-column module grid; lesson screens stay single-column.
  Components and type scale unchanged.

## State Management

- `grammarTree`: modules → topics with `id, title, summary, tags[], prereqIds[], mastery (0–100), state (derived: locked|available|in-progress|mastered)`.
- `lesson`: `topicId, stage (theory|warmup|drill), itemIndex, answers[], errorPatterns[]` — error
  patterns keyed by concept tag for the summary's «Повторите» list.
- `item` schema: `type (classify|choose_form|case_id|produce_form|transform|fill_table), promptRu,
  promptFi?, options[]? (each with reasonRu), answer(s), explanationRu, highlights[]`.
- Mastery updates reuse the existing SRS/progress model; the UI only renders its 0–100% output.
- Ring data: append one mode `{ group: "gram", icon: "pen", mastery, remaining }`.

## Design Tokens (all existing unless noted)

- **New**: `--gram: light-dark(#a8487f, #d77fae)` + the four `color-mix` derivatives above.
- Surfaces `--bg #f7f1e8 / --card #fffdfa / --surface / --surface-2`, border `#e8dccb`,
  text `#2d2733`, muted `#6e6577`.
- Semantics: `--ok #158055/-soft`, `--no #cc4035/-soft`, `--known #b36b0e/-soft` (near-miss),
  `--gold #c8902b` (gradation highlight).
- Radii: cards 22px, tiles 12–18px, inputs 11–12px, pills 999px. Spacing `--s1…--s5`
  (0.4/0.65/1/1.5/2rem), 18px phone gutter.
- Type: system rounded stack (`ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui…`), weights
  800/700/600/500; uppercase eyebrows 0.62–0.72rem/800/+0.06em. Min interactive target 44px.
- Shadows: `--shadow`, `--shadow-sm` (warm brown), plus `0 6px 16px var(--gram-wash)` on the
  primary grammar button.

## Assets

No raster assets. All icons are the app's monoline style (24×24 viewBox, `stroke="currentColor"`,
width 1.7–1.9, round caps) — new glyphs introduced: **pen** (`M12 20h9` + edit stroke), **open
lock**, **bolt**, the rest reuse `src/ui/icons.tsx`. Dark theme comes free via the
`light-dark()` tokens — verify `--gram` dark side contrast on `#221d31` cards.

## Files

| File | What |
|---|---|
| `Грамматика — дизайн.html` | Canvas entry (view the live copy at the project root) |
| `grammar.css` | **The key deliverable**: all new `gram-*` component CSS, append-only, token-based |
| `gram-kit.jsx` | Primitives: GExplain, GTag, Mastery ring/bar, ParadigmTable + Hl, LessonTop, QuickKeys, GCanon, icons |
| `gram-ring.jsx` | BalanceRing fork showing the 4th group (diff vs prod `BalanceRing.tsx`: GR_ICONS.pen, diamond shape, gram hue/soft maps) |
| `gram-screens.jsx` | Topic map, theory ×2, warm-up, drill, summary, home mock (incl. demo data) |
| `gram-items.jsx` | The six item types in every feedback state |
| `gram-app.jsx` | Artboard/canvas scaffolding — presentation only, do not implement |
