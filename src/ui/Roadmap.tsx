/**
 * Roadmap.tsx — the home screen: the streak strip, the CEFR meter, the balance ring (the single
 * exercise entry point), and the weak-link / Микс action cards. Pure presentation over `levels.ts`
 * + `balance.ts`; all gating logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeVocab,
  eligibleSentences,
  hasComprehensionQuiz,
  levelCompletionStats,
  levelModeStats,
  levelOf,
  levelProgressToNext,
  masteringLevelGated,
  readingMastered,
  unmasteredInLevel,
  type SentenceLike,
  type VocabLike,
} from "../core/levels";
import { computeBalance, type ModeInput } from "../core/balance";
import { cefrProgress, cefrOfLevel, CEFR_ORDER } from "../core/curriculum";
import { BAND_NAMES } from "../core/levelTitles";
import CefrMeter, { type CefrBand, type CefrState } from "./CefrMeter";
import type { ProgressMap } from "../core/progress";
import {
  currentStreak,
  dateKey,
  goalMet,
  todayAccuracy,
  todayLessons,
  DAILY_LESSONS_GOAL,
  type UserState,
} from "../core/daily";
import { hiddenKey } from "./hidden";
import BalanceRing, { ModeIcon, RingLegend, type IconName, type RingMode } from "./BalanceRing";
import { UiIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";

/** Russian plural for "день" (streak headline): 1 день · 2–4 дня · 5+ дней (11–14 → дней). */
function dayWord(n: number): string {
  const t = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 14) return "дней";
  if (t === 1) return "день";
  if (t >= 2 && t <= 4) return "дня";
  return "дней";
}

/** UI label + monoline icon key for each ring spoke, keyed by the `LevelModeStat.id` core produces.
 *  The core supplies the per-level {mastered,total,group}; the Roadmap owns the presentation. Icon
 *  keys map to BalanceRing's ICONS (eye|keyboard|mic|phones|book|masks). Both typed-answer modes
 *  (word spelling + sentence translation) use `keyboard` — same mechanic, same glyph. */
const RING_MODES: Record<string, { label: string; icon: IconName }> = {
  recognition: { label: "Узнавание", icon: "eye" },
  production: { label: "Письмо", icon: "keyboard" },
  say_word: { label: "Речь", icon: "mic" },
  listen_word: { label: "На слух", icon: "phones" },
  sentences: { label: "Перевод", icon: "keyboard" },
  say_sentence: { label: "Речь", icon: "mic" },
  listen_sentence: { label: "На слух", icon: "phones" },
  "read:text": { label: "Тексты", icon: "book" },
  "read:dialog": { label: "Диалоги", icon: "masks" },
};

/** The four CEFR bands for the meter rail (3 levels each: A1.1=1–3 … A2=10–12). */
const BANDS: CefrBand[] = CEFR_ORDER.map((id) => ({ id, ru: BAND_NAMES[id], levels: 3 }));

export type Mode =
  | "recognition"
  | "production"
  | "sentences"
  | "say_word"
  | "say_sentence"
  | "listen_word"
  | "listen_sentence"
  // The mixed "добить уровень" run — interleaves the modes above for current-level leftovers.
  // Not a ring spoke and not a progress track of its own; each question records its own kind.
  | "mix";

/** Reading library entry the home grid needs (real ReadingText satisfies it). */
export interface ReadingLike extends VocabLike {
  type?: "text" | "dialog";
}

