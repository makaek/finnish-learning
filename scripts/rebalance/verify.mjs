/**
 * verify.mjs — sanity-checks scripts/rebalance/fi-plan.json against the LIVE Finnish seeds
 * (no extract files): full word coverage, no duplicate ids, ≤50 words/level, bands ascending,
 * and ≥2 texts + ≥2 dialogs per level. Run: `node scripts/rebalance/verify.mjs`
 */
import fs from "node:fs";

const root = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p) => JSON.parse(fs.readFileSync(root + p, "utf8"));

const plan = read("scripts/rebalance/fi-plan.json");
const dict = read("data/dictionary.seed.json");
const texts = read("data/texts.seed.json").texts;

const CATS = ["pronouns", "verbs", "nouns", "adjectives", "function_words"];
const allIds = new Set(CATS.flatMap((c) => (dict[c] || []).map((w) => w.id)));

// --- word assignment: duplicates, per-level counts, coverage ------------------------------
const seen = new Map(); // id -> level
const cnt = new Map(); // level -> word count
const dupes = [];
for (const lvl of plan.levels) {
  for (const th of lvl.themes) {
    for (const id of th.wordIds) {
      if (seen.has(id)) dupes.push(`${id} in L${lvl.level} & L${seen.get(id)}`);
      seen.set(id, lvl.level);
      cnt.set(lvl.level, (cnt.get(lvl.level) || 0) + 1);
    }
  }
}
const missing = [...allIds].filter((id) => !seen.has(id));
const extra = [...seen.keys()].filter((id) => !allIds.has(id));

console.log("LEVELS:", plan.levels.length);
console.log("max words:", Math.max(...cnt.values()));
console.log("counts:", plan.levels.map((l) => `L${l.level}:${cnt.get(l.level) || 0}`).join("  "));
const oversized = plan.levels.filter((l) => (cnt.get(l.level) || 0) > 50);
console.log("oversized (>50):", oversized.map((l) => `L${l.level}=${cnt.get(l.level)}`).join(", ") || "none");
console.log("total assigned:", seen.size, "/ expected", allIds.size);
console.log("DUPES:", dupes.length ? dupes.join("; ") : "none");
console.log("MISSING:", missing.length ? missing.join(", ") : "none");
console.log("EXTRA(not in dictionary):", extra.length ? extra.join(", ") : "none");

// --- band contiguity ----------------------------------------------------------------------
const bands = plan.levels.map((l) => l.band);
console.log("bands:", bands.join(" "));
const order = ["A1.1", "A1.2", "A1.3", "A2.1", "A2.2"];
let lastIdx = -1;
let bandOk = true;
for (const b of bands) {
  const i = order.indexOf(b);
  if (i < 0 || i < lastIdx) bandOk = false;
  lastIdx = Math.max(lastIdx, i);
}
console.log("bands known/ascending:", bandOk);

// --- texts coverage -----------------------------------------------------------------------
const typeById = Object.fromEntries(texts.map((t) => [t.id, t.type]));
const assigned = plan.texts || {};
const tMissing = texts.filter((t) => !(t.id in assigned)).map((t) => t.id);
const tExtra = Object.keys(assigned).filter((id) => !(id in typeById));
console.log("TEXTS total:", texts.length, "assigned:", Object.keys(assigned).length);
console.log("TEXTS missing:", tMissing.length ? tMissing.join(", ") : "none");
console.log("TEXTS extra:", tExtra.length ? tExtra.join(", ") : "none");
// per-level text/dialog counts (≥2 of each per level)
const perLvl = {};
for (const [tid, info] of Object.entries(assigned)) {
  const ty = typeById[tid];
  if (!ty) continue; // unknown id — already reported as EXTRA
  const p = (perLvl[info.level] ||= { text: 0, dialog: 0 });
  p[ty] = (p[ty] || 0) + 1;
}
let covOk = true;
for (let L = 1; L <= plan.levels.length; L++) {
  const p = perLvl[L] || { text: 0, dialog: 0 };
  const ok = p.text >= 2 && p.dialog >= 2;
  if (!ok) covOk = false;
  console.log(`  L${L}: text=${p.text} dialog=${p.dialog} ${ok ? "" : "<-- FAIL"}`);
}
console.log("TEXT COVERAGE ok:", covOk);
