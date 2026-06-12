/* gram-ring.jsx — fork of components/ring/BalanceRing.jsx with a 4th group
   «Грамматика»: diamond chip shape, tweakable hue (gramHue prop). Colours are
   applied via style so CSS vars / color-mix work. Geometry is the prod one. */

const GR_ICONS = {
  eye: (<><circle cx="12" cy="12" r="3.2" /><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /></>),
  keyboard: (<><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M18 9.5h.01M8.5 15h7" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  phones: (<><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.6" /><rect x="17" y="13" width="4" height="6" rx="1.6" /></>),
  book: (<><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z" /><path d="M12 6v14" /></>),
  masks: (<><path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z" /><path d="M12.5 9h8v6a4 4 0 0 1-8 0" /><path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1" /></>),
  check: (<><path d="M4 12.5 9.5 18 20 6" /></>),
  pen: (<><path d="M12 20h9" /><path d="M16.6 3.6a2.1 2.1 0 0 1 3 3L7 19.2 3 20l.8-4Z" /></>),
};

const GR_COL = {
  ink: "var(--text)", sub: "var(--muted)", card: "var(--card)", line: "var(--border)",
  track: "var(--surface-2)", green: "#3B9C6E", red: "#CE6A57", blue: "#3B68C9", goldSoft: "#F6EEDC",
};
const GR_LABEL = { words: "Слова", sent: "Предложения", read: "Чтение", gram: "Грамматика" };
const GR_SHAPE = { words: "circle", sent: "square", read: "hex", gram: "diamond" };

const GR_VB = 360, GR_CX = 180, GR_CY = 180;
const GR_R0 = 47, GR_ORBIT = 135, GR_T0 = GR_R0 + 11, GR_T1 = GR_ORBIT - 26;
const GR_BADGE_R = GR_ORBIT + 22, GR_ARC_R = GR_ORBIT + 41;
const GR_RCHIP = 19, GR_RWEAK = 21;

const grRad = (d) => (d * Math.PI) / 180;
const grPol = (r, d) => [GR_CX + Math.cos(grRad(d)) * r, GR_CY + Math.sin(grRad(d)) * r];
function grArc(r, a0, a1) {
  const [x0, y0] = grPol(r, a0), [x1, y1] = grPol(r, a1);
  return "M" + x0.toFixed(1) + " " + y0.toFixed(1) + " A " + r + " " + r + " 0 " + (a1 - a0 > 180 ? 1 : 0) + " 1 " + x1.toFixed(1) + " " + y1.toFixed(1);
}
const grFillR = (m) => GR_T0 + Math.max(0, Math.min(1, m)) * (GR_T1 - GR_T0);

function GrChip({ shape, x, y, r, fill, stroke, strokeWidth, opacity }) {
  const st = { fill: fill || "none", stroke, strokeWidth, opacity };
  if (shape === "square") {
    const s = r * 1.62, rx = r * 0.42;
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={rx} style={st} />;
  }
  if (shape === "diamond") {
    const s = r * 1.52, rx = r * 0.34;
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={rx} transform={"rotate(45 " + x + " " + y + ")"} style={st} />;
  }
  if (shape === "hex") {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = grRad(60 * i - 90);
      return (x + Math.cos(a) * r * 1.06).toFixed(1) + "," + (y + Math.sin(a) * r * 1.06).toFixed(1);
    }).join(" ");
    return <polygon points={pts} style={st} />;
  }
  return <circle cx={x} cy={y} r={r} style={st} />;
}

