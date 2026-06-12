/* gram-kit.jsx — shared primitives for the «Грамматика» mode design.
   Composes app/app.css production classes + grammar.css gram-* classes. */

const GramCtx = React.createContext({ mastery: "ring" });

/* Monoline icons, same vocabulary as components/core/UiIcon (24×24, currentColor). */
const G_ICONS = {
  check: <path d="M4 12.5 9.5 18 20 6" />,
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></>),
  lockOpen: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 7.6-1.9" /></>),
  pen: (<><path d="M12 20h9" /><path d="M16.6 3.6a2.1 2.1 0 0 1 3 3L7 19.2 3 20l.8-4Z" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  info: (<><circle cx="12" cy="12" r="9.3" /><path d="M12 11v5.2" /><path d="M12 7.6h.01" /></>),
  bolt: <path d="M13 2 4.8 13.4h6.2L11 22l8.2-11.4h-6.2L13 2Z" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  arrow: (<><path d="M4.5 12h14" /><path d="M13 6.5 18.5 12 13 17.5" /></>),
  play: <path d="M8.5 5.8v12.4L19 12 8.5 5.8Z" />,
  refresh: (<><path d="M20.5 11.5a8.5 8.5 0 1 0-2.6 6.6" /><path d="M20.5 5.5v6h-6" /></>),
  flame: <path d="M12 3c.4 3-1.3 4.8-2.6 6.3C8.2 10.6 7 12 7 14a5 5 0 0 0 10 0c0-4.5-3.6-6.8-5-11Z" />,
  target: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r="0.6" /></>),
  gear: (<><circle cx="12" cy="12" r="3.1" /><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" /></>),
  home: (<><path d="M3.5 11 12 4l8.5 7" /><path d="M5.8 9.6V20h12.4V9.6" /></>),
  grid: (<><rect x="4" y="4" width="6.6" height="6.6" rx="1.6" /><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.6" /><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.6" /><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.6" /></>),
  rules: (<><path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z" /><path d="M12 6v14" /></>),
};

function GIcon({ name, size = 20, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {G_ICONS[name]}
    </svg>
  );
}

/* Phone-screen shell for an artboard. nav: "home" renders the bottom tab bar. */
function PhoneShell({ children, nav, center, label }) {
  const cls = "gram-phone" + (center ? " gram-phone--center" : "") + (nav ? " gram-phone--nav" : "");
  return (
    <div className={cls} data-screen-label={label}>
      {children}
      {nav && <GBottomNav active={nav} />}
    </div>
  );
}

function GBottomNav({ active }) {
  const tabs = [
    ["home", "home", "Главная"],
    ["grid", "dashboard", "Метрики"],
    ["rules", "rules", "Правила"],
  ];
  return (
    <nav className="bnav" aria-label="Основная навигация">
      {tabs.map(([icon, id, label]) => (
        <button key={id} type="button" className={"bnav__tab" + (active === id ? " bnav__tab--on" : "")}>
          <span className="bnav__icon"><GIcon name={icon} size={21} /></span>
          <span className="bnav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* Concept tag (kind: verbtype | case | grad | neg | part | vh) */
function GTag({ kind, children }) {
  return (
    <span className={"gtag gtag--" + kind}>
      <span className="gtag__dot" aria-hidden="true"></span>
      {children}
    </span>
  );
}

/* Explanation block — the reusable learning-moment component. */
const GX_ICON = { ok: "check", no: "x", near: "bolt", info: "info" };
function GExplain({ tone = "info", children }) {
  return (
    <div className={"gx gx--" + tone}>
      <span className="gx__ic" aria-hidden="true"><GIcon name={GX_ICON[tone]} size={13} strokeWidth={2.6} /></span>
      <p className="gx__t" style={{ margin: 0 }}>{children}</p>
    </div>
  );
}

/* Mastery ring (small SVG, gram hue; 100% renders green). */
function MasteryRing({ pct, size = 28 }) {
  const r = 10.5, c = 2 * Math.PI * r;
  const col = pct >= 100 ? "var(--ok)" : "var(--gram)";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="none" strokeWidth="4.5" style={{ stroke: "var(--surface-2)" }}></circle>
      <circle cx="14" cy="14" r={r} fill="none" strokeWidth="4.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.02, pct / 100))}
        transform="rotate(-90 14 14)" style={{ stroke: col }}></circle>
    </svg>
  );
}

/* Mastery indicator — ring or bar, controlled by the Tweaks panel. */
function Mastery({ pct }) {
  const { mastery } = React.useContext(GramCtx);
  return (
    <span className="gmast">
      {mastery === "bar" ? (
        <span className="gbar"><span className="gbar__fill" style={{ width: pct + "%" }}></span></span>
      ) : (
        <MasteryRing pct={pct} />
      )}
      <span className="gmast__pct">{pct}%</span>
    </span>
  );
}

/* Letter highlight inside Finnish forms. Default = личное окончание (gram wash);
   alt = чередование согласных (gold wash). Background, not colour alone. */
function Hl({ alt, children }) {
  return <mark className={"ghl" + (alt ? " ghl--alt" : "")}>{children}</mark>;
}

/* Paradigm table: 2 columns (person / form) so it never crams a phone. */
function ParadigmTable({ rows }) {
  return (
    <div className="gpara" role="table" lang="fi">
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          <span className="gpara__p" lang={row.lRu ? "ru" : "fi"}>{row.l}</span>
          <span className="gpara__f">
            {row.f}
            {row.ru && <span className="gpara__ru" lang="ru">{row.ru}</span>}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function ParaKey({ items }) {
  return (
    <div className="gparakey">
      {items.map(([sw, label], i) => (
        <span key={i} className="gparakey__i">
          <span className="gparakey__sw" style={{ background: sw }}></span>
          {label}
        </span>
      ))}
    </div>
  );
}

/* Example pair: Finnish sentence + Russian translation, visually paired. */
function GExample({ fi, ru }) {
  return (
    <div className="gex">
      <span className="gex__fi" lang="fi">{fi}</span>
      <span className="gex__ru">{ru}</span>
    </div>
  );
}

/* Lesson header: exit · topic eyebrow + stage · counter, then 3 step segments. */
function LessonTop({ topic, step, count }) {
  const names = ["Теория", "Разминка", "Дрилл"];
  return (
    <div className="gles">
      <div className="gles__row">
        <button type="button" className="gexit" aria-label="Выйти из урока"><GIcon name="x" size={15} strokeWidth={2.2} /></button>
        <div className="gles__mid">
          <div className="gles__eyebrow">{topic}</div>
          <div className="gles__stage">{names[step - 1]} <span>· шаг {step} из 3</span></div>
        </div>
        {count && <span className="gles__count">{count}</span>}
      </div>
      <div className="gsteps" aria-hidden="true">
        {[1, 2, 3].map((s) => (
          <span key={s} className={"gstep" + (s < step ? " gstep--done" : s === step ? " gstep--on" : "")}></span>
        ))}
      </div>
    </div>
  );
}

/* ä / ö quick-insert keys above the system keyboard. */
function QuickKeys({ letters = ["ä", "ö"] }) {
  return (
    <div className="gkeys">
      {letters.map((l) => (
        <button key={l} type="button" className="gkey" lang="fi">{l}</button>
      ))}
    </div>
  );
}

/* Canonical correct answer line. */
function GCanon({ children }) {
  return (
    <div className="gcanon">
      <span className="gcanon__k">Верно</span>
      <span className="gcanon__v" lang="fi">{children}</span>
    </div>
  );
}

/* Specimen wrapper: state caption + compact card. */
function SpecCard({ cap, tone, children }) {
  return (
    <div className="gspec">
      <div className={"gcap" + (tone ? " gcap--" + tone : "")}>{cap}</div>
      <section className="card gcard">{children}</section>
    </div>
  );
}

Object.assign(window, {
  GramCtx, GIcon, PhoneShell, GBottomNav, GTag, GExplain, MasteryRing, Mastery,
  Hl, ParadigmTable, ParaKey, GExample, LessonTop, QuickKeys, GCanon, SpecCard,
});
