/* optiona-app.jsx — Option A: the grammar trainer integrated into the live app.
   • Home keeps the real CTAs (Слабое звено + Микс) and adds a «Грамматика · тренажёр» card.
   • Bottom nav replaces «Правила» with «Грамматика» (the topic map + trainer).
   • Rules are no longer a tab — they open as detail screens via links from the
     grammar map and from the trainer summary.
   Globals: GIcon, GExplain, MasteryRing, GTag, GExample, GramBalanceRing,
   GramRingLegend, TrainerFlow, TrBadge, useTweaks, TweaksPanel, Tweak*. */

const TR_RING_MODES = [
  { group: "words", icon: "eye", mastery: 0.85, remaining: 3 },
  { group: "words", icon: "keyboard", mastery: 0.62, remaining: 12 },
  { group: "words", icon: "mic", mastery: 0.5, remaining: 18 },
  { group: "sent", icon: "keyboard", mastery: 0.58, remaining: 9 },
  { group: "sent", icon: "phones", mastery: 0.44, remaining: 21 },
  { group: "sent", icon: "mic", mastery: 0.38, remaining: 14 },
  { group: "read", icon: "book", mastery: 0.52, remaining: 5 },
  { group: "read", icon: "masks", mastery: 0.26, remaining: 7 },
  { group: "gram", icon: "pen", mastery: 0.34, remaining: 6 },
];

/* Rules — reachable only via links from grammar topics / the trainer summary. */
const RULES = {
  t1: {
    tag: ["verbtype", "тип 1"], title: "Тип глагола 1",
    summary: "Глаголы на -a / -ä: puhua, asua, nukkua.",
    body: <>Уберите конечное <b lang="fi">-a/-ä</b> — получится основа, к ней присоединяются личные окончания. У части глаголов согласная чередуется: сильная ступень <b lang="fi">kk</b> в формах hän и he, слабая <b lang="fi">k</b> — в остальных.</>,
    examples: [{ fi: "Minä puhun suomea.", ru: "Я говорю по-фински." }, { fi: "Hän nukkuu hyvin.", ru: "Он крепко спит." }],
  },
  t23: {
    tag: ["verbtype", "тип 2–3"], title: "Тип глагола 2 и 3",
    summary: "syödä, juoda (тип 2) · mennä, opiskella (тип 3).",
    body: <>Тип 2 — глаголы на <b lang="fi">-da/-dä</b>: основа без -da (syö-). Тип 3 — на <b lang="fi">-lla/-llä, -nna, -sta</b>: к основе добавляется <b lang="fi">e</b> перед окончанием (mene-, opiskele-).</>,
    examples: [{ fi: "Me opiskelemme suomea.", ru: "Мы учим финский." }, { fi: "Minä menen kotiin.", ru: "Я иду домой." }],
  },
  neg: {
    tag: ["neg", "отрицание"], title: "Отрицание",
    summary: "en, et, ei + форма без окончания (коннегатив).",
    body: <>Отрицание — отдельное слово, которое спрягается: <b lang="fi">en, et, ei, emme, ette, eivät</b>. Сам глагол теряет личное окончание и стоит в слабой ступени: puhun → en <b lang="fi">puhu</b>.</>,
    examples: [{ fi: "En puhu suomea.", ru: "Я не говорю по-фински." }, { fi: "Hän ei syö lihaa.", ru: "Он не ест мясо." }],
  },
  ssa: {
    tag: ["case", "падеж"], title: "Падежи внутри: -ssa / -sta",
    summary: "Инессив «где?» и элатив «откуда?».",
    body: <>Окончание выбирает гармония гласных: после <b lang="fi">a, o, u</b> — <b lang="fi">-ssa / -sta</b>; после <b lang="fi">ä, ö, y</b> — <b lang="fi">-ssä / -stä</b>. Инессив отвечает «где?», элатив — «откуда?».</>,
    examples: [{ fi: "Asun Helsingissä.", ru: "Я живу в Хельсинки." }, { fi: "Tulen koulusta.", ru: "Я иду из школы." }],
  },
};

const GTAB_MODULES = [
  {
    n: "Модуль 1", t: "Глагол", done: "1/3", topics: [
      { state: "mastered", pct: 100, title: "Тип глагола 1", sub: "puhua, asua · основа и окончания", rule: "t1" },
      { state: "progress", pct: 60, title: "Тип глагола 2 и 3", sub: "syödä, mennä, opiskella", rule: "t23", weak: true },
      { state: "progress", pct: 35, title: "Отрицание", sub: "en, et, ei + коннегатив", rule: "neg", weak: true },
    ],
  },
  {
    n: "Модуль 2", t: "Падежи", done: "1/3", topics: [
      { state: "mastered", pct: 100, title: "Падежи -ssa/-sta", sub: "инессив «где?» · элатив «откуда?»", rule: "ssa" },
      { state: "avail", pct: 0, title: "Генитив", sub: "чей? чего? — окончание -n", rule: null },
      { state: "locked", pct: 0, title: "Иллатив (куда?)", sub: "taloon, Helsinkiin", rule: null, hint: "Сначала пройдите: Генитив" },
    ],
  },
];

