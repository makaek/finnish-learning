import { useState } from "react";
import type { ProductionQuestion } from "../core/produce";
import { gradeTyped, type TypedGrade } from "../core/produce";
import { pickBestSpoken } from "../core/spokenNumber";
import { useSpeechRecognition } from "./useSpeechRecognition";

interface ProductionCardProps {
  question: ProductionQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** Voice mode: the answer is spoken (Finnish), recognized into the same input + grader. */
  voice?: boolean;
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
  voice = false,
  onAnswered,
}: ProductionCardProps) {
  const [value, setValue] = useState("");
  const [graded, setGraded] = useState<TypedGrade | null>(null);
  // After a wrong answer the learner must re-type a correct one before advancing.
  const [correction, setCorrection] = useState("");
  // Guards against a double-click on "Next" double-scoring / skipping a question.
  const [advanced, setAdvanced] = useState(false);
  const answered = graded !== null;
  // Voice mode is voice-ONLY: the answer (and the correction) can only be spoken, never typed.
  // From the recognizer's N-best list, prefer the hypothesis the grader accepts (so a correct
  // Finnish answer wins over an English-looking top guess; digits like "2" → "kaksi" first).
  const accepts = (candidate: string) => gradeTyped(question.answerFi, candidate).correct;
  const speech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: voice && !answered,
    onResult: (alts) => setValue(pickBestSpoken(alts, accepts)),
  });
  const correctionSpeech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: voice && graded !== null && !graded.correct,
    onResult: (alts) => setCorrection(pickBestSpoken(alts, accepts)),
  });

  function submit() {
    if (answered) return;
    setGraded(gradeTyped(question.answerFi, value));
  }

  // "Дальше" unlocks immediately on a correct answer; otherwise only once the learner
  // re-types a correct answer into the correction field. Scoring uses the first attempt.
  const mustCorrect = graded !== null && !graded.correct;
  const canAdvance =
    graded !== null &&
    (graded.correct || gradeTyped(question.answerFi, correction).correct);

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
      <p className="hint">
        {voice ? "Произнесите слово по-фински:" : "Напишите слово по-фински:"}
      </p>

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
          autoFocus={!voice}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={voice}
          disabled={answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Ответ на финском"
        />
        {voice && !answered && (
          speech.supported ? (
            <button
              type="button"
              className={"mic" + (speech.listening ? " mic--on" : "")}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label="Говорить"
            >
              {speech.listening ? "● Слушаю…" : value ? "🎤 Сказать заново" : "🎤 Говорить"}
            </button>
          ) : (
            <p className="hint">Голосовой ввод не поддерживается в этом браузере.</p>
          )
        )}
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
          {mustCorrect && (
            <>
              <p className="hint">
                {voice
                  ? "Произнесите правильный ответ, чтобы продолжить:"
                  : "Напишите правильный ответ, чтобы продолжить:"}
              </p>
              <input
                className="produce__input"
                lang="fi"
                autoFocus={!voice}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                readOnly={voice}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                aria-label="Исправление"
              />
              {voice &&
                (correctionSpeech.supported ? (
                  <button
                    type="button"
                    className={"mic" + (correctionSpeech.listening ? " mic--on" : "")}
                    onClick={() =>
                      correctionSpeech.listening ? correctionSpeech.stop() : correctionSpeech.start()
                    }
                    aria-label="Сказать исправление"
                  >
                    {correctionSpeech.listening
                      ? "● Слушаю…"
                      : correction
                        ? "🎤 Сказать заново"
                        : "🎤 Сказать"}
                  </button>
                ) : (
                  <p className="hint">Голосовой ввод не поддерживается.</p>
                ))}
            </>
          )}
          <button
            type="button"
            className="next"
            disabled={advanced || !canAdvance}
            onClick={() => {
              if (advanced || !canAdvance) return;
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
