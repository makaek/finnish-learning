/**
 * BalanceRing.tsx — home-screen «Кольцо баланса», REDESIGN (ring/cefr handoff).
 *
 * Supersedes the previous spoke-length port. The problem it fixes: when mastery
 * is low (e.g. level 1) every chip collapsed onto the hub and the count badges
 * overlapped & clipped. Here the chips ride a FIXED outer orbit so they are
 * always readable and never collide; mastery is shown as a filled radial track
 * growing from the hub.
 *
 *   • 9 modes, evenly spaced on a fixed orbit (chip position is constant).
 *   • each spoke = a faint full-length TRACK + a group-coloured FILL from the
 *     hub whose length = mode mastery (0..1). Balance reads from fill length.
 *   • count badge = items left to master, an ADAPTIVE PILL that fits 1–3 digits
 *     ("23", "99+"); when 0 left the chip earns a green check instead.
 *   • per-group SHAPE so groups read without colour (a11y): Слова = circle,
 *     Предложения = rounded square, Чтение = hexagon. Toggle with `shapes`.
 *   • the single weakest mode is flagged red (fill + chip stroke + halo + badge).
 *   • coloured group arcs wrap the outside; group NAMES live in the legend.
 *   • centre hub = current level.
 *
 * Every constant is load-bearing for the look — do not round them. Presentation
 * only; all balance maths stays in core/balance.ts. Structural colours (ink/sub/
 * card/line/track) use theme tokens so the ring tracks light/dark; the semantic
 * colours (green/red/blue, group hues, gold) stay literal so meaning reads the
 * same in both themes.
 */

import type { CSSProperties } from "react";

export type IconName = "eye" | "keyboard" | "mic" | "phones" | "book" | "masks" | "check" | "lock" | "pen";
export type BalanceGroup = "words" | "sent" | "read" | "gram";
export type ChipShape = "circle" | "square" | "hex" | "diamond";

/** One mode on the ring. Map from your readiness output (mastery = mastered/total). */
export interface RingMode {
  group: BalanceGroup;
  id: string;          // routing id (e.g. "say_sentence", "read:dialog")
  label: string;       // legend / a11y only — not drawn on the ring
  icon: IconName;
  mastery: number;     // 0..1
  remaining: number;   // items left to master (= total − mastered); 0 ⇒ done
  /** Unavailable right now (offline mode-lock): rendered dimmed with a lock badge, not startable. */
  locked?: boolean;
}

/* ===================================================================== icons
 * Monoline, 24×24, stroke = currentColor. NOTE the alignment fix: typed-answer
 * modes (word spelling AND sentence typing) BOTH use `keyboard` so the same
 * mechanic reads the same everywhere. (Old set used pen for one, chat for the
 * other.) */
