/* cefr.jsx — the CEFR level meter, current + two redesign mocks.
   CefrCurrent — reproduction of the prod strip (for the reference card).
   CefrLadder  — Mock A: dashboard-hero style — level badge + «Текущая ступень»
                 + a 12-segment band rail (one cell per level, grouped in bands).
   CefrBadge   — Mock B: a compact ring-gauge badge that echoes the ring.
   Accent is the app's GREEN/teal (#1B8E84); the level chip stays gold. */

const TEAL = RC.gSent, GOLD = RC.gold, GOLD_SOFT = RC.goldSoft;

/* ---------- current (prod) ---------- */
function CefrCurrent() {
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 16, padding: '13px 15px',
      display: 'flex', alignItems: 'center', gap: 13 }}>
      <span style={{ background: RC.blue, color: '#fff', fontSize: 15, fontWeight: 800, borderRadius: 11, padding: '7px 12px', flex: '0 0 auto' }}>A1.1</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 8, borderRadius: 999, background: RC.track, overflow: 'hidden' }}>
          <div style={{ width: '37%', height: '100%', borderRadius: 999, background: RC.blue }} />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub, marginTop: 6 }}>1/3 уровней · до A1.2</div>
      </div>
      <span style={{ fontSize: 19, fontWeight: 800, color: RC.blue, flex: '0 0 auto' }}>37%</span>
    </div>
  );
}

/* ============================================================ MOCK A — Ladder
   Mirrors the dashboard hero and extends it: the rail has one cell per LEVEL
   (3 per band, 12 total) so "1 of 3 in A1.1" and "3 bands to A2" both read at
   a glance; the current cell carries the % fill. */
function CefrLadder({ now = CEFR_NOW }) {
  const { bandIdx, levelInBand, levelsInBand, pct, nextId } = now;
  const globalLevel = CEFR_BANDS.slice(0, bandIdx).reduce((a, b) => a + b.levels, 0) + levelInBand;
  const curIdx = globalLevel - 1;          // 0-based current cell
  let idx = -1;                            // running cell index across bands

  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, padding: '15px 16px 15px' }}>
      {/* header — level chip + current stage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: GOLD_SOFT, flex: '0 0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <span style={{ fontSize: 23, fontWeight: 800, color: GOLD }}>{globalLevel}</span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: GOLD, marginTop: 2 }}>УРОВЕНЬ</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RC.sub }}>Текущая ступень</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: TEAL }}>{CEFR_BANDS[bandIdx].id}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: RC.sub }}>{CEFR_BANDS[bandIdx].ru}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEAL }}>{Math.round(pct * 100)}%</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: RC.sub }}>до {nextId}</div>
        </div>
      </div>

      {/* 12-cell band rail */}
      <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
        {CEFR_BANDS.map((b) => (
          <div key={b.id} style={{ flex: b.levels, display: 'flex', gap: 3 }}>
            {Array.from({ length: b.levels }).map((_, k) => {
              idx += 1;
              const done = idx < curIdx, current = idx === curIdx;
              return (
                <div key={k} style={{ flex: 1, height: 9, borderRadius: 999,
                  background: done ? TEAL : RC.track, overflow: 'hidden',
                  boxShadow: current ? `inset 0 0 0 1.6px ${TEAL}` : 'none' }}>
                  {current && <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 999, background: TEAL }} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* band labels */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {CEFR_BANDS.map((b, i) => {
          const done = i < bandIdx, current = i === bandIdx;
          return (
            <div key={b.id} style={{ flex: b.levels, display: 'flex', alignItems: 'center', gap: 4 }}>
              {done && <Icon n="check" s={11} c={TEAL} sw={3} />}
              <span style={{ fontSize: 12, fontWeight: current ? 800 : 700,
                color: current ? TEAL : done ? TEAL : RC.faint }}>{b.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ MOCK B — Badge
   A ring gauge that visually rhymes with the balance ring below it. The arc =
   progress through the current band; the band id sits in the hub; three level
   pips + the next-band flag spell out the detail. */
function Gauge({ pct, size = 64, sw = 7, color = TEAL, track = RC.track, children }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        {children}
      </div>
    </div>
  );
}
function CefrBadge() {
  const { bandIdx, levelInBand, levelsInBand, pct, nextId } = CEFR_NOW;
  const band = CEFR_BANDS[bandIdx];
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 15 }}>
      <Gauge pct={pct}>
        <span style={{ fontSize: 15, fontWeight: 800, color: TEAL, letterSpacing: '-0.01em' }}>{band.id}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: RC.faint, marginTop: 2 }}>CEFR</span>
      </Gauge>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{band.ru}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: TEAL, marginLeft: 'auto' }}>{Math.round(pct * 100)}%</span>
        </div>
        {/* level pips */}
        <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
          {Array.from({ length: levelsInBand }).map((_, k) => {
            const d = k < levelInBand - 1, cur = k === levelInBand - 1;
            return <div key={k} style={{ flex: 1, height: 7, borderRadius: 999,
              background: d ? TEAL : RC.track, overflow: 'hidden' }}>
              {cur && <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 999, background: TEAL }} />}
            </div>;
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub }}>Ур. {levelInBand} из {levelsInBand}</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: RC.ink }}>
            <Icon n="flag" s={13} c={TEAL} sw={1.9} />до {nextId}
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CefrCurrent, CefrLadder, CefrBadge, Gauge });
