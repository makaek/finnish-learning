/**
 * GrammarTrainer.tsx — the «Грамматика · тренажёр» (design_handoff_grammar_trainer): a free
 * review session (intro → 10 cards → summary) over the grammar item types, DECOUPLED from level
 * progress. It reads progress only to weight the queue (core/grammarTrainer.ts) and writes NOTHING
 * back — no mastery, no unlocks, no daily count. The "повторение · без влияния на уровень" framing
 * on the intro and summary is the core product distinction; keep it.
 *
 * Reuses the shared exercise cards (GrammarCards.tsx). Rules open as overlays via RulesBook.
 */

import { useMemo, useState } from "react";
import {
  buildGrammarTrainer,
  trainerFocus,
  trainerReview,
  type TrainerReviewRow,
} from "../core/grammarTrainer";
import type { GrammarContent, GrammarItem } from "../core/grammar";
import type { ProgressMap } from "../core/progress";
import type { RuleItem } from "../core/rules";
import { useOnline } from "./useOnline";
import { UiIcon } from "./icons";
import { GTagChip } from "./grammarKit";
import { ItemScreen } from "./GrammarCards";
import RulesBook from "./RulesBook";

const NO_PROGRESS_BADGE = "без влияния на уровень";

interface GrammarTrainerProps {
  content: GrammarContent;
  rules: RuleItem[];
  progress: ProgressMap;
  /** BCP-47 locale for the typed items' voice input. */
  speechLang: string;
  /** Return to the launching screen (home / grammar tab / metrics). */
  onExit: () => void;
}

export default function GrammarTrainer({
  content,
  rules,
  progress,
  speechLang,
  onExit,
}: GrammarTrainerProps) {
  const online = useOnline();
  // One timestamp seeds BOTH the queue draw and the staleness weighting; «Ещё раз» rerolls it for
  // a fresh queue. Progress is read once at open — the trainer never writes back, so it can't change.
  const [seed, setSeed] = useState(() => Date.now());
  const items = useMemo(
    () => buildGrammarTrainer(content, progress, seed, seed),
    [content, progress, seed],
  );
  const focus = useMemo(() => trainerFocus(content, items, progress), [content, items, progress]);

  const [phase, setPhase] = useState<"intro" | "session" | "summary">("intro");
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const total = items.length;

  const start = () => {
    setResults([]);
    setIdx(0);
    setPhase("session");
  };
  const again = () => {
    setSeed(Date.now()); // fresh queue
    setResults([]);
    setIdx(0);
    setPhase("session");
  };
  const resolve = (correct: boolean) => {
    const next = [...results, correct];
    setResults(next);
    if (next.length >= total) setPhase("summary");
    else setIdx(idx + 1);
  };

  if (phase === "session" && total > 0) {
    return (
      <Session
        items={items}
        content={content}
        idx={idx}
        speechLang={speechLang}
        online={online}
        onExit={onExit}
        onResolve={resolve}
      />
    );
  }

  if (phase === "summary") {
    return (
      <Summary
        content={content}
        rules={rules}
        items={items}
        results={results}
        onAgain={again}
        onDone={onExit}
      />
    );
  }

  return <Intro focus={focus} total={total} onStart={start} onBack={onExit} />;
}

/* ===================================================================== intro */

