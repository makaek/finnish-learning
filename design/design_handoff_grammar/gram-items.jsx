/* gram-items.jsx — the six item types, each in its feedback states, plus the
   component board (explanation block, concept tags, mastery, highlights). */

/* ---------- 1 · classify (multiple choice, chips) ---------- */

function ClassifyChips({ states = {}, reasons = {} }) {
  return (
    <div className="options options--chips">
      {[1, 2, 3, 4, 5, 6].map((n) => {
        const st = states[n] ? " option--" + states[n] : "";
        return (
          <button key={n} type="button" className={"option option--chip" + st} disabled={Object.keys(states).length > 0}>
            Тип {n}
          </button>
        );
      })}
    </div>
  );
}

function ClassifyBoard() {
  const prompt = (
    <p className="gprompt"><span className="fi" lang="fi">lukea</span> — какой это тип глагола?</p>
  );
  return (
    <div className="gstack">
      <SpecCard cap="classify · до ответа">
        {prompt}
        <ClassifyChips />
      </SpecCard>

      <SpecCard cap="classify · верно" tone="ok">
        {prompt}
        <ClassifyChips states={{ 1: "correct", 2: "muted", 3: "muted", 4: "muted", 5: "muted", 6: "muted" }} />
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Верно! <span className="fi">lukea</span> оканчивается на гласную + a — это тип 1.</GExplain>
        </div>
      </SpecCard>

      <SpecCard cap="classify · неверно — выбран тип 3" tone="no">
        {prompt}
        <ClassifyChips states={{ 1: "correct", 2: "muted", 3: "wrong", 4: "muted", 5: "muted", 6: "muted" }} />
        <div style={{ marginTop: "0.8rem", display: "grid", gap: 7 }}>
          <GExplain tone="no">
            Тип 3 — глаголы на <span className="fi">-lla/-llä, -nna, -sta</span>: opiskella, mennä.
          </GExplain>
          <GExplain tone="ok">Правильный ответ — тип 1: гласная + a, как в puhua.</GExplain>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- 2 · choose_form (multiple choice, gap) ---------- */

function ChooseOptions({ picked, withWhy }) {
  const opts = [
    ["asuu", "correct"],
    ["asut", null],
    ["asua", null],
    ["asuvat", "wrongable"],
  ];
  const answered = !!picked;
  return (
    <div className="options">
      {opts.map(([w, kind]) => {
        let cls = "option";
        if (answered) {
          if (w === "asuu") cls += " option--correct";
          else if (w === picked) cls += " option--wrong";
          else cls += " option--muted";
        }
        return (
          <button key={w} type="button" className={cls} disabled={answered} lang="fi">
            {w}
            {withWhy && w === picked && (
              <span className="option__why" lang="ru">-vat — окончание для he (они), а hän — один человек.</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ChooseFormBoard() {
  const prompt = (state) => (
    <p className="gprompt" lang="fi">
      Hän {state === "ok" ? <span className="gfill-in">asuu</span> : <span className="gblank"></span>} Helsingissä.
      <span className="gprompt__hint" lang="ru">Выберите форму глагола asua</span>
    </p>
  );
  return (
    <div className="gstack">
      <SpecCard cap="choose_form · до ответа">
        {prompt()}
        <ChooseOptions />
      </SpecCard>

      <SpecCard cap="choose_form · верно" tone="ok">
        {prompt("ok")}
        <ChooseOptions picked="asuu" />
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Верно! Hän — третье лицо: основа asu- + длинная гласная → <span className="fi">asuu</span>.</GExplain>
        </div>
      </SpecCard>

      <SpecCard cap="choose_form · неверно — выбран asuvat" tone="no">
        {prompt()}
        <ChooseOptions picked="asuvat" withWhy />
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Правильный ответ: <span className="fi">asuu</span>.</GExplain>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- 3 · case_id (multiple choice, ending highlighted) ---------- */

function CaseOptions({ picked }) {
  const opts = ["инессив (где?)", "элатив (откуда?)", "иллатив (куда?)"];
  const answered = !!picked;
  return (
    <div className="options">
      {opts.map((o) => {
        let cls = "option";
        if (answered) {
          if (o.startsWith("инессив")) cls += " option--correct";
          else if (o === picked) cls += " option--wrong";
          else cls += " option--muted";
        }
        return (
          <button key={o} type="button" className={cls} disabled={answered}>
            {o}
            {picked === o && o.startsWith("иллатив") && (
              <span className="option__why">Иллатив отвечает на «куда?»: <span lang="fi">Helsinkiin</span>.</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CaseIdBoard() {
  const prompt = (
    <p className="gprompt"><span className="fi" lang="fi">Asun Helsingi<Hl>ssä</Hl></span> — какой это падеж?</p>
  );
  return (
    <div className="gstack">
      <SpecCard cap="case_id · до ответа">
        {prompt}
        <CaseOptions />
      </SpecCard>

      <SpecCard cap="case_id · верно" tone="ok">
        {prompt}
        <CaseOptions picked="инессив (где?)" />
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Верно! <span className="fi">-ssa/-ssä</span> отвечает на вопрос «где?».</GExplain>
        </div>
      </SpecCard>

      <SpecCard cap="case_id · неверно — выбран иллатив" tone="no">
        {prompt}
        <CaseOptions picked="иллатив (куда?)" />
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Правильный ответ — инессив: <span className="fi">Helsingissä</span> = «в Хельсинки».</GExplain>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- 4 · produce_form (typed) ---------- */

function ProduceBoard() {
  const prompt = (
    <p className="gprompt"><span className="fi" lang="fi">nukkua</span> → hän
      <span className="gprompt__hint">настоящее время</span>
    </p>
  );
  return (
    <div className="gstack">
      <SpecCard cap="produce_form · до ответа">
        {prompt}
        <div className="produce">
          <input className="produce__input" type="text" lang="fi" placeholder="Введите форму…" />
          <QuickKeys />
        </div>
      </SpecCard>

      <SpecCard cap="produce_form · верно" tone="ok">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--ok" type="text" lang="fi" defaultValue="nukkuu" disabled />
        </div>
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Верно! Сильная ступень <span className="fi">kk</span> — в форме hän.</GExplain>
        </div>
      </SpecCard>

      <SpecCard cap="produce_form · почти (одна буква)" tone="near">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--near" type="text" lang="fi" defaultValue="nukuu" disabled />
        </div>
        <div style={{ marginTop: "0.8rem", display: "grid", gap: 7 }}>
          <GExplain tone="near">Почти! Не хватает одной буквы — у hän сильная ступень <span className="fi">kk</span>.</GExplain>
          <GCanon>nu<Hl alt>kk</Hl><Hl>uu</Hl></GCanon>
        </div>
      </SpecCard>

      <SpecCard cap="produce_form · неверно" tone="no">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--no" type="text" lang="fi" defaultValue="nukkua" disabled />
        </div>
        <div style={{ marginTop: "0.8rem", display: "grid", gap: 7 }}>
          <GExplain tone="no">Это словарная форма. Для hän нужна основа + длинная гласная: <span className="fi">nukkuu</span>.</GExplain>
          <GCanon>nu<Hl alt>kk</Hl><Hl>uu</Hl></GCanon>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- 5 · transform (typed, full phrase) ---------- */

function TransformBoard() {
  const prompt = (
    <p className="gprompt"><span className="fi" lang="fi">Puhun suomea</span> → сделайте отрицание</p>
  );
  return (
    <div className="gstack">
      <SpecCard cap="transform · до ответа">
        {prompt}
        <div className="produce">
          <input className="produce__input" type="text" lang="fi" placeholder="Введите фразу…" />
          <QuickKeys />
        </div>
      </SpecCard>

      <SpecCard cap="transform · верно" tone="ok">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--ok" type="text" lang="fi" defaultValue="En puhu suomea" disabled />
        </div>
        <div style={{ marginTop: "0.8rem" }}>
          <GExplain tone="ok">Верно! <span className="fi">en</span> + коннегатив <span className="fi">puhu</span>.</GExplain>
        </div>
      </SpecCard>

      <SpecCard cap="transform · почти" tone="near">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--near" type="text" lang="fi" defaultValue="En puhun suomea" disabled />
        </div>
        <div style={{ marginTop: "0.8rem", display: "grid", gap: 7 }}>
          <GExplain tone="near">Почти! После en глагол теряет окончание <span className="fi">-n</span>: puhu.</GExplain>
          <GCanon>En <Hl>puhu</Hl> suomea</GCanon>
        </div>
      </SpecCard>

      <SpecCard cap="transform · неверно" tone="no">
        {prompt}
        <div className="produce">
          <input className="produce__input ginput--no" type="text" lang="fi" defaultValue="Ei puhu suomea" disabled />
        </div>
        <div style={{ marginTop: "0.8rem", display: "grid", gap: 7 }}>
          <GExplain tone="no">Для «я» отрицание — <span className="fi">en</span>. Ei — форма для hän.</GExplain>
          <GCanon><Hl>En</Hl> puhu suomea</GCanon>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- 6 · fill_table (typed grid, per-cell grading) ---------- */

const FILL_PERSONS = ["minä", "sinä", "hän", "me", "te", "he"];

function FillTableBoard() {
  const prompt = (
    <p className="gprompt"><span className="fi" lang="fi">asua</span> — заполните формы
      <span className="gprompt__hint">настоящее время</span>
    </p>
  );
  const graded = [
    ["asun", "ok"], ["asut", "ok"], ["asuu", "ok"], ["asumme", "ok"],
    ["asute", "no", "asutte"], ["asuu", "no", "asuvat"],
  ];
  return (
    <div className="gstack">
      <SpecCard cap="fill_table · до ответа">
        {prompt}
        <div className="gfills">
          {FILL_PERSONS.map((p) => (
            <div key={p} className="gfill">
              <span className="gfill__p" lang="fi">{p}</span>
              <input className="gfill__in" type="text" lang="fi" placeholder="…" />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "0.9rem" }}>
          <QuickKeys />
        </div>
      </SpecCard>

      <SpecCard cap="fill_table · проверено — 4 из 6" tone="near">
        {prompt}
        <div className="gfills">
          {FILL_PERSONS.map((p, i) => {
            const [val, st, fix] = graded[i];
            return (
              <React.Fragment key={p}>
                <div className="gfill">
                  <span className="gfill__p" lang="fi">{p}</span>
                  <input className={"gfill__in ginput--" + st} type="text" lang="fi" defaultValue={val} disabled />
                </div>
                {fix && <div className="gfill"><span></span><span className="gfill__fix" lang="fi">→ {fix}</span></div>}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: "0.9rem" }}>
          <GExplain tone="near">4 из 6 верно. Повторите окончания <span className="fi">-tte</span> (te) и <span className="fi">-vat</span> (he).</GExplain>
        </div>
      </SpecCard>
    </div>
  );
}

/* ---------- Component board: explanation block · tags · mastery · highlights ---------- */

function ComponentsBoard() {
  return (
    <div className="gstack">
      <section className="card gcard">
        <h3 className="gpanel__t">Блок объяснения — 4 тона</h3>
        <div className="gpanel__stack">
          <GExplain tone="ok">Верно! Слабая ступень <span className="fi">kk → k</span>.</GExplain>
          <GExplain tone="near">Почти! Вы написали <span className="fi">nukun</span> без одной буквы.</GExplain>
          <GExplain tone="no">Перед окончанием <span className="fi">-n</span> нужна слабая ступень: kk → k, поэтому <span className="fi">nukun</span>.</GExplain>
          <GExplain tone="info">Гармония гласных: a, o, u ↔ ä, ö, y никогда не смешиваются в одном слове.</GExplain>
        </div>
        <p className="gpanel__note">Один компонент во всех типах заданий и состояниях: иконка-диск + 1–2 предложения по-русски, финские формы — жирным в цвете тона.</p>
      </section>

      <section className="card gcard">
        <h3 className="gpanel__t">Теги понятий</h3>
        <div className="gtags">
          <GTag kind="case">падеж</GTag>
          <GTag kind="verbtype">тип глагола 1–6</GTag>
          <GTag kind="grad">чередование</GTag>
          <GTag kind="part">партитив</GTag>
          <GTag kind="neg">коннегатив</GTag>
          <GTag kind="vh">гармония гласных</GTag>
        </div>
        <p className="gpanel__note">Цвета — существующие роли токенов (teal, violet, gold, brown, clay, green). Тег повторяет цвет везде: в карточке темы, в теории, в объяснении ошибки.</p>
      </section>

      <section className="card gcard">
        <h3 className="gpanel__t">Освоение темы — кольцо / полоса (Tweaks)</h3>
        <div className="gpanel__row">
          <Mastery pct={0} /><Mastery pct={35} /><Mastery pct={72} /><span className="gdone"><GIcon name="check" size={12} strokeWidth={3} /> Освоено</span>
        </div>
        <p className="gpanel__note">0–99% — акцент грамматики; 100% переключается в зелёный «Освоено». Вид индикатора переключается в панели Tweaks.</p>
      </section>

      <section className="card gcard">
        <h3 className="gpanel__t">Подсветка букв</h3>
        <div className="gpara" style={{ marginBottom: "0.6rem" }}>
          <span className="gpara__p">hän</span>
          <span className="gpara__f" lang="fi">nu<Hl alt>kk</Hl><Hl>uu</Hl></span>
        </div>
        <p className="gpanel__note">Подложка, а не только цвет (доступность): розоватая — личное окончание, золотистая — чередование согласных. Те же подсветки повторяются в правильном ответе после ошибки.</p>
      </section>

      <section className="card gcard">
        <h3 className="gpanel__t">Планшет и десктоп</h3>
        <p className="gpanel__note" style={{ margin: 0 }}>
          Колонка центрируется (max-width 30rem), как во всём приложении. От 768px карта тем
          может становиться двухколоночной сеткой модулей; урок остаётся одноколоночным —
          ширина строки важнее плотности. Типографика и компоненты не меняются.
        </p>
      </section>
    </div>
  );
}

Object.assign(window, {
  ClassifyBoard, ChooseFormBoard, CaseIdBoard, ProduceBoard, TransformBoard,
  FillTableBoard, ComponentsBoard,
});
