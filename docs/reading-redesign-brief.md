# Reading (Тексты / Диалоги) — Redesign Brief

A complete element-by-element map of every screen a learner passes through when doing a
**reading lesson** (monologue text *or* dialog). Use this as the source of truth for the
redesign: each element below lists what it is, where it lives in code, its current look/behavior,
and what data drives it — so a new design can be specced against real, existing pieces rather than
guesses.

## The flow at a glance

```
Home (Roadmap)
  └─ "Чтение" cards: Тексты 📖  /  Диалоги 🎭        → opens Reading with filterType
        └─ Reading.tsx      ……… the LIBRARY (level-sorted list, gated by level)
              └─ TextReader.tsx   ……… the READER (the hub: read + listen + branch out)
                    ├─ ReadingQuiz.tsx  … comprehension Q&A (the graded part)
                    └─ DialogPlay.tsx   … role-play / recite by memory (voice, not graded)
```

Four screens, one entry point. Only **ReadingQuiz** feeds level completion (graded `reading`
track); everything else contributes the device-local "read"/"lesson done" signals.

State ownership: the `read` set and lesson counters live in **App.tsx**; the reading library is
opened from the home grid (`onOpenReading(type)` sets `readingFilter` + `homeScreen="reading"`),
not from the footer nav. Each screen is pure presentation over a `ReadingText` (`core/reading.ts`);
all TTS via `useSpeechSynthesis`, all voice input via `useSpeechRecognition`.

---

## 0. Entry point — home "Чтение" cards
**File:** `src/ui/Roadmap.tsx` → `onOpenReading("text" | "dialog")` (App.tsx:478)

- Two cards on the home roadmap: **Тексты** (📖) and **Диалоги** (🎭).
- Tapping sets the filter and switches the home screen to the reading library.
- *Redesign note:* these are the only doors into reading — their labels/icons set the expectation
  for the library header that follows (which mirrors them: `📖 Тексты` / `🎭 Диалоги`).

---

## 1. Reading.tsx — the LIBRARY
A level-sorted list of texts/dialogs. Browsing + difficulty-gating only.

| Element | Class / code | What it is & behavior |
|---|---|---|
| **Back button** | `.exit` — `← Главная` | Returns to the home roadmap (`onBack`). |
| **Title** | `.prompt.prompt--home` | `🎭 Диалоги` / `📖 Тексты` / `📚 Чтение` depending on `filterType`. |
| **Subhead hint** | `.hint` | "От простого к сложному — открываются по мере роста уровня." |
| **List** | `<ul class="reading">` | One `<li>` per text, filtered by type, in seed order. |
| **Row** | `.readrow` (`+ .readrow--locked`) | A whole-row button. Disabled when the text's level is above the learner's `currentLevel` (unless `testMode`). Opens TextReader on click (`setOpenId`). |
| ↳ Level chip | `.readrow__lv` | `Ур. {level}`. |
| ↳ Title | `.readrow__title` | The text title. |
| ↳ Badges | `.readrow__badges` | 🏆 `.readrow__mastered` when **done**; else ✓ `.readrow__done` if merely read; 🎭 for dialogs; 🔒 when locked. |
| **Empty / progress hints** | `.hint` | "Здесь пока пусто." and "Новые тексты открываются по мере роста уровня." |

**"Done" logic (important for the badge design):**
- Texts **with questions** → done = comprehension quiz passed (`readingLearned`, counts to level).
- Texts **without questions** → done = present in the `read` set (the only completion signal).
- So 🏆 (mastered) and ✓ (just read) are two *different* states — the redesign should keep them
  visually distinct.

**Gating:** `isTextUnlocked(t, currentLevel)`; `currentLevel` from `levelStats` + `activeLevel`.
`testMode` unlocks everything.

---

## 2. TextReader.tsx — the READER (hub)
Reads one text/dialog and branches to the quiz or role-play. The richest screen.

