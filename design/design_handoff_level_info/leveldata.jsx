/* leveldata.jsx — level-info model for the redesign.
   Folds the old «Прогресс» per-mode data into the level page.
   Each item carries a per-mode mastery array (Leitner box 0..5) which the
   combined dot-strip collapses into one read. `known` = user marked «Уже знаю».

   Accent tokens (TEAL / GOLD / GROUP_HUE) live in the app's metrics module;
   redeclared here so this bundle stands alone. */

const TEAL = '#1B8E84';
const GOLD = '#C8902B';
const GOLD_SOFT = '#F6EEDC';
const GROUP_HUE = { w: '#5B53C6', s: '#1B8E84', r: '#BB6A39' };
const bandOf = (lv) => lv <= 3 ? 'A1.1' : lv <= 6 ? 'A1.2' : lv <= 9 ? 'A1.3' : 'A2';

/* mode definitions — short tag (for the strip legend) + icon + full label */
const WORD_MODES = [
  { tag: 'Узн', icon: 'eye', label: 'Узнавание' },
  { tag: 'Пис', icon: 'pen', label: 'Написание' },
  { tag: 'Речь', icon: 'mic', label: 'Речь' },
  { tag: 'Слух', icon: 'phones', label: 'На слух' },
];
const SENT_MODES = [
  { tag: 'Пер', icon: 'chat', label: 'Перевод' },
  { tag: 'Речь', icon: 'mic', label: 'Речь' },
  { tag: 'Слух', icon: 'phones', label: 'На слух' },
];

/* full per-level vocab (Finnish-first), lifted from the curriculum source */
const CONTENT = {
  3: {
    fi: 'Perhe', ru: 'Семья', lv: 3, status: 'current',
    words: [['perhe','семья'],['äiti','мама'],['isä','папа'],['lapsi','ребёнок'],['veli','брат'],['sisko','сестра'],['vaimo','жена'],['mies','муж'],['poika','сын / мальчик'],['tytär','дочь'],['isoäiti','бабушка'],['isoisä','дедушка'],['vanhemmat','родители'],['serkku','двоюродный брат / сестра'],['täti','тётя'],['setä','дядя'],['eno','дядя (по матери)'],['lapsenlapsi','внук'],['sukulainen','родственник'],['pariskunta','пара'],['avioliitto','брак'],['koti','дом / семья'],['nimi','имя'],['ikä','возраст']],
    sentences: [['Tämä on minun perheeni.','Это моя семья.'],['Minulla on kaksi sisarusta.','У меня двое братьев / сестёр.'],['Äitini on opettaja.','Моя мама — учительница.'],['Kuinka vanha sinä olet?','Сколько тебе лет?'],['Onko sinulla lapsia?','У тебя есть дети?'],['Veljeni asuu Tampereella.','Мой брат живёт в Тампере.']],
    texts: [{ fi:'Sukuni', ru:'Моя семья', dialog:false },{ fi:'Kuka tämä on?', ru:'Кто это?', dialog:true },{ fi:'Perhealbumi', ru:'Семейный альбом', dialog:false }],
  },
  2: {
    fi: 'Tutustuminen', ru: 'Знакомство', lv: 2, status: 'done',
    words: [['nimi','имя'],['sukunimi','фамилия'],['kuka','кто'],['mikä','что'],['mistä','откуда'],['maa','страна'],['kotimaa','родина'],['kaupunki','город'],['kieli','язык'],['suomi','финский'],['venäjä','русский'],['englanti','английский'],['puhua','говорить'],['asua','жить'],['ammatti','профессия'],['opiskelija','студент'],['työ','работа'],['ikä','возраст'],['vuosi','год'],['ystävä','друг'],['numero','номер'],['puhelin','телефон']],
    sentences: [['Mikä sinun nimesi on?','Как тебя зовут?'],['Minun nimeni on Anna.','Меня зовут Анна.'],['Mistä sinä olet kotoisin?','Откуда ты родом?'],['Puhutko suomea?','Ты говоришь по-фински?'],['Olen kotoisin Venäjältä.','Я родом из России.']],
    texts: [{ fi:'Olen opiskelija', ru:'Я студент', dialog:false },{ fi:'Kuka sinä olet?', ru:'Кто ты?', dialog:true }],
  },
};

/* deterministic pseudo-random so the sample stays stable across reloads */
function rng(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* build per-mode boxes for one item. front modes (recognition) lead; later
   modes lag — the natural learning curve. `done` profile pushes everything to 5. */
function makeModes(modeCount, r, done) {
  if (done) return Array.from({ length: modeCount }, () => 5);
  const lead = 2 + Math.floor(r() * 4);          // 2..5 on the first mode
  return Array.from({ length: modeCount }, (_, i) => {
    const v = lead - i - Math.floor(r() * 2);
    return Math.max(0, Math.min(5, v));
  });
}

/* assemble items with state. profile: 'current' | 'done'. */
function buildLevel(key) {
  const C = CONTENT[key];
  const done = C.status === 'done';
  const seed = key * 101 + 7;

  const words = C.words.map(([fi, ru], i) => {
    const r = rng(seed + i * 13);
    const modes = makeModes(4, r, done);
    return { kind: 'w', fi, ru, modes };
  });
  const sentences = C.sentences.map(([fi, ru], i) => {
    const r = rng(seed + 500 + i * 13);
    const modes = makeModes(3, r, done);
    return { kind: 's', fi, ru, modes };
  });
  const texts = C.texts.map((t, i) => {
    const r = rng(seed + 900 + i * 13);
    const quiz = done ? 5 : Math.floor(r() * 6);
    return { kind: 'r', fi: t.fi, ru: t.ru, dialog: t.dialog, modes: [quiz], read: quiz > 0 || r() > 0.5 };
  });

  /* hand-seed a couple of states so the «знаю» / hidden flows have content */
  if (!done) {
    words[1].known = true;                         // äiti — user already knew it
    words[19].known = true;                        // pariskunta
    words[0].modes = [5, 5, 5, 5];                 // perhe — fully mastered
    words[7].modes = [5, 5, 5, 5];                 // mies — fully mastered
    sentences[0].known = true;                     // marked known
  }
  return { ...C, words, sentences, texts };
}

const LEVELS_DATA = { 3: buildLevel(3), 2: buildLevel(2) };

/* section eyebrow — lifted from the app's metrics module */
function SecLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 2px 9px' }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: RC.sub, whiteSpace: 'nowrap' }}>{children}</span>
      {right}
    </div>
  );
}

/* item helpers */
const isMastered = (it) => it.modes.every(b => b >= 5);
const masteredCount = (it) => it.modes.filter(b => b >= 5).length;
/* «done» for list purposes = fully mastered OR user-known */
const isDone = (it) => it.known || isMastered(it);

Object.assign(window, {
  TEAL, GOLD, GOLD_SOFT, GROUP_HUE, bandOf, SecLabel,
  WORD_MODES, SENT_MODES, LEVELS_DATA,
  isMastered, masteredCount, isDone,
});
