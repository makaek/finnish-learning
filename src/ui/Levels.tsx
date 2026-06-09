/**
 * Levels.tsx — «Уровни», the curriculum journey.
 *
 * Three views off one component: `list` (the 12-level timeline grouped into CEFR bands), `detail`
 * (review a passed level's words/sentences/texts, Finnish-first), and `confirm` (the «Отметить
 * пройденным» bottom sheet). Level state (done/current/locked) is derived by `levelSummaries`; the
 * mark-passed write lives in App (`onMarkPassed`). Reached from the Метрики hero, exits via its own
 * back button — it is a tab-less home screen.
 */

import { useState } from "react";
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
}

type View = "list" | "detail" | "confirm";

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
}: LevelsProps) {
  const [view, setView] = useState<View>("list");
  const [detailLv, setDetailLv] = useState<number>(1);

  const summaries = levelSummaries(vocab, sentences, texts, progress);
  const byLevel = new Map(summaries.map((s) => [s.level, s]));
  const current = summaries.find((s) => s.status === "current") ?? null;
  const doneCount = summaries.filter((s) => s.status === "done").length;

  if (view === "detail") {
    return (
      <DetailView
        level={detailLv}
        summary={byLevel.get(detailLv)!}
        vocab={vocab}
        sentences={sentences}
        texts={texts}
        onBack={() => setView("list")}
        onRepeat={() => onStart("recognition")}
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
                onMarkRequest={() => setView("confirm")}
              />
            ))}
          </div>
        );
      })}

      {view === "confirm" && current && (
        <ConfirmDialog
          summary={current}
          onCancel={() => setView("list")}
          onConfirm={() => {
            onMarkPassed(current.level);
            setView("list");
          }}
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
  onMarkRequest,
}: {
  s: LevelSummary;
  last: boolean;
  onOpenDetail: () => void;
  onContinue: () => void;
  onMarkRequest: () => void;
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
          disabled={locked || current}
          onClick={s.status === "done" ? onOpenDetail : undefined}
        >
          <div className="lcard__top">
            <span className="lcard__eyebrow">УР. {s.level}</span>
            <span className={"lcard__band" + (locked ? " lcard__band--muted" : "")}>{band}</span>
            {s.status === "done" && <span className="lcard__status lcard__status--done">Пройден</span>}
            {current && <span className="lcard__status lcard__status--current">Сейчас здесь</span>}
            {s.status === "done" && (
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
              <button type="button" className="lcur__mark" onClick={onMarkRequest}>
                Отметить пройденным
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Detail view: review a passed level's content, Finnish-first. */
function DetailView({
  level,
  summary,
  vocab,
  sentences,
  texts,
  onBack,
  onRepeat,
}: {
  level: number;
  summary: LevelSummary;
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  texts: readonly ReadingText[];
  onBack: () => void;
  onRepeat: () => void;
}) {
  const [allWords, setAllWords] = useState(false);
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
        <span className="ldhead__disc">
          <UiIcon name="check" size={22} strokeWidth={2.8} />
        </span>
        <div>
          <div className="ldhead__titlerow">
            <span className="ldhead__fi">{title.fi}</span>
            <span className="ldhead__band">{band}</span>
          </div>
          <div className="ldhead__sub">
            {title.ru} · уровень {level} · пройден
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

      <button type="button" className="ldrepeat" onClick={onRepeat}>
        <UiIcon name="refresh" size={17} strokeWidth={2} />
        Повторить уровень
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

/** The «Отметить пройденным» confirmation bottom sheet. */
function ConfirmDialog({
  summary,
  onCancel,
  onConfirm,
}: {
  summary: LevelSummary;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = levelTitle(summary.level);
  return (
    <div className="lsheet" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="lsheet__panel" onClick={(e) => e.stopPropagation()}>
        <span className="lsheet__grab" />
        <span className="lsheet__bolt">
          <UiIcon name="bolt" size={27} strokeWidth={1.8} />
        </span>
        <h2 className="lsheet__title">Перейти дальше?</h2>
        <p className="lsheet__body">
          Уровень {summary.level} «{title.fi}» ({title.ru}) будет отмечен пройденным. Все его слова,
          фразы и тексты станут <b>выученными</b>, и откроется уровень {summary.level + 1}.
        </p>
        <div className="lsheet__warn">
          <UiIcon name="info" size={16} strokeWidth={1.9} />
          <span>
            Это пропустит {summary.remaining} ещё не освоенных элементов. Их можно повторить в любой
            момент.
          </span>
        </div>
        <button type="button" className="lsheet__confirm" onClick={onConfirm}>
          Отметить пройденным
        </button>
        <button type="button" className="lsheet__cancel" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}
