/* reading.jsx — Direction B «Диалог», expanded into the full Чтение flow with
   the two-part mastery model. Mastery («Прочитано») = ОТВЕТЫ НА ВОПРОСЫ ✓ +
   НАИЗУСТЬ ЗА ВСЕ РОЛИ ✓. Every screen makes that path visible.
   Exports: LibR, ReaderR, QuizR, QuizDoneR, RolesR, ReciteR, MasteredR. */

const SPK = { Pekka: RC.gSent, Liisa: RC.gWords, Рассказчик: RC.sub };

/* ru plural for "реплика" */
const plReplika = (n) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return n + ' реплика';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return n + ' реплики';
  return n + ' реплик';
};

function av(letter, color, size = 32) {
  return (
    <div style={{ width: size, height: size, flex: '0 0 auto', borderRadius: 999, background: '#fff',
      border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 800, color }}>{letter}</div>
  );
}

/* chat header shared by reader / quiz / recite */
function ChatHead({ title, sub, mastered, right }) {
  return (
    <div style={{ flex: '0 0 auto', padding: '6px 16px 12px', borderBottom: `1px solid ${RC.line}`, background: RC.card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <BackBtn label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {mastered && <Icon n="trophy" s={17} c={READ} sw={1.9} />}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: mastered ? READ : RC.sub }}>{sub}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

/* ============================ LIBRARY ============================ */
function MasteryMark({ st }) {
  if (st === 'mastered')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: READ_SOFT,
        border: `1px solid ${READ_LINE}`, borderRadius: 999, padding: '4px 9px 4px 7px' }}>
        <Icon n="trophy" s={15} c={READ} sw={1.9} /><span style={{ fontSize: 11.5, fontWeight: 800, color: READ }}>Прочитано</span>
      </span>
    );
  if (st === 'progress')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: READ }} />
        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff', border: `1.5px solid ${READ_LINE}` }} />
      </span>
    );
  if (st === 'locked') return <Icon n="lock" s={17} c={RC.faint} sw={1.8} />;
  return <Icon n="arrow" s={18} c={READ} sw={2} />;
}

