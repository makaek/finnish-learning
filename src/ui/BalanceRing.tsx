/**
 * BalanceRing.tsx — the home-screen "Кольцо баланса".
 *
 * One SVG that shows every mode at once: each spoke's length = that mode's mastery,
 * colour = its state (red ≤30%, yellow <100%, green at 100%), and an emoji chip at the tip
 * names it with a small badge of how many current-level items still need mastering in that
 * mode. Group arcs + labels wrap the outside (Слова / Предложения / Чтение). The dashed inner
 * circle is the level ceiling (= the weakest mode). EVERY spoke is tappable — even a finished
 * or empty mode starts (it just reviews already-mastered items, SRS-weighted).
 *
 * Pure presentation over core/balance.ts — no learning logic here. Colours come from the
 * existing token set (--ok / --known / --no) so it tracks light/dark for free.
 */

import type { Balance, ModeCell } from "../core/balance";

const GROUP_LABEL: Record<ModeCell["group"], string> = {
  words: "Слова",
  sent: "Предложения",
  read: "Чтение",
};

const STATE_COLOR: Record<ModeCell["state"], string> = {
  weak: "var(--no)", //   red — ≤ 30% mastered in this mode at this level
  ok: "var(--known)", //  yellow — > 30% but < 100%
  done: "var(--ok)", //   green — 100% (or nothing left to drill)
};

const cellColor = (c: ModeCell): string => STATE_COLOR[c.state];

/* geometry */
const VB = 364;
const CX = 182;
const CY = 184;
const R0 = 46; // inner hub radius
const R = 120; // max spoke radius
const CHIP_R = R + 30; // emoji chip ring
const LABEL_R = R + 56; // group labels

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
}
function arcPath(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

export default function BalanceRing({
  balance,
  left,
  onPick,
}: {
  balance: Balance;
  /**
   * Per-mode leftover count (mode id → items still to master at this level), sourced from the same
   * hidden/eligibility-filtered pools the session draws from — so the badge matches what tapping
   * actually drills. Falls back to the raw `total - mastered` when not supplied.
   */
  left?: Record<string, number>;
  /** Start a mode by its ModeInput.id — every spoke fires (finished modes review their items). */
  onPick: (id: string) => void;
}) {
  const cells = balance.cells;
  const n = cells.length;
  const step = 360 / n;
  const gateR = R0 + balance.gate * (R - R0);

  // contiguous angular span per group (cells are pre-ordered words→sent→read)
  const spans = new Map<ModeCell["group"], { a: number; b: number }>();
  cells.forEach((c, i) => {
    const s = spans.get(c.group) ?? { a: i, b: i };
    s.a = Math.min(s.a, i);
    s.b = Math.max(s.b, i);
    spans.set(c.group, s);
  });

  return (
    <svg
      className="bring"
      viewBox={`0 0 ${VB} ${VB + 8}`}
      role="img"
      aria-label={`Баланс режимов ${balance.score}%. Слабое звено: ${balance.weakest?.label ?? "нет"}.`}
    >
      {/* group arcs + labels */}
      {[...spans.entries()].map(([g, { a, b }]) => {
        const a0 = -90 + a * step - step / 2 + 4;
        const a1 = -90 + b * step + step / 2 - 4;
        const [lx, ly] = polar(LABEL_R, -90 + ((a + b) / 2) * step);
        return (
          <g key={g}>
            <path className={`bring__arc bring__arc--${g}`} d={arcPath(R + 9, a0, a1)} />
            <text className={`bring__glabel bring__glabel--${g}`} x={lx} y={ly}>
              {GROUP_LABEL[g]}
            </text>
          </g>
        );
      })}

      {/* guide rings + spokes */}
      <circle className="bring__guide" cx={CX} cy={CY} r={(R0 + R) / 2} />
      <circle className="bring__guide" cx={CX} cy={CY} r={R} />
      {cells.map((_, i) => {
        const [x1, y1] = polar(R0, -90 + i * step);
        const [x2, y2] = polar(R, -90 + i * step);
        return <line key={`g${i}`} className="bring__guide" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}

      {/* level ceiling = weakest mastery */}
      <circle className="bring__gate" cx={CX} cy={CY} r={gateR} />

      {/* petals */}
      {cells.map((c, i) => {
        const ang = -90 + i * step;
        const [x1, y1] = polar(R0 + 2, ang);
        const [x2, y2] = polar(R0 + c.mastery * (R - R0), ang);
        return (
          <line
            key={`p${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={cellColor(c)}
            strokeWidth={c.weakest ? 16 : 14}
            strokeLinecap="round"
            opacity={c.weakest ? 1 : 0.92}
          />
        );
      })}

      {/* emoji chips (identity + tap target). Every spoke is startable; a corner badge shows how
          many current-level items still need mastering in that mode (like the old card count). */}
      {cells.map((c, i) => {
        const [cx, cy] = polar(CHIP_R, -90 + i * step);
        const col = cellColor(c);
        const rr = c.weakest ? 16 : 14;
        // Prefer the filtered leftover count (matches the session); fall back to the raw cell math.
        const leftN = left?.[c.id] ?? Math.max(0, c.total - c.mastered);
        return (
          <g
            key={`c${i}`}
            className="bring__chipg is-tappable"
            onClick={() => onPick(c.id)}
            // Keep the spoke reachable by keyboard: an SVG <g> isn't natively focusable, so
            // role="button" alone would promise an interaction keyboard users can't trigger.
            // tabIndex + Enter/Space deliver it.
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(c.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={
              leftN > 0
                ? `${c.label}: освоено ${Math.round(c.mastery * 100)}%, осталось ${leftN}`
                : `${c.label}: освоено`
            }
          >
            {c.weakest && <circle cx={cx} cy={cy} r={rr + 4.5} fill="none" stroke={col} strokeWidth="2" opacity="0.4" />}
            <circle cx={cx} cy={cy} r={rr} fill="var(--card)" stroke={col} strokeWidth="2.2" />
            <text className="bring__emoji" x={cx} y={cy + 0.5}>
              {c.icon}
            </text>
            {leftN > 0 && (
              <>
                <circle cx={cx + 11} cy={cy - 11} r="8.5" fill="var(--accent)" stroke="var(--card)" strokeWidth="1.5" />
                <text className="bring__count" x={cx + 11} y={cy - 10.5}>
                  {leftN}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* centre: current level */}
      <circle cx={CX} cy={CY} r={R0 - 4} fill="var(--card)" stroke="var(--border)" strokeWidth="1.4" />
      <text className="bring__level" x={CX} y={CY - 4}>
        {balance.level}
      </text>
      <text className="bring__levellabel" x={CX} y={CY + 16}>
        УРОВЕНЬ
      </text>
    </svg>
  );
}
