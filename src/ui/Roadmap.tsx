/**
 * Roadmap.tsx — the home screen: overall progress, the level ladder (locked/active/done),
 * and the exercise picker. Pure presentation over `levels.ts` computations; all gating
 * logic lives in core, so this component only maps stats to markup.
 */

import { useMemo } from "react";
import {
  activeVocab,
  eligibleSentences,
  levelCompletionStats,
  levelModeStats,
  levelOf,
  masteringLevelGated,
  overallProgress,
  readingLearned,
  sentenceLearned,
  unmasteredInLevel,
  wordLearned,
  LEARNED_BOX,
  type SentenceLike,
  type VocabLike,
} from "../core/levels";
import { groupReadiness, type ModeReadiness } from "../core/stats";
import { computeBalance, type ModeInput } from "../core/balance";
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
import BalanceRing from "./BalanceRing";
import ThemeToggle from "./ThemeToggle";

/** UI label + icon for each ring spoke, keyed by the `LevelModeStat.id` core produces. The core
 *  supplies the per-level {mastered,total,group}; the Roadmap owns the (Russian) presentation. */
const RING_MODES: Record<string, { label: string; icon: string }> = {
  recognition: { label: "Узнавание", icon: "👁" },
  production: { label: "Написание", icon: "✍️" },
  say_word: { label: "Речь", icon: "🎤" },
  listen_word: { label: "На слух", icon: "🎧" },
  sentences: { label: "Перевод", icon: "💬" },
  say_sentence: { label: "Речь", icon: "🎤" },
  listen_sentence: { label: "На слух", icon: "🎧" },
  "read:text": { label: "Тексты", icon: "📖" },
  "read:dialog": { label: "Диалоги", icon: "🎭" },
};

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
  /** Open the read-only progress-details screen (also reachable from the bottom nav). */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

/** One exercise button: icon + short label, a top-left count of current-level items still
 *  unmastered IN THIS MODE, and a continuous readiness bar (which replaced the traffic-light dot). */
function ModeButton({
  icon,
  label,
  name,
  r,
  modeLeft,
  paused = false,
  onClick,
}: {
  icon: string;
  label: string;
  /** Full accessible name (the short visible `label` repeats across groups). */
  name: string;
  r: ModeReadiness;
  /** Current-level items still unmastered in THIS mode (box below LEARNED_BOX). */
  modeLeft: number;
  /** Runaway leader: ran too far ahead of its group → paused (greyed, not startable). */
  paused?: boolean;
  onClick: () => void;
}) {
  const freshness =
    r.level === "green"
      ? "в форме"
      : r.level === "yellow"
        ? "пора повторить"
        : r.level === "red"
          ? "заброшено"
          : "пока нечего учить";
  const leftHint = modeLeft > 0 ? ` · ещё ${modeLeft} в этом режиме на текущем уровне` : "";
  const status = paused
    ? "на паузе — сначала подтяни отстающие режимы"
    : (r.level === "none" ? "пока нечего учить" : `освоено ${r.mastered} из ${r.total} · ${freshness}`) +
      leftHint;
  return (
    <button
      type="button"
      className={`modebtn${paused ? " modebtn--paused" : ""}`}
      aria-label={`${name}: ${status}`}
      aria-disabled={paused || undefined}
      // Keep the leader focusable for its explanatory label, but a no-op so it can't be started.
      onClick={paused ? undefined : onClick}
    >
      {/* Top-left: current-level items still unmastered in this specific mode. */}
      {modeLeft > 0 && !paused && (
        <span
          className="modebtn__count"
          aria-hidden="true"
          title={`Не освоено в этом режиме на текущем уровне: ${modeLeft}`}
        >
          {modeLeft}
        </span>
      )}
      {paused && (
        <span className="modebtn__lock" aria-hidden="true" title={status}>
          🔒
        </span>
      )}
      <span className="modebtn__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="modebtn__label">{label}</span>
      {/* Continuous recency standing vs the freshest mode, so a little practice visibly moves it. */}
      <span className="modebtn__bar" aria-hidden="true" title={status}>
        <span
          className={`modebtn__fill modebtn__fill--${r.level}`}
          style={{ width: `${Math.round(r.ratio * 100)}%` }}
        />
      </span>
    </button>
  );
}

/** Section heading with the count of current-level items in this group still moving the level bar
 *  (not yet learned in any mode). The count lives here, not per card, because it's the same across
 *  a group's modes. */
