/* strip.jsx — the combined per-mode "strikes" read + the swipe-to-know card.
   ModeStrip shows one segment per mode. We don't show fine streak detail —
   only 3 states per mode: 0 strikes (empty), 1 (half), ≥2 (full).
   StripLegend decodes segment positions once per section. SwipeCard =
   swipe-left to mark «Уже знаю». */

/* clamp a raw streak/box to the 0..2 strike scale */
const strikeState = (v) => v <= 0 ? 0 : v === 1 ? 1 : 2;

function ModeStrip({ modes, hue }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {modes.map((v, i) => {
        const s = strikeState(v);
        const w = s === 0 ? 0 : s === 1 ? 50 : 100;
        return (
          <span key={i} style={{ width: 16, height: 7, borderRadius: 2.5, background: RC.track, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${w}%`, background: hue,
              borderRadius: 2.5, transition: 'width .35s cubic-bezier(.2,.7,.3,1)' }} />
          </span>
        );
      })}
    </span>
  );
}

/* one-time legend that decodes the strip positions for a section */
function StripLegend({ defs, hue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 2px 10px', flexWrap: 'wrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: hue, flex: '0 0 auto' }} />
      {defs.map((m, i) => (
        <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: RC.faint, whiteSpace: 'nowrap' }}>
          {m.tag}{i < defs.length - 1 ? ' ·' : ''}
        </span>
      ))}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: RC.faint, marginLeft: 2 }}>— освоено по режимам</span>
    </div>
  );
}

/* swipe-left → mark known. Snaps back if released before threshold. */
function SwipeCard({ children, onSwipe, hint }) {
  const [dx, setDx] = React.useState(0);
  const [anim, setAnim] = React.useState(false);
  const startX = React.useRef(null);
  const moved = React.useRef(false);
  const TH = 92, MAX = 132;

  function down(e) {
    startX.current = e.clientX; moved.current = false; setAnim(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 4) moved.current = true;
    setDx(Math.max(-MAX, Math.min(0, d)));
  }
  function up() {
    if (startX.current == null) return;
    setAnim(true);
    if (dx <= -TH) { setDx(-440); window.setTimeout(() => onSwipe && onSwipe(), 170); }
    else setDx(0);
    startX.current = null;
  }
  const revealT = Math.min(1, -dx / TH);

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      {/* reveal behind */}
      <div style={{ position: 'absolute', inset: 0, background: TEAL, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 18,
        gap: 8, opacity: 0.35 + revealT * 0.65 }}>
        <Icon n="check" s={17} c="#fff" sw={2.8} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{hint || 'Уже знаю'}</span>
      </div>
      {/* foreground */}
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'relative', transform: `translateX(${dx}px)`, touchAction: 'pan-y',
          transition: anim ? 'transform .22s cubic-bezier(.2,.7,.3,1)' : 'none', cursor: 'grab' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { ModeStrip, StripLegend, SwipeCard });
