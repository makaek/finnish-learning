/**
 * charts.tsx — the dashboard's one chart primitive: a dependency-free SVG ring gauge.
 *
 * (The earlier bar-list / stacked-column / donut / KPI-card primitives were dropped when the
 * Метрики screen was redesigned; only the «Сегодня» ring gauges remain.)
 */

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
