import { useEffect, useMemo, useRef, useState } from "react";
import { VOCAB } from "../data/dictionary";
import { SENTENCES, grade } from "../data/sentences";
import { RULES } from "../data/rules";
import { TEXTS } from "../data/texts";
import { rulesForPos, rulesForTeaches } from "../core/rules";
import {
  buildSession,
  DEFAULT_OPTION_COUNT,
  DEFAULT_SESSION_SIZE,
  SENTENCE_SESSION_SIZE,
} from "../core/quiz";
import { buildProductionSession } from "../core/produce";
import { buildSentenceSession } from "../core/sentenceSession";
import { applyOutcome } from "../core/srs";
import { activeVocab, eligibleSentences } from "../core/levels";
import {
  completeLesson,
  currentStreak,
  dateKey,
  emptyState,
  recordAnswer,
  type UserState,
} from "../core/daily";
import {
  getProgress,
  progressKey,
  MAX_BOX,
  type ItemKind,
  type ItemProgress,
  type ProgressMap,
} from "../core/progress";
import { loadProgress, loadState, saveProgress, saveState } from "../data/backend";
import { hiddenKey, loadHidden, saveHidden } from "./hidden";
import { loadRead, saveRead } from "./readingState";
import Roadmap, { type Mode } from "./Roadmap";
import ProgressDetails from "./ProgressDetails";
import Dashboard from "./Dashboard";
import RulesBook from "./RulesBook";
import Reading from "./Reading";
import BottomNav, { type HomeScreen } from "./BottomNav";
import RecognitionCard from "./RecognitionCard";
import ProductionCard from "./ProductionCard";
import SentenceCard from "./SentenceCard";
import SessionSummary from "./SessionSummary";

/** `?test=1` unlocks every level and treats all words as learned, to bypass the curriculum. */
function readTestMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("test");
}

/**
 * Root: a level-gated home (Roadmap) plus one in-memory session of the chosen exercise.
 * Each answer advances the learner's mastery (Leitner box) and persists it via the backend;
 * sessions are weighted by mastery and gated by curriculum level so new words and sentences
 * appear only as earlier ones are learned.
 */