| Element | Class / code | What it is & behavior |
|---|---|---|
| **Back button** | `.exit` — `← Назад` | Back to the library (`onBack`). |
| **Title** | `.prompt.prompt--home` | `text.title`. |
| **Toolbar** | `.textreader__bar` | Holds the two global toggles below. |
| ↳ Translation toggle | `.chip`, `aria-pressed` | `🙈 Скрыть перевод` / `👁 Показать перевод` — flips `showRu` (global RU on/off). Starts **on**. |
| ↳ Play-all TTS | `.chip` (`+ .chip--on` while speaking) | `▶ Прослушать всё` / `⏹ Остановить` — speaks every line via `tts.speakMany`. Only if `tts.supported`. |
| **Usage hint** | `.hint.hint--quiet` | "Нажмите на слово — перевод; 🌐 — перевод строки." |
| **Lines list** | `<ul class="lines">` | One `.line` per `text.lines[i]`. |
| ↳ Speaker label | `.line__who` | Shown only when `line.speaker` set (dialogs). |
| ↳ Finnish line | `.line__fi` `lang="fi"` | Tokenized via `tokenizeLine`. Tokens **with a gloss** render as `.word` buttons (tap → toggles that gloss); plain tokens are inert text. Only one gloss open at a time (`openGloss`). |
| ↳ Word gloss | `.line__gloss` `lang="ru"` | The Russian gloss for the tapped word, shown inline under its line. |
| ↳ Line translation | `.line__ru` `lang="ru"` | The full Russian line — visible when global `showRu` **or** this line individually toggled (`lineRu`). |
| ↳ Translate-line button | `.line__play` — 🌐 | Toggles that one line's RU (`toggleLineRu`). |
| ↳ Speak-line button | `.line__play` — 🔊 | Speaks just this line (`tts.speak`). Only if `tts.supported`. |
| **Actions** | `.textreader__actions` | The branch buttons (below). |
| ↳ Quiz | `.next` — `❓ Ответить на вопросы` | Opens ReadingQuiz. **Only rendered if the text has questions.** |
| ↳ Recite / role-play | `.next` or `.option` — `🎭 Разыграть диалог` / `🎙 Рассказать наизусть` | Opens DialogPlay. Label depends on `isDialog` (dialog with ≥2 roles vs monologue). Styled `.next` when there's no quiz, else `.option`. |
| ↳ Mark read | `.option` — `Отметить прочитанным` / `✓ Прочитано` | Calls `onMarkRead`; disabled once `isRead`. |

**Two parallel "reveal RU" mechanisms** (global `showRu` + per-line `lineRu`) plus an inline word
gloss — three layers of translation. A redesign should decide whether all three stay or collapse.

**Primary-action ambiguity:** the visual primary (`.next`) is the quiz when questions exist,
otherwise the recite button. Worth rationalizing in the new design (one clear "continue").

---

## 3. ReadingQuiz.tsx — comprehension Q&A (the graded step)
Steps through `text.questions`. This is the part that counts toward level completion.

**Wrapper** (`ReadingQuiz`):
| Element | Class / code | Behavior |
|---|---|---|
| Back | `.exit` — `← Выйти` | `onExit` back to TextReader. |
| Card holder | renders one `QuestionCard` keyed by `idx` | Advances on answer; tracks `score`. |
| **Done screen** | `.card.card--summary` | `🎉 Готово!` + "Правильных ответов: {score} из {n}". Buttons: `Готово` (`.next`, → `onComplete(score===n)`) and `Ещё раз` (`.option`, restart). |

**QuestionCard** (one question):
| Element | Class / code | Behavior |
|---|---|---|
| Progress | `.progress` | "Вопрос {n} из {total}". |
| Question | `.prompt` `lang="fi"` | The Finnish question `question.q` + 🔊 speak button (`.line__play`). |
| Translate question | `.chip` — `👁 Перевод вопроса` | Reveals `question.qRu` (`.hint`); replaced by the RU text once shown. |
| Instruction | `.hint` | "Ответьте по-фински — напечатайте или скажите:". |
| Answer form | `.produce` | Textarea + mic + submit. |
| ↳ Input | `.produce__input.produce__input--area` (textarea, 2 rows, no autocorrect) | Typed answer; disabled once answered. |
| ↳ Mic | `.mic` (`+ .mic--on`) | `🎤 Сказать` / `● Слушаю…` / `🎤 Сказать заново` — voice fills the (still editable) field. Both typing & voice available. |
| ↳ Submit | `.next` — `Проверить` | Grades via `grade(...)`; disabled while grading or empty. |
| **Feedback** | `.feedback` | Appears after grading. |
| ↳ Error lines | `.feedback__text` (`--ok` / `--known` / `--near`) | Russian explanations from `result.errors`. |
| ↳ Praise / answer | `.feedback__text--ok` or `.hint` + `<strong lang="fi">` | On correct: praise. On wrong: "Правильный ответ: …" + 🔊. |
| **Correction gate** | shown when wrong (`mustCorrect`) | Must re-enter the correct answer to advance (mirrors SentenceCard). |
| ↳ Correction input | `.produce__input--area` | Checked live against the grader (`checkCorrection`). |
| ↳ Correction mic | `.mic` | Voice for the correction. |
| ↳ Force-correct | `.markok` — `✓ Засчитать верным` | Override when voice mishears (`forceCorrect`) — marks the attempt correct. |
| **Next** | `.next` — `Дальше` | Advances; disabled until `canAdvance` (correct or unlocked). |

