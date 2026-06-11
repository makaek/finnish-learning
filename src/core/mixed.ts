/**
 * mixed.ts — the "Микс / добить уровень" session: a single run that interleaves exercises from
 * EVERY word & sentence mode (recognition / production / say / listen), restricted to the items
 * the learner has NOT yet mastered IN THAT MODE at the current level. Reading is excluded on
 * purpose — this mode exists to clear the level's per-mode leftovers so the balance gate opens
 * and the level can advance.
 *
 * PURE: no UI/DB imports. Builds the same per-card question shapes the dedicated modes use, tagged
 * with the track each answer should record against, so App can route every question to the right
 * card + progress kind without re-deriving anything.
 */

import type { VocabItem } from "./dictionary";
import type { SentenceItem } from "./grader";
import { buildQuestion, makeRng, shuffle, DEFAULT_OPTION_COUNT, type RecognitionQuestion } from "./quiz";
import type { ProductionQuestion } from "./produce";
import type { SentenceQuestion } from "./sentenceSession";
import { getProgress, type ProgressMap } from "./progress";
import { levelOf, LEARNED_BOX } from "./levels";

/** The word modes the mix can draw (NOT reading). */
export const WORD_MIX_MODES = ["recognition", "production", "say_word", "listen_word"] as const;
/** The sentence modes the mix can draw (NOT reading). */
export const SENTENCE_MIX_MODES = ["sentences", "say_sentence", "listen_sentence"] as const;

/** How many questions one mix run holds (a bit longer than a normal lesson — it's a clean-up run). */
export const MIX_SESSION_SIZE = 12;

/**
 * One mix question, tagged so the UI knows which card to render and which track to record.
 *  - `card` picks the component (recognition / production / sentence);
 *  - `kind` is the progress track the answer updates (e.g. "say_word");
 *  - `voice`/`listen` flag the spoken / dictation variants of the typed cards.
 */
export type MixQuestion =
  | { card: "recognition"; kind: "recognition"; q: RecognitionQuestion }
  | {
      card: "production";
      kind: "production" | "say_word" | "listen_word";
      voice: boolean;
      listen: boolean;
      q: ProductionQuestion;
    }
  | {
      card: "sentence";
      kind: "sentences" | "say_sentence" | "listen_sentence";
      voice: boolean;
      listen: boolean;
      q: SentenceQuestion;
    };

/**
 * Build a mix run for `level`: one task per (item, mode) pair that's still below mastery, drawn
 * from the in-play pools the caller already gated (unlocked, non-hidden; sentences also word-gated).
 * Tasks are ordered weakest-box-first (so the least-known leftovers surface first), with a seeded
 * shuffle breaking ties, then capped to `size`. Deterministic for a given `seed`.
 *
 * `vocab` is also used as the distractor pool for recognition questions, so options stay varied
 * even when only a few words remain.
 *
 * NOTE: this intentionally ignores the home leader-PAUSE — a "paused" mode is a runaway leader
 * (high mastery), so its few stray leftovers are exactly what a clean-up run should finish off;
 * pausing only blocks STARTING that mode directly, not closing it out via the mix.
 *
 * `exclude` drops whole modes from the run — used for the OFFLINE locks (say_* needs the cloud
 * recognizer; listen_* needs a TTS voice), so an offline mix only contains answerable tasks.
 */
export function buildMixedSession(
  vocab: readonly VocabItem[],
  sentences: readonly SentenceItem[],
  progress: ProgressMap,
  level: number,
  seed: number,
  size: number = MIX_SESSION_SIZE,
  exclude?: ReadonlySet<string>,
): MixQuestion[] {
  const qRng = makeRng(seed);
  const tasks: { box: number; q: MixQuestion }[] = [];

  for (const v of vocab) {
    if (levelOf(v) !== level) continue;
    for (const kind of WORD_MIX_MODES) {
      if (exclude?.has(kind)) continue;
      const box = getProgress(progress, kind, v.id).box;
      if (box >= LEARNED_BOX) continue;
      const q: MixQuestion =
        kind === "recognition"
          ? { card: "recognition", kind, q: buildQuestion(v, vocab, qRng, DEFAULT_OPTION_COUNT) }
          : {
              card: "production",
              kind,
              voice: kind === "say_word",
              listen: kind === "listen_word",
              q: { itemId: v.id, promptRu: v.ru, answerFi: v.fi },
            };
      tasks.push({ box, q });
    }
  }

  for (const s of sentences) {
    if (levelOf(s) !== level) continue;
    for (const kind of SENTENCE_MIX_MODES) {
      if (exclude?.has(kind)) continue;
      const box = getProgress(progress, kind, s.id).box;
      if (box >= LEARNED_BOX) continue;
      tasks.push({
        box,
        q: {
          card: "sentence",
          kind,
          voice: kind === "say_sentence",
          listen: kind === "listen_sentence",
          q: { id: s.id, promptRu: s.ru, fi: s.canonical },
        },
      });
    }
  }

  // Shuffle first (random tie-break), then stable-sort by box so the weakest leftovers lead.
  return shuffle(tasks, makeRng(seed ^ 0x9e3779b9))
    .sort((a, b) => a.box - b.box)
    .slice(0, Math.min(size, tasks.length))
    .map((t) => t.q);
}
