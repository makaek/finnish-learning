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
  levelCompletionProgress,
  levelCompletionStats,
  levelModeStats,
  levelOf,
  masteringLevelGated,
  readingMastered,
  unmasteredInLevel,
  type SentenceLike,
  type VocabLike,
} from "../core/levels";
import { computeBalance, type ModeInput } from "../core/balance";
import { grammarStats, mandatoryGrammarTopic, type GrammarContent } from "../core/grammar";
import { cefrProgress, cefrOfLevel, CEFR_ORDER, cefrBandSizes } from "../core/curriculum";
import { bandName } from "../data/levelTitles";
import CefrMeter, { type CefrBand, type CefrState } from "./CefrMeter";
import type { ProgressMap } from "../core/progress";
import {
  currentStreak,
  dateKey,
  goalMet,
  type UserState,
} from "../core/daily";
import { hiddenKey } from "./hidden";
import BalanceRing, { ModeIcon, RingLegend, type IconName, type RingMode } from "./BalanceRing";
import { UiIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import type { LangId } from "../data/languages/types";

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
  grammar: { label: "Грамматика", icon: "pen" },
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
  /** Grammar-mode curriculum (empty topics ⇒ no gram spoke / action card). */
  grammar: GrammarContent;
  progress: ProgressMap;
  daily: UserState;
  /** Items hidden from lessons — excluded from the per-mode readiness pools. */
  hidden: ReadonlySet<string>;
  testMode: boolean;
  ready: boolean;
  /** Home wordmark for the active target language ("Финский" / "Английский"). */
  brand: string;
  /** Active target language + its setter, for the in-settings language switch. */
  lang: LangId;
  /** Mode ids unavailable right now (offline locks) — rendered locked, never routed to. */
  locked: ReadonlySet<string>;
  onChangeLang: (lang: LangId) => void;
  onStart: (mode: Mode) => void;
  /** Open the reading library, filtered to texts or dialogs. */
  onOpenReading: (type: "text" | "dialog") => void;
  /** Open the grammar topic map (optionally deep-linked into a topic's lesson). */
  onOpenGrammar: (topicId?: string) => void;
  /** Open the Метрики screen (the streak strip taps through to it). */
  onShowStats: () => void;
  /** Test-mode only: mark everything mastered, to exercise unlocks without grinding. */
  onTestFill: () => void;
}

