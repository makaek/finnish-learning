/**
 * GrammarCards.tsx — the six precomputed-graded grammar exercise cards, shared by the
 * level-coupled lesson flow (Grammar.tsx) and the decoupled review trainer (GrammarTrainer.tsx).
 *
 * Each card grades locally (no DB/level logic) and reports its first-attempt verdict through
 * `onComplete(item, correct)`. `ItemScreen` dispatches on the item type. Pure presentation over
 * core/grammar — extracted out of Grammar.tsx so the trainer reuses the exact same widgets and
 * grading (and inherits the same UX, e.g. no on-screen ä/ö keys).
 */

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  choiceOrder,
  gradeCell,
  gradeTyped,
  stripForm,
  type ChoiceRuItem,
  type ChooseFormItem,
  type FillTableItem,
  type GrammarItem,
  type TypedFormItem,
  type TypedGrade,
} from "../core/grammar";
import { normalizeFi } from "../core/normalize";
import { pickBestSpoken } from "../core/spokenNumber";
import { speechTroubleRu, useSpeechRecognition } from "./useSpeechRecognition";
import { FormText, GCanon, GExplain, RuText } from "./grammarKit";

export function ItemScreen({
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

/** produce_form / transform — typed input with optional voice input, near-miss grading. */
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
          /* A near-miss is amber in the UI but counts as a MISS for the score —
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