function LibR({ kind }) {
  const list = kind === 'dialog' ? DIALOGS : TEXTS;
  const title = kind === 'dialog' ? 'Диалоги' : 'Тексты';
  const groups = [];
  list.forEach(t => { const g = groups.find(x => x.lv === t.lv); if (g) g.items.push(t); else groups.push({ lv: t.lv, items: [t] }); });
  const mastered = list.filter(t => masteryState(t) === 'mastered').length;
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 18px 0' }}>
        <div style={{ marginBottom: 14 }}><BackBtn label="Главная" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: READ_SOFT, flex: '0 0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n={kind === 'dialog' ? 'masks' : 'book'} s={25} c={READ} sw={1.7} />
          </div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: READ }}>{mastered}<span style={{ fontSize: 13, color: RC.faint }}>/{list.length}</span></div>
            <div style={{ fontSize: 10, fontWeight: 800, color: RC.sub, letterSpacing: '0.04em' }}>ПРОЧИТАНО</div>
          </div>
        </div>
        {/* legend explaining the mastery model */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: RC.card, border: `1px solid ${RC.line}`,
          borderRadius: 12, padding: '8px 12px', margin: '4px 0 14px' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: RC.sub }}>Прочитано =</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: RC.ink }}>
            <Icon n="rules" s={14} c={RC.gSent} sw={1.8} />вопросы</span>
          <span style={{ fontSize: 12, color: RC.faint }}>+</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: RC.ink }}>
            <Icon n="mic" s={14} c={RC.gWords} sw={1.8} />наизусть</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 14 }}>
          {groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 2px 9px' }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: READ }}>УРОВЕНЬ {g.lv}</span>
                <div style={{ flex: 1, height: 1, background: RC.line }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.items.map((t, i) => {
                  const st = masteryState(t);
                  const locked = st === 'locked';
                  const tone = st === 'mastered' ? READ : st === 'progress' ? RC.gWords : RC.faint;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: RC.card,
                      border: `1px solid ${st === 'mastered' ? READ_LINE : RC.line}`, borderRadius: 16, padding: '11px 13px',
                      opacity: locked ? 0.5 : 1, cursor: locked ? 'default' : 'pointer', boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
                      {av(t.title[0], tone, 36)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{t.title}</div>
                        {st === 'progress' && (
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: RC.sub, marginTop: 1 }}>
                            {t.quiz ? 'вопросы ✓ · осталось наизусть' : 'наизусть ✓ · остались вопросы'}
                          </div>
                        )}
                      </div>
                      <MasteryMark st={st} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ============================ READER (hub) ============================ */
function Bubble({ line, kind, side, open }) {
  const color = kind === 'dialog' ? (SPK[line.who] || READ) : READ;
  const right = side === 'right';
  const avl = kind === 'dialog' ? line.who[0] : 'М';
  return (
    <div style={{ display: 'flex', flexDirection: right ? 'row-reverse' : 'row', gap: 9, marginBottom: 14, alignItems: 'flex-end' }}>
      {av(avl, color, 32)}
      <div style={{ maxWidth: 240 }}>
        {kind === 'dialog' && (
          <div style={{ fontSize: 11, fontWeight: 800, color, margin: right ? '0 4px 4px 0' : '0 0 4px 4px', textAlign: right ? 'right' : 'left' }}>{line.who}</div>
        )}
        <div style={{ background: right ? READ_SOFT : RC.card, border: `1px solid ${right ? READ_LINE : RC.line}`,
          borderRadius: 18, borderBottomRightRadius: right ? 5 : 18, borderBottomLeftRadius: right ? 18 : 5,
          padding: '11px 13px', boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <div lang="fi" style={{ fontSize: 16.5, fontWeight: 600, color: RC.ink, lineHeight: 1.32, letterSpacing: '-0.01em' }}>{line.fi}</div>
            <button style={{ width: 26, height: 26, flex: '0 0 auto', marginTop: 1, borderRadius: 8, background: RC.wash, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon n="sound" s={15} c={color} sw={1.8} />
            </button>
          </div>
          {open && (
            <div lang="ru" style={{ fontSize: 13.5, fontWeight: 500, color: RC.sub, marginTop: 7, paddingTop: 7,
              borderTop: `1px solid ${right ? READ_LINE : RC.wash}`, lineHeight: 1.3 }}>{line.ru}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* one of the two mastery tasks, as a tappable card */
function TaskCard({ icon, tone, label, sub, done }) {
  const c = done ? RC.green : tone;
  const soft = done ? '#E7F1EC' : READ_SOFT;
  const line = done ? '#BFE0CE' : READ_LINE;
  return (
    <button style={{ flex: 1, textAlign: 'left', background: soft, border: `1px solid ${line}`, borderRadius: 15,
      padding: '11px 12px', cursor: 'pointer', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', border: `1px solid ${line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n={icon} s={18} c={c} sw={1.8} />
        </div>
        {done
          ? <div style={{ width: 22, height: 22, borderRadius: 999, background: RC.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={13} c="#fff" sw={3} /></div>
          : <Icon n="arrow" s={18} c={c} sw={2.2} />}
      </div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: RC.ink }}>{label}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: done ? RC.green : RC.sub, marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}

function ReaderR({ data, done = { quiz: false, recite: [] } }) {
  const isDialog = data.kind === 'dialog';
  const reciteDone = done.recite.length >= data.roles.length;
  const steps = (done.quiz ? 1 : 0) + (reciteDone ? 1 : 0);
  const mastered = steps === 2;
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatHead title={data.title} sub={mastered ? 'Прочитано · освоено' : `Уровень ${data.lv} · ${isDialog ? 'диалог' : 'текст'}`}
          mastered={mastered}
          right={<>
            <button style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, background: RC.wash, border: `1px solid ${RC.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="eye" s={19} c={RC.sub} sw={1.8} /></button>
            <button style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, background: RC.wash, border: `1px solid ${RC.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="play" s={17} c={RC.sub} sw={2} /></button>
          </>} />
        {/* thread */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 16px 8px', background: RC.cream }}>
          <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: RC.faint, marginBottom: 14 }}>Нажмите на сообщение, чтобы перевести</div>
          {data.lines.map((l, i) => (
            <Bubble key={i} line={l} kind={data.kind} open={i === 1}
              side={isDialog ? (l.who === 'Liisa' ? 'right' : 'left') : 'left'} />
          ))}
        </div>
        {/* PATH TO MASTERY footer */}
        <div style={{ flex: '0 0 auto', padding: '12px 16px 14px', borderTop: `1px solid ${RC.line}`, background: RC.card }}>
          {mastered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#E7F1EC', border: '1px solid #BFE0CE',
              borderRadius: 15, padding: '13px 15px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: RC.green, flex: '0 0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="trophy" s={20} c="#fff" sw={1.9} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: RC.ink }}>Прочитано</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: RC.green }}>оба шага пройдены — диалог освоен</div>
              </div>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: RC.sub,
                display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon n="refresh" s={16} c={RC.sub} sw={1.9} />Повторить</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: RC.ink, whiteSpace: 'nowrap' }}>Путь к «Прочитано»</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1].map(i => <span key={i} style={{ width: 24, height: 5, borderRadius: 999, background: i < steps ? READ : RC.track }} />)}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: RC.sub }}>{steps} / 2</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <TaskCard icon="rules" tone={RC.gSent} label="Вопросы" done={done.quiz}
                  sub={done.quiz ? 'Пройдено' : 'Ответить · 2 вопроса'} />
                <TaskCard icon="mic" tone={RC.gWords} label="Наизусть" done={reciteDone}
                  sub={reciteDone ? 'Все роли' : (isDialog ? `За все роли · ${done.recite.length}/${data.roles.length}` : 'Рассказать')} />
              </div>
            </>
          )}
        </div>
      </div>
    </Frame>
  );
}

/* ============================ QUIZ ============================ */
function QuizR() {
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatHead title="Вопросы" sub={`Который час? · ${QUIZ.idx} из ${QUIZ.total}`}
          right={<div style={{ display: 'flex', gap: 5 }}>{Array.from({ length: QUIZ.total }).map((_, i) =>
            <span key={i} style={{ width: 22, height: 5, borderRadius: 999, background: i < QUIZ.idx ? RC.gSent : RC.track }} />)}</div>} />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 16px', background: RC.cream }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end', marginBottom: 8 }}>
            {av('?', RC.gSent, 32)}
            <div style={{ maxWidth: 250 }}>
              <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, borderBottomLeftRadius: 5,
                padding: '13px 15px', boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div lang="fi" style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{QUIZ.q}</div>
                  <button style={{ width: 28, height: 28, flex: '0 0 auto', borderRadius: 8, background: RC.wash, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="sound" s={16} c={RC.gSent} sw={1.8} /></button>
                </div>
              </div>
              <button style={{ marginTop: 7, marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: RC.sub }}><Icon n="eye" s={15} c={RC.sub} sw={1.8} />перевод вопроса</button>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: RC.faint, marginTop: 18 }}>Ответьте по-фински — напечатайте или скажите</div>
        </div>
        <div style={{ flex: '0 0 auto', padding: '10px 14px 16px', borderTop: `1px solid ${RC.line}`, background: RC.card,
          display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <div style={{ flex: 1, background: RC.wash, border: `1px solid ${RC.line}`, borderRadius: 22, padding: '12px 16px', fontSize: 16, color: RC.faint, minHeight: 24 }}>Kello on…</div>
          <button style={{ width: 48, height: 48, flex: '0 0 auto', borderRadius: 999, background: RC.card, border: `1px solid ${READ_LINE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="mic" s={22} c={READ} sw={1.8} /></button>
          <button style={{ width: 48, height: 48, flex: '0 0 auto', borderRadius: 999, background: RC.gSent, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 6px 16px rgba(27,142,132,0.28)' }}><Icon n="arrow" s={22} c="#fff" sw={2.4} /></button>
        </div>
      </div>
    </Frame>
  );
}

/* quiz finished — 1 of 2 steps done, nudge to recite */
function QuizDoneR() {
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 18px 0' }}>
        <div style={{ marginBottom: 14 }}><BackBtn label="К диалогу" /></div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: 999, background: '#E7F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="check" s={38} c={RC.green} sw={2.6} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 16 }}>Вопросы пройдены</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: RC.sub, marginTop: 4 }}>Правильно 2 из 2 · отлично</div>
          </div>
          {/* mastery progress */}
          <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, padding: 16, marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>Путь к «Прочитано»</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: READ }}>1 / 2</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0' }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: RC.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon n="check" s={16} c="#fff" sw={3} /></div>
              <div style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>Ответы на вопросы</div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: RC.green }}>Готово</span>
            </div>
            <div style={{ height: 1, background: RC.wash }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0 2px' }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: READ_SOFT, border: `1px solid ${READ_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon n="mic" s={16} c={READ} sw={1.9} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>Наизусть — за все роли</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: RC.sub }}>осталось рассказать</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', padding: '0 0 16px' }}>
          <button style={{ width: '100%', background: READ, border: 'none', borderRadius: 16, padding: '16px', cursor: 'pointer', fontFamily: FONT,
            fontSize: 16.5, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(187,106,57,0.28)' }}><Icon n="mic" s={19} c="#fff" sw={1.9} />Рассказать наизусть</button>
          <button style={{ width: '100%', marginTop: 9, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT,
            fontSize: 14, fontWeight: 700, color: RC.sub, padding: '6px' }}>Позже</button>
        </div>
      </div>
    </Frame>
  );
}

/* ============================ RECITE — ЗА ВСЕ РОЛИ ============================ */
function RolesR({ data, recited = [] }) {
  const isMono = data.roles.length === 1;
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 18px 0' }}>
        <div style={{ marginBottom: 14 }}><BackBtn label="К диалогу" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: READ_SOFT, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="mic" s={24} c={READ} sw={1.7} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Наизусть</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: READ }}>{isMono ? 'расскажите текст по памяти' : 'за все роли'}</div>
          </div>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: RC.sub, lineHeight: 1.4, margin: '6px 2px 16px' }}>
          {isMono ? 'Произнесите каждую реплику по памяти — приложение слушает.'
            : 'Чтобы освоить диалог, расскажите его наизусть в каждой роли. Можно в любом порядке.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.roles.map((r, i) => {
            const ok = recited.includes(r);
            return (
              <button key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: RC.card,
                border: `1px solid ${ok ? '#BFE0CE' : READ_LINE}`, borderRadius: 16, padding: '14px 15px', cursor: 'pointer', fontFamily: FONT }}>
                {av(isMono ? 'Я' : r[0], ok ? RC.green : (SPK[r] || READ), 38)}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: RC.ink }}>{isMono ? 'Рассказать целиком' : `Роль · ${r}`}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: ok ? RC.green : RC.sub }}>{ok ? 'рассказано' : plReplika(data.lines.filter(l => isMono || l.who === r).length)}</div>
                </div>
                {ok
                  ? <div style={{ width: 26, height: 26, borderRadius: 999, background: RC.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={15} c="#fff" sw={3} /></div>
                  : <div style={{ width: 32, height: 32, borderRadius: 999, background: READ, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="play" s={15} c="#fff" sw={2.4} /></div>}
              </button>
            );
          })}
        </div>
        {!isMono && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '11px 14px', background: READ_SOFT, borderRadius: 13 }}>
            <Icon n="trophy" s={18} c={READ} sw={1.8} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: RC.ink }}>«Наизусть» зачтётся, когда пройдёте <b>все роли</b>.</span>
          </div>
        )}
      </div>
    </Frame>
  );
}

