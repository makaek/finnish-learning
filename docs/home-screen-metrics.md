# Home screen — numbers & progress bars (cheat sheet)

Source: `src/ui/Roadmap.tsx` (+ `core/levels.ts`, `core/stats.ts`, `core/daily.ts`).
The home screen is one summary card on top, then three mode groups (Слова / Предложения / Чтение).

## 1. Header stat row (tap → opens "мой прогресс")

Three lifetime/standing figures:

| Icon | Value | Meaning |
|------|-------|---------|
| 🔥 **серия** | `streak` | Consecutive days the daily goal was met (current streak). |
| 🏆 **уровень** | `active` | Current level = the lowest level not yet fully completed (the one you're working on). |
| ✦ **из N** | `learned / total` | Words learned out of all words in the dictionary (lifetime coverage). |

## 2. Two header progress bars

**Level bar — "Уровень {n} · {pct}%"**
- Fill = how complete the *current* level is, across **words + sentences + texts/dialogs combined**.
- It's a learned-fraction: 100% means everything in the level is learned.
- Capped at **99%** while anything remains, so it never rounds up to "done" with items left; shows **100%** only when the level is truly finished. (A level unlocks at ~93% learned; unlocks stay word-driven so nothing relocks.)

**Daily goal bar — "🎯 Сегодня: {lessons}/{goal} · {acc}%"** (or "Цель выполнена! 🎉")
- Fill = today's completed lessons toward the daily goal (`DAILY_LESSONS_GOAL`).
- `{acc}%` = today's answer accuracy.
- Resets each day; drives the 🔥 streak.

## 3. Mode group titles — "Слова (N)", "Предложения (N)", "Чтение (N)"

- The `(N)` = current-level items in this group **not yet learned in ANY mode** — i.e. the items still moving the level bar.
- It's the same number across the group's cards, so it lives once on the heading (not per card).
- Disappears when the group's current level is done.

## 4. Each mode card (e.g. Узнавание, Написание, Речь, На слух…)

**Top-left count badge** (e.g. the small `7`)
- Current-level items still **unmastered in THIS specific mode** (Leitner box below the "learned" threshold).
- Per-mode, so the same word can still count on "Написание" after it's cleared on "Узнавание". This is what *this card* still has to drill.

**Readiness bar (green / yellow / red, partial width)** — this is a *recency / freshness* signal, NOT mastery:
- Width (`ratio`) = how recently this mode was practised **relative to the freshest mode in its group** (group leader = 100%).
- Colour combines two signals:
  - relative balance: ≥50% of leader → green, ≥15% → yellow, below → red (neglected modes slide as you pour practice into one);
  - idle decay: practised today → can stay green, 1 day idle → caps at yellow, ≥2 days → red.
- A mode with nothing left to learn stays green. Empty/never-practised → no fill ("пока нечего учить").
- Purpose: nudge you to spread practice across modes and come back daily — distinct from the badge (what's left) and the level bar (overall completion).

## Quick mental model
- **Level bar** = overall progress through the curriculum.
- **Daily bar / 🔥** = did you show up today / streak.
- **Group `(N)`** = items still pushing the level bar in that group.
- **Card badge** = items left to master *in that exact mode*.
- **Card bar colour** = how fresh your practice in that mode is (recency, not progress).
