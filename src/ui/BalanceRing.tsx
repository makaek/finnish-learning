/**
 * BalanceRing.tsx — the home-screen "Кольцо баланса" (production ring, Direction A).
 *
 * Exact port of the approved production ring (handoff `ring.jsx`), reconciled with this app's
 * settled behaviour:
 *   • 9 spokes from the hub; spoke LENGTH = mode mastery (0..1), min stub so weak modes show.
 *   • the mode ICON (monoline) is glued to the spoke TIP (distance from centre = mastery).
 *   • spoke COLOUR = a continuous warm-red→yellow-green→green ramp; the WEAKEST spoke is forced
 *     coral (it echoes the "слабое звено" card).
 *   • EVERY spoke is startable and shows its remaining-count badge (sourced from `left`, the
 *     same hidden/eligibility-filtered count the home computes; weakest badge red, others blue).
 *   • the weakest mode also gets a faint coral halo.
 *   • coloured group arcs wrap the outside; group NAMES live in a legend below the ring.
 *   • dashed inner disc = the level gate (ceiling = weakest mastery).
 *   • viewBox is cropped (`24 22 316 304`) so the ring FILLS the card with no side whitespace.
 *
 * Presentation only. All balance maths is in core/balance.ts. Structural colours (ink/sub/card/
 * line) use theme tokens so the ring tracks light/dark; semantic colours (green/red/blue/group
 * hues + the gradient) are literal so the meaning reads identically in both themes.
 */

import type { Balance, BalanceGroup } from "../core/balance";

/* ====================================================================== icons
 * Monoline, 24×24 viewBox, stroke = currentColor. Keys match ModeInput.icon. */
export type IconName = "eye" | "pen" | "mic" | "phones" | "chat" | "book" | "masks";

