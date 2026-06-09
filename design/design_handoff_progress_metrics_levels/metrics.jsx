/* metrics.jsx — «Метрики», rebalanced.
   Hero answers "how far through the curriculum am I"; a weak-link module
   answers "what should I practise"; coverage answers "how much do I know".
   Dropped: Полностью освоено, Всего ответов, Коробки Лейтнера, POS, Свежесть. */

const TEAL = RC.gSent;        // primary progress accent
const GOLD = '#C8902B';       // achievement accent (level / trophy)
const GOLD_SOFT = '#F6EEDC';

function Card({ children, pad = 16, style }) {
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, padding: pad,
      boxShadow: '0 1px 2px rgba(40,30,20,0.04)', ...style }}>{children}</div>
  );
}
function SecLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 2px 9px' }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: RC.sub, whiteSpace: 'nowrap' }}>{children}</span>
      {right}
    </div>
  );
}

/* the 12-segment level rail in the hero */
function LevelRail() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {LEVELS.map(L => {
        const st = lvStatus(L.lv);
        const bg = st === 'done' ? TEAL : st === 'current' ? TEAL : RC.track;
        return (
          <div key={L.lv} style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: 7, borderRadius: 999, background: bg,
              opacity: st === 'current' ? 1 : st === 'done' ? 0.9 : 1,
              width: st === 'current' ? `${L.fr * 100}%` : '100%',
              boxShadow: st === 'current' ? `0 0 0 2px ${RC.card}, 0 0 0 3.4px ${TEAL}` : 'none' }} />
            {st === 'current' && <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: RC.track, zIndex: -1 }} />}
          </div>
        );
      })}
    </div>
  );
}

function Hero() {
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '17px 17px 15px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: GOLD_SOFT, flex: '0 0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: GOLD }}>{CUR_LEVEL}</span>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: GOLD, marginTop: 2 }}>УРОВЕНЬ</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: RC.sub }}>Текущая ступень</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', color: TEAL }}>{CEFR.stage}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: RC.sub }}>уровень {CEFR.band}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 17px 14px' }}>
        <LevelRail />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, fontWeight: 700, color: RC.faint }}>
          <span>A1.1</span><span>A1.2</span><span>A1.3</span><span>A2</span>
        </div>
      </div>
      <button data-goto="levels" style={{ width: '100%', border: 'none', borderTop: `1px solid ${RC.line}`,
        background: RC.wash, padding: '12px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', fontFamily: FONT }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: RC.ink }}>Все уровни · пройденные и впереди</span>
        <Icon n="chevR" s={18} c={RC.sub} sw={2} />
      </button>
    </Card>
  );
}

function Today() {
  const met = TODAY.lessons >= TODAY.goal;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Сегодня</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: RC.sub }}>
          · {TODAY.correct} из {TODAY.answered} верно
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <RingGauge value={TODAY.lessons / TODAY.goal} label={`${TODAY.lessons}`} sub={`из ${TODAY.goal}`}
            color={met ? RC.green : TEAL} />
          <span style={{ fontSize: 12, fontWeight: 700, color: RC.sub }}>Уроки</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <RingGauge value={TODAY.acc / 100} label={`${TODAY.acc}%`} color={RC.green} />
          <span style={{ fontSize: 12, fontWeight: 700, color: RC.sub }}>Точность</span>
        </div>
      </div>
    </Card>
  );
}

/* coverage bar row */
function CovRow({ icon, label, learned, total, color, note }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <Icon n={icon} s={17} c={color} sw={1.8} />
        <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: RC.ink }}>{learned}<span style={{ color: RC.faint, fontWeight: 700 }}>/{total}</span></span>
      </div>
      <Bar value={learned / total} color={color} h={7} />
      {note && <div style={{ fontSize: 11, fontWeight: 600, color: RC.faint, marginTop: 5 }}>{note}</div>}
    </div>
  );
}

function Coverage() {
  return (
    <Card>
      <CovRow icon="star" label="Слова" learned={KPI.words.learned} total={KPI.words.total} color={GROUP_HUE.w}
        note={`${Math.round(KPI.words.learned / KPI.words.total * 100)}% словаря выучено`} />
      <CovRow icon="chat" label="Фразы" learned={KPI.sentences.learned} total={KPI.sentences.total} color={GROUP_HUE.s}
        note={`ещё ${KPI.sentences.eligible} доступно для тренировки`} />
      <CovRow icon="book" label="Тексты и диалоги" learned={KPI.texts.learned} total={KPI.texts.total} color={GROUP_HUE.r} />
    </Card>
  );
}

