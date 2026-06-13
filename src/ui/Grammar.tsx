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

import { useMemo, useState, type KeyboardEvent } from "react";
import {
  activeSet,
  grammarStats,
  lessonItems,
  reviewPatterns,
  errorWord,
  setCount,
  topicMasteryPct,
  topicStates,
  weakestTopic,
  GRAMMAR_MASTERED_BOX,
  type GrammarContent,
  type GrammarItem,
  type GrammarTopic,
  type TopicState,
} from "../core/grammar";
import type { ItemProgress, ProgressMap } from "../core/progress";
import type { RuleItem } from "../core/rules";
import RulesBook from "./RulesBook";
import { useOnline } from "./useOnline";
import { UiIcon } from "./icons";
import { ItemScreen } from "./GrammarCards";
import {
  GExample,
  GExplain,
  GTagChip,
  LessonTop,
  MasteredPill,
  Mastery,
  MasteryRing,
  ParadigmTable,
  ParaKey,
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
  /** Open the decoupled review trainer (from the topic-map banner). */
  onOpenTrainer: () => void;
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
  onOpenTrainer,
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
      rules={rules}
      progress={progress}
      cefr={cefr}
      onBack={onBack}
      onOpenTrainer={onOpenTrainer}
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
  rules,
  progress,
  cefr,
  onBack,
  onOpenTrainer,
  onOpen,
}: {
  content: GrammarContent;
  rules: RuleItem[];
  progress: ProgressMap;
  cefr?: string;
  onBack: () => void;
  onOpenTrainer: () => void;
  onOpen: (topicId: string) => void;
}) {
  const states = useMemo(() => topicStates(content.topics, progress), [content.topics, progress]);
  const stats = useMemo(() => grammarStats(content.topics, progress), [content.topics, progress]);
  const weak = useMemo(() => weakestTopic(content.topics, progress), [content.topics, progress]);
  const titleOf = (id: string) => content.topics.find((t) => t.id === id)?.title ?? id;
  const modules = [...content.modules].sort((a, b) => a.n - b.n);
  // Rules are link-only now (no standalone tab): a topic row's 📖 link opens the rules book as
  // an overlay with that topic's rules surfaced first. Held here so the map owns its own overlay.
  const [ruleIds, setRuleIds] = useState<readonly string[] | null>(null);

  return (
    <main className="app app--home tr-root">
      <div className="gmap__head">
        <button type="button" className="gexit" aria-label="Назад" onClick={onBack}>
          <UiIcon name="back" size={17} />
        </button>
        <h1 className="gmap__title">Грамматика</h1>
        {cefr && <span className="glevel">{cefr}</span>}
      </div>

      {/* Trainer banner — free 10-card review over studied topics, decoupled from level progress. */}
      <button type="button" className="tr-banner" onClick={onOpenTrainer}>
        <span className="tr-banner__tile" aria-hidden="true">
          <UiIcon name="refresh" size={20} strokeWidth={2} />
        </span>
        <span className="tr-banner__main">
          <span className="tr-banner__k">Тренажёр · повторение</span>
          <span className="tr-banner__t">10 заданий из всех тем</span>
          <span className="tr-banner__s">слабые и давно не повторённые · не влияет на уровень</span>
        </span>
        <span className="tr-banner__play" aria-hidden="true">
          <UiIcon name="play" size={15} strokeWidth={2.4} />
        </span>
      </button>

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
                  onOpenRule={t.ruleIds.length > 0 ? () => setRuleIds(t.ruleIds) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}

      <p className="hint" style={{ textAlign: "center" }}>
        Правила открываются из темы — отдельной вкладки больше нет.
      </p>

      {ruleIds && (
        <RulesBook rules={rules} highlightIds={ruleIds} overlay onClose={() => setRuleIds(null)} />
      )}
    </main>
  );
}

function TopicCard({
  topic,
  state,
  pct,
  lockedPrereqs,
  onOpen,
  onOpenRule,
}: {
  topic: GrammarTopic;
  state: TopicState;
  pct: number;
  lockedPrereqs: string[];
  onOpen: () => void;
  /** Opens the topic's rule (rules are link-only now); absent when the topic has no rule. */
  onOpenRule?: () => void;
}) {
  const locked = state === "locked";
  const stateClass =
    state === "mastered" ? " gtopic--mastered" : locked ? " gtopic--locked" : "";
  // Tappable rows START the lesson (decision: rows stay actionable). A nested <button> for the
  // rule link can't live inside a <button>, so the row is a div with role="button" + keyboard
  // activation; the rule link stops propagation so it never also triggers the lesson.
  const rowProps = locked
    ? {}
    : {
        role: "button",
        tabIndex: 0,
        onClick: onOpen,
        onKeyDown: (e: KeyboardEvent) => {
          // Only the row itself activates — ignore keys bubbling up from the nested rule-link
          // button (otherwise Enter on «Правила» would also start the lesson).
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        },
      };
  return (
    <div className={"gtopic" + stateClass} {...rowProps}>
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
        {!locked && onOpenRule && (
          <span className="gtopic__links">
            <button
              type="button"
              className="tr-rulelink"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRule();
              }}
            >
              <UiIcon name="rules" size={13} /> Правила
            </button>
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
    </div>
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

/* The six exercise cards (ItemScreen + the four card types) live in GrammarCards.tsx,
   shared with the decoupled review trainer (GrammarTrainer.tsx). */

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
