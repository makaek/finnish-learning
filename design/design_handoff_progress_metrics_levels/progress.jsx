/* progress.jsx — «Мой прогресс», cleaner per-item drill-down.
   Kept: search, «↕ По уровню» sort, the «❓ Что значат метрики» legend.
   Dropped: hide-mastered (🙈) and the «Скрытые (N)» toggle. */

const HUE_W = GROUP_HUE.w;   // words — purple
const HUE_S = GROUP_HUE.s;   // sentences — teal

function MasterTick() {
  return (
    <span style={{ width: 19, height: 19, borderRadius: 999, background: '#E7F1EC', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon n="check" s={12} c={RC.green} sw={2.6} />
    </span>
  );
}

/* one exercise-track row */
function TrackRow({ tr, hue }) {
  const acc = tr.seen ? Math.round(tr.ok / tr.seen * 100) : 0;
  const done = tr.box >= 5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
      <Icon n={tr.icon} s={15} c={done ? hue : RC.faint} sw={1.8} style={{ flex: '0 0 auto' }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, width: 74, flex: '0 0 auto', color: done ? RC.ink : RC.sub }}>{tr.label}</span>
      <Pips box={tr.box} color={hue} size={7} />
      <span style={{ flex: 1 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 11, fontWeight: 700, color: RC.sub }}>
        {tr.streak > 0 && <span style={{ color: '#C87038' }}>🔥{tr.streak}</span>}
        <span><span style={{ color: acc >= 80 ? RC.green : acc >= 50 ? RC.amber : RC.red }}>{acc}%</span> <span style={{ color: RC.faint }}>{tr.ok}/{tr.seen}</span></span>
      </span>
    </div>
  );
}

function WordCard({ it }) {
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {it.mastered && <MasterTick />}
        <span style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.01em' }}>{it.fi}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: RC.sub }}>— {it.ru}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: RC.sub, background: RC.wash, borderRadius: 7, padding: '3px 7px', flex: '0 0 auto' }}>Ур. {it.lv}</span>
      </div>
      <div style={{ marginTop: 6, borderTop: `1px solid ${RC.wash}`, paddingTop: 3 }}>
        {it.tracks.map((tr, i) => <TrackRow key={i} tr={tr} hue={HUE_W} />)}
      </div>
    </div>
  );
}

function SentCard({ it }) {
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {it.mastered && <div style={{ paddingTop: 1 }}><MasterTick /></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{it.ru}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: RC.sub, marginTop: 1 }}>{it.fi}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: RC.sub, background: RC.wash, borderRadius: 7, padding: '3px 7px', flex: '0 0 auto' }}>Ур. {it.lv}</span>
      </div>
      <div style={{ marginTop: 7, borderTop: `1px solid ${RC.wash}`, paddingTop: 3 }}>
        {it.tracks.map((tr, i) => <TrackRow key={i} tr={tr} hue={HUE_S} />)}
      </div>
    </div>
  );
}

function TextCard({ it }) {
  const started = it.quizSeen > 0;
  const acc = started ? Math.round(it.ok / it.quizSeen * 100) : 0;
  return (
    <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {it.mastered && <MasterTick />}
        <Icon n={it.dialog ? 'masks' : 'book'} s={17} c={READ} sw={1.7} style={{ flex: '0 0 auto' }} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>{it.title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: RC.sub, background: RC.wash, borderRadius: 7, padding: '3px 7px', flex: '0 0 auto' }}>Ур. {it.lv}</span>
      </div>
      {started ? (
        <div style={{ marginTop: 7, borderTop: `1px solid ${RC.wash}`, paddingTop: 3 }}>
          <TrackRow tr={{ label: 'Вопросы', icon: 'rules', box: it.quizBox, streak: it.streak, ok: it.ok, seen: it.quizSeen }} hue={READ} />
        </div>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 600, color: it.read ? READ : RC.faint, marginTop: 5 }}>
          {it.read ? 'Прочитано (без вопросов)' : 'Ещё не пройдено'}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children, defaultOpen }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: '2px 2px 0' }}>
        <Icon n={open ? 'chevD' : 'chevR'} s={18} c={RC.sub} sw={2.4} />
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: RC.faint }}>{count}</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>{children}</div>}
    </div>
  );
}

