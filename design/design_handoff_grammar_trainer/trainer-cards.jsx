/* trainer-cards.jsx — the interactive grammar-exercise cards for the trainer,
   the 10-card session data (all six item types, weighted toward weak topics),
   and the typed-answer grading. Reuses gram-kit primitives (GIcon, GExplain,
   Hl, GTag, MasteryRing) declared globally by gram-kit.jsx. */

/* ---------- grading ---------- */
const trNorm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
function trLev(a, b) {
  a = trNorm(a); b = trNorm(b);
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
}
/* exact → ok; off by 1 (or 2 for long phrases) → near; else → no */
function trGrade(input, answer) {
  if (trNorm(input) === trNorm(answer)) return "ok";
  const dist = trLev(input, answer);
  const tol = trNorm(answer).length >= 9 ? 2 : 1;
  if (dist > 0 && dist <= tol) return "near";
  return "no";
}

/* ---------- caret-aware ä/ö quick keys (operate on the focused input) ---------- */
function insertAtCaret(el, ch) {
  if (!el) return;
  const s = el.selectionStart ?? el.value.length;
  const e = el.selectionEnd ?? s;
  el.value = el.value.slice(0, s) + ch + el.value.slice(e);
  const p = s + ch.length;
  try { el.setSelectionRange(p, p); } catch (_) {}
  el.focus();
}
function TrQuickKeys({ activeRef, letters = ["ä", "ö"] }) {
  return (
    <div className="gkeys" style={{ marginTop: "0.7rem" }}>
      {letters.map((l) => (
        <button key={l} type="button" className="gkey" lang="fi"
          onMouseDown={(e) => { e.preventDefault(); insertAtCaret(activeRef.current, l); }}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ---------- the session: 10 cards, all six types, weak topics weighted ---------- */
/* topics carry a `weak` flag + mastery for the intro preview & summary. */
const TR_SESSION = [
  {
    type: "transform", topic: "Отрицание", weak: true, tag: ["neg", "отрицание"],
    promptFi: "Puhun suomea", instruction: "сделайте отрицание",
    answer: "En puhu suomea",
    canon: <>En <Hl>puhu</Hl> suomea</>,
    ok: <>Верно! <span className="fi">en</span> + коннегатив <span className="fi">puhu</span>.</>,
    near: <>Почти! После <span className="fi">en</span> глагол теряет окончание <span className="fi">-n</span>: puhu.</>,
    no: <>Для «я» отрицание — <span className="fi">en</span> + форма без окончания: <span className="fi">En puhu suomea</span>.</>,
  },
  {
    type: "choose_form", topic: "Тип глагола 1", weak: false, tag: ["verbtype", "тип 1"],
    pre: "Hän ", post: " Helsingissä.", hint: "Выберите форму глагола asua",
    options: ["asuu", "asut", "asua", "asuvat"], answer: "asuu",
    ok: <>Верно! Hän — третье лицо: основа asu- + длинная гласная → <span className="fi">asuu</span>.</>,
    correct: <>Правильный ответ: <span className="fi">asuu</span>.</>,
    why: {
      asuvat: <><span className="fi">-vat</span> — окончание для he (они), а hän — один человек.</>,
      asut: <><span className="fi">-t</span> — окончание для sinä.</>,
      asua: <>Это словарная форма, не личная.</>,
    },
  },
  {
    type: "case_id", topic: "Падежи -ssa/-sta", weak: false, tag: ["case", "падеж"],
    fi: <>Asun Helsingi<Hl>ssä</Hl></>, q: "— какой это падеж?",
    options: ["инессив (где?)", "элатив (откуда?)", "иллатив (куда?)"], answer: "инессив (где?)",
    ok: <>Верно! <span className="fi">-ssa/-ssä</span> отвечает на вопрос «где?».</>,
    correct: <>Правильный ответ — инессив: <span className="fi">-ssa/-ssä</span> = «где?».</>,
    why: {
      "элатив (откуда?)": <>Элатив — это <span className="fi">-sta/-stä</span>, «откуда?».</>,
      "иллатив (куда?)": <>Иллатив отвечает на «куда?»: <span className="fi">Helsinkiin</span>.</>,
    },
  },
  {
    type: "produce_form", topic: "Тип глагола 1", weak: false, tag: ["grad", "чередование"],
    promptFi: "nukkua", arrow: "→ hän", hint: "настоящее время",
    answer: "nukkuu",
    canon: <>nu<Hl alt>kk</Hl><Hl>uu</Hl></>,
    ok: <>Верно! Сильная ступень <span className="fi">kk</span> — в форме hän.</>,
    near: <>Почти! У hän — сильная ступень <span className="fi">kk</span> и длинная гласная.</>,
    no: <>Для hän: основа + длинная гласная, сильная ступень → <span className="fi">nukkuu</span>.</>,
  },
  {
    type: "classify", topic: "Тип глагола 2 и 3", weak: true, tag: ["verbtype", "тип 2–3"],
    fi: "opiskella", q: "— какой это тип глагола?",
    options: [1, 2, 3, 4, 5, 6], answer: 3,
    ok: <>Верно! Глаголы на <span className="fi">-lla/-llä</span> — тип 3: opiskella, mennä.</>,
    no: <>Тип 3 — основа на <span className="fi">-lla/-llä, -nna, -sta</span>. <span className="fi">opiskella</span> → тип 3.</>,
  },
  {
    type: "transform", topic: "Отрицание", weak: true, tag: ["neg", "отрицание"],
    promptFi: "Syön leipää", instruction: "сделайте отрицание",
    answer: "En syö leipää",
    canon: <>En <Hl>syö</Hl> leipää</>,
    ok: <>Верно! <span className="fi">en</span> + коннегатив <span className="fi">syö</span>.</>,
    near: <>Почти! После <span className="fi">en</span> — форма без <span className="fi">-n</span>: syö.</>,
    no: <>Для «я»: <span className="fi">En syö leipää</span>. syön → syö.</>,
  },
  {
    type: "choose_form", topic: "Тип глагола 2 и 3", weak: true, tag: ["verbtype", "тип 3"],
    pre: "Me ", post: " suomea.", hint: "Выберите форму глагола opiskella",
    options: ["opiskelemme", "opiskelen", "opiskelevat", "opiskella"], answer: "opiskelemme",
    ok: <>Верно! me → основа opiskele- + <span className="fi">-mme</span> → <span className="fi">opiskelemme</span>.</>,
    correct: <>Правильный ответ: <span className="fi">opiskelemme</span>.</>,
    why: {
      opiskelevat: <><span className="fi">-vat</span> для he (они), а «мы» → <span className="fi">-mme</span>.</>,
      opiskelen: <><span className="fi">-n</span> — окончание для minä.</>,
      opiskella: <>Это словарная форма.</>,
    },
  },
  {
    type: "case_id", topic: "Падежи -ssa/-sta", weak: false, tag: ["case", "падеж"],
    fi: <>Tulen koulu<Hl>sta</Hl></>, q: "— какой это падеж?",
    options: ["инессив (где?)", "элатив (откуда?)", "иллатив (куда?)"], answer: "элатив (откуда?)",
    ok: <>Верно! <span className="fi">-sta/-stä</span> — элатив, «откуда?».</>,
    correct: <>Правильный ответ — элатив: <span className="fi">-sta/-stä</span> = «откуда?».</>,
    why: {
      "инессив (где?)": <>Инессив — это <span className="fi">-ssa/-ssä</span>, «где?».</>,
      "иллатив (куда?)": <>Иллатив отвечает на «куда?».</>,
    },
  },
  {
    type: "produce_form", topic: "Тип глагола 2 и 3", weak: true, tag: ["verbtype", "тип 3"],
    promptFi: "mennä", arrow: "→ minä", hint: "настоящее время",
    answer: "menen",
    canon: <>men<Hl>en</Hl></>,
    ok: <>Верно! mennä → основа mene- + <span className="fi">-n</span> → <span className="fi">menen</span>.</>,
    near: <>Почти! minä → основа mene- + окончание <span className="fi">-n</span>: menen.</>,
    no: <>Тип 3: основа mene- + <span className="fi">-n</span> → <span className="fi">menen</span>.</>,
  },
  {
    type: "fill_table", topic: "Тип глагола 1", weak: false, tag: ["verbtype", "тип 1"],
    promptFi: "asua", hint: "заполните формы · настоящее время",
    persons: ["minä", "sinä", "hän", "me", "te", "he"],
    answers: ["asun", "asut", "asuu", "asumme", "asutte", "asuvat"],
  },
];

/* number of cards graded correct → for the score line */
const TR_TOTAL = TR_SESSION.length;

/* ---------- the card top: concept tag + "Уже знаю" skip ---------- */
function TrCardHead({ ex, onKnow, disabled }) {
  return (
    <div className="tr-card-topwrap">
      <span className="gtags"><GTag kind={ex.tag[0]}>{ex.tag[1]}</GTag></span>
      {!disabled && (
        <button type="button" className="tr-skip" onClick={onKnow}>
          <GIcon name="check" size={13} strokeWidth={2.4} /> Уже знаю
        </button>
      )}
    </div>
  );
}

/* ---------- the interactive exercise card ----------
   Renders the scroll region (card + feedback) and the pinned footer button.
   Calls onResolve({ correct }) when the learner finishes the card. */
function TrainerCard({ ex, onResolve }) {
  const [picked, setPicked] = React.useState(null);   // choice types
  const [graded, setGraded] = React.useState(null);    // typed: 'ok'|'near'|'no'
  const [cells, setCells] = React.useState(null);      // fill_table: array of 'ok'|'no'
  const inputRef = React.useRef(null);
  const cellRefs = React.useRef([]);
  const activeRef = React.useRef(null);                // focused field for ä/ö keys

  const isChoice = ex.type === "classify" || ex.type === "choose_form" || ex.type === "case_id";
  const isTyped = ex.type === "produce_form" || ex.type === "transform";
  const isFill = ex.type === "fill_table";

  const answered = picked !== null || graded !== null || cells !== null;

  // resolve correctness once and report up when advancing
  const correct =
    isChoice ? picked === ex.answer :
    isTyped ? graded === "ok" :
    isFill ? cells && cells.every((c) => c === "ok") :
    false;

  const know = () => { onResolve({ correct: true, known: true }); };
  const advance = () => { onResolve({ correct }); };

  const checkTyped = () => setGraded(trGrade(inputRef.current.value, ex.answer));
  const checkFill = () =>
    setCells(ex.answers.map((a, i) => (trNorm(cellRefs.current[i]?.value) === trNorm(a) ? "ok" : "no")));

  /* ----- choice options ----- */
  const renderChoice = () => {
    const optState = (o) => {
      if (picked === null) return "";
      if (o === ex.answer) return " option--correct";
      if (o === picked) return " option--wrong";
      return " option--muted";
    };
    if (ex.type === "classify") {
      return (
        <>
          <p className="gprompt"><span className="fi" lang="fi">{ex.fi}</span> {ex.q}</p>
          <div className="options options--chips">
            {ex.options.map((n) => (
              <button key={n} type="button" lang="fi"
                className={"option option--chip" + optState(n)}
                disabled={picked !== null} onClick={() => setPicked(n)}>
                Тип {n}
              </button>
            ))}
          </div>
        </>
      );
    }
    if (ex.type === "choose_form") {
      return (
        <>
          <p className="gprompt" lang="fi">
            {ex.pre}
            {picked === ex.answer
              ? <span className="gfill-in">{ex.answer}</span>
              : <span className="gblank"></span>}
            {ex.post}
            <span className="gprompt__hint" lang="ru">{ex.hint}</span>
          </p>
          <div className="options">
            {ex.options.map((w) => (
              <button key={w} type="button" lang="fi"
                className={"option" + optState(w)}
                disabled={picked !== null} onClick={() => setPicked(w)}>
                {w}
                {picked === w && w !== ex.answer && ex.why[w] && (
                  <span className="option__why" lang="ru">{ex.why[w]}</span>
                )}
              </button>
            ))}
          </div>
        </>
      );
    }
    // case_id
    return (
      <>
        <p className="gprompt"><span className="fi" lang="fi">{ex.fi}</span> {ex.q}</p>
        <div className="options">
          {ex.options.map((o) => (
            <button key={o} type="button"
              className={"option" + optState(o)}
              disabled={picked !== null} onClick={() => setPicked(o)}>
              {o}
              {picked === o && o !== ex.answer && ex.why[o] && (
                <span className="option__why">{ex.why[o]}</span>
              )}
            </button>
          ))}
        </div>
      </>
    );
  };

  /* ----- typed (produce_form / transform) ----- */
  const renderTyped = () => {
    const cls = graded ? " ginput--" + graded : "";
    return (
      <>
        {ex.type === "produce_form" ? (
          <p className="gprompt"><span className="fi" lang="fi">{ex.promptFi}</span> {ex.arrow}
            <span className="gprompt__hint">{ex.hint}</span>
          </p>
        ) : (
          <p className="gprompt"><span className="fi" lang="fi">{ex.promptFi}</span> → {ex.instruction}</p>
        )}
        <div className="produce">
          <input ref={inputRef} className={"produce__input" + cls} type="text" lang="fi"
            placeholder={ex.type === "transform" ? "Введите фразу…" : "Введите форму…"}
            disabled={graded !== null} autoComplete="off" autoCapitalize="off" spellCheck="false"
            onFocus={(e) => { activeRef.current = e.target; }}
            onKeyDown={(e) => { if (e.key === "Enter" && graded === null) checkTyped(); }} />
          {graded === null && <TrQuickKeys activeRef={activeRef} />}
        </div>
      </>
    );
  };

  /* ----- fill_table ----- */
  const renderFill = () => (
    <>
      <p className="gprompt"><span className="fi" lang="fi">{ex.promptFi}</span> — заполните формы
        <span className="gprompt__hint">{ex.hint}</span>
      </p>
      <div className="gfills">
        {ex.persons.map((p, i) => {
          const st = cells ? " ginput--" + cells[i] : "";
          return (
            <React.Fragment key={p}>
              <div className="gfill">
                <span className="gfill__p" lang="fi">{p}</span>
                <input ref={(el) => (cellRefs.current[i] = el)}
                  className={"gfill__in" + st} type="text" lang="fi" placeholder="…"
                  disabled={cells !== null} autoComplete="off" autoCapitalize="off" spellCheck="false"
                  onFocus={(e) => { activeRef.current = e.target; }} />
              </div>
              {cells && cells[i] === "no" && (
                <div className="gfill"><span></span><span className="gfill__fix" lang="fi">→ {ex.answers[i]}</span></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {cells === null && <TrQuickKeys activeRef={activeRef} />}
    </>
  );

  /* ----- feedback block ----- */
  const feedback = () => {
    if (isChoice && picked !== null) {
      if (correct) return <div style={{ marginTop: "0.85rem" }}><GExplain tone="ok">{ex.ok}</GExplain></div>;
      // classify has no inline why → explain inline; choose_form/case_id show the
      // why under the picked option already, so only restate the correct answer.
      return (
        <div style={{ marginTop: "0.85rem" }}>
          {ex.type === "classify"
            ? <GExplain tone="no">{ex.no}</GExplain>
            : <GExplain tone="ok">{ex.correct}</GExplain>}
        </div>
      );
    }
    if (isTyped && graded) {
      if (graded === "ok") return <div style={{ marginTop: "0.85rem" }}><GExplain tone="ok">{ex.ok}</GExplain></div>;
      return (
        <div style={{ marginTop: "0.85rem", display: "grid", gap: 7 }}>
          <GExplain tone={graded}>{graded === "near" ? ex.near : ex.no}</GExplain>
          <div className="gcanon"><span className="gcanon__k">Верно</span><span className="gcanon__v" lang="fi">{ex.canon}</span></div>
        </div>
      );
    }
    if (isFill && cells) {
      const n = cells.filter((c) => c === "ok").length;
      return (
        <div style={{ marginTop: "0.9rem" }}>
          <GExplain tone={n === 6 ? "ok" : n >= 4 ? "near" : "no"}>
            {n} из 6 верно.{n < 6 ? " Правильные формы показаны справа." : " Все формы верны!"}
          </GExplain>
        </div>
      );
    }
    return null;
  };

  /* ----- footer button ----- */
  let footer;
  if (answered) {
    footer = <button type="button" className="gnext" onClick={advance}>Дальше</button>;
  } else if (isChoice) {
    footer = <button type="button" className="gnext gnext--ghost" disabled style={{ opacity: 0.55 }}>Выберите вариант</button>;
  } else {
    footer = <button type="button" className="gnext" onClick={isFill ? checkFill : checkTyped}>Проверить</button>;
  }

  return (
    <>
      <div className="tr-scroll">
        <section className="card gcard">
          <TrCardHead ex={ex} onKnow={know} disabled={answered} />
          {isChoice && renderChoice()}
          {isTyped && renderTyped()}
          {isFill && renderFill()}
          {feedback()}
        </section>
      </div>
      {footer}
    </>
  );
}

Object.assign(window, { TR_SESSION, TR_TOTAL, TrainerCard, trGrade });
