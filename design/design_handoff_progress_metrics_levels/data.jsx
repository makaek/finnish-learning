/* data.jsx — progress + metrics model for the redesign.
   Current level = 5 (matches the home ring). Levels 1-4 done, 5 in progress,
   6-12 locked. CEFR bands: A1.1 (1-3) · A1.2 (4-6) · A1.3 (7-9) · A2 (10-12). */

const CUR_LEVEL = 5;

/* CEFR band for a level number */
const bandOf = (lv) => lv <= 3 ? 'A1.1' : lv <= 6 ? 'A1.2' : lv <= 9 ? 'A1.3' : 'A2';

/* the 12-level curriculum. fr = mean completion fraction across the level's
   combined content (words+sentences+texts). counts = {w, s, t}. */
const LEVELS = [
  { lv: 1,  fi: 'Tervehdykset',     ru: 'Приветствия',        w: 20, s: 5, t: 2, fr: 1.00 },
  { lv: 2,  fi: 'Tutustuminen',     ru: 'Знакомство',         w: 22, s: 5, t: 2, fr: 1.00 },
  { lv: 3,  fi: 'Perhe',            ru: 'Семья',              w: 24, s: 6, t: 3, fr: 1.00 },
  { lv: 4,  fi: 'Koti',             ru: 'Дом',                w: 21, s: 5, t: 2, fr: 1.00 },
  { lv: 5,  fi: 'Ruoka ja kahvila', ru: 'Еда и кафе',         w: 23, s: 5, t: 2, fr: 0.54 },
  { lv: 6,  fi: 'Kello ja aika',    ru: 'Время',              w: 20, s: 5, t: 2, fr: 0 },
  { lv: 7,  fi: 'Sää',              ru: 'Погода',             w: 18, s: 4, t: 2, fr: 0 },
  { lv: 8,  fi: 'Kaupungilla',      ru: 'В городе',           w: 22, s: 5, t: 2, fr: 0 },
  { lv: 9,  fi: 'Ostokset',         ru: 'Покупки',            w: 24, s: 6, t: 2, fr: 0 },
  { lv: 10, fi: 'Työ',             ru: 'Работа',             w: 22, s: 5, t: 2, fr: 0 },
  { lv: 11, fi: 'Matkustaminen',    ru: 'Путешествия',        w: 26, s: 6, t: 3, fr: 0 },
  { lv: 12, fi: 'Terveys',          ru: 'Здоровье',           w: 24, s: 6, t: 2, fr: 0 },
];

/* status helper for a level relative to the current one */
const lvStatus = (lv) => lv < CUR_LEVEL ? 'done' : lv === CUR_LEVEL ? 'current' : 'locked';

/* aggregate KPIs — kept set only (dropped: Полностью освоено, Всего ответов) */
const KPI = {
  words:     { learned: 98, total: 240 },     // ✦ Слов выучено
  sentences: { learned: 22, total: 61, eligible: 6 }, // 💬 Фраз освоено
  texts:     { learned: 9,  total: 24 },      // 📖 Тексты пройдено
  streak:    { cur: 12, record: 21 },         // 🔥 Серия дней
  accuracy:  { pct: 87, correct: 1240, total: 1425 }, // 🎯 Точность
};

/* Сегодня */
const TODAY = { lessons: 7, goal: 10, acc: 93, answered: 96, correct: 89 };

/* CEFR standing */
const CEFR = { band: 'A1', stage: 'A1.2', next: 'A1.3', fraction: 0.62 };

/* mode balance — mastered fraction per exercise mode (from the home ring).
   group: w = слова, s = предложения, r = чтение. */
const MODES = [
  { group: 'w', icon: 'eye',    label: 'Узнавание',  m: 1.00, acc: 94 },
  { group: 'w', icon: 'pen',    label: 'Написание',  m: 0.74, acc: 88 },
  { group: 'w', icon: 'mic',    label: 'Речь',       m: 0.66, acc: 81 },
  { group: 'w', icon: 'phones', label: 'На слух',    m: 0.60, acc: 79 },
  { group: 's', icon: 'chat',   label: 'Перевод',    m: 0.55, acc: 85 },
  { group: 's', icon: 'mic',    label: 'Речь',       m: 0.30, acc: 72 },
  { group: 's', icon: 'phones', label: 'На слух',    m: 0.58, acc: 76 },
  { group: 'r', icon: 'book',   label: 'Чтение',     m: 0.87, acc: 90 },
];
const GROUP_LBL = { w: 'Слова', s: 'Предложения', r: 'Чтение' };
const GROUP_HUE = { w: '#5B53C6', s: '#1B8E84', r: '#BB6A39' };
/* weakest mode = the practise nudge */
const WEAKEST = MODES.reduce((a, b) => (b.m < a.m ? b : a));

