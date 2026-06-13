/**
 * grammar.ts — pure model for the «Грамматика» mode (design_handoff_grammar).
 *
 * A prerequisite-gated tree of short lessons (Модули → Темы → Урок), each lesson the fixed
 * sequence Теория → Разминка → Дрилл over six precomputed-graded item types. Content lives in
 * data/grammar.seed.json (authored/verified by the finnish-linguist); this module owns:
 *   • flattening/validating the seed into typed topics + items,
 *   • the two markup conventions (letter highlights in Finnish forms, *fi* runs in Russian copy),
 *   • typed-answer grading with near-miss detection (Levenshtein ≤ 1),
 *   • per-topic mastery/locking over the existing ProgressMap (one record per topic,
 *     kind "grammar"), and the lesson→box progression,
 *   • the end-of-lesson summary inputs (score, review patterns, newly unlocked topics).
 *
 * PURE: no UI/DB imports — the data boundary lives in src/data/grammar.ts.
 */

import { normalizeFi } from "./normalize";
import {
  getProgress,
  MAX_BOX,
  MIN_BOX,
  type ItemProgress,
  type ProgressMap,
} from "./progress";

/** The progress track grammar topics record under (one record per TOPIC, not per item). */
export const GRAMMAR_KIND = "grammar" as const;

/* ===================================================================== content types */

/** Concept-tag vocabulary (colour roles are fixed app-wide — see the gtag CSS). */
export type GrammarTag = "verbtype" | "case" | "grad" | "neg" | "part" | "vh";

export type GrammarStage = "warmup" | "drill";

export interface GrammarExample {
  fi: string;
  ru: string;
}

/** One row of a theory paradigm table; `f` carries the highlight markup. */
export interface ParadigmRow {
  /** Left cell: person/question label ("minä", "где?"). */
  l: string;
  /** Right cell: the Finnish form, with `{…}`/`[…]` highlight markup. */
  f: string;
  /** Optional inline Russian gloss after the form. */
  ru?: string;
}

export interface ParadigmKey {
  hl: "main" | "alt";
  label: string;
}

export interface GrammarParadigm {
  caption: string;
  rows: ParadigmRow[];
  key: ParadigmKey[];
}

export interface GrammarTheory {
  title: string;
  summary: string;
  /** Russian body; `*…*` marks Finnish fragments. */
  bodyRu: string;
  examples: GrammarExample[];
  paradigm?: GrammarParadigm;
  /** Optional info explanation block under the table. */
  noteRu?: string;
}

export interface GrammarTopic {
  id: string;
  module: string;
  order: number;
  title: string;
  summary: string;
  /** Curriculum level (1-based) the topic belongs to — feeds level completion + the gate. */
  level: number;
  tags: GrammarTag[];
  /** Topic ids that must be MASTERED before this topic unlocks. */
  prereq: string[];
  /** Rule ids in the «Правила» book this lesson cross-links to. */
  ruleIds: string[];
  theory: GrammarTheory;
}

export interface GrammarModule {
  id: string;
  title: string;
  /** 1-based display number («МОДУЛЬ 1»). */
  n: number;
}

/* ------------------------------------------------------------------------- items */

interface ItemBase {
  id: string;
  topic: string;
  stage: GrammarStage;
  /** Variant assessment set this item belongs to (1-based). A lesson run drills ONE set;
   *  runs rotate sets, so mastery (2 strong runs) requires passing 2 DIFFERENT sets. */
  set: number;
  /** Short error-pattern label for the summary «Повторите» list (shared across items). */
  reviewRu?: string;
}

/** Multiple choice over Russian option labels (verb types, case names). */
export interface ChoiceRuItem extends ItemBase {
  type: "classify" | "case_id";
  /** The Finnish word/sentence under question (case_id carries `{…}` ending markup). */
  promptFi: string;
  /** The Russian question («какой это тип глагола?»). */
  promptRu: string;
  optionsRu: string[];
  /** 0-based index of the correct option. */
  answer: number;
  /** Per-wrong-option Russian reasons, keyed by 0-based option index. */
  reasonsRu: Record<number, string>;
  okRu: string;
  /** Shown after a wrong pick («Правильный ответ — …»). */
  correctRu: string;
}

