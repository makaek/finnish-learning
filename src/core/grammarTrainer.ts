/**
 * grammarTrainer.ts — pure model for the «Грамматика · тренажёр» (design_handoff_grammar_trainer).
 *
 * A FREE review session over the grammar topics the learner has already reached — the grammar
 * analogue of the word/sentence «Микс», but DECOUPLED FROM LEVEL PROGRESS: it only READS progress
 * to weight the queue and writes nothing back (no mastery, no unlocks). It picks a fixed-size set
 * of items, biased toward WEAK (low mastery) and STALE (long since practised) topics.
 *
 * PURE: no UI/DB imports — App passes a seed + `now`, so the queue is deterministic and testable.
 */

import { makeRng } from "./quiz";
import { weightedSample } from "./select";
import { getProgress, type ProgressMap } from "./progress";
import {
  GRAMMAR_KIND,
  topicMasteryPct,
  topicStates,
  type GrammarContent,
  type GrammarItem,
  type GrammarTopic,
} from "./grammar";

/** Default trainer length (the handoff's "10 заданий"). */
export const TRAINER_SIZE = 10;

/** A topic not practised within this window counts as fully "stale" (max recency weight). */
const STALE_FULL_MS = 14 * 24 * 60 * 60 * 1000;

/** Topic weight = a small floor + weakness + staleness; tuned so weak/stale topics dominate. */
const BASE_W = 0.15;
const WEAK_W = 1.0;
const STALE_W = 0.6;

/** Topics the learner has REACHED (not prereq-locked) — the pool the trainer reviews over. */
export function studiedTopics(
  content: GrammarContent,
  progress: ProgressMap,
): GrammarTopic[] {
  const states = topicStates(content.topics, progress);
  return content.topics.filter((t) => states.get(t.id) !== "locked");
}

/**
 * How strongly a topic should be drawn: weaker (lower mastery) and staler (longer since the last
 * lesson) → higher. A never-practised reachable topic is maximally weak AND stale, so it surfaces.
 */
export function topicWeight(progress: ProgressMap, topicId: string, now: number): number {
  const mastery = topicMasteryPct(progress, topicId); // 0..1
  const lastSeen = getProgress(progress, GRAMMAR_KIND, topicId).lastSeen;
  const staleness = lastSeen <= 0 ? 1 : Math.min(1, Math.max(0, (now - lastSeen) / STALE_FULL_MS));
  return BASE_W + WEAK_W * (1 - mastery) + STALE_W * staleness;
}

/**
 * Build the trainer queue: up to `size` distinct items drawn from reached topics, weighted toward
 * weak/stale topics. Each item's weight is its topic's weight divided by that topic's item count,
 * so a topic's EXPECTED share scales with its weight regardless of how many items it happens to
 * have — weak topics appear more, but no single topic monopolises the session.
 *
 * Deterministic for a given `seed`/`now`. Returns fewer than `size` only when the learner hasn't
 * reached that many items yet (a brand-new learner still gets the entry topics, all maximally weak).
 */
export function buildGrammarTrainer(
  content: GrammarContent,
  progress: ProgressMap,
  seed: number,
  now: number,
  size: number = TRAINER_SIZE,
): GrammarItem[] {
  const studied = new Set(studiedTopics(content, progress).map((t) => t.id));
  const candidates = content.items.filter((i) => studied.has(i.topic));
  if (candidates.length === 0) return [];
  const perTopicCount = new Map<string, number>();
  for (const i of candidates) perTopicCount.set(i.topic, (perTopicCount.get(i.topic) ?? 0) + 1);
  const weightOf = (i: GrammarItem) =>
    topicWeight(progress, i.topic, now) / Math.max(1, perTopicCount.get(i.topic) ?? 1);
  return weightedSample(candidates, weightOf, makeRng(seed), size);
}

export interface TrainerFocus {
  topic: GrammarTopic;
  /** Mastery percent (0–100). */
  pct: number;
  /** True when below the "solid" threshold — rendered in the weak hue. */
  low: boolean;
}

/** The distinct topics a built queue touches, weakest-first — the intro's «в фокусе» chips. */
export function trainerFocus(
  content: GrammarContent,
  items: readonly GrammarItem[],
  progress: ProgressMap,
  limit = 4,
): TrainerFocus[] {
  const byId = new Map(content.topics.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: TrainerFocus[] = [];
  for (const i of items) {
    if (seen.has(i.topic)) continue;
    seen.add(i.topic);
    const topic = byId.get(i.topic);
    if (!topic) continue;
    out.push({ topic, pct: Math.round(topicMasteryPct(progress, i.topic) * 100), low: false });
  }
  for (const f of out) f.low = f.pct < 70;
  return out.sort((a, b) => a.pct - b.pct).slice(0, limit);
}

export interface TrainerReviewRow {
  topic: GrammarTopic;
  total: number;
  correct: number;
  /** Accuracy percent (0–100). */
  acc: number;
}

/**
 * Group a finished session's results by topic, keeping only topics with at least one miss, worst
 * accuracy first — the summary's «повторите» rows (each deep-links to the topic's rule). `results`
 * is aligned 1:1 with `items` (true = the item was answered correctly).
 */
export function trainerReview(
  content: GrammarContent,
  items: readonly GrammarItem[],
  results: readonly boolean[],
): TrainerReviewRow[] {
  const byId = new Map(content.topics.map((t) => [t.id, t]));
  const agg = new Map<string, { total: number; correct: number }>();
  items.forEach((item, idx) => {
    const a = agg.get(item.topic) ?? { total: 0, correct: 0 };
    a.total += 1;
    if (results[idx]) a.correct += 1;
    agg.set(item.topic, a);
  });
  const rows: TrainerReviewRow[] = [];
  for (const [topicId, { total, correct }] of agg) {
    if (correct >= total) continue; // no miss → nothing to review
    const topic = byId.get(topicId);
    if (!topic) continue;
    rows.push({ topic, total, correct, acc: Math.round((correct / total) * 100) });
  }
  return rows.sort((a, b) => a.acc - b.acc);
}
