/**
 * charts.tsx — tiny dependency-free SVG/CSS chart primitives for the dashboard.
 *
 * Deliberately no charting library: a handful of pure-presentational components (a ring gauge,
 * horizontal bar list, stacked columns, donut) keep the bundle lean and the look on-brand.
 * Interactivity is hover-highlight + a live caption that reflects the focused datum.
 */

import { useState, type ReactNode } from "react";

/** A circular progress ring with two centred text lines. */
export function RingGauge({
  value,
  max,
  top,
  bottom,
  tone = "accent",
}: {
  value: number;
  max: number;
  top: string;
  bottom: string;
  tone?: "accent" | "ok" | "no" | "yellow" | "known" | "muted";
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={`${top} ${bottom}`}>
      <circle cx="60" cy="60" r={r} className="ring__track" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className={`ring__fill tone-${tone}`}
        style={{ strokeDasharray: circ, strokeDashoffset: circ * (1 - pct) }}
      />
      <text x="60" y="56" className="ring__top">
        {top}
      </text>
      <text x="60" y="76" className="ring__bottom">
        {bottom}
      </text>
    </svg>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  max: number;
  /** Text shown at the row's right (defaults to `value / max`). */
  valueText?: string;
  /** Fill tone class suffix (green/yellow/red/accent/muted). */
  tone?: string;
}

/** A list of horizontal bars (level progress, accuracy, coverage). */
export function BarList({ items }: { items: BarDatum[] }) {
  return (
    <ul className="barlist">
      {items.map((d, i) => {
        const pct = d.max <= 0 ? 0 : Math.max(0, Math.min(1, d.value / d.max)) * 100;
        return (
          <li key={i} className="barlist__row" title={`${d.label}: ${d.valueText ?? `${d.value} / ${d.max}`}`}>
            <span className="barlist__label">{d.label}</span>
            <span className="barlist__track">
              <span
                className={`barlist__fill tone-${d.tone ?? "accent"}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="barlist__value">{d.valueText ?? `${d.value} / ${d.max}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One stacked column made of named segments. */
export interface StackSegment {
  key: string;
  value: number;
  tone: string;
}
export interface ColumnDatum {
  label: string;
  segments: StackSegment[];
  /** Caption shown when this column is focused. */
  caption: string;
}

/** Stacked column chart with a live caption reflecting the hovered/focused column. */
export function StackedColumns({
  data,
  legend,
  emptyCaption,
}: {
  data: ColumnDatum[];
  legend: { key: string; label: string; tone: string }[];
  emptyCaption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.segments.reduce((s, x) => s + x.value, 0)));
  const focused = active !== null ? data[active] : undefined;
  return (
    <div className="cols">
      <div className="cols__plot" role="group">
        {data.map((d, i) => {
          const total = d.segments.reduce((s, x) => s + x.value, 0);
          return (
            <button
              type="button"
              key={i}
              className={"cols__col" + (active === i ? " cols__col--active" : "")}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              title={d.caption}
              aria-label={d.caption}
            >
              <span className="cols__stack" style={{ height: `${(total / max) * 100}%` }}>
                {d.segments.map((seg) => (
                  <span
                    key={seg.key}
                    className={`cols__seg tone-${seg.tone}`}
                    style={{ flexGrow: seg.value }}
                  />
                ))}
              </span>
              <span className="cols__xlabel">{d.label}</span>
            </button>
          );
        })}
      </div>
      <p className="cols__caption">{focused ? focused.caption : emptyCaption}</p>
      <ul className="legend-row">
        {legend.map((l) => (
          <li key={l.key}>
            <span className={`legend-dot tone-${l.tone}`} aria-hidden="true" /> {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  tone: string;
}

/** A donut with a live centre label reflecting the hovered segment (total by default). */
export function Donut({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const frac = total <= 0 ? 0 : seg.value / total;
    const arc = (
      <circle
        key={i}
        cx="60"
        cy="60"
        r={r}
        className={`donut__arc tone-${seg.tone} ${active !== null && active !== i ? "donut__arc--dim" : ""}`}
        style={{ strokeDasharray: `${circ * frac} ${circ * (1 - frac)}`, strokeDashoffset: -offset }}
        onMouseEnter={() => setActive(i)}
        onMouseLeave={() => setActive(null)}
      />
    );
    offset += circ * frac;
    return arc;
  });
  const center = active !== null ? segments[active]! : null;
  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" role="img" aria-label={centerLabel}>
        <circle cx="60" cy="60" r={r} className="donut__track" />
        {arcs}
        <text x="60" y="56" className="donut__value">
          {center ? center.value : total}
        </text>
        <text x="60" y="76" className="donut__label">
          {center ? center.label : centerLabel}
        </text>
      </svg>
      <ul className="legend-col">
        {segments.map((seg, i) => (
          <li
            key={i}
            className={active === i ? "is-active" : ""}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className={`legend-dot tone-${seg.tone}`} aria-hidden="true" /> {seg.label}
            <span className="legend-col__v">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A headline metric card. */
export function KpiCard({ icon, value, label, sub }: { icon: string; value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="kpi">
      <span className="kpi__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="kpi__value">{value}</span>
      <span className="kpi__label">{label}</span>
      {sub && <span className="kpi__sub">{sub}</span>}
    </div>
  );
}
