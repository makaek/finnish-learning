# Handoff: Grammar Trainer (Грамматика · тренажёр) — Option A integration

## Overview
A **grammar trainer** mode for the Suomi Finnish-for-Russian-speakers trainer app (PWA). It reuses the app's existing six grammar exercise types and presents them as a **free 10-card review session** — analogous to the word/sentence "Микс" mode — but **decoupled from level progress**. It is a "remind me" trainer over all lifetime grammar topics, weighted toward weak / least-recently-seen ones. Completing it never changes the user's level, unlocks, or mastery.

This is the **Option A** integration:
- The **home screen keeps its existing CTAs** (Слабое звено + Микс) and adds a new full-width **«Грамматика · тренажёр»** card above them.
- The bottom navigation **replaces the «Правила» tab with «Грамматика»** (the grammar topic map + the trainer entry).
- **Rules (правила) are no longer a standalone tab.** They open as detail screens only via links — from a grammar topic row, and from the trainer's end-of-session "повторите" rows.

## About the Design Files
The files in this bundle are **design references created in HTML/React+Babel** — runnable prototypes showing the intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (the production app is React — see `reference/prod-src/` in the design system) using its established components, state management, and styling patterns. The prototypes deliberately reuse the project's verbatim production CSS (`app/app.css`) and design-system tokens, so class names and token names map 1:1 to the real app.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, copy, and interactions are all production-accurate and pulled from the design system. Recreate pixel-for-pixel using the codebase's existing primitives. All Russian UI copy and Finnish (`lang="fi"`) content strings are final.

---

## Screens / Views

The app is a single phone surface (design width **390px**, full device height). Three bottom-nav tabs (**Главная / Метрики / Грамматика**) plus two full-screen overlays (**Тренажёр** flow, **Правило** detail) that hide the nav and carry their own back control.

### 1. Главная (Home) — tab
- **Purpose:** daily entry point; launch the grammar trainer alongside existing actions.
- **Layout:** vertical flex column, `gap: 13px`, padding `16px 18px 18px`, scrolls vertically; fixed bottom nav below.
- **Components (top → bottom):**
  1. **Header** (`.home-head`): wordmark "Suomi" (800 weight) · centered **streak chip** (`.streakchip`: flame tile gradient `linear-gradient(160deg,#fbe3c4,#f6ce9b)`, count "3", 1px divider, 7 week-dots — done=`--rd-green`, today=2px ring `#cf9a4e`) · gear (`.settings__btn`).
  2. **Goal strip** (`.mstrip`): target icon tile, "Цель на сегодня / точность · 93%", right side "1/2 уроков".
  3. **Balance ring card** (`.ringcard`): the production balance ring with **4 groups** — Слова (violet circle), Предложения (teal rounded-square), Чтение (brown hexagon), **Грамматика (diamond, hue `--gram`)**. Center shows level "7". Legend below. Component: `GramBalanceRing` + `GramRingLegend` (`grammar/gram-ring.jsx`).
  4. **Trainer CTA** (`.ctacard.ctacard--gram.ctacard--row.ctacard--trainer`): full-width row. Pen-icon tile filled `--gram` white glyph; kicker "ГРАММАТИКА · ТРЕНАЖЁР" (`--gram`); title "Повторить пройденное"; sub "10 заданий · без влияния на уровень"; play chevron. **Tap → trainer intro.**
  5. **CTA pair** (`.cta` → two `.ctacard`): **Слабое звено** (`--acc:#ce6a57`, "Рекомендуем / Диалоги · точность 64%") and **Микс** (`--acc:#1b8e84`, "В очереди · 84 / всё, что осталось"). These mirror the existing app; tapping is out-of-scope (no handler in the prototype).

