# Handoff: «Информация об уровне» — folding «Прогресс» into the level page

## Overview
This redesign **removes the standalone «Прогресс» (Progress) screen** from the Finnish-learning app and folds its useful per-item, per-mode mastery data directly into the **level info page** (the screen you reach by tapping a level — Figure 1 in the brief).

It introduces three things on that level page:

1. **Per-mode "strikes" strip** — a minimal, single-line read of how well each word/sentence is mastered across its practice modes. This replaces the dense flame + accuracy + Leitner-pip rows of the old Progress page.
2. **«Уже знаю» (Already know) marking** via **swipe-left** — the review-then-train flow: skim the items, swipe away the ones you already know cold, and train only the leftovers.
3. **Hidden group + «Вернуть в уроки» (Return to lessons)** — known and fully-mastered items collapse into a "show hidden" group; each can be reset back into active learning (clean progress / undo).

The page also splits content into **four tabs** — Слова · Предложения · Тексты · Диалоги — instead of one long stacked list.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — a prototype showing the intended look and behavior. **They are not production code to copy directly.**

The task is to **recreate this design in the app's existing environment** (whatever the real Finnish-learning app is built in — React Native, Swift/SwiftUI, Kotlin/Compose, Flutter, etc.) using its established components, navigation, design tokens, and state layer. If no environment exists yet, pick the most appropriate framework and implement there.

The HTML prototype hard-codes sample vocabulary and seeds a few item states purely to demonstrate the flows; in the real app this data comes from the existing curriculum + progress model.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and interactions are final and intended to be matched closely. Exact values are in the **Design Tokens** section below. Reuse the app's existing component library where it already has equivalents (cards, pills, section labels) — the prototype deliberately mirrors the app's existing visual language (cream surfaces, teal accent, gold "current level" ring).

---

## Screen: Level Info («Информация об уровне»)

A single scrollable screen. Works for both the **current** level (gold ring header, primary "train" CTA) and **passed** levels (teal check header, "repeat" CTA).

### Layout (top → bottom)
1. **Back button** — pill «← Уровни».
2. **Header row** — level node (left) + title block (right).
   - Current level: 46×46 circle, white fill, `2.5px` gold border, `0 0 0 4px` gold-soft outer ring, level number in gold, weight 800, 19px.
   - Passed level: 46×46 solid teal circle with a white check icon.
   - Title block: Finnish name (22px / 800 / `-0.02em`) + CEFR band pill (e.g. `A1.1`, 11px / 800, teal on `#E6F1EE`, radius 7, padding `3px 7px`). Subtitle line (13px / 600, muted): `«{ru} · уровень {n} · текущий|пройден»`.
3. **«СОДЕРЖАНИЕ УРОВНЯ» section label** (eyebrow: 12px / 800 / uppercase / `0.07em` / muted).
4. **Content tiles row** — three equal flex tiles (`gap: 11`), each: card surface, radius 14, padding `13px 10px`, centered. Monoline icon (19px) in the group hue, big count (20px / 800), small label (11px / 700 muted). Counts = words / phrases / texts totals.
5. **Tab bar** — horizontally scrollable pill row (`gap: 7`, `margin-top: 20`). Four tabs: **Слова · Предложения · Тексты · Диалоги**. Each pill carries a count badge of *remaining* (not-yet-done) items, or a `✓` when none remain.
6. **Active section** for the selected tab (see below).
7. **Primary CTA** at the bottom: current level → gold «▶ Тренировать оставшееся»; passed level → outlined «↻ Повторить уровень».

### Tab pill states
- Selected: teal fill (`#1B8E84`), white text, badge = white pill with teal number.
- Unselected: card fill, `1px` line border, ink text, badge = wash pill with muted number.
- Pills: radius 999, padding `8px 13px`, 13px / 800. Badge: 11px / 800, min-width 14, radius 999.

### Section meta row (under the tab bar)
- Left: «Осталось **N** из {total}» (12.5px / 600 muted, N bold in ink). When nothing remains: «Всё освоено · {total}».
- Right (words & sentences only): hint «← свайп «уже знаю»» (10.5px / 700 faint).

