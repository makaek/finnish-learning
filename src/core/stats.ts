/**
 * stats.ts — pure derivation for the progress-details screen.
 *
 * Turns the raw `ProgressMap` into per-item rows the UI can render: mastery box, current
 * correct-streak, accuracy counters, and the live selection chance within the active pool.
 * Lets the learner confirm the SRS is behaving (a high streak → low chance). PURE: no UI/DB.
 */

import { getProgress, type ItemKind, type ProgressMap } from "./progress";
import { selectionWeight } from "./srs";

export interface MasteryRow {
  id: string;
  kind: ItemKind;
  /** Leitner box 0–5 (higher = more mastered). */
  box: number;
  /** Consecutive correct answers. */
  streak: number;
  totalCorrect: number;
  totalSeen: number;
  /**
   * Single-draw selection probability within `activePool` (weight / Σ weights), in [0, 1].
   * 0 when the item is not currently in play (e.g. its level is locked), so the UI can show
   * "—". This is the per-pick chance; a real session draws several distinct items.
   */
  chance: number;
}

/**
 * Build sorted rows for every item answered correctly at least once (`totalCorrect ≥ 1`).
 * `allItems` is the full list of that kind (for labels/filtering); `activePool` is the
 * currently in-play subset (drives the chance denominator). Sorted by box desc, then streak
 * desc, then totalCorrect desc — most-mastered first.
 */
export function masteryRows(
  allItems: readonly { id: string }[],
  activePool: readonly { id: string }[],
  progress: ProgressMap,
  kind: ItemKind,
): MasteryRow[] {
  const activeIds = new Set(activePool.map((i) => i.id));
  const totalWeight = activePool.reduce(
    (sum, i) => sum + selectionWeight(getProgress(progress, kind, i.id)),
    0,
  );

  const rows: MasteryRow[] = [];
  for (const item of allItems) {
    const p = getProgress(progress, kind, item.id);
    if (p.totalCorrect < 1) continue;
    const inPlay = activeIds.has(item.id) && totalWeight > 0;
    rows.push({
      id: item.id,
      kind,
      box: p.box,
      streak: p.correctStreak,
      totalCorrect: p.totalCorrect,
      totalSeen: p.totalSeen,
      chance: inPlay ? selectionWeight(p) / totalWeight : 0,
    });
  }

  rows.sort(
    (a, b) => b.box - a.box || b.streak - a.streak || b.totalCorrect - a.totalCorrect,
  );
  return rows;
}
