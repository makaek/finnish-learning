/**
 * ReadingQuiz.tsx — comprehension questions (QuizR/QuizDoneR), chat-styled: the question is a
 * teacher bubble, the answer goes through a docked composer (typed OR spoken). Answers are graded
 * locally by the shared sentence grader; a wrong answer reveals the model answer and gates advancing
 * behind a correction (mirrors SentenceCard). Finishing calls `onComplete(allCorrect)`.
 */

import { useState } from "react";
import type { ReadingQuestion, ReadingText } from "../core/reading";
import type { Grade, GradeResult } from "../core/grader.contract";
import { pickBestSpokenAsync } from "../core/spokenNumber";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { UiIcon } from "./icons";
import { Avatar, ChatHead } from "./readingKit";

interface ReadingQuizProps {
  text: ReadingText;
  /** The bound comprehension grader (from data/texts.ts). */
  grade: Grade;
  onExit: () => void;
  /** Called once when the learner finishes all questions; `allCorrect` = every first attempt right. */
  onComplete: (allCorrect: boolean) => void;
}

/** One comprehension question: Finnish bubble (with revealable RU), typed-or-spoken answer. */
function QuestionCard({
  question,
  questionNumber,
  total,
  textTitle,
  grade,
  onAnswered,
}: {
  question: ReadingQuestion;
  questionNumber: number;
  total: number;
  textTitle: string;
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

  async function checkCorrection(t: string) {
    if (result === null || result.correct) return;
    setCorrection(t);
    const graded = await grade({ sentenceId: question.id, answer: t });
    setUnlocked(graded.correct);
  }

  function forceCorrect() {
    if (advanced) return;
    setResult({
      correct: true,
      canonical: result?.canonical ?? "",
      via: "exact",
      errors: [],
      praiseRu: "Засчитано как правильный ответ (голос мог не распознать). 🎤",
    });
    setUnlocked(true);
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
      <ChatHead
        title="Вопросы"
        sub={`${textTitle} · ${questionNumber} из ${total}`}
        right={
          <span className="rd-seg">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={"rd-seg__b" + (i < questionNumber ? " rd-seg__b--on" : "")} />
            ))}
          </span>
        }
      />

      <div className="rd-thread">
        <div className="rd-bubble">
          <Avatar letter="?" color="var(--rd-teal)" size={32} />
          <div className="rd-bubble__col">
            <div className="rd-msg" style={{ cursor: "default" }}>
              <div className="rd-msg__row">
                <span className="rd-msg__fi" lang="fi" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  {question.q}
                </span>
                {tts.supported && (
                  <button
                    type="button"
                    className="rd-sound"
                    style={{ color: "var(--rd-teal)" }}
                    onClick={() => tts.speak(question.q)}
                    aria-label="Прослушать вопрос"
                  >
                    <UiIcon name="sound" size={16} />
                  </button>
                )}
              </div>
              {showQRu && (
                <div className="rd-msg__ru" lang="ru">
                  {question.qRu}
                </div>
              )}
            </div>
            {!showQRu && (
              <button type="button" className="rd-qlink" onClick={() => setShowQRu(true)}>
                <UiIcon name="eye" size={15} />
                перевод вопроса
              </button>
            )}
          </div>
        </div>
        {!answered && (
          <div className="rd-threadhint">Ответьте по-фински — напечатайте или скажите</div>
        )}
      </div>

      {!answered ? (
        <form
          className="rd-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            className="rd-input"
            lang="fi"
            rows={1}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Kirjoita vastaus…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Ответ на финском"
          />
          {answerSpeech.supported && (
            <button
              type="button"
              className={"rd-circle" + (answerSpeech.listening ? " rd-circle--on" : "")}
              onClick={() => (answerSpeech.listening ? answerSpeech.stop() : answerSpeech.start())}
              aria-label="Сказать ответ"
            >
              <UiIcon name="mic" size={22} />
            </button>
          )}
          <button
            type="submit"
            className="rd-circle rd-circle--send"
            disabled={grading || value.trim().length === 0}
            aria-label="Проверить"
          >
            <UiIcon name="arrow" size={22} strokeWidth={2.4} />
          </button>
        </form>
      ) : (
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
                  onClick={forceCorrect}
                  aria-label="Засчитать ответ верным"
                  title="Если голос не распознался — засчитать как верный"
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
    onExit();
    return null;
  }

  if (done) {
    return (
      <main className="app">
        <section className="card">
          <div className="rd-center">
            <div className="rd-disc">
              <UiIcon name="check" size={38} strokeWidth={2.6} />
            </div>
            <div className="rd-title">Вопросы пройдены</div>
            <div className="rd-sub">
              Правильно {score} из {questions.length}
            </div>
          </div>
          <div className="rd-actions">
            <button type="button" className="rd-cta" onClick={() => onComplete(score === questions.length)}>
              Готово
            </button>
            <button
              type="button"
              className="rd-ghost"
              onClick={() => {
                setIdx(0);
                setScore(0);
                setDone(false);
              }}
            >
              <UiIcon name="refresh" size={16} />
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
        textTitle={text.title}
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
