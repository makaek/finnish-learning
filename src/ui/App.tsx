import { useEffect, useMemo, useRef, useState } from "react";
import { VOCAB } from "../data/dictionary";
import { SENTENCES, grade } from "../data/sentences";
import { buildSession, DEFAULT_OPTION_COUNT, DEFAULT_SESSION_SIZE } from "../core/quiz";
import { buildProductionSession } from "../core/produce";
import { buildSentenceSession } from "../core/sentenceSession";
import { applyOutcome } from "../core/srs";
import { activeVocab, eligibleSentences } from "../core/levels";
import {
  getProgress,
  progressKey,
  MAX_BOX,
  type ItemKind,
  type ItemProgress,
  type ProgressMap,
} from "../core/progress";
import { loadProgress, saveProgress } from "../data/backend";
import Roadmap, { type Mode } from "./Roadmap";
import ProgressDetails from "./ProgressDetails";
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
  const [homeScreen, setHomeScreen] = useState<"roadmap" | "stats">("roadmap");
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [testMode] = useState(readTestMode);

  // Live mastery map, held in a ref so recording an answer never reshuffles the session
  // mid-run: builders read it only when (re)seeded on `start`. `progressView` mirrors it for
  // the home screen (updated on load and on returning home), so the roadmap stays reactive
  // without making the active session depend on it.
  const progressRef = useRef<ProgressMap>(new Map());
  const [progressView, setProgressView] = useState<ProgressMap>(new Map());
  const [ready, setReady] = useState(false);
  // Guards against double-recording the same card (e.g. a fast double-tap before re-render).
  const lastRecordedRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    void loadProgress().then((loaded) => {
      if (!active) return;
      progressRef.current = loaded;
      setProgressView(loaded);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Sessions reseed together; the active mode picks which to run. Pools are gated by level
  // (and the learned-words rule for sentences); reading progressRef (a ref, not a dep) keeps
  // both gating and weighting current as of the last `start`. `testMode` is frozen at mount,
  // so it is a dep only to satisfy the linter — it never actually changes mid-session.
  const recognition = useMemo(
    () =>
      buildSession(
        activeVocab(VOCAB, progressRef.current, testMode),
        seed,
        DEFAULT_SESSION_SIZE,
        DEFAULT_OPTION_COUNT,
        progressRef.current,
      ),
    [seed, testMode],
  );
  const production = useMemo(
    () =>
      buildProductionSession(
        activeVocab(VOCAB, progressRef.current, testMode),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
      ),
    [seed, testMode],
  );
  const sentences = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(SENTENCES, VOCAB, progressRef.current, testMode),
        seed,
        DEFAULT_SESSION_SIZE,
        undefined,
        progressRef.current,
      ),
    [seed, testMode],
  );

  function start(next: Mode) {
    // Refresh the home view now so it's current whenever we return — covers restart(), which
    // re-enters a mode without passing through goHome().
    setProgressView(new Map(progressRef.current));
    setMode(next);
    setSeed(Date.now());
    setIndex(0);
    setScore(0);
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
    for (const v of VOCAB) mark("vocab", v.id);
    for (const s of SENTENCES) mark("sentence", s.id);
    setProgressView(new Map(progressRef.current));
    void saveProgress(rows);
  }

  /** Update the current item's mastery from the answer and persist it (fire-and-forget). */
  function recordOutcome(wasCorrect: boolean) {
    if (mode === null) return;
    const kind: ItemKind = mode === "sentences" ? "sentence" : "vocab";
    const id =
      mode === "sentences"
        ? sentences[index]?.id
        : mode === "production"
          ? production[index]?.itemId
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

  function handleAnswered(wasCorrect: boolean) {
    recordOutcome(wasCorrect);
    if (wasCorrect) setScore((s) => s + 1);
    setIndex((i) => i + 1);
  }

  function restart() {
    if (mode) start(mode);
  }

  function goHome() {
    // Refresh the home view from the latest mastery before leaving the session.
    setProgressView(new Map(progressRef.current));
    setHomeScreen("roadmap");
    setMode(null);
  }

  if (mode === null) {
    if (homeScreen === "stats") {
      return (
        <ProgressDetails
          vocab={VOCAB}
          sentences={SENTENCES}
          progress={progressView}
          testMode={testMode}
          onBack={() => setHomeScreen("roadmap")}
        />
      );
    }
    return (
      <Roadmap
        vocab={VOCAB}
        progress={progressView}
        testMode={testMode}
        ready={ready}
        onStart={start}
        onTestFill={fillAllMastered}
        onShowStats={() => setHomeScreen("stats")}
      />
    );
  }

  const total =
    mode === "production"
      ? production.length
      : mode === "sentences"
        ? sentences.length
        : recognition.length;
  const finished = index >= total;
  // An exercise card is on screen (vs. the empty/summary states). Top-align + scroll these
  // so a typed answer's submit button stays reachable above the on-screen keyboard (and its
  // autofill toolbar) instead of being centered behind it.
  const showingCard = !finished && total > 0;

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
            {mode === "sentences"
              ? "Сначала выучите больше слов — тогда откроются предложения."
              : "Нет заданий для тренировки."}
          </p>
          <button type="button" className="next" onClick={goHome}>
            В меню
          </button>
        </section>
      ) : finished ? (
        <SessionSummary score={score} total={total} onRestart={restart} onHome={goHome} />
      ) : mode === "sentences" ? (
        <SentenceCard
          key={index}
          question={sentences[index]!}
          questionNumber={index + 1}
          total={total}
          grade={grade}
          onAnswered={handleAnswered}
        />
      ) : mode === "production" ? (
        <ProductionCard
          key={index}
          question={production[index]!}
          questionNumber={index + 1}
          total={total}
          onAnswered={handleAnswered}
        />
      ) : (
        <RecognitionCard
          key={index}
          question={recognition[index]!}
          questionNumber={index + 1}
          total={total}
          onAnswered={handleAnswered}
        />
      )}
    </main>
  );
}