### Strip legend (words & sentences only, shown when active items exist)
A one-line decoder of the strip segment order, e.g. a colored dot + `Узн · Пис · Речь · Слух — освоено по режимам` (10.5px / 700 faint). Sentences use `Пер · Речь · Слух`.

### Item card (active)
- Surface: card bg, `1px` line border, radius 14, padding `11px 13px`, shadow `0 1px 2px rgba(40,30,20,0.03)`.
- **Words**: leading status disc (18×18) + Finnish word (15px / 800 / `-0.01em`) and Russian gloss (12.5px / 600 muted) on a baseline-aligned wrapping row; **mode strip** below (margin-top 7).
- **Sentences**: stacked — Finnish (14px / 800) over Russian (12.5px / 600 muted); mode strip below.
- **Texts / Dialogs**: leading book/masks icon in the reading hue; a status text line instead of a strip («Вопросы пройдены» / «Вопросы начаты» / «Прочитано · без вопросов» / «Ещё не пройдено»).
- Leading status disc: `active` = 18×18 hollow ring (`1.5px` line border).

### The mode strip (the folded-in «strikes») — IMPORTANT
The strip is the core of this redesign. It collapses the old per-mode progress into **one compact row of segments**, one segment per practice mode:
- **Words have 4 modes**: Узнавание, Написание, Речь, На слух → 4 segments.
- **Sentences have 3 modes**: Перевод, Речь, На слух → 3 segments.

Each segment is a rounded track (16×7, radius 2.5, track color) with a fill bar in the group hue. **Only three states are shown per mode — no fine-grained detail:**

| Strikes for that mode | Fill | Meaning |
|---|---|---|
| 0 | 0% (empty track) | not started |
| 1 | 50% (half) | started |
| **2 or more** | **100% (full)** | considered done for that mode |

> A mode segment is **filled solid once the item has ≥ 2 strikes in that mode.** Do **not** render distinct states for 3/4/5 strikes — clamp everything to the 0 / 1 / ≥2 scale. The fill transitions width over `.35s cubic-bezier(.2,.7,.3,1)`.

### Swipe to mark «Уже знаю»
- Active word/sentence cards are **swipe-left** to mark known.
- Behind the card, a teal reveal panel slides in with a white check + «Уже знаю»; reveal opacity ramps `0.35 → 1` with drag progress.
- Threshold `-92px` (max drag `-132px`). Past threshold on release → card animates off (`translateX(-440px)`, ~170ms) then fires `onSwipe`. Below threshold → snaps back (`.22s cubic-bezier(.2,.7,.3,1)`).
- Pointer-events based (`touchAction: pan-y` so vertical scroll still works). A small horizontal-move guard distinguishes taps from swipes.

### Hidden group + «Вернуть в уроки»
- Items that are **known** (swiped) OR **fully mastered** (all modes ≥ 2) leave the active list.
- A dashed toggle button appears: «Показать скрытые · N» / «Скрыть» (dashed line border, wash bg, radius 12, 12.5px / 800 muted, chevron).
- Expanded, each hidden card renders dimmed (`opacity: 0.64`) with:
  - A status disc: known → teal check on `#E6F1EE`; mastered → green check on `#E7F1EC`.
  - A small tag: «уже знаю» (teal) or «выучено» (green) — radius 6, padding `2px 7px`, 10.5px / 800.
  - A **«↻ Вернуть в уроки»** button (right-aligned, outlined, radius 9, padding `6px 10px`, 11.5px / 800). It resets the item: clears the known flag, zeroes its mode strikes, and returns it to the active list.

---

## Interactions & Behavior
- **Tab switch**: instant; section re-renders for the chosen category. Tab badge counts reflect *remaining* items live.
- **Swipe left on a card** → mark «Уже знаю» → card removed from active list → section count & tab badge decrement → item appears in that section's hidden group.
- **Show/Hide hidden** → expand/collapse the hidden group.
- **Вернуть в уроки** → item returns to active list, strikes reset to 0, count/badge increment.
- **Primary CTA** «Тренировать оставшееся» should start a training session scoped to the *active (not-done)* items only — this is the whole point of the review→mark→train flow.
- Reduced motion: width/transform transitions are decorative; honor `prefers-reduced-motion` by skipping them.

