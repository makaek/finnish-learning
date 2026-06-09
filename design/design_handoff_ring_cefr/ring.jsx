/* ring.jsx — the balance ring, old and new.
   OldRing      — faithful reproduction of production (spoke length = mastery,
                  so at low mastery every chip collapses onto the hub and the
                  count badges overlap & clip — the reported bug).
   BalanceRing  — redesign: chips ride a FIXED outer orbit (always readable,
                  never colliding); mastery is a filled radial track from the
                  hub; count badges are adaptive pills that fit 1–3 digits;
                  optional per-group shapes. */

/* ============================================================= OLD (prod) */
function OldRing({ data, level = 1, width = '100%' }) {
  const CX = 182, CY = 178, R0 = 47, RR = 126, STUB = 0.22;
  const step = 360 / data.length;
  const WEAK = weakestOf(data);
  const pol = (r, d) => [CX + Math.cos(d * Math.PI / 180) * r, CY + Math.sin(d * Math.PI / 180) * r];
  const arcD = (r, a0, a1) => { const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const spokeColor = (m, weak) => weak ? RC.red : `hsl(${(28 + m * 116).toFixed(0)}, 46%, 47%)`;
  const minM = Math.min(...data.map(x => x.m));
  const gateR = R0 + minM * (RR - R0);
  const spans = {}; data.forEach((c, i) => { (spans[c.group] ??= [i, i]); spans[c.group][1] = i; });
  const tipR = (c) => R0 + Math.max(c.m, STUB) * (RR - R0);

  return (
    <svg viewBox="24 22 316 304" style={{ width, display: 'block' }}>
      {Object.entries(spans).map(([g, [a, b]]) => {
        const a0 = -90 + a * step - step / 2 + 4, a1 = -90 + b * step + step / 2 - 4;
        return <path key={g} d={arcD(RR + 14, a0, a1)} stroke={GHUE[g]} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />;
      })}
      <circle cx={CX} cy={CY} r={RR} fill="none" stroke={RC.line} strokeWidth="1" />
      <circle cx={CX} cy={CY} r={gateR} fill={RC.red} opacity="0.05" />
      <circle cx={CX} cy={CY} r={gateR} fill="none" stroke={RC.red} strokeWidth="1.3" strokeDasharray="2 4" opacity="0.5" />
      {data.map((c, i) => {
        const ang = -90 + i * step, weak = c === WEAK;
        const end = R0 + Math.max(c.m, STUB) * (RR - R0);
        const [x1, y1] = pol(R0 + 2, ang), [x2, y2] = pol(end, ang);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={spokeColor(c.m, weak)} strokeWidth={weak ? 16 : 14} strokeLinecap="round" opacity="0.95" />;
      })}
      {data.map((c, i) => {
        const ang = -90 + i * step, weak = c === WEAK;
        const [x, y] = pol(tipR(c), ang);
        const col = spokeColor(c.m, weak);
        const rr = weak ? 16 : 14, isz = weak ? 22 : 20;
        return (
          <g key={'c' + i}>
            {weak && <circle cx={x} cy={y} r={rr + 5} fill="none" stroke={col} strokeWidth="2.4" opacity="0.45" />}
            <circle cx={x} cy={y} r={rr} fill={RC.card} stroke={col} strokeWidth="2.3" />
            <svg x={x - isz / 2} y={y - isz / 2} width={isz} height={isz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">{ICONS[c.icon]}</svg>
            {c.left > 0 && (<g>
              <circle cx={x + rr - 1} cy={y - rr + 1} r="8.5" fill={weak ? RC.red : RC.blue} stroke={RC.card} strokeWidth="1.4" />
              <text x={x + rr - 1} y={y - rr + 1.5} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="700" fontSize="10" fill="#fff">{c.left}</text>
            </g>)}
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R0 - 4} fill={RC.card} stroke={RC.line} strokeWidth="1.4" />
      <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="800" fontSize="34" fill={RC.ink}>{level}</text>
      <text x={CX} y={CY + 16} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="600" fontSize="12" letterSpacing="0.06em" fill={RC.sub}>УРОВЕНЬ</text>
    </svg>
  );
}

/* ============================================================= NEW */
function BalanceRing({ data, level = 1, width = '100%', shapes = false }) {
  const CX = 180, CY = 180;
  const R0 = 47;            // hub radius
  const ORBIT = 135;        // chip-centre radius (FIXED — never depends on mastery)
  const step = 360 / data.length;
  const WEAK = weakestOf(data);
  const pol = (r, d) => [CX + Math.cos(d * Math.PI / 180) * r, CY + Math.sin(d * Math.PI / 180) * r];
  const arcD = (r, a0, a1) => { const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const spans = {}; data.forEach((c, i) => { (spans[c.group] ??= [i, i]); spans[c.group][1] = i; });

  // track runs hub→chip; mastery fills it from the hub outward
  const T0 = R0 + 11;                 // track start
  const T1 = ORBIT - 26;              // track end (just inside the chip)
  const fillR = (m) => T0 + Math.max(0, Math.min(1, m)) * (T1 - T0);

  const rChip = 19, rWeak = 21;
  const BADGE_R = ORBIT + 22;         // badges sit on the outer rim (never collide)
  const ARC_R = ORBIT + 41;

  return (
    <svg viewBox="0 0 360 360" style={{ width, display: 'block' }}>
      {/* group arcs (colour key lives in legend) */}
      {Object.entries(spans).map(([g, [a, b]]) => {
        const a0 = -90 + a * step - step / 2 + 5, a1 = -90 + b * step + step / 2 - 5;
        return <path key={g} d={arcD(ARC_R, a0, a1)} stroke={GHUE[g]} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.92" />;
      })}

      {/* spokes: faint full track + group-hued mastery fill */}
      {data.map((c, i) => {
        const ang = -90 + i * step, weak = c === WEAK;
        const [tx0, ty0] = pol(T0, ang), [tx1, ty1] = pol(T1, ang);
        const [fx, fy] = pol(fillR(c.m), ang);
        const col = weak ? RC.red : GHUE[c.group];
        return (
          <g key={'sp' + i}>
            <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke={RC.track} strokeWidth="9" strokeLinecap="round" />
            {c.m > 0.001 && <line x1={tx0} y1={ty0} x2={fx} y2={fy} stroke={col} strokeWidth="9" strokeLinecap="round" opacity={weak ? 1 : 0.92} />}
          </g>
        );
      })}

      {/* chips on the fixed orbit + adaptive count badge */}
      {data.map((c, i) => {
        const ang = -90 + i * step, weak = c === WEAK;
        const [x, y] = pol(ORBIT, ang);
        const r = weak ? rWeak : rChip;
        const col = weak ? RC.red : GHUE[c.group];
        const soft = weak ? '#FBEDEA' : GSOFT[c.group];
        const isz = weak ? 22 : 20;
        const shape = shapes ? GSHAPE[c.group] : 'circle';
        const done = c.left === 0;
        const [bx, by] = pol(BADGE_R, ang);
        const digits = String(c.left).length;
        const bw = Math.max(20, 12 + digits * 7), bh = 20;
        return (
          <g key={'ch' + i}>
            {weak && chipShape(shape, x, y, r + 6, { fill: 'none', stroke: col, strokeWidth: 2.2, opacity: 0.4 })}
            {chipShape(shape, x, y, r, { fill: soft, stroke: col, strokeWidth: 2.4 })}
            <svg x={x - isz / 2} y={y - isz / 2} width={isz} height={isz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONS[c.icon]}</svg>
            {done ? (
              <g>
                <circle cx={bx} cy={by} r="10" fill={RC.green} stroke={RC.card} strokeWidth="2" />
                <svg x={bx - 7} y={by - 7} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{ICONS.check}</svg>
              </g>
            ) : (
              <g>
                <rect x={bx - bw / 2} y={by - bh / 2} width={bw} height={bh} rx={bh / 2} fill={weak ? RC.red : RC.blue} stroke={RC.card} strokeWidth="2" />
                <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="700" fontSize="12" fill="#fff">{c.left > 99 ? '99+' : c.left}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* centre hub — current level */}
      <circle cx={CX} cy={CY} r={R0} fill={RC.card} stroke={RC.line} strokeWidth="1.4" />
      <circle cx={CX} cy={CY} r={R0} fill="none" stroke={RC.goldSoft} strokeWidth="3" opacity="0.9" />
      <text x={CX} y={CY - 5} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="800" fontSize="36" fill={RC.ink}>{level}</text>
      <text x={CX} y={CY + 17} textAnchor="middle" dominantBaseline="central" fontFamily="Golos Text" fontWeight="700" fontSize="11" letterSpacing="0.08em" fill={RC.sub}>УРОВЕНЬ</text>
    </svg>
  );
}

/* shared legend */
function RingLegend() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
      {Object.keys(GLBL).map(g => (
        <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: RC.sub }}>
          {GSHAPE && <ShapeDot group={g} />}{GLBL[g]}
        </span>
      ))}
    </div>
  );
}
/* a tiny shape swatch matching the chip shape, used in the shapes legend */
function ShapeDot({ group, shaped = false }) {
  const c = GHUE[group];
  if (shaped && GSHAPE[group] === 'square') return <span style={{ width: 12, height: 12, borderRadius: 3, background: c }} />;
  if (shaped && GSHAPE[group] === 'hex') return (
    <svg width="15" height="15" viewBox="0 0 12 12"><polygon points="6,0.4 11,3.2 11,8.8 6,11.6 1,8.8 1,3.2" fill={c} /></svg>
  );
  return <span style={{ width: 12, height: 12, borderRadius: 999, background: c }} />;
}
function ShapeLegend() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
      {Object.keys(GLBL).map(g => (
        <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: RC.sub }}>
          <ShapeDot group={g} shaped />{GLBL[g]}
        </span>
      ))}
    </div>
  );
}

Object.assign(window, { OldRing, BalanceRing, RingLegend, ShapeLegend, ShapeDot });