function Intro({
  focus,
  total,
  onStart,
  onBack,
}: {
  focus: ReturnType<typeof trainerFocus>;
  total: number;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <main className="app app--scroll">
      <div className="gshell">
        <div className="tr-introtop">
          <button type="button" className="gexit" aria-label="Назад" onClick={onBack}>
            <UiIcon name="back" size={17} />
          </button>
        </div>
        <div className="tr-intro">
          <div className="tr-herocard">
            <span className="tr-disc" aria-hidden="true">
              <UiIcon name="pen" size={28} />
            </span>
            <span className="tr-kicker">Грамматика</span>
            <h1 className="tr-title">Тренажёр</h1>
            <p className="tr-sub">
              Свободное повторение пройденных тем. Подбираем слабые и давно не повторённые задания —
              уровень и прогресс не меняются.
            </p>
            <div className="tr-metarow">
              <span className="tr-meta">
                <UiIcon name="grid" size={14} /> {total} заданий
              </span>
              <span className="tr-meta">
                <UiIcon name="target" size={14} /> ~6 мин
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <TrBadge text={NO_PROGRESS_BADGE} />
            </div>
          </div>

          {focus.length > 0 && (
            <div className="tr-focus">
              <div className="tr-focus__h">
                <UiIcon name="bolt" size={13} strokeWidth={2.2} /> В фокусе сессии
              </div>
              <div className="tr-fchips">
                {focus.map((f) => (
                  <span key={f.topic.id} className="tr-fchip">
                    {f.topic.title}
                    <span className={"tr-fchip__pct" + (f.low ? " tr-fchip__pct--low" : "")}>
                      {f.pct}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="gspacer" />
          {total > 0 ? (
            <button type="button" className="gnext" onClick={onStart}>
              Начать
            </button>
          ) : (
            <p className="hint" style={{ textAlign: "center" }}>
              Пока нет пройденных тем для повторения — начните уроки грамматики.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

/* ===================================================================== session */

function Session({
  items,
  content,
  idx,
  speechLang,
  online,
  onExit,
  onResolve,
}: {
  items: GrammarItem[];
  content: GrammarContent;
  idx: number;
  speechLang: string;
  online: boolean;
  onExit: () => void;
  onResolve: (correct: boolean) => void;
}) {
  const item = items[idx]!;
  const topic = content.topics.find((t) => t.id === item.topic);
  const total = items.length;

  return (
    <main className="app app--scroll">
      <div className="gshell">
        <div className="tr-top">
          <div className="tr-toprow">
            <button type="button" className="gexit" aria-label="Выйти" onClick={onExit}>
              <UiIcon name="x" size={15} strokeWidth={2.2} />
            </button>
            <div className="tr-mid">
              <div className="tr-eyebrow">Грамматика · тренажёр</div>
              <div className="tr-stage">{topic?.title ?? "Повторение"}</div>
            </div>
            <span className="tr-count">
              {idx + 1} / {total}
            </span>
          </div>
          <div className="tr-prog">
            <div className="tr-prog__fill" style={{ width: `${(idx / total) * 100}%` }} />
          </div>
        </div>

        <div className="tr-card-topwrap">
          <span className="gtags">
            {topic?.tags.map((k) => <GTagChip key={k} kind={k} />)}
          </span>
          <button type="button" className="tr-skip" onClick={() => onResolve(true)}>
            <UiIcon name="check" size={13} strokeWidth={2.4} /> Уже знаю
          </button>
        </div>

        <ItemScreen
          key={idx}
          item={item}
          speechLang={speechLang}
          online={online}
          onComplete={(_item, correct) => onResolve(correct)}
        />
      </div>
    </main>
  );
}

/* ===================================================================== summary */

function Summary({
  content,
  rules,
  items,
  results,
  onAgain,
  onDone,
}: {
  content: GrammarContent;
  rules: RuleItem[];
  items: GrammarItem[];
  results: boolean[];
  onAgain: () => void;
  onDone: () => void;
}) {
  const score = results.filter(Boolean).length;
  const total = items.length;
  const title =
    score >= 9 ? "Отлично!" : score >= 7 ? "Хорошо!" : score >= 5 ? "Неплохо" : "Есть над чем поработать";
  const review = useMemo(() => trainerReview(content, items, results), [content, items, results]);
  const [ruleIds, setRuleIds] = useState<readonly string[] | null>(null);

  return (
    <main className="app app--scroll">
      <div className="gshell gshell--center">
        <div className="gsum">
          <span
            className="tr-disc"
            aria-hidden="true"
            style={{ width: 72, height: 72, borderRadius: 24 }}
          >
            <UiIcon name="check" size={34} strokeWidth={2.2} />
          </span>
          <h2 className="gsum__title" style={{ marginTop: "0.8rem" }}>
            {title}
          </h2>
          <div className="gsum__sub">Тренировка завершена</div>
          <div className="gsum__score">
            {score}
            <small>/{total}</small>
          </div>
          <div style={{ marginTop: 10 }}>
            <TrBadge text={NO_PROGRESS_BADGE} />
          </div>
        </div>

        <div className="gsumcard">
          <div className="gsumcard__t">{review.length ? "Повторите · откройте правило" : "Результат"}</div>
          {review.length ? (
            <div className="tr-rev">
              {review.map((r) => (
                <ReviewRow key={r.topic.id} row={r} onOpenRule={setRuleIds} />
              ))}
            </div>
          ) : (
            <div className="tr-allgood">
              <UiIcon name="check" size={18} strokeWidth={2.4} /> Все темы без ошибок — отличная форма!
            </div>
          )}
        </div>

        <div className="tr-note">
          <UiIcon name="info" size={14} /> Это тренировка — уровень и прогресс не изменились.
        </div>

        <div className="gspacer" />
        <div className="gbtnrow">
          <button type="button" className="gnext gnext--ghost" onClick={onAgain}>
            Ещё раз
          </button>
          <button type="button" className="gnext" onClick={onDone}>
            Готово
          </button>
        </div>
      </div>

      {ruleIds && (
        <RulesBook rules={rules} highlightIds={ruleIds} overlay onClose={() => setRuleIds(null)} />
      )}
    </main>
  );
}

function ReviewRow({
  row,
  onOpenRule,
}: {
  row: TrainerReviewRow;
  onOpenRule: (ruleIds: readonly string[]) => void;
}) {
  const hasRule = row.topic.ruleIds.length > 0;
  const accCls = row.acc >= 80 ? "green" : row.acc >= 50 ? "amber" : "red";
  return (
    <button
      type="button"
      className="tr-revrow tr-revrow--btn"
      disabled={!hasRule}
      onClick={hasRule ? () => onOpenRule(row.topic.ruleIds) : undefined}
    >
      <span className="tr-revrow__ic" aria-hidden="true">
        <UiIcon name="rules" size={15} />
      </span>
      <span className="tr-revrow__name">{row.topic.title}</span>
      <span className={"tr-revrow__acc tr-acc--" + accCls}>{row.acc}%</span>
      {hasRule && (
        <span className="tr-revrow__go" aria-hidden="true">
          <UiIcon name="chevR" size={16} />
        </span>
      )}
    </button>
  );
}

/* ===================================================================== shared bits */

function TrBadge({ text }: { text: string }) {
  return (
    <span className="tr-badge">
      <UiIcon name="refresh" size={13} strokeWidth={2.1} /> {text}
    </span>
  );
}
