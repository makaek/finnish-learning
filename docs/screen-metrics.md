# Screen: «Метрики» (Dashboard)

**File:** `src/ui/Dashboard.tsx` (logic in `src/core/dashboard.ts` → `computeDashboard`) · **Nav:** bottom tab «Метрики».

**What it is:** the aggregate **snapshot** dashboard — KPI cards + charts summarising the whole corpus and the learner's state right now. Pure presentation over `computeDashboard(vocab, sentences, progress, daily, today, now, testMode, texts)`. **No time-series** (the app keeps no per-day history); every number is "as of now". (The per-item drill-down lives on each level page in «Уровни»; this is the rolled-up view.)

## Sections & logic

### KPI grid (8 cards)
| Card | Value | Logic |
|---|---|---|
| ✦ **Слов выучено** | `wordsLearned/wordsTotal` (+ %) | a word is "learned" once box ≥ `LEARNED_BOX` in **any** word mode (`wordLearned`). |
| 💬 **Фраз освоено** | `sentencesLearned/total` (+ N доступно) | learned = ≥`LEARNED_BOX` in any sentence mode; «доступно» = sentences whose words are known enough to attempt (`eligibleSentences`). |
| 🏆 **Уровень** | `level/levelsTotal` | the **balance-gated** current level (`masteringLevelGated`) — the lowest level not yet sufficiently complete *and* balanced across modes. |
| 🥇 **Полностью освоено** | count | words+sentences mastered in **every** mode (the strict bar). |
| 🔥 **Серия дней** | `streak` (+ record) | consecutive qualifying days (`currentStreak`). |
| 🎯 **Точность** | `%` (+ N/M) | lifetime `totalCorrect / totalReps`. |
| 🔁 **Всего ответов** | `totalReps` | lifetime answers across all modes. |
| 📖 **Тексты пройдено** | `textsDone/textsTotal` | a text counts when **`readingMastered`** = quiz passed **and** recited in every role (the two-part «Прочитано»). |

### Сегодня
Two `RingGauge`s from the daily state: **lessons today / goal** (green when met) and **today's accuracy**. Note line shows either «Дневная цель выполнена 🎉» or today's answered/correct counts. The only "today-scoped" block on the screen.

### Уровень владения (CEFR)
The standards-aligned milestone view (`core/curriculum.ts`).
- **Intro line:** current major band + sub-stage + next, e.g. «Сейчас осваиваете A1 (этап A1.2) · далее A1.3».
- **`CefrBar`:** smooth progress toward the current milestone band; `fraction` = mean per-level completion across that band's levels (a level reads 100% at the advancement threshold).
- **Band breakdown:** the four bands **A1.1 / A1.2 / A1.3 / A2** (levels 1-3 / 4-6 / 7-9 / 10-12, linguist-assigned), each listing its levels chipped as **done ✓** (`learned/total ≥ LEVEL_COMPLETE_FRACTION`), **current** (= the gated level), or upcoming. "A1 complete" = levels 1-9 done.

### Прогресс по уровням
`BarList`, one bar per level: **value = `fraction`** = mean per-item mastery over the level's combined content (words → `wordMastery`, sentences → `sentenceMastery`, texts → `readingMastery`); caption `% · learned/total`; tone accent if the level is unlocked, else muted. This is the *display* metric (rises with depth), distinct from the unlock metric.

### Баланс режимов
`BarList` of `mastered/total` per exercise mode — word modes (узнавание/написание/🎤/🎧, accent), sentence modes (перевод/🎤/🎧, known), and a single Чтение bar (ok). Surfaces whether the modes are practised **evenly** (the same signal the home balance-ring gates on).

### Коробки Лейтнера
`StackedColumns`, one column per SRS box **0–5**, each stacked by content type {words, sentences, reading}. Shows the **mastery distribution** — how much sits in "new" (0) vs "mastered" (5). Hover caption gives exact counts.

### Точность по режимам *(only if any reps)*
`BarList` of accuracy per mode; tone by threshold (≥80% ok / ≥50% yellow / else no). Quality counterpart to «Баланс режимов» (which is volume).

### Словарь по частям речи
`BarList` of `learned/total` per part of speech (`POS_LABEL`: Существительные, Глаголы, Прилагательные, Наречия, Послелоги, Числа …). Vocabulary coverage by grammatical category.

### Свежесть практики
`Donut` over recency buckets (today / week / month / older) — **when** items were last touched, i.e. how much is fresh vs going stale. Center shows the total tracks seen.