/* ---------------- Прогресс item list ---------------- */
/* track: {label, icon, box, streak, ok, seen, chance} */
const t = (label, icon, box, streak, ok, seen, chance) => ({ label, icon, box, streak, ok, seen, chance });

const WORDS = [
  { fi: 'kahvi', ru: 'кофе', lv: 5, mastered: false, tracks: [
    t('Узнавание', 'eye', 5, 6, 14, 14, 0.41), t('Написание', 'pen', 3, 2, 9, 12, 0.62),
    t('Речь', 'mic', 2, 1, 5, 8, 0.71), t('На слух', 'phones', 2, 0, 4, 7, 0.68) ] },
  { fi: 'leipä', ru: 'хлеб', lv: 5, mastered: false, tracks: [
    t('Узнавание', 'eye', 5, 9, 18, 18, 0.33), t('Написание', 'pen', 4, 3, 11, 13, 0.55),
    t('Речь', 'mic', 1, 0, 3, 6, 0.74) ] },
  { fi: 'ruoka', ru: 'еда', lv: 5, mastered: true, tracks: [
    t('Узнавание', 'eye', 5, 11, 20, 20, 0.18), t('Написание', 'pen', 5, 7, 15, 16, 0.22),
    t('Речь', 'mic', 5, 4, 9, 10, 0.27), t('На слух', 'phones', 5, 5, 11, 12, 0.25) ] },
  { fi: 'maito', ru: 'молоко', lv: 5, mastered: false, tracks: [
    t('Узнавание', 'eye', 4, 4, 10, 11, 0.48), t('Написание', 'pen', 2, 1, 6, 9, 0.64) ] },
  { fi: 'perhe', ru: 'семья', lv: 3, mastered: true, tracks: [
    t('Узнавание', 'eye', 5, 14, 24, 24, 0.12), t('Написание', 'pen', 5, 9, 18, 19, 0.16),
    t('Речь', 'mic', 5, 6, 12, 13, 0.20), t('На слух', 'phones', 5, 7, 14, 15, 0.18) ] },
];

const SENTENCES = [
  { ru: 'Я живу в Хельсинки.', fi: 'Asun Helsingissä.', lv: 5, mastered: false, tracks: [
    t('Речь', 'mic', 1, 1, 1, 1, 0.54) ] },
  { ru: 'Можно мне кофе?', fi: 'Saanko kahvia?', lv: 5, mastered: false, tracks: [
    t('Перевод', 'chat', 3, 2, 6, 7, 0.58), t('Речь', 'mic', 1, 0, 2, 4, 0.70) ] },
  { ru: 'Сколько это стоит?', fi: 'Paljonko tämä maksaa?', lv: 5, mastered: true, tracks: [
    t('Перевод', 'chat', 5, 8, 14, 14, 0.21), t('Речь', 'mic', 5, 4, 8, 9, 0.28),
    t('На слух', 'phones', 5, 5, 10, 11, 0.24) ] },
];

/* texts: quiz (вопросы) + read flag. seen=0 → not started */
const TEXTITEMS = [
  { title: 'Tutustuminen', dialog: true, lv: 5, quizSeen: 0, read: false },
  { title: 'Hyvää huomenta', dialog: false, lv: 5, quizSeen: 0, read: true },
  { title: 'Olen opiskelija', dialog: false, lv: 5, quizSeen: 6, quizBox: 3, streak: 2, ok: 5, mastered: false },
  { title: 'Sukuni', dialog: false, lv: 3, quizSeen: 8, quizBox: 5, streak: 6, ok: 8, mastered: true },
  { title: 'Kuka tämä on?', dialog: true, lv: 3, quizSeen: 7, quizBox: 5, streak: 5, ok: 7, mastered: true },
];

const SECTION_COUNTS = { words: 62, sentences: 24, texts: 18 };

/* ---------------- full per-level content (for the «Уровень» detail) ----------------
   Topic items are stored Finnish-first. text items: {fi, ru, dialog}. */
