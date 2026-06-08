/**
 * curriculum.ts — CEFR milestones (A1 / A2 …) over the level curriculum.
 *
 * Maps each level to a CEFR band and derives the learner's progress toward the next milestone,
 * so the UI can show "A1 ▓▓▓░ 62%". Band boundaries were assigned by the finnish-linguist from the
 * actual vocabulary/grammar in each level: levels 1–6 are A1 (L6 straddles but its grammar stays
 * A1), levels 7–12 are A2 (comparatives, että-clauses, the fuller case-government system). PURE —
 * a function of {@link LevelStat}s; no UI/DB imports.
 */

import { LEVEL_COMPLETE_FRACTION, type LevelStat } from "./levels";

/**
 * Milestone bands. CEFR A1 is split into its three sub-levels (A1.1/A1.2/A1.3, per the product's
 * A1 definition) so the learner sees granular progress; A2 is the next major band. The ladder is
 * the milestone sequence the home bar walks.
 */
export type Cefr = "A1.1" | "A1.2" | "A1.3" | "A2";

/** Milestone bands in ascending order — the ladder the progress bar climbs. */
export const CEFR_ORDER: readonly Cefr[] = ["A1.1", "A1.2", "A1.3", "A2"];

/**
 * Inclusive top level of each band, assigned by the finnish-linguist from content difficulty
 * (`docs/cefr-a1-spec.md`): A1.1 → levels 1–3, A1.2 → 4–6, A1.3 → 7–9, A2 → 10–12. A level above
 * the last boundary takes the final band.
 */
const BAND_MAX_LEVEL: { band: Cefr; maxLevel: number }[] = [
  { band: "A1.1", maxLevel: 3 },
  { band: "A1.2", maxLevel: 6 },
  { band: "A1.3", maxLevel: 9 },
  { band: "A2", maxLevel: 12 },
];

/** The CEFR band a curriculum level belongs to. */
export function cefrOfLevel(level: number): Cefr {
  for (const b of BAND_MAX_LEVEL) if (level <= b.maxLevel) return b.band;
  return BAND_MAX_LEVEL[BAND_MAX_LEVEL.length - 1]!.band;
}

/** The major CEFR band of a sub-band ("A1" spans A1.1–A1.3). */
export function majorBand(band: Cefr): "A1" | "A2" {
  return band === "A2" ? "A2" : "A1";
}

export interface CefrProgress {
  /** The milestone band currently being worked toward (the lowest with an unfinished level). */
  band: Cefr;
  /** The major band of `band` ("A1" for A1.1–A1.3) — for the "you're working on A1" headline. */
  major: "A1" | "A2";
  /** The band unlocked by completing `band`, or null if it's already the final band. */
  nextBand: Cefr | null;
  /** Levels in `band` present in the curriculum. */
  levelsTotal: number;
  /** Of those, how many are complete. */
  levelsDone: number;
  /** Smooth progress toward completing `band`, in [0, 1] (reads 1 at the per-level threshold). */
  fraction: number;
  /** True once every band's levels are complete. */
  complete: boolean;
}

/** A level counts as done when its combined completion reaches the advancement threshold. */
function levelDone(stat: LevelStat): boolean {
  return stat.total === 0 || stat.learned / stat.total >= LEVEL_COMPLETE_FRACTION;
}

/** Smooth per-level completion in [0, 1], scaled so the advancement threshold reads as 100%. */
function levelFraction(stat: LevelStat): number {
  if (stat.total === 0) return 1;
  return Math.min(1, stat.learned / stat.total / LEVEL_COMPLETE_FRACTION);
}

/**
 * The learner's CEFR milestone progress, from combined per-level completion stats
 * ({@link levelCompletionStats}). The "current milestone" is the lowest band that still has an
 * unfinished level; `fraction` is the mean smoothed completion across that band's levels. Once
 * every band is done, returns the final band with `complete: true`.
 */
export function cefrProgress(stats: readonly LevelStat[]): CefrProgress {
  const present = [...stats].sort((a, b) => a.level - b.level);
  for (let i = 0; i < CEFR_ORDER.length; i++) {
    const band = CEFR_ORDER[i]!;
    const bandLevels = present.filter((s) => cefrOfLevel(s.level) === band);
    if (bandLevels.length === 0) continue;
    const done = bandLevels.filter(levelDone).length;
    if (done < bandLevels.length) {
      return {
        band,
        major: majorBand(band),
        nextBand: CEFR_ORDER[i + 1] ?? null,
        levelsTotal: bandLevels.length,
        levelsDone: done,
        fraction: bandLevels.reduce((sum, s) => sum + levelFraction(s), 0) / bandLevels.length,
        complete: false,
      };
    }
  }
  const last = CEFR_ORDER[CEFR_ORDER.length - 1]!;
  const lastLevels = present.filter((s) => cefrOfLevel(s.level) === last);
  return {
    band: last,
    major: majorBand(last),
    nextBand: null,
    levelsTotal: lastLevels.length,
    levelsDone: lastLevels.length,
    fraction: 1,
    complete: true,
  };
}