export interface ChooseFormOption {
  fi: string;
  whyRu?: string;
}

/** Multiple choice over Finnish forms filling a gap in the prompt. */
export interface ChooseFormItem extends ItemBase {
  type: "choose_form";
  /** Finnish sentence with a `___` gap. */
  promptFi: string;
  hintRu?: string;
  options: ChooseFormOption[];
  /** The correct option's `fi`. */
  answer: string;
  okRu: string;
}

export interface WrongPattern {
  /** Predicted wrong answer (natural spelling; matched normalized). */
  match: string;
  ru: string;
}

/** Typed production: a single form (produce_form) or a whole phrase (transform). */
export interface TypedFormItem extends ItemBase {
  type: "produce_form" | "transform";
  promptFi: string;
  promptRu?: string;
  hintRu?: string;
  /** The canonical answer with highlight markup (display only). */
  canonical: string;
  /** Accepted answers, plain spelling. */
  accepted: string[];
  wrong: WrongPattern[];
  okRu: string;
  /** Fallback near-miss copy when no `wrong` pattern matched. */
  nearRu?: string;
}

export interface FillCell {
  l: string;
  canonical: string;
  accepted: string[];
}

/** Complete a paradigm: N independent typed cells, graded per cell. */
export interface FillTableItem extends ItemBase {
  type: "fill_table";
  promptFi: string;
  promptRu?: string;
  hintRu?: string;
  cells: FillCell[];
  summaryRu?: string;
}

export type GrammarItem = ChoiceRuItem | ChooseFormItem | TypedFormItem | FillTableItem;

export interface GrammarContent {
  modules: GrammarModule[];
  topics: GrammarTopic[];
  items: GrammarItem[];
}

/* ===================================================================== seed parsing */

/** Only the fields we read are typed; everything is validated defensively (like rules.ts). */
export interface RawGrammarFile {
  modules?: unknown;
  topics?: unknown;
  items?: unknown;
}

const TAGS: readonly GrammarTag[] = ["verbtype", "case", "grad", "neg", "part", "vh"];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseExamples(v: unknown): GrammarExample[] {
  if (!Array.isArray(v)) return [];
  const out: GrammarExample[] = [];
  for (const e of v) {
    if (e && typeof e === "object") {
      const { fi, ru } = e as { fi?: unknown; ru?: unknown };
      if (typeof fi === "string" && typeof ru === "string") out.push({ fi, ru });
    }
  }
  return out;
}

function parseParadigm(v: unknown): GrammarParadigm | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { caption, rows, key } = v as { caption?: unknown; rows?: unknown; key?: unknown };
  if (!Array.isArray(rows)) return undefined;
  const parsedRows: ParadigmRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const { l, f, ru } = r as { l?: unknown; f?: unknown; ru?: unknown };
    if (typeof l === "string" && typeof f === "string") {
      parsedRows.push({ l, f, ...(typeof ru === "string" ? { ru } : {}) });
    }
  }
  if (parsedRows.length === 0) return undefined;
  const parsedKey: ParadigmKey[] = [];
  if (Array.isArray(key)) {
    for (const k of key) {
      if (!k || typeof k !== "object") continue;
      const { hl, label } = k as { hl?: unknown; label?: unknown };
      if ((hl === "main" || hl === "alt") && typeof label === "string") {
        parsedKey.push({ hl, label });
      }
    }
  }
  return { caption: str(caption) ?? "", rows: parsedRows, key: parsedKey };
}

function parseTheory(v: unknown): GrammarTheory | undefined {
  if (!v || typeof v !== "object") return undefined;
  const t = v as Record<string, unknown>;
  const title = str(t.title);
  const bodyRu = str(t.body_ru);
  if (!title || !bodyRu) return undefined;
  return {
    title,
    summary: str(t.summary) ?? "",
    bodyRu,
    examples: parseExamples(t.examples),
    paradigm: parseParadigm(t.paradigm),
    noteRu: str(t.note_ru),
  };
}

