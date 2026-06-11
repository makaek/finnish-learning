import { useEffect, useRef, useState } from "react";
import type { ProductionQuestion } from "../core/produce";
import { gradeTyped, type TypedGrade } from "../core/produce";
import { pickBestSpoken } from "../core/spokenNumber";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

interface ProductionCardProps {
  question: ProductionQuestion;
  /** 1-based position in the session, for the progress label. */
  questionNumber: number;
  total: number;
  /** BCP-47 locale for TTS/recognition so the target language sounds native (e.g. "en-US"). */
  speechLang: string;
  /** Voice mode: the answer is spoken (Finnish), recognized into the same input + grader. */
  voice?: boolean;
  /** Listen (dictation) mode: the Finnish word is spoken (TTS) and the learner types it; the
   * Russian gloss is hidden until graded. Mutually exclusive with `voice`. */
  listen?: boolean;
  /** Called once the learner has answered and chosen to continue. */
  onAnswered: (wasCorrect: boolean) => void;
  /** Open the grammar book highlighting rules relevant to this word. */
  onOpenRules: () => void;
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
  speechLang,
  voice = false,
  listen = false,
  onAnswered,
  onOpenRules,
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
    lang: speechLang,
    enabled: voice && !answered,
    onResult: (alts) => setValue(pickBestSpoken(alts, accepts)),
  });
  const correctionSpeech = useSpeechRecognition({
    lang: speechLang,
    enabled: voice && graded !== null && !graded.correct,
    onResult: (alts) => setCorrection(pickBestSpoken(alts, accepts)),
  });
  // In voice mode: hear the correct word before re-saying it. In listen mode: TTS speaks the
  // word as the prompt (the whole exercise). Same hook serves both.
  const tts = useSpeechSynthesis(speechLang);

  // Listen mode: play the word once when the question appears. The card is keyed by index so a
  // new question remounts it (resetting the guard); the ref guard makes the play strictly
  // once-per-mount even if a dep identity changes. The play button below replays on demand.
  const { supported: ttsSupported, speak } = tts;
  const didAutoPlay = useRef(false);
  useEffect(() => {
    if (listen && ttsSupported && !didAutoPlay.current) {
      didAutoPlay.current = true;
      speak(question.answerFi);
    }
  }, [listen, ttsSupported, speak, question.answerFi]);

  function submit() {
    if (answered) return;
    setGraded(gradeTyped(question.answerFi, value));
  }

  // Voice recognition is imperfect for some words (e.g. "Näen äidin" is reliably misheard as
  // "Näin aidin"), leaving the learner stuck. This override marks the attempt correct so they
  // can move on. It also fixes the FIRST-attempt score: scoring reads graded.correct at advance,
  // so overriding here (even after a wrong grade) counts the attempt as correct.
  function forceCorrect() {
    if (advanced) return;
    setGraded({
      correct: true,
      via: "exact",
      answerFi: question.answerFi,
      feedbackRu: "Засчитано как правильный ответ (голос мог не распознать). 🎤",
    });
    setCorrection("");
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

      {listen ? (
        <div className="audioprompt">
          {ttsSupported ? (
            <button
              type="button"
              className={"play" + (tts.speaking ? " play--on" : "")}
              onClick={() => speak(question.answerFi)}
              aria-label="Прослушать слово ещё раз"
            >
              🔊 Прослушать
            </button>
          ) : (
            <p className="hint">Аудио не поддерживается в этом браузере.</p>
          )}
        </div>
      ) : (
        <h1 className="prompt" lang="ru">
          {question.promptRu}
        </h1>
      )}
      <p className="hint">
        {listen
          ? "Прослушайте и напишите слово по-фински:"
          : voice
            ? "Произнесите слово по-фински:"
            : "Напишите слово по-фински:"}
      </p>
      <button type="button" className="ruleslink ruleslink--inline" onClick={onOpenRules}>
        📖 Правила
      </button>

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
          {listen && (
            <p className="hint" lang="ru">
              Перевод: {question.promptRu}
            </p>
          )}
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
              {voice && (
                <div className="voicerow">
                  {tts.supported && (
                    <button
                      type="button"
                      className={"listen" + (tts.speaking ? " listen--on" : "")}
                      onClick={() => tts.speak(question.answerFi)}
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
                  <button
                    type="button"
                    className="markok"
                    onClick={forceCorrect}
                    aria-label="Засчитать произношение верным"
                    title="Если голос не распознался — засчитать как верный"
                  >
                    ✓ Засчитать верным
                  </button>
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
