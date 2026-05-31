import { useState } from "react";
import type { RecognitionQuestion } from "../core/quiz";

interface RecognitionCardProps {
  question: RecognitionQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** Called once the learner has answered and chosen to continue. */
  onAnswered: (wasCorrect: boolean) => void;
}

/**
 * One word-recognition question: a Russian gloss and the Finnish options. After a pick,
 * the choice is locked, feedback is shown, and a "next" button advances the session.
 */
export default function RecognitionCard({
  question,
  questionNumber,
  total,
  onAnswered,
}: RecognitionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  // Guards against a double-click on "Next" double-scoring / skipping a question.
  const [advanced, setAdvanced] = useState(false);
  const answered = selected !== null;
  const wasCorrect = selected === question.correctFi;

  function optionClass(option: string): string {
    if (!answered) return "option";
    if (option === question.correctFi) return "option option--correct";
    if (option === selected) return "option option--wrong";
    return "option option--muted";
  }

  return (
    <section className="card" aria-live="polite">
      <p className="progress">
        Вопрос {questionNumber} из {total}
      </p>

      <h1 className="prompt" lang="ru">
        {question.promptRu}
      </h1>
      <p className="hint">Выберите перевод на финский:</p>

      <div className="options">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClass(option)}
            lang="fi"
            disabled={answered}
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {answered && (
        <div className="feedback">
          {wasCorrect ? (
            <p className="feedback__text feedback__text--ok">Правильно! 🎉</p>
          ) : (
            <p className="feedback__text feedback__text--no">
              Неверно. Правильный ответ: <strong lang="fi">{question.correctFi}</strong>
            </p>
          )}
          <button
            type="button"
            className="next"
            disabled={advanced}
            onClick={() => {
              if (advanced) return;
              setAdvanced(true);
              onAnswered(wasCorrect);
            }}
          >
            Дальше
          </button>
        </div>
      )}
    </section>
  );
}
