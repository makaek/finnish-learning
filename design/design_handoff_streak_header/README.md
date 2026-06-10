# Handoff: Streak chip in the home header (Вариант 2)

## Overview
A small, self-contained **streak indicator** that sits in the home-screen header of the
Finnish-learning app, **between the “Финский” title and the gear (settings) button**.

This is the chosen direction — **Вариант 2: «Огонь + неделя»**. The chip shows three things
at a glance:
1. a flame glyph (streak motif),
2. the current streak length (number of consecutive days),
3. a 7-dot week strip where each filled dot is a completed day and **today** is marked with a
   green check.

The daily-goal number (e.g. `19/10`) is **not** in this chip — it lives in the larger block
below the header. This chip is purely about streak length + weekly consistency.

The whole chip is a tappable target intended to open the full streak / progress view.

## About the design files
The file in this bundle (`streak-chip-reference.html`) is a **design reference created in
HTML** — a prototype showing the intended look and behavior, **not** production code to copy
verbatim. The task is to **recreate this chip inside the app’s existing codebase**, using its
established component patterns, theming, and icon system. The app is built in **React**; reuse
its existing `Icon` component and color tokens rather than re-declaring the SVGs and hexes here.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and the icon set are final and match the
production app’s visual language (warm cream theme, Golos Text). Recreate pixel-for-pixel using
the codebase’s libraries.

## Placement in the header
The header is a single horizontal flex row:

```
[ Финский ]  …flex spacer…  [ streak chip ]  …flex spacer…  [ gear ]
```

- Header row: `display:flex; align-items:center; gap:12px; padding:4px 18px 18px;`
- `Финский` title: `flex:0 0 auto;` font 22px / 800 / letter-spacing -0.02em / color `#23262E`.
- Gear button: `40×40`, `border-radius:13px`, `background:#FFFFFF`, `border:1px solid #E7E3DB`,
  `flex:0 0 auto`.
- The streak chip is `flex:0 0 auto` and is **centered** between title and gear by placing an
  equal `flex:1` spacer on each side. (If you prefer right-alignment hugging the gear, drop the
  second spacer and rely on `gap` — both are acceptable; centered is what the mock shows.)

## The streak chip — exact spec

### Container (`.streak`)
| Property | Value |
|---|---|
| display | `flex` + `align-items:center` |
| height | `38px` |
| border-radius | `13px` |
| background | `#FFFFFF` |
| border | `1px solid #E7E3DB` |
| padding | `0 4px 0 5px` (slightly less on the right where the dots sit) |
| box-shadow | `0 1px 2px rgba(40,30,20,0.04)` |
| cursor | `pointer` (it’s a button → opens full streak view) |

Internal left-to-right order: **flame tile → number → divider → week dots**.

### 1. Flame tile (`.flame`)
| Property | Value |
|---|---|
| size | `28×28` |
| border-radius | `9px` |
| background | `linear-gradient(160deg, #FBE3C4, #F6CE9B)` (soft amber) |
| content | flame icon, centered |

Flame icon: `18×18`, stroke `#D98324`, `stroke-width:1.7`, round caps/joins, no fill.
Path: `M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.8-2.8 1.6-3.6C9 10 9.5 8.5 9 7c2 .5 3 2 3 2s.5-3 0-6Z`
(use the app’s existing `flame` icon — it is identical).

### 2. Streak number (`.num`)
| Property | Value |
|---|---|
| padding | `0 8px 0 7px` |
| font-size | `17px` |
| font-weight | `800` |
| letter-spacing | `-0.01em` |
| line-height | `1` |
| color | `#23262E` |

Content = the streak day count (`1` in the mock).

### 3. Divider (`.divider`)
A hairline: `width:1px; height:18px; background:#E7E3DB; flex:0 0 auto;`

### 4. Week dots (`.week`)
Container: `display:flex; gap:4px; padding:0 8px; align-items:center;`

Seven dots, one per weekday (Mon→Sun):
- **Incomplete day** (`.dot`): `11×11`, `border-radius:999px`, `background:#EEEAE2` (track).
- **Completed day** (`.dot.done`): same size/shape, `background:#3B9C6E` (green).
- **Today**, when completed, holds a white check icon centered inside the green dot:
  `8×8`, stroke `#fff`, `stroke-width:3.4`, round caps/joins, path `M4 12.5 9.5 18 20 6`.

In the mock, only the **last** dot (today) is `done`; the other six are track-colored.
Map real data: fill a dot green for each completed day this week; render the check inside the
dot that represents today **if** today is done.

## Interactions & behavior
- **Tap the chip** → navigate to the full streak / progress detail view.
- **Hover/press** (web): subtle feedback only — e.g. background to `#FAF8F4` or a `0.96` scale
  on press. Keep it quiet; this is a status pill, not a primary CTA.
- No animation required on first paint. If a day is completed *while on screen*, the relevant
  dot may animate from track → green with a 200ms ease, and the streak number can tick up — both
  optional polish, not required.
- The chip is a single, fixed width that grows only with the streak number’s digit count
  (1 → 2 → 3 digits). The week strip width is constant (7 dots).

## State / data
The chip needs:
- `streakDays: number` — consecutive-day count → renders as `.num`.
- `week: boolean[7]` — completion flags Mon→Sun → drives `.dot` vs `.dot.done`.
- `todayIndex: 0–6` — which dot gets the check glyph (only shown if that day is complete).

All read-only; no local state beyond the navigation tap.

## Design tokens
| Token | Hex | Use |
|---|---|---|
| ink | `#23262E` | streak number, title |
| sub | `#71757F` | gear icon stroke |
| line | `#E7E3DB` | chip & gear borders, divider |
| track | `#EEEAE2` | incomplete week dots |
| green | `#3B9C6E` | completed week dots |
| card | `#FFFFFF` | chip & gear background |
| cream | `#F0EDE6` | screen background |
| amber-soft 1 | `#FBE3C4` | flame tile gradient start |
| amber-soft 2 | `#F6CE9B` | flame tile gradient end |
| flame stroke | `#D98324` | flame icon |

**Radii:** chip & gear `13px`, flame tile `9px`, dots `999px`.
**Typography:** Golos Text. Number 17/800/-0.01em. Title 22/800/-0.02em.
**Shadow:** chip `0 1px 2px rgba(40,30,20,0.04)`.

## Assets / icons
All icons are inline strokes from the app’s existing `Icon` set — **flame**, **gear**, **check**.
No raster assets. Reuse the codebase’s icon component; the SVG paths above are provided only so
the geometry is unambiguous.

## Files
- `streak-chip-reference.html` — isolated, runnable reference of Вариант 2 in header context
  (status bar + “Финский” + chip + gear). Open in a browser to inspect.
- For the full home-screen context this chip lives in, see the project file
  `screens.jsx` (component `HeaderA` / `MomentumStrip`) and `ring.jsx` (palette `RC`, `Icon`).
