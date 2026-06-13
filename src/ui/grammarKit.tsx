/**
 * grammarKit.tsx — shared presentation primitives for the «Грамматика» mode
 * (design_handoff_grammar → gram-kit.jsx, recreated over the production CSS).
 *
 * Pure presentational components over core/grammar's parsed content: the explanation
 * block, concept tags, mastery ring, paradigm table with letter highlights, the ä/ö
 * quick-insert keys and the canonical-answer row. No state, no data access.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  parseForm,
  parseRu,
  type GrammarTag,
  type ParadigmKey,
  type ParadigmRow,
} from "../core/grammar";
import { UiIcon, type UiIconName } from "./icons";

/* ------------------------------------------------------------------ text markup */

/** Russian copy with `*…*` Finnish fragments rendered as emphasised runs. */
export function RuText({ text }: { text: string }) {
  return (
    <>
      {parseRu(text).map((seg, i) =>
        seg.fi ? (
          <span key={i} className="fi" lang="fi">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** A Finnish form with `{…}`/`[…]` letter highlights (background wash, not colour alone). */
export function FormText({ text }: { text: string }) {
  return (
    <>
      {parseForm(text).map((seg, i) =>
        seg.hl ? (
          <mark key={i} className={"ghl" + (seg.hl === "alt" ? " ghl--alt" : "")}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ explanation */

export type ExplainTone = "ok" | "no" | "near" | "info";

const TONE_ICON: Record<ExplainTone, UiIconName> = {
  ok: "check",
  no: "x",
  near: "bolt",
  info: "info",
};

/** The reusable learning-moment block: icon disc + 1–2 Russian sentences. */
export function GExplain({ tone, children }: { tone: ExplainTone; children: ReactNode }) {
  return (
    <div className={"gx gx--" + tone}>
      <span className="gx__ic" aria-hidden="true">
        <UiIcon name={TONE_ICON[tone]} size={13} strokeWidth={2.6} />
      </span>
      <p className="gx__t">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ concept tags */

const TAG_LABEL: Record<GrammarTag, string> = {
  verbtype: "тип глагола",
  case: "падеж",
  grad: "чередование",
  neg: "коннегатив",
  part: "партитив",
  vh: "гармония гласных",
};

export function GTagChip({ kind, label }: { kind: GrammarTag; label?: string }) {
  return (
    <span className={"gtag gtag--" + kind}>
      <span className="gtag__dot" aria-hidden="true" />
      {label ?? TAG_LABEL[kind]}
    </span>
  );
}

/* ------------------------------------------------------------------ mastery ring */

/**
 * Small SVG mastery ring (gram hue; 100% renders green). `animate` eases the fill in
 * from `from` on mount — used by the summary screen's big ring.
 */
export function MasteryRing({
  pct,
  size = 28,
  from,
}: {
  /** 0..1 */
  pct: number;
  size?: number;
  /** Animate the fill from this value (0..1) to `pct` on mount. */
  from?: number;
}) {
  const r = 10.5;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(from ?? pct);
  useEffect(() => {
    if (from === undefined) {
      setShown(pct);
      return;
    }
    // Double rAF so the browser paints the initial offset before the eased value lands —
    // a single frame can coalesce both states on slower devices and skip the transition.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(pct));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pct, from]);
  const col = pct >= 1 ? "var(--ok)" : "var(--gram)";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="none" strokeWidth="4.5" style={{ stroke: "var(--surface-2)" }} />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0.02, Math.min(1, shown)))}
        transform="rotate(-90 14 14)"
        className={from !== undefined ? "gring__fill" : undefined}
        style={{ stroke: col }}
      />
    </svg>
  );
}

/** Mastery ring + tabular percent label (topic cards, the map hero). */
export function Mastery({ pct }: { pct: number }) {
  return (
    <span className="gmast">
      <MasteryRing pct={pct} />
      <span className="gmast__pct">{Math.round(pct * 100)}%</span>
    </span>
  );
}

/** The green «✓ Освоено» pill. */
export function MasteredPill() {
  return (
    <span className="gdone">
      <UiIcon name="check" size={12} strokeWidth={3} /> Освоено
    </span>
  );
}

/* ------------------------------------------------------------------ theory pieces */

/** Paradigm table: 2 columns (person / form) so it never crams a phone. */
export function ParadigmTable({ rows }: { rows: readonly ParadigmRow[] }) {
  const isRu = (s: string) => /[а-яё]/i.test(s);
  return (
    <div className="gpara" role="table" lang="fi">
      {rows.map((row, i) => (
        <span key={i} style={{ display: "contents" }}>
          <span className="gpara__p" lang={isRu(row.l) ? "ru" : "fi"}>
            {row.l}
          </span>
          <span className="gpara__f">
            <FormText text={row.f} />
            {row.ru && (
              <span className="gpara__ru" lang="ru">
                {row.ru}
              </span>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Colour key under the paradigm table (what the two highlight washes mean). */
export function ParaKey({ items }: { items: readonly ParadigmKey[] }) {
  if (items.length === 0) return null;
  return (
    <div className="gparakey">
      {items.map((k, i) => (
        <span key={i} className="gparakey__i">
          <span className={"gparakey__sw gparakey__sw--" + k.hl} aria-hidden="true" />
          {k.label}
        </span>
      ))}
    </div>
  );
}

export function GExample({ fi, ru }: { fi: string; ru: string }) {
  return (
    <div className="gex">
      <span className="gex__fi" lang="fi">
        {fi}
      </span>
      <span className="gex__ru">{ru}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ lesson chrome */

/** Lesson header: exit · topic eyebrow + stage line · item counter, then 3 step segments. */
export function LessonTop({
  topic,
  step,
  count,
  onExit,
}: {
  topic: string;
  /** 1 = Теория, 2 = Разминка, 3 = Дрилл. */
  step: 1 | 2 | 3;
  count?: string;
  onExit: () => void;
}) {
  const names = ["Теория", "Разминка", "Дрилл"];
  return (
    <div className="gles">
      <div className="gles__row">
        <button type="button" className="gexit" aria-label="Выйти из урока" onClick={onExit}>
          <UiIcon name="x" size={15} strokeWidth={2.2} />
        </button>
        <div className="gles__mid">
          <div className="gles__eyebrow">{topic}</div>
          <div className="gles__stage">
            {names[step - 1]} <span>· шаг {step} из 3</span>
          </div>
        </div>
        {count && <span className="gles__count">{count}</span>}
      </div>
      <div className="gsteps" aria-hidden="true">
        {[1, 2, 3].map((s) => (
          <span key={s} className={"gstep" + (s < step ? " gstep--done" : s === step ? " gstep--on" : "")} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ typed-input help */

/** Canonical correct answer row («ВЕРНО · nukkuu»), with the theory-table highlights. */
export function GCanon({ canonical }: { canonical: string }) {
  return (
    <div className="gcanon">
      <span className="gcanon__k">Верно</span>
      <span className="gcanon__v" lang="fi">
        <FormText text={canonical} />
      </span>
    </div>
  );
}

