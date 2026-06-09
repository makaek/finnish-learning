# Handoff: «Прогресс» + «Метрики» + «Уровни» redesign (Finnish learning app)

## Overview
A redesign of the learner-facing progress surfaces in a Finnish-language learning app (Russian-language UI). It rebalances two existing tabs and adds a brand-new screen:

1. **Метрики (Metrics / Dashboard)** — an at-a-glance "where am I and what should I do" overview.
2. **Прогресс (My progress)** — the per-item drill-down list (words / sentences / texts), kept but cleaned up.
3. **Уровни (Levels)** — NEW. A curriculum journey of all 12 levels; review any passed level, see what's locked ahead, and manually mark the current level as passed.

The redesign answers three questions on the dashboard: *how far through the curriculum am I (level + CEFR)*, *what should I practise next (weakest mode)*, and *how much of the vocabulary do I actually know (coverage)*.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (the original screens live in `src/ui/Dashboard.tsx`, `src/ui/ProgressDetails.tsx`, `src/ui/Roadmap.tsx`, with logic in `src/core/`). Use the app's established component patterns, state management, and data sources. Treat the JSX here as a spec for layout/markup, not as importable components.

All numbers, Finnish vocabulary, and level names in the prototype are **realistic sample data** for illustration — wire the real values from the app's stores.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, iconography, and interactions are specified. Recreate pixel-faithfully using the codebase's existing UI primitives. The visual language is lifted directly from the app's home-screen system (the "Кольцо баланса" ring + monoline icon set) so these screens read as the same app — reuse those existing tokens/components rather than reintroducing the values below verbatim where the app already defines them.

---

## Design Tokens

### Colors (palette `RC`, from the home-screen system)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#23262E` | primary text |
| `sub` | `#71757F` | secondary text |
| `faint` | `#AAB1BC` | tertiary text / muted |
| `card` | `#FFFFFF` | card surfaces |
| `line` | `#E7E3DB` | borders |
| `track` | `#EEEAE2` | progress-bar tracks, locked fills |
| `wash` | `#F4F1EB` | subtle fills / footer rows |
| `cream` | `#F0EDE6` | — |
| `creamDeep` | `#E9E4D9` | — |
| `green` | `#3B9C6E` | success / high accuracy |
| `amber` | `#CF9A4E` | mid accuracy |
| `red` | `#CE6A57` | low accuracy / weak link |
| `redDeep` | `#B9543F` | weak-link emphasis text/button |
| `blue` | `#3B68C9` | — |
| **`gWords`** | `#5B53C6` | **Words group accent (purple)** |
| **`gSent`** | `#1B8E84` | **Sentences group accent (teal). Also primary progress accent `TEAL`.** |
| **`gRead`** | `#BB6A39` | **Reading group accent (brown). Aliased `READ`.** |

Page background outside the phone: `#EDEAE3`.

### Accent aliases used in the new screens
- `TEAL = gSent = #1B8E84` — primary progress accent (done levels, coverage "what I know").
- `GOLD = #C8902B`, `GOLD_SOFT = #F6EEDC` — achievement accent (current level badge, mark-passed flow).
- Group hues map: `{ w: #5B53C6 (Слова), s: #1B8E84 (Предложения), r: #BB6A39 (Чтение) }`.
- Reading tints: `READ_SOFT = #F4EBE1`, `READ_LINE = #E8DAC9`.

### Typography
- Font family: **Golos Text** (`"Golos Text", system-ui, sans-serif`), weights 400–800.
- Screen H1 (titles "Метрики", "Мой прогресс", "Уровни"): 27px / 800 / letter-spacing −0.03em.
- Section labels (uppercase eyebrows): 12px / 800 / letter-spacing 0.07em / uppercase / color `sub`. (Keep on one line — `white-space: nowrap`.)
- Card titles: 15–22px / 800 / letter-spacing −0.01 to −0.02em.
- Body / item rows: 13–15px / 600–800.
- Micro labels & legends: 10.5–12px / 700.

### Spacing / radii / shadows
- Cards: `border-radius` 14–18px, `1px solid line`, shadow `0 1px 2px rgba(40,30,20,0.04)`.
- Current-level (gold) card: shadow `0 2px 10px rgba(160,120,30,0.10)`.
- Bottom-sheet dialog: `border-radius: 24px 24px 0 0`, scrim `rgba(30,24,18,0.42)` + `backdrop-filter: blur(1.5px)`.
- Pills / chips: `border-radius` 6–11px; full-round elements `999px`.
- Progress bars: height 6–8px, round caps, animate `width .4s cubic-bezier(.2,.7,.3,1)`.
- Ring gauges: `stroke .5s cubic-bezier(.2,.7,.3,1)`.
- Phone artboard: 390 × 844 (iPhone-class), inner scroll region padded `4px 16px 20px`.

