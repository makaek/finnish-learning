/* gram-screens.jsx — the «Грамматика» screens: home integration, topic map,
   lesson flow (Теория · Разминка · Дрилл), end-of-lesson summary. */

/* ---------- 1 · Home integration: 4th spoke + action card ---------- */

const GRAM_RING_MODES = [
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

function GramHomeMock({ gramHue }) {
  return (
    <PhoneShell nav="home" label="Главная — интеграция">
      <header className="home-head">
        <span className="home-wordmark">Suomi</span>
        <span className="home-head__spacer" aria-hidden="true"></span>
        <button type="button" className="streakchip">
          <span className="streakchip__flame" aria-hidden="true"><GIcon name="flame" size={17} /></span>
          <span className="streakchip__num">3</span>
          <span className="streakchip__divider" aria-hidden="true"></span>
          <span className="streakchip__week" aria-hidden="true">
            <span className="scdot scdot--done"></span>
            <span className="scdot scdot--done"></span>
            <span className="scdot scdot--today"></span>
            <span className="scdot"></span>
            <span className="scdot"></span>
            <span className="scdot"></span>
            <span className="scdot"></span>
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
        <GramBalanceRing level={7} modes={GRAM_RING_MODES} gramHue={gramHue} />
        <GramRingLegend gramHue={gramHue} />
      </div>

      <button type="button" className="ctacard ctacard--gram ctacard--row">
        <span className="ctacard__tile" aria-hidden="true"><GIcon name="pen" size={21} /></span>
        <span className="ctacard__main">
          <span className="ctacard__kicker">Грамматика</span>
          <span className="ctacard__title">Слабая тема: Отрицание</span>
          <span className="ctacard__sub">3–5 мин · продолжить урок</span>
        </span>
        <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
      </button>

      <div className="cta">
        <button type="button" className="ctacard ctacard--weak">
          <span className="ctacard__top">
            <span className="ctacard__tile" aria-hidden="true"><GIcon name="bolt" size={20} /></span>
            <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
          </span>
          <span>
            <span className="ctacard__kicker">Слабое звено</span>
            <span className="ctacard__title">Диалоги</span>
            <span className="ctacard__sub">точность 64%</span>
          </span>
        </button>
        <button type="button" className="ctacard ctacard--mix">
          <span className="ctacard__top">
            <span className="ctacard__tile" aria-hidden="true"><GIcon name="refresh" size={20} /></span>
            <span className="ctacard__play" aria-hidden="true"><GIcon name="play" size={15} /></span>
          </span>
          <span>
            <span className="ctacard__kicker">Микс</span>
            <span className="ctacard__title">Все режимы</span>
            <span className="ctacard__sub">10 заданий</span>
          </span>
        </button>
      </div>
    </PhoneShell>
  );
}

/* Ring close-up artboard */
function GramRingCloseup({ gramHue }) {
  return (
    <PhoneShell label="Кольцо — крупно">
      <div className="ringcard">
        <GramBalanceRing level={7} modes={GRAM_RING_MODES} gramHue={gramHue} />
        <GramRingLegend gramHue={gramHue} />
      </div>
      <GExplain tone="info">
        Новая спица «Грамматика»: собственный акцент и форма-ромб — группа читается
        и без цвета, как остальные три (круг · квадрат · шестиугольник).
      </GExplain>
    </PhoneShell>
  );
}

/* ---------- 2 · Topic map ---------- */

const GRAM_MODULES = [
  {
    n: "Модуль 1", t: "Глагол", done: "1/3",
    topics: [
      { state: "mastered", pct: 100, title: "Тип глагола 1", sub: "puhua, asua: основа и личные окончания", tags: [["verbtype", "тип 1"], ["grad", "чередование"]] },
      { state: "progress", pct: 60, title: "Тип глагола 2 и 3", sub: "syödä, mennä, opiskella", tags: [["verbtype", "тип 2–3"]] },
      { state: "progress", pct: 35, title: "Отрицание", sub: "en, et, ei + форма без окончания", tags: [["neg", "коннегатив"]] },
    ],
  },
  {
    n: "Модуль 2", t: "Падежи", done: "1/3",
    topics: [
      { state: "mastered", pct: 100, title: "Падежи внутри (-ssa/-sta)", sub: "инессив «где?» и элатив «откуда?»", tags: [["case", "падеж"], ["vh", "гармония гласных"]] },
      { state: "avail", pct: 0, title: "Генитив", sub: "чей? чего? — окончание -n", tags: [["case", "падеж"]] },
      { state: "locked", pct: 0, title: "Иллатив (куда?)", sub: "taloon, Helsinkiin", hint: "Сначала пройдите: Генитив" },
    ],
  },
  {
    n: "Модуль 3", t: "Предложение", done: "0/3",
    topics: [
      { state: "avail", pct: 0, title: "Вопрос с -ko/-kö", sub: "Puhutko sinä suomea?", tags: [["vh", "гармония гласных"]] },
      { state: "locked", pct: 0, title: "Партитив после чисел", sub: "kaksi taloa, kolme kissaa", hint: "Сначала пройдите: Генитив" },
      { state: "locked", pct: 0, title: "Владение: minulla on", sub: "у меня есть…", hint: "Сначала пройдите: Иллатив (куда?)" },
    ],
  },
];

function GTopicCard({ topic }) {
  const { state, pct, title, sub, tags, hint } = topic;
  const tile =
    state === "mastered" ? <GIcon name="check" size={19} strokeWidth={2.4} /> :
    state === "locked" ? <GIcon name="lock" size={18} /> :
    <GIcon name="pen" size={18} />;
  return (
    <button type="button" className={"gtopic gtopic--" + state} disabled={state === "locked"}>
      <span className="gtopic__tile" aria-hidden="true">{tile}</span>
      <span className="gtopic__main">
        <span className="gtopic__title">{title}</span>
        <span className="gtopic__sub">{sub}</span>
        {tags && state !== "locked" && (
          <span className="gtags gtopic__tags">
            {tags.map(([k, label]) => <GTag key={label} kind={k}>{label}</GTag>)}
          </span>
        )}
        {hint && (
          <span className="gtopic__hint"><GIcon name="lock" size={12} strokeWidth={2.2} /> {hint}</span>
        )}
      </span>
      {state === "mastered" && <span className="gdone"><GIcon name="check" size={12} strokeWidth={3} /> Освоено</span>}
      {state === "progress" && <Mastery pct={pct} />}
      {state === "avail" && <span className="gtopic__go" aria-hidden="true"><GIcon name="chevR" size={18} /></span>}
    </button>
  );
}

function GramTopicMap() {
  return (
    <PhoneShell nav="home" label="Грамматика — карта тем">
      <div className="gmap__head">
        <button type="button" className="gexit" aria-label="Назад"><GIcon name="back" size={17} /></button>
        <h1 className="gmap__title">Грамматика</h1>
        <span className="glevel">A1.2</span>
      </div>

      <div className="ghero">
        <MasteryRing pct={31} size={46} />
        <div className="ghero__main">
          <div className="ghero__t">Освоено 2 из 9 тем</div>
          <span className="ghero__bar"><span className="ghero__fill" style={{ width: "31%" }}></span></span>
          <div className="ghero__sub">Слабая тема: <b>Отрицание</b> · повторите сегодня</div>
        </div>
      </div>

      {GRAM_MODULES.map((mod) => (
        <React.Fragment key={mod.n}>
          <div className="gmod">
            <span className="gmod__n">{mod.n}</span>
            <span className="gmod__t">{mod.t}</span>
            <span className="gmod__line" aria-hidden="true"></span>
            <span className="gmod__count">{mod.done}</span>
          </div>
          <div className="gtopics">
            {mod.topics.map((t) => <GTopicCard key={t.title} topic={t} />)}
          </div>
        </React.Fragment>
      ))}
    </PhoneShell>
  );
}

/* ---------- 3 · Lesson: Теория ---------- */

function GramTheoryVerb() {
  return (
    <PhoneShell label="Урок — Теория (Тип глагола 1)">
      <LessonTop topic="Тип глагола 1" step={1} />
      <section className="card gcard">
        <div className="gtags">
          <GTag kind="verbtype">тип 1</GTag>
          <GTag kind="grad">чередование</GTag>
        </div>
        <h2 className="gth__title">Тип глагола 1</h2>
        <p className="gth__summary">Глаголы на -a / -ä: puhua, asua, nukkua.</p>
        <p className="gth__body">
          Уберите конечное <b lang="fi">-a/-ä</b> — получится основа. К ней присоединяются
          личные окончания. У части глаголов согласная чередуется: сильная ступень
          <b lang="fi"> kk</b> — в формах hän и he, слабая <b lang="fi">k</b> — в остальных.
        </p>

        <div className="gth__sec">Примеры</div>
        <div className="gexs">
          <GExample fi="Minä puhun suomea." ru="Я говорю по-фински." />
          <GExample fi="Hän nukkuu hyvin." ru="Он крепко спит." />
        </div>

        <div className="gth__sec">nukkua · настоящее время</div>
        <ParadigmTable rows={[
          { l: "minä", f: <>nu<Hl alt>k</Hl>u<Hl>n</Hl></> },
          { l: "sinä", f: <>nu<Hl alt>k</Hl>u<Hl>t</Hl></> },
          { l: "hän", f: <>nu<Hl alt>kk</Hl><Hl>uu</Hl></> },
          { l: "me", f: <>nu<Hl alt>k</Hl>u<Hl>mme</Hl></> },
          { l: "te", f: <>nu<Hl alt>k</Hl>u<Hl>tte</Hl></> },
          { l: "he", f: <>nu<Hl alt>kk</Hl>u<Hl>vat</Hl></> },
        ]} />
        <ParaKey items={[
          ["var(--gram-wash)", "личное окончание"],
          ["color-mix(in srgb, var(--gold) 24%, transparent)", "чередование kk → k"],
        ]} />

        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="info">
            Слабая ступень <span className="fi">k</span> — перед окончаниями -n, -t, -mme, -tte.
            Сильная <span className="fi">kk</span> — в формах hän и he.
          </GExplain>
        </div>
      </section>
      <div className="gram-spacer"></div>
      <button type="button" className="gnext">Дальше</button>
    </PhoneShell>
  );
}

function GramTheoryCase() {
  return (
    <PhoneShell label="Урок — Теория (Падежи -ssa/-sta)">
      <LessonTop topic="Падежи внутри (-ssa/-sta)" step={1} />
      <section className="card gcard">
        <div className="gtags">
          <GTag kind="case">падеж</GTag>
          <GTag kind="vh">гармония гласных</GTag>
        </div>
        <h2 className="gth__title">Падежи внутри: -ssa / -sta</h2>
        <p className="gth__summary">Инессив «в чём?» и элатив «из чего?».</p>
        <p className="gth__body">
          Окончание выбирает гармония гласных: после <b lang="fi">a, o, u</b> в основе —
          <b lang="fi"> -ssa / -sta</b>; после <b lang="fi">ä, ö, y</b> —
          <b lang="fi"> -ssä / -stä</b>.
        </p>

        <div className="gth__sec">Примеры</div>
        <div className="gexs">
          <GExample fi="Asun Helsingissä." ru="Я живу в Хельсинки." />
          <GExample fi="Tulen koulusta." ru="Я иду из школы." />
        </div>

        <div className="gth__sec">talo · metsä</div>
        <ParadigmTable rows={[
          { l: "где?", lRu: true, f: <>talo<Hl>ssa</Hl></>, ru: "в доме" },
          { l: "откуда?", lRu: true, f: <>talo<Hl>sta</Hl></>, ru: "из дома" },
          { l: "где?", lRu: true, f: <>mets<Hl alt>ä</Hl><Hl>ssä</Hl></>, ru: "в лесу" },
          { l: "откуда?", lRu: true, f: <>mets<Hl alt>ä</Hl><Hl>stä</Hl></>, ru: "из леса" },
        ]} />
        <ParaKey items={[
          ["var(--gram-wash)", "окончание падежа"],
          ["color-mix(in srgb, var(--gold) 24%, transparent)", "гласная основы"],
        ]} />

        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="info">
            <span className="fi">ä</span> в основе metsä- требует -ssä / -stä — гармония гласных.
          </GExplain>
        </div>
      </section>
      <div className="gram-spacer"></div>
      <button type="button" className="gnext">Дальше</button>
    </PhoneShell>
  );
}

/* ---------- 3 · Lesson: Разминка (recognition, answered-correct) ---------- */

function GramWarmup() {
  return (
    <PhoneShell label="Урок — Разминка">
      <LessonTop topic="Тип глагола 1" step={2} count="3 / 5" />
      <section className="card gcard">
        <p className="gprompt" lang="fi">Hän <span className="gfill-in">asuu</span> Helsingissä.
          <span className="gprompt__hint" lang="ru">Выберите форму глагола asua</span>
        </p>
        <div className="options">
          <button type="button" className="option option--correct" disabled lang="fi">asuu</button>
          <button type="button" className="option option--muted" disabled lang="fi">asut</button>
          <button type="button" className="option option--muted" disabled lang="fi">asua</button>
          <button type="button" className="option option--muted" disabled lang="fi">asuvat</button>
        </div>
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">
            Верно! Hän — третье лицо: основа asu- + длинная гласная → <span className="fi">asuu</span>.
          </GExplain>
        </div>
      </section>
      <div className="gram-spacer"></div>
      <button type="button" className="gnext">Дальше</button>
    </PhoneShell>
  );
}

/* ---------- 3 · Lesson: Дрилл (production, typing state) ---------- */

function GramDrill() {
  return (
    <PhoneShell label="Урок — Дрилл">
      <LessonTop topic="Тип глагола 1" step={3} count="4 / 8" />
      <section className="card gcard">
        <p className="gprompt"><span className="fi" lang="fi">nukkua</span> → hän
          <span className="gprompt__hint">настоящее время</span>
        </p>
        <div className="produce">
          <input className="produce__input" type="text" lang="fi" defaultValue="nukk" placeholder="Введите форму…" />
          <QuickKeys />
        </div>
      </section>
      <div className="gram-spacer"></div>
      <button type="button" className="gnext">Проверить</button>
    </PhoneShell>
  );
}

/* ---------- 4 · End-of-lesson summary ---------- */

function GramSummary() {
  return (
    <PhoneShell center label="Итог урока">
      <div className="gsum">
        <MasteryRing pct={72} size={108} />
        <span className="gsum__delta">+27%</span>
        <h2 className="gsum__title">Хорошо!</h2>
        <div className="gsum__sub">Тип глагола 1 · освоение 72%</div>
        <div className="gsum__score">8<small>/10</small></div>
      </div>

      <div className="gsumcard">
        <div className="gsumcard__t">Повторите</div>
        <GExplain tone="near">
          Чередование <span className="fi">kk → k</span> — две ошибки в дрилле.
        </GExplain>
        <GExplain tone="no">
          Окончание <span className="fi">-vat</span> для he — одна ошибка.
        </GExplain>
      </div>

      <div className="gunlock">
        <span className="gunlock__disc" aria-hidden="true"><GIcon name="lockOpen" size={18} /></span>
        <span>
          <span className="gunlock__k">Открыта тема</span>
          <span className="gunlock__t" style={{ display: "block" }}>Генитив</span>
        </span>
      </div>

      <div className="gbtnrow">
        <button type="button" className="gnext gnext--ghost">Ещё раз</button>
        <button type="button" className="gnext">К темам</button>
      </div>
    </PhoneShell>
  );
}

Object.assign(window, {
  GramHomeMock, GramRingCloseup, GramTopicMap,
  GramTheoryVerb, GramTheoryCase, GramWarmup, GramDrill, GramSummary,
});