function parseTopic(v: unknown): GrammarTopic | undefined {
  if (!v || typeof v !== "object") return undefined;
  const t = v as Record<string, unknown>;
  const id = str(t.id);
  const module = str(t.module);
  const title = str(t.title);
  const theory = parseTheory(t.theory);
  if (!id || !module || !title || !theory) return undefined;
  return {
    id,
    module,
    order: typeof t.order === "number" ? t.order : 0,
    title,
    summary: str(t.summary) ?? "",
    level: typeof t.level === "number" && t.level >= 1 ? Math.floor(t.level) : 1,
    tags: (isStringArray(t.tags) ? t.tags : []).filter((x): x is GrammarTag =>
      (TAGS as readonly string[]).includes(x),
    ),
    prereq: isStringArray(t.prereq) ? t.prereq : [],
    ruleIds: isStringArray(t.rule_ids) ? t.rule_ids : [],
    theory,
  };
}

function parseWrong(v: unknown): WrongPattern[] {
  if (!Array.isArray(v)) return [];
  const out: WrongPattern[] = [];
  for (const w of v) {
    if (!w || typeof w !== "object") continue;
    const { match, ru } = w as { match?: unknown; ru?: unknown };
    if (typeof match === "string" && typeof ru === "string") out.push({ match, ru });
  }
  return out;
}

function parseReasons(v: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && typeof val === "string") out[idx] = val;
    }
  }
  return out;
}

function parseItem(v: unknown): GrammarItem | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  const id = str(r.id);
  const topic = str(r.topic);
  const stage: GrammarStage | undefined =
    r.stage === "warmup" ? "warmup" : r.stage === "drill" ? "drill" : undefined;
  const type = str(r.type);
  if (!id || !topic || !stage || !type) return undefined;
  const set = typeof r.set === "number" && r.set >= 1 ? Math.floor(r.set) : 1;
  const base = { id, topic, stage, set, reviewRu: str(r.review_ru) };

  if (type === "classify" || type === "case_id") {
    const promptFi = str(r.prompt_fi);
    const promptRu = str(r.prompt_ru);
    const okRu = str(r.ok_ru);
    const correctRu = str(r.correct_ru);
    if (!promptFi || !promptRu || !okRu || !correctRu) return undefined;
    if (!isStringArray(r.options_ru) || typeof r.answer !== "number") return undefined;
    if (r.answer < 0 || r.answer >= r.options_ru.length) return undefined;
    return {
      ...base,
      type,
      promptFi,
      promptRu,
      optionsRu: r.options_ru,
      answer: r.answer,
      reasonsRu: parseReasons(r.reasons_ru),
      okRu,
      correctRu,
    };
  }

  if (type === "choose_form") {
    const promptFi = str(r.prompt_fi);
    const okRu = str(r.ok_ru);
    const answer = str(r.answer);
    if (!promptFi || !okRu || !answer || !Array.isArray(r.options)) return undefined;
    const options: ChooseFormOption[] = [];
    for (const o of r.options) {
      if (!o || typeof o !== "object") continue;
      const { fi, why_ru } = o as { fi?: unknown; why_ru?: unknown };
      if (typeof fi === "string") options.push({ fi, whyRu: str(why_ru) });
    }
    if (options.length < 2 || !options.some((o) => o.fi === answer)) return undefined;
    return { ...base, type, promptFi, hintRu: str(r.hint_ru), options, answer, okRu };
  }

  if (type === "produce_form" || type === "transform") {
    const promptFi = str(r.prompt_fi);
    const canonical = str(r.canonical);
    const okRu = str(r.ok_ru);
    if (!promptFi || !canonical || !okRu || !isStringArray(r.accepted) || r.accepted.length === 0)
      return undefined;
    return {
      ...base,
      type,
      promptFi,
      promptRu: str(r.prompt_ru),
      hintRu: str(r.hint_ru),
      canonical,
      accepted: r.accepted,
      wrong: parseWrong(r.wrong),
      okRu,
      nearRu: str(r.near_ru),
    };
  }

  if (type === "fill_table") {
    const promptFi = str(r.prompt_fi);
    if (!promptFi || !Array.isArray(r.cells)) return undefined;
    const cells: FillCell[] = [];
    for (const c of r.cells) {
      if (!c || typeof c !== "object") continue;
      const { l, canonical, accepted } = c as { l?: unknown; canonical?: unknown; accepted?: unknown };
      if (typeof l === "string" && typeof canonical === "string" && isStringArray(accepted) && accepted.length > 0) {
        cells.push({ l, canonical, accepted });
      }
    }
    if (cells.length === 0) return undefined;
    return {
      ...base,
      type,
      promptFi,
      promptRu: str(r.prompt_ru),
      hintRu: str(r.hint_ru),
      cells,
      summaryRu: str(r.summary_ru),
    };
  }

  return undefined;
}

