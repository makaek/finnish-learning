import { useRef, useState } from "react";
import type { SentenceQuestion } from "../core/sentenceSession";
import type { Grade, GradeResult } from "../core/grader.contract";

interface SentenceCardProps {
  question: SentenceQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** The bound grader (from data/sentences.ts). */
  grade: Grade;
  /** Called once the learner has answered and chosen to continue. */
  onAnswered: (wasCorrect: boolean) => void;
}

/**
 * One sentence-builder question: a Russian sentence and a text area. On submit the answer
 * is graded locally (async per the contract, though v1 resolves immediately), the result is
 * locked, feedback is shown — correct praise, a prepared explanation for a known mistake, or
 * a near-miss hint — and the canonical answer is revealed for anything not correct.
 */
export default function SentenceCard({
  question,
  questionNumber,
  total,
  grade,
  onAnswered,
}: SentenceCardProps) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  // After a wrong answer the learner must re-type a correct one before advancing.
  const [correction, setCorrection] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  // Bumped on each correction grade so a slow/out-of-order async result can't overwrite
  // the unlock state for a newer keystroke (matters once an async LLM fallback is wired in).
  const correctionGen = useRef(0);
  // Guards against a double-click on "Next" double-scoring / skipping a question.
  const [advanced, setAdvanced] = useState(false);
  const answered = result !== null;

  async function submit() {
    if (answered || grading || value.trim().length === 0) return;
    setGrading(true);
    const graded = await grade({ sentenceId: question.id, answer: value });
    setResult(graded);
    setGrading(false);
  }

  // Re-grade the correction field as it changes; any accepted form unlocks "Дальше".
  async function checkCorrection(text: string) {
    if (result === null || result.correct) return; // only relevant after a wrong answer
    setCorrection(text);
    const gen = ++correctionGen.current;
    try {
      const graded = await grade({ sentenceId: question.id, answer: text });
      if (gen === correctionGen.current) setUnlocked(graded.correct);
    } catch {
      if (gen === correctionGen.current) setUnlocked(false);
    }
  }

  // Scoring uses the first attempt; the correction is purely a learning gate.
  const mustCorrect = result !== null && !result.correct;
  const canAdvance = result !== null && (result.correct || unlocked);

  const feedbackClass = result?.correct
    ? "feedback__text feedback__text--ok"
    : result?.via === "known"
      ? "feedback__text feedback__text--known"
      : "feedback__text feedback__text--near";

  return (
    <section className="card" aria-live="polite">
      <p className="progress">
        Вопрос {questionNumber} из {total}
      </p>

      <h1 className="prompt" lang="ru">
        {question.promptRu}
      </h1>
      <p className="hint">Переведите предложение на финский:</p>

      <form
        className="produce"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          className="produce__input produce__input--area"
          lang="fi"
          rows={2}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Перевод на финский"
        />
        {!answered && (
          <button
            type="submit"
            className="next"
            disabled={grading || value.trim().length === 0}
          >
            Проверить
          </button>
        )}
      </form>

      {result && (
        <div className="feedback">
          {result.errors.map((err, i) => (
            <p key={i} className={feedbackClass} lang="ru">
              {err.ru}
            </p>
          ))}
          {result.correct ? (
            <p className={feedbackClass} lang="ru">
              {result.praiseRu ?? "Правильно!"}
            </p>
          ) : (
            <p className="hint">
              Правильный ответ: <strong lang="fi">{result.canonical}</strong>
            </p>
          )}
          {mustCorrect && (
            <>
              <p className="hint">Напишите правильный ответ, чтобы продолжить:</p>
              <textarea
                className="produce__input produce__input--area"
                lang="fi"
                rows={2}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={correction}
                onChange={(e) => void checkCorrection(e.target.value)}
                aria-label="Исправление"
              />
            </>
          )}
          <button
            type="button"
            className="next"
            disabled={advanced || !canAdvance}
            onClick={() => {
              if (advanced || !canAdvance) return;
              setAdvanced(true);
              onAnswered(result.correct);
            }}
          >
            Дальше
          </button>
        </div>
      )}
    </section>
  );
}
