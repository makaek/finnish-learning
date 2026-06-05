/**
 * ReadingQuiz.tsx — comprehension questions about a text/dialog (any type).
 *
 * Steps through `text.questions`, each answered by TYPING or VOICE (both available, unlike the
 * voice-only word/sentence modes). Answers are graded locally by the shared sentence grader
 * (data/texts.ts `gradeQuestion`); a wrong answer reveals the model answer and gates advancing
 * behind a correction, mirroring SentenceCard. Finishing calls `onComplete` (which marks the
 * text read + counts a lesson). Not individually persisted in this slice.
 */

import { useState } from "react";
import type { ReadingQuestion, ReadingText } from "../core/reading";
import type { Grade, GradeResult } from "../core/grader.contract";
import { pickBestSpokenAsync } from "../core/spokenNumber";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

interface ReadingQuizProps {
  text: ReadingText;
  /** The bound comprehension grader (from data/texts.ts). */
  grade: Grade;
  onExit: () => void;
  /** Called once when the learner finishes all questions. */
  onComplete: () => void;
}

/** One comprehension question: Finnish prompt (with revealable RU), typed-or-spoken answer. */
function QuestionCard({
  question,
  questionNumber,
  total,
  grade,
  onAnswered,
}: {
  question: ReadingQuestion;
  questionNumber: number;
  total: number;
  grade: Grade;
  onAnswered: (wasCorrect: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [showQRu, setShowQRu] = useState(false);
  const [correction, setCorrection] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const answered = result !== null;

  const tts = useSpeechSynthesis("fi-FI");

  // Prefer the recognizer hypothesis the grader accepts (English-looking top guess loses).
  const accepts = (candidate: string) =>
    grade({ sentenceId: question.id, answer: candidate }).then((g) => g.correct);
  // Answers may be typed OR spoken: the mic fills the still-editable field (not voice-only).
  const answerSpeech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: !answered,
    onResult: (alts) => void pickBestSpokenAsync(alts, accepts).then(setValue),
  });
  const correctionSpeech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: result !== null && !result.correct,
    onResult: (alts) => void pickBestSpokenAsync(alts, accepts).then(checkCorrection),
  });

  async function submit() {
    if (answered || grading || value.trim().length === 0) return;
    setGrading(true);
    const graded = await grade({ sentenceId: question.id, answer: value });
    setResult(graded);
    setGrading(false);
  }

  async function checkCorrection(text: string) {
    if (result === null || result.correct) return;
    setCorrection(text);
    const graded = await grade({ sentenceId: question.id, answer: text });
    setUnlocked(graded.correct);
  }

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

      <h1 className="prompt" lang="fi">
        {question.q}
        {tts.supported && (
          <button
            type="button"
            className="line__play"
            onClick={() => tts.speak(question.q)}
            aria-label="Прослушать вопрос"
          >
            🔊
          </button>
        )}
      </h1>
      {showQRu ? (
        <p className="hint" lang="ru">
          {question.qRu}
        </p>
      ) : (
        <button type="button" className="chip" onClick={() => setShowQRu(true)}>
          👁 Перевод вопроса
        </button>
      )}
      <p className="hint">Ответьте по-фински — напечатайте или скажите:</p>

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
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Ответ на финском"
        />
        {!answered && answerSpeech.supported && (
          <button
            type="button"
            className={"mic" + (answerSpeech.listening ? " mic--on" : "")}
            onClick={() => (answerSpeech.listening ? answerSpeech.stop() : answerSpeech.start())}
            aria-label="Сказать ответ"
          >
            {answerSpeech.listening ? "● Слушаю…" : value ? "🎤 Сказать заново" : "🎤 Сказать"}
          </button>
        )}
        {!answered && (
          <button type="submit" className="next" disabled={grading || value.trim().length === 0}>
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
              {tts.supported && (
                <button
                  type="button"
                  className="line__play"
                  onClick={() => tts.speak(result.canonical)}
                  aria-label="Прослушать правильный ответ"
                >
                  🔊
                </button>
              )}
            </p>
          )}
          {mustCorrect && (
            <>
              <p className="hint">Напишите или скажите правильный ответ, чтобы продолжить:</p>
              <textarea
                className="produce__input produce__input--area"
                lang="fi"
                rows={2}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={correction}
                onChange={(e) => void checkCorrection(e.target.value)}
                aria-label="Исправление"
              />
              <div className="voicerow">
                {correctionSpeech.supported && (
                  <button
                    type="button"
                    className={"mic" + (correctionSpeech.listening ? " mic--on" : "")}
                    onClick={() =>
                      correctionSpeech.listening ? correctionSpeech.stop() : correctionSpeech.start()
                    }
                    aria-label="Сказать исправление"
                  >
                    {correctionSpeech.listening ? "● Слушаю…" : correction ? "🎤 Сказать заново" : "🎤 Сказать"}
                  </button>
                )}
                <button
                  type="button"
                  className="markok"
                  onClick={() => {
                    // Escape hatch for voice mis-recognition: count the attempt correct (matches
                    // SentenceCard.forceCorrect). The score is cosmetic here — completion marks the
                    // text read regardless — so being lenient is fine.
                    if (advanced) return;
                    setResult({ ...result, correct: true });
                    setUnlocked(true);
                  }}
                  title="Если ответ верный, но не распознался — засчитать верным"
                >
                  ✓ Засчитать верным
                </button>
              </div>
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

export default function ReadingQuiz({ text, grade, onExit, onComplete }: ReadingQuizProps) {
  const questions = text.questions ?? [];
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (questions.length === 0) {
    // Defensive: the launcher only opens the quiz when there are questions.
    onExit();
    return null;
  }

  if (done) {
    return (
      <main className="app">
        <section className="card card--summary">
          <h1 className="prompt">🎉 Готово!</h1>
          <p className="hint">
            Правильных ответов: {score} из {questions.length}
          </p>
          <div className="rolepick">
            <button type="button" className="next" onClick={onComplete}>
              Готово
            </button>
            <button
              type="button"
              className="option"
              onClick={() => {
                setIdx(0);
                setScore(0);
                setDone(false);
              }}
            >
              Ещё раз
            </button>
          </div>
        </section>
      </main>
    );
  }

  const question = questions[idx]!;
  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onExit}>
        ← Выйти
      </button>
      <QuestionCard
        key={idx}
        question={question}
        questionNumber={idx + 1}
        total={questions.length}
        grade={grade}
        onAnswered={(wasCorrect) => {
          if (wasCorrect) setScore((s) => s + 1);
          if (idx + 1 >= questions.length) setDone(true);
          else setIdx((i) => i + 1);
        }}
      />
    </main>
  );
}