function GroupTitle({ title, left }: { title: string; left: number }) {
  return (
    <h3 className="modegroup__title">
      {title}
      {left > 0 && (
        <span className="modegroup__count" title="Осталось освоить на этом уровне">
          {" "}
          ({left})
        </span>
      )}
    </h3>
  );
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
  const { active, overall, balance, maxLevel, nextLevel } = useMemo(() => {
    const s = levelCompletionStats(vocab, sentences, texts, progress);
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
      overall: overallProgress(vocab, progress),
      balance: computeBalance(modes, a),
      maxLevel: s[s.length - 1]?.level ?? a,
      // The real next level from the data — level numbers aren't guaranteed contiguous, so don't
      // assume a+1 (a content gap would mislabel the gate hint).
      nextLevel: s.find((x) => x.level > a)?.level ?? a,
    };
  }, [vocab, sentences, texts, progress]);

  // Per-mode readiness, RELATIVE within each group (words / sentences) so the bar flags which mode
  // is lagging behind the others. Two count families:
  //   - `finish`: per-CARD count of current-level items still unmastered IN THAT MODE (box below
  //     LEARNED_BOX) — what the card itself still has to drill.
  //   - `groupLeft`: per-GROUP count of current-level items not yet LEARNED (in ANY mode) — the
  //     items still moving the level bar. Shown once on the section heading (the per-mode card
  //     counts duplicate across a group, but the bar advances on any-mode learned).
  const { readiness, finish, groupLeft } = useMemo(() => {
    const wordPool = activeVocab(vocab, progress, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sentPool = eligibleSentences(sentences, vocab, progress, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    // Reading is gated only by level, not hidden/eligibility; split by type for the two cards.
    const textPool = texts.filter((t) => t.type !== "dialog");
    const dialogPool = texts.filter((t) => t.type === "dialog");
    const wordModes = ["recognition", "production", "say_word", "listen_word"] as const;
    const sentModes = ["sentences", "say_sentence", "listen_sentence"] as const;
    const w = groupReadiness(wordPool, progress, wordModes, LEARNED_BOX);
    const s = groupReadiness(sentPool, progress, sentModes, LEARNED_BOX);
    const rText = groupReadiness(textPool, progress, ["reading"], LEARNED_BOX);
    const rDialog = groupReadiness(dialogPool, progress, ["reading"], LEARNED_BOX);
    // Group totals: count over the raw level lists (not the hidden/eligibility pools) so they track
    // the bar's learned/total maths exactly. Reading group = texts + dialogs combined.
    const words = vocab.filter((v) => levelOf(v) === active && !wordLearned(progress, v.id)).length;
    const sents = sentences.filter(
      (x) => levelOf(x) === active && !sentenceLearned(progress, x.id),
    ).length;
    const reading = texts.filter(
      (t) => levelOf(t) === active && !readingLearned(progress, t.id),
    ).length;
    return {
      readiness: {
        recognition: w.get("recognition")!,
        production: w.get("production")!,
        say_word: w.get("say_word")!,
        listen_word: w.get("listen_word")!,
        sentences: s.get("sentences")!,
        say_sentence: s.get("say_sentence")!,
        listen_sentence: s.get("listen_sentence")!,
        text: rText.get("reading")!,
        dialog: rDialog.get("reading")!,
      },
      finish: {
        recognition: unmasteredInLevel(wordPool, progress, "recognition", active),
        production: unmasteredInLevel(wordPool, progress, "production", active),
        say_word: unmasteredInLevel(wordPool, progress, "say_word", active),
        listen_word: unmasteredInLevel(wordPool, progress, "listen_word", active),
        sentences: unmasteredInLevel(sentPool, progress, "sentences", active),
        say_sentence: unmasteredInLevel(sentPool, progress, "say_sentence", active),
        listen_sentence: unmasteredInLevel(sentPool, progress, "listen_sentence", active),
        text: unmasteredInLevel(textPool, progress, "reading", active),
        dialog: unmasteredInLevel(dialogPool, progress, "reading", active),
      },
      groupLeft: { words, sentences: sents, reading },
    };
  }, [vocab, sentences, texts, progress, testMode, hidden, active]);

  // Leader modes that have run too far ahead of their group are paused (not startable) — the
  // anti-grind nudge. The ring greys them itself; we also gate the grid buttons below.
  const pausedModes = new Set(balance.cells.filter((c) => c.paused).map((c) => c.id));

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
  const goalPct = Math.min(100, Math.round((lessons / DAILY_LESSONS_GOAL) * 100));
  const goalReached = goalMet(daily, today);

  const settings = (
    <details className="settings">
      <summary className="settings__btn" aria-label="Настройки" title="Настройки">
        ⚙️
      </summary>
      <div className="settings__menu">
        <ThemeToggle />
      </div>
    </details>
  );

  if (!ready) {
    return (
      <main className="app app--home">
        <section className="card card--summary">
          {settings}
          <h1 className="prompt">Финский тренажёр</h1>
          <p className="hint">Загрузка прогресса…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app app--home">
      <section className="card card--summary">
        {settings}
        <h1 className="prompt prompt--home">Финский тренажёр</h1>

        {/* Кольцо баланса — the hero signal: every mode at once, tap a spoke to start it.
            Interactive, so it sits as a sibling of (never nested in) the ghead button. */}
        <BalanceRing balance={balance} onPick={startById} />

        <div className="bstats">
          <div className="bstat">
            <div className="bstat__v">
              {balance.score}
              <small>%</small>
            </div>
            <div className="bstat__l">баланс</div>
          </div>
          <div className="bstats__sep" />
          <div className="bstat">
            <div className="bstat__v">
              {overall.learned}
              <small>/{overall.total}</small>
            </div>
            <div className="bstat__l">слов выучено</div>
          </div>
        </div>

        {balance.weakest && (
          <button
            type="button"
            className="weaklink"
            onClick={() => startById(balance.weakest!.id)}
          >
            <span className="weaklink__icon" aria-hidden="true">
              {balance.weakest.icon}
            </span>
            <span className="weaklink__body">
              <span className="weaklink__kicker">Слабое звено</span>
              <span className="weaklink__title">{balance.weakest.label}</span>
              <span className="weaklink__sub">тянет уровень вниз</span>
            </span>
            <span className="weaklink__go" aria-hidden="true">
              ▶
            </span>
          </button>
        )}

        {balance.weakest && active < maxLevel && (
          <span className="bgate">
            🔒 До <b>уровня {nextLevel}</b> — выровняй кольцо. Уровень растёт по самому слабому
            режиму.
          </span>
        )}

        {/* Микс — добить уровень: one run over every word/sentence mode's current-level leftovers
            (no reading), so the ring evens out and the level can advance. Shown only when there's
            something left to clear. */}
        {mixLeft > 0 && (
          <button type="button" className="mixbtn" onClick={() => onStart("mix")}>
            <span className="mixbtn__icon" aria-hidden="true">🧩</span>
            <span className="mixbtn__body">
              <span className="mixbtn__title">Микс — добить уровень</span>
              <span className="mixbtn__sub">всё подряд из не освоенного · осталось {mixLeft}</span>
            </span>
            <span className="mixbtn__go" aria-hidden="true">▶</span>
          </button>
        )}

        {/* Streak / daily-goal bar — the "did I show up today" loop. The level, words, and level
            bar moved to the ring above, so this is all that remains here. Tap → мой прогресс. */}
        <button
          type="button"
          className="ghead ghead--slim"
          onClick={onShowStats}
          aria-label="Открыть мой прогресс"
        >
          <span className="ghead__more" aria-hidden="true">
            📊&nbsp;›
          </span>
          <span className="ghead__bar">
            <span className="ghead__fill ghead__fill--daily" style={{ width: `${goalPct}%` }} />
          </span>
          <span className="ghead__caption">
            🔥 {streak} ·{" "}
            {goalReached
              ? "цель выполнена! 🎉"
              : `сегодня ${lessons}/${DAILY_LESSONS_GOAL} · ${accuracyPct}%`}
          </span>
        </button>

        {testMode && (
          <div className="testbar">
            <p className="hint hint--test">🔧 Тестовый режим: все уровни открыты</p>
            <button type="button" className="option" onClick={onTestFill}>
              Засчитать всё выученным
            </button>
          </div>
        )}

        <div className="modegroup">
          <GroupTitle title="Слова" left={groupLeft.words} />
          <div className="modegroup__row">
            <ModeButton
              icon="👁"
              label="Узнавание"
              name="Узнавание слов"
              r={readiness.recognition}
              modeLeft={finish.recognition}
              paused={pausedModes.has("recognition")}
              onClick={() => onStart("recognition")}
            />
            <ModeButton
              icon="✍️"
              label="Написание"
              name="Написание слов"
              r={readiness.production}
              modeLeft={finish.production}
              paused={pausedModes.has("production")}
              onClick={() => onStart("production")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение слов"
              r={readiness.say_word}
              modeLeft={finish.say_word}
              paused={pausedModes.has("say_word")}
              onClick={() => onStart("say_word")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование слов"
              r={readiness.listen_word}
              modeLeft={finish.listen_word}
              paused={pausedModes.has("listen_word")}
              onClick={() => onStart("listen_word")}
            />
          </div>
        </div>
        <div className="modegroup">
          <GroupTitle title="Предложения" left={groupLeft.sentences} />
          <div className="modegroup__row">
            <ModeButton
              icon="💬"
              label="Перевод"
              name="Перевод предложений"
              r={readiness.sentences}
              modeLeft={finish.sentences}
              paused={pausedModes.has("sentences")}
              onClick={() => onStart("sentences")}
            />
            <ModeButton
              icon="🎤"
              label="Речь"
              name="Произношение предложений"
              r={readiness.say_sentence}
              modeLeft={finish.say_sentence}
              paused={pausedModes.has("say_sentence")}
              onClick={() => onStart("say_sentence")}
            />
            <ModeButton
              icon="🎧"
              label="На слух"
              name="Аудирование предложений"
              r={readiness.listen_sentence}
              modeLeft={finish.listen_sentence}
              paused={pausedModes.has("listen_sentence")}
              onClick={() => onStart("listen_sentence")}
            />
          </div>
        </div>
        <div className="modegroup">
          <GroupTitle title="Чтение" left={groupLeft.reading} />
          <div className="modegroup__row">
            <ModeButton
              icon="📖"
              label="Тексты"
              name="Чтение текстов"
              r={readiness.text}
              modeLeft={finish.text}
              paused={pausedModes.has("read:text")}
              onClick={() => onOpenReading("text")}
            />
            <ModeButton
              icon="🎭"
              label="Диалоги"
              name="Чтение диалогов"
              r={readiness.dialog}
              modeLeft={finish.dialog}
              paused={pausedModes.has("read:dialog")}
              onClick={() => onOpenReading("dialog")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