function Legend({ open, onToggle }) {
  return (
    <div style={{ background: RC.card, border: `1px solid ${open ? TEAL : RC.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: '12px 14px' }}>
        <Icon n="question" s={18} c={TEAL} sw={1.9} />
        <span style={{ fontSize: 13.5, fontWeight: 700, textAlign: 'left', flex: 1 }}>Что значат метрики</span>
        <Icon n={open ? 'chevD' : 'chevR'} s={17} c={RC.sub} sw={2.2} />
      </button>
      {open && (
        <div style={{ padding: '0 14px 13px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: RC.sub, fontWeight: 600 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Pips box={3} color={HUE_W} size={7} /><span>уровень в коробке Лейтнера (0–5). Промах с первой попытки понижает.</span></div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><MasterTick /><span>выучено — коробка дошла до 5 в <b>каждом</b> типе упражнения.</span></div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><span style={{ color: '#C87038', fontWeight: 800 }}>🔥</span><span>серия верных подряд · <b style={{ color: RC.green }}>%</b> точность (верно/всего).</span></div>
        </div>
      )}
    </div>
  );
}

function ProgressScreen() {
  const [q, setQ] = React.useState('');
  const [byLevel, setByLevel] = React.useState(true);
  const [legend, setLegend] = React.useState(false);
  const ql = q.trim().toLowerCase();
  const match = (s) => s.toLowerCase().includes(ql);

  let words = WORDS.filter(it => !ql || match(it.fi) || match(it.ru));
  let sents = SENTENCES.filter(it => !ql || match(it.ru) || match(it.fi));
  let texts = TEXTITEMS.filter(it => !ql || match(it.title));
  if (byLevel) {
    const byLv = (a, b) => a.lv - b.lv;
    words = [...words].sort(byLv); sents = [...sents].sort(byLv); texts = [...texts].sort(byLv);
  }
  const searching = ql.length > 0;

  return (
    <Frame nav="chart">
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', margin: '6px 2px 14px' }}>Мой прогресс</h1>

        <div style={{ marginBottom: 11 }}><Legend open={legend} onToggle={() => setLegend(o => !o)} /></div>

        {/* search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: RC.card, border: `1px solid ${RC.line}`,
          borderRadius: 13, padding: '11px 14px' }}>
          <Icon n="search" s={18} c={RC.faint} sw={1.9} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск слова или предложения"
            style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontFamily: FONT, fontSize: 14.5,
              fontWeight: 600, color: RC.ink }} />
        </div>

        {/* sort chip */}
        <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
          <button onClick={() => setByLevel(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            border: `1px solid ${byLevel ? TEAL : RC.line}`, background: byLevel ? '#E9F2EF' : RC.card, borderRadius: 999,
            padding: '8px 14px', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700,
            color: byLevel ? TEAL : RC.ink }}>
            <Icon n="sort" s={15} c={byLevel ? TEAL : RC.sub} sw={2} />По уровню
          </button>
        </div>

        {(!searching || words.length > 0) &&
          <Section title="Слова" count={searching ? words.length : SECTION_COUNTS.words} defaultOpen={true}>
            {words.map((it, i) => <WordCard key={i} it={it} />)}
          </Section>}
        {(!searching || sents.length > 0) &&
          <Section title="Предложения" count={searching ? sents.length : SECTION_COUNTS.sentences} defaultOpen={true}>
            {sents.map((it, i) => <SentCard key={i} it={it} />)}
          </Section>}
        {(!searching || texts.length > 0) &&
          <Section title="Тексты и диалоги" count={searching ? texts.length : SECTION_COUNTS.texts} defaultOpen={true}>
            {texts.map((it, i) => <TextCard key={i} it={it} />)}
          </Section>}

        {searching && words.length + sents.length + texts.length === 0 && (
          <div style={{ textAlign: 'center', color: RC.faint, fontSize: 13.5, fontWeight: 600, padding: '40px 20px' }}>
            Ничего не найдено по запросу «{q}».
          </div>
        )}
        <div style={{ height: 6 }} />
      </div>
    </Frame>
  );
}

Object.assign(window, { ProgressScreen });
