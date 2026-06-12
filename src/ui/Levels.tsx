/**
 * Levels.tsx — «Уровни», the curriculum journey.
 *
 * Two views off one component: `list` (the 12-level timeline grouped into CEFR bands) and `detail`
 * (review a level's words/sentences/texts, Finnish-first). Destructive actions on the current level
 * — mark-passed, clean, and rollback — go through a shared confirm bottom sheet. Level state
 * (done/current/locked) is derived by `levelSummaries`; the writes live in App (`onMarkPassed` /
 * `onCleanLevel`). Reached from the Метрики hero, exits via its own back button — a tab-less screen.
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import type { ReadingText } from "../core/reading";
import { getProgress, type ProgressMap } from "../core/progress";
import {
  levelSummaries,
  levelOf,
  WORD_MODES,
  SENTENCE_MODES,
  LEARNED_BOX,
  type LevelSummary,
} from "../core/levels";
import { levelTitle, bandName } from "../data/levelTitles";
import { THEMES, OTHER_THEME, themeLabel, themeOrder } from "../data/themes";
import { CEFR_ORDER, cefrOfLevel } from "../core/curriculum";
import { hiddenKey, type Group } from "./hidden";
import { UiIcon, type UiIconName } from "./icons";
import type { Mode } from "./Roadmap";

interface LevelsProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  texts: readonly ReadingText[];
  /** Grammar topics ({id, level}) — folded into level completion/status. */
  grammar: readonly { id: string; level?: number }[];
  progress: ProgressMap;
  /** Items swiped «Уже знаю» (the hidden set), keyed by hiddenKey. */
  hidden: ReadonlySet<string>;
  /** Texts/dialogs the learner has opened (read), for the reading status line. */
  read: ReadonlySet<string>;
  onBack: () => void;
  onStart: (mode: Mode) => void;
  onMarkPassed: (level: number) => void;
  /** Reset every track of a level's items (clean / the rollback mechanism). */
  onCleanLevel: (level: number) => void;
  /** Swipe «Уже знаю» on one item: mark its group learned + hide it. */
  onKnown: (group: Group, id: string) => void;
  /** «Вернуть в уроки»: reset one item's progress + unhide it. */
  onResetItem: (group: Group | "text", id: string) => void;
}

type View = "list" | "detail";
/** A pending destructive action awaiting confirmation in the bottom sheet. */
type ConfirmAction = { kind: "mark" | "clean" | "rollback"; level: number };
/** Total items in a level (across groups). */
const totalOf = (s: LevelSummary) =>
  s.counts.words + s.counts.sentences + s.counts.texts + s.counts.grammar;

/** Count chips (words/sentences/texts) shown on each level card and the detail header. */
function Counts({ s, muted }: { s: LevelSummary; muted?: boolean }) {
  const item = (icon: UiIconName, n: number, group: string) => (
    <span className={"lcounts__item" + (muted ? " lcounts__item--muted" : "")}>
      <span className={"lcounts__ic lcounts__ic--" + group}>
        <UiIcon name={icon} size={13} strokeWidth={1.8} />
      </span>
      {n}
    </span>
  );
  return (
    <div className="lcounts">
      {item("star", s.counts.words, "w")}
      {item("chat", s.counts.sentences, "s")}
      {item("book", s.counts.texts, "r")}
      {s.counts.grammar > 0 && item("pen", s.counts.grammar, "g")}
    </div>
  );
}

