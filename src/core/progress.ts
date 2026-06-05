/**
 * progress.ts — pure model for per-item learning progress.
 *
 * Tracks a Leitner-style mastery box plus the counters that drive selection weighting
 * (slice 6) and level unlocks (slice 7). Progress is kept SEPARATELY PER EXERCISE TYPE:
 * the same word has independent records for recognition vs. production, so "learned" is
 * earned per skill. PURE: no UI/DB/network imports — persistence lives in `src/data/backend.ts`.
 */

/**
 * Which exercise a progress record belongs to — one track per lesson type. The same
 * dictionary word has distinct records for "recognition", typed "production", spoken
 * "say_word", and dictation "listen_word"; sentences have separate typed "sentences", spoken
 * "say_sentence", and dictation "listen_sentence" tracks; a reading text/dialog has one
 * "reading" track recording comprehension-quiz mastery.
 */
export type ItemKind =
  | "recognition"
  | "production"
  | "sentences"
  | "say_word"
  | "say_sentence"
  | "listen_word"
  | "listen_sentence"
  | "reading";

/** Lowest / highest Leitner box. Box 0 = brand new / just missed; MAX_BOX = mastered. */
export const MIN_BOX = 0;
export const MAX_BOX = 5;

/** Mastery state for a single item. Plain data — safe to serialize and persist. */
export interface ItemProgress {
  kind: ItemKind;
  itemId: string;
  /** Leitner box in [MIN_BOX, MAX_BOX]; higher = more mastered = shown less often. */
  box: number;
  /** Consecutive correct answers; the "3 in a row" signal. Reset to 0 on a miss. */
  correctStreak: number;
  /** Lifetime correct answers for this item. */
  totalCorrect: number;
  /** Lifetime times this item was answered. */
  totalSeen: number;
  /** Epoch ms of the last answer, or 0 if never seen. */
  lastSeen: number;
}

/** Stable composite key, since ids are only unique within a kind. */
export type ProgressKey = `${ItemKind}:${string}`;

export function progressKey(kind: ItemKind, itemId: string): ProgressKey {
  return `${kind}:${itemId}`;
}

/** In-memory progress lookup, keyed by `progressKey`. */
export type ProgressMap = Map<ProgressKey, ItemProgress>;

/** A fresh, never-seen progress record for an item. */
export function emptyProgress(kind: ItemKind, itemId: string): ItemProgress {
  return { kind, itemId, box: MIN_BOX, correctStreak: 0, totalCorrect: 0, totalSeen: 0, lastSeen: 0 };
}

/** Read an item's progress from the map, or a fresh empty record if absent. */
export function getProgress(map: ProgressMap, kind: ItemKind, itemId: string): ItemProgress {
  return map.get(progressKey(kind, itemId)) ?? emptyProgress(kind, itemId);
}

/** Build a `ProgressMap` from a flat list (e.g. rows loaded from the backend). */
export function toProgressMap(items: readonly ItemProgress[]): ProgressMap {
  const map: ProgressMap = new Map();
  for (const item of items) map.set(progressKey(item.kind, item.itemId), item);
  return map;
}
