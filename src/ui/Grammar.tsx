/**
 * Grammar.tsx — the «Грамматика» mode (design_handoff_grammar): a prerequisite-gated
 * topic map, the three-screen lesson flow (Теория → Разминка → Дрилл) over the six
 * precomputed-graded item types, and the end-of-lesson summary.
 *
 * Pure presentation over core/grammar.ts: all grading/mastery/locking maths lives in
 * core; recording a finished lesson goes through the `onLessonDone` callback (App owns
 * persistence), which returns the before/after record + newly unlocked topics for the
 * summary screen.
 */

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  activeSet,
  choiceOrder,
  gradeCell,
  gradeTyped,
  grammarStats,
  lessonItems,
  reviewPatterns,
  errorWord,
  setCount,
  stripForm,
  topicMasteryPct,
  topicStates,
  weakestTopic,
  GRAMMAR_MASTERED_BOX,
  type ChoiceRuItem,
  type ChooseFormItem,
  type FillTableItem,
  type GrammarContent,
  type GrammarItem,
  type GrammarTopic,
  type TypedFormItem,
  type TypedGrade,
  type TopicState,
} from "../core/grammar";
import type { ItemProgress, ProgressMap } from "../core/progress";
import type { RuleItem } from "../core/rules";
import { normalizeFi } from "../core/normalize";
import { pickBestSpoken } from "../core/spokenNumber";
import RulesBook from "./RulesBook";
import { useOnline } from "./useOnline";
import { speechTroubleRu, useSpeechRecognition } from "./useSpeechRecognition";
import { UiIcon } from "./icons";
import {
  FormText,
  GCanon,
  GExample,
  GExplain,
  GTagChip,
  LessonTop,
  MasteredPill,
  Mastery,
  MasteryRing,
  ParadigmTable,
  ParaKey,
  QuickKeys,
  RuText,
} from "./grammarKit";

/** What App returns after persisting a finished lesson — feeds the summary screen. */
export interface GrammarLessonRecord {
  before: ItemProgress;
  after: ItemProgress;
  unlocked: GrammarTopic[];
}

interface GrammarProps {
  content: GrammarContent;
  rules: RuleItem[];
  progress: ProgressMap;
  /** BCP-47 locale for the typed items' voice input (e.g. "fi-FI"). */
  speechLang: string;
  /** CEFR chip for the map header (e.g. "A1.2"). */
  cefr?: string;
  /** Deep link: open this topic's lesson immediately (the home card's weak topic). */
  initialTopicId?: string;
  onBack: () => void;
  /** Persist a finished lesson; returns the record delta + newly unlocked topics. */
  onLessonDone: (topicId: string, score: number, total: number) => GrammarLessonRecord;
}

type View =
  | { kind: "map" }
  | { kind: "lesson"; topicId: string; run: number }
  | {
      kind: "summary";
      topicId: string;
      score: number;
      total: number;
      missed: GrammarItem[];
      record: GrammarLessonRecord;
    };