export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  // Which non-exercise screen the home shows when mode is null.
  const [homeScreen, setHomeScreen] = useState<HomeScreen>("roadmap");
  // In-lesson grammar overlay: open over the current card, highlighting the relevant rules.
  const [rulesOpen, setRulesOpen] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [testMode] = useState(readTestMode);
  // Items the learner hid (fully-mastered) — excluded from every lesson, persisted locally.
  const [hidden, setHidden] = useState<Set<string>>(loadHidden);
  // Texts/dialogs the learner has finished (read or rehearsed). Lifted here from Reading so the
  // home/dashboard/progress screens can fold reading into level completion. Device-local, like
  // `hidden` — same persistence rationale (a view marker, not graded data).
  const [read, setRead] = useState<Set<string>>(loadRead);

  function toggleHidden(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveHidden(next);
      return next;
    });
  }

  function markRead(id: string) {
    setRead((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRead(next);
      return next;
    });
  }

  // Live mastery map, held in a ref so recording an answer never reshuffles the session
  // mid-run: builders read it only when (re)seeded on `start`. `progressView` mirrors it for
  // the home screen (updated on load and on returning home), so the roadmap stays reactive
  // without making the active session depend on it.
  const progressRef = useRef<ProgressMap>(new Map());
  const [progressView, setProgressView] = useState<ProgressMap>(new Map());
  const [ready, setReady] = useState(false);
  // Guards against double-recording the same card (e.g. a fast double-tap before re-render).
  const lastRecordedRef = useRef<string | null>(null);
  // Daily-loop state (streak + today's count), same ref+view pattern as progress.
  const dailyRef = useRef<UserState>(emptyState());
  const [dailyView, setDailyView] = useState<UserState>(emptyState());
  useEffect(() => {
    let active = true;
    void Promise.all([loadProgress(), loadState()]).then(([loadedProgress, loadedState]) => {
      if (!active) return;
      progressRef.current = loadedProgress;
      setProgressView(loadedProgress);
      dailyRef.current = loadedState;
      setDailyView(loadedState);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // In-play pools: gated by level (and the learned-words rule for sentences), minus items the
  // learner has hidden (fully mastered → removed from every lesson). Reading progressRef (a
  // ref, not a dep) keeps gating/weighting current as of the last `start`; `seed` reseeds on
  // entry, and `hidden` makes hiding/unhiding take effect on the next session.
  const recognition = useMemo(
    () =>
      buildSession(
        activeVocab(VOCAB, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        DEFAULT_OPTION_COUNT,
        progressRef.current,
      ),
    [seed, testMode, hidden],
  );
  const production = useMemo(
    () =>
      buildProductionSession(
        activeVocab(VOCAB, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
      ),
    [seed, testMode, hidden],
  );
  const sentences = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(SENTENCES, VOCAB, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
      ),
    [seed, testMode, hidden],
  );
  // Voice variants: same pools/questions as production/sentences, but weighted by their own
  // track so spoken practice is repeated and mastered independently.
  const sayWord = useMemo(
    () =>
      buildProductionSession(
        activeVocab(VOCAB, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
        "say_word",
      ),
    [seed, testMode, hidden],
  );
  const saySentence = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(SENTENCES, VOCAB, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
        "say_sentence",
      ),
    [seed, testMode, hidden],
  );
  // Listening (dictation) variants: same pools as production/sentences, but the prompt is
  // spoken Finnish (TTS) and the learner types what they hear; weighted by their own track.
  const listenWord = useMemo(
    () =>
      buildProductionSession(
        activeVocab(VOCAB, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
        "listen_word",
      ),
    [seed, testMode, hidden],
  );
  const listenSentence = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(SENTENCES, VOCAB, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
        "listen_sentence",
      ),
    [seed, testMode, hidden],
  );

  function start(next: Mode) {
    // Refresh the home view now so it's current whenever we return — covers restart(), which
    // re-enters a mode without passing through goHome().
    setProgressView(new Map(progressRef.current));
    setMode(next);
    setSeed(Date.now());
    setIndex(0);
    setScore(0);
    setRulesOpen(false);
  }

  /**
   * Test-mode helper: mark every word and sentence mastered so unlocks (and the progress
   * screen, which lists items answered correctly at least once) can be exercised. Writes a
   * coherent "perfect" record — MAX_BOX correct out of MAX_BOX seen — not fake history.
   * Persists to the backend on purpose, so a tester can confirm it survives a reload — do
   * NOT add a no-persist guard.
   */
  function fillAllMastered() {
    const now = Date.now();
    const rows: ItemProgress[] = [];
    const mark = (kind: ItemKind, id: string) => {
      const p: ItemProgress = {
        kind,
        itemId: id,
        box: MAX_BOX,
        correctStreak: MAX_BOX,
        totalCorrect: MAX_BOX,
        totalSeen: MAX_BOX,
        lastSeen: now,
      };
      progressRef.current.set(progressKey(kind, id), p);
      rows.push(p);
    };
    for (const v of VOCAB) {
      mark("recognition", v.id);
      mark("production", v.id);
      mark("say_word", v.id);
      mark("listen_word", v.id);
    }
    for (const s of SENTENCES) {
      mark("sentences", s.id);
      mark("say_sentence", s.id);
      mark("listen_sentence", s.id);
    }
    for (const t of TEXTS) {
      mark("reading", t.id);
    }
    setProgressView(new Map(progressRef.current));
    void saveProgress(rows);
  }

  /** Update the current item's mastery from the answer and persist it (fire-and-forget). */
  function recordOutcome(wasCorrect: boolean) {
    if (mode === null) return;
    // The exercise mode IS the progress track — each lesson type (incl. the two voice ones)
    // is recorded separately. `wasCorrect` is the FIRST-attempt result (the forced-correction
    // retry never changes it), so only first attempts count.
    const kind: ItemKind = mode;
    const id =
      mode === "sentences"
        ? sentences[index]?.id
        : mode === "say_sentence"
          ? saySentence[index]?.id
          : mode === "listen_sentence"
            ? listenSentence[index]?.id
            : mode === "production"
              ? production[index]?.itemId
              : mode === "say_word"
                ? sayWord[index]?.itemId
                : mode === "listen_word"
                  ? listenWord[index]?.itemId
                  : recognition[index]?.itemId;
    if (id === undefined) return; // index past the end of the session — nothing to record
    // Each card key is unique per seed+mode+index, so this tag dedupes a double-fire.
    const tag = `${mode}:${seed}:${index}`;
    if (lastRecordedRef.current === tag) return;
    lastRecordedRef.current = tag;
    const next = applyOutcome(getProgress(progressRef.current, kind, id), wasCorrect, Date.now());
    // Mutating .current directly is intentional: refs don't trigger re-renders, so the
    // active session stays put; the next start()/reseed reads the updated mastery.
    progressRef.current.set(progressKey(kind, id), next);
    void saveProgress([next]);
  }

  /** Length of the active session — used to detect when this answer completes a lesson. */
  function activeTotal(): number {
    if (mode === "sentences") return sentences.length;
    if (mode === "say_sentence") return saySentence.length;
    if (mode === "listen_sentence") return listenSentence.length;
    if (mode === "production") return production.length;
    if (mode === "say_word") return sayWord.length;
    if (mode === "listen_word") return listenWord.length;
    return recognition.length;
  }

  /** Reading: count a finished role-play as one lesson (no answer → accuracy untouched). */
  function countReadingLesson() {
    const next = completeLesson(dailyRef.current, dateKey());
    dailyRef.current = next;
    setDailyView(next);
    void saveState(next);
  }

  /**
   * Record a completed comprehension quiz on the text's `reading` track (one record per text).
   * `wasCorrect` is the all-first-attempts-correct result, so a text masters after ~2 clean runs,
   * mirroring the other tracks. Persisted; mutating the ref directly keeps any active view stable.
   */
  function recordReading(textId: string, wasCorrect: boolean) {
    const next = applyOutcome(getProgress(progressRef.current, "reading", textId), wasCorrect, Date.now());
    progressRef.current.set(progressKey("reading", textId), next);
    setProgressView(new Map(progressRef.current));
    void saveProgress([next]);
  }

  /** Record one answer toward today's goal; on the session's last answer, count a lesson. */
  function recordDaily(wasCorrect: boolean, lessonDone: boolean) {
    const today = dateKey();
    let next = recordAnswer(dailyRef.current, today, wasCorrect);
    if (lessonDone) next = completeLesson(next, today);
    dailyRef.current = next;
    setDailyView(next);
    void saveState(next);
  }

  function handleAnswered(wasCorrect: boolean) {
    recordOutcome(wasCorrect);
    recordDaily(wasCorrect, index + 1 >= activeTotal());
    if (wasCorrect) setScore((s) => s + 1);
    setIndex((i) => i + 1);
    setRulesOpen(false); // close the grammar overlay so the next item starts clean
  }

  function restart() {
    if (mode) start(mode);
  }

  function goHome() {
    // Refresh the home view from the latest mastery before leaving the session.
    setProgressView(new Map(progressRef.current));
    setHomeScreen("roadmap");
    setMode(null);
    setRulesOpen(false);
  }

  if (mode === null) {
    // The home shell: one of the four home screens, with the persistent bottom tab bar that
    // navigates between them (replacing per-screen back arrows and the old text links).
    let screen;
    if (homeScreen === "stats") {
      screen = (
        <ProgressDetails
          vocab={VOCAB}
          sentences={SENTENCES}
          texts={TEXTS}
          progress={progressView}
          testMode={testMode}
          hidden={hidden}
          read={read}
          onToggleHide={toggleHidden}
        />
      );
    } else if (homeScreen === "reading") {
      screen = (
        <Reading
          vocab={VOCAB}
          progress={progressView}
          testMode={testMode}
          read={read}
          onMarkRead={markRead}
          onLessonDone={countReadingLesson}
          onReadingResult={recordReading}
        />
      );
    } else if (homeScreen === "rules") {
      screen = <RulesBook rules={RULES} />;
    } else if (homeScreen === "dashboard") {
      screen = (
        <Dashboard
          vocab={VOCAB}
          sentences={SENTENCES}
          texts={TEXTS}
          progress={progressView}
          daily={dailyView}
          testMode={testMode}
        />
      );
    } else {
      screen = (
        <Roadmap
          vocab={VOCAB}
          sentences={SENTENCES}
          texts={TEXTS}
          progress={progressView}
          daily={dailyView}
          hidden={hidden}
          testMode={testMode}
          ready={ready}
          onStart={start}
          onTestFill={fillAllMastered}
          onShowStats={() => setHomeScreen("stats")}
        />
      );
    }
    return (
      <div className="home">
        {screen}
        <BottomNav active={homeScreen} onSelect={setHomeScreen} />
      </div>
    );
  }

  // Each mode runs its own session; the voice modes reuse the production/sentence card +
  // grader but have their own session (weighted by their own track).
  const usesSentences =
    mode === "sentences" || mode === "say_sentence" || mode === "listen_sentence";
  const usesProduction = mode === "production" || mode === "say_word" || mode === "listen_word";
  const productionSession =
    mode === "say_word" ? sayWord : mode === "listen_word" ? listenWord : production;
  const sentenceSession =
    mode === "say_sentence" ? saySentence : mode === "listen_sentence" ? listenSentence : sentences;
  const total = usesProduction
    ? productionSession.length
    : usesSentences
      ? sentenceSession.length
      : recognition.length;
  const finished = index >= total;
  // An exercise card is on screen (vs. the empty/summary states). Top-align + scroll these
  // so a typed answer's submit button stays reachable above the on-screen keyboard (and its
  // autofill toolbar) instead of being centered behind it.
  const showingCard = !finished && total > 0;

  // Rules relevant to the item on screen — highlighted ⭐ and pre-opened in the grammar overlay.
  // Sentences match by their `teaches` tag; words match by part of speech.
  const ruleHighlights: string[] = !showingCard
    ? []
    : usesSentences
      ? rulesForTeaches(
          SENTENCES.find((s) => s.id === sentenceSession[index]?.id)?.teaches,
          RULES,
        ).map((r) => r.id)
      : (() => {
          const wordId = usesProduction
            ? productionSession[index]?.itemId
            : recognition[index]?.itemId;
          const word = wordId ? VOCAB.find((v) => v.id === wordId) : undefined;
          return word ? rulesForPos(word.pos, RULES).map((r) => r.id) : [];
        })();

  return (
    <main className={showingCard ? "app app--scroll" : "app"}>
      {/* Exit shown only while a card is on screen; the empty (total===0) and summary
          screens carry their own "В меню" button. */}
      {!finished && total > 0 && (
        <button type="button" className="exit" onClick={goHome}>
          ← В меню
        </button>
      )}
      {total === 0 ? (
        <section className="card">
          <h1 className="prompt">Пока пусто</h1>
          <p className="hint">
            {usesSentences
              ? "Сначала выучите больше слов — тогда откроются предложения."
              : "Нет заданий для тренировки."}
          </p>
          <button type="button" className="next" onClick={goHome}>
            В меню
          </button>
        </section>
      ) : finished ? (
        <SessionSummary
          score={score}
          total={total}
          streak={currentStreak(dailyView, dateKey())}
          onRestart={restart}
          onHome={goHome}
        />
      ) : usesSentences ? (
        <SentenceCard
          key={index}
          question={sentenceSession[index]!}
          questionNumber={index + 1}
          total={total}
          grade={grade}
          voice={mode === "say_sentence"}
          listen={mode === "listen_sentence"}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : usesProduction ? (
        <ProductionCard
          key={index}
          question={productionSession[index]!}
          questionNumber={index + 1}
          total={total}
          voice={mode === "say_word"}
          listen={mode === "listen_word"}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : (
        <RecognitionCard
          key={index}
          question={recognition[index]!}
          questionNumber={index + 1}
          total={total}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}
      {rulesOpen && (
        <RulesBook
          rules={RULES}
          highlightIds={ruleHighlights}
          overlay
          onClose={() => setRulesOpen(false)}
        />
      )}
    </main>
  );
}