/**
 * Flatten the seed into validated content, skipping malformed entries (a partial seed still
 * yields a usable mode). Topics keep their module grouping; ordering is `order` then seed order.
 */
export function flattenGrammar(raw: RawGrammarFile): GrammarContent {
  const modules: GrammarModule[] = [];
  if (Array.isArray(raw.modules)) {
    for (const m of raw.modules) {
      if (!m || typeof m !== "object") continue;
      const { id, title, n } = m as { id?: unknown; title?: unknown; n?: unknown };
      if (typeof id === "string" && typeof title === "string") {
        modules.push({ id, title, n: typeof n === "number" ? n : modules.length + 1 });
      }
    }
  }
  const topics: GrammarTopic[] = [];
  if (Array.isArray(raw.topics)) {
    for (const t of raw.topics) {
      const parsed = parseTopic(t);
      if (parsed) topics.push(parsed);
    }
  }
  topics.sort((a, b) => a.order - b.order);
  const items: GrammarItem[] = [];
  if (Array.isArray(raw.items)) {
    for (const i of raw.items) {
      const parsed = parseItem(i);
      if (parsed) items.push(parsed);
    }
  }
  return { modules, topics, items };
}

/* ===================================================================== markup parsing */

/** A run of a Finnish form: plain text or a highlighted ending/gradation span. */
export interface FormSegment {
  text: string;
  /** undefined = plain; "main" = `{…}` (окончание); "alt" = `[…]` (чередование). */
  hl?: "main" | "alt";
}

/** Parse `{…}` / `[…]` highlight markup in a Finnish form into renderable segments. */
export function parseForm(s: string): FormSegment[] {
  const out: FormSegment[] = [];
  let plain = "";
  const flush = () => {
    if (plain) {
      out.push({ text: plain });
      plain = "";
    }
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const close = ch === "{" ? "}" : ch === "[" ? "]" : undefined;
    if (close) {
      const end = s.indexOf(close, i + 1);
      if (end > i) {
        flush();
        out.push({ text: s.slice(i + 1, end), hl: ch === "{" ? "main" : "alt" });
        i = end;
        continue;
      }
    }
    plain += ch;
  }
  flush();
  return out;
}

/** Strip highlight markup, leaving the plain Finnish form. */
export function stripForm(s: string): string {
  return parseForm(s)
    .map((seg) => seg.text)
    .join("");
}

/** A run of Russian copy: plain text or a `*…*` Finnish fragment. */
export interface RuSegment {
  text: string;
  fi: boolean;
}

/** Parse `*…*` Finnish-fragment markup in Russian copy. */
export function parseRu(s: string): RuSegment[] {
  const parts = s.split("*");
  // Odd indices sit inside *…* pairs. With an UNBALANCED star count (parts.length even),
  // the final part has no closing star — degrade it to plain text instead of styling it.
  const unbalanced = parts.length % 2 === 0;
  const out: RuSegment[] = [];
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i]!;
    if (text.length === 0) continue;
    out.push({ text, fi: i % 2 === 1 && !(unbalanced && i === parts.length - 1) });
  }
  return out;
}