export default function Grammar({
  content,
  rules,
  progress,
  speechLang,
  cefr,
  initialTopicId,
  onBack,
  onLessonDone,
}: GrammarProps) {
  // Voice input availability for the typed items: the cloud recognizer needs the network.
  const online = useOnline();
  const [view, setView] = useState<View>(() => {
    // Deep-link only into a topic that exists AND is startable — a locked topic falls back to
    // the map (its lock hint explains why), so no caller can play past the prereq gate.
    const ok =
      initialTopicId !== undefined &&
      content.topics.some((t) => t.id === initialTopicId) &&
      topicStates(content.topics, progress).get(initialTopicId) !== "locked";
    return ok ? { kind: "lesson", topicId: initialTopicId!, run: 0 } : { kind: "map" };
  });

  if (view.kind === "lesson") {
    const topic = content.topics.find((t) => t.id === view.topicId)!;
    // Variant rotation: runs walk the topic's sets in order (totalSeen counts runs), so the two
    // strong runs mastery requires always land on DIFFERENT sets. «Ещё раз» after a run therefore
    // opens the next variant, not a repeat of the same drill.
    const sets = setCount(content.items, topic.id);
    const set = activeSet(progress, topic.id, sets);
    return (
      <Lesson
        key={`${view.topicId}:${view.run}`}
        topic={topic}
        items={lessonItems(content.items, topic.id, set)}
        variant={sets > 1 ? { set, sets } : undefined}
        rules={rules}
        speechLang={speechLang}
        online={online}
        onExit={() => setView({ kind: "map" })}
        onFinish={(score, total, missed) => {
          const record = onLessonDone(topic.id, score, total);
          setView({ kind: "summary", topicId: topic.id, score, total, missed, record });
        }}
      />
    );
  }

  if (view.kind === "summary") {
    const topic = content.topics.find((t) => t.id === view.topicId)!;
    return (
      <Summary
        topic={topic}
        score={view.score}
        total={view.total}
        missed={view.missed}
        record={view.record}
        onRetry={() => setView({ kind: "lesson", topicId: view.topicId, run: Date.now() })}
        onMap={() => setView({ kind: "map" })}
      />
    );
  }

  return (
    <TopicMap
      content={content}
      progress={progress}
      cefr={cefr}
      onBack={onBack}
      onOpen={(topicId) => setView({ kind: "lesson", topicId, run: 0 })}
    />
  );
}

/* ===================================================================== topic map */

const TOPIC_WORD = (n: number): string => {
  const t = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 14) return "тем";
  if (t === 1) return "темы"; // «из 1 темы» reads better than «тема» in this construction
  return "тем";
};