### Iconography
Monoline SVG set (1.7–2.8 stroke, `currentColor`), shared with the home screen. Icons used here: `eye, pen, mic, phones` (word/sentence modes), `chat` (translate), `book, masks` (text vs dialog), `rules` (quiz), `star` (words), `lock, check, chevR, chevD, refresh, search, sort, flame, target, bolt, info, question`. Reuse the app's existing icon components; do not hand-redraw.

---

## Screens / Views

### 1. Метрики (Dashboard) — `metrics.jsx` → `MetricsScreen`
Vertically scrolling. Top to bottom:

**a. Hero card (curriculum position).**
- Left: 60×60 rounded-18 `GOLD_SOFT` tile with the current level number (26px/800 GOLD) over the word "УРОВЕНЬ" (8.5px).
- Right: small label "Текущая ступень", then the CEFR stage large in TEAL (23px/800, e.g. "A1.2") beside "уровень A1".
  - NOTE: the topic/level name and any "далее A1.3" next-stage text were intentionally **removed** — show only the current stage + the bar.
- Below: a **12-segment level rail** (`LevelRail`) — one segment per level; done & current segments TEAL, current segment partially filled to its completion fraction with a ring halo, locked segments `track`. Under it, four band ticks: A1.1 · A1.2 · A1.3 · A2.
- Footer row (button): "Все уровни · пройденные и впереди" + chevron → navigates to the **Уровни** screen.

**b. «Сегодня» card.** Two ring gauges (`RingGauge`, 88px): lessons-vs-goal (turns `green` when goal met, else TEAL) and today's accuracy %. Caption "· N из M верно".

**c. «Что я знаю» (coverage) card.** Three labelled bars — Слова (purple, e.g. 98/240), Фразы (teal, with note "ещё N доступно для тренировки"), Тексты и диалоги (brown). Each: icon + label + `learned/total` + bar + optional note.

**d. Two stat tiles.** Серия дней (flame, "рекорд N") and Точность (target, "N из M").

**e. «Что подтянуть» (practice) card.**
- Coral weak-link banner (`#FBF0EC`): icon tile + "СЛАБЕЕ ВСЕГО" eyebrow + weakest mode name + a `redDeep` "Тренировать" button.
- Per-mode rows grouped by Слова / Предложения / Чтение (each group has a colored dot + label). Each row: mode icon + label + mastery bar (the single weakest mode is drawn in `red`) + accuracy % colored by threshold (≥80 green, ≥50 amber, else red). Legend: "полоса — освоено · % — точность".

**Dropped metrics** (per product decision, do not reintroduce): "Полностью освоено", "Всего ответов", Leitner-box columns, parts-of-speech breakdown, recency/freshness donut.

### 2. Прогресс (My progress) — `progress.jsx` → `ProgressScreen`
Per-item drill-down, cleaned up. **Kept as-is in this round** aside from earlier cleanup.
- H1 "Мой прогресс".
- Collapsible **legend** card ("Что значат метрики") explaining Leitner pips, the mastery tick, and 🔥/% .
- **Search** field (icon + input, placeholder "Поиск слова или предложения").
- **Sort chip** "↕ По уровню" (toggles level-sort; active = teal filled).
- Three collapsible sections: **Слова**, **Предложения**, **Тексты и диалоги**, each showing a count and item cards.
  - Word card: optional green mastery tick, `fi` bold + `— ru`, level pill, then per-track rows (mode icon, label, Leitner pips `Pips`, 🔥streak, accuracy% + ok/seen).
  - Sentence card: `ru` bold + `fi` sub (this screen leads with Russian — see "Open item" below), level pill, track rows.
  - Text card: book/masks icon, title, level pill; either a quiz track row, "Прочитано (без вопросов)", or "Ещё не пройдено".
- Empty state when search matches nothing.
- The hide-mastered (🙈) feature was **removed**; search + sort retained.

### 3. Уровни (Levels) — NEW — `levels.jsx` → `LevelsScreen`
Three states via the `view` prop: `list` (default), `detail`, `confirm`.

**List view.**
- BackBtn "Метрики", H1 "Уровни", subtitle "Пройдено N из 12. Откройте любой пройденный уровень для повторения."
- Levels grouped into 4 CEFR bands (A1.1 «Основы», A1.2 «Повседневность», A1.3 «Город и быт», A2 «Уверенный старт»), each with a band header (band chip + Russian name; green check when fully done).
- Each level is a timeline row (`LevelRow`) with a left rail node + connector:
  - **Done**: TEAL node with white check; card tappable → detail; shows "Пройден" + chevron.
  - **Current** (level 5): white node with GOLD ring + halo and the level number; card highlighted (white, gold-soft border, soft gold shadow); shows "Сейчас здесь", a GOLD completion bar ("N% освоено" / "осталось ~K элем."), and two buttons: **Продолжить** (gold filled) and **Отметить пройденным** (outline → opens confirm).
  - **Locked**: greyed (opacity 0.6), lock node, no border, not tappable.
  - Title is **Finnish-first**: `fi` large + `ru` translation smaller beside it. Eyebrow "УР. N" + band chip. Counts row = words/sentences/texts with group-colored icons.

