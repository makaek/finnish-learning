/* levels.jsx — «Уровни»: review passed levels, see the road ahead, and
   manually mark the current level passed (per-level button → confirm dialog).
   Unlocked = 1..CUR_LEVEL (reviewable); CUR_LEVEL = current; rest locked.
   view: 'list' | 'detail' (review a passed level) | 'confirm' (mark dialog). */

const BANDS = [
  { id: 'A1.1', ru: 'Основы', levels: [1, 2, 3] },
  { id: 'A1.2', ru: 'Повседневность', levels: [4, 5, 6] },
  { id: 'A1.3', ru: 'Город и быт', levels: [7, 8, 9] },
  { id: 'A2',   ru: 'Уверенный старт', levels: [10, 11, 12] },
];

function Counts({ L, muted }) {
  const c = muted ? RC.faint : RC.sub;
  const Item = ({ icon, n, hue }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: c }}>
      <Icon n={icon} s={13} c={muted ? RC.faint : hue} sw={1.8} />{n}
    </span>
  );
  return (
    <div style={{ display: 'flex', gap: 13 }}>
      <Item icon="star" n={L.w} hue={GROUP_HUE.w} />
      <Item icon="chat" n={L.s} hue={GROUP_HUE.s} />
      <Item icon="book" n={L.t} hue={GROUP_HUE.r} />
    </div>
  );
}

/* timeline node */
function Node({ st }) {
  const base = { width: 34, height: 34, borderRadius: 999, flex: '0 0 auto', display: 'flex',
    alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 };
  if (st === 'done') return <div style={{ ...base, background: TEAL }}><Icon n="check" s={16} c="#fff" sw={2.8} /></div>;
  if (st === 'current') return (
    <div style={{ ...base, background: '#fff', border: `2.5px solid ${GOLD}`, boxShadow: `0 0 0 4px ${GOLD_SOFT}` }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>{CUR_LEVEL}</span>
    </div>
  );
  return <div style={{ ...base, background: RC.track, border: `1px solid ${RC.line}` }}><Icon n="lock" s={15} c={RC.faint} sw={1.9} /></div>;
}

function LevelRow({ L, last }) {
  const st = lvStatus(L.lv);
  const locked = st === 'locked', current = st === 'current';
  return (
    <div style={{ display: 'flex', gap: 13 }}>
      {/* rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
        <Node st={st} />
        {!last && <div style={{ width: 2, flex: 1, background: st === 'done' ? TEAL : RC.line, opacity: st === 'done' ? 0.4 : 1, marginTop: 2 }} />}
      </div>
      {/* card */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 2 : 16 }}>
        <button data-goto={locked ? undefined : (current ? undefined : `detail:${L.lv}`)} disabled={locked}
          style={{ width: '100%', textAlign: 'left', cursor: locked ? 'default' : 'pointer', fontFamily: FONT,
            background: current ? '#fff' : locked ? 'transparent' : RC.card,
            border: `1px solid ${current ? GOLD_SOFT : locked ? 'transparent' : RC.line}`,
            borderRadius: 16, padding: current ? '15px 15px 14px' : '12px 14px',
            boxShadow: current ? '0 2px 10px rgba(160,120,30,0.10)' : locked ? 'none' : '0 1px 2px rgba(40,30,20,0.03)',
            opacity: locked ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', color: locked ? RC.faint : RC.sub }}>УР. {L.lv}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: locked ? RC.faint : TEAL, background: locked ? RC.track : '#E6F1EE', borderRadius: 6, padding: '2px 6px' }}>{bandOf(L.lv)}</span>
            {st === 'done' && <span style={{ fontSize: 10.5, fontWeight: 800, color: RC.green, marginLeft: 'auto' }}>Пройден</span>}
            {current && <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, marginLeft: 'auto' }}>Сейчас здесь</span>}
            {!locked && st === 'done' && <Icon n="chevR" s={16} c={RC.faint} sw={2.2} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 5 }}>
            <span style={{ fontSize: current ? 18 : 16, fontWeight: 800, letterSpacing: '-0.02em', color: locked ? RC.sub : RC.ink }}>{L.fi}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: RC.faint }}>{L.ru}</span>
          </div>
          <div style={{ marginTop: 9 }}><Counts L={L} muted={locked} /></div>
          {current && (
            <div style={{ marginTop: 12 }}>
              <Bar value={L.fr} color={GOLD} h={7} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, fontWeight: 700, color: RC.sub }}>
                <span>{Math.round(L.fr * 100)}% освоено</span>
                <span style={{ color: RC.faint }}>осталось ~{Math.round((1 - L.fr) * (L.w + L.s + L.t))} элем.</span>
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
                <span style={{ flex: 1, textAlign: 'center', background: GOLD, color: '#fff', borderRadius: 11, padding: '11px 0', fontSize: 13.5, fontWeight: 800 }}>Продолжить</span>
                <span data-goto="confirm" style={{ flex: 1, textAlign: 'center', background: '#fff', color: RC.ink, border: `1px solid ${RC.line}`, borderRadius: 11, padding: '11px 0', fontSize: 13.5, fontWeight: 800 }}>Отметить пройденным</span>
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function BandHead({ band }) {
  const done = band.levels.every(lv => lvStatus(lv) === 'done');
  const active = band.levels.some(lv => lvStatus(lv) === 'current');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '8px 0 14px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: active ? TEAL : done ? RC.green : RC.sub,
        background: active ? '#E6F1EE' : done ? '#E7F1EC' : RC.wash, borderRadius: 8, padding: '4px 9px' }}>{band.id}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: RC.ink }}>{band.ru}</span>
      {done && <Icon n="check" s={15} c={RC.green} sw={2.6} style={{ marginLeft: -2 }} />}
      <span style={{ flex: 1, height: 1, background: RC.line }} />
    </div>
  );
}

