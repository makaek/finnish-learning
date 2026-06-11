/**
 * TextReader.tsx — the Reader hub (ReaderR): a text/dialog rendered as a chat thread (tap a bubble
 * to reveal its Russian; the header eye reveals all; per-bubble + play-all TTS), with a "Путь к
 * «Прочитано»" footer that launches the two mastery parts (Вопросы → quiz, Наизусть → recite) and
 * tracks their progress. Clearing both shows the «Прочитано!» celebration.
 */

import { useEffect, useRef, useState } from "react";
import type { ReadingText } from "../core/reading";
import { recitedRoleCount, reciteRoleDone, reciteRoles, rolesOf } from "../core/reading";
import { readingLearned, readingMastered, reciteComplete } from "../core/levels";
import type { ProgressMap } from "../core/progress";
import type { Grade } from "../core/grader.contract";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { UiIcon, type UiIconName } from "./icons";
import { Avatar, ChatHead, IconBtn } from "./readingKit";
import { speakerColor } from "./readingFormat";
import DialogPlay from "./DialogPlay";
import ReadingQuiz from "./ReadingQuiz";
import MasteredScreen from "./MasteredScreen";

interface TextReaderProps {
  text: ReadingText;
  /** Live mastery map — drives the footer's quiz/recite state. */
  progress: ProgressMap;
  /** Comprehension grader (from data/texts.ts), used by the quiz. */
  grade: Grade;
  /** BCP-47 locale for TTS/recognition so the target language sounds native (e.g. "en-US"). */
  speechLang: string;
  onBack: () => void;
  onMarkRead: () => void;
  /** Count a finished role-play / quiz toward today's lessons. */
  onLessonDone: () => void;
  /** Record a finished comprehension quiz on this text's reading track. */
  onReadingResult: (textId: string, allCorrect: boolean) => void;
  /** Record that this text was recited наизусть in one role (the second part of mastery). */
  onRecited: (textId: string, role: string) => void;
}