**Detail view (review a passed level)** — `DetailView`.
- BackBtn "Уровни". Header: TEAL check disc + **Finnish name large** + band chip, sub "{ru} · уровень N · пройден".
- "Содержание уровня": three tiles (слов / фраз / текст(а)).
- **Слова** section: list of `ItemRow`s (green tick + `fi` bold + `ru` sub). Shows first 5, then a **"Показать ещё N слов"** button that expands the full list (toggles to "Свернуть"). This is the requested click-to-expand full list.
- **Предложения** section: every sentence as an `ItemRow`, **Finnish first** + Russian below.
- **Тексты и диалоги** section: every text/dialog **title**, Finnish-first, with book icon (or masks icon for dialogs).
- Footer button "Повторить уровень" (refresh icon).

**Confirm dialog** — `ConfirmDialog`, overlaid on the list as a bottom sheet.
- Grabber, GOLD_SOFT bolt tile, title **"Перейти дальше?"**.
- Body: "Уровень N «{fi}» ({ru}) будет отмечен пройденным. Все его слова, фразы и тексты станут **выученными**, и откроется уровень N+1."
- Warning note (`#FBF4E8`): "Это пропустит K ещё не освоенных элементов. Их можно повторить в любой момент."
- Buttons: **Отметить пройденным** (gold filled) and **Отмена** (text).

---

## Interactions & Behavior
- **Hero "Все уровни" row / level card tap** → navigate to Уровни (the prototype marks intent with `data-goto`; wire to real navigation).
- **Tap a done level** → open its Detail view. **Locked levels** are non-interactive. **Current level** is reviewed in place (its card is already expanded with actions).
- **"Показать ещё N слов"** (Detail) → toggles `allWords` state to render the full word list / collapse back. Local component state.
- **"Отметить пройденным"** (current-level card) → opens the confirm bottom sheet. **Confirm** → see State Management. **Отмена** → dismiss.
- **"Тренировать"** (weak-link) → start a practice session focused on the weakest mode.
- **Search** filters words/sentences/texts live (case-insensitive substring on both fi & ru). **"↕ По уровню"** toggles ascending sort by level within each section.
- Bars and rings animate on mount/update (durations above). Respect `prefers-reduced-motion`.
- Accuracy color thresholds: ≥80% green, ≥50% amber, else red.

## State Management
Per-screen needs (wire to existing stores):
- **Métriки**: current level + CEFR stage/band; today's lessons/goal/accuracy; coverage learned/total for words, sentences (+ eligible count), texts; streak (current/record); overall accuracy; per-mode mastery fraction + accuracy (to compute the weakest mode).
- **Прогресс**: `query` (string), `byLevel` (bool, default true), `legendOpen` (bool); the item collections with per-track Leitner box, streak, ok/seen.
- **Уровни**: derive `status(level)` = done | current | locked from the user's current level. Detail uses local `allWords` toggle.
- **Mark level passed** (the key write): on confirm, set current level → N+1, and **mark every item in level N as learned/mastered** (product decision: items become "выученными"). This skips the un-mastered remainder; those items remain reviewable. Make the mutation idempotent and reversible-safe.

## Localization rule (important, applies app-wide)
**Topic titles lead with Finnish, then the Russian translation** — i.e. anything that names the thing being learned (level names, text/dialog titles, and the vocabulary/sentence items in the level Detail). Apply this convention consistently. (The legacy Прогресс sentence cards still lead with Russian; aligning them to Finnish-first is an open follow-up, not yet applied.)

## Assets
No raster assets. All icons are inline monoline SVG from the shared set (`ICONS` in `kit.jsx`) — use the app's existing icon components. Font: Golos Text (Google Fonts).

## Files (in this bundle)
- `Прогресс - редизайн.html` — entry point; mounts a design-canvas of all artboards.
- `metrics.jsx` — `MetricsScreen` (Метрики dashboard) + shared `Card`, `SecLabel`.
- `progress.jsx` — `ProgressScreen` (Мой прогресс list).
- `levels.jsx` — `LevelsScreen` (list / detail / confirm), `LevelRow`, `DetailView`, `ConfirmDialog`.
- `data.jsx` — all sample data: 12-level curriculum, CEFR bands, KPIs, per-mode balance, item lists, and `LEVEL_CONTENT` (full per-level words/sentences/texts for the Detail view).
- `kit.jsx` — design tokens (`RC` palette, `FONT`), `ICONS`, and shared primitives (`Icon`, `Frame`, `StatusBar`, `BottomNav`, `BackBtn`, `LevelChip`, `Bar`, `Pips`, `RingGauge`).
- `design-canvas.jsx` — presentation scaffold only (pan/zoom canvas); **not part of the product**, ignore for implementation.

### How to preview
Open `Прогресс - редизайн.html` in a browser. Artboards: Метрики dashboard; Мой прогресс list; Уровни overview; passed-level Detail (Perhe / Семья); and the mark-passed confirm dialog.
