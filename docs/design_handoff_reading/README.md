# Handoff: Чтение (Reading) — Тексты & Диалоги redesign

## Overview
This is a redesign of the **Reading** section of a Finnish-learning app (RU-language UI). It
covers the full flow a learner passes through for a reading lesson — a monologue **text** or a
two-role **dialog**:

```
Home → Library (Тексты 📖 / Диалоги 🎭)
         → Reader (the hub: read + listen + translate)
              ├─ Quiz  (ответы на вопросы — graded)
              └─ Recite (наизусть — за все роли — voice)
                   → «Прочитано!» (mastered)
```

The redesign does three things to the messy original:
1. **Brings it into the home-screen visual system** — same warm palette, Golos Text, white cards,
   and **monoline icons (no emoji)**. Reading is themed with the home ring's brown "Чтение" accent.
2. **Reading-as-chat** — texts/dialogs render as a **messaging thread** (bubbles); answering and
   reciting happen in a chat-style composer.
3. **A clear two-part mastery model** — see below. This is the core product rule of the redesign.

## The mastery model (important)
A text/dialog is **«Прочитано» (mastered)** only when **BOTH** parts are complete:

| Part | Label | Graded? | Done when |
|---|---|---|---|
| 1 | **Ответы на вопросы** (Quiz) | yes (counts to level) | comprehension quiz passed |
| 2 | **Наизусть — за все роли** (Recite) | no | recited by memory in **every** role |

- For a **dialog** (≥2 speakers), recite requires playing **each role** (e.g. Pekka *and* Liisa).
  "За все роли" = "for all roles".
- For a **monologue text** (one role), recite = tell the whole thing once.
- `«Прочитано»` is shown explicitly (trophy + word) in the library and the reader. Partial progress
  (one of two parts) is a distinct state, never conflated with mastered.
- Mastery logic lives in `data.jsx`:
  ```js
  masteryState(item) =>
    item.locked                  ? 'locked'    // level too high
    : item.quiz && item.recite   ? 'mastered'  // Прочитано
    : item.quiz || item.recite   ? 'progress'  // начато (1 of 2)
    : 'new'                                     // доступно, не начато
  ```

## About the Design Files
The files in this bundle are **design references created in HTML/React (via inline Babel)** —
prototypes that show the intended look and behavior. They are **not** production code to ship
directly. The task is to **recreate these designs in the app's existing environment** (the live app
is React + TypeScript per the source brief — `Reading.tsx`, `TextReader.tsx`, `ReadingQuiz.tsx`,
`DialogPlay.tsx`) using its established components, hooks (`useSpeechSynthesis`,
`useSpeechRecognition`), and state patterns. If a screen is reused, port the *visual + structural*
intent, not the literal JSX.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component states are all specified below
and embodied in the prototype. Recreate pixel-faithfully using the codebase's libraries. The phone
bezel and the design-canvas wrapper in the HTML are presentation scaffolding only — **not** part of
the UI to build.

---

## Design Tokens

### Colors (`kit.jsx` → `RC` + reading accent)
```
ink        #23262E   primary text
sub        #71757F   secondary text
faint      #AAB1BC   tertiary / disabled
card       #FFFFFF   surfaces
line       #E7E3DB   hairline borders
track      #EEEAE2   progress track
wash       #F4F1EB   inset fills / icon-button bg
cream      #F0EDE6   app background
green      #3B9C6E   success / "done"
amber      #CF9A4E
red        #CE6A57   stop / destructive
blue       #3B68C9
gWords     #5B53C6   group hue "Слова"  → speaker Liisa
gSent      #1B8E84   group hue "Предложения" → speaker Pekka, quiz accent, active nav
gRead      #BB6A39   group hue "Чтение" → THE reading accent (see READ)

READ       #BB6A39   reading primary (buttons, highlights)
READ_SOFT  #F4EBE1   reading soft fill (chips, your-bubble bg, hero rings)
READ_LINE  #E8DAC9   reading-tinted border
green soft #E7F1EC   "done" fill   ·  green border #BFE0CE
```
Speaker → colour map: `Pekka = gSent (#1B8E84)`, `Liisa = gWords (#5B53C6)`,
`Рассказчик/narrator = sub (#71757F)`.