/** One chat bubble: Finnish line + tap-to-translate + per-line TTS. */
function Bubble({
  line,
  isDialog,
  roles,
  side,
  showRu,
  onToggle,
  onSpeak,
  ttsSupported,
}: {
  line: ReadingText["lines"][number];
  isDialog: boolean;
  roles: readonly string[];
  side: "left" | "right";
  showRu: boolean;
  onToggle: () => void;
  onSpeak: () => void;
  ttsSupported: boolean;
}) {
  const color = isDialog && line.speaker ? speakerColor(line.speaker, roles) : "var(--read)";
  const right = side === "right";
  const avLetter = isDialog && line.speaker ? (line.speaker[0] ?? "•") : "М";
  return (
    <div className={"rd-bubble" + (right ? " rd-bubble--right" : "")}>
      <Avatar letter={avLetter} color={color} size={32} />
      <div className="rd-bubble__col">
        {isDialog && line.speaker && (
          <div className="rd-bubble__who" style={{ color }}>
            {line.speaker}
          </div>
        )}
        <div
          className={"rd-msg" + (right ? " rd-msg--right" : "")}
          role="button"
          tabIndex={0}
          aria-label="Показать перевод"
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <div className="rd-msg__row">
            <span className="rd-msg__fi" lang="fi">
              {line.fi}
            </span>
            {ttsSupported && (
              <button
                type="button"
                className="rd-sound"
                style={{ color }}
                aria-label="Прослушать строку"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak();
                }}
              >
                <UiIcon name="sound" size={15} />
              </button>
            )}
          </div>
          {showRu && (
            <div className="rd-msg__ru" lang="ru">
              {line.ru}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One of the two mastery tasks, as a tappable card. */
function TaskCard({
  icon,
  tone,
  label,
  sub,
  done,
  onClick,
}: {
  icon: UiIconName;
  tone: string;
  label: string;
  sub: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={"rd-task" + (done ? " rd-task--done" : "")} onClick={onClick}>
      <div className="rd-task__top">
        <span className="rd-task__tile" style={{ color: done ? "var(--rd-green)" : tone }}>
          <UiIcon name={icon} size={18} />
        </span>
        {done ? (
          <span className="rd-task__check">
            <UiIcon name="check" size={13} strokeWidth={3} />
          </span>
        ) : (
          <span style={{ color: "var(--read)", display: "flex" }}>
            <UiIcon name="arrow" size={18} />
          </span>
        )}
      </div>
      <div>
        <div className="rd-task__label">{label}</div>
        <div className="rd-task__sub">{sub}</div>
      </div>
    </button>
  );
}

export default function TextReader({
  text,
  progress,
  grade,
  speechLang,
  onBack,
  onMarkRead,
  onLessonDone,
  onReadingResult,
  onRecited,
}: TextReaderProps) {
  const [translateAll, setTranslateAll] = useState(false);
  const [openLines, setOpenLines] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [quizzing, setQuizzing] = useState(false);
  const [showMastered, setShowMastered] = useState(false);
  const tts = useSpeechSynthesis(speechLang);

  const roles = rolesOf(text);
  const isDialog = text.type === "dialog" && roles.length >= 2;
  const hasQuestions = (text.questions?.length ?? 0) > 0;

  // Mastery state for the footer.
  const quizDone = hasQuestions && readingLearned(progress, text.id);
  const reciteTotal = reciteRoles(text).length;
  const recited = recitedRoleCount(progress, text);
  const reciteDone = reciteComplete(progress, text.id);
  const mastered = readingMastered(progress, text.id, hasQuestions);
  const parts = hasQuestions ? 2 : 1;
  const steps = (quizDone ? 1 : 0) + (reciteDone ? 1 : 0);

  // Celebrate only when mastery is achieved HERE (not when opening an already-mastered text).
  const masteredOnOpen = useRef(mastered);
  useEffect(() => {
    if (mastered && !masteredOnOpen.current) setShowMastered(true);
  }, [mastered]);

  const toggleLine = (i: number) =>
    setOpenLines((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // A sub-view (recite / quiz) takes precedence; the «Прочитано!» celebration only appears once
  // we're back on the reader, so achieving mastery mid-recite never yanks the learner out.
  if (playing) {
    return (
      <DialogPlay
        text={text}
        speechLang={speechLang}
        recitedRoles={new Set(reciteRoles(text).filter((r) => reciteRoleDone(progress, text.id, r)))}
        onExit={() => setPlaying(false)}
        onRoleComplete={(role) => {
          onRecited(text.id, role);
          onMarkRead();
          onLessonDone();
        }}
      />
    );
  }

  if (quizzing) {
    return (
      <ReadingQuiz
        text={text}
        grade={grade}
        speechLang={speechLang}
        onExit={() => setQuizzing(false)}
        onComplete={(allCorrect) => {
          onReadingResult(text.id, allCorrect);
          onMarkRead();
          onLessonDone();
          setQuizzing(false);
        }}
      />
    );
  }

  if (showMastered) {
    return (
      <MasteredScreen
        text={text}
        hasQuestions={hasQuestions}
        onBackToList={onBack}
        onReview={() => setShowMastered(false)}
      />
    );
  }

  return (
    <main className="app app--scroll">
      <button type="button" className="exit" onClick={onBack}>
        ← Назад
      </button>
      <section className="card">
        <ChatHead
          title={text.title}
          titleRu={translateAll ? text.titleRu : undefined}
          sub={mastered ? "Прочитано · освоено" : `Уровень ${text.level} · ${isDialog ? "диалог" : "текст"}`}
          mastered={mastered}
          right={
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <IconBtn
                name={translateAll ? "eyeOff" : "eye"}
                label="Перевод всех строк"
                on={translateAll}
                onClick={() => setTranslateAll((v) => !v)}
              />
              {tts.supported && (
                <IconBtn
                  name={tts.speaking ? "pause" : "play"}
                  label="Прослушать всё"
                  on={tts.speaking}
                  onClick={() =>
                    tts.speaking ? tts.cancel() : tts.speakMany(text.lines.map((l) => l.fi))
                  }
                />
              )}
            </div>
          }
        />

        <div className="rd-thread">
          <div className="rd-threadhint">Нажмите на сообщение, чтобы перевести</div>
          {text.lines.map((line, i) => (
            <Bubble
              key={`${text.id}-${i}`}
              line={line}
              isDialog={isDialog}
              roles={roles}
              side={isDialog && line.speaker && roles.indexOf(line.speaker) % 2 === 1 ? "right" : "left"}
              showRu={translateAll || openLines.has(i)}
              onToggle={() => toggleLine(i)}
              onSpeak={() => tts.speak(line.fi)}
              ttsSupported={tts.supported}
            />
          ))}
        </div>

        {mastered ? (
          <div className="rd-banner">
            <span className="rd-banner__disc">
              <UiIcon name="trophy" size={20} />
            </span>
            <div className="rd-banner__main">
              <div className="rd-banner__t">Прочитано</div>
              <div className="rd-banner__s">
                оба шага пройдены — {isDialog ? "диалог" : "текст"} освоен
              </div>
            </div>
            <button type="button" className="rd-ghost" style={{ flex: "none" }} onClick={() => setPlaying(true)}>
              <UiIcon name="refresh" size={16} />
              Повторить
            </button>
          </div>
        ) : (
          <div className="rd-foot">
            <div className="rd-foot__hd">
              <span className="rd-foot__label">Путь к «Прочитано»</span>
              <span className="rd-foot__prog">
                <span className="rd-seg">
                  {Array.from({ length: parts }).map((_, i) => (
                    <span key={i} className={"rd-seg__b" + (i < steps ? " rd-seg__b--on" : "")} />
                  ))}
                </span>
                <span className="rd-seg__n">
                  {steps} / {parts}
                </span>
              </span>
            </div>
            <div className="rd-tasks">
              {hasQuestions && (
                <TaskCard
                  icon="rules"
                  tone="var(--rd-teal)"
                  label="Вопросы"
                  done={quizDone}
                  sub={quizDone ? "Пройдено" : "Ответить на вопросы"}
                  onClick={() => setQuizzing(true)}
                />
              )}
              <TaskCard
                icon="mic"
                tone="var(--rd-violet)"
                label="Наизусть"
                done={reciteDone}
                sub={
                  reciteDone
                    ? isDialog
                      ? "Все роли"
                      : "Готово"
                    : isDialog
                      ? `За все роли · ${recited}/${reciteTotal}`
                      : "Рассказать"
                }
                onClick={() => setPlaying(true)}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