/* two standing-stat tiles */
function StatTiles() {
  const Tile = ({ icon, color, soft, value, label, sub }) => (
    <Card pad={14} style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n={icon} s={17} c={color} sw={1.9} />
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, color: RC.ink }}>{value}</span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 9 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: RC.faint, marginTop: 1 }}>{sub}</div>
    </Card>
  );
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Tile icon="flame" color="#D8743A" soft="#F7EAE0" value={KPI.streak.cur} label="Серия дней" sub={`рекорд ${KPI.streak.record}`} />
      <Tile icon="target" color={RC.green} soft="#E6F1EA" value={`${KPI.accuracy.pct}%`} label="Точность" sub={`${KPI.accuracy.correct} из ${KPI.accuracy.total}`} />
    </div>
  );
}

/* weak-link callout + per-mode balance & accuracy */
function ModeRow({ m }) {
  const hue = GROUP_HUE[m.group];
  const accTone = m.acc >= 80 ? RC.green : m.acc >= 50 ? RC.amber : RC.red;
  const weak = m === WEAKEST;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <Icon n={m.icon} s={16} c={hue} sw={1.8} style={{ flex: '0 0 auto' }} />
      <span style={{ fontSize: 13, fontWeight: 700, width: 78, flex: '0 0 auto', color: weak ? RC.redDeep : RC.ink }}>{m.label}</span>
      <div style={{ flex: 1 }}><Bar value={m.m} color={weak ? RC.red : hue} h={6} /></div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: accTone, width: 34, textAlign: 'right', flex: '0 0 auto' }}>{m.acc}%</span>
    </div>
  );
}

function Practice() {
  const groups = ['w', 's', 'r'];
  return (
    <Card pad={0}>
      {/* weak-link banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px',
        background: '#FBF0EC', borderBottom: `1px solid ${RC.line}`, borderRadius: '18px 18px 0 0' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', border: `1px solid ${READ_LINE}`, flex: '0 0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n={WEAKEST.icon} s={21} c={RC.redDeep} sw={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: RC.redDeep, textTransform: 'uppercase' }}>Слабее всего</div>
          <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 2 }}>{WEAKEST.label} · {GROUP_LBL[WEAKEST.group].toLowerCase()}</div>
        </div>
        <button style={{ border: 'none', background: RC.redDeep, color: '#fff', borderRadius: 999, padding: '9px 15px',
          fontFamily: FONT, fontSize: 13, fontWeight: 800, cursor: 'pointer', flex: '0 0 auto' }}>Тренировать</button>
      </div>
      {/* per-mode rows grouped */}
      <div style={{ padding: '6px 16px 12px' }}>
        {groups.map((g, gi) => (
          <div key={g} style={{ paddingTop: gi ? 10 : 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: GROUP_HUE[g] }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.03em', color: RC.sub }}>{GROUP_LBL[g]}</span>
            </div>
            {MODES.filter(m => m.group === g).map((m, i) => <ModeRow key={i} m={m} />)}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 8, fontSize: 10.5, fontWeight: 700, color: RC.faint }}>
          <span>полоса — освоено</span><span>% — точность</span>
        </div>
      </div>
    </Card>
  );
}

function MetricsScreen() {
  return (
    <Frame nav="grid">
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '6px 2px 14px' }}>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Метрики</h1>
          <span style={{ fontSize: 13, fontWeight: 600, color: RC.sub }}>обзор сейчас</span>
        </div>
        <Hero />
        <SecLabel>Сегодня</SecLabel>
        <Today />
        <SecLabel>Что я знаю</SecLabel>
        <Coverage />
        <div style={{ marginTop: 12 }}><StatTiles /></div>
        <SecLabel>Что подтянуть</SecLabel>
        <Practice />
        <div style={{ height: 6 }} />
      </div>
    </Frame>
  );
}

Object.assign(window, { MetricsScreen, Card, SecLabel });
