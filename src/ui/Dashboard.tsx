/**
 * Dashboard.tsx — «Метрики», the at-a-glance "where am I & what next" overview.
 *
 * Rebalanced per the progress/metrics redesign. Three questions, top to bottom: how far through
 * the curriculum am I (hero: level + CEFR stage + 12-segment rail), what should I practise
 * (weak-link card), how much do I know (coverage bars). Pure presentation over `computeDashboard`
 * + `cefrProgress` + `levelSummaries`. Dropped from the old screen: Полностью освоено, Всего
 * ответов, Коробки Лейтнера, the standalone accuracy list (folded into the weak-link card), POS
 * coverage, and the recency donut.
 */

import { useMemo } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import type { ProgressMap } from "../core/progress";
import type { UserState } from "../core/daily";
import { dateKey } from "../core/daily";
import { computeDashboard, type DashText } from "../core/dashboard";
import { levelSummaries } from "../core/levels";
import { getProgress } from "../core/progress";
import { cefrProgress, CEFR_ORDER } from "../core/curriculum";
import { RingGauge } from "./charts";
import { UiIcon, type UiIconName } from "./icons";
import type { Mode } from "./Roadmap";

interface DashboardProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  /** Reading texts/dialogs — folded into coverage and the weak-link card. */
  texts: readonly DashText[];
  progress: ProgressMap;
  daily: UserState;
  testMode: boolean;
  /** Open the «Уровни» screen (hero footer button). */
  onGoLevels: () => void;
  /** Start a practice session for a word/sentence mode (weak-link «Тренировать»). */
  onStart: (mode: Mode) => void;
  /** Open the reading library when the weakest mode is reading. */
  onOpenReading: (type: "text" | "dialog") => void;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
/** ≥80% green · ≥50% amber · else red — the shared accuracy thresholds. */
const accTone = (a: number) => (a >= 0.8 ? "green" : a >= 0.5 ? "amber" : "red");

/** Group → accent + Russian label, matching the home ring's word/sentence/reading hues. */
const GROUPS = [
  { key: "w", label: "Слова" },
  { key: "s", label: "Предложения" },
  { key: "r", label: "Чтение" },
] as const;
type GroupKey = (typeof GROUPS)[number]["key"];

/** Per-mode display meta (icon + label + how «Тренировать» routes it). Keyed by progress kind. */
const MODE_META: Record<
  string,
  { group: GroupKey; icon: UiIconName; label: string; start?: Mode; reading?: "text" }
> = {
  recognition: { group: "w", icon: "eye", label: "Узнавание", start: "recognition" },
  production: { group: "w", icon: "pen", label: "Написание", start: "production" },
  say_word: { group: "w", icon: "mic", label: "Речь", start: "say_word" },
  listen_word: { group: "w", icon: "phones", label: "На слух", start: "listen_word" },
  sentences: { group: "s", icon: "chat", label: "Перевод", start: "sentences" },
  say_sentence: { group: "s", icon: "mic", label: "Речь", start: "say_sentence" },
  listen_sentence: { group: "s", icon: "phones", label: "На слух", start: "listen_sentence" },
  reading: { group: "r", icon: "book", label: "Чтение", reading: "text" },
};

interface PracticeRow {
  id: string;
  group: GroupKey;
  icon: UiIconName;
  label: string;
  mastery: number;
  accuracy: number;
  start?: Mode;
  reading?: "text";
}