function TopicMap({
  content,
  progress,
  cefr,
  onBack,
  onOpen,
}: {
  content: GrammarContent;
  progress: ProgressMap;
  cefr?: string;
  onBack: () => void;
  onOpen: (topicId: string) => void;
}) {
  const states = useMemo(() => topicStates(content.topics, progress), [content.topics, progress]);
  const stats = useMemo(() => grammarStats(content.topics, progress), [content.topics, progress]);
  const weak = useMemo(() => weakestTopic(content.topics, progress), [content.topics, progress]);
  const titleOf = (id: string) => content.topics.find((t) => t.id === id)?.title ?? id;
  const modules = [...content.modules].sort((a, b) => a.n - b.n);

  return (
    <main className="app app--home">
      <div className="gmap__head">
        <button type="button" className="gexit" aria-label="Назад" onClick={onBack}>
          <UiIcon name="back" size={17} />
        </button>
        <h1 className="gmap__title">Грамматика</h1>
        {cefr && <span className="glevel">{cefr}</span>}
      </div>

      <div className="ghero">
        <MasteryRing pct={stats.mastery} size={46} />
        <div className="ghero__main">
          <div className="ghero__t">
            Освоено {stats.mastered} из {stats.total} {TOPIC_WORD(stats.total)}
          </div>
          <span className="ghero__bar">
            <span className="ghero__fill" style={{ width: `${Math.round(stats.mastery * 100)}%` }} />
          </span>
          <div className="ghero__sub">
            {weak ? (
              <>
                Слабая тема: <b>{weak.title}</b> · повторите сегодня
              </>
            ) : (
              <>Все доступные темы освоены — отличная работа!</>
            )}
          </div>
        </div>
      </div>

      {modules.map((mod, idx) => {
        const topics = content.topics.filter((t) => t.module === mod.id);
        const done = topics.filter((t) => states.get(t.id) === "mastered").length;
        return (
          <div key={mod.id} style={{ display: "contents" }}>
            <div className="gmod">
              {/* Display number = sort position (mod.n only orders; it may be 0-based). */}
              <span className="gmod__n">Модуль {idx + 1}</span>
              <span className="gmod__t">{mod.title}</span>
              <span className="gmod__line" aria-hidden="true" />
              <span className="gmod__count">
                {done}/{topics.length}
              </span>
            </div>
            <div className="gtopics">
              {topics.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  state={states.get(t.id) ?? "available"}
                  pct={topicMasteryPct(progress, t.id)}
                  lockedPrereqs={t.prereq
                    .filter((p) => states.get(p) !== "mastered" && states.has(p))
                    .map(titleOf)}
                  onOpen={() => onOpen(t.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}

function TopicCard({
  topic,
  state,
  pct,
  lockedPrereqs,
  onOpen,
}: {
  topic: GrammarTopic;
  state: TopicState;
  pct: number;
  lockedPrereqs: string[];
  onOpen: () => void;
}) {
  const locked = state === "locked";
  const stateClass =
    state === "mastered" ? " gtopic--mastered" : locked ? " gtopic--locked" : "";
  return (
    <button
      type="button"
      className={"gtopic" + stateClass}
      disabled={locked}
      onClick={locked ? undefined : onOpen}
    >
      <span className="gtopic__tile" aria-hidden="true">
        {state === "mastered" ? (
          <UiIcon name="check" size={19} strokeWidth={2.4} />
        ) : locked ? (
          <UiIcon name="lock" size={18} />
        ) : (
          <UiIcon name="pen" size={18} />
        )}
      </span>
      <span className="gtopic__main">
        <span className="gtopic__titrow">
          <span className="gtopic__title">{topic.title}</span>
          <span className="gtopic__lvl">Ур. {topic.level}</span>
        </span>
        <span className="gtopic__sub">{topic.summary}</span>
        {!locked && topic.tags.length > 0 && (
          <span className="gtags gtopic__tags">
            {topic.tags.map((k) => (
              <GTagChip key={k} kind={k} />
            ))}
          </span>
        )}
        {locked && lockedPrereqs.length > 0 && (
          <span className="gtopic__hint">
            <UiIcon name="lock" size={12} strokeWidth={2.2} /> Сначала пройдите:{" "}
            {lockedPrereqs.join(", ")}
          </span>
        )}
      </span>
      {state === "mastered" && <MasteredPill />}
      {state === "in-progress" && <Mastery pct={pct} />}
      {state === "available" && (
        <span className="gtopic__go" aria-hidden="true">
          <UiIcon name="chevR" size={18} />
        </span>
      )}
    </button>
  );
}

/* ===================================================================== lesson flow */

function Lesson({
  topic,
  items,
  variant,
  rules,
  speechLang,
  online,
  onExit,
  onFinish,
}: {
  topic: GrammarTopic;
  items: GrammarItem[];
  /** Which variant set this run drills, when the topic has more than one. */
  variant?: { set: number; sets: number };
  rules: RuleItem[];
  speechLang: string;
  online: boolean;
  onExit: () => void;
  onFinish: (score: number, total: number, missed: GrammarItem[]) => void;
}) {
  // -1 = theory; 0..items.length-1 = the item index.
  const [phase, setPhase] = useState(-1);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<GrammarItem[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);

  const current = phase >= 0 ? items[phase] : undefined;
  const step: 1 | 2 | 3 = current ? (current.stage === "warmup" ? 2 : 3) : 1;
  const stageItems = current ? items.filter((i) => i.stage === current.stage) : [];
  const count = current
    ? `${stageItems.indexOf(current) + 1} / ${stageItems.length}`
    : undefined;

  const completeItem = (item: GrammarItem, correct: boolean) => {
    const nextScore = score + (correct ? 1 : 0);
    const nextMissed = correct ? missed : [...missed, item];
    if (phase + 1 >= items.length) {
      onFinish(nextScore, items.length, nextMissed);
      return;
    }
    setScore(nextScore);
    setMissed(nextMissed);
    setPhase(phase + 1);
  };

  return (
    <main className="app app--scroll">
      <div className="gshell">
        <LessonTop
          topic={variant ? `${topic.title} · вариант ${variant.set}/${variant.sets}` : topic.title}
          step={step}
          count={count}
          onExit={onExit}
        />
        {current === undefined ? (
          <TheoryScreen
            topic={topic}
            hasRules={topic.ruleIds.length > 0}
            onOpenRules={() => setRulesOpen(true)}
            onNext={() => (items.length > 0 ? setPhase(0) : onExit())}
          />
        ) : (
          <ItemScreen
            key={`${current.id}:${phase}`}
            item={current}
            speechLang={speechLang}
            online={online}
            onComplete={completeItem}
          />
        )}
      </div>
      {rulesOpen && (
        <RulesBook rules={rules} highlightIds={topic.ruleIds} overlay onClose={() => setRulesOpen(false)} />
      )}
    </main>
  );
}

function TheoryScreen({
  topic,
  hasRules,
  onOpenRules,
  onNext,
}: {
  topic: GrammarTopic;
  hasRules: boolean;
  onOpenRules: () => void;
  onNext: () => void;
}) {
  const th = topic.theory;
  return (
    <>
      <section className="card gcard">
        {topic.tags.length > 0 && (
          <div className="gtags">
            {topic.tags.map((k) => (
              <GTagChip key={k} kind={k} />
            ))}
          </div>
        )}
        <h2 className="gth__title">{th.title}</h2>
        {th.summary && <p className="gth__summary">{th.summary}</p>}
        <p className="gth__body">
          <RuText text={th.bodyRu} />
        </p>

        {th.examples.length > 0 && (
          <>
            <div className="gth__sec">Примеры</div>
            <div className="gexs">
              {th.examples.map((e, i) => (
                <GExample key={i} fi={e.fi} ru={e.ru} />
              ))}
            </div>
          </>
        )}

        {th.paradigm && (
          <>
            <div className="gth__sec">{th.paradigm.caption}</div>
            <ParadigmTable rows={th.paradigm.rows} />
            <ParaKey items={th.paradigm.key} />
          </>
        )}

        {th.noteRu && (
          <div className="gxstack">
            <GExplain tone="info">
              <RuText text={th.noteRu} />
            </GExplain>
          </div>
        )}

        {hasRules && (
          <button type="button" className="ruleslink ruleslink--inline" onClick={onOpenRules}>
            📖 Правила по теме
          </button>
        )}
      </section>
      <div className="gspacer" />
      <button type="button" className="gnext" onClick={onNext}>
        Дальше
      </button>
    </>
  );
}

/* --------------------------------------------------------------------- items */

function ItemScreen({
  item,
  speechLang,
  online,
  onComplete,
}: {
  item: GrammarItem;
  speechLang: string;
  online: boolean;
  onComplete: (item: GrammarItem, correct: boolean) => void;
}) {
  switch (item.type) {
    case "classify":
    case "case_id":
      return <ChoiceRuCard item={item} onComplete={onComplete} />;
    case "choose_form":
      return <ChooseFormCard item={item} onComplete={onComplete} />;
    case "produce_form":
    case "transform":
      return <TypedCard item={item} speechLang={speechLang} online={online} onComplete={onComplete} />;
    case "fill_table":
      return <FillTableCard item={item} onComplete={onComplete} />;
  }
}

/** Footer: the bottom-anchored primary button below the flex spacer. */
function Footer({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="gspacer" />
      {children}
    </>
  );
}

/** classify / case_id — multiple choice over Russian labels (chips for verb types). */
function ChoiceRuCard({
  item,
  onComplete,
}: {
  item: ChoiceRuItem;
  onComplete: (item: GrammarItem, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === item.answer;
  const chips = item.type === "classify";
  const pickedReason = picked !== null ? item.reasonsRu[picked] : undefined;
  // case_id options are authored answer-first — render in the item's deterministic shuffle.
  const order = useMemo(() => choiceOrder(item), [item]);

  return (
    <>
      <section className="card gcard">
        <p className="gprompt">
          <span className="fi" lang="fi">
            {item.type === "case_id" ? <FormText text={item.promptFi} /> : item.promptFi}
          </span>{" "}
          — {item.promptRu}
        </p>
        <div className={"options" + (chips ? " options--chips" : "")}>
          {order.map((i) => {
            let cls = "option" + (chips ? " option--chip" : "");
            if (answered) {
              if (i === item.answer) cls += " option--correct";
              else if (i === picked) cls += " option--wrong";
              else cls += " option--muted";
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                disabled={answered}
                onClick={() => setPicked(i)}
              >
                {item.optionsRu[i]}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="gxstack">
            {correct ? (
              <GExplain tone="ok">
                <RuText text={item.okRu} />
              </GExplain>
            ) : (
              <>
                {pickedReason && (
                  <GExplain tone="no">
                    <RuText text={pickedReason} />
                  </GExplain>
                )}
                <GExplain tone="ok">
                  <RuText text={item.correctRu} />
                </GExplain>
              </>
            )}
          </div>
        )}
      </section>
      {answered && (
        <Footer>
          <button type="button" className="gnext" onClick={() => onComplete(item, correct)}>
            Дальше
          </button>
        </Footer>
      )}
    </>
  );
}

/** choose_form — the gap prompt + full-width Finnish options. */
function ChooseFormCard({
  item,
  onComplete,
}: {
  item: ChooseFormItem;
  onComplete: (item: GrammarItem, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const correct = picked === item.answer;
  const [before, after = ""] = item.promptFi.split("___");

  return (
    <>
      <section className="card gcard">
        <p className="gprompt" lang="fi">
          {before}
          {answered && correct ? (
            <span className="gfill-in">{item.answer}</span>
          ) : (
            <span className="gblank" aria-label="пропуск" />
          )}
          {after}
          {item.hintRu && (
            <span className="gprompt__hint" lang="ru">
              {item.hintRu}
            </span>
          )}
        </p>
        <div className="options">
          {item.options.map((o) => {
            let cls = "option";
            if (answered) {
              if (o.fi === item.answer) cls += " option--correct";
              else if (o.fi === picked) cls += " option--wrong";
              else cls += " option--muted";
            }
            return (
              <button
                key={o.fi}
                type="button"
                className={cls}
                disabled={answered}
                lang="fi"
                onClick={() => setPicked(o.fi)}
              >
                {o.fi}
                {answered && o.fi === picked && !correct && o.whyRu && (
                  <span className="option__why" lang="ru">
                    <RuText text={o.whyRu} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="gxstack">
            {correct ? (
              <GExplain tone="ok">
                <RuText text={item.okRu} />
              </GExplain>
            ) : (
              <GExplain tone="ok">
                Правильный ответ: <span className="fi">{item.answer}</span>.
              </GExplain>
            )}
          </div>
        )}
      </section>
      {answered && (
        <Footer>
          <button type="button" className="gnext" onClick={() => onComplete(item, correct)}>
            Дальше
          </button>
        </Footer>
      )}
    </>
  );
}

/** produce_form / transform — typed input with ä/ö keys, optional voice input, near-miss grading. */
function TypedCard({
  item,
  speechLang,
  online,
  onComplete,
}: {
  item: TypedFormItem;
  speechLang: string;
  online: boolean;
  onComplete: (item: GrammarItem, correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [grade, setGrade] = useState<TypedGrade | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const graded = grade !== null;

  // Voice input (free Web Speech API): the mic fills the input — grading stays the same typed
  // path. Per the project rule, transcripts go through pickBestSpoken so the recognizer's N-best
  // list is searched for a hypothesis the item actually accepts (digits→Finnish words included).
  const accepts = (candidate: string) =>
    item.accepted.some((a) => normalizeFi(a) === normalizeFi(candidate));
  const speech = useSpeechRecognition({
    lang: speechLang,
    enabled: online && !graded,
    onResult: (alternatives) => setValue(pickBestSpoken(alternatives, accepts)),
  });
  const voiceReady = online && speech.supported && !graded;
  const speechHint = speechTroubleRu(online, speech.error);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (graded || value.trim() === "") return;
    setGrade(gradeTyped(value, item));
  };

  const inputState =
    grade === null
      ? ""
      : grade.verdict === "correct"
        ? " ginput--ok"
        : grade.verdict === "near"
          ? " ginput--near"
          : " ginput--no";

  return (
    <>
      <section className="card gcard">
        <p className="gprompt">
          <span className="fi" lang="fi">
            {item.promptFi}
          </span>
          {item.promptRu && <> → {item.promptRu}</>}
          {item.hintRu && <span className="gprompt__hint">{item.hintRu}</span>}
        </p>
        <form className="produce" onSubmit={submit}>
          <input
            ref={inputRef}
            className={"produce__input" + inputState}
            type="text"
            lang="fi"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={item.type === "transform" ? "Введите фразу…" : "Введите форму…"}
            value={value}
            disabled={graded}
            onChange={(e) => setValue(e.target.value)}
          />
          {!graded && <QuickKeys inputRef={inputRef} onChange={setValue} />}
          {voiceReady && (
            <button
              type="button"
              className={"mic" + (speech.listening ? " mic--on" : "")}
              onClick={speech.listening ? speech.stop : speech.start}
            >
              {speech.listening ? "Говорите…" : "🎤 Сказать вслух"}
            </button>
          )}
          {speechHint && !graded && <p className="gprompt__hint">{speechHint}</p>}
        </form>
        {grade && (
          <div className="gxstack">
            {grade.verdict === "correct" ? (
              <GExplain tone="ok">
                <RuText text={grade.explainRu ?? item.okRu} />
              </GExplain>
            ) : (
              <>
                <GExplain tone={grade.verdict === "near" ? "near" : "no"}>
                  {grade.explainRu ? (
                    <RuText text={grade.explainRu} />
                  ) : grade.verdict === "near" ? (
                    <>Почти! Сравните с правильной формой ниже.</>
                  ) : (
                    <>Сравните свой ответ с правильной формой ниже.</>
                  )}
                </GExplain>
                <GCanon canonical={item.canonical} />
              </>
            )}
          </div>
        )}
      </section>
      <Footer>
        {graded ? (
          /* A near-miss is amber in the UI but counts as a MISS for the lesson score —
             the gentle tone is feedback, not credit (per the design handoff). */
          <button
            type="button"
            className="gnext"
            onClick={() => onComplete(item, grade!.verdict === "correct")}
          >
            Дальше
          </button>
        ) : (
          <button type="button" className="gnext" disabled={value.trim() === ""} onClick={() => submit()}>
            Проверить
          </button>
        )}
      </Footer>
    </>
  );
}

/** fill_table — complete the paradigm; every cell graded independently. */
function FillTableCard({
  item,
  onComplete,
}: {
  item: FillTableItem;
  onComplete: (item: GrammarItem, correct: boolean) => void;
}) {
  const [values, setValues] = useState<string[]>(() => item.cells.map(() => ""));
  const [graded, setGraded] = useState<boolean[] | null>(null);
  // The ä/ö quick keys insert into whichever cell was focused last.
  const focusedRef = useRef<HTMLInputElement | null>(null);
  const focusedIdx = useRef(0);
  const allFilled = values.every((v) => v.trim() !== "");
  const okCount = graded ? graded.filter(Boolean).length : 0;
  const allOk = graded !== null && okCount === item.cells.length;

  const submit = () => {
    if (graded || !allFilled) return;
    setGraded(item.cells.map((c, i) => gradeCell(values[i]!, c)));
  };

  return (
    <>
      <section className="card gcard">
        <p className="gprompt">
          <span className="fi" lang="fi">
            {item.promptFi}
          </span>
          {item.promptRu && <> — {item.promptRu}</>}
          {item.hintRu && <span className="gprompt__hint">{item.hintRu}</span>}
        </p>
        <div className="gfills">
          {item.cells.map((c, i) => (
            <span key={c.l} style={{ display: "contents" }}>
              <div className="gfill">
                <span className="gfill__p" lang="fi">
                  {c.l}
                </span>
                <input
                  className={
                    "gfill__in" + (graded ? (graded[i] ? " ginput--ok" : " ginput--no") : "")
                  }
                  type="text"
                  lang="fi"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="…"
                  value={values[i]}
                  disabled={graded !== null}
                  onFocus={(e) => {
                    focusedRef.current = e.currentTarget;
                    focusedIdx.current = i;
                  }}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                />
              </div>
              {graded && !graded[i] && (
                <div className="gfill">
                  <span />
                  <span className="gfill__fix" lang="fi">
                    → {stripForm(c.canonical)}
                  </span>
                </div>
              )}
            </span>
          ))}
        </div>
        {!graded && (
          <div style={{ marginTop: "0.9rem" }}>
            <QuickKeys
              inputRef={focusedRef}
              onChange={(next) =>
                setValues((prev) => prev.map((v, j) => (j === focusedIdx.current ? next : v)))
              }
            />
          </div>
        )}
        {graded && (
          <div className="gxstack">
            <GExplain tone={allOk ? "ok" : "near"}>
              {allOk ? (
                <>Все формы верны!</>
              ) : (
                <>
                  {okCount} из {item.cells.length} верно.{" "}
                  {item.summaryRu && <RuText text={item.summaryRu} />}
                </>
              )}
            </GExplain>
          </div>
        )}
      </section>
      <Footer>
        {graded ? (
          <button type="button" className="gnext" onClick={() => onComplete(item, allOk)}>
            Дальше
          </button>
        ) : (
          <button type="button" className="gnext" disabled={!allFilled} onClick={submit}>
            Проверить
          </button>
        )}
      </Footer>
    </>
  );
}

/* ===================================================================== summary */

function Summary({
  topic,
  score,
  total,
  missed,
  record,
  onRetry,
  onMap,
}: {
  topic: GrammarTopic;
  score: number;
  total: number;
  missed: GrammarItem[];
  record: GrammarLessonRecord;
  onRetry: () => void;
  onMap: () => void;
}) {
  const beforePct = Math.min(1, record.before.box / GRAMMAR_MASTERED_BOX);
  const afterPct = Math.min(1, record.after.box / GRAMMAR_MASTERED_BOX);
  const delta = Math.round((afterPct - beforePct) * 100);
  const frac = total > 0 ? score / total : 0;
  const title = frac >= 0.85 ? "Отлично!" : frac >= 0.6 ? "Хорошо!" : "Попробуйте ещё";
  const patterns = reviewPatterns(missed);

  return (
    <main className="app">
      <div className="gshell gshell--center">
        <div className="gsum">
          <MasteryRing pct={afterPct} from={beforePct} size={108} />
          {delta !== 0 && (
            <span className="gsum__delta">
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          )}
          <h2 className="gsum__title">{title}</h2>
          <div className="gsum__sub">
            {topic.title} · освоение {Math.round(afterPct * 100)}%
          </div>
          <div className="gsum__score">
            {score}
            <small>/{total}</small>
          </div>
        </div>

        {patterns.length > 0 && (
          <div className="gsumcard">
            <div className="gsumcard__t">Повторите</div>
            {patterns.map((p) => (
              <GExplain key={p.label} tone={p.count > 1 ? "no" : "near"}>
                <RuText text={p.label} /> — {p.count} {errorWord(p.count)}
              </GExplain>
            ))}
          </div>
        )}

        {record.unlocked.map((t) => (
          <div key={t.id} className="gunlock">
            <span className="gunlock__disc" aria-hidden="true">
              <UiIcon name="lockOpen" size={18} />
            </span>
            <span>
              <span className="gunlock__k">Открыта тема</span>
              <span className="gunlock__t">{t.title}</span>
            </span>
          </div>
        ))}

        <div className="gbtnrow">
          <button type="button" className="gnext gnext--ghost" onClick={onRetry}>
            Ещё раз
          </button>
          <button type="button" className="gnext" onClick={onMap}>
            К темам
          </button>
        </div>
      </div>
    </main>
  );
}