const ICONS: Record<IconName, JSX.Element> = {
  eye: (<><circle cx="12" cy="12" r="3.2" /><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /></>),
  keyboard: (<><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M18 9.5h.01M8.5 15h7" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  phones: (<><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.6" /><rect x="17" y="13" width="4" height="6" rx="1.6" /></>),
  book: (<><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z" /><path d="M12 6v14" /></>),
  masks: (<><path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z" /><path d="M12.5 9h8v6a4 4 0 0 1-8 0" /><path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1" /></>),
  check: (<><path d="M4 12.5 9.5 18 20 6" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></>),
  pen: (<><path d="M12 20h9" /><path d="M16.6 3.6a2.1 2.1 0 0 1 3 3L7 19.2 3 20l.8-4Z" /></>),
};

/** Standalone monoline mode icon (reused by the home's «слабое звено» card). */
export function ModeIcon({ name, size = 24, strokeWidth = 1.85 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ==================================================================== colour
 * Structural → theme tokens (light/dark); semantic → literal (per handoff §6). */
const COL = {
  ink: "var(--text)", sub: "var(--muted)", card: "var(--card)", line: "var(--border)",
  track: "var(--surface-2)", green: "#3B9C6E", red: "#CE6A57", blue: "#3B68C9",
  goldSoft: "#F6EEDC",
};
/* The gram hue is the THEME TOKEN (light/dark-aware), so it's applied via style=… (CSS vars
 * don't resolve inside SVG presentation attributes — every group colour below goes through
 * style for the same reason). The other three stay literal per the original handoff. */
const GROUP_HUE: Record<BalanceGroup, string> = {
  words: "#5B53C6", sent: "#1B8E84", read: "#BB6A39", gram: "var(--gram)",
};
const GROUP_SOFT: Record<BalanceGroup, string> = {
  words: "#ECEBFA", sent: "#E3F1EF", read: "#F6EBE1",
  gram: "color-mix(in srgb, var(--gram) 13%, var(--card))",
};
const GROUP_LABEL: Record<BalanceGroup, string> = {
  words: "Слова", sent: "Предложения", read: "Чтение", gram: "Грамматика",
};
const GROUP_SHAPE: Record<BalanceGroup, ChipShape> = {
  words: "circle", sent: "square", read: "hex", gram: "diamond",
};
const WEAK_SOFT = "#FBEDEA";

/* ================================================================== geometry
 * viewBox 360 × 360. The orbit radius is FIXED — chip placement never depends
 * on mastery (that is the whole fix). */
const VB = 360, CX = 180, CY = 180;
const R0 = 47;             // hub radius
const ORBIT = 135;         // chip-centre radius (constant)
const T0 = R0 + 11;        // mastery track start  (58)
const T1 = ORBIT - 26;     // mastery track end    (109)
const BADGE_R = ORBIT + 22;// badge centre radius   (157) — outer rim, never collides
const ARC_R = ORBIT + 41;  // group-arc radius      (176)
const R_CHIP = 19, R_WEAK = 21;

const rad = (d: number) => (d * Math.PI) / 180;
const pol = (r: number, d: number): [number, number] => [CX + Math.cos(rad(d)) * r, CY + Math.sin(rad(d)) * r];
function arcPath(r: number, a0: number, a1: number): string {
  const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
const fillR = (m: number) => T0 + Math.max(0, Math.min(1, m)) * (T1 - T0);

/** circle | rounded-square | hexagon | diamond centred at (x,y), circum-radius r.
 *  Colours go through style so CSS vars / color-mix resolve (gram group). */
function ChipShapeEl({ shape, x, y, r, fill, stroke, strokeWidth, opacity }: {
  shape: ChipShape; x: number; y: number; r: number;
  fill: string; stroke?: string; strokeWidth?: number; opacity?: number;
}) {
  const common = { style: { fill, stroke } as CSSProperties, strokeWidth, opacity };
  if (shape === "square") {
    const s = r * 1.62, rx = r * 0.42;
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={rx} {...common} />;
  }
  if (shape === "diamond") {
    const s = r * 1.52, rx = r * 0.34;
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={rx}
      transform={`rotate(45 ${x} ${y})`} {...common} />;
  }
  if (shape === "hex") {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = rad(60 * i - 90);
      return `${(x + Math.cos(a) * r * 1.06).toFixed(1)},${(y + Math.sin(a) * r * 1.06).toFixed(1)}`;
    }).join(" ");
    return <polygon points={pts} {...common} />;
  }
  return <circle cx={x} cy={y} r={r} {...common} />;
}

export default function BalanceRing({ level, modes, shapes = true, onPick }: {
  level: number;
  modes: RingMode[];
  shapes?: boolean;
  onPick?: (id: string) => void;
}) {
  const step = 360 / modes.length;       // 9 modes → 40°, first at top (−90°)
  const weakIdx = modes.reduce((best, m, i, a) => (m.mastery < a[best]!.mastery ? i : best), 0);

  // contiguous angular span per group (modes are pre-ordered words→sent→read)
  const spans = new Map<BalanceGroup, [number, number]>();
  modes.forEach((m, i) => { const s = spans.get(m.group); if (s) s[1] = i; else spans.set(m.group, [i, i]); });

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: "100%", display: "block" }}
      role="img" aria-label={`Кольцо баланса, уровень ${level}.`}>
      {/* group arcs */}
      {[...spans.entries()].map(([g, [a, b]]) => {
        const a0 = -90 + a * step - step / 2 + 5, a1 = -90 + b * step + step / 2 - 5;
        return <path key={g} d={arcPath(ARC_R, a0, a1)} style={{ stroke: GROUP_HUE[g] }} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.92} />;
      })}

      {/* spokes: faint full track + group-hued mastery fill (locked = dimmed, never weak-red) */}
      {modes.map((m, i) => {
        const ang = -90 + i * step, weak = i === weakIdx && !m.locked;
        const [tx0, ty0] = pol(T0, ang), [tx1, ty1] = pol(T1, ang);
        const [fx, fy] = pol(fillR(m.mastery), ang);
        const col = weak ? COL.red : GROUP_HUE[m.group];
        return (
          <g key={`sp${i}`} opacity={m.locked ? 0.45 : undefined}>
            <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} style={{ stroke: COL.track }} strokeWidth={9} strokeLinecap="round" />
            {m.mastery > 0.001 && <line x1={tx0} y1={ty0} x2={fx} y2={fy} style={{ stroke: col }} strokeWidth={9} strokeLinecap="round" opacity={weak ? 1 : 0.92} />}
          </g>
        );
      })}

      {/* chips on the fixed orbit + adaptive count badge */}
      {modes.map((m, i) => {
        const ang = -90 + i * step;
        // Locked (offline) styling wins over the weak-red highlight: a locked mode must not
        // read as "tap me", even when it's the weakest.
        const weak = i === weakIdx && !m.locked;
        const [x, y] = pol(ORBIT, ang);
        const r = weak ? R_WEAK : R_CHIP;
        const col = weak ? COL.red : GROUP_HUE[m.group];
        const soft = weak ? WEAK_SOFT : GROUP_SOFT[m.group];
        const isz = weak ? 22 : 20;
        const shape: ChipShape = shapes ? GROUP_SHAPE[m.group] : "circle";
        const done = m.remaining <= 0;
        const [bx, by] = pol(BADGE_R, ang);
        const txt = m.remaining > 99 ? "99+" : String(m.remaining);
        const bw = Math.max(20, 12 + txt.length * 7), bh = 20;
        const startable = !done && !m.locked && !!onPick;
        return (
          <g key={`ch${i}`} onClick={startable ? () => onPick!(m.id) : undefined}
            style={startable ? { cursor: "pointer" } : undefined}
            role={startable ? "button" : undefined}
            opacity={m.locked ? 0.45 : undefined}
            aria-label={`${m.label}: освоено ${Math.round(m.mastery * 100)}%${done ? ", выучено" : `, осталось ${m.remaining}`}${m.locked ? ", недоступно офлайн" : ""}`}>
            {weak && <ChipShapeEl shape={shape} x={x} y={y} r={r + 6} fill="none" stroke={col} strokeWidth={2.2} opacity={0.4} />}
            <ChipShapeEl shape={shape} x={x} y={y} r={r} fill={soft} stroke={col} strokeWidth={2.4} />
            <svg x={x - isz / 2} y={y - isz / 2} width={isz} height={isz} viewBox="0 0 24 24" fill="none"
              style={{ stroke: col }} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{ICONS[m.icon]}</svg>
            {m.locked ? (
              /* lock badge replaces the count — neutral grey, same rim geometry */
              <g>
                <circle cx={bx} cy={by} r={10} fill={COL.sub} stroke={COL.card} strokeWidth={2} />
                <svg x={bx - 6} y={by - 6} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">{ICONS.lock}</svg>
              </g>
            ) : done ? (
              <g>
                <circle cx={bx} cy={by} r={10} fill={COL.green} stroke={COL.card} strokeWidth={2} />
                <svg x={bx - 7} y={by - 7} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">{ICONS.check}</svg>
              </g>
            ) : (
              <g>
                <rect x={bx - bw / 2} y={by - bh / 2} width={bw} height={bh} rx={bh / 2} fill={weak ? COL.red : COL.blue} stroke={COL.card} strokeWidth={2} />
                <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text, sans-serif" fontWeight={700} fontSize={12} fill="#fff">{txt}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* centre hub — current level */}
      <circle cx={CX} cy={CY} r={R0} fill={COL.card} stroke={COL.line} strokeWidth={1.4} />
      <circle cx={CX} cy={CY} r={R0} fill="none" stroke={COL.goldSoft} strokeWidth={3} opacity={0.9} />
      <text x={CX} y={CY - 5} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text, sans-serif" fontWeight={800} fontSize={36} fill={COL.ink}>{level}</text>
      <text x={CX} y={CY + 17} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text, sans-serif" fontWeight={700} fontSize={11} letterSpacing="0.08em" fill={COL.sub}>УРОВЕНЬ</text>
    </svg>
  );
}

/* ============================================================ shapes legend
 * Renders the group→shape→colour key under the ring. */
export function RingLegend({ shapes = true, groups = ["words", "sent", "read"] }: {
  shapes?: boolean;
  /** Which groups to show (pass the groups actually on the ring, e.g. + "gram"). */
  groups?: BalanceGroup[];
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: 6 }}>
      {groups.map((g) => (
        <span key={g} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: COL.sub }}>
          <LegendSwatch group={g} shapes={shapes} />{GROUP_LABEL[g]}
        </span>
      ))}
    </div>
  );
}
function LegendSwatch({ group, shapes }: { group: BalanceGroup; shapes: boolean }) {
  const c = GROUP_HUE[group];
  if (shapes && GROUP_SHAPE[group] === "square") return <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />;
  if (shapes && GROUP_SHAPE[group] === "diamond") return <span style={{ width: 10, height: 10, borderRadius: 2.5, background: c, display: "inline-block", transform: "rotate(45deg)" }} />;
  if (shapes && GROUP_SHAPE[group] === "hex") return (
    <svg width={15} height={15} viewBox="0 0 12 12"><polygon points="6,0.4 11,3.2 11,8.8 6,11.6 1,8.8 1,3.2" style={{ fill: c }} /></svg>
  );
  return <span style={{ width: 12, height: 12, borderRadius: 999, background: c, display: "inline-block" }} />;
}

export { GROUP_HUE, GROUP_LABEL, GROUP_SHAPE };
