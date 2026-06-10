/**
 * fi-fill-apply.mjs — appends the finnish-linguist's new "fill" sentences (scripts/rebalance/fi-fill.json)
 * to data/sentences.seed.json to balance the thin early levels. Validates each (id unique + ≥ s541,
 * level = max used-word level, uses resolve, no advanced-grammar tag at an early level), derives its
 * `theme` from its highest-level word, and writes it in the file's existing 2-space style so the diff is
 * pure additions. Run: `node scripts/rebalance/fi-fill-apply.mjs`
 */

import fs from "node:fs";

const root = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const P = (p) => root + p;
const read = (p) => fs.readFileSync(P(p), "utf8");
const abort = (m) => {
  console.error("ABORT:", m);
  process.exit(1);
};

const fill = JSON.parse(read("scripts/rebalance/fi-fill.json")).sentences || [];
const sraw = read("data/sentences.seed.json");
const eol = sraw.includes("\r\n") ? "\r\n" : "\n";
const existing = JSON.parse(sraw).sentences;
const existIds = new Set(existing.map((s) => s.id));

// word level + theme from the (rebalanced) dictionary
const dict = JSON.parse(read("data/dictionary.seed.json"));
const wordLevel = new Map();
const wordTheme = new Map();
for (const c of ["pronouns", "verbs", "nouns", "adjectives", "function_words"])
  for (const e of dict[c] || []) {
    wordLevel.set(e.id, e.level || 1);
    if (e.theme) wordTheme.set(e.id, e.theme);
  }

// advanced-grammar guard (these must NOT appear in the early fills)
const advanced = /imperfect|(^|[^m])past|perfect|conditional|passive/i;

for (const s of fill) {
  if (!/^s\d+$/.test(s.id)) abort(`bad id ${s.id}`);
  if (existIds.has(s.id)) abort(`duplicate id ${s.id}`);
  if (+s.id.slice(1) < 541) abort(`id ${s.id} < s541`);
  if (!s.canonical || !Array.isArray(s.accepted) || s.accepted.length === 0) abort(`${s.id} missing canonical/accepted`);
  const used = (s.uses || []).map((id) => ({ id, level: wordLevel.get(id), theme: wordTheme.get(id) }));
  for (const u of used) if (u.level === undefined) abort(`${s.id} uses unknown word ${u.id}`);
  const maxLevel = used.length ? Math.max(...used.map((u) => u.level)) : 1;
  if (s.level !== maxLevel) abort(`${s.id} level ${s.level} != max used-word level ${maxLevel}`);
  if (advanced.test(s.teaches || "")) abort(`${s.id} has advanced-grammar tag at L${s.level}: "${s.teaches}"`);
  // derive theme from the highest-level used word
  s.theme = used.length ? used.find((u) => u.level === maxLevel).theme : undefined;
  existIds.add(s.id);
}

// --- format one sentence in the seed file's style -----------------------------------------
const arr = (a) => "[" + a.map((x) => JSON.stringify(x)).join(", ") + "]";
function fmt(s) {
  const L = [];
  const i4 = "    ", i6 = "      ", i8 = "        ";
  L.push(i4 + "{");
  L.push(i6 + `"id": ${JSON.stringify(s.id)},`);
  L.push(i6 + `"ru": ${JSON.stringify(s.ru)},`);
  L.push(i6 + `"uses": ${arr(s.uses || [])},`);
  L.push(i6 + `"level": ${s.level},`);
  if (s.theme) L.push(i6 + `"theme": ${JSON.stringify(s.theme)},`);
  L.push(i6 + `"canonical": ${JSON.stringify(s.canonical)},`);
  L.push(i6 + `"accepted": ${arr(s.accepted)},`);
  if (!s.wrong || s.wrong.length === 0) {
    L.push(i6 + `"wrong": [],`);
  } else {
    L.push(i6 + `"wrong": [`);
    s.wrong.forEach((w, k) => {
      L.push(i8 + `{ "match": ${JSON.stringify(w.match)}, "ru": ${JSON.stringify(w.ru)} }${k < s.wrong.length - 1 ? "," : ""}`);
    });
    L.push(i6 + `],`);
  }
  L.push(i6 + `"teaches": ${JSON.stringify(s.teaches || "")},`);
  L.push(i6 + `"needs_review": ${s.needs_review ? "true" : "false"}`);
  L.push(i4 + "}");
  return L.join(eol);
}

// --- insert before the sentences-array close ----------------------------------------------
const marker = eol + "  ]";
const idx = sraw.lastIndexOf(marker);
if (idx < 0) abort("could not find sentences array close");
const out = sraw.slice(0, idx) + "," + eol + fill.map(fmt).join("," + eol) + sraw.slice(idx);
fs.writeFileSync(P("data/sentences.seed.json"), out);

// --- re-parse + validate the whole file ----------------------------------------------------
const after = JSON.parse(read("data/sentences.seed.json")).sentences;
if (after.length !== existing.length + fill.length) abort(`expected ${existing.length + fill.length} sentences, got ${after.length}`);
for (const s of after) for (const u of s.uses || []) if ((wordLevel.get(u) || 1) > (s.level || 1)) abort(`sentence ${s.id} level < word ${u}`);

// report new per-level counts for the filled levels
const by = {};
for (const s of after) by[s.level || 1] = (by[s.level || 1] || 0) + 1;
console.log(`OK — appended ${fill.length} sentences (total ${after.length}). Re-parsed + invariant holds.`);
console.log("L1/L3/L4 now:", JSON.stringify({ 1: by[1], 3: by[3], 4: by[4] }));
