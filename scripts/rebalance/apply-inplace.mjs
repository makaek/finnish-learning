/**
 * apply-inplace.mjs — applies fi-plan.json to the three Finnish seeds with FORMAT-PRESERVING text
 * surgery, so the git diff shows only the meaningful changes (each item's `level` + an added
 * `theme`) instead of a full reformat. Safe: output is re-parsed and the result is validated.
 *
 * - dictionary: brace-aware entry scan (handles one-line AND multi-line verb entries) → patch the
 *   `level` number, append `,"theme":"…"` before the entry's closing brace.
 * - sentences/texts: each has a `"level": N` on its own line → replace the number + insert a
 *   `"theme"` line after it (sentence level/theme derived from its words; text from the plan).
 * Run: `node scripts/rebalance/apply-inplace.mjs`
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

const plan = JSON.parse(read("scripts/rebalance/fi-plan.json"));
const wordMap = new Map();
for (const lv of plan.levels)
  for (const th of lv.themes) for (const id of th.wordIds) wordMap.set(id, { level: lv.level, theme: th.id });
const textMap = new Map(Object.entries(plan.texts));

// sentence level/theme derived from the words it `uses`
const sentJson = JSON.parse(read("data/sentences.seed.json"));
const sentMap = new Map();
for (const s of sentJson.sentences) {
  const used = (s.uses || []).map((id) => wordMap.get(id)).filter(Boolean);
  if (used.length === 0) continue;
  const maxLevel = Math.max(...used.map((u) => u.level));
  // theme = the (first, in `uses` order) word at the sentence's top level — the level it "lives" at.
  const theme = used.find((u) => u.level === maxLevel).theme;
  sentMap.set(s.id, { level: maxLevel, theme });
}

/** Net brace depth of a line, ignoring braces inside JSON strings. */
function depthOf(line) {
  let d = 0,
    inStr = false,
    esc = false;
  for (const c of line) {
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\") {
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "{") d++;
    else if (c === "}") d--;
  }
  return d;
}

// --- dictionary -------------------------------------------------------------------------
function patchDict() {
  const raw = read("data/dictionary.seed.json");
  const eol = eolOf(raw);
  const lines = raw.split(/\r?\n/);
  const out = [];
  let touched = 0;
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (/^ {4}\{/.test(line) && /"id":\s*"?\w/.test(line.slice(0, 60))) {
      // collect the (possibly multi-line) entry until braces balance
      const block = [line];
      let depth = depthOf(line);
      let j = i;
      while (depth > 0 && j + 1 < lines.length) {
        j++;
        block.push(lines[j]);
        depth += depthOf(lines[j]);
      }
      let text = block.join(eol);
      const id = (text.match(/"id":\s*"(\w+)"/) || [])[1];
      const m = id && wordMap.get(id);
      if (m) {
        if (/"level":/.test(text)) text = text.replace(/("level":)\s*\d+/, `$1${m.level}`);
        else text = text.replace(/("pos":\s*"[^"]*")/, `$1,"level":${m.level}`);
        const close = text.lastIndexOf("}");
        if (/"theme":/.test(text)) text = text.replace(/("theme":)\s*"[^"]*"/, `$1"${m.theme}"`);
        else text = text.slice(0, close) + `,"theme":"${m.theme}"` + text.slice(close);
        touched++;
      }
      out.push(...text.split(eol));
      i = j + 1;
    } else {
      out.push(line);
      i++;
    }
  }
  fs.writeFileSync(P("data/dictionary.seed.json"), out.join(eol));
  return touched;
}

// --- sentences / texts: per-line level replace + theme insert ---------------------------
function patchLevelLines(file, idRe, map) {
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
    if (lm && cur && map.has(cur)) {
      const { level, theme } = map.get(cur);
      // `lm[2]` is the comma that followed the original `level` (empty if it was the LAST field).
      // When inserting `theme` after it, `theme` inherits that trailing comma (so we never emit an
      // invalid trailing comma) and `level` always gets one because `theme` now follows it.
      if (theme) {
        out.push(`${lm[1]}"level": ${level},`);
        out.push(`${lm[1]}"theme": ${JSON.stringify(theme)}${lm[2]}`);
      } else {
        out.push(`${lm[1]}"level": ${level}${lm[2]}`);
      }
      touched++;
      cur = null; // one level line per item
      continue;
    }
    out.push(line);
  }
  fs.writeFileSync(P(file), out.join(eol));
  return touched;
}

const d = patchDict();
const s = patchLevelLines("data/sentences.seed.json", /^ {6}"id":\s*"(s\d+)"/, sentMap);
const t = patchLevelLines("data/texts.seed.json", /^ {6}"id":\s*"(t\d+)"/, textMap);

// --- validate the result parses and matches the plan -----------------------------------
const dict = JSON.parse(read("data/dictionary.seed.json"));
let dictWords = 0;
for (const c of ["pronouns", "verbs", "nouns", "adjectives", "function_words"])
  for (const e of dict[c] || []) {
    const m = wordMap.get(e.id);
    if (!m) abort(`word ${e.id} not in plan`);
    if (e.level !== m.level || e.theme !== m.theme) abort(`word ${e.id} not patched: ${e.level}/${e.theme}`);
    dictWords++;
  }
const texts = JSON.parse(read("data/texts.seed.json"));
for (const x of texts.texts) {
  const m = textMap.get(x.id);
  if (!m || x.level !== m.level || x.theme !== m.theme) abort(`text ${x.id} not patched`);
}
const sents = JSON.parse(read("data/sentences.seed.json"));
for (const x of sents.sentences) {
  const m = sentMap.get(x.id);
  if (m && (x.level !== m.level || x.theme !== m.theme)) abort(`sentence ${x.id} not patched`);
  for (const u of x.uses || []) if (wordMap.get(u) && wordMap.get(u).level > (x.level || 1)) abort(`sentence ${x.id} level < word ${u}`);
}
console.log(`OK (format-preserving) — dict ${d}/${dictWords} words, ${s} sentences, ${t} texts patched. All re-parsed + validated.`);
