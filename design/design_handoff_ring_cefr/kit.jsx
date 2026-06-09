/* kit.jsx — shared palette, icons, Icon component, chip-shape helpers.
   Palette + base icons lifted verbatim from the production ring (ring.jsx). */

const FONT = '"Golos Text", system-ui, sans-serif';

const RC = {
  ink: '#23262E', sub: '#71757F', faint: '#AAB1BC',
  card: '#FFFFFF', line: '#E7E3DB', track: '#EEEAE2', wash: '#F4F1EB',
  cream: '#F0EDE6', creamDeep: '#E9E4D9',
  green: '#3B9C6E', amber: '#CF9A4E', red: '#CE6A57', redDeep: '#B9543F',
  blue: '#3B68C9',
  gWords: '#5B53C6', gSent: '#1B8E84', gRead: '#BB6A39',
  // soft tints of each group hue (chip fill backgrounds)
  gWordsSoft: '#ECEBFA', gSentSoft: '#E3F1EF', gReadSoft: '#F6EBE1',
  gold: '#C8902B', goldSoft: '#F6EEDC',
};
const GHUE  = { words: RC.gWords, sent: RC.gSent, read: RC.gRead };
const GSOFT = { words: RC.gWordsSoft, sent: RC.gSentSoft, read: RC.gReadSoft };
const GLBL  = { words: 'Слова', sent: 'Предложения', read: 'Чтение' };

/* ---------- monoline icons (24×24) ---------- */
const ICONS = {
  eye: <><circle cx="12" cy="12" r="3.2"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/></>,
  pen: <><path d="M4 20h4L19 9a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16v4Z"/><path d="M14 7l3 3"/></>,
  // typed-input / keyboard — used for BOTH word-spelling and sentence-typing
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2.2"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M18 9.5h.01M8.5 15h7"/></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  phones: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/></>,
  chat: <><path d="M4 5h16v11H9l-4 4v-4H4V5Z"/></>,
  book: <><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z"/><path d="M12 6v14"/></>,
  masks: <><path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z"/><path d="M12.5 9h8v6a4 4 0 0 1-8 0"/><path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1"/></>,
  check: <><path d="M4 12.5 9.5 18 20 6"/></>,
  chevR: <><path d="M9 6l6 6-6 6"/></>,
  flag: <><path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/></>,
  lock: <><rect x="4.5" y="10" width="15" height="10" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M10 15.5V19M14 15.5V19"/></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></>,
};
function Icon({ n, s = 22, c = 'currentColor', sw = 1.7, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}>
      {ICONS[n]}
    </svg>
  );
}

/* ---------- chip-shape geometry (for the «different shapes» idea) ----------
   Returns an SVG element (circle / rounded-square / hexagon) centred at (x,y)
   with circum-radius r, so the three groups read apart at a glance. */
function chipShape(shape, x, y, r, props) {
  if (shape === 'square') {
    const s = r * 1.62, rad = r * 0.42;       // rounded square (squircle)
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={rad} {...props} />;
  }
  if (shape === 'hex') {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 90);
      pts.push(`${(x + Math.cos(a) * r * 1.06).toFixed(1)},${(y + Math.sin(a) * r * 1.06).toFixed(1)}`);
    }
    return <polygon points={pts.join(' ')} {...props} />;
  }
  return <circle cx={x} cy={y} r={r} {...props} />;   // default circle
}
const GSHAPE = { words: 'circle', sent: 'square', read: 'hex' };

Object.assign(window, { FONT, RC, GHUE, GSOFT, GLBL, GSHAPE, ICONS, Icon, chipShape });
