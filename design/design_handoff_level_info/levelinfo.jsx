/* levelinfo.jsx — the level info page with folded-in per-mode strikes.
   Header (matches the prod screen) + content tiles + per-section item lists.
   Review → swipe «Уже знаю» to hide → train only the leftovers.
   Hidden = known + mastered, revealed via «Показать скрытые», each with
   «Вернуть в уроки» (clean progress / undo). variant = 'dots' | 'bars'. */

const SOFT_GREEN = '#E7F1EC';

/* leading status disc */
function StatusDisc({ kind }) {
  if (kind === 'mastered')
    return <span style={{ width: 18, height: 18, borderRadius: 999, background: SOFT_GREEN, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={11} c={RC.green} sw={2.8} /></span>;
  if (kind === 'known')
    return <span style={{ width: 18, height: 18, borderRadius: 999, background: '#E6F1EE', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={11} c={TEAL} sw={2.8} /></span>;
  // active: faint hollow ring
  return <span style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${RC.line}`, flex: '0 0 auto' }} />;
}

/* the inner content of any item card (shared by active + hidden) */
function ItemBody({ it, hue, statusKind, modes }) {
  const text = it.kind === 's';   // sentences wrap → stack fi/ru
  return (
    <div style={{ display: 'flex', alignItems: text ? 'flex-start' : 'center', gap: 10 }}>
      <div style={{ paddingTop: text ? 2 : 0 }}>
        {it.kind === 'r'
          ? <Icon n={it.dialog ? 'masks' : 'book'} s={17} c={GROUP_HUE.r} sw={1.7} style={{ flex: '0 0 auto' }} />
          : <StatusDisc kind={statusKind} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {text ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{it.fi}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub, marginTop: 1 }}>{it.ru}</div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>{it.fi}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub }}>{it.ru}</span>
          </div>
        )}
        <div style={{ marginTop: 7 }}>
          {it.kind === 'r'
            ? <span style={{ fontSize: 11.5, fontWeight: 700, color: modes[0] >= 2 ? RC.green : modes[0] > 0 ? GROUP_HUE.r : RC.faint }}>
                {modes[0] >= 2 ? 'Вопросы пройдены' : modes[0] > 0 ? 'Вопросы начаты' : it.read ? 'Прочитано · без вопросов' : 'Ещё не пройдено'}
              </span>
            : <ModeStrip modes={modes} hue={hue} />}
        </div>
      </div>
    </div>
  );
}

const cardSx = { background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14,
  padding: '11px 13px', boxShadow: '0 1px 2px rgba(40,30,20,0.03)' };

function Section({ defs, hue, items, idOf, st, actions, showLegend }) {
  const [open, setOpen] = React.useState(false);
  const active = items.filter(it => !st.done(idOf(it)));
  const hidden = items.filter(it => st.done(idOf(it)));
  const total = items.length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 2px 11px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: RC.sub }}>
          {active.length > 0
            ? <>Осталось <b style={{ color: RC.ink }}>{active.length}</b> из {total}</>
            : `Всё освоено · ${total}`}
        </span>
        {showLegend && active.length > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: RC.faint }}>← свайп «уже знаю»</span>}
      </div>
      {showLegend && active.length > 0 && <StripLegend defs={defs} hue={hue} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map(it => {
          const id = idOf(it);
          return (
            <SwipeCard key={id} onSwipe={() => actions.mark(id)}>
              <div style={cardSx}><ItemBody it={it} hue={hue}
                statusKind="active" modes={st.modes(it, id)} /></div>
            </SwipeCard>
          );
        })}
        {active.length === 0 && hidden.length === 0 && (
          <div style={{ textAlign: 'center', color: RC.faint, fontSize: 12.5, fontWeight: 600, padding: '8px 0 4px' }}>
            Нет элементов.
          </div>
        )}
      </div>

      {hidden.length > 0 && (
        <div style={{ marginTop: 9 }}>
          <button onClick={() => setOpen(o => !o)} style={{ width: '100%', border: `1px dashed ${RC.line}`, background: RC.wash,
            borderRadius: 12, padding: '10px 0', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: RC.sub, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon n={open ? 'chevD' : 'chevR'} s={14} c={RC.sub} sw={2.4} />
            {open ? 'Скрыть' : `Показать скрытые · ${hidden.length}`}
          </button>
          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {hidden.map(it => {
                const id = idOf(it);
                const kind = st.knownFlag(id) ? 'known' : 'mastered';
                return (
                  <div key={id} style={{ ...cardSx, opacity: 0.64 }}>
                    <ItemBody it={it} hue={hue} statusKind={kind} modes={st.modes(it, id)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: kind === 'known' ? TEAL : RC.green,
                        background: kind === 'known' ? '#E6F1EE' : SOFT_GREEN, borderRadius: 6, padding: '2px 7px' }}>
                        {kind === 'known' ? 'уже знаю' : 'выучено'}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button onClick={() => actions.ret(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        border: `1px solid ${RC.line}`, background: RC.card, borderRadius: 9, padding: '6px 10px',
                        fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: RC.ink, cursor: 'pointer' }}>
                        <Icon n="refresh" s={13} c={RC.sub} sw={2.1} />Вернуть в уроки
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Tile({ icon, n, label, hue }) {
  return (
    <div style={{ flex: 1, background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14, padding: '13px 10px', textAlign: 'center' }}>
      <Icon n={icon} s={19} c={hue} sw={1.8} style={{ margin: '0 auto 7px' }} />
      <div style={{ fontSize: 20, fontWeight: 800 }}>{n}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: RC.sub, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function LevelInfo({ levelKey = 3 }) {
  const L = LEVELS_DATA[levelKey];
  const current = L.status === 'current';
  const [tab, setTab] = React.useState('w');

  /* state: known (swipe) + returned (clean / undo) */
  const seedKnown = () => {
    const s = new Set();
    [['words', 'w'], ['sentences', 's'], ['texts', 'r']].forEach(([g, k]) =>
      L[g].forEach((it, i) => { if (it.known) s.add(k + i); }));
    return s;
  };
  const [known, setKnown] = React.useState(seedKnown);
  const [returned, setReturned] = React.useState(() => new Set());

  React.useEffect(() => { setKnown(seedKnown()); setReturned(new Set()); setTab('w'); }, [levelKey]);

  const idOf = (it) => it.kind + L[it.kind === 'w' ? 'words' : it.kind === 's' ? 'sentences' : 'texts'].indexOf(it);
  const knownFlag = (id) => known.has(id) && !returned.has(id);
  const doneFor = (it, id) => knownFlag(id) || (isMastered(it) && !returned.has(id));
  const modesFor = (it, id) => returned.has(id) ? it.modes.map(() => 0) : it.modes;

  const actions = {
    mark: (id) => setKnown(s => new Set(s).add(id)),
    ret: (id) => {
      setReturned(s => new Set(s).add(id));
      setKnown(s => { const n = new Set(s); n.delete(id); return n; });
    },
  };

  /* each section gets an item-aware status helper */
  const sectionProps = (defs, hue, items, showLegend) => ({
    defs, hue, items, showLegend, actions, idOf,
    st: {
      done: (id) => { const it = items.find(x => idOf(x) === id); return it ? doneFor(it, id) : false; },
      knownFlag, modes: modesFor,
    },
  });

  /* four tabs — texts split from dialogs */
  const CATS = [
    { k: 'w', label: 'Слова', defs: WORD_MODES, hue: GROUP_HUE.w, items: L.words, legend: true },
    { k: 's', label: 'Предложения', defs: SENT_MODES, hue: GROUP_HUE.s, items: L.sentences, legend: true },
    { k: 't', label: 'Тексты', defs: null, hue: GROUP_HUE.r, items: L.texts.filter(x => !x.dialog), legend: false },
    { k: 'd', label: 'Диалоги', defs: null, hue: GROUP_HUE.r, items: L.texts.filter(x => x.dialog), legend: false },
  ];
  const cur = CATS.find(c => c.k === tab) || CATS[0];
  const remaining = (items) => items.filter(it => !doneFor(it, idOf(it))).length;

  const HeadNode = current
    ? <div style={{ width: 46, height: 46, borderRadius: 999, background: '#fff', border: `2.5px solid ${GOLD}`,
        boxShadow: `0 0 0 4px ${GOLD_SOFT}`, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: GOLD }}>{L.lv}</span></div>
    : <div style={{ width: 46, height: 46, borderRadius: 999, background: TEAL, flex: '0 0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={22} c="#fff" sw={2.8} /></div>;

  return (
    <Frame nav="grid">
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <div style={{ margin: '6px 0 14px' }}><BackBtn label="Уровни" /></div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {HeadNode}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{L.fi}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: TEAL, background: '#E6F1EE', borderRadius: 7, padding: '3px 7px' }}>{bandOf(L.lv)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: RC.sub }}>
              {L.ru} · уровень {L.lv} · {current ? 'текущий' : 'пройден'}
            </div>
          </div>
        </div>

        <SecLabel>Содержание уровня</SecLabel>
        <div style={{ display: 'flex', gap: 11 }}>
          <Tile icon="star" n={L.words.length} label="слов" hue={GROUP_HUE.w} />
          <Tile icon="chat" n={L.sentences.length} label="фраз" hue={GROUP_HUE.s} />
          <Tile icon="book" n={L.texts.length} label={L.texts.length === 1 ? 'текст' : 'текста'} hue={GROUP_HUE.r} />
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '20px 0 0', padding: '2px 0',
          scrollbarWidth: 'none' }}>
          {CATS.map(c => {
            const on = c.k === tab;
            const rem = remaining(c.items);
            return (
              <button key={c.k} onClick={() => setTab(c.k)} style={{ flex: '0 0 auto', display: 'inline-flex',
                alignItems: 'center', gap: 6, border: `1px solid ${on ? TEAL : RC.line}`, background: on ? TEAL : RC.card,
                color: on ? '#fff' : RC.ink, borderRadius: 999, padding: '8px 13px', fontFamily: FONT, fontSize: 13,
                fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c.label}
                <span style={{ fontSize: 11, fontWeight: 800, minWidth: 14, textAlign: 'center', borderRadius: 999,
                  padding: '0 5px', color: on ? TEAL : RC.sub, background: on ? '#fff' : RC.wash }}>
                  {rem > 0 ? rem : '✓'}
                </span>
              </button>
            );
          })}
        </div>

        <Section key={cur.k} {...sectionProps(cur.defs, cur.hue, cur.items, cur.legend)} />

        <button style={{ width: '100%', marginTop: 20, border: 'none', background: current ? GOLD : RC.card,
          color: current ? '#fff' : RC.ink, borderRadius: 13, padding: '14px 0', fontFamily: FONT, fontSize: 14.5, fontWeight: 800,
          cursor: 'pointer', boxShadow: current ? '0 2px 10px rgba(160,120,30,0.18)' : 'none',
          border: current ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {current ? <><Icon n="play" s={16} c="#fff" sw={2} />Тренировать оставшееся</> : <><Icon n="refresh" s={16} c={RC.sub} sw={2} />Повторить уровень</>}
        </button>
      </div>
    </Frame>
  );
}

Object.assign(window, { LevelInfo });
