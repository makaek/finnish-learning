/**
 * stats.ts — pure derivation for the progress-details screen.
 *
 * Turns the raw `ProgressMap` into per-item rows the UI can render: mastery box, current
 * correct-streak, accuracy counters, and the live selection chance within the active pool.
 * Lets the learner confirm the SRS is behaving (a high streak → low chance). PURE: no UI/DB.
 */

import { getProgress, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";
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

/** One item (word or sentence) with its metrics merged across its lesson-type tracks. */
export interface MergedProgress {
  id: string;
  /** Per-track metrics, only for tracks practiced (totalCorrect ≥ 1), in the given order. */
  tracks: MasteryRow[];
  /** Mastered = box ≥ masteredBox in every practiced track (so it can be hidden). */
  mastered: boolean;
  /** Most recent activity across tracks (for sorting). */
  lastSeen: number;
}

/** Per-track selection chance for one item, mirroring `masteryRows`' definition. */
function trackRow(
  item: { id: string },
  kind: ItemKind,
  p: ItemProgress,
  inPool: boolean,
  totalWeight: number,
): MasteryRow {
  return {
    id: item.id,
    kind,
    box: p.box,
    streak: p.correctStreak,
    totalCorrect: p.totalCorrect,
    totalSeen: p.totalSeen,
    chance: inPool && totalWeight > 0 ? selectionWeight(p) / totalWeight : 0,
  };
}

/**
 * Merge each item's progress across several tracks (e.g. a word across recognition /
 * production / say_word) into one entry, so the UI can show a single card per word/sentence
 * instead of repeating it per lesson type. Includes only items practiced in ≥1 track, with a
 * row per practiced track. Sorted unmastered-first, then most-recently practiced.
 */
export function mergeByItem(
  items: readonly { id: string }[],
  pool: readonly { id: string }[],
  progress: ProgressMap,
  kinds: readonly ItemKind[],
  masteredBox: number,
): MergedProgress[] {
  const inPool = new Set(pool.map((i) => i.id));
  const totalWeightByKind = new Map<ItemKind, number>();
  for (const kind of kinds) {
    totalWeightByKind.set(
      kind,
      pool.reduce((sum, i) => sum + selectionWeight(getProgress(progress, kind, i.id)), 0),
    );
  }

  const out: MergedProgress[] = [];
  for (const item of items) {
    const tracks: MasteryRow[] = [];
    let lastSeen = 0;
    for (const kind of kinds) {
      const p = getProgress(progress, kind, item.id);
      if (p.totalCorrect < 1) continue;
      tracks.push(trackRow(item, kind, p, inPool.has(item.id), totalWeightByKind.get(kind) ?? 0));
      if (p.lastSeen > lastSeen) lastSeen = p.lastSeen;
    }
    if (tracks.length === 0) continue;
    out.push({ id: item.id, tracks, mastered: tracks.every((t) => t.box >= masteredBox), lastSeen });
  }

  out.sort((a, b) => Number(a.mastered) - Number(b.mastered) || b.lastSeen - a.lastSeen);
  return out;
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
