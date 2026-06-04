/**
 * stats.ts — pure derivation for the progress-details screen.
 *
 * Turns the raw `ProgressMap` into per-item rows the UI can render: mastery box, current
 * correct-streak, accuracy counters, and the live selection chance within the active pool.
 * Lets the learner confirm the SRS is behaving (a high streak → low chance). PURE: no UI/DB.
 */

import { getProgress, type ItemKind, type ItemProgress, type ProgressMap } from "./progress";
import { selectionWeight } from "./srs";
import { dateKey, daysBetween } from "./daily";

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
   * "—". This is the per-pick chance; a real session draws several distinct items. NOTE: it uses
   * the base SRS {@link selectionWeight} only — it does NOT include the lowest-unmastered-level
   * boost the builders apply, so it's an estimate (can under-read for a boosted level).
   */
  chance: number;
}

/** Traffic-light readiness for one lesson mode, driven by RECENCY of practice in its group. */
export type Readiness = "green" | "yellow" | "red" | "none";

export interface ModeReadiness {
  /** Items mastered (box ≥ masteredBox) in this mode — the lifetime count shown as a badge. */
  mastered: number;
  /** Pool size for this group (badge denominator; lets the UI show "30 / 64"). */
  total: number;
  /** Recency-decayed activity score (Σ recently-practised items); leader of the group anchors. */
  recentScore: number;
  /** recentScore of the leading mode in the group (the relative anchor). */
  leader: number;
  /** recentScore / leader, in [0, 1] — the continuous fill for the mode's progress bar. */
  ratio: number;
  level: Readiness;
}

/**
 * How fast the recency weight halves: an item practised today counts ~1, and its weight halves
 * every {@link READINESS_HALFLIFE_DAYS} days, so old practice fades toward 0. Drives the relative
 * `recentScore` so a recent burst in one mode visibly outweighs modes touched a while ago.
 */
export const READINESS_HALFLIFE_DAYS = 2;

/** Severity order so we can take the WORSE of two lights (lower index = worse). */
const SEVERITY: readonly Readiness[] = ["red", "yellow", "green"];
function worse(a: Readiness, b: Readiness): Readiness {
  return SEVERITY.indexOf(a) <= SEVERITY.indexOf(b) ? a : b;
}

/**
 * Per-mode readiness within a group of modes (e.g. a word's recognition / production / say_word /
 * listen_word). Two signals combine into one light:
 *
 *  1. RELATIVE recency balance — each mode's `recentScore` sums its practised items, weighting
 *     recent practice ~1 and decaying older practice (half-life {@link READINESS_HALFLIFE_DAYS}).
 *     Coloured against the group leader: green ≥ 50%, yellow ≥ 15%, red below. So pouring a few
 *     lessons into one mode today lifts it and lets the neglected modes slide — sensitive even
 *     when every mode has a big lifetime count.
 *  2. ABSOLUTE idle decay — days since the mode was last practised caps the light: 1 day → at most
 *     yellow, ≥ 2 days → red. This is the engagement loop (practise today or fade) and turns
 *     EVERY mode red on a fully idle stretch, which the relative signal alone cannot.
 *
 * A mode with nothing left to learn (every pool item mastered) stays green regardless — there's
 * nothing to nag about. `none` when the pool is empty or no mode in the group has ever been
 * practised. The lifetime `mastered` count is reported separately for the badge, so the achievement
 * stays visible even when the light is amber/red. `now` is injectable for tests.
 */
export function groupReadiness(
  pool: readonly { id: string }[],
  progress: ProgressMap,
  kinds: readonly ItemKind[],
  masteredBox: number,
  now: number = Date.now(),
): Map<ItemKind, ModeReadiness> {
  const today = dateKey(now);
  const mastered = new Map<ItemKind, number>();
  const scores = new Map<ItemKind, number>();
  const idleDays = new Map<ItemKind, number>(); // whole days since the mode was last practised
  for (const kind of kinds) {
    let count = 0;
    let score = 0;
    let lastSeen = 0;
    for (const i of pool) {
      const p = getProgress(progress, kind, i.id);
      if (p.box >= masteredBox) count += 1;
      if (p.totalSeen >= 1 && p.lastSeen > 0) {
        const days = Math.max(0, (now - p.lastSeen) / 86_400_000);
        score += 0.5 ** (days / READINESS_HALFLIFE_DAYS);
        if (p.lastSeen > lastSeen) lastSeen = p.lastSeen;
      }
    }
    mastered.set(kind, count);
    scores.set(kind, score);
    idleDays.set(kind, lastSeen === 0 ? Infinity : daysBetween(dateKey(lastSeen), today));
  }

  const max = Math.max(0, ...scores.values());
  const result = new Map<ItemKind, ModeReadiness>();
  for (const kind of kinds) {
    const count = mastered.get(kind) ?? 0;
    const recentScore = scores.get(kind) ?? 0;
    const ratio = max === 0 ? 0 : recentScore / max;
    let level: Readiness;
    if (pool.length === 0 || max === 0) {
      level = "none";
    } else if (count === pool.length) {
      level = "green"; // nothing left to practise in this mode — stay green even when idle
    } else {
      const base: Readiness = ratio >= 0.5 ? "green" : ratio >= 0.15 ? "yellow" : "red";
      const days = idleDays.get(kind) ?? Infinity;
      const cap: Readiness = days <= 0 ? "green" : days === 1 ? "yellow" : "red";
      level = worse(base, cap);
    }
    result.set(kind, { mastered: count, total: pool.length, recentScore, leader: max, ratio, level });
  }
  return result;
}

/** One item (word or sentence) with its metrics merged across its lesson-type tracks. */
export interface MergedProgress {
  id: string;
  /** Per-track metrics, only for tracks ENCOUNTERED (totalSeen ≥ 1), in the given order — same
   *  "seen" notion the dashboard's box/recency charts use, so the two screens agree. */
  tracks: MasteryRow[];
  /**
   * Mastered = box ≥ masteredBox in EVERY applicable track (incl. ones never tried, which
   * sit at box 0). So an item is only "done" — and only hideable — once it's mastered in all
   * its lesson types, not just the ones practiced so far.
   */
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
 * instead of repeating it per lesson type. Includes only items SEEN in ≥1 track (totalSeen ≥ 1,
 * matching the dashboard), with a row per seen track — so a word answered only-ever-wrong still
 * appears here. Sorted **mastered-first** (the hideable / already-hidden items, so they're easy
 * to manage at the top), then most-recently practiced.
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
    let mastered = true; // box >= masteredBox in EVERY kind, including untried ones (box 0)
    for (const kind of kinds) {
      const p = getProgress(progress, kind, item.id);
      if (p.box < masteredBox) mastered = false;
      if (p.totalSeen < 1) continue; // never seen in this track → no row (mastery counted above)
      tracks.push(trackRow(item, kind, p, inPool.has(item.id), totalWeightByKind.get(kind) ?? 0));
      if (p.lastSeen > lastSeen) lastSeen = p.lastSeen;
    }
    if (tracks.length === 0) continue;
    out.push({ id: item.id, tracks, mastered, lastSeen });
  }

  // Mastered items (hideable / already hidden) on top so they're easy to find and hide;
  // then the rest, each by most-recent activity.
  out.sort((a, b) => Number(b.mastered) - Number(a.mastered) || b.lastSeen - a.lastSeen);
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
