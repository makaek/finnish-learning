import { useState } from "react";
import type { ProductionQuestion } from "../core/produce";
import { gradeTyped, type TypedGrade } from "../core/produce";

interface ProductionCardProps {
  question: ProductionQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** Called once the learner has answered and chosen to continue. */
  onAnswered: (wasCorrect: boolean) => void;
}

/**
 * One typed-production question: a Russian gloss and a text field. On submit the answer
 * is graded locally and locked, feedback is shown, and a "next" button advances. The
 * grader marks missing-diacritics answers wrong but with a targeted Russian hint.
 */
export default function ProductionCard({
  question,
  questionNumber,
  total,
  onAnswered,
}: ProductionCardProps) {
  const [value, setValue] = useState("");
  const [graded, setGraded] = useState<TypedGrade | null>(null);
  // Guards against a double-click on "Next" double-scoring / skipping a question.
  const [advanced, setAdvanced] = useState(false);
  const answered = graded !== null;

  function submit() {
    if (answered) return;
    setGraded(gradeTyped(question.answerFi, value));
  }

  const feedbackClass = graded?.correct
    ? "feedback__text feedback__text--ok"
    : graded?.via === "diacritics"
      ? "feedback__text feedback__text--near"
      : "feedback__text feedback__text--no";

  return (
    <section className="card" aria-live="polite">
      <p className="progress">
        Вопрос {questionNumber} из {total}
      </p>

      <h1 className="prompt" lang="ru">
        {question.promptRu}
      </h1>
      <p className="hint">Напишите слово по-фински:</p>

      <form
        className="produce"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="produce__input"
          lang="fi"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Ответ на финском"
        />
        {!answered && (
          <button type="submit" className="next" disabled={value.trim().length === 0}>
            Проверить
          </button>
        )}
      </form>

      {graded && (
        <div className="feedback">
          <p className={feedbackClass} lang="ru">
            {graded.feedbackRu}
          </p>
          <button
            type="button"
            className="next"
            disabled={advanced}
            onClick={() => {
              if (advanced) return;
              setAdvanced(true);
              onAnswered(graded.correct);
            }}
          >
            Дальше
          </button>
        </div>
      )}
    </section>
  );
}
