/**
 * balance.ts — "balance drives progress" derivations for the home screen.
 *
 * Turns each mode's per-level mastery ({ mastered, total }, from levelModeStats) into the balance
 * signals the Кольцо-баланса UI needs:
 *   • per-mode mastery 0..1 and a colour state,
 *   • the WEAKEST mode (routing target for the "слабое звено" card),
 *   • which leader modes are PAUSED (ran too far ahead of their group),
 *   • the level GATE (the level can't complete past the weakest mode),
 *   • a single balance SCORE for the header.
 *
 * PURE: no UI, no DB, no React. Depends on nothing in ../ui. All tunables live here.
 */

/** The four home groups (mirror Roadmap's section split + the grammar spoke). */
export type BalanceGroup = "words" | "sent" | "read" | "gram";

/** What the ring needs per mode — a per-level {mastered, total} count plus its label/icon. */
export interface ModeInput {
  /** Stable key used for routing back to onStart/onOpenReading, e.g. "words:recognition". */
  id: string;
  group: BalanceGroup;
  /** Short visible label, e.g. "Узнавание". */
  label: string;
  /** Monoline icon key (see BalanceRing's ICONS). */
  icon: string;
  /** Items mastered in THIS mode at the current level. */
  mastered: number;
  /** Items this mode drills at the current level. */
  total: number;
}

export type ModeState = "ok" | "weak" | "done";

export interface ModeCell extends ModeInput {
  /** 0..1. A mode with nothing to learn (total === 0) counts as fully done (1). */
  mastery: number;
  /** Leader that ran too far ahead of its group → paused (not startable). */
  paused: boolean;
  /** The single weakest unfinished mode — the routing target. */
  weakest: boolean;
  state: ModeState;
}

export interface Balance {
  level: number;
  cells: ModeCell[];
  /** Lowest-mastery unfinished mode, or null when the level is fully done. */
  weakest: ModeCell | null;
  /** 0..100 — how even the modes are (drives the header "баланс N%"). */
  score: number;
  /** 0..1 — the level ceiling: it equals the weakest mode's mastery. */
  gate: number;
}

/* ------------------------------------------------------------------ tunables */

/** A leader PAUSES when it runs this far (in mastery) ahead of its group's weakest. */
export const PAUSE_GAP = 0.3;
/** The weakest mode must reach this mastery before the level may complete. */
export const GATE_TARGET = 0.8;
/** Colour threshold: at/below this mastery a mode is "weak" (red). Above it but below 100% is
 *  "ok" (yellow); only a fully-finished mode (100%, or nothing to drill) is "done" (green). */
const WEAK_MAX = 0.3;

/* ------------------------------------------------------------------- helpers */

const masteryOf = (m: ModeInput): number => (m.total > 0 ? m.mastered / m.total : 1);

function stateOf(mastery: number, total: number): ModeState {
  if (total === 0 || mastery >= 1) return "done"; // green — 100% (or nothing to do)
  if (mastery <= WEAK_MAX) return "weak"; //          red — ≤ 30%
  return "ok"; //                                     yellow — > 30% but < 100%
}

/** Coefficient of variation → evenness. 100 = perfectly balanced, 0 = maximally skewed. */
function evennessScore(values: number[]): number {
  const v = values.filter((x) => x < 1); // finished modes don't count against balance
  if (v.length < 2) return 100;
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  if (mean === 0) return 0;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  return Math.round(Math.max(0, Math.min(1, 1 - sd / mean)) * 100);
}

/* -------------------------------------------------------------------- public */

export function computeBalance(modes: readonly ModeInput[], level: number): Balance {
  // group floors (min mastery per group), over modes that still have something to learn
  const groupMin: Record<string, number> = {};
  for (const m of modes) {
    const k = m.group;
    const mastery = masteryOf(m);
    if (m.total === 0) continue;
    groupMin[k] = groupMin[k] === undefined ? mastery : Math.min(groupMin[k], mastery);
  }

  // the single weakest unfinished mode (lowest mastery; ties → first in order)
  let weakestId: string | null = null;
  let weakestVal = Infinity;
  for (const m of modes) {
    if (m.total === 0) continue;
    const mastery = masteryOf(m);
    if (mastery < 1 && mastery < weakestVal) {
      weakestVal = mastery;
      weakestId = m.id;
    }
  }

  const cells: ModeCell[] = modes.map((m) => {
    const mastery = masteryOf(m);
    const state = stateOf(mastery, m.total);
    const floor = groupMin[m.group] ?? 0;
    // Pause only true leaders: ahead of the group floor by the gap, and not already done.
    const paused = state !== "done" && mastery - floor >= PAUSE_GAP;
    return { ...m, mastery, state, paused, weakest: m.id === weakestId };
  });

  return {
    level,
    cells,
    weakest: cells.find((c) => c.weakest) ?? null,
    score: evennessScore(cells.map((c) => c.mastery)),
    gate: weakestId === null ? 1 : weakestVal,
  };
}

/** Gate predicate for levels.ts: has the weakest mode reached the target? */
export function isLevelBalanced(b: Balance): boolean {
  return b.gate >= GATE_TARGET;
}