export default function Levels({
  vocab,
  sentences,
  texts,
  grammar,
  progress,
  hidden,
  read,
  onBack,
  onStart,
  onMarkPassed,
  onCleanLevel,
  onKnown,
  onResetItem,
}: LevelsProps) {
  const [view, setView] = useState<View>("list");
  const [detailLv, setDetailLv] = useState<number>(1);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const summaries = levelSummaries(vocab, sentences, texts, progress, grammar);
  const byLevel = new Map(summaries.map((s) => [s.level, s]));
  const curIdx = summaries.findIndex((s) => s.status === "current");
  const current = curIdx >= 0 ? summaries[curIdx]! : null;
  const doneCount = summaries.filter((s) => s.status === "done").length;

  // Rollback target = the level just below the current one; allowed only once the current level is
  // CLEAN (nothing learned), so stepping back can't strand a half-finished level ahead (no gap).
  const prevLevel = curIdx > 0 ? summaries[curIdx - 1]!.level : null;
  const currentClean = !!current && current.fraction === 0 && current.remaining >= totalOf(current);

  function runConfirm(a: ConfirmAction) {
    if (a.kind === "mark") onMarkPassed(a.level);
    else onCleanLevel(a.level); // clean + rollback both reset a level's items
    setConfirm(null);
  }

  if (view === "detail") {
    const ds = byLevel.get(detailLv)!;
    return (
      <DetailView
        key={ds.level}
        summary={ds}
        vocab={vocab}
        sentences={sentences}
        texts={texts}
        progress={progress}
        hidden={hidden}
        read={read}
        onBack={() => setView("list")}
        // The current level keeps practising its leftovers (Микс); a passed level is reviewed.
        onPractice={() => onStart(ds.status === "current" ? "mix" : "recognition")}
        onKnown={onKnown}
        onResetItem={onResetItem}
      />
    );
  }

  return (
    <main className="app app--scroll lv">
      <div className="lv__backrow">
        <button type="button" className="backbtn" onClick={onBack}>
          <UiIcon name="back" size={17} strokeWidth={2} />
          Метрики
        </button>
      </div>
      <h1 className="prompt prompt--home">Уровни</h1>
      <p className="lv__sub">
        Пройдено {doneCount} из {summaries.length}. Откройте любой пройденный уровень для повторения.
      </p>

      {CEFR_ORDER.map((band) => {
        const bandLevels = summaries.filter((s) => cefrOfLevel(s.level) === band);
        if (bandLevels.length === 0) return null;
        const allDone = bandLevels.every((s) => s.status === "done");
        const active = bandLevels.some((s) => s.status === "current");
        return (
          <div key={band} className="lband">
            <div className="lband__hd">
              <span
                className={
                  "lband__chip" +
                  (active ? " lband__chip--active" : allDone ? " lband__chip--done" : "")
                }
              >
                {band}
              </span>
              <span className="lband__name">{bandName(band)}</span>
              {allDone && <UiIcon name="check" size={15} strokeWidth={2.6} />}
              <span className="lband__rule" />
            </div>
            {bandLevels.map((s, i) => (
              <LevelRow
                key={s.level}
                s={s}
                last={band === CEFR_ORDER[CEFR_ORDER.length - 1] && i === bandLevels.length - 1}
                onOpenDetail={() => {
                  setDetailLv(s.level);
                  setView("detail");
                }}
                onContinue={() => onStart("mix")}
                onMark={() => setConfirm({ kind: "mark", level: s.level })}
                onClean={() => setConfirm({ kind: "clean", level: s.level })}
                onRollback={
                  prevLevel !== null ? () => setConfirm({ kind: "rollback", level: prevLevel }) : undefined
                }
                canRollback={currentClean}
                prevLevel={prevLevel}
              />
            ))}
          </div>
        );
      })}

      {confirm && (
        <ConfirmDialog
          action={confirm}
          byLevel={byLevel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runConfirm(confirm)}
        />
      )}
    </main>
  );
}