interface RoadmapProps {
  vocab: readonly VocabLike[];
  sentences: readonly SentenceLike[];
  /** Reading texts/dialogs (levelled) — folded into level completion AND the Чтение home cards. */
  texts: readonly ReadingLike[];
  progress: ProgressMap;
  daily: UserState;
  /** Items hidden from lessons — excluded from the per-mode readiness pools. */
  hidden: ReadonlySet<string>;
  testMode: boolean;
  ready: boolean;
  onStart: (mode: Mode) => void;
  /** Open the reading library, filtered to texts or dialogs. */
  onOpenReading: (type: "text" | "dialog") => void;
  /** Open the Метрики screen (the streak strip taps through to it). */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

export default function Roadmap({
  vocab,
  sentences,
  texts,
  progress,
  daily,
  hidden,
  testMode,
  ready,
  onStart,
  onOpenReading,
  onShowStats,
  onTestFill,
}: RoadmapProps) {
  // "Current level" is the level being completed (lowest not fully done), shown with a smooth
  // learn-progress bar — not the unlocked frontier, which jumped the bar to ~0% on every unlock.
  // Completion now spans words + sentences + dialogs/texts, so finishing a level's phrases and
  // dialogs fills the bar and advances the level. (Unlocks stay word-driven, so nothing relocks.)
  const { active, balance } = useMemo(() => {
    // Gated current level: advances only once a level is both learned-enough AND balanced across
    // every mode (the Кольцо-баланса gate). Content unlocks stay word-driven, so nothing relocks.
    const a = masteringLevelGated(vocab, sentences, texts, progress);
    // The ring/gate are driven by CURRENT-LEVEL mastery: per mode, items mastered (box ≥
    // LEARNED_BOX) over the items that mode drills at level `a`. Core gives {mastered,total,group};
    // the Roadmap attaches the label/icon. The ring itself is now the level-progress display
    // (center = level, dashed ceiling = the gate), so the old header level bar is gone.
    const modes: ModeInput[] = levelModeStats(vocab, sentences, texts, progress, a).map((m) => ({
      ...m,
      label: RING_MODES[m.id]?.label ?? m.id,
      icon: RING_MODES[m.id]?.icon ?? "•",
    }));
    return {
      active: a,
      balance: computeBalance(modes, a),
    };
  }, [vocab, sentences, texts, progress]);

  // Per-mode "finish" counts: current-level items still unmastered in each mode (box below
  // LEARNED_BOX) — what each spoke still has to drill. Feeds the ring badges and the Микс CTA count.
  // Words/sentences use the hidden/eligibility-filtered pools (matching what a tap actually opens);
  // reading uses the full two-part mastery (quiz + recite), matching the recite-aware ring/gate.
  const finish = useMemo(() => {
    const wordPool = activeVocab(vocab, progress, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sentPool = eligibleSentences(sentences, vocab, progress, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    const textPool = texts.filter((t) => t.type !== "dialog");
    const dialogPool = texts.filter((t) => t.type === "dialog");
    const readingLeft = (pool: readonly ReadingLike[]) =>
      pool.filter(
        (t) => levelOf(t) === active && !readingMastered(progress, t.id, hasComprehensionQuiz(t)),
      ).length;
    return {
      recognition: unmasteredInLevel(wordPool, progress, "recognition", active),
      production: unmasteredInLevel(wordPool, progress, "production", active),
      say_word: unmasteredInLevel(wordPool, progress, "say_word", active),
      listen_word: unmasteredInLevel(wordPool, progress, "listen_word", active),
      sentences: unmasteredInLevel(sentPool, progress, "sentences", active),
      say_sentence: unmasteredInLevel(sentPool, progress, "say_sentence", active),
      listen_sentence: unmasteredInLevel(sentPool, progress, "listen_sentence", active),
      text: readingLeft(textPool),
      dialog: readingLeft(dialogPool),
    };
  }, [vocab, sentences, texts, progress, testMode, hidden, active]);

  // CEFR milestone progress (A1 → A2 …) over combined per-level completion — feeds the meter.
  // Keep the combined stats around too, so the meter's current-cell % can read the active level's
  // progress toward advancing (levelProgressToNext) rather than the whole-band average.
  const { cefr, combinedStats } = useMemo(() => {
    const stats = levelCompletionStats(vocab, sentences, texts, progress);
    return { cefr: cefrProgress(stats), combinedStats: stats };
  }, [vocab, sentences, texts, progress]);

  // Current-level leftovers across every word & sentence mode (NOT reading) — the work the Микс
  // run would drill. Same per-mode `finish` counts the cards show, summed.
  const mixLeft =
    finish.recognition +
    finish.production +
    finish.say_word +
    finish.listen_word +
    finish.sentences +
    finish.say_sentence +
    finish.listen_sentence;

  // Per-spoke leftover counts for the ring badges, keyed by ModeInput.id. Sourced from `finish`
  // (the same hidden/eligibility-filtered counts the cards used), so a badge always matches what
  // tapping that spoke actually opens — not the raw level totals the ring colour/length use.
  const ringLeft: Record<string, number> = {
    recognition: finish.recognition,
    production: finish.production,
    say_word: finish.say_word,
    listen_word: finish.listen_word,
    sentences: finish.sentences,
    say_sentence: finish.say_sentence,
    listen_sentence: finish.listen_sentence,
    "read:text": finish.text,
    "read:dialog": finish.dialog,
  };

  // Ring spokes for the redesigned BalanceRing: fixed-orbit chips whose fill = mastery and badge =
  // items left. Built from the balance cells (ordered words→sent→read, so the group arcs are
  // contiguous); `remaining` uses the same hidden/eligibility-filtered counts the badges need.
  const ringModes: RingMode[] = balance.cells.map((c) => ({
    group: c.group,
    id: c.id,
    label: c.label,
    icon: c.icon as IconName,
    mastery: c.mastery,
    remaining: ringLeft[c.id] ?? Math.max(0, c.total - c.mastered),
  }));

  // CEFR meter state: the band + level-in-band from the gated current level, and a current-cell %
  // = how far the active level is toward advancing (reads ~100% right as the level rolls over).
  const cefrBandIdx = Math.max(0, CEFR_ORDER.indexOf(cefrOfLevel(active)));
  const cefrState: CefrState = {
    bandIdx: cefrBandIdx,
    levelInBand: active - cefrBandIdx * 3,
    pct: levelProgressToNext(combinedStats, active),
    nextId: cefr.nextBand ?? BANDS[cefrBandIdx]!.id,
  };

  // Single router shared by the ring spokes and the weak-link card (reading ids open the
  // library; the rest map 1:1 onto the Mode union the grid already starts).
  const startById = (id: string) => {
    if (id === "read:text") return onOpenReading("text");
    if (id === "read:dialog") return onOpenReading("dialog");
    return onStart(id as Mode);
  };

  const today = dateKey();
  const streak = currentStreak(daily, today);
  const lessons = todayLessons(daily, today);
  const accuracyPct = Math.round(todayAccuracy(daily, today) * 100);
  const goalReached = goalMet(daily, today);
  // Seven rolling dots (oldest → today). No per-day history is stored, so derive from the live
  // streak: the trailing `streak` qualifying days are "done"; today is "done" once its goal is met,
  // else shown in-progress; days before the streak run read as missed (faint).
  const pastDone = Math.max(0, goalReached ? streak - 1 : streak);
  const dots = Array.from({ length: 7 }, (_, p): "done" | "today" | "miss" => {
    const daysAgo = 6 - p;
    if (daysAgo === 0) return goalReached ? "done" : "today";
    return daysAgo <= pastDone ? "done" : "miss";
  });

  // Settings: a gear button that reveals the theme switcher (Авто / Светлая / Тёмная).
  const settings = (
    <details className="settings">
      <summary className="settings__btn" aria-label="Настройки" title="Настройки">
        <UiIcon name="gear" size={20} />
      </summary>
      <div className="settings__menu">
        <ThemeToggle />
      </div>
    </details>
  );

  const header = (
    <header className="home-head">
      <span className="home-wordmark">Финский</span>
      {settings}
    </header>
  );

  if (!ready) {
    return (
      <main className="app app--home">
        {header}
        <p className="hint">Загрузка прогресса…</p>
      </main>
    );
  }

  const weak = balance.weakest;

  return (
    <main className="app app--home">
      {header}

      {/* Streak / daily-goal strip — the "did I show up today" loop; tap → Метрики. */}
      <button type="button" className="mstrip" onClick={onShowStats} aria-label="Открыть метрики">
        <span className="mstrip__flame" aria-hidden="true">
          <UiIcon name="flame" size={24} />
        </span>
        <span className="mstrip__body">
          <span className="mstrip__title">
            {streak} {dayWord(streak)} подряд
          </span>
          <span className="mstrip__dots" aria-hidden="true">
            {dots.map((d, i) => (
              <span key={i} className={`mdot mdot--${d}`}>
                {d === "done" && <UiIcon name="check" size={11} strokeWidth={3} />}
                {d === "today" && <span className="mdot__pip" />}
              </span>
            ))}
          </span>
        </span>
        <span className="mstrip__goal">
          <span className="mstrip__lessons">
            {lessons}
            <small>/{DAILY_LESSONS_GOAL}</small>
          </span>
          <span className="mstrip__acc">сегодня · {accuracyPct}%</span>
        </span>
      </button>

      {/* CEFR meter — current step + a 12-level rail toward A2. */}
      <CefrMeter bands={BANDS} state={cefrState} />

      {/* Ring card — the fixed-orbit balance ring (fills the card) + the group/shape legend. */}
      <div className="ringcard">
        <BalanceRing level={active} modes={ringModes} shapes onPick={startById} />
        <RingLegend shapes />
      </div>

      {/* Two equal action cards: Слабое звено (gently leads via warm colour) + Микс. */}
      {(weak || mixLeft > 0) && (
        <div className="cta">
          {weak && (
            <button type="button" className="ctacard ctacard--weak" onClick={() => startById(weak.id)}>
              <span className="ctacard__top">
                <span className="ctacard__tile" aria-hidden="true">
                  <ModeIcon name={weak.icon as IconName} size={23} />
                </span>
                <span className="ctacard__play" aria-hidden="true">
                  <UiIcon name="play" size={15} strokeWidth={2.4} />
                </span>
              </span>
              <span className="ctacard__txt">
                <span className="ctacard__kicker">Рекомендуем</span>
                <span className="ctacard__title">Слабое звено</span>
                <span className="ctacard__sub">
                  {weak.label}
                  {(ringLeft[weak.id] ?? 0) > 0 ? ` · ещё ${ringLeft[weak.id]}` : ""}
                </span>
              </span>
            </button>
          )}
          {mixLeft > 0 && (
            <button type="button" className="ctacard ctacard--mix" onClick={() => onStart("mix")}>
              <span className="ctacard__top">
                <span className="ctacard__tile" aria-hidden="true">
                  <UiIcon name="shuffle" size={23} strokeWidth={1.85} />
                </span>
                <span className="ctacard__play" aria-hidden="true">
                  <UiIcon name="play" size={15} strokeWidth={2.4} />
                </span>
              </span>
              <span className="ctacard__txt">
                <span className="ctacard__kicker">В очереди · {mixLeft}</span>
                <span className="ctacard__title">Микс</span>
                <span className="ctacard__sub">всё, что осталось</span>
              </span>
            </button>
          )}
        </div>
      )}

      {testMode && (
        <div className="testbar">
          <p className="hint hint--test">🔧 Тестовый режим: все уровни открыты</p>
          <button type="button" className="option" onClick={onTestFill}>
            Засчитать всё выученным
          </button>
        </div>
      )}
    </main>
  );
}