/* ===================================================================== typed grading */

/** Bounded Levenshtein distance (returns 2 for anything ≥ 2 — we only care about 0/1). */
export function editDistanceCapped(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  // One-row DP with early exit once the row minimum exceeds 1.
  const m = b.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > 1) return 2;
    prev = cur;
  }
  return Math.min(2, prev[m]!);
}

export type Verdict = "correct" | "near" | "wrong";

export interface TypedGrade {
  verdict: Verdict;
  /** Russian explanation: ok copy, a matched wrong-pattern reason, or the near fallback. */
  explainRu?: string;
}

/**
 * Grade a typed answer against a produce_form/transform item: exact (normalized) accepted
 * match → correct; otherwise the verdict is "near" when the answer is one edit away from an
 * accepted form (incl. ä↔a / ö↔o slips — they're single substitutions), else "wrong". The
 * explanation prefers a matched predicted-error pattern (sharp, rule-specific) over the
 * generic near fallback.
 */
export function gradeTyped(input: string, item: TypedFormItem): TypedGrade {
  const norm = normalizeFi(input);
  if (item.accepted.some((a) => normalizeFi(a) === norm)) {
    return { verdict: "correct", explainRu: item.okRu };
  }
  const pattern = item.wrong.find((w) => normalizeFi(w.match) === norm);
  const near = item.accepted.some((a) => editDistanceCapped(normalizeFi(a), norm) === 1);
  return {
    verdict: near ? "near" : "wrong",
    explainRu: pattern?.ru ?? (near ? item.nearRu : undefined),
  };
}

/** Grade one fill_table cell (no near-miss at cell granularity — red + correction line). */
export function gradeCell(input: string, cell: FillCell): boolean {
  const norm = normalizeFi(input);
  return cell.accepted.some((a) => normalizeFi(a) === norm);
}

/**
 * Display order for a choice item's options. `case_id` options are AUTHORED canonical-first
 * (answer at index 0), so showing them as-is would teach "always tap the first option" — they
 * get a deterministic shuffle seeded by the item id (stable across renders/sessions, varied
 * across items). `classify` options are a fixed semantic scale («Тип 1…Тип 6») and keep their
 * order. Returns original-option indices in display order.
 */
export function choiceOrder(item: ChoiceRuItem): number[] {
  const idx = item.optionsRu.map((_, i) => i);
  if (item.type !== "case_id") return idx;
  // FNV-1a over the id → mulberry32 → Fisher–Yates: tiny, dependency-free, deterministic.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < item.id.length; i++) {
    h ^= item.id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx;
}

/* ===================================================================== topic mastery */

/** A topic is MASTERED at this box (two strong lesson runs from scratch). */
export const GRAMMAR_MASTERED_BOX = 4;
/** Lesson score fractions: at/above GOOD the box climbs 2; at/above OK it climbs 1. */
export const LESSON_GOOD = 0.85;
export const LESSON_OK = 0.6;

export type TopicState = "locked" | "available" | "in-progress" | "mastered";

/** Topic mastery toward GRAMMAR_MASTERED_BOX, in [0, 1] (1 = mastered). */
export function topicMasteryPct(progress: ProgressMap, topicId: string): number {
  const box = getProgress(progress, GRAMMAR_KIND, topicId).box;
  return Math.min(1, box / GRAMMAR_MASTERED_BOX);
}

export function topicMastered(progress: ProgressMap, topicId: string): boolean {
  return getProgress(progress, GRAMMAR_KIND, topicId).box >= GRAMMAR_MASTERED_BOX;
}

/**
 * Derive every topic's state: locked (a prereq isn't mastered yet), mastered, in-progress
 * (attempted: box > 0 or any lesson run recorded), or available. A prereq id that doesn't
 * exist in the topic list is ignored (content typo shouldn't brick a topic).
 */
