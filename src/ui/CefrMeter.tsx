/**
 * CefrMeter.tsx — the home CEFR level meter, REDESIGN (ring/cefr handoff, green).
 *
 * Replaces the old "A1.1 [bar] 1/3 уровней · 37%" strip (CefrBar). Mirrors the
 * dashboard hero ("Текущая ступень") and extends it with a 12-cell band rail —
 * one cell per LEVEL, grouped into the four CEFR bands — so both "where am I in
 * this band" and "how far to A2" answer at a glance.
 *
 *   • level chip (gold) · «Текущая ступень» · big band id (teal) + band name
 *   • right: % of the current level · "до <nextBand>"
 *   • rail: Σlevels cells; completed = teal fill, current = teal outline + %
 *     inner fill, future = track. Cells grouped by band with a wider gap.
 *   • band labels under each group; done bands get a check, current is teal.
 *
 * Accent is the app teal (#1B8E84); the level chip stays gold (#C8902B). Structural
 * colours use theme tokens (light/dark); teal/gold stay literal so the accent reads
 * identically in both themes.
 */

const COL = {
  ink: "var(--text)", sub: "var(--muted)", faint: "var(--muted)", card: "var(--card)",
  line: "var(--border)", track: "var(--surface-2)", teal: "#1B8E84", gold: "#C8902B", goldSoft: "#F6EEDC",
};

export interface CefrBand { id: string; ru: string; levels: number; }
export interface CefrState {
  bandIdx: number;       // index of current band in `bands`
  levelInBand: number;   // 1-based level within the current band
  pct: number;           // 0..1 progress to show on the current cell + header
  nextId: string;        // label of the next band (e.g. "A1.2")
}

const CheckIcon = ({ s = 11, c = COL.teal }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5 9.5 18 20 6" />
  </svg>
);

export default function CefrMeter({ bands, state }: { bands: CefrBand[]; state: CefrState }) {
  const { bandIdx, levelInBand, pct, nextId } = state;
  const band = bands[bandIdx] ?? bands[0]!;
  const globalLevel = bands.slice(0, bandIdx).reduce((a, b) => a + b.levels, 0) + levelInBand;
  const curIdx = globalLevel - 1;        // 0-based current cell
  const pctTxt = `${Math.round(pct * 100)}%`;
  let idx = -1;

  return (
    <div style={{ background: COL.card, border: `1px solid ${COL.line}`, borderRadius: 18, padding: "15px 16px 15px", fontFamily: "Golos Text, sans-serif", color: COL.ink }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: COL.goldSoft, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          <span style={{ fontSize: 23, fontWeight: 800, color: COL.gold }}>{globalLevel}</span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: COL.gold, marginTop: 2 }}>УРОВЕНЬ</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COL.sub }}>Текущая ступень</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: COL.teal }}>{band.id}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: COL.sub }}>{band.ru}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: COL.teal }}>{pctTxt}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: COL.sub }}>до {nextId}</div>
        </div>
      </div>

      {/* band rail — one cell per level */}
      <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
        {bands.map((b) => (
          <div key={b.id} style={{ flex: b.levels, display: "flex", gap: 3 }}>
            {Array.from({ length: b.levels }).map((_, k) => {
              idx += 1;
              const done = idx < curIdx, current = idx === curIdx;
              return (
                <div key={k} style={{ flex: 1, height: 9, borderRadius: 999, background: done ? COL.teal : COL.track, overflow: "hidden", boxShadow: current ? `inset 0 0 0 1.6px ${COL.teal}` : "none" }}>
                  {current && <div style={{ width: pctTxt, height: "100%", borderRadius: 999, background: COL.teal }} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* band labels */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {bands.map((b, i) => {
          const done = i < bandIdx, current = i === bandIdx;
          return (
            <div key={b.id} style={{ flex: b.levels, display: "flex", alignItems: "center", gap: 4 }}>
              {done && <CheckIcon />}
              <span style={{ fontSize: 12, fontWeight: current ? 800 : 700, color: current || done ? COL.teal : COL.faint }}>{b.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
