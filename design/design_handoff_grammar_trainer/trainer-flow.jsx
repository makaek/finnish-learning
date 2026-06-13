/* trainer-flow.jsx — the «Грамматика · тренажёр» session flow: intro → 10-card
   session → summary. Launched from the home CTA or the grammar-tab banner; on
   exit it returns to wherever it was opened. Decoupled from level progress.
   Uses gram-kit globals + trainer-cards.jsx (TR_SESSION, TR_TOTAL, TrainerCard). */

/* topics the trainer draws weak / least-recently-seen items from (intro preview) */
const TR_FOCUS = [
  { name: "Отрицание", pct: 35, low: true },
  { name: "Тип глагола 2 и 3", pct: 60, low: true },
  { name: "Падежи -ssa/-sta", pct: 100, low: false },
];

const TYPE_LABEL = {
  classify: "выбор типа", choose_form: "выбор формы", case_id: "определение падежа",
  produce_form: "ввод формы", transform: "трансформация", fill_table: "таблица форм",
};

/* topic → rule id, so the summary's "повторите" rows can deep-link to a rule */
const TOPIC_RULE = {
  "Отрицание": "neg",
  "Тип глагола 1": "t1",
  "Тип глагола 2 и 3": "t23",
  "Падежи -ssa/-sta": "ssa",
};

function TrBadge({ text, muted }) {
  return (
    <span className={"tr-badge" + (muted ? " tr-badge--muted" : "")}>
      <GIcon name="refresh" size={13} strokeWidth={2.1} /> {text}
    </span>
  );
}