### 2. Грамматика (Grammar) — tab (replaces the old «Правила» tab)
- **Purpose:** topic map of grammar modules; entry to the trainer; access point to rules (via links).
- **Components:**
  1. **Head** (`.gmap__head`): title "Грамматика" (800, −0.02em) + level chip "A1.2" (`.glevel`, teal).
  2. **Trainer banner** (`.tr-banner`): gradient `linear-gradient(180deg, --gram-soft, --card)`, `--gram-line` border. Refresh-icon tile filled `--gram`; kicker "ТРЕНАЖЁР · ПОВТОРЕНИЕ"; title "10 заданий из всех тем"; sub "слабые и давно не повторённые · не влияет на уровень"; play disc. **Tap → trainer intro.**
  3. **Progress hero** (`.ghero`): mastery ring 31% + "Освоено 2 из 9 тем" + progress bar + "Слабая тема: **Отрицание** · повторите сегодня".
  4. **Modules** (`.gmod` header: eyebrow number + title + hairline + count) each with **topic rows** (`.gtopic.gtopic--<state>.gtopic--static`). Row = icon tile (check/pen/lock) + main (title, sub, optional `.gtopic__hint`, and a **📖 «Правила» link** `.tr-rulelink` when the topic has a rule) + right indicator (`.gdone` "Освоено" badge / `MasteryRing` / chevron). States: `mastered` · `progress` · `avail` · `locked`. Rows are **not** primary buttons (they're `div`s) — the rule link is the only action.
  5. **Footer hint:** "Правила открываются из темы — отдельной вкладки больше нет."

### 3. Метрики (Metrics) — tab
- **Purpose:** light overview; secondary trainer entry. (Not a redesign — kept faithful & minimal.)
- **Components:** title "Метрики / обзор сейчас"; two stat tiles (`.mtile`: Серия дней "3 / рекорд 12" flame; Точность "88% / 217 из 247" target); a "ГРАММАТИКА" coverage card listing four topics with mastery % (color-coded green/amber/red) and a full-width **«Тренажёр грамматики · 10»** button (`.gnext`). **Tap → trainer intro.**

### 4. Тренажёр — intro (overlay)
- **Purpose:** pre-session framing; make clear it does not affect progress.
- **Components:** back arrow (`.gexit`); **hero card** (`.tr-herocard`): pen disc, kicker "ГРАММАТИКА", title "Тренажёр", subtitle ("Свободное повторение пройденных тем. Подбираем слабые и давно не повторённые задания — уровень и прогресс не меняются."), two meta pills ("10 заданий", "~6 мин"), and the **no-progress badge** (`.tr-badge`: refresh icon + text, default "без влияния на уровень"). Below: **focus card** (`.tr-focus`) "В ФОКУСЕ СЕССИИ" with weak-topic chips (Отрицание 35%, Тип глагола 2 и 3 60%, Падежи -ssa/-sta 100%; low values in `--weak`). Footer: **«Начать»** (`.gnext`).

### 5. Тренажёр — session card (overlay, ×10)
- **Purpose:** one grammar exercise at a time.
- **Top bar** (`.tr-top`): exit ×, eyebrow "ГРАММАТИКА · ТРЕНАЖЁР", current topic, counter "n / 10", continuous progress bar (`.tr-prog__fill`, fills with `idx/10`).
- **Card** (`.card.gcard`): a concept tag (`GTag`) + a **«Уже знаю» skip pill** (`.tr-skip`, toggleable) at top, then the exercise. **Six item types** (see below). After answering, an explanation block (`GExplain`, tones ok/near/no) appears; typed/near-miss/wrong also show a canonical answer line (`.gcanon`). Footer button: "Выберите вариант" (disabled, choice types) → "Дальше"; or "Проверить" → "Дальше" (typed/table).

### 6. Тренажёр — summary (overlay)
- **Purpose:** result + what to review; **no level/unlock rewards.**
- **Components:** check disc; adaptive title (Отлично/Хорошо/Неплохо/Есть над чем поработать by score); "Тренировка завершена"; **score** "n/10" (`.gsum__score`, `--gram`); the no-progress badge. **«ПОВТОРИТЕ · ОТКРОЙТЕ ПРАВИЛО»** card: review rows (`.tr-revrow--btn`) for each topic with a miss, sorted worst-first, each = rules icon + topic name + accuracy % (color-coded) + chevron — **tap opens that topic's rule**. If all correct, shows `.tr-allgood`. Explicit note (`.tr-note`): "Это тренировка — уровень и прогресс не изменились." Footer: **«Ещё раз»** (ghost, restarts session) + **«Готово»** (returns to the launching tab).

### 7. Правило (Rule detail) — overlay (opened via link only)
- **Purpose:** show a grammar rule; reachable only from a grammar topic row or a summary review row.
- **Components:** back arrow + "ПРАВИЛО" eyebrow (`.tr-rule-eyebrow`, `--accent`); card with concept tag, title (`.gth__title`), one-line summary (`.gth__summary`), body paragraph (`.gth__body`, Finnish forms in `<b lang="fi">`), "ПРИМЕРЫ" section with Finnish+Russian example pairs (`GExample`). Footer: **«К темам»** → grammar tab.

---

## The six exercise types (`trainer-cards.jsx`)
Each card type, with its grading and feedback:

| Type | Mechanic | Grading |
|---|---|---|
| `classify` | tap 1 of 6 chips ("Тип 1…6") | exact option match |
| `choose_form` | tap 1 of 4 Finnish forms (sentence has a gap) | exact; wrong option shows inline `why` |
| `case_id` | tap 1 of 3 case names | exact; wrong option shows inline `why` |
| `produce_form` | type one Finnish form | exact = ok · Levenshtein ≤1 (≤2 for ≥9 chars) = "почти" · else wrong |
| `transform` | type a transformed phrase | same typed grading |
| `fill_table` | type all 6 personal forms | per-cell exact match; correct = all 6 right |

- **Typed inputs are uncontrolled** (graded by reading the DOM value on "Проверить"). A caret-aware **ä/ö quick-key bar** (`.gkeys` / `.gkey`) inserts at the cursor of the focused field.
- The default session is a fixed array of 10 exercises (`TR_SESSION`) **weighted toward weak topics** — 5 of 10 target Отрицание and Тип глагола 2 и 3.

## Interactions & Behavior
- **Navigation:** bottom nav switches Главная/Метрики/Грамматика. Trainer launches from (a) home CTA, (b) grammar banner, (c) metrics button — each remembers its launcher and returns there on "Готово"/exit. Rule detail always returns to the Грамматика tab.
- **Trainer flow state machine:** `intro → session(idx 0…9) → summary`. Each card resolves `{correct, known?}`; `idx+1 ≥ 10` → summary.
- **No-progress guarantee:** the summary intentionally omits the regular lesson's mastery-delta ring and "Открыта тема" unlock block; it shows only score + review links + the explicit note. This is the core product distinction — preserve it.
- **Press states:** `:active { transform: scale(0.94–0.98) }`; option correct/wrong recolor border + soft fill; transitions 0.1–0.2s ease.
- **Persistence:** none required for the trainer itself (a session is ephemeral). The real app keeps nav/lesson position in URL/localStorage per existing conventions.

## State Management
- `view`: `home | metrics | grammar | trainer | rule`.
- `ruleId`: which rule the detail screen shows.
- `launchReturn` (ref): tab to return to after the trainer.
- Inside `TrainerFlow`: `phase` (`intro|session|summary`) + `results[]` (per-card `{correct}`).
- Inside each `TrainerCard`: `picked` (choice) / `graded` (`ok|near|no`, typed) / `cells[]` (table).
- **Real app wiring:** the trainer must read the user's studied grammar topics + per-topic mastery/last-seen to build a weighted 10-item queue, and must **write nothing back to progression** on completion (it may log a practice event for stats, but not level/mastery).

## Design Tokens
All tokens are defined in the design system: `tokens/colors.css`, `tokens/scales.css`, `tokens/base.css`, and the grammar hue in `grammar/grammar.css`. Key values:

**Surfaces:** `--bg #f7f1e8` · `--bg-2` (top radial wash) · `--card #fffdfa` · `--border #e8dccb` · `--surface` · `--surface-2`.
**Mode/accent hues:** `--accent #2d5fe0` (navigation/links — used for rule links) · `--rd-violet #5b53c6` (Слова) · `--rd-teal #1b8e84` (Предложения) · `--read #bb6a39` (Чтение) · **`--gram #a8487f`** (grammar/trainer mode — tweakable; derived `--gram-deep/-soft/-line/-wash` via `color-mix`).
**Semantic:** `--ok` (green) · `--no` (red) · `--known` (amber) · `--gold #c8902b` · `--weak #ce6a57`.
**Radii:** `--r 22px` (cards) · `--r-sm 14px` · `--pill 999px`; device frame 28px; tiles 12–20px.
**Spacing:** `--s1 .4rem · --s2 .65rem · --s3 1rem · --s4 1.5rem · --s5 2rem`; phone gutter ~18px.
**Shadows:** `--shadow 0 14px 34px rgba(78,52,24,.14)` · `--shadow-sm 0 4px 14px rgba(78,52,24,.10)`.
**Type:** system rounded stack — `ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif`. Weights: 800 numbers/wordmarks, 700 titles, 600 labels, 400–500 body. Kickers ~0.62–0.72rem / 800 / uppercase / +0.06–0.09em letter-spacing. Slide/card titles tight tracking (−0.01…−0.02em).

## Tweaks (prototype-only controls)
Exposed via the Tweaks panel (not part of the shipped UI): **Акцент режима** (`--gram` hue: berry `#a8487f` / violet `#7c4fae` / blue `#4453c4`), **Текст бейджа** ("без влияния на уровень" / "повторение" / "тренировка"), **Кнопка «Уже знаю»** (show/hide the skip pill).

## Assets
- **Icons:** one custom monoline set (24×24 viewBox, `stroke="currentColor"`, ~1.7–1.9 width, round caps), inline SVG — no icon font. Trainer uses: pen, refresh, play, check, x, back, chevR, bolt, info, target, grid, flame, gear, home, rules, lock. Defined in `grammar/gram-kit.jsx` (`GIcon`) and `components/core/UiIcon.jsx` (production set). The 4-group ring's mode icons live in `grammar/gram-ring.jsx`.
- **No imagery / photography.** App mark: `assets/favicon.svg`.

## Files
**Trainer source (this bundle — recreate these):**
- `Грамматика - тренажёр.html` — entry; loads React 18.3.1 + Babel standalone, then the scripts below.
- `optiona-app.jsx` — app root: device shell, home, metrics, grammar tab, rule detail, bottom nav, rules data (`RULES`), grammar map data (`GTAB_MODULES`), ring modes, tweaks.
- `trainer-flow.jsx` — trainer flow: intro, session engine, summary; shared bits (`TrBadge`, `TrFocusCard`, `TOPIC_RULE` map).
- `trainer-cards.jsx` — the six interactive exercise cards, the 10-card session data (`TR_SESSION`), typed-answer grading (Levenshtein), caret-aware ä/ö keys.
- `trainer.css` — trainer-specific styles (device frame, app shell, intro, badge, focus card, queue, rule links, summary, card-flow chrome).

**Design-system dependencies (already in the project — reuse, don't fork):**
- `styles.css` (entry; `@import`s tokens + `app/app.css`) · `tokens/colors.css` · `tokens/scales.css` · `tokens/base.css` · `app/app.css` (verbatim production component CSS: `.card .option .ctacard .mstrip .streakchip .ringcard .bnav .mtile …`).
- `grammar/grammar.css` — the grammar `gram-*` namespace + `--gram` hue.
- `grammar/gram-kit.jsx` — `GIcon, GExplain, GTag, MasteryRing, Hl, GExample, QuickKeys, …`.
- `grammar/gram-ring.jsx` — `GramBalanceRing, GramRingLegend` (4-group ring fork).
- `grammar/tweaks-panel.jsx` — `useTweaks, TweaksPanel, Tweak*` (prototype tooling only; drop in production).
- Production React reference: `reference/prod-src/ui/*.tsx.txt` (e.g. `RecognitionCard`, `RulesBook`, `Roadmap`).

## Notes for the implementer
- The live, runnable prototype is in the project at `grammar_trainer/`. This handoff folder is a copy for reference + this README.
- Build with the **production class names** in `app/app.css` and the `gram-*` classes in `grammar/grammar.css` — they're verbatim from the real app, so they map directly to existing components.
- The single most important behavior: **the trainer must not affect level/mastery progression.** Everything else (queue selection, exact copy) can flex to backend reality, but keep the "повторение · без влияния на уровень" framing on the intro and summary.