### Typography
- Family: **Golos Text** (Google Fonts), weights 400/500/600/700/800. Fallback `system-ui, sans-serif`.
- Scale used (px / weight):
  - Screen title 25 / 800, letter-spacing −0.02em
  - Reader header title 18 / 800
  - Section title (e.g. "Прочитано!") 28 / 800
  - Quiz question (FI) 21 / 800 (bubble) · 27 / 800 (document variant)
  - Bubble FI text 16.5 / 600, line-height 1.32, −0.01em
  - Bubble RU translation 13.5 / 500, color `sub`
  - Body / hint 13.5 / 500, color `sub`
  - Micro-label / kicker 11–12 / 800, letter-spacing 0.04–0.06em, often UPPERCASE
  - List row title 16 / 700
- `lang="fi"` on all Finnish text, `lang="ru"` on Russian.

### Radii / spacing / shadows
```
radius:  bubble 18 (tail corner 5)  ·  card 16–22  ·  icon-button 8–11  ·  pill/avatar 999
gap:     thread bubbles 14   ·  list rows 8   ·  task cards 9
padding: screen gutter 16–18  ·  card 11–16
shadow:  card        0 1px 2px rgba(40,30,20,.03)
         primary CTA 0 6px 16px rgba(187,106,57,.28)   (brown)
         quiz send   0 6px 16px rgba(27,142,132,.28)   (teal)
         hero mic    0 8px 20px rgba(187,106,57,.32)
border:  1px solid line (or READ_LINE on reading surfaces, #BFE0CE on done surfaces)
```

### Icons — monoline, NO emoji
All icons are inline SVG, 24×24 viewBox, `fill:none`, `stroke:currentColor`, round caps/joins,
stroke-width ~1.7–2.0. Defined in `kit.jsx` → `ICONS`, rendered via `<Icon n="…" s=size c=color sw=width/>`.
Keys used in Reading: `book, masks` (library/section), `rules` (= quiz/вопросы), `mic` (= recite/наизусть),
`sound` (speak one line), `play` (listen-all / start), `eye`/`eyeOff` (translate), `trophy` (mastered),
`check` (done), `arrow` (go), `back, pause, stop, skip, refresh, lock, home, chart, grid`.
Old emoji → new icon: 🎭→`masks`, 📖→`book`, 🎤→`mic`, 🔊→`sound`, 🌐→removed, 👁→`eye`, 🙈→`eyeOff`,
🏆→`trophy`, ❓→`rules`, ⏸→`pause`, ⏹→`stop`, ⏭→`skip`, 🎉→`trophy`+green check, 🔒→`lock`.

---

## Screens / Views
All screens sit in a 390×844 frame: `StatusBar` (44px) · body · `BottomNav` (footer, ~74px, active
tab = "Главная" in `gSent`). Components are in `reading.jsx`.

### 1. Library — `LibR({ kind: 'dialog' | 'text' })`
- **Purpose:** browse texts/dialogs, gated by level; see what's mastered vs in-progress.
- **Layout:** back pill ("← Главная") · header row [44px brown-soft icon tile + title + right-aligned
  `N/total · ПРОЧИТАНО` counter] · **mastery legend** card ("Прочитано = 📋вопросы + 🎤наизусть") ·
  scrolling list **grouped by level** ("УРОВЕНЬ N" divider + rows).