export function topicStates(
  topics: readonly GrammarTopic[],
  progress: ProgressMap,
): Map<string, TopicState> {
  const ids = new Set(topics.map((t) => t.id));
  const out = new Map<string, TopicState>();
  for (const t of topics) {
    if (topicMastered(progress, t.id)) {
      out.set(t.id, "mastered");
      continue;
    }
    const locked = t.prereq.some((p) => ids.has(p) && !topicMastered(progress, p));
    if (locked) {
      out.set(t.id, "locked");
      continue;
    }
    const rec = getProgress(progress, GRAMMAR_KIND, t.id);
    out.set(t.id, rec.box > MIN_BOX || rec.totalSeen > 0 ? "in-progress" : "available");
  }
  return out;
}

/**
 * Fold a finished lesson into the topic's progress record. A strong run (≥ LESSON_GOOD of
 * items right first-try) climbs 2 boxes, a decent one (≥ LESSON_OK) climbs 1, a weak one
 * drops 1 — so two strong runs master a fresh topic, and mastery decays if revisits go badly.
 * Counters track lesson RUNS (totalSeen += 1), not items.
 */
export function applyLessonOutcome(
  prev: ItemProgress,
  score: number,
  total: number,
  now: number,
): ItemProgress {
  const frac = total > 0 ? score / total : 0;
  const delta = frac >= LESSON_GOOD ? 2 : frac >= LESSON_OK ? 1 : -1;
  const good = delta > 0;
  return {
    ...prev,
    kind: GRAMMAR_KIND,
    box: Math.max(MIN_BOX, Math.min(MAX_BOX, prev.box + delta)),
    correctStreak: good ? prev.correctStreak + 1 : 0,
    totalCorrect: prev.totalCorrect + (good ? 1 : 0),
    totalSeen: prev.totalSeen + 1,
    lastSeen: now,
  };
}

/* ===================================================================== lesson assembly */

/**
 * A topic's lesson: its warmup items then its drill items, in authored (seed) order.
 * With `set` given, only that variant set's items; without it, every set (integrity checks).
 */
export function lessonItems(
  items: readonly GrammarItem[],
  topicId: string,
  set?: number,
): GrammarItem[] {
  const mine = items.filter((i) => i.topic === topicId && (set === undefined || i.set === set));
  return [...mine.filter((i) => i.stage === "warmup"), ...mine.filter((i) => i.stage === "drill")];
}

/** How many variant sets a topic has (≥ 1; the max `set` among its items). */
export function setCount(items: readonly GrammarItem[], topicId: string): number {
  let max = 1;
  for (const i of items) if (i.topic === topicId && i.set > max) max = i.set;
  return max;
}

/**
 * Which variant set the NEXT lesson run should drill: rotates with the run count
 * (`totalSeen` counts runs), so consecutive runs — and therefore the two strong runs
 * mastery requires — always hit different sets when more than one exists.
 */
export function activeSet(progress: ProgressMap, topicId: string, count: number): number {
  if (count <= 1) return 1;
  return (getProgress(progress, GRAMMAR_KIND, topicId).totalSeen % count) + 1;
}

/* ===================================================================== rollups */

export interface GrammarStats {
  /** Topics mastered / total topics. */
  mastered: number;
  total: number;
  /** Mean topic mastery in [0, 1] — the ring-spoke fill. */
  mastery: number;
  /** Topics not yet mastered that are startable now (available or in-progress). */
  remaining: number;
}

export function grammarStats(topics: readonly GrammarTopic[], progress: ProgressMap): GrammarStats {
  if (topics.length === 0) return { mastered: 0, total: 0, mastery: 1, remaining: 0 };
  const states = topicStates(topics, progress);
  let mastered = 0;
  let remaining = 0;
  let sum = 0;
  for (const t of topics) {
    const st = states.get(t.id);
    if (st === "mastered") mastered += 1;
    else if (st !== "locked") remaining += 1;
    sum += topicMasteryPct(progress, t.id);
  }
  return { mastered, total: topics.length, mastery: sum / topics.length, remaining };
}