const ICONS: Record<IconName, JSX.Element> = {
  eye: (<><circle cx="12" cy="12" r="3.2" /><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /></>),
  pen: (<><path d="M4 20h4L19 9a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16v4Z" /><path d="M14 7l3 3" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  phones: (<><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.6" /><rect x="17" y="13" width="4" height="6" rx="1.6" /></>),
  chat: (<><path d="M4 5h16v11H9l-4 4v-4H4V5Z" /></>),
  book: (<><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z" /><path d="M12 6v14" /></>),
  masks: (<><path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z" /><path d="M12.5 9h8v6a4 4 0 0 1-8 0" /><path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1" /></>),
};

/** Standalone monoline icon (reused by the home's action cards). */
export function ModeIcon({ name, size = 24, strokeWidth = 1.85 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ===================================================================== colour */
const COL = {
  // structural — theme tokens, so the ring follows light/dark
  ink: "var(--text)",
  sub: "var(--muted)",
  card: "var(--card)",
  line: "var(--border)",
  // semantic — literal so the meaning reads the same in both themes
  green: "#3B9C6E",
  red: "#CE6A57",
  blue: "#3B68C9",
};
const GROUP_HUE: Record<BalanceGroup, string> = {
  words: "#5B53C6",
  sent: "#1B8E84",
  read: "#BB6A39",
};
const GROUP_LABEL: Record<BalanceGroup, string> = {
  words: "Слова",
  sent: "Предложения",
  read: "Чтение",
};

/** Continuous warm-red→yellow-green→green ramp; the weakest spoke is forced coral. */
function spokeColor(mastery: number, weak: boolean): string {
  if (weak) return COL.red;
  const h = 28 + mastery * 116; // 28° (warm) → 144° (green)
  return `hsl(${Math.round(h)}, 46%, 47%)`;
}

/* =================================================================== geometry */
const CX = 182;
const CY = 178;
const R0 = 47; // hub radius
const RR = 126; // max spoke radius (mastery = 1)
const STUB = 0.22; // floor on spoke length so weak modes stay visible

const rad = (deg: number) => (deg * Math.PI) / 180;
const pol = (r: number, deg: number): [number, number] => [CX + Math.cos(rad(deg)) * r, CY + Math.sin(rad(deg)) * r];
function arcPath(r: number, a0: number, a1: number): string {
  const [x0, y0] = pol(r, a0);
  const [x1, y1] = pol(r, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
const tipRadius = (m: number) => R0 + Math.max(m, STUB) * (RR - R0);

/* ======================================================================= chip */
function Chip({ x, y, color, icon, weak, badge }: {
  x: number; y: number; color: string; icon: IconName; weak: boolean; badge: number | null;
}) {
  const rr = weak ? 16 : 14; // chip radius
  const isz = weak ? 22 : 20; // icon box
  return (
    <g>
      {weak && <circle cx={x} cy={y} r={rr + 5} fill="none" stroke={color} strokeWidth={2.4} opacity={0.45} />}
      <circle cx={x} cy={y} r={rr} fill={COL.card} stroke={color} strokeWidth={2.3} />
      <svg x={x - isz / 2} y={y - isz / 2} width={isz} height={isz} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      {badge != null && (
        <g>
          <circle cx={x + rr - 1} cy={y - rr + 1} r={8.5} fill={weak ? COL.red : COL.blue} stroke={COL.card} strokeWidth={1.4} />
          <text x={x + rr - 1} y={y - rr + 1.5} textAnchor="middle" dominantBaseline="central"
            fontWeight={700} fontSize={10} fill="#fff">{badge}</text>
        </g>
      )}
    </g>
  );
}

/* ======================================================================= ring */
export default function BalanceRing({ balance, left, onPick }: {
  balance: Balance;
  /** Per-mode leftover count (id → items still to master), matching what tapping the spoke opens. */
  left?: Record<string, number>;
  /** Start a mode by ModeCell.id — every spoke fires (finished modes just review their items). */
  onPick: (id: string) => void;
}) {
  const cells = balance.cells;
  const step = 360 / cells.length; // 9 modes → 40°, first at top (-90°)
  const gateR = R0 + balance.gate * (RR - R0);

  // contiguous angular span per group (cells are pre-ordered words→sent→read)
  const spans = new Map<BalanceGroup, [number, number]>();
  cells.forEach((c, i) => {
    const s = spans.get(c.group);
    if (s) s[1] = i;
    else spans.set(c.group, [i, i]);
  });

  return (
    <div className="bring">
      {/* viewBox cropped so the ring fills the card width */}
      <svg viewBox="24 22 316 304" className="bring__svg"
        role="img" aria-label={`Баланс ${balance.score}%. Слабое звено: ${balance.weakest?.label ?? "нет"}.`}>
        {/* group arcs (names are in the legend, not on the ring) */}
        {[...spans.entries()].map(([g, [a, b]]) => {
          const a0 = -90 + a * step - step / 2 + 4;
          const a1 = -90 + b * step + step / 2 - 4;
          return <path key={g} d={arcPath(RR + 14, a0, a1)} stroke={GROUP_HUE[g]} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />;
        })}

        {/* outer guide + level gate (ceiling at the weakest mastery) */}
        <circle cx={CX} cy={CY} r={RR} fill="none" stroke={COL.line} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={gateR} fill={COL.red} opacity={0.05} />
        <circle cx={CX} cy={CY} r={gateR} fill="none" stroke={COL.red} strokeWidth={1.3} strokeDasharray="2 4" opacity={0.5} />

        {/* spokes: hub → chip centre, so the icon sits glued on the tip */}
        {cells.map((c, i) => {
          const ang = -90 + i * step;
          const [x1, y1] = pol(R0 + 2, ang);
          const [x2, y2] = pol(tipRadius(c.mastery), ang);
          return <line key={`s${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={spokeColor(c.mastery, c.weakest)} strokeWidth={c.weakest ? 16 : 14}
            strokeLinecap="round" opacity={0.95} />;
        })}

        {/* chips at the tips (every one a tap target) */}
        {cells.map((c, i) => {
          const ang = -90 + i * step;
          const [x, y] = pol(tipRadius(c.mastery), ang);
          const leftN = left?.[c.id] ?? Math.max(0, c.total - c.mastered);
          return (
            <g key={`c${i}`} className="bring__tap"
              onClick={() => onPick(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(c.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={leftN > 0
                ? `${c.label}: освоено ${Math.round(c.mastery * 100)}%, осталось ${leftN}`
                : `${c.label}: освоено`}>
              <Chip x={x} y={y} color={spokeColor(c.mastery, c.weakest)} icon={c.icon as IconName}
                weak={c.weakest} badge={leftN > 0 ? leftN : null} />
            </g>
          );
        })}

        {/* centre: current level */}
        <circle cx={CX} cy={CY} r={R0 - 4} fill={COL.card} stroke={COL.line} strokeWidth={1.4} />
        <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="central"
          fontWeight={800} fontSize={34} fill={COL.ink}>{balance.level}</text>
        <text x={CX} y={CY + 16} textAnchor="middle" dominantBaseline="central"
          fontWeight={600} fontSize={12} letterSpacing="0.06em" fill={COL.sub}>УРОВЕНЬ</text>
      </svg>

      {/* legend (replaces the long curved words on the ring) */}
      <div className="bring__legend">
        {(Object.keys(GROUP_LABEL) as BalanceGroup[]).map((g) => (
          <span key={g} className="bring__leg">
            <span className="bring__legdot" style={{ background: GROUP_HUE[g] }} />
            {GROUP_LABEL[g]}
          </span>
        ))}
      </div>
    </div>
  );
}