**Grading:** local, via `gradeQuestion` from `data/texts.ts` (the shared sentence grader). No LLM.
`allCorrect` = every question right on the **first** attempt → passed to `onComplete`, which records
the `reading` result + marks read + counts a lesson.

---

## 4. DialogPlay.tsx — role-play / recite by memory (voice)
Rehearse a text aloud, hands-free. Works for dialogs (pick a role) and monologues (recite all).
**Never graded** — it just counts a lesson + marks read on completion.

**Three sub-screens.**

### 4a. Start screen (role picker)
| Element | Class / code | Behavior |
|---|---|---|
| Back | `.exit` — `← Назад` | `onExit`. |
| Title | `.prompt` — `🎭 {title}` | — |
| Hint | `.hint` | Explains voice-gated (mic) vs timer mode, depending on `recogSupported`. |
| Role picker | `.rolepick` | Monologue → one `▶ Начать` (`.next`). Dialog → one `.next` button per role from `rolesOf(text)`. |

### 4b. Play step (per line)
| Element | Class / code | Behavior |
|---|---|---|
| Back | `.exit` — `← Выйти` | `onExit`. |
| Card | `.card`, `aria-live="polite"` | — |
| Progress | `.progress` | "Реплика {i+1} из {n}" (+ "· роль: {role}" for dialogs). |
| Turn block | `.turn` (`+ .turn--mine` on your line) | — |
| ↳ Who | `.line__who` | Speaker name (or "Вы" for monologue). |
| **Your line** (`mine`) | | |
| ↳ Prompt | `.hint` `lang="ru"` | "Ваша реплика: «{ru}»". |
| ↳ Revealed FI | `.turn__fi` `lang="fi"` | The Finnish, shown only after you say it / reveal / time out. |
| ↳ Listening status | `.hint` | "🎤 Слушаю…" / "🎤 Скажите свою реплику по памяти" / "🤔 Вспоминайте реплику…" (no-mic). |
| ↳ Heard | `.hint` `lang="fi"` | "Распознано: {heard}" while not yet matched. |
| ↳ Voice controls | `.textreader__bar` | `👁 Показать`, `✓ Засчитать`, `⏭ Пропустить` (each `.chip`) — manual overrides for the voice gate. |
| **Partner line** (not `mine`) | | `.turn__fi` (FI) + `.hint` (RU); auto-spoken then auto-advances. |
| Transport | `.rolepick` | `⏸ Пауза`/`▶ Продолжить` (`.next`) + `⏹ Стоп` (`.option`, resets to picker). |

**Mechanic:** partner lines are spoken by TTS and auto-advance; your lines **listen** (mic) and
require a lenient spoken match (`spokenMatches`) to advance — with manual show/accept/skip escapes.
No mic → falls back to a recall timer then reveal. Pacing constants: `GAP_MS`, `recallMs`, `readMs`.

### 4c. Completion screen
| Element | Class / code | Behavior |
|---|---|---|
| Card | `.card.card--summary` | `🎉 Готово!` + "Вы рассказали текст." / "Вы прошли диалог в роли «{role}»." |
| Buttons | `.rolepick` | `Готово` (`.next`, → `onComplete`), `Ещё раз` (`.option`, replay), `В начало`/`Сменить роль` (`.option`, reset). |

---

## Shared building blocks (consistency targets for the redesign)
These classes recur across all four screens — keep them coherent:
- **`.exit`** — top-left back affordance (label varies: Главная / Назад / Выйти).
- **`.card` / `.card--summary`** — the page container; `--summary` is the centered "done" variant.
- **`.prompt` / `.prompt--home`** — page/question title.
- **`.hint` / `.hint--quiet`** — secondary text.
- **`.chip` / `.chip--on`** — toggle pills (toolbar, voice overrides).
- **`.next` (primary) / `.option` (secondary)** — action buttons.
- **`.line__play`** — the small inline icon buttons (🌐 / 🔊).
- **`.mic` / `.mic--on`**, **`.markok`** — voice input + force-correct.
- **`.rolepick`**, **`.progress`**, **`.turn` / `.turn--mine` / `.turn__fi`** — DialogPlay-specific.
- **`.readrow` family** — library rows.

## Open questions worth resolving in the redesign
1. **Three translation layers** in TextReader (global toggle / per-line / word gloss) — keep all?
2. **Primary-action ambiguity** in TextReader (quiz vs recite vs mark-read).
3. **🏆 vs ✓ vs 🔒** badges in the library — distinct enough? Consistent with the home ring's
   colour language (green=done / yellow / red)?
4. **Voice-gate escapes** in DialogPlay (show / accept / skip) — discoverable, or clutter?
5. Mobile layout of the per-line row (FI text + 🌐 + 🔊 + tappable words) at narrow widths.
