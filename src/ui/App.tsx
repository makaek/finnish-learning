import { useMemo, useState } from "react";
import { VOCAB } from "../data/dictionary";
import { SENTENCES, grade } from "../data/sentences";
import { buildSession, DEFAULT_SESSION_SIZE } from "../core/quiz";
import { buildProductionSession } from "../core/produce";
import { buildSentenceSession } from "../core/sentenceSession";
import RecognitionCard from "./RecognitionCard";
import ProductionCard from "./ProductionCard";
import SentenceCard from "./SentenceCard";
import SessionSummary from "./SessionSummary";

type Mode = "recognition" | "production" | "sentences";

/**
 * Root: a minimal mode picker (recognition / typed production / sentence builder), then one
 * in-memory session of the chosen exercise. SRS scheduling and persistence arrive in a later
 * slice; a dedicated design pass will turn this picker into a proper home/streak screen.
 */
export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  // All cheap (≤10 items) and reseed together; the active mode picks which to run.
  const recognition = useMemo(() => buildSession(VOCAB, seed, DEFAULT_SESSION_SIZE), [seed]);
  const production = useMemo(
    () => buildProductionSession(VOCAB, seed, DEFAULT_SESSION_SIZE),
    [seed],
  );
  const sentences = useMemo(
    () => buildSentenceSession(SENTENCES, seed, DEFAULT_SESSION_SIZE),
    [seed],
  );

  function start(next: Mode) {
    setMode(next);
    setSeed(Date.now());
    setIndex(0);
    setScore(0);
  }

  function handleAnswered(wasCorrect: boolean) {
    if (wasCorrect) setScore((s) => s + 1);
    setIndex((i) => i + 1);
  }

  function restart() {
    if (mode) start(mode);
  }

  function goHome() {
    setMode(null);
  }

  if (mode === null) {
    return (
      <main className="app">
        <section className="card card--summary">
          <h1 className="prompt">Финский тренажёр</h1>
          <p className="hint">Выберите упражнение:</p>
          <div className="options">
            <button type="button" className="option" onClick={() => start("recognition")}>
              Узнавание слов
            </button>
            <button type="button" className="option" onClick={() => start("production")}>
              Написание слов
            </button>
            <button type="button" className="option" onClick={() => start("sentences")}>
              Перевод предложений
            </button>
          </div>
        </section>
      </main>
    );
  }

  const total =
    mode === "production"
      ? production.length
      : mode === "sentences"
        ? sentences.length
        : recognition.length;
  const finished = index >= total;

  return (
    <main className="app">
      {total === 0 ? (
        <section className="card">
          <h1 className="prompt">Пока пусто</h1>
          <p className="hint">Нет заданий для тренировки.</p>
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