function ReciteR() {
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatHead title={`Наизусть · роль ${PLAY.role}`} sub={`Реплика ${PLAY.idx} из ${PLAY.total}`}
          right={<button style={{ width: 36, height: 36, borderRadius: 10, background: RC.wash, border: `1px solid ${RC.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="pause" s={17} c={RC.ink} sw={1.5} /></button>} />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 16px', background: RC.cream, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end', marginBottom: 16 }}>
            {av('М', RC.sub, 32)}
            <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, borderBottomLeftRadius: 5, padding: '12px 14px', maxWidth: 250, boxShadow: '0 1px 2px rgba(40,30,20,0.03)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: RC.sub, marginBottom: 5 }}>ВАША РЕПЛИКА</div>
              <div lang="ru" style={{ fontSize: 16.5, fontWeight: 600, color: RC.ink, lineHeight: 1.32 }}>«{PLAY.ru}»</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 9, alignItems: 'flex-end' }}>
            {av('Я', READ, 32)}
            <div style={{ background: READ_SOFT, border: `1px dashed ${READ_LINE}`, borderRadius: 18, borderBottomRightRadius: 5, padding: '12px 16px', maxWidth: 240, display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 18 }}>
                {[10, 16, 8, 14, 6].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: READ, opacity: 0.85 }} />)}
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: READ }}>Слушаю…</span>
            </div>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', padding: '12px 16px 16px', borderTop: `1px solid ${RC.line}`, background: RC.card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: RC.sub }}><Icon n="eye" s={17} c={RC.sub} sw={1.8} />Показать</button>
            <button style={{ width: 72, height: 72, flex: '0 0 auto', borderRadius: 999, background: READ, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(187,106,57,0.32)' }}><Icon n="mic" s={30} c="#fff" sw={1.8} /></button>
            <button style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: RC.sub }}><Icon n="skip" s={16} c={RC.sub} sw={1.8} />Пропустить</button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ============================ MASTERED («Прочитано!») ============================ */
function MasteredR({ data }) {
  const isDialog = data.kind === 'dialog';
  return (
    <Frame>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 18px 0' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: READ_SOFT }} />
              <div style={{ position: 'absolute', inset: 12, borderRadius: 999, border: `2px solid ${READ_LINE}` }} />
              <div style={{ position: 'relative', width: 66, height: 66, borderRadius: 999, background: READ, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(187,106,57,0.32)' }}>
                <Icon n="trophy" s={32} c="#fff" sw={1.9} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 18 }}>Прочитано!</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: RC.sub, marginTop: 4, maxWidth: 260 }}>
              «{data.title}» освоен — оба шага пройдены.
            </div>
          </div>
          {/* two-part summary, both green */}
          <div style={{ background: RC.card, border: `1px solid ${RC.line}`, borderRadius: 18, padding: '6px 16px', marginTop: 26 }}>
            {[['rules', 'Ответы на вопросы', '2 из 2 верно'], ['mic', isDialog ? 'Наизусть — все роли' : 'Рассказано наизусть', isDialog ? `${data.roles.join(' · ')}` : 'по памяти']].map(([ic, t, s], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i ? `1px solid ${RC.wash}` : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 999, background: RC.green, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" s={18} c="#fff" sw={3} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: RC.sub }}>{s}</div>
                </div>
                <Icon n={ic} s={18} c={RC.faint} sw={1.7} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '0 0 auto', padding: '0 0 16px' }}>
          <button style={{ width: '100%', background: READ, border: 'none', borderRadius: 16, padding: '16px', cursor: 'pointer', fontFamily: FONT,
            fontSize: 16.5, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 6px 16px rgba(187,106,57,0.28)' }}>К списку диалогов</button>
          <button style={{ width: '100%', marginTop: 9, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT,
            fontSize: 14, fontWeight: 700, color: RC.sub, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon n="refresh" s={16} c={RC.sub} sw={1.9} />Повторить позже</button>
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, { LibR, ReaderR, QuizR, QuizDoneR, RolesR, ReciteR, MasteredR });