/** One timeline row: rail node + connector, then the level card (state-dependent). */
function LevelRow({
  s,
  last,
  onOpenDetail,
  onContinue,
  onMark,
  onClean,
  onRollback,
  canRollback,
  prevLevel,
}: {
  s: LevelSummary;
  last: boolean;
  onOpenDetail: () => void;
  onContinue: () => void;
  onMark: () => void;
  onClean: () => void;
  onRollback?: () => void;
  canRollback: boolean;
  prevLevel: number | null;
}) {
  const title = levelTitle(s.level);
  const band = cefrOfLevel(s.level);
  const locked = s.status === "locked";
  const current = s.status === "current";

  return (
    <div className="lrow">
      <div className="lrow__rail">
        <span className={"lrow__node lrow__node--" + s.status}>
          {s.status === "done" && <UiIcon name="check" size={16} strokeWidth={2.8} />}
          {current && <span className="lrow__nodenum">{s.level}</span>}
          {locked && <UiIcon name="lock" size={15} strokeWidth={1.9} />}
        </span>
        {!last && <span className={"lrow__conn" + (s.status === "done" ? " lrow__conn--done" : "")} />}
      </div>
      <div className="lrow__body">
        <button
          type="button"
          className={"lcard lcard--" + s.status}
          disabled={locked}
          onClick={!locked ? onOpenDetail : undefined}
        >
          <div className="lcard__top">
            <span className="lcard__eyebrow">УР. {s.level}</span>
            <span className={"lcard__band" + (locked ? " lcard__band--muted" : "")}>{band}</span>
            {s.status === "done" && <span className="lcard__status lcard__status--done">Пройден</span>}
            {current && <span className="lcard__status lcard__status--current">Сейчас здесь</span>}
            {!locked && (
              <span className="lcard__chev">
                <UiIcon name="chevR" size={16} strokeWidth={2.2} />
              </span>
            )}
          </div>
          <div className="lcard__title">
            <span className={"lcard__fi" + (current ? " lcard__fi--big" : "")}>{title.fi}</span>
            <span className="lcard__ru">{title.ru}</span>
          </div>
          <div className="lcard__counts">
            <Counts s={s} muted={locked} />
          </div>
        </button>
        {current && (
          <div className="lcur">
            <span className="lcur__track">
              <span className="lcur__fill" style={{ width: `${Math.round(s.completion * 100)}%` }} />
            </span>
            <div className="lcur__meta">
              <span>{Math.round(s.completion * 100)}% освоено</span>
              <span className="lcur__left">осталось ~{s.remaining} элем.</span>
            </div>
            <div className="lcur__actions">
              <button type="button" className="lcur__go" onClick={onContinue}>
                Продолжить
              </button>
              <button type="button" className="lcur__mark" onClick={onMark}>
                Отметить пройденным
              </button>
            </div>
            <div className="lcur__secondary">
              <button type="button" className="lcur__danger" onClick={onClean}>
                Очистить уровень
              </button>
              {prevLevel !== null && (
                <button
                  type="button"
                  className="lcur__danger"
                  onClick={onRollback}
                  disabled={!canRollback}
                  title={canRollback ? undefined : "Сначала очистите текущий уровень"}
                >
                  Вернуться на ур. {prevLevel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- per-item models + strip */
/** A word/sentence item with its per-mode Leitner boxes (the "strikes"). */
interface WSItem {
  id: string;
  fi: string;
  ru: string;
  group: Group;
  modes: number[];
  /** Thematic group id (for the level-browser sub-headings); absent → "Другое". */
  theme?: string;
}
/** A text/dialog item with its reading-quiz box + whether it's been opened. */
interface TxItem {
  id: string;
  fi: string;
  ru: string;
  dialog: boolean;
  readingBox: number;
  opened: boolean;
  theme?: string;
}
type StatusKind = "active" | "known" | "mastered";

/** Strip segment widths for the 3 states; box ≤0 → empty, 1 → half, ≥2 → full. */
const STRIKE_W = ["0%", "50%", "100%"] as const;
const strikeOf = (box: number): 0 | 1 | 2 => (box <= 0 ? 0 : box === 1 ? 1 : 2);
const WORD_TAGS = ["Узн", "Пис", "Речь", "Слух"];
const SENT_TAGS = ["Пер", "Речь", "Слух"];

/** The per-mode "strikes" strip — one segment per practice mode, three states only. */
function ModeStrip({ modes, group }: { modes: number[]; group: Group }) {
  const g = group === "word" ? "w" : "s";
  return (
    <span className="strip">
      {modes.map((b, i) => (
        <span key={i} className="strip__seg">
          <span className={"strip__fill strip__fill--" + g} style={{ width: STRIKE_W[strikeOf(b)] }} />
        </span>
      ))}
    </span>
  );
}

/** One-line decoder of the strip's segment order for a section. */
function StripLegend({ group }: { group: Group }) {
  const tags = group === "word" ? WORD_TAGS : SENT_TAGS;
  return (
    <div className="striplegend">
      <span className={"striplegend__dot striplegend__dot--" + (group === "word" ? "w" : "s")} />
      {tags.map((t, i) => (
        <span key={i} className="striplegend__tag">
          {t}
          {i < tags.length - 1 ? " ·" : ""}
        </span>
      ))}
      <span className="striplegend__note">— освоено по режимам</span>
    </div>
  );
}

/** Swipe-left to mark «Уже знаю». Snaps back below threshold; fires `onSwipe` past it. */
function SwipeCard({ onSwipe, children }: { onSwipe: () => void; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const startX = useRef<number | null>(null);
  const TH = 92;
  const MAX = 132;
  const reveal = Math.min(1, -dx / TH);

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    setAnim(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current == null) return;
    setDx(Math.max(-MAX, Math.min(0, e.clientX - startX.current)));
  }
  function up() {
    if (startX.current == null) return;
    setAnim(true);
    if (dx <= -TH) {
      setDx(-440);
      window.setTimeout(onSwipe, 170);
    } else {
      setDx(0);
    }
    startX.current = null;
  }

  return (
    <div className="swipe">
      <div className="swipe__reveal" style={{ opacity: 0.35 + reveal * 0.65 }} aria-hidden="true">
        <UiIcon name="check" size={17} strokeWidth={2.8} />
        Уже знаю
      </div>
      <div
        className="swipe__fg"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          transform: `translateX(${dx}px)`,
          transition: anim ? "transform .22s cubic-bezier(.2,.7,.3,1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusDisc({ kind }: { kind: StatusKind }) {
  if (kind === "active") return <span className="sdisc sdisc--active" />;
  return (
    <span className={"sdisc sdisc--" + kind}>
      <UiIcon name="check" size={11} strokeWidth={2.8} />
    </span>
  );
}

/** Inner body of a word/sentence card: status disc + fi/ru + the mode strip. */
function WordCardBody({ it, status }: { it: WSItem; status: StatusKind }) {
  return (
    <div className={"litem" + (it.group === "sentence" ? " litem--stack" : "")}>
      <StatusDisc kind={status} />
      <div className="litem__text">
        <div className="litem__words">
          <span className="litem__fi">{it.fi}</span>
          <span className="litem__ru">{it.ru}</span>
        </div>
        <div className="litem__strip">
          <ModeStrip modes={it.modes} group={it.group} />
        </div>
      </div>
    </div>
  );
}

/** Inner body of a text/dialog card: reading icon + title/ru + a status line. */
function TextCardBody({ it }: { it: TxItem }) {
  const status =
    it.readingBox >= LEARNED_BOX
      ? { t: "Вопросы пройдены", c: "green" }
      : it.readingBox > 0
        ? { t: "Вопросы начаты", c: "r" }
        : it.opened
          ? { t: "Прочитано · без вопросов", c: "r" }
          : { t: "Ещё не пройдено", c: "faint" };
  return (
    <div className="litem">
      <span className="litem__ricon">
        <UiIcon name={it.dialog ? "masks" : "book"} size={17} strokeWidth={1.7} />
      </span>
      <div className="litem__text">
        <div className="litem__words litem__words--stack">
          <span className="litem__fi">{it.fi}</span>
          {it.ru && <span className="litem__ru">{it.ru}</span>}
        </div>
        <div className={"litem__status litem__status--" + status.c}>{status.t}</div>
      </div>
    </div>
  );
}

interface ActiveEntry {
  id: string;
  node: ReactNode;
  /** Word/sentence cards are swipeable; text/dialog cards are not. */
  onSwipe?: () => void;
  /** Thematic group id, for sub-heading grouping within the section. */
  theme?: string;
}

/**
 * Group active entries by theme, ordered by the registry. Unknown/absent themes collapse into a
 * single "Другое" bucket sorted last. Used to render theme sub-headings; when there's only one
 * group (e.g. an all-untagged level, or English) the caller renders it flat with no header.
 */
function groupByTheme(active: ActiveEntry[]): { key: string; label: string; entries: ActiveEntry[] }[] {
  const buckets = new Map<string, ActiveEntry[]>();
  for (const e of active) {
    const key = e.theme && THEMES.has(e.theme) ? e.theme : OTHER_THEME;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }
  const idOf = (k: string) => (k === OTHER_THEME ? undefined : k);
  return [...buckets.entries()]
    .map(([key, entries]) => ({ key, label: themeLabel(idOf(key)), entries }))
    .sort((a, b) => themeOrder(idOf(a.key)) - themeOrder(idOf(b.key)));
}
interface HiddenEntry {
  id: string;
  node: ReactNode;
  tag: "known" | "mastered";
  onReturn: () => void;
}

/** The active list + collapsible hidden group for the selected tab. */
function Section({
  total,
  active,
  hidden,
  legend,
  swipeHint,
}: {
  total: number;
  active: ActiveEntry[];
  hidden: HiddenEntry[];
  legend: ReactNode;
  swipeHint: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="lsec__meta">
        <span>
          {active.length > 0 ? (
            <>
              Осталось <b>{active.length}</b> из {total}
            </>
          ) : (
            `Всё освоено · ${total}`
          )}
        </span>
        {swipeHint && active.length > 0 && <span className="lsec__hint">← свайп «уже знаю»</span>}
      </div>
      {legend && active.length > 0 && legend}

      {(() => {
        const renderEntry = (e: ActiveEntry) =>
          e.onSwipe ? (
            <SwipeCard key={e.id} onSwipe={e.onSwipe}>
              <div className="litemcard">{e.node}</div>
            </SwipeCard>
          ) : (
            <div key={e.id} className="litemcard">
              {e.node}
            </div>
          );
        const groups = groupByTheme(active);
        // One group (all-untagged, or a single-theme level) → flat list, no sub-headings.
        if (groups.length <= 1) {
          return (
            <div className="lsec__list">
              {active.map(renderEntry)}
              {active.length === 0 && hidden.length === 0 && (
                <div className="lsec__empty">Нет элементов.</div>
              )}
            </div>
          );
        }
        return (
          <div className="lsec__list">
            {groups.map((g) => (
              <div key={g.key} className="lthemegrp">
                <div className="lthemehd">
                  <span className="lthemehd__label">{g.label}</span>
                  <span className="lthemehd__n">{g.entries.length}</span>
                </div>
                {g.entries.map(renderEntry)}
              </div>
            ))}
          </div>
        );
      })()}

      {hidden.length > 0 && (
        <div className="lhidden">
          <button type="button" className="lhidden__toggle" onClick={() => setOpen((o) => !o)}>
            <UiIcon name={open ? "chevD" : "chevR"} size={14} strokeWidth={2.4} />
            {open ? "Скрыть" : `Показать скрытые · ${hidden.length}`}
          </button>
          {open && (
            <div className="lhidden__list">
              {hidden.map((e) => (
                <div key={e.id} className="litemcard litemcard--hidden">
                  {e.node}
                  <div className="lhidden__row">
                    <span className={"ltag ltag--" + e.tag}>
                      {e.tag === "known" ? "уже знаю" : "выучено"}
                    </span>
                    <button type="button" className="lreturn" onClick={e.onReturn}>
                      <UiIcon name="refresh" size={13} strokeWidth={2.1} />
                      Вернуть в уроки
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

type Tab = "w" | "s" | "t" | "d";

/** Detail view: the level-info page — content tiles + tabbed per-item strikes, swipe-to-know,
 *  a hidden/return group, and a train-the-leftovers CTA. Works for the current or a passed level. */
function DetailView({
  summary,
  vocab,
  sentences,
  texts,
  progress,
  hidden,
  read,
  onBack,
  onPractice,
  onKnown,
  onResetItem,
}: {
  summary: LevelSummary;
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  texts: readonly ReadingText[];
  progress: ProgressMap;
  hidden: ReadonlySet<string>;
  read: ReadonlySet<string>;
  onBack: () => void;
  onPractice: () => void;
  onKnown: (group: Group, id: string) => void;
  onResetItem: (group: Group | "text", id: string) => void;
}) {
  const level = summary.level;
  const isCurrent = summary.status === "current";
  const title = levelTitle(level);
  const band = cefrOfLevel(level);
  const [tab, setTab] = useState<Tab>("w");

  // Per-item data, with each item's per-mode boxes ("strikes") read from progress.
  const words: WSItem[] = vocab
    .filter((v) => levelOf(v) === level)
    .map((v) => ({
      id: v.id,
      fi: v.fi,
      ru: v.ru,
      group: "word",
      modes: WORD_MODES.map((k) => getProgress(progress, k, v.id).box),
      theme: v.theme,
    }));
  const sents: WSItem[] = sentences
    .filter((s) => levelOf(s) === level)
    .map((s) => ({
      id: s.id,
      fi: s.canonical,
      ru: s.ru,
      group: "sentence",
      modes: SENTENCE_MODES.map((k) => getProgress(progress, k, s.id).box),
      theme: s.theme,
    }));
  const levelTexts = texts.filter((t) => levelOf(t) === level);
  const textsOf = (dialog: boolean): TxItem[] =>
    levelTexts
      .filter((t) => (t.type === "dialog") === dialog)
      .map((t) => ({
        id: t.id,
        fi: t.title,
        ru: t.titleRu ?? "",
        dialog: t.type === "dialog",
        readingBox: getProgress(progress, "reading", t.id).box,
        opened: read.has(t.id),
        theme: t.theme,
      }));

  // «done» (hidden from the active list): word/sentence — swiped-known OR every mode mastered;
  // text/dialog — its reading quiz passed.
  const wsKnown = (it: WSItem) => hidden.has(hiddenKey(it.group, it.id));
  const wsDone = (it: WSItem) => wsKnown(it) || it.modes.every((b) => b >= LEARNED_BOX);
  const txDone = (it: TxItem) => it.readingBox >= LEARNED_BOX;

  const tabs: { k: Tab; label: string; rem: number }[] = [
    { k: "w", label: "Слова", rem: words.filter((it) => !wsDone(it)).length },
    { k: "s", label: "Предложения", rem: sents.filter((it) => !wsDone(it)).length },
    { k: "t", label: "Тексты", rem: textsOf(false).filter((it) => !txDone(it)).length },
    { k: "d", label: "Диалоги", rem: textsOf(true).filter((it) => !txDone(it)).length },
  ];

  let section: ReactNode;
  if (tab === "w" || tab === "s") {
    const arr = tab === "w" ? words : sents;
    const group: Group = tab === "w" ? "word" : "sentence";
    const active: ActiveEntry[] = arr
      .filter((it) => !wsDone(it))
      .map((it) => ({
        id: it.id,
        node: <WordCardBody it={it} status="active" />,
        onSwipe: () => onKnown(group, it.id),
        theme: it.theme,
      }));
    const hiddenE: HiddenEntry[] = arr
      .filter(wsDone)
      .map((it) => ({
        id: it.id,
        node: <WordCardBody it={it} status={wsKnown(it) ? "known" : "mastered"} />,
        tag: wsKnown(it) ? "known" : "mastered",
        onReturn: () => onResetItem(group, it.id),
      }));
    section = (
      <Section key={tab} total={arr.length} active={active} hidden={hiddenE} legend={<StripLegend group={group} />} swipeHint />
    );
  } else {
    const arr = textsOf(tab === "d");
    const active: ActiveEntry[] = arr
      .filter((it) => !txDone(it))
      .map((it) => ({ id: it.id, node: <TextCardBody it={it} />, theme: it.theme }));
    const hiddenE: HiddenEntry[] = arr
      .filter(txDone)
      .map((it) => ({ id: it.id, node: <TextCardBody it={it} />, tag: "mastered", onReturn: () => onResetItem("text", it.id) }));
    section = <Section key={tab} total={arr.length} active={active} hidden={hiddenE} legend={null} swipeHint={false} />;
  }

  const tile = (icon: UiIconName, n: number, label: string, group: string) => (
    <div className="ldtile">
      <span className={"ldtile__ic ldtile__ic--" + group}>
        <UiIcon name={icon} size={19} strokeWidth={1.8} />
      </span>
      <div className="ldtile__n">{n}</div>
      <div className="ldtile__label">{label}</div>
    </div>
  );

  return (
    <main className="app app--scroll lv">
      <div className="lv__backrow">
        <button type="button" className="backbtn" onClick={onBack}>
          <UiIcon name="back" size={17} strokeWidth={2} />
          Уровни
        </button>
      </div>

      <div className="ldhead">
        <span className={"ldhead__disc" + (isCurrent ? " ldhead__disc--current" : "")}>
          {isCurrent ? (
            <span className="ldhead__lvnum">{level}</span>
          ) : (
            <UiIcon name="check" size={22} strokeWidth={2.8} />
          )}
        </span>
        <div>
          <div className="ldhead__titlerow">
            <span className="ldhead__fi">{title.fi}</span>
            <span className="ldhead__band">{band}</span>
          </div>
          <div className="ldhead__sub">
            {title.ru} · уровень {level} · {isCurrent ? "текущий" : "пройден"}
          </div>
        </div>
      </div>

      <h2 className="mx__sec">Содержание уровня</h2>
      <div className="ldtiles">
        {tile("star", summary.counts.words, "слов", "w")}
        {tile("chat", summary.counts.sentences, "фраз", "s")}
        {tile("book", summary.counts.texts, summary.counts.texts === 1 ? "текст" : "текста", "r")}
      </div>

      <div className="ltabs">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            className={"ltab" + (t.k === tab ? " ltab--on" : "")}
            onClick={() => setTab(t.k)}
          >
            {t.label}
            <span className="ltab__badge">{t.rem > 0 ? t.rem : "✓"}</span>
          </button>
        ))}
      </div>

      {section}

      <button type="button" className={"ldcta" + (isCurrent ? " ldcta--go" : "")} onClick={onPractice}>
        <UiIcon name={isCurrent ? "play" : "refresh"} size={16} strokeWidth={2} />
        {isCurrent ? "Тренировать оставшееся" : "Повторить уровень"}
      </button>
    </main>
  );
}

/** Shared confirm bottom sheet for the three destructive current-level actions. */
function ConfirmDialog({
  action,
  byLevel,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  byLevel: Map<number, LevelSummary>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const s = byLevel.get(action.level);
  const title = levelTitle(action.level);
  const danger = action.kind !== "mark";
  let icon: UiIconName;
  let heading: string;
  let body: ReactNode;
  let warn: string;
  let confirmLabel: string;
  if (action.kind === "mark") {
    icon = "bolt";
    heading = "Перейти дальше?";
    body = (
      <>
        Уровень {action.level} «{title.fi}» ({title.ru}) будет отмечен пройденным. Все его слова,
        фразы и тексты станут <b>выученными</b>, и откроется уровень {action.level + 1}.
      </>
    );
    warn = `Это пропустит ${s?.remaining ?? 0} ещё не освоенных элементов. Их можно повторить в любой момент.`;
    confirmLabel = "Отметить пройденным";
  } else if (action.kind === "clean") {
    icon = "refresh";
    heading = "Очистить уровень?";
    body = (
      <>
        Весь прогресс уровня {action.level} «{title.fi}» ({title.ru}) будет <b>сброшен</b> — его
        слова, фразы и тексты снова станут невыученными.
      </>
    );
    warn = "Прогресс этих элементов будет потерян. Это действие нельзя отменить.";
    confirmLabel = "Очистить уровень";
  } else {
    icon = "back";
    heading = `Вернуться на уровень ${action.level}?`;
    body = (
      <>
        Прогресс уровня {action.level} «{title.fi}» ({title.ru}) будет <b>сброшен</b>, и он снова
        станет текущим.
      </>
    );
    warn = "Прогресс этого уровня будет потерян. Это действие нельзя отменить.";
    confirmLabel = `Вернуться на ур. ${action.level}`;
  }
  return (
    <div className="lsheet" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="lsheet__panel" onClick={(e) => e.stopPropagation()}>
        <span className="lsheet__grab" />
        <span className={"lsheet__bolt" + (danger ? " lsheet__bolt--danger" : "")}>
          <UiIcon name={icon} size={27} strokeWidth={1.8} />
        </span>
        <h2 className="lsheet__title">{heading}</h2>
        <p className="lsheet__body">{body}</p>
        <div className={"lsheet__warn" + (danger ? " lsheet__warn--danger" : "")}>
          <UiIcon name="info" size={16} strokeWidth={1.9} />
          <span>{warn}</span>
        </div>
        <button
          type="button"
          className={"lsheet__confirm" + (danger ? " lsheet__confirm--danger" : "")}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="lsheet__cancel" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}
