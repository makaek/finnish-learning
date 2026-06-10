/**
 * apply-floors.mjs — gates advanced-grammar SENTENCES (and optional reading-text moves) to a later
 * minimum level, fixing "past tense introduced too early". Reads scripts/rebalance/grammar-floors.json
 * (the finnish-linguist's grammar → minLevel table) and raises each sentence's level to
 * max(current word-derived level, highest matching floor). PUSHING LATER ONLY — never lowers a level,
 * so the sentence.level ≥ used-word level invariant is preserved. Format-preserving (only rewrites the
 * `level` number on existing level lines; themes untouched). Run: `node scripts/rebalance/apply-floors.mjs`
 */

import fs from "node:fs";

const root = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const P = (p) => root + p;
const read = (p) => fs.readFileSync(P(p), "utf8");
const eolOf = (raw) => (raw.includes("\r\n") ? "\r\n" : "\n");
const abort = (m) => {
  console.error("ABORT:", m);
  process.exit(1);
};

const cfg = JSON.parse(read("scripts/rebalance/grammar-floors.json"));
const floors = cfg.floors || [];
const textMoves = cfg.textMoves || {};

// --- compute new sentence levels --------------------------------------------------------
const sents = JSON.parse(read("data/sentences.seed.json")).sentences;
const newSentLevel = new Map(); // id -> newLevel (only when raised)
const bumpedBy = {}; // label -> count
for (const s of sents) {
  const teaches = (s.teaches || "").toLowerCase();
  let floor = 0;
  let label = null;
  for (const f of floors) {
    if ((f.match || []).some((m) => teaches.includes(m.toLowerCase()))) {
      if (f.minLevel > floor) {
        floor = f.minLevel;
        label = f.label || f.match[0];
      }
    }
  }
  const cur = s.level || 1;
  if (floor > cur) {
    newSentLevel.set(s.id, floor);
    bumpedBy[label] = (bumpedBy[label] || 0) + 1;
  }
}

// --- format-preserving level rewrite ----------------------------------------------------
function setLevels(file, idRe, levelById) {
  const raw = read(file);
  const eol = eolOf(raw);
  const lines = raw.split(/\r?\n/);
  const out = [];
  let cur = null;
  let changed = 0;
  for (const line of lines) {
    const idm = line.match(idRe);
    if (idm) cur = idm[1];
    const lm = line.match(/^(\s*)"level":\s*\d+(,?)\s*$/);
    if (lm && cur && levelById.has(cur)) {
      out.push(`${lm[1]}"level": ${levelById.get(cur)}${lm[2]}`);
      changed++;
      cur = null;
      continue;
    }
    out.push(line);
  }
  fs.writeFileSync(P(file), out.join(eol));
  return changed;
}

const sChanged = setLevels("data/sentences.seed.json", /^ {6}"id":\s*"(s\d+)"/, newSentLevel);
const textMoveMap = new Map(Object.entries(textMoves).map(([k, v]) => [k, Number(v)]));
const tChanged = textMoves && Object.keys(textMoves).length
  ? setLevels("data/texts.seed.json", /^ {6}"id":\s*"(t\d+)"/, textMoveMap)
  : 0;

// --- validate ---------------------------------------------------------------------------
// build word level map from the dictionary (current, post-rebalance) for the invariant check
const dict = JSON.parse(read("data/dictionary.seed.json"));
const wordLevel = new Map();
for (const c of ["pronouns", "verbs", "nouns", "adjectives", "function_words"])
  for (const e of dict[c] || []) wordLevel.set(e.id, e.level || 1);

const sents2 = JSON.parse(read("data/sentences.seed.json")).sentences;
for (const s of sents2)
  for (const u of s.uses || [])
    if ((wordLevel.get(u) || 1) > (s.level || 1)) abort(`sentence ${s.id} level ${s.level} < word ${u}`);

const texts2 = JSON.parse(read("data/texts.seed.json")).texts;
const cov = {};
for (const t of texts2) {
  const L = t.level || 1;
  cov[L] = cov[L] || { text: 0, dialog: 0 };
  cov[L][t.type === "dialog" ? "dialog" : "text"]++;
}
for (const [L, c] of Object.entries(cov))
  if (c.text < 2 || c.dialog < 2) abort(`level ${L} reading ${c.text}t/${c.dialog}d (<2+2) after text moves`);

console.log(`OK — raised ${sChanged} sentences, moved ${tChanged} texts. Re-parsed + invariants hold.`);
console.log("bumped by:", JSON.stringify(bumpedBy));
