interface SessionSummaryProps {
  score: number;
  total: number;
  onRestart: () => void;
}

/** End-of-session screen: score and a button to start a fresh session. */
export default function SessionSummary({ score, total, onRestart }: SessionSummaryProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <section className="card card--summary">
      <h1 className="prompt">Готово!</h1>
      <p className="score">
        {score} / {total} <span className="score__pct">({pct}%)</span>
      </p>
      <p className="hint">
        {pct === 100
          ? "Отлично! Все слова угаданы."
          : "Хорошая тренировка. Попробуйте ещё раз!"}
      </p>
      <button type="button" className="next" onClick={onRestart}>
        Ещё раз
      </button>
    </section>
  );
}
