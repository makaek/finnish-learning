/* kit.jsx — shared design language for the Reading redesign.
   Lifts RC palette + monoline icons straight from the home-screen system
   (ring.jsx) so these screens read as the SAME app. Reading == the "read"
   group, so its accent is the home ring's brown gRead (#BB6A39). */

const RC = {
  ink: '#23262E', sub: '#71757F', faint: '#AAB1BC',
  card: '#FFFFFF', line: '#E7E3DB', track: '#EEEAE2', wash: '#F4F1EB',
  cream: '#F0EDE6', creamDeep: '#E9E4D9',
  green: '#3B9C6E', amber: '#CF9A4E', red: '#CE6A57', redDeep: '#B9543F',
  blue: '#3B68C9',
  gWords: '#5B53C6', gSent: '#1B8E84', gRead: '#BB6A39',
};
/* reading accent + its soft tints */
const READ = RC.gRead;            // #BB6A39 brown — matches home ring "Чтение"
const READ_SOFT = '#F4EBE1';      // brown wash for chips / fills
const READ_LINE = '#E8DAC9';      // brown-tinted border

const FONT = '"Golos Text", system-ui, sans-serif';

const ICONS = {
  eye: <><circle cx="12" cy="12" r="3.2"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/></>,
  eyeOff: <><path d="M3 3l18 18"/><path d="M10.6 6.2A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.1 7.3A16 16 0 0 0 2.5 12S6 18 12 18a8.7 8.7 0 0 0 3.3-.65"/><path d="M9.5 10.4a3.2 3.2 0 0 0 4.2 4.4"/></>,
  pen: <><path d="M4 20h4L19 9a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16v4Z"/><path d="M14 7l3 3"/></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  phones: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/></>,
  book: <><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z"/><path d="M12 6v14"/></>,
  masks: <><path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z"/><path d="M12.5 9h8v6a4 4 0 0 1-8 0"/><path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1"/></>,
  lock: <><rect x="4.5" y="10" width="15" height="10" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  home: <><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"/></>,
  chart: <><path d="M4 20V4M4 20h16M8 16l3.5-4 3 2.5L20 8"/></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/></>,
  rules: <><path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 9h7M8 13h7M8 17h4"/></>,
  play: <><path d="M8 5v14l11-7L8 5Z"/></>,
  pause: <><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></>,
  stop: <><rect x="6" y="6" width="12" height="12" rx="2.2"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  back: <><path d="M19 12H5M11 6l-6 6 6 6"/></>,
  check: <><path d="M4 12.5 9.5 18 20 6"/></>,
  skip: <><path d="M5 5v14l9-7-9-7ZM16 5v14"/></>,
  refresh: <><path d="M20 11A8 8 0 1 0 18.4 16M20 5v6h-6"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 4 5.7 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.7-4-9s1.4-6.5 4-9Z"/></>,
  sound: <><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9a4 4 0 0 1 0 6"/></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 15h6M10 19h4M12 15v4"/></>,
  spark: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/></>,
  signal: <><rect x="2" y="14" width="3" height="6" rx="1"/><rect x="7" y="10" width="3" height="10" rx="1"/><rect x="12" y="6" width="3" height="14" rx="1"/><rect x="17" y="3" width="3" height="17" rx="1"/></>,
  wifi: <><path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></>,
  battery: <><rect x="2" y="7" width="18" height="10" rx="2.4"/><rect x="4" y="9" width="11" height="6" rx="1" fill="currentColor" stroke="none"/><path d="M22 10v4"/></>,
  flame: <><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.8-2.8 1.6-3.6C9 10 9.5 8.5 9 7c2 .5 3 2 3 2s.5-3 0-6Z"/></>,
  target: <><circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.6"/></>,
  search: <><circle cx="11" cy="11" r="6.6"/><path d="M20 20l-4.2-4.2"/></>,
  sliders: <><path d="M4 7h9M4 17h3M21 7h-2M21 17h-9"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/></>,
  sort: <><path d="M7 4v16M7 20l-3-3M7 4l3 3M17 4v16M17 4l-3 3M17 4l3 3"/></>,
  chevD: <><path d="M6 9.5l6 6 6-6"/></>,
  chevR: <><path d="M9.5 6l6 6-6 6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/></>,
  question: <><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 3.9 2.5c-.9.5-1.4 1.1-1.4 2.2M12 17v.4"/></>,
  star: <><path d="M12 3.5l2.55 5.2 5.7.85-4.12 4 .97 5.7L12 16.6l-5.07 2.65.97-5.7-4.12-4 5.7-.85L12 3.5Z"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></>,
  medal: <><circle cx="12" cy="15" r="6"/><path d="M9 3 7.5 9M15 3l1.5 6"/></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
  layers: <><path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 8v0"/></>,
};