- **Row** (card, radius 16, 11×13 padding): avatar circle (first letter, colour = state tone) +
  title (+ a sub-line for `progress` state: "вопросы ✓ · осталось наизусть" / "наизусть ✓ · остались
  вопросы") + right **MasteryMark**:
  - `mastered` → brown pill `🏆 Прочитано` (READ_SOFT bg, READ_LINE border)
  - `progress` → two dots (one filled READ, one hollow)
  - `new` → `arrow` (READ)
  - `locked` → `lock` (faint), whole row at opacity .5, not tappable
- Avatar tone: mastered=READ, progress=gWords, else faint.

### 2. Reader (hub) — `ReaderR({ data, done })`
The richest screen. `done = { quiz: boolean, recite: string[] }` (recite = array of role names done).
- **Header** (`ChatHead`): back (icon-only pill) + title (+ `trophy` when mastered) + sub
  ("Уровень 4 · диалог", or "Прочитано · освоено") + two icon buttons: `eye` (translate-all toggle),
  `play` (listen-all).
- **Thread** (bg `cream`, scrolls): centered hint "Нажмите на сообщение, чтобы перевести", then one
  **Bubble** per line.
  - **Bubble:** avatar + (dialog: speaker name label in speaker colour) + rounded message. Dialog
    speakers **alternate sides** — Pekka left (neutral white bubble), Liisa right (READ_SOFT bubble,
    tail bottom-right). Monologue = all left, narrator avatar "М". FI text + small `sound` button;
    tapping the bubble reveals the RU translation as a sub-line (separated by a hairline). **This is
    the single translation mechanism** — no per-word gloss, no separate 🌐 button. The header `eye`
    reveals all at once.
- **Footer = "Путь к «Прочитано»" (path to mastery):**
  - In progress: label "Путь к «Прочитано»" + 2-segment progress + `steps/2`. Two **TaskCard**s side
    by side:
    - **Вопросы** — icon `rules` (gSent). Todo sub "Ответить · 2 вопроса"; done → green theme +
      check badge + "Пройдено".
    - **Наизусть** — icon `mic` (gWords). Sub "За все роли · {doneRoles}/{totalRoles}" (dialog) or
      "Рассказать" (mono); done → green + "Все роли".
  - When both parts done (mastered): footer becomes a **green banner** — round green trophy +
    "Прочитано / оба шага пройдены — диалог освоен" + ghost "↻ Повторить".
- TaskCard: soft card (READ_SOFT / green-soft when done), top row = 32px white icon tile + status
  (arrow, or green check disc when done), then label 14.5/800 + sub.

### 3. Quiz — `QuizR()`
- **Purpose:** the graded "вопросы" part.
- **Header:** "Вопросы" + "Который час? · 1 из 2" + segmented progress dots (filled = gSent).
- **Thread:** teacher avatar "?" (gSent) bubble with the FI question (21/800) + `sound` button; under
  it a quiet "👁 перевод вопроса" link. Centered hint "Ответьте по-фински — напечатайте или скажите".
- **Composer** (docked): rounded input ("Kello on…") + circular `mic` button (READ outline) +
  circular **send** button (gSent fill, white `arrow`). Voice and typing both fill the same field.

### 4. Quiz complete — `QuizDoneR()`
- Centered green check disc (76px, green-soft bg) + "Вопросы пройдены" + "Правильно 2 из 2 · отлично".
- **Mastery card:** "Путь к «Прочитано» · 1/2" with two rows — "Ответы на вопросы / Готово" (green
  check disc) and "Наизусть — за все роли / осталось рассказать" (brown mic disc).
- **CTA:** brown primary "🎤 Рассказать наизусть" (whiteSpace nowrap) + ghost "Позже".

### 5. Recite — role picker — `RolesR({ data, recited })`
- **Purpose:** the "наизусть за все роли" entry. `recited` = array of completed role names.
- Header tile (brown-soft mic) + "Наизусть" + "за все роли" (or "расскажите текст по памяти" for mono).
- Explainer line, then one **role row** per `data.roles`: avatar (role colour, or green when done) +
  "Роль · Pekka" + sub (`N реплик` properly pluralised, or "рассказано") + trailing **play disc**
  (brown) or **green check disc** when done.
- Footer note (dialog only, READ_SOFT box): "«Наизусть» зачтётся, когда пройдёте **все роли**."

### 6. Recite — line — `ReciteR()`
- Header "Наизусть · роль Pekka" + "Реплика 1 из 3" + `pause` button.
- Thread anchored to bottom: incoming cue bubble ("ВАША РЕПЛИКА / «Извините, который час?»") from
  narrator "М"; your-turn bubble (right, READ_SOFT, **dashed** READ_LINE border) showing a small
  5-bar waveform + "Слушаю…".
- **Controls** (docked): ghost "👁 Показать" · 72px brown hero **mic** button · ghost "⏭ Пропустить".
  These three replace the original's cluttered show/accept/skip chip row.

### 7. Mastered — `MasteredR({ data })`
- Hero: concentric READ_SOFT rings + 66px brown disc with `trophy`.
- "Прочитано!" (28/800) + "«{title}» освоен — оба шага пройдены."
- **Two-part summary card** — both rows green-checked: "Ответы на вопросы / 2 из 2 верно" and
  "Наизусть — все роли / Pekka · Liisa" (trailing faint `rules`/`mic` glyphs).
- CTA: brown "К списку диалогов" + ghost "↻ Повторить позже".

---

## Interactions & Behavior
- **Translate (one mechanism):** tap a thread bubble → toggles its RU sub-line; header `eye` toggles
  all. Drop the legacy three-layer system (global toggle + per-line 🌐 + per-word gloss).
- **Listen:** `sound` on a bubble speaks that line; header `play` speaks all (`useSpeechSynthesis`).
- **Quiz:** grade locally (existing `gradeQuestion`); typed or spoken (`useSpeechRecognition`) into
  one field. `allCorrect` (first-try) → records the `reading` result + sets `quiz: true`.
- **Recite:** partner lines TTS-auto-advance; your lines listen for a lenient spoken match, with
  show/skip escapes. Finishing a role adds it to `recite[]`; when `recite.length === roles.length`,
  the recite part is satisfied.
- **Mastery transition:** when `quiz && reciteAllRoles` flips true, show `MasteredR`; the library row
  and reader header update to `Прочитано`.
- **Gating:** rows above the learner's level are `locked` (opacity .5, non-interactive).
- **Nav:** back affordances return one level up (library → home, reader → library, sub-screens →
  reader). Active bottom-nav tab stays "Главная" (reading is opened from the home grid, not the nav).
- **Motion:** keep subtle. Suggested: bubble RU reveal = height/opacity 160ms ease; mic "Слушаю…"
  waveform = gentle loop while listening only; mastered hero = one-shot pop. Respect
  `prefers-reduced-motion`.

## State Management
- Per text/dialog: `{ quiz: bool, recite: string[] }` (which roles recited). Derive
  `reciteDone = recite.length === roles.length`, `mastered = quiz && reciteDone`,
  `steps = (quiz?1:0) + (reciteDone?1:0)`.
- Reader UI state: `translateAll` (bool), `openLine` (which bubble's RU is shown), `speakingAll`.
- Quiz: current index, score, input value, mic listening flag, graded/feedback.
- Recite: current role, line index, listening flag, recognized text.
- Per brief, the `read`/lesson counters + mastery live in app state (was `App.tsx`), reading screens
  are presentation over a `ReadingText` (`core/reading.ts`). Mastery now needs an explicit
  `recitedRoles` set persisted per text id (new), alongside the existing graded-quiz signal.

## Assets
- **Fonts:** Golos Text via Google Fonts.
- **Icons:** all inline monoline SVG in `kit.jsx` (`ICONS`) — copy the paths or map to the codebase's
  own icon set at the same visual weight. **No external icon assets, no emoji.**
- **Images:** none.

## Files (in this bundle)
- `Чтение — Направление B.html` — runnable prototype: design-canvas with the library + the full
  8-step mastery flow. Open in a browser to interact.
- `kit.jsx` — palette (`RC`), reading accent tokens, `ICONS` + `<Icon>`, device chrome
  (`StatusBar`, `BottomNav`, `Frame`, `BackBtn`, `LevelChip`).
- `data.jsx` — content (library lists with `{quiz,recite}`, reader texts, quiz, play) + `masteryState`.
- `reading.jsx` — all screen components: `LibR, ReaderR, QuizR, QuizDoneR, RolesR, ReciteR, MasteredR`
  (plus `Bubble`, `TaskCard`, `MasteryMark`, `ChatHead`, `plReplika`).
- `design-canvas.jsx` — presentation wrapper only (pan/zoom board); **not** part of the product UI.

### Source-of-truth mapping (live app)
`Reading.tsx` → `LibR` · `TextReader.tsx` → `ReaderR` · `ReadingQuiz.tsx` → `QuizR`/`QuizDoneR` ·
`DialogPlay.tsx` → `RolesR`/`ReciteR` · new `MasteredR` completion. Full element-by-element map of
the original is in `uploads/reading-redesign-brief.md`.