const LEVEL_CONTENT = {
  1: {
    words: [['hei','привет'],['moi','привет (разг.)'],['terve','здравствуй'],['huomenta','доброе утро'],['päivää','добрый день'],['iltaa','добрый вечер'],['näkemiin','до свидания'],['hei hei','пока'],['kiitos','спасибо'],['ole hyvä','пожалуйста'],['anteeksi','извините'],['kyllä','да'],['ei','нет'],['ehkä','может быть'],['hyvää yötä','спокойной ночи'],['tervetuloa','добро пожаловать'],['mukava','приятно'],['kuinka','как'],['hyvin','хорошо'],['entä','а / как насчёт']],
    sentences: [['Hei, mitä kuuluu?','Привет, как дела?'],['Kiitos, hyvää.','Спасибо, хорошо.'],['Mukava tavata.','Приятно познакомиться.'],['Anteeksi, en ymmärrä.','Извините, я не понимаю.'],['Näkemiin huomiseen.','До завтра.']],
    texts: [{fi:'Tervehdys',ru:'Приветствие',dialog:false},{fi:'Hyvää huomenta',ru:'Доброе утро',dialog:true}],
  },
  2: {
    words: [['nimi','имя'],['sukunimi','фамилия'],['kuka','кто'],['mikä','что'],['mistä','откуда'],['maa','страна'],['kotimaa','родина'],['kaupunki','город'],['kieli','язык'],['suomi','финский'],['venäjä','русский'],['englanti','английский'],['puhua','говорить'],['asua','жить'],['ammatti','профессия'],['opiskelija','студент'],['työ','работа'],['ikä','возраст'],['vuosi','год'],['ystävä','друг'],['numero','номер'],['puhelin','телефон']],
    sentences: [['Mikä sinun nimesi on?','Как тебя зовут?'],['Minun nimeni on Anna.','Меня зовут Анна.'],['Mistä sinä olet kotoisin?','Откуда ты родом?'],['Puhutko suomea?','Ты говоришь по-фински?'],['Olen kotoisin Venäjältä.','Я родом из России.']],
    texts: [{fi:'Olen opiskelija',ru:'Я студент',dialog:false},{fi:'Kuka sinä olet?',ru:'Кто ты?',dialog:true}],
  },
  3: {
    words: [['perhe','семья'],['äiti','мама'],['isä','папа'],['lapsi','ребёнок'],['veli','брат'],['sisko','сестра'],['vaimo','жена'],['mies','муж'],['poika','сын / мальчик'],['tytär','дочь'],['isoäiti','бабушка'],['isoisä','дедушка'],['vanhemmat','родители'],['serkku','двоюродный брат / сестра'],['täti','тётя'],['setä','дядя'],['eno','дядя (по матери)'],['lapsenlapsi','внук'],['sukulainen','родственник'],['pariskunta','пара'],['avioliitto','брак'],['koti','дом / семья'],['nimi','имя'],['ikä','возраст']],
    sentences: [['Tämä on minun perheeni.','Это моя семья.'],['Minulla on kaksi sisarusta.','У меня двое братьев / сестёр.'],['Äitini on opettaja.','Моя мама — учительница.'],['Kuinka vanha sinä olet?','Сколько тебе лет?'],['Onko sinulla lapsia?','У тебя есть дети?'],['Veljeni asuu Tampereella.','Мой брат живёт в Тампере.']],
    texts: [{fi:'Sukuni',ru:'Моя семья',dialog:false},{fi:'Kuka tämä on?',ru:'Кто это?',dialog:true},{fi:'Perhealbumi',ru:'Семейный альбом',dialog:false}],
  },
  4: {
    words: [['koti','дом'],['talo','дом (здание)'],['asunto','квартира'],['huone','комната'],['keittiö','кухня'],['makuuhuone','спальня'],['olohuone','гостиная'],['kylpyhuone','ванная'],['wc','туалет'],['ovi','дверь'],['ikkuna','окно'],['lattia','пол'],['katto','потолок'],['seinä','стена'],['pöytä','стол'],['tuoli','стул'],['sänky','кровать'],['sohva','диван'],['kaappi','шкаф'],['lamppu','лампа'],['matto','ковёр']],
    sentences: [['Asun pienessä asunnossa.','Я живу в маленькой квартире.'],['Keittiö on iso.','Кухня большая.'],['Missä kylpyhuone on?','Где ванная?'],['Olohuoneessa on sohva.','В гостиной есть диван.'],['Minun huoneeni on valoisa.','Моя комната светлая.']],
    texts: [{fi:'Minun kotini',ru:'Мой дом',dialog:false},{fi:'Uusi asunto',ru:'Новая квартира',dialog:false}],
  },
};

Object.assign(window, {
  CUR_LEVEL, bandOf, LEVELS, lvStatus, KPI, TODAY, CEFR, MODES, GROUP_LBL, GROUP_HUE, WEAKEST,
  WORDS, SENTENCES, TEXTITEMS, SECTION_COUNTS, LEVEL_CONTENT,
});