function Icon({ n, s = 22, c = 'currentColor', sw = 1.7, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}>
      {ICONS[n]}
    </svg>
  );
}

/* device chrome -------------------------------------------------------- */
function StatusBar() {
  const c = RC.ink;
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px', flex: '0 0 auto' }}>
      <span style={{ fontSize: 14.5, fontWeight: 700, color: c }}>15:22</span>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', color: c, opacity: 0.9 }}>
        <Icon n="signal" s={15} c={c} sw={0} />
        <Icon n="wifi" s={15} c={c} sw={1.6} />
        <Icon n="battery" s={20} c={c} sw={1.5} />
      </div>
    </div>
  );
}

function BottomNav({ active = 'home' }) {
  const items = [['home', 'Главная'], ['chart', 'Прогресс'], ['grid', 'Метрики'], ['rules', 'Правила']];
  return (
    <div style={{ display: 'flex', borderTop: `1px solid ${RC.line}`, background: RC.card,
      padding: '10px 8px 20px', flex: '0 0 auto' }}>
      {items.map(([ic, lb]) => {
        const on = ic === active;
        return (
          <div key={lb} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            color: on ? RC.gSent : RC.faint }}>
            <Icon n={ic} s={22} sw={on ? 2 : 1.7} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{lb}</span>
          </div>
        );
      })}
    </div>
  );
}

/* the phone shell every screen sits in */
function Frame({ children, bg = RC.cream, nav = 'home' }) {
  return (
    <div style={{ width: 390, height: 844, background: bg, fontFamily: FONT, color: RC.ink,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <StatusBar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <BottomNav active={nav} />
    </div>
  );
}

/* back affordance — matches home pill style */
function BackBtn({ label }) {
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: RC.card,
      border: `1px solid ${RC.line}`, borderRadius: 999, padding: '8px 15px 8px 12px', cursor: 'pointer',
      fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: RC.ink, boxShadow: '0 1px 2px rgba(40,30,20,0.04)' }}>
      <Icon n="back" s={17} c={RC.sub} sw={2} />{label}
    </button>
  );
}

/* level chip used across library + reader headers */
function LevelChip({ n, tone = 'read' }) {
  const c = tone === 'read' ? READ : RC.sub;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 800,
      letterSpacing: '0.02em', color: c, background: READ_SOFT, borderRadius: 8, padding: '3px 8px' }}>
      Ур. {n}
    </span>
  );
}

Object.assign(window, { RC, READ, READ_SOFT, READ_LINE, FONT, ICONS, Icon, StatusBar, BottomNav, Frame, BackBtn, LevelChip, Bar, Pips, RingGauge, Donut });

/* horizontal progress bar — value 0..1 */
function Bar({ value, color = RC.gSent, track = RC.track, h = 8, radius = 999 }) {
  return (
    <div style={{ height: h, borderRadius: radius, background: track, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(1, value)) * 100}%`, borderRadius: radius,
        background: color, transition: 'width .4s cubic-bezier(.2,.7,.3,1)' }} />
    </div>
  );
}

/* Leitner box pips ●×box ○×(max-box) */
function Pips({ box, max = 5, color = RC.gSent, size = 8 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: 999,
          background: i < box ? color : '#fff',
          border: i < box ? 'none' : `1.5px solid ${RC.line}` }} />
      ))}
    </span>
  );
}

/* circular gauge for the «Сегодня» rings */
function RingGauge({ value, size = 88, stroke = 9, color = RC.green, track = RC.track, label, sub }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.2,.7,.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: RC.ink }}>{label}</span>
        {sub && <span style={{ fontSize: 10.5, fontWeight: 600, color: RC.sub, marginTop: 3 }}>{sub}</span>}
      </div>
    </div>
  );
}

/* tiny donut (unused fallback kept for parity) */
function Donut() { return null; }