/**
 * The weakest startable topic — lowest mastery among available/in-progress topics (ties →
 * curriculum order), or undefined when everything reachable is mastered. Drives the home
 * action card and the topic-map hero sub-line.
 */
export function weakestTopic(
  topics: readonly GrammarTopic[],
  progress: ProgressMap,
): GrammarTopic | undefined {
  const states = topicStates(topics, progress);
  let best: GrammarTopic | undefined;
  let bestPct = Infinity;
  for (const t of topics) {
    const st = states.get(t.id);
    if (st !== "available" && st !== "in-progress") continue;
    const pct = topicMasteryPct(progress, t.id);
    if (pct < bestPct) {
      bestPct = pct;
      best = t;
    }
  }
  return best;
}

/**
 * The grammar topic the learner should do NEXT to advance, given the gated current level:
 * the weakest STARTABLE (available/in-progress) topic AT that level — the one whose mastery
 * is gating the level's grammar spoke. When the current level's grammar is fully done (or it
 * has none), it scans forward to the lowest higher level that still has a startable, not-yet-
 * mastered topic. Returns undefined only when nothing reachable is left to drill (→ callers
 * open the topic map instead of deep-linking a lesson). Ties break on curriculum order.
 *
 * This is the level-anchored counterpart to {@link weakestTopic} (which ignores levels): the
 * home grammar entry uses THIS so a tap jumps straight into the lesson blocking the next level.
 */
export function mandatoryGrammarTopic(
  topics: readonly GrammarTopic[],
  progress: ProgressMap,
  gatedLevel: number,
): GrammarTopic | undefined {
  const states = topicStates(topics, progress);
  const weakestAt = (level: number): GrammarTopic | undefined => {
    let best: GrammarTopic | undefined;
    let bestPct = Infinity;
    for (const t of topics) {
      if (t.level !== level) continue;
      const st = states.get(t.id);
      if (st !== "available" && st !== "in-progress") continue;
      const pct = topicMasteryPct(progress, t.id);
      if (pct < bestPct) {
        bestPct = pct;
        best = t;
      }
    }
    return best;
  };
  const here = weakestAt(gatedLevel);
  if (here) return here;
  // Current level's grammar is done (or empty) — jump to the next level that still has work.
  const higher = [...new Set(topics.map((t) => t.level))].filter((l) => l > gatedLevel).sort((a, b) => a - b);
  for (const level of higher) {
    const next = weakestAt(level);
    if (next) return next;
  }
  return undefined;
}

/**
 * Topics that BECOME unlocked by mastering `masteredId` — i.e. were locked before and are
 * non-locked in the updated progress. Drives the summary's «Открыта тема» banner.
 */
export function newlyUnlocked(
  topics: readonly GrammarTopic[],
  before: ProgressMap,
  after: ProgressMap,
): GrammarTopic[] {
  const prev = topicStates(topics, before);
  const next = topicStates(topics, after);
  return topics.filter((t) => prev.get(t.id) === "locked" && next.get(t.id) !== "locked");
}

/* ===================================================================== summary review */

export interface ReviewPattern {
  label: string;
  count: number;
}

/**
 * Group the lesson's missed items by their `review_ru` error-pattern label, most frequent
 * first — the «Повторите» list. Items without a label are skipped (nothing useful to say).
 */
export function reviewPatterns(missed: readonly GrammarItem[]): ReviewPattern[] {
  const counts = new Map<string, number>();
  for (const item of missed) {
    if (!item.reviewRu) continue;
    counts.set(item.reviewRu, (counts.get(item.reviewRu) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Russian plural for «ошибка»: 1 ошибка · 2–4 ошибки · 5+ ошибок (11–14 → ошибок). */
export function errorWord(n: number): string {
  const t = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 14) return "ошибок";
  if (t === 1) return "ошибка";
  if (t >= 2 && t <= 4) return "ошибки";
  return "ошибок";
}
