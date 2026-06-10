/**
 * apply-en.mjs — applies scripts/rebalance/en/en-plan.json (the english-linguist's themes + grammar
 * floors) to the English seeds, format-preservingly. English dict entries are one-line objects WITH
 * spaces (`{ "id": "p1", … }`), so we re-emit them in that exact style; sentences/texts are 2-space
 * pretty (theme inserted after the level line). Run: `node scripts/rebalance/en/apply-en.mjs`
 *
 * - dictionary: add `theme` (from wordThemes) + optional `levelMoves`, preserving every other field.
 * - texts: add `theme` (from textThemes).
 * - sentences: theme DERIVED from the highest-level word it uses; level raised to
 *   max(current, grammar floor) — push-later only.
 */

import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const root = dir.replace(/scripts\/rebalance\/en\/$/, "");
const P = (p) => root + p;
const read = (p) => fs.readFileSync(P(p), "utf8");
const eolOf = (raw) => (raw.includes("\r\n") ? "\r\n" : "\n");
const abort = (m) => {
  console.error("ABORT:", m);
  process.exit(1);
};

const plan = JSON.parse(read("scripts/rebalance/en/en-plan.json"));
const wordThemes = new Map(Object.entries(plan.wordThemes || {}));
const textThemes = new Map(Object.entries(plan.textThemes || {}));
const levelMoves = new Map(Object.entries(plan.levelMoves || {}).map(([k, v]) => [k, Number(v)]));
const floors = plan.floors || [];

/** One-line object in the English seed's spaced style: `{ "k": v, "k2": v2 }`. */
const oneLine = (obj) =>
  "{ " + Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ") + " }";

// --- dictionary (one-line entries) ------------------------------------------------------
function patchDict() {
  const raw = read("data/en/dictionary.seed.json");
  const eol = eolOf(raw);
  const lines = raw.split(/\r?\n/);
  let touched = 0;
  const out = lines.map((line) => {
    const m = line.match(/^(\s*)(\{.*\})(,?)\s*$/);
    if (!m || !line.includes('"id"')) return line;
    let obj;
    try {
      obj = JSON.parse(m[2]);
    } catch {
      return line;
    }
    if (!obj.id || !wordThemes.has(obj.id)) return line;
    if (levelMoves.has(obj.id)) obj.level = levelMoves.get(obj.id);
    obj.theme = wordThemes.get(obj.id);
    touched++;
    return `${m[1]}${oneLine(obj)}${m[3]}`;
  });
  fs.writeFileSync(P("data/en/dictionary.seed.json"), out.join(eol));
  return touched;
}

// --- derive sentence theme + floor level ------------------------------------------------
// word levels from the (current) dictionary, applying any levelMoves; themes come from the PLAN
// (the dictionary isn't themed until patchDict runs, so we must not read themes back from it here).
const dictNow = JSON.parse(read("data/en/dictionary.seed.json"));
const wordLevel = new Map();
const wordTheme = wordThemes;
for (const c of ["pronouns", "verbs", "nouns", "adjectives", "function_words"])
  for (const e of dictNow[c] || []) wordLevel.set(e.id, levelMoves.get(e.id) ?? e.level ?? 1);

const sentJson = JSON.parse(read("data/en/sentences.seed.json"));
const sentInfo = new Map(); // id -> { level, theme }
for (const s of sentJson.sentences) {
  const used = (s.uses || []).map((id) => ({ id, level: wordLevel.get(id), theme: wordTheme.get(id) })).filter((u) => u.level);
  let theme;
  if (used.length) {
    const maxLevel = Math.max(...used.map((u) => u.level));
    theme = used.find((u) => u.level === maxLevel).theme;
  }
  const teaches = (s.teaches || "").toLowerCase();
  let floor = 0;
  for (const f of floors) if ((f.match || []).some((x) => teaches.includes(x.toLowerCase()))) floor = Math.max(floor, f.minLevel);
  const level = Math.max(s.level || 1, floor);
  sentInfo.set(s.id, { level, theme });
}

// --- insert theme after the level line (sentences/texts) + raise level ------------------
function patchLevelTheme(file, idRe, infoById, textMode) {
  const raw = read(file);
  const eol = eolOf(raw);
  const lines = raw.split(/\r?\n/);
  const out = [];
  let cur = null;
  let touched = 0;
  for (const line of lines) {
    const idm = line.match(idRe);
    if (idm) cur = idm[1];
    const lm = line.match(/^(\s*)"level":\s*\d+(,?)\s*$/);
    if (lm && cur && infoById.has(cur)) {
      const info = infoById.get(cur);
      const level = textMode ? info.level : info.level;
      const theme = info.theme;
      out.push(`${lm[1]}"level": ${level},`);
      if (theme) out.push(`${lm[1]}"theme": ${JSON.stringify(theme)},`);
      touched++;
      cur = null;
      continue;
    }
    out.push(line);
  }
  fs.writeFileSync(P(file), out.join(eol));
  return touched;
}

const d = patchDict();
const textInfo = new Map([...textThemes].map(([id, theme]) => {
  const t = JSON.parse(read("data/en/texts.seed.json")).texts.find((x) => x.id === id);
  return [id, { level: t ? t.level : 1, theme }];
}));
const t = patchLevelTheme("data/en/texts.seed.json", /^ {6}"id":\s*"(t\d+)"/, textInfo, true);
const s = patchLevelTheme("data/en/sentences.seed.json", /^ {6}"id":\s*"(s\d+)"/, sentInfo, false);

// --- validate ---------------------------------------------------------------------------
const dict2 = JSON.parse(read("data/en/dictionary.seed.json"));
let nWords = 0;
for (const c of ["pronouns", "verbs", "nouns", "adjectives", "function_words"])
  for (const e of dict2[c] || []) {
    if (!wordThemes.has(e.id)) abort(`word ${e.id} not in wordThemes`);
    if (e.theme !== wordThemes.get(e.id)) abort(`word ${e.id} theme not applied`);
    nWords++;
  }
if (nWords !== wordThemes.size) abort(`dict has ${nWords} words but plan themes ${wordThemes.size}`);
const sents2 = JSON.parse(read("data/en/sentences.seed.json")).sentences;
for (const s2 of sents2) for (const u of s2.uses || []) if ((wordLevel.get(u) || 1) > (s2.level || 1)) abort(`sentence ${s2.id} level < word ${u}`);
const texts2 = JSON.parse(read("data/en/texts.seed.json")).texts;
for (const x of texts2) if (textThemes.has(x.id) && x.theme !== textThemes.get(x.id)) abort(`text ${x.id} theme not applied`);

console.log(`OK — ${d}/${nWords} words themed, ${t} texts themed, ${s} sentences (theme+floor). Re-parsed + invariants hold.`);
