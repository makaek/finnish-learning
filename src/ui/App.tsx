import { useMemo, useState } from "react";
import { VOCAB } from "../data/dictionary";
import { buildSession, DEFAULT_SESSION_SIZE } from "../core/quiz";
import RecognitionCard from "./RecognitionCard";
import SessionSummary from "./SessionSummary";

/**
 * Slice 1 root: runs one word-recognition session end-to-end. Session state is in-memory
 * only — SRS scheduling and persistence arrive in a later slice.
 */
export default function App() {
  const [seed, setSeed] = useState(() => Date.now());
  const session = useMemo(
    () => buildSession(VOCAB, seed, DEFAULT_SESSION_SIZE),
    [seed],
  );

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const finished = index >= session.length;
  const current = session[index];

  function handleAnswered(wasCorrect: boolean) {
    if (wasCorrect) setScore((s) => s + 1);
    setIndex((i) => i + 1);
  }

  function restart() {
    setScore(0);
    setIndex(0);
    setSeed(Date.now());
  }

  return (
    <main className="app">
      {session.length === 0 ? (
        <section className="card">
          <h1 className="prompt">Словарь пуст</h1>
          <p className="hint">Нет слов для тренировки.</p>
        </section>
      ) : finished || !current ? (
        <SessionSummary score={score} total={session.length} onRestart={restart} />
      ) : (
        <RecognitionCard
          key={index}
          question={current}
          questionNumber={index + 1}
          total={session.length}
          onAnswered={handleAnswered}
        />
      )}
    </main>
  );
}