## State Management
Per level, the screen needs:
- `tab` — active category: `'w' | 's' | 't' | 'd'` (defaults to words).
- `known: Set<itemId>` — items the user swiped as «Уже знаю». Seeded from any persisted known-marks.
- `returned: Set<itemId>` — items reset via «Вернуть в уроки» (also forces their strip to read 0).
- Derived: `doneFor(item) = known.has(id) || (allModes ≥ 2 && !returned.has(id))`. `done` items are hidden from the active list.
- These are **per-item, per-level** and must persist server-side / in the app's progress store in production. Resetting on level change in the prototype is only because it carries no backend.

> **Strikes data**: each item carries a `modes` array — one integer (strike count) per practice mode. The UI only cares whether each entry is `0`, `1`, or `≥2`. Map the app's real per-mode progress onto that.

## Design Tokens
Pulled from the app's existing reading/metrics design language (see `kit.jsx`).

**Colors**
- Ink (primary text): `#23262E`
- Sub (secondary text): `#71757F`
- Faint (tertiary): `#AAB1BC`
- Card surface: cream (see `RC.card` in `kit.jsx`)
- Page wash / track: `RC.wash` / `RC.track`
- Hairline: `RC.line`
- Teal accent (current, active, known): `#1B8E84` (known tag bg `#E6F1EE`)
- Gold (current-level ring + CTA): `#C8902B`; gold-soft ring `#F6EEDC`
- Green (mastered): `RC.green`; mastered bg `#E7F1EC`
- Group hues — Words `#5B53C6`, Sentences `#1B8E84`, Texts/Dialogs `#BB6A39`

**Typography** — `Golos Text` (400–800).
- Title 22/800/-0.02em · Word 15/800/-0.01em · Sentence-FI 14/800 · Gloss 12.5/600 · Eyebrow 12/800/uppercase/0.07em · Pill 13/800 · Badges & tags 10.5–11/800.

**Radii** — cards 14 · pills 999 · tiles 14 · strip segment 2.5 · tags 6 · buttons 9–13.

**Strip** — segment track 16×7, fill widths `0% / 50% / 100%`, transition `.35s cubic-bezier(.2,.7,.3,1)`.

**Swipe** — threshold 92px, max 132px, off-screen 440px @170ms, snap-back `.22s cubic-bezier(.2,.7,.3,1)`.

## Assets
- **Icons**: monoline set defined inline in `kit.jsx` (`Icon` component: `check`, `play`, `refresh`, `book`, `masks`, `chat`, `star`, `eye`, `pen`, `mic`, `phones`, `chevR`, `chevD`, `arrow`). No external icon files — reuse the app's own icon set for equivalents.
- **Font**: Golos Text (Google Fonts). Swap for the app's brand font if different.
- No raster image assets.

## Files
- `Уровень — информация (редизайн).html` — entry point. Top-of-page chrome (intro + Текущий/Пройденный toggle) is **prototype scaffolding only** — not part of the screen. The screen itself is the phone frame.
- `kit.jsx` — shared design language: `RC` palette, `FONT`, `Icon`, `Frame`, `Card`, `BackBtn` (lifted from the app's reading redesign).
- `leveldata.jsx` — sample curriculum + the per-item `modes` (strike) model, accent tokens (`TEAL`, `GOLD`, `GROUP_HUE`), `SecLabel`, and helpers (`isMastered`, `bandOf`, mode definitions `WORD_MODES` / `SENT_MODES`).
- `strip.jsx` — `ModeStrip` (the 0/1/≥2 segment strip), `StripLegend`, and `SwipeCard` (swipe-to-know).
- `levelinfo.jsx` — the screen: header, content tiles, tab bar, `Section` (active list + hidden group + return), `ItemBody`, `Tile`.

### What changed vs. the old «Прогресс» page
- Removed: standalone Progress route, per-item flame counts, accuracy %, multi-box Leitner pips.
- Kept (minimised): per-mode mastery, now a 4/3-segment strip with only empty/half/full states.
- Added: swipe-to-know, hidden group, return-to-lessons, four content tabs, train-the-leftovers CTA.
