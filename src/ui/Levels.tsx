/**
 * Levels.tsx — «Уровни», the curriculum journey.
 *
 * Two views off one component: `list` (the 12-level timeline grouped into CEFR bands) and `detail`
 * (review a level's words/sentences/texts, Finnish-first). Destructive actions on the current level
 * — mark-passed, clean, and rollback — go through a shared confirm bottom sheet. Level state
 * (done/current/locked) is derived by `levelSummaries`; the writes live in App (`onMarkPassed` /
 * `onCleanLevel`). Reached from the Метрики hero, exits via its own back button — a tab-less screen.
 */

import { useState, type ReactNode } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import type { ReadingText } from "../core/reading";
import type { ProgressMap } from "../core/progress";
import { levelContent, levelSummaries, type LevelSummary } from "../core/levels";
import { levelTitle, BAND_NAMES } from "../core/levelTitles";
import { CEFR_ORDER, cefrOfLevel } from "../core/curriculum";
import { UiIcon, type UiIconName } from "./icons";
import type { Mode } from "./Roadmap";

interface LevelsProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  texts: readonly ReadingText[];
  progress: ProgressMap;
  onBack: () => void;
  onStart: (mode: Mode) => void;
  onMarkPassed: (level: number) => void;
  /** Reset every track of a level's items (clean / the rollback mechanism). */
  onCleanLevel: (level: number) => void;
}

type View = "list" | "detail";
/** A pending destructive action awaiting confirmation in the bottom sheet. */
type ConfirmAction = { kind: "mark" | "clean" | "rollback"; level: number };
/** Total items in a level (across groups). */
const totalOf = (s: LevelSummary) => s.counts.words + s.counts.sentences + s.counts.texts;

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
    </div>
  );
}

export default function Levels({
  vocab,
  sentences,
  texts,
  progress,
  onBack,
  onStart,
  onMarkPassed,
  onCleanLevel,
}: LevelsProps) {
  const [view, setView] = useState<View>("list");
  const [detailLv, setDetailLv] = useState<number>(1);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const summaries = levelSummaries(vocab, sentences, texts, progress);
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
        summary={ds}
        vocab={vocab}
        sentences={sentences}
        texts={texts}
        onBack={() => setView("list")}
        // The current level keeps practising its leftovers (Микс); a passed level is reviewed.
        onPractice={() => onStart(ds.status === "current" ? "mix" : "recognition")}
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
              <span className="lband__name">{BAND_NAMES[band]}</span>
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
              <span className="lcur__fill" style={{ width: `${Math.round(s.fraction * 100)}%` }} />
            </span>
            <div className="lcur__meta">
              <span>{Math.round(s.fraction * 100)}% освоено</span>
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

/** Detail view: review a level's content, Finnish-first (a passed level OR the current one). */
function DetailView({
  summary,
  vocab,
  sentences,
  texts,
  onBack,
  onPractice,
}: {
  summary: LevelSummary;
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  texts: readonly ReadingText[];
  onBack: () => void;
  onPractice: () => void;
}) {
  const [allWords, setAllWords] = useState(false);
  const level = summary.level;
  const isCurrent = summary.status === "current";
  const title = levelTitle(level);
  const band = cefrOfLevel(level);
  const content = levelContent(vocab, sentences, texts, level);
  const PREVIEW = 5;
  const shownWords = allWords ? content.words : content.words.slice(0, PREVIEW);
  const hiddenCount = content.words.length - PREVIEW;

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

      <h2 className="mx__sec mx__sec--count">
        Слова <span className="mx__seccount">{content.words.length}</span>
      </h2>
      <div className="ldlist">
        {shownWords.map((w, i) => (
          <ItemRow key={i} fi={w.fi} ru={w.ru} />
        ))}
        {hiddenCount > 0 && (
          <button type="button" className="ldmore" onClick={() => setAllWords((a) => !a)}>
            {allWords ? "Свернуть" : `Показать ещё ${hiddenCount} слов`}
            <UiIcon name={allWords ? "chevD" : "chevR"} size={15} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <h2 className="mx__sec mx__sec--count">
        Предложения <span className="mx__seccount">{content.sentences.length}</span>
      </h2>
      <div className="ldlist">
        {content.sentences.map((s, i) => (
          <ItemRow key={i} fi={s.fi} ru={s.ru} />
        ))}
      </div>

      <h2 className="mx__sec mx__sec--count">
        Тексты и диалоги <span className="mx__seccount">{content.texts.length}</span>
      </h2>
      <div className="ldlist">
        {content.texts.map((t, i) => (
          <ItemRow key={i} fi={t.fi} ru={t.ru} icon={t.dialog ? "masks" : "book"} />
        ))}
      </div>

      <button type="button" className="ldrepeat" onClick={onPractice}>
        <UiIcon name={isCurrent ? "play" : "refresh"} size={17} strokeWidth={2} />
        {isCurrent ? "Продолжить уровень" : "Повторить уровень"}
      </button>
    </main>
  );
}

/** A single Finnish-first content row in the detail list. */
function ItemRow({ fi, ru, icon }: { fi: string; ru: string; icon?: UiIconName }) {
  return (
    <div className="lirow">
      {icon ? (
        <span className="lirow__ic lirow__ic--r">
          <UiIcon name={icon} size={17} strokeWidth={1.7} />
        </span>
      ) : (
        <span className="lirow__tick">
          <UiIcon name="check" size={11} strokeWidth={2.8} />
        </span>
      )}
      <div className="lirow__text">
        <div className="lirow__fi">{fi}</div>
        {ru && <div className="lirow__ru">{ru}</div>}
      </div>
    </div>
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
