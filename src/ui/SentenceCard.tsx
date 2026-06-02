import { useRef, useState } from "react";
import type { SentenceQuestion } from "../core/sentenceSession";
import type { Grade, GradeResult } from "../core/grader.contract";
import { pickBestSpokenAsync } from "../core/spokenNumber";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

interface SentenceCardProps {
  question: SentenceQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** The bound grader (from data/sentences.ts). */
  grade: Grade;
  /** Voice mode: the answer is spoken (Finnish), recognized into the same input + grader. */
  voice?: boolean;
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
  voice = false,
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
  // Voice mode is voice-ONLY: the answer (and the correction) can only be spoken, never typed.
  // From the recognizer's N-best list, prefer the hypothesis the grader accepts (so a correct
  // Finnish answer wins over an English-looking top guess; digits like "2" → "kaksi" first).
  const accepts = (candidate: string) =>
    grade({ sentenceId: question.id, answer: candidate }).then((g) => g.correct);
  const speech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: voice && !answered,
    onResult: (alts) => void pickBestSpokenAsync(alts, accepts).then(setValue),
  });
  const correctionSpeech = useSpeechRecognition({
    lang: "fi-FI",
    enabled: voice && result !== null && !result.correct,
    onResult: (alts) => void pickBestSpokenAsync(alts, accepts).then(checkCorrection),
  });
  // Lets the learner HEAR the correct sentence before re-saying it, so voice mode can't
  // dead-end on a sentence they don't know how to pronounce.
  const tts = useSpeechSynthesis("fi-FI");

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
      <p className="hint">
        {voice ? "Произнесите перевод по-фински:" : "Переведите предложение на финский:"}
      </p>

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
          autoFocus={!voice}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={voice}
          disabled={answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Перевод на финский"
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
              <p className="hint">
                {voice
                  ? "Произнесите правильный ответ, чтобы продолжить:"
                  : "Напишите правильный ответ, чтобы продолжить:"}
              </p>
              <textarea
                className="produce__input produce__input--area"
                lang="fi"
                rows={2}
                autoFocus={!voice}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                readOnly={voice}
                value={correction}
                onChange={(e) => void checkCorrection(e.target.value)}
                aria-label="Исправление"
              />
              {voice && (
                <div className="voicerow">
                  {tts.supported && (
                    <button
                      type="button"
                      className={"listen" + (tts.speaking ? " listen--on" : "")}
                      onClick={() => tts.speak(result.canonical)}
                      aria-label="Прослушать правильный ответ"
                    >
                      {tts.speaking ? "🔊 …" : "🔊 Прослушать"}
                    </button>
                  )}
                  {correctionSpeech.supported ? (
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
                  )}
                </div>
              )}
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
