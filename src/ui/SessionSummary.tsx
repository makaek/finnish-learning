interface SessionSummaryProps {
  score: number;
  total: number;
  onRestart: () => void;
  /** Optional "back to menu" handler; the button is shown only when provided. */
  onHome?: () => void;
}

/** End-of-session screen: score and a button to start a fresh session. */
export default function SessionSummary({
  score,
  total,
  onRestart,
  onHome,
}: SessionSummaryProps) {
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
      {onHome && (
        <button type="button" className="option" onClick={onHome}>
          В меню
        </button>
      )}
    </section>
  );
}