export default function Dashboard({
  vocab,
  sentences,
  texts,
  progress,
  daily,
  testMode,
  onGoLevels,
  onStart,
  onOpenReading,
}: DashboardProps) {
  const d = useMemo(
    () => computeDashboard(vocab, sentences, progress, daily, dateKey(), Date.now(), testMode, texts),
    [vocab, sentences, texts, progress, daily, testMode],
  );
  const k = d.kpis;
  const cefr = cefrProgress(d.levels);
  const summaries = useMemo(
    () => levelSummaries(vocab, sentences, texts, progress),
    [vocab, sentences, texts, progress],
  );

  // Per-mode rows for «Что подтянуть»: word + sentence modes from the dashboard, plus one reading
  // row (its accuracy summed over the texts' comprehension track, which the dashboard doesn't break
  // out). The single lowest-mastery row is the weak link the card nudges.
  const rows: PracticeRow[] = useMemo(() => {
    const list: PracticeRow[] = [];
    for (const m of d.modes) {
      const meta = MODE_META[m.mode];
      if (!meta) continue;
      list.push({
        id: m.mode,
        group: meta.group,
        icon: meta.icon,
        label: meta.label,
        mastery: m.fraction,
        accuracy: m.accuracy,
        start: meta.start,
      });
    }
    if (d.reading.total > 0) {
      let ok = 0;
      let seen = 0;
      for (const t of texts) {
        const p = getProgress(progress, "reading", t.id);
        ok += p.totalCorrect;
        seen += p.totalSeen;
      }
      list.push({
        id: "reading",
        group: "r",
        icon: "book",
        label: "Чтение",
        mastery: d.reading.done / d.reading.total,
        accuracy: seen > 0 ? ok / seen : 0,
        reading: "text",
      });
    }
    return list;
  }, [d.modes, d.reading, texts, progress]);

  const weakest = rows.reduce<PracticeRow | null>(
    (a, b) => (a === null || b.mastery < a.mastery ? b : a),
    null,
  );
  const trainWeakest = () => {
    if (!weakest) return;
    if (weakest.reading) onOpenReading(weakest.reading);
    else if (weakest.start) onStart(weakest.start);
  };

  const todayGoalMet = d.today.goalMet;

  return (
    <main className="app app--scroll mx">
      <div className="mx__h1">
        <h1 className="prompt prompt--home">Метрики</h1>
        <span className="mx__h1sub">обзор сейчас</span>
      </div>

      {/* ---- Hero: curriculum position ---- */}
      <section className="card mhero">
        <div className="mhero__top">
          <div className="mhero__tile">
            <span className="mhero__lvnum">{k.level}</span>
            <span className="mhero__lvword">УРОВЕНЬ</span>
          </div>
          <div className="mhero__cefr">
            <div className="mhero__cefrlabel">Текущая ступень</div>
            <div className="mhero__cefrline">
              <span className="mhero__stage">{cefr.band}</span>
              <span className="mhero__band">уровень {cefr.major}</span>
            </div>
          </div>
        </div>
        <div className="mhero__rail">
          <div className="lrail">
            {summaries.map((s) => (
              <div key={s.level} className={"lrail__seg lrail__seg--" + s.status}>
                {s.status === "current" && (
                  <span className="lrail__fill" style={{ width: `${Math.round(s.completion * 100)}%` }} />
                )}
              </div>
            ))}
          </div>
          <div className="lrail__ticks">
            {CEFR_ORDER.map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
        <button type="button" className="mhero__more" onClick={onGoLevels}>
          <span>Все уровни · пройденные и впереди</span>
          <UiIcon name="chevR" size={18} strokeWidth={2} />
        </button>
      </section>

      {/* ---- Сегодня ---- */}
      <h2 className="mx__sec">Сегодня</h2>
      <section className="card mtoday">
        <div className="mtoday__hd">
          <span className="mtoday__title">Сегодня</span>
          <span className="mtoday__note">
            · {d.today.correct} из {d.today.answered} верно
          </span>
        </div>
        <div className="mtoday__rings">
          <div className="mtoday__ring">
            <RingGauge
              value={d.today.lessons}
              max={d.today.goal}
              top={`${d.today.lessons}`}
              bottom={`из ${d.today.goal}`}
              tone={todayGoalMet ? "ok" : "accent"}
            />
            <span className="mtoday__cap">Уроки</span>
          </div>
          <div className="mtoday__ring">
            <RingGauge value={d.today.accuracy} max={1} top={pct(d.today.accuracy)} bottom="" tone={accTone(d.today.accuracy) === "green" ? "ok" : accTone(d.today.accuracy) === "amber" ? "yellow" : "no"} />
            <span className="mtoday__cap">Точность</span>
          </div>
        </div>
      </section>

      {/* ---- Что я знаю (coverage) ---- */}
      <h2 className="mx__sec">Что я знаю</h2>
      <section className="card mcov">
        <CoverageRow
          icon="star"
          group="w"
          label="Слова"
          learned={k.wordsLearned}
          total={k.wordsTotal}
          note={`${pct(k.wordsFraction)} словаря выучено`}
        />
        <CoverageRow
          icon="chat"
          group="s"
          label="Фразы"
          learned={k.sentencesLearned}
          total={k.sentencesTotal}
          note={`ещё ${k.sentencesEligible} доступно для тренировки`}
        />
        <CoverageRow icon="book" group="r" label="Тексты и диалоги" learned={k.textsDone} total={k.textsTotal} />
      </section>

      {/* ---- Two stat tiles ---- */}
      <div className="mtiles">
        <div className="card mtile">
          <div className="mtile__top">
            <span className="mtile__ic mtile__ic--flame">
              <UiIcon name="flame" size={17} strokeWidth={1.9} />
            </span>
            <span className="mtile__val">{k.streak}</span>
          </div>
          <div className="mtile__label">Серия дней</div>
          <div className="mtile__sub">рекорд {k.bestStreak}</div>
        </div>
        <div className="card mtile">
          <div className="mtile__top">
            <span className="mtile__ic mtile__ic--target">
              <UiIcon name="target" size={17} strokeWidth={1.9} />
            </span>
            <span className="mtile__val">{pct(k.accuracy)}</span>
          </div>
          <div className="mtile__label">Точность</div>
          <div className="mtile__sub">
            {k.totalCorrect} из {k.totalReps}
          </div>
        </div>
      </div>

      {/* ---- Что подтянуть (weak link + per-mode balance) ---- */}
      <h2 className="mx__sec">Что подтянуть</h2>
      <section className="card mprac">
        {weakest && (
          <div className="mprac__banner">
            <span className="mprac__bicon">
              <UiIcon name={weakest.icon} size={21} strokeWidth={1.9} />
            </span>
            <div className="mprac__btext">
              <div className="mprac__beyebrow">Слабее всего</div>
              <div className="mprac__bname">
                {weakest.label} · {GROUPS.find((g) => g.key === weakest.group)!.label.toLowerCase()}
              </div>
            </div>
            <button type="button" className="mprac__btn" onClick={trainWeakest}>
              Тренировать
            </button>
          </div>
        )}
        <div className="mprac__body">
          {GROUPS.map((g) => {
            const groupRows = rows.filter((r) => r.group === g.key);
            if (groupRows.length === 0) return null;
            return (
              <div key={g.key} className="mprac__group">
                <div className="mprac__glabel">
                  <span className={"mprac__gdot mprac__gdot--" + g.key} />
                  {g.label}
                </div>
                {groupRows.map((r) => {
                  const weak = r === weakest;
                  return (
                    <div key={r.id} className="mprow">
                      <span className={"mprow__ic mprow__ic--" + r.group}>
                        <UiIcon name={r.icon} size={16} strokeWidth={1.8} />
                      </span>
                      <span className={"mprow__label" + (weak ? " mprow__label--weak" : "")}>
                        {r.label}
                      </span>
                      <span className="mprow__track">
                        <span
                          className={"mprow__fill mprow__fill--" + r.group + (weak ? " mprow__fill--weak" : "")}
                          style={{ width: `${Math.round(r.mastery * 100)}%` }}
                        />
                      </span>
                      <span className={"mprow__acc mprow__acc--" + accTone(r.accuracy)}>
                        {Math.round(r.accuracy * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="mprac__legend">
            <span>полоса — освоено</span>
            <span>% — точность</span>
          </div>
        </div>
      </section>
    </main>
  );
}

/** One coverage bar row (icon + label + learned/total + bar + optional note). */
function CoverageRow({
  icon,
  group,
  label,
  learned,
  total,
  note,
}: {
  icon: UiIconName;
  group: GroupKey;
  label: string;
  learned: number;
  total: number;
  note?: string;
}) {
  const frac = total > 0 ? learned / total : 0;
  return (
    <div className="mcov__row">
      <div className="mcov__head">
        <span className={"mcov__ic mcov__ic--" + group}>
          <UiIcon name={icon} size={17} strokeWidth={1.8} />
        </span>
        <span className="mcov__label">{label}</span>
        <span className="mcov__count">
          {learned}
          <span className="mcov__total">/{total}</span>
        </span>
      </div>
      <span className="mcov__track">
        <span className={"mcov__fill mcov__fill--" + group} style={{ width: `${Math.round(frac * 100)}%` }} />
      </span>
      {note && <div className="mcov__note">{note}</div>}
    </div>
  );
}