/* ───────────────── bottom nav (Главная · Метрики · Грамматика) ───────────────── */
function AppNav({ active, onNav }) {
  const tabs = [["home", "home", "Главная"], ["grid", "metrics", "Метрики"], ["pen", "grammar", "Грамматика"]];
  return (
    <nav className="bnav" aria-label="Основная навигация">
      {tabs.map(([icon, id, label]) => (
        <button key={id} type="button" className={"bnav__tab" + (active === id ? " bnav__tab--on" : "")} onClick={() => onNav(id)}>
          <span className="bnav__icon"><GIcon name={icon} size={21} /></span>
          <span className="bnav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function AppShell({ tab, onNav, label, children }) {
  return (
    <div className="tr-app" data-screen-label={label}>
      <div className="tr-app__body">{children}</div>
      <AppNav active={tab} onNav={onNav} />
    </div>
  );
}

/* ───────────────── home ───────────────── */
function HomeScreen({ gramHue, onTrainer }) {
  return (
    <>
      <header className="home-head">
        <span className="home-wordmark">Suomi</span>
        <span className="home-head__spacer" aria-hidden="true"></span>
        <button type="button" className="streakchip">
          <span className="streakchip__flame" aria-hidden="true"><GIcon name="flame" size={17} /></span>
          <span className="streakchip__num">3</span>
          <span className="streakchip__divider" aria-hidden="true"></span>
          <span className="streakchip__week" aria-hidden="true">
            <span className="scdot scdot--done"></span><span className="scdot scdot--done"></span>
            <span className="scdot scdot--today"></span><span className="scdot"></span>
            <span className="scdot"></span><span className="scdot"></span><span className="scdot"></span>
          </span>
        </button>
        <span className="home-head__spacer" aria-hidden="true"></span>
        <span className="settings"><span className="settings__btn"><GIcon name="gear" size={20} /></span></span>
      </header>

      <button type="button" className="mstrip">
        <span className="mstrip__flame mstrip__flame--goal" aria-hidden="true"><GIcon name="target" size={24} /></span>
        <span className="mstrip__body">
          <span className="mstrip__title">Цель на сегодня</span>
          <span className="mstrip__acc">точность · 93%</span>
        </span>
        <span className="mstrip__goal">
          <span className="mstrip__lessons">1<small>/2</small></span>
          <span className="mstrip__acc">уроков</span>
        </span>
      </button>

      <div className="ringcard">
        <GramBalanceRing level={7} modes={TR_RING_MODES} gramHue={gramHue} />
        <GramRingLegend gramHue={gramHue} />
      </div>

      <button type="button" className="ctacard ctacard--gram ctacard--row ctacard--trainer" onClick={onTrainer}>
        <span className="ctacard__tile" aria-hidden="true"><GIcon name="pen" size={21} /></span>
        <span className="ctacard__main">
          <span className="ctacard__kicker">Грамматика · тренажёр</span>
          <span className="ctacard__title">Повторить пройденное</span>
          <span className="ctacard__sub">10 заданий · без влияния на уровень</span>
        </span>
        <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
      </button>

      <div className="cta">
        <button type="button" className="ctacard ctacard--weak">
          <span className="ctacard__top">
            <span className="ctacard__tile" aria-hidden="true"><GIcon name="bolt" size={20} /></span>
            <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
          </span>
          <span className="ctacard__txt">
            <span className="ctacard__kicker">Рекомендуем</span>
            <span className="ctacard__title">Слабое звено</span>
            <span className="ctacard__sub">Диалоги · точность 64%</span>
          </span>
        </button>
        <button type="button" className="ctacard ctacard--mix">
          <span className="ctacard__top">
            <span className="ctacard__tile" aria-hidden="true"><GIcon name="refresh" size={20} /></span>
            <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
          </span>
          <span className="ctacard__txt">
            <span className="ctacard__kicker">В очереди · 84</span>
            <span className="ctacard__title">Микс</span>
            <span className="ctacard__sub">всё, что осталось</span>
          </span>
        </button>
      </div>
    </>
  );
}

/* ───────────────── grammar tab (topic map + trainer banner; rules via links) ───────────────── */
function GrammarTopicRow({ topic, onOpenRule }) {
  const { state, pct, title, sub, rule, hint } = topic;
  const tile = state === "mastered" ? <GIcon name="check" size={19} strokeWidth={2.4} />
    : state === "locked" ? <GIcon name="lock" size={18} /> : <GIcon name="pen" size={18} />;
  return (
    <div className={"gtopic gtopic--" + state + " gtopic--static"}>
      <span className="gtopic__tile" aria-hidden="true">{tile}</span>
      <span className="gtopic__main">
        <span className="gtopic__title">{title}</span>
        <span className="gtopic__sub">{sub}</span>
        {hint && <span className="gtopic__hint"><GIcon name="lock" size={12} strokeWidth={2.2} /> {hint}</span>}
        {rule && (
          <span className="gtopic__links">
            <button type="button" className="tr-rulelink" onClick={() => onOpenRule(rule)}>
              <GIcon name="rules" size={13} /> Правила
            </button>
          </span>
        )}
      </span>
      {state === "mastered" && <span className="gdone"><GIcon name="check" size={12} strokeWidth={3} /> Освоено</span>}
      {state === "progress" && <MasteryRing pct={pct} size={30} />}
      {state === "avail" && <span className="gtopic__go" aria-hidden="true"><GIcon name="chevR" size={18} /></span>}
    </div>
  );
}

function GrammarScreen({ onTrainer, onOpenRule }) {
  return (
    <>
      <div className="gmap__head" style={{ marginTop: 2 }}>
        <h1 className="gmap__title">Грамматика</h1>
        <span className="glevel">A1.2</span>
      </div>

      <button type="button" className="tr-banner" onClick={onTrainer}>
        <span className="tr-banner__tile" aria-hidden="true"><GIcon name="refresh" size={22} strokeWidth={2} /></span>
        <span className="tr-banner__main">
          <span className="tr-banner__k">Тренажёр · повторение</span>
          <span className="tr-banner__t">10 заданий из всех тем</span>
          <span className="tr-banner__s">слабые и давно не повторённые · не влияет на уровень</span>
        </span>
        <span className="tr-banner__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
      </button>

      <div className="ghero">
        <MasteryRing pct={31} size={46} />
        <div className="ghero__main">
          <div className="ghero__t">Освоено 2 из 9 тем</div>
          <span className="ghero__bar"><span className="ghero__fill" style={{ width: "31%" }}></span></span>
          <div className="ghero__sub">Слабая тема: <b>Отрицание</b> · повторите сегодня</div>
        </div>
      </div>

      {GTAB_MODULES.map((mod) => (
        <React.Fragment key={mod.n}>
          <div className="gmod">
            <span className="gmod__n">{mod.n}</span>
            <span className="gmod__t">{mod.t}</span>
            <span className="gmod__line" aria-hidden="true"></span>
            <span className="gmod__count">{mod.done}</span>
          </div>
          <div className="gtopics">
            {mod.topics.map((t) => <GrammarTopicRow key={t.title} topic={t} onOpenRule={onOpenRule} />)}
          </div>
        </React.Fragment>
      ))}

      <p className="hint" style={{ textAlign: "center" }}>Правила открываются из темы — отдельной вкладки больше нет.</p>
    </>
  );
}

/* ───────────────── rule detail (opened via link) ───────────────── */
function RuleDetail({ rule, onBack }) {
  return (
    <div className="gram-phone" data-screen-label={"Правило — " + rule.title}>
      <div className="tr-introtop">
        <button type="button" className="gexit" aria-label="Назад" onClick={onBack}><GIcon name="back" size={17} /></button>
        <span className="tr-rule-eyebrow"><GIcon name="rules" size={14} /> Правило</span>
      </div>
      <div className="tr-scroll">
        <section className="card gcard">
          <div className="gtags"><GTag kind={rule.tag[0]}>{rule.tag[1]}</GTag></div>
          <h2 className="gth__title">{rule.title}</h2>
          <p className="gth__summary">{rule.summary}</p>
          <p className="gth__body">{rule.body}</p>
          <div className="gth__sec">Примеры</div>
          <div className="gexs">
            {rule.examples.map((e) => <GExample key={e.fi} fi={e.fi} ru={e.ru} />)}
          </div>
        </section>
      </div>
      <button type="button" className="gnext gnext--ghost" onClick={onBack}>К темам</button>
    </div>
  );
}

/* ───────────────── light Метрики tab ───────────────── */
function MetricsScreen({ onTrainer }) {
  const cov = [
    { title: "Тип глагола 1", pct: 100 },
    { title: "Тип глагола 2 и 3", pct: 60 },
    { title: "Отрицание", pct: 35 },
    { title: "Падежи -ssa/-sta", pct: 100 },
  ];
  const accCls = (p) => (p >= 80 ? "green" : p >= 50 ? "amber" : "red");
  return (
    <>
      <div className="mx__h1">
        <h1 className="prompt prompt--home">Метрики</h1>
        <span className="mx__h1sub">обзор сейчас</span>
      </div>
      <div className="mtiles">
        <div className="card mtile">
          <div className="mtile__top">
            <span className="mtile__ic mtile__ic--flame"><GIcon name="flame" size={17} strokeWidth={1.9} /></span>
            <span className="mtile__val">3</span>
          </div>
          <div className="mtile__label">Серия дней</div>
          <div className="mtile__sub">рекорд 12</div>
        </div>
        <div className="card mtile">
          <div className="mtile__top">
            <span className="mtile__ic mtile__ic--target"><GIcon name="target" size={17} strokeWidth={1.9} /></span>
            <span className="mtile__val">88%</span>
          </div>
          <div className="mtile__label">Точность</div>
          <div className="mtile__sub">217 из 247</div>
        </div>
      </div>

      <h2 className="mx__sec">Грамматика</h2>
      <section className="card gcard" style={{ display: "grid", gap: 12 }}>
        <div className="tr-rev">
          {cov.map((c) => (
            <div key={c.title} className="tr-revrow">
              <span className="tr-revrow__ic" aria-hidden="true"><GIcon name="pen" size={15} /></span>
              <span className="tr-revrow__name">{c.title}</span>
              <span className={"tr-revrow__acc tr-acc--" + accCls(c.pct)}>{c.pct}%</span>
            </div>
          ))}
        </div>
        <button type="button" className="gnext" onClick={onTrainer}>Тренажёр грамматики · 10</button>
      </section>
    </>
  );
}

/* ───────────────── app root ───────────────── */
const TR_TWEAKS = /*EDITMODE-BEGIN*/{
  "gramHue": "#a8487f",
  "badge": "без влияния на уровень",
  "showKnow": true
}/*EDITMODE-END*/;

function OptionAApp() {
  const [t, setTweak] = useTweaks(TR_TWEAKS);
  const [view, setView] = React.useState("home"); // home | metrics | grammar | trainer | rule
  const [ruleId, setRuleId] = React.useState("t1");
  const launchReturn = React.useRef("home");

  React.useEffect(() => {
    document.documentElement.style.setProperty("--gram", t.gramHue);
  }, [t.gramHue]);

  const openTrainer = (from) => { launchReturn.current = from; setView("trainer"); };
  const openRule = (id) => { if (id && RULES[id]) { setRuleId(id); setView("rule"); } };

  let body;
  if (view === "trainer") {
    body = <div className="gram-phone-host"><TrainerFlow badge={t.badge} onExit={() => setView(launchReturn.current)} onOpenRule={openRule} /></div>;
  } else if (view === "rule") {
    body = <div className="gram-phone-host"><RuleDetail rule={RULES[ruleId]} onBack={() => setView("grammar")} /></div>;
  } else if (view === "metrics") {
    body = <AppShell tab="metrics" onNav={setView} label="Метрики"><MetricsScreen onTrainer={() => openTrainer("metrics")} /></AppShell>;
  } else if (view === "grammar") {
    body = <AppShell tab="grammar" onNav={setView} label="Грамматика"><GrammarScreen onTrainer={() => openTrainer("grammar")} onOpenRule={openRule} /></AppShell>;
  } else {
    body = <AppShell tab="home" onNav={setView} label="Главная"><HomeScreen gramHue={t.gramHue} onTrainer={() => openTrainer("home")} /></AppShell>;
  }

  return (
    <>
      <div className="tr-viewport">
        <div className="tr-device">
          <div className={"tr-root" + (t.showKnow ? "" : " tr-no-know")} style={{ width: "100%", height: "100%" }}>
            {body}
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Тренажёр" />
        <TweakColor label="Акцент режима" value={t.gramHue}
          options={["#a8487f", "#7c4fae", "#4453c4"]}
          onChange={(v) => setTweak("gramHue", v)} />
        <TweakRadio label="Текст бейджа" value={t.badge}
          options={["без влияния на уровень", "повторение", "тренировка"]}
          onChange={(v) => setTweak("badge", v)} />
        <TweakToggle label="Кнопка «Уже знаю»" value={t.showKnow}
          onChange={(v) => setTweak("showKnow", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OptionAApp />);