function GramBalanceRing({ level, modes, gramHue }) {
  const HUE = { words: "#5B53C6", sent: "#1B8E84", read: "#BB6A39", gram: gramHue };
  const SOFT = {
    words: "#ECEBFA", sent: "#E3F1EF", read: "#F6EBE1",
    gram: "color-mix(in srgb, " + gramHue + " 13%, #fffdfa)",
  };
  const step = 360 / modes.length;
  const weakIdx = modes.reduce((best, m, i, a) => (m.mastery < a[best].mastery ? i : best), 0);

  const spans = new Map();
  modes.forEach((m, i) => { const s = spans.get(m.group); if (s) s[1] = i; else spans.set(m.group, [i, i]); });

  return (
    <svg viewBox={"0 0 " + GR_VB + " " + GR_VB} style={{ width: "100%", display: "block" }}
      role="img" aria-label={"Кольцо баланса, уровень " + level + "."}>
      {[...spans.entries()].map(([g, [a, b]]) => {
        const a0 = -90 + a * step - step / 2 + 5, a1 = -90 + b * step + step / 2 - 5;
        return <path key={g} d={grArc(GR_ARC_R, a0, a1)} style={{ stroke: HUE[g] }} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.92} />;
      })}

      {modes.map((m, i) => {
        const ang = -90 + i * step, weak = i === weakIdx;
        const [tx0, ty0] = grPol(GR_T0, ang), [tx1, ty1] = grPol(GR_T1, ang);
        const [fx, fy] = grPol(grFillR(m.mastery), ang);
        const col = weak ? GR_COL.red : HUE[m.group];
        return (
          <g key={"sp" + i}>
            <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} style={{ stroke: GR_COL.track }} strokeWidth={9} strokeLinecap="round" />
            {m.mastery > 0.001 && <line x1={tx0} y1={ty0} x2={fx} y2={fy} style={{ stroke: col }} strokeWidth={9} strokeLinecap="round" opacity={weak ? 1 : 0.92} />}
          </g>
        );
      })}

      {modes.map((m, i) => {
        const ang = -90 + i * step, weak = i === weakIdx;
        const [x, y] = grPol(GR_ORBIT, ang);
        const r = weak ? GR_RWEAK : GR_RCHIP;
        const col = weak ? GR_COL.red : HUE[m.group];
        const soft = weak ? "#FBEDEA" : SOFT[m.group];
        const isz = weak ? 22 : 20;
        const shape = GR_SHAPE[m.group];
        const done = m.remaining <= 0;
        const [bx, by] = grPol(GR_BADGE_R, ang);
        const txt = m.remaining > 99 ? "99+" : String(m.remaining);
        const bw = Math.max(20, 12 + txt.length * 7), bh = 20;
        return (
          <g key={"ch" + i} aria-label={GR_LABEL[m.group] + ": освоено " + Math.round(m.mastery * 100) + "%"}>
            {weak && <GrChip shape={shape} x={x} y={y} r={r + 6} stroke={col} strokeWidth={2.2} opacity={0.4} />}
            <GrChip shape={shape} x={x} y={y} r={r} fill={soft} stroke={col} strokeWidth={2.4} />
            <svg x={x - isz / 2} y={y - isz / 2} width={isz} height={isz} viewBox="0 0 24 24" fill="none"
              style={{ stroke: col }} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{GR_ICONS[m.icon]}</svg>
            {done ? (
              <g>
                <circle cx={bx} cy={by} r={10} style={{ fill: GR_COL.green, stroke: GR_COL.card }} strokeWidth={2} />
                <svg x={bx - 7} y={by - 7} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">{GR_ICONS.check}</svg>
              </g>
            ) : (
              <g>
                <rect x={bx - bw / 2} y={by - bh / 2} width={bw} height={bh} rx={bh / 2}
                  style={{ fill: weak ? GR_COL.red : GR_COL.blue, stroke: GR_COL.card }} strokeWidth={2} />
                <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fontWeight={700} fontSize={12} fill="#fff">{txt}</text>
              </g>
            )}
          </g>
        );
      })}

      <circle cx={GR_CX} cy={GR_CY} r={GR_R0} style={{ fill: GR_COL.card, stroke: GR_COL.line }} strokeWidth={1.4} />
      <circle cx={GR_CX} cy={GR_CY} r={GR_R0} fill="none" style={{ stroke: GR_COL.goldSoft }} strokeWidth={3} opacity={0.9} />
      <text x={GR_CX} y={GR_CY - 5} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={36} style={{ fill: GR_COL.ink }}>{level}</text>
      <text x={GR_CX} y={GR_CY + 17} textAnchor="middle" dominantBaseline="central" fontWeight={700} fontSize={11} letterSpacing="0.08em" style={{ fill: GR_COL.sub }}>УРОВЕНЬ</text>
    </svg>
  );
}

function GramRingLegend({ gramHue }) {
  const HUE = { words: "#5B53C6", sent: "#1B8E84", read: "#BB6A39", gram: gramHue };
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
      {["words", "sent", "read", "gram"].map((g) => (
        <span key={g} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
          <GrSwatch group={g} color={HUE[g]} />{GR_LABEL[g]}
        </span>
      ))}
    </div>
  );
}
function GrSwatch({ group, color }) {
  const shape = GR_SHAPE[group];
  if (shape === "square") return <span style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block" }}></span>;
  if (shape === "diamond") return <span style={{ width: 10, height: 10, borderRadius: 2.5, background: color, display: "inline-block", transform: "rotate(45deg)" }}></span>;
  if (shape === "hex") return (
    <svg width={14} height={14} viewBox="0 0 12 12"><polygon points="6,0.4 11,3.2 11,8.8 6,11.6 1,8.8 1,3.2" fill={color} /></svg>
  );
  return <span style={{ width: 11, height: 11, borderRadius: 999, background: color, display: "inline-block" }}></span>;
}

Object.assign(window, { GramBalanceRing, GramRingLegend });