/* ---- detail: review a single passed level ---- */
function ItemRow({ fi, ru, icon, dialog }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: RC.card, border: `1px solid ${RC.line}`,
      borderRadius: 12, padding: '11px 13px' }}>
      {icon
        ? <Icon n={dialog ? 'masks' : icon} s={17} c={READ} sw={1.7} style={{ flex: '0 0 auto' }} />
        : <span style={{ width: 17, height: 17, borderRadius: 999, background: '#E7F1EC', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="check" s={11} c={RC.green} sw={2.8} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{fi}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub, marginTop: 1 }}>{ru}</div>
      </div>
    </div>
  );
}

function DetailView({ lv }) {
  const L = LEVELS[lv - 1];
  const C = LEVEL_CONTENT[lv] || { words: [], sentences: [], texts: [] };
  const [allWords, setAllWords] = React.useState(false);
  const PREVIEW = 5;
  const shownWords = allWords ? C.words : C.words.slice(0, PREVIEW);
  const hiddenCount = C.words.length - PREVIEW;

  const Tile = ({ icon, n, label, hue }) => (
    <div style={{ flex: 1, background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14, padding: '13px 10px', textAlign: 'center' }}>
      <Icon n={icon} s={19} c={hue} sw={1.8} style={{ margin: '0 auto 7px' }} />
      <div style={{ fontSize: 20, fontWeight: 800 }}>{n}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: RC.sub, marginTop: 1 }}>{label}</div>
    </div>
  );
  return (
    <Frame nav="grid">
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <div style={{ margin: '6px 0 14px' }}><BackBtn label="Уровни" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 999, background: TEAL, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="check" s={22} c="#fff" sw={2.8} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{L.fi}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: TEAL, background: '#E6F1EE', borderRadius: 7, padding: '3px 7px' }}>{bandOf(lv)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: RC.sub }}>{L.ru} · уровень {lv} · пройден</div>
          </div>
        </div>

        <SecLabel>Содержание уровня</SecLabel>
        <div style={{ display: 'flex', gap: 11 }}>
          <Tile icon="star" n={L.w} label="слов" hue={GROUP_HUE.w} />
          <Tile icon="chat" n={L.s} label="фраз" hue={GROUP_HUE.s} />
          <Tile icon="book" n={L.t} label={L.t === 1 ? 'текст' : 'текста'} hue={GROUP_HUE.r} />
        </div>

        <SecLabel right={<span style={{ fontSize: 12, fontWeight: 700, color: RC.faint }}>{C.words.length}</span>}>Слова</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shownWords.map(([fi, ru], i) => <ItemRow key={i} fi={fi} ru={ru} />)}
          {hiddenCount > 0 && (
            <button onClick={() => setAllWords(a => !a)} style={{ width: '100%', border: `1px solid ${RC.line}`, background: RC.wash,
              borderRadius: 12, padding: '11px 0', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: TEAL, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {allWords ? 'Свернуть' : `Показать ещё ${hiddenCount} слов`}
              <Icon n={allWords ? 'chevD' : 'chevR'} s={15} c={TEAL} sw={2.4} />
            </button>
          )}
        </div>

        <SecLabel right={<span style={{ fontSize: 12, fontWeight: 700, color: RC.faint }}>{C.sentences.length}</span>}>Предложения</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {C.sentences.map(([fi, ru], i) => <ItemRow key={i} fi={fi} ru={ru} />)}
        </div>

        <SecLabel right={<span style={{ fontSize: 12, fontWeight: 700, color: RC.faint }}>{C.texts.length}</span>}>Тексты и диалоги</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {C.texts.map((t, i) => <ItemRow key={i} fi={t.fi} ru={t.ru} icon="book" dialog={t.dialog} />)}
        </div>

        <button style={{ width: '100%', marginTop: 18, border: `1px solid ${RC.line}`, background: RC.card, borderRadius: 13,
          padding: '13px 0', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: RC.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon n="refresh" s={17} c={RC.sub} sw={2} />Повторить уровень
        </button>
      </div>
    </Frame>
  );
}

/* ---- confirm dialog overlay ---- */
function ConfirmDialog() {
  const L = LEVELS[CUR_LEVEL - 1];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', background: 'rgba(30,24,18,0.42)', backdropFilter: 'blur(1.5px)' }}>
      <div style={{ background: RC.card, borderRadius: '24px 24px 0 0', padding: '10px 20px 26px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: RC.line, margin: '0 auto 18px' }} />
        <div style={{ width: 54, height: 54, borderRadius: 16, background: GOLD_SOFT, margin: '0 auto 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="bolt" s={27} c={GOLD} sw={1.8} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 8px' }}>
          Перейти дальше?
        </h2>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: RC.sub, textAlign: 'center', lineHeight: 1.5, margin: '0 auto 16px', maxWidth: 290 }}>
          Уровень {CUR_LEVEL} «{L.fi}» ({L.ru}) будет отмечен пройденным. Все его слова, фразы и тексты
          станут <b style={{ color: RC.ink }}>выученными</b>, и откроется уровень {CUR_LEVEL + 1}.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#FBF4E8', border: `1px solid ${GOLD_SOFT}`,
          borderRadius: 12, padding: '11px 13px', marginBottom: 18 }}>
          <Icon n="info" s={16} c={GOLD} sw={1.9} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7A5A1E', lineHeight: 1.45 }}>
            Это пропустит {Math.round((1 - L.fr) * (L.w + L.s + L.t))} ещё не освоенных элементов. Их можно повторить в любой момент.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ border: 'none', background: GOLD, color: '#fff', borderRadius: 13, padding: '14px 0',
            fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Отметить пройденным</button>
          <button data-goto="list" style={{ border: 'none', background: 'none', color: RC.sub, borderRadius: 13, padding: '6px 0',
            fontFamily: FONT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function LevelsScreen({ view = 'list', detailLv = 3 }) {
  if (view === 'detail') return <DetailView lv={detailLv} />;
  const list = (
    <Frame nav="grid">
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <div style={{ margin: '6px 0 12px' }}><BackBtn label="Метрики" /></div>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 2px 4px' }}>Уровни</h1>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: RC.sub, margin: '0 2px 20px' }}>
          Пройдено {CUR_LEVEL - 1} из {LEVELS.length}. Откройте любой пройденный уровень для повторения.
        </p>
        {BANDS.map(band => (
          <div key={band.id}>
            <BandHead band={band} />
            {band.levels.map((lv, i) => (
              <LevelRow key={lv} L={LEVELS[lv - 1]}
                last={i === band.levels.length - 1 && band.id === 'A2'} />
            ))}
          </div>
        ))}
        <div style={{ height: 4 }} />
      </div>
    </Frame>
  );
  return (
    <div style={{ position: 'relative', width: 390, height: 844 }}>
      {list}
      {view === 'confirm' && <ConfirmDialog />}
    </div>
  );
}

Object.assign(window, { LevelsScreen });
