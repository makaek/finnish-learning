/* data.jsx — reading content + the two-part mastery model.
   A text/dialog is МАСTERED («Прочитано») only when BOTH parts are done:
     1) quiz   — ответы на вопросы пройдены
     2) recite — рассказано наизусть ЗА ВСЕ РОЛИ
   library items carry {quiz, recite} booleans (or locked). */

const masteryState = (it) => {
  if (it.locked) return 'locked';
  if (it.quiz && it.recite) return 'mastered';      // Прочитано
  if (it.quiz || it.recite) return 'progress';      // начато
  return 'new';
};

/* library: Диалоги */
const DIALOGS = [
  { lv: 1, title: 'Знакомство',        quiz: true,  recite: true },
  { lv: 2, title: 'В школе',           quiz: true,  recite: true },
  { lv: 3, title: 'Сколько это стоит?',quiz: true,  recite: true },
  { lv: 3, title: 'Кто это?',          quiz: true,  recite: false }, // только вопросы
  { lv: 3, title: 'Где ты живёшь?',    quiz: false, recite: true },  // только наизусть
  { lv: 4, title: 'В ресторане',       quiz: false, recite: false }, // доступно, не начато
  { lv: 4, title: 'В кафе',            quiz: false, recite: false },
  { lv: 4, title: 'В магазине',        quiz: false, recite: false },
  { lv: 5, title: 'Какая погода?',     locked: true },
  { lv: 5, title: 'Как пройти на вокзал?', locked: true },
];

/* library: Тексты */
const TEXTS = [
  { lv: 1, title: 'Доброе утро',       quiz: true,  recite: true },
  { lv: 1, title: 'Я студент',         quiz: true,  recite: true },
  { lv: 2, title: 'Дома',              quiz: true,  recite: true },
  { lv: 2, title: 'Моя семья',         quiz: true,  recite: true },
  { lv: 3, title: 'Наш дом',           quiz: true,  recite: true },
  { lv: 4, title: 'В магазине',        quiz: true,  recite: false },
  { lv: 5, title: 'Дорога на работу',  quiz: false, recite: true },
  { lv: 6, title: 'Мой день',          quiz: false, recite: false },
  { lv: 7, title: 'Моя семья большая', quiz: false, recite: false },
  { lv: 8, title: 'Путешествие к морю', locked: true },
];

/* reader content — a monologue text ("Мой день", lv 6) */
const TEXT_READER = {
  lv: 6, title: 'Мой день', kind: 'text', roles: ['Рассказчик'],
  lines: [
    { fi: 'Minä herään aamulla aikaisin.', ru: 'Я просыпаюсь рано утром.' },
    { fi: 'Aamulla minä juon kahvia ja syön leipää.', ru: 'Утром я пью кофе и ем хлеб.' },
    { fi: 'Sitten minä menen töihin.', ru: 'Потом я иду на работу.' },
    { fi: 'Illalla minä katson televisiota kotona.', ru: 'Вечером я смотрю телевизор дома.' },
    { fi: 'Yöllä minä nukun hyvin.', ru: 'Ночью я хорошо сплю.' },
  ],
};

/* reader content — a dialog ("Который час?", lv 4) — two roles */
const DIALOG_READER = {
  lv: 4, title: 'Который час?', kind: 'dialog', roles: ['Pekka', 'Liisa'],
  lines: [
    { who: 'Pekka', fi: 'Anteeksi, paljonko kello on?', ru: 'Извините, который час?' },
    { who: 'Liisa', fi: 'Kello on kaksi.', ru: 'Сейчас два часа.' },
    { who: 'Pekka', fi: 'Kiitos. Minun täytyy mennä töihin.', ru: 'Спасибо. Мне нужно идти на работу.' },
    { who: 'Liisa', fi: 'Mihin aikaan sinä menet kotiin?', ru: 'Во сколько ты идёшь домой?' },
    { who: 'Pekka', fi: 'Illalla. Nyt minulla on kiire.', ru: 'Вечером. Сейчас я тороплюсь.' },
  ],
};

/* quiz — comprehension */
const QUIZ = { idx: 1, total: 2, q: 'Paljonko kello on?', qRu: 'Который час?' };

/* recite a line by memory */
const PLAY = { idx: 1, total: 3, who: 'Pekka', role: 'Pekka',
  ru: 'Извините, который час?', fi: 'Anteeksi, paljonko kello on?' };

Object.assign(window, { masteryState, TEXTS, DIALOGS, TEXT_READER, DIALOG_READER, QUIZ, PLAY });