function TrFocusCard() {
  return (
    <div className="tr-focus">
      <div className="tr-focus__h"><GIcon name="bolt" size={13} strokeWidth={2.2} /> В фокусе сессии</div>
      <div className="tr-fchips">
        {TR_FOCUS.map((f) => (
          <span key={f.name} className="tr-fchip">
            {f.name}
            <span className={"tr-fchip__pct" + (f.low ? " tr-fchip__pct--low" : "")}>{f.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── intro (card-centric, Option A) ── */
function TrainerIntro({ badge, onStart, onBack }) {
  return (
    <div className="gram-phone" data-screen-label="Тренажёр — вступление">
      <div className="tr-introtop">
        <button type="button" className="gexit" aria-label="Назад" onClick={onBack}><GIcon name="back" size={17} /></button>
      </div>
      <div className="tr-intro">
        <div className="tr-herocard">
          <span className="tr-disc" aria-hidden="true"><GIcon name="pen" size={28} /></span>
          <span className="tr-kicker">Грамматика</span>
          <h1 className="tr-title">Тренажёр</h1>
          <p className="tr-sub">Свободное повторение пройденных тем. Подбираем слабые и давно не повторённые задания — уровень и прогресс не меняются.</p>
          <div className="tr-metarow">
            <span className="tr-meta"><GIcon name="grid" size={14} /> 10 заданий</span>
            <span className="tr-meta"><GIcon name="target" size={14} /> ~6 мин</span>
          </div>
          <div style={{ marginTop: 12 }}><TrBadge text={badge} /></div>
        </div>
        <TrFocusCard />
        <div className="gram-spacer"></div>
        <button type="button" className="gnext" onClick={onStart}>Начать</button>
      </div>
    </div>
  );
}

/* ── session engine ── */
function TrainerSession({ onExit, onFinish }) {
  const [idx, setIdx] = React.useState(0);
  const results = React.useRef([]);
  const ex = TR_SESSION[idx];

  const resolve = (res) => {
    results.current[idx] = res;
    if (idx + 1 >= TR_TOTAL) onFinish(results.current.slice());
    else setIdx(idx + 1);
  };

  return (
    <div className="gram-phone" data-screen-label={"Тренажёр — задание " + (idx + 1)}>
      <div className="tr-top">
        <div className="tr-toprow">
          <button type="button" className="gexit" aria-label="Выйти" onClick={onExit}><GIcon name="x" size={15} strokeWidth={2.2} /></button>
          <div className="tr-mid">
            <div className="tr-eyebrow">Грамматика · тренажёр</div>
            <div className="tr-stage">{ex.topic}</div>
          </div>
          <span className="tr-count">{idx + 1} / {TR_TOTAL}</span>
        </div>
        <div className="tr-prog"><div className="tr-prog__fill" style={{ width: (idx / TR_TOTAL) * 100 + "%" }}></div></div>
      </div>
      <TrainerCard key={idx} ex={ex} onResolve={resolve} />
    </div>
  );
}

/* ── summary (no level / unlock rewards; review rows deep-link to rules) ── */
function TrainerSummary({ results, badge, onAgain, onDone, onOpenRule }) {
  const score = results.filter((r) => r.correct).length;
  const title = score >= 9 ? "Отлично!" : score >= 7 ? "Хорошо!" : score >= 5 ? "Неплохо" : "Есть над чем поработать";

  const byTopic = {};
  results.forEach((r, i) => {
    const t = TR_SESSION[i].topic;
    (byTopic[t] = byTopic[t] || { total: 0, correct: 0 }).total++;
    if (r.correct) byTopic[t].correct++;
  });
  const review = Object.entries(byTopic)
    .filter(([, v]) => v.correct < v.total)
    .map(([name, v]) => ({ name, acc: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.acc - b.acc);
  const accCls = (a) => (a >= 80 ? "green" : a >= 50 ? "amber" : "red");

  return (
    <div className="gram-phone" data-screen-label="Тренажёр — итог">
      <div className="gram-spacer"></div>
      <div className="gsum">
        <span className="tr-disc" aria-hidden="true" style={{ width: 72, height: 72, borderRadius: 24 }}>
          <GIcon name="check" size={34} strokeWidth={2.2} />
        </span>
        <h2 className="gsum__title" style={{ marginTop: "0.8rem" }}>{title}</h2>
        <div className="gsum__sub">Тренировка завершена</div>
        <div className="gsum__score">{score}<small>/{TR_TOTAL}</small></div>
        <div style={{ marginTop: 10 }}><TrBadge text={badge} /></div>
      </div>

      <div className="gsumcard">
        <div className="gsumcard__t">{review.length ? "Повторите · откройте правило" : "Результат"}</div>
        {review.length ? (
          <div className="tr-rev">
            {review.map((r) => (
              <button type="button" key={r.name} className="tr-revrow tr-revrow--btn"
                onClick={() => onOpenRule && onOpenRule(TOPIC_RULE[r.name])} disabled={!TOPIC_RULE[r.name]}>
                <span className="tr-revrow__ic" aria-hidden="true"><GIcon name="rules" size={15} /></span>
                <span className="tr-revrow__name">{r.name}</span>
                <span className={"tr-revrow__acc tr-acc--" + accCls(r.acc)}>{r.acc}%</span>
                {TOPIC_RULE[r.name] && <span className="tr-revrow__go" aria-hidden="true"><GIcon name="chevR" size={16} /></span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="tr-allgood"><GIcon name="check" size={18} strokeWidth={2.4} /> Все темы без ошибок — отличная форма!</div>
        )}
      </div>

      <div className="tr-note"><GIcon name="info" size={14} /> Это тренировка — уровень и прогресс не изменились.</div>

      <div className="gram-spacer"></div>
      <div className="gbtnrow">
        <button type="button" className="gnext gnext--ghost" onClick={onAgain}>Ещё раз</button>
        <button type="button" className="gnext" onClick={onDone}>Готово</button>
      </div>
    </div>
  );
}

/* ── flow wrapper: intro → session → summary, returns via onExit ── */
function TrainerFlow({ badge, onExit, onOpenRule }) {
  const [phase, setPhase] = React.useState("intro");
  const [results, setResults] = React.useState(null);

  if (phase === "session") {
    return <TrainerSession onExit={onExit}
      onFinish={(r) => { setResults(r); setPhase("summary"); }} />;
  }
  if (phase === "summary") {
    return <TrainerSummary results={results} badge={badge} onOpenRule={onOpenRule}
      onAgain={() => { setResults(null); setPhase("session"); }}
      onDone={onExit} />;
  }
  return <TrainerIntro badge={badge} onStart={() => setPhase("session")} onBack={onExit} />;
}

Object.assign(window, {
  TR_FOCUS, TYPE_LABEL, TOPIC_RULE, TrBadge, TrFocusCard,
  TrainerIntro, TrainerSession, TrainerSummary, TrainerFlow,
});