export default function Roadmap({
  vocab,
  sentences,
  texts,
  grammar,
  progress,
  daily,
  hidden,
  testMode,
  ready,
  brand,
  lang,
  locked,
  onChangeLang,
  onStart,
  onOpenReading,
  onOpenGrammar,
  onShowStats,
  onTestFill,
}: RoadmapProps) {
  // The four CEFR bands for the meter rail (3 levels each). Recomputed per language so the band
  // names follow the active pack (bandName reads the active titles, set by App before this renders).
  // NB: cefrBandSizes() reflects the FINNISH curriculum (19 levels). The English pack has fewer
  // levels but shares this CEFR mapping, so its meter rail over-counts cells — a pre-existing
  // approximation (English CEFR banding is rough until English gets its own curriculum). Finnish,
  // the focus here, is exact.
  const bands = useMemo<CefrBand[]>(
    () => cefrBandSizes().map(({ band, levels }) => ({ id: band, ru: bandName(band), levels })),
    // `lang` isn't read in the body, but bandName() reads the active titles that App swaps on a
    // language change — so `lang` is the (only) correct trigger to recompute the band labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  // "Current level" is the level being completed (lowest not fully done), shown with a smooth
  // learn-progress bar — not the unlocked frontier, which jumped the bar to ~0% on every unlock.
  // Completion now spans words + sentences + dialogs/texts, so finishing a level's phrases and
  // dialogs fills the bar and advances the level. (Unlocks stay word-driven, so nothing relocks.)
  const { active, balance } = useMemo(() => {
    // Gated current level: advances only once a level is both learned-enough AND balanced across
    // every mode (the Кольцо-баланса gate) — grammar topics now count as a 10th mode, so a level
    // also requires its grammar mastered. Content unlocks stay word-driven, so nothing relocks.
    const a = masteringLevelGated(vocab, sentences, texts, progress, grammar.topics);
    // The ring/gate are driven by CURRENT-LEVEL mastery: per mode, items mastered (box ≥
    // LEARNED_BOX) over the items that mode drills at level `a`. Core gives {mastered,total,group};
    // the Roadmap attaches the label/icon. The ring itself is now the level-progress display
    // (center = level, dashed ceiling = the gate), so the old header level bar is gone.
    const modes: ModeInput[] = levelModeStats(vocab, sentences, texts, progress, a, grammar.topics).map(
      (m) => ({
        ...m,
        label: RING_MODES[m.id]?.label ?? m.id,
        icon: RING_MODES[m.id]?.icon ?? "•",
      }),
    );
    return {
      active: a,
      balance: computeBalance(modes, a),
    };
  }, [vocab, sentences, texts, grammar.topics, progress]);

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
  const cefr = useMemo(
    () => cefrProgress(levelCompletionStats(vocab, sentences, texts, progress, grammar.topics)),
    [vocab, sentences, texts, grammar.topics, progress],
  );

  // Current-level leftovers across every word & sentence mode (NOT reading) — the work the Микс
  // run would drill. Same per-mode `finish` counts the cards show, summed — minus offline-locked
  // modes, so the badge matches what the (exclude-filtered) mix actually contains.
  const MIX_KINDS = [
    "recognition", "production", "say_word", "listen_word",
    "sentences", "say_sentence", "listen_sentence",
  ] as const;
  const mixLeft = MIX_KINDS.filter((k) => !locked.has(k)).reduce((sum, k) => sum + finish[k], 0);

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

  // Grammar action-card rollup. The deep-link target is LEVEL-ANCHORED: the weakest startable
  // topic at the gated current level (what's blocking the next level), falling forward to the
  // next level with work and to undefined (→ open the map) when everything reachable is mastered.
  const gram = useMemo(() => grammarStats(grammar.topics, progress), [grammar.topics, progress]);
  const gramNext = useMemo(
    () => mandatoryGrammarTopic(grammar.topics, progress, active),
    [grammar.topics, progress, active],
  );

  // Ring spokes for the redesigned BalanceRing: fixed-orbit chips whose fill = mastery and badge =
  // items left. Built from the balance cells (ordered words→sent→read→gram, so the group arcs are
  // contiguous); `remaining` uses the same hidden/eligibility-filtered counts the badges need
  // (grammar has no hidden/eligibility filter — its cell counts are already what a tap opens).
  const ringModes: RingMode[] = balance.cells.map((c) => ({
    group: c.group,
    id: c.id,
    label: c.label,
    icon: c.icon as IconName,
    mastery: c.mastery,
    remaining: ringLeft[c.id] ?? Math.max(0, c.total - c.mastered),
    locked: locked.has(c.id),
  }));

  // CEFR meter state: the band + level-in-band from the gated current level, and a current-cell %
  // = how far the active level is toward advancing (reads ~100% right as the level rolls over).
  const cefrBandIdx = Math.max(0, CEFR_ORDER.indexOf(cefrOfLevel(active)));
  const cefrState: CefrState = {
    bandIdx: cefrBandIdx,
    levelInBand: active - cefrBandIdx * 3,
    // Same unified completion % the Levels screen shows, so the two never disagree (reads 100%
    // exactly when the level advances, bottlenecked by whichever of learned-breadth / balance lags).
    pct: levelCompletionProgress(vocab, sentences, texts, progress, active, grammar.topics),
    nextId: cefr.nextBand ?? bands[cefrBandIdx]!.id,
  };

  // Single router shared by the ring spokes and the weak-link card (reading ids open the
  // library; the rest map 1:1 onto the Mode union the grid already starts).
  const startById = (id: string) => {
    if (id === "read:text") return onOpenReading("text");
    if (id === "read:dialog") return onOpenReading("dialog");
    if (id === "grammar") return onOpenGrammar(gramNext?.id);
    return onStart(id as Mode);
  };

  const today = dateKey();
  const streak = currentStreak(daily, today);
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

  // Settings: a gear button that reveals the language switch (🇫🇮 / 🇬🇧) and the theme switcher.
  const settings = (
    <details className="settings">
      <summary className="settings__btn" aria-label="Настройки" title="Настройки">
        <UiIcon name="gear" size={20} />
      </summary>
      <div className="settings__menu">
        <span className="settings__label">Язык</span>
        <LanguageToggle value={lang} onChange={onChangeLang} />
        <span className="settings__label">Тема</span>
        <ThemeToggle />
      </div>
    </details>
  );

  // Streak chip (design_handoff_streak_header «Вариант 2»): flame tile · streak count · divider ·
  // 7 week-dots, centred between the wordmark and the gear. The week strip reuses the same `dots`
  // model as the goal block below; the check sits only on today's dot (last) when it's done.
  const streakChip = (
    <button
      type="button"
      className="streakchip"
      onClick={onShowStats}
      aria-label={`Серия ${streak} ${dayWord(streak)} — открыть метрики`}
    >
      <span className="streakchip__flame" aria-hidden="true">
        <UiIcon name="flame" size={18} />
      </span>
      <span className="streakchip__num">{streak}</span>
      <span className="streakchip__divider" aria-hidden="true" />
      <span className="streakchip__week" aria-hidden="true">
        {dots.map((d, i) => (
          <span key={i} className={`scdot scdot--${d}`}>
            {d === "done" && i === dots.length - 1 && <UiIcon name="check" size={8} strokeWidth={3.4} />}
          </span>
        ))}
      </span>
    </button>
  );

  const header = (
    <header className="home-head">
      <span className="home-wordmark">{brand}</span>
      <span className="home-head__spacer" aria-hidden="true" />
      {streakChip}
      <span className="home-head__spacer" aria-hidden="true" />
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

  // Weak-link routing target: the balance's weakest, unless it's offline-locked — then the
  // weakest UNLOCKED mode that still has work; the card hides when nothing qualifies. Pure
  // presentation routing — core/balance.ts stays connectivity-independent.
  const weakCandidates = balance.cells.filter(
    (c) => !locked.has(c.id) && (ringLeft[c.id] ?? Math.max(0, c.total - c.mastered)) > 0,
  );
  const weak =
    balance.weakest && !locked.has(balance.weakest.id)
      ? balance.weakest
      : weakCandidates.reduce<(typeof weakCandidates)[number] | null>(
          (a, b) => (a === null || b.mastery < a.mastery ? b : a),
          null,
        );

  return (
    <main className="app app--home">
      {header}

      {/* Offline cover: which capability is missing right now (the locked spokes echo it). */}
      {locked.size > 0 && (
        <p className="offnote" role="status">
          Офлайн · голосовые режимы недоступны
          {locked.has("listen_word") ? " · аудирование тоже (нет локального голоса)" : ""}
        </p>
      )}

      {/* CEFR meter — current step + a 12-level rail toward A2. */}
      <CefrMeter bands={bands} state={cefrState} />

      {/* Ring card — the fixed-orbit balance ring (fills the card) + the group/shape legend. */}
      <div className="ringcard">
        <BalanceRing level={active} modes={ringModes} shapes onPick={startById} />
        <RingLegend
          shapes
          groups={gram.total > 0 ? ["words", "sent", "read", "gram"] : ["words", "sent", "read"]}
        />
      </div>

      {/* Грамматика — full-width action card deep-linking into the lesson that gates the next
          level (undefined target → opens the topic map). */}
      {gram.total > 0 && (
        <button
          type="button"
          className="ctacard ctacard--gram ctacard--row"
          onClick={() => onOpenGrammar(gramNext?.id)}
        >
          <span className="ctacard__tile" aria-hidden="true">
            <UiIcon name="pen" size={21} strokeWidth={1.85} />
          </span>
          <span className="ctacard__main">
            <span className="ctacard__kicker">Грамматика</span>
            <span className="ctacard__title">
              {gramNext ? gramNext.title : "Все темы освоены"}
            </span>
            <span className="ctacard__sub">
              {gramNext ? `Уровень ${gramNext.level} · 3–5 мин` : "открыть карту тем"}
            </span>
          </span>
          <span className="ctacard__play" aria-hidden="true">
            <UiIcon name="play" size={15} strokeWidth={2.4} />
          </span>
        </button>
      )}

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
