/* data.jsx — ring + CEFR sample data.
   Two ring states so edge cases are visible:
     • RING_L1 — current level 1, LOW mastery + big "left" counts (the screenshot).
     • RING_L5 — level 5, mixed mastery (the original handoff data).
   Icon alignment fix: typed-answer modes use ONE icon ('keyboard') across
   both Слова (spelling) and Предложения (translation/typing). */

/* group order: words → sent → read (drives clockwise placement) */
const RING_L1 = [
  { group: 'words', icon: 'eye',      label: 'Узнавание', m: 0.42, left: 23 },
  { group: 'words', icon: 'keyboard', label: 'Письмо',    m: 0.12, left: 23 },
  { group: 'words', icon: 'mic',      label: 'Речь',      m: 0.05, left: 23 },
  { group: 'words', icon: 'phones',   label: 'На слух',   m: 0.22, left: 19 },
  { group: 'sent',  icon: 'keyboard', label: 'Перевод',   m: 0.08, left: 4  },
  { group: 'sent',  icon: 'mic',      label: 'Речь',      m: 0.00, left: 4  },
  { group: 'sent',  icon: 'phones',   label: 'На слух',   m: 0.04, left: 4  },
  { group: 'read',  icon: 'book',     label: 'Тексты',    m: 0.15, left: 2  },
  { group: 'read',  icon: 'masks',    label: 'Диалоги',   m: 0.00, left: 2  },
];

const RING_L5 = [
  { group: 'words', icon: 'eye',      label: 'Узнавание', m: 1.00, left: 0 },
  { group: 'words', icon: 'keyboard', label: 'Письмо',    m: 0.74, left: 1 },
  { group: 'words', icon: 'mic',      label: 'Речь',      m: 0.66, left: 6 },
  { group: 'words', icon: 'phones',   label: 'На слух',   m: 0.60, left: 4 },
  { group: 'sent',  icon: 'keyboard', label: 'Перевод',   m: 0.55, left: 3 },
  { group: 'sent',  icon: 'mic',      label: 'Речь',      m: 0.30, left: 4 },
  { group: 'sent',  icon: 'phones',   label: 'На слух',   m: 0.58, left: 4 },
  { group: 'read',  icon: 'book',     label: 'Тексты',    m: 0.95, left: 0 },
  { group: 'read',  icon: 'masks',    label: 'Диалоги',   m: 0.80, left: 0 },
];

const weakestOf = (ring) => ring.reduce((a, b) => (b.m < a.m ? b : a));

/* ---------- CEFR ladder ---------- */
const CEFR_BANDS = [
  { id: 'A1.1', ru: 'Основы',          levels: 3 },
  { id: 'A1.2', ru: 'Повседневность',  levels: 3 },
  { id: 'A1.3', ru: 'Город и быт',     levels: 3 },
  { id: 'A2',   ru: 'Уверенный старт', levels: 3 },
];
/* current standing — matches the screenshot: A1.1, level 1 of 3, 37% to A1.2 */
const CEFR_NOW = { bandIdx: 0, levelInBand: 1, levelsInBand: 3, pct: 0.37, nextId: 'A1.2' };

Object.assign(window, { RING_L1, RING_L5, weakestOf, CEFR_BANDS, CEFR_NOW });
