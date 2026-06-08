/**
 * Dashboard.tsx — a metrics screen over the learner's current state.
 *
 * Pure presentation over `computeDashboard` (core): KPI cards, today's goal/accuracy rings,
 * per-level progress, mode balance & accuracy, the Leitner mastery distribution, vocabulary
 * coverage by part of speech, and a practice-recency donut. All SNAPSHOT metrics — the app
 * keeps no per-day history, so there's no time-series here.
 */

import { useMemo } from "react";
import type { VocabItem } from "../core/dictionary";
import type { SentenceItem } from "../core/grader";
import type { ProgressMap } from "../core/progress";
import type { UserState } from "../core/daily";
import { dateKey } from "../core/daily";
import { computeDashboard, type DashText } from "../core/dashboard";
import { LEVEL_COMPLETE_FRACTION } from "../core/levels";
import { CEFR_ORDER, cefrOfLevel, cefrProgress } from "../core/curriculum";
import { BarList, Donut, KpiCard, RingGauge, StackedColumns, type BarDatum } from "./charts";
import CefrBar from "./CefrBar";

interface DashboardProps {
  vocab: readonly VocabItem[];
  sentences: readonly SentenceItem[];
  /** Reading texts/dialogs — folded into level completion and the reading metrics. */
  texts: readonly DashText[];
  progress: ProgressMap;
  daily: UserState;
  testMode: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const accuracyTone = (a: number) => (a >= 0.8 ? "ok" : a >= 0.5 ? "yellow" : "no");

export default function Dashboard({
  vocab,
  sentences,
  texts,
  progress,
  daily,
  testMode,
}: DashboardProps) {
  const d = useMemo(
    () => computeDashboard(vocab, sentences, progress, daily, dateKey(), Date.now(), testMode, texts),
    [vocab, sentences, texts, progress, daily, testMode],
  );
  const k = d.kpis;

  // CEFR milestone + per-band level breakdown (a level is "done" at the advancement threshold).
  const cefr = cefrProgress(d.levels);
  const levelDone = (l: { total: number; learned: number }) =>
    l.total > 0 && l.learned / l.total >= LEVEL_COMPLETE_FRACTION;
  const cefrBands = CEFR_ORDER.map((band) => ({
    band,
    levels: d.levels.filter((l) => cefrOfLevel(l.level) === band),
  })).filter((b) => b.levels.length > 0);

  const levelBars: BarDatum[] = d.levels.map((l) => ({
    label: `Ур. ${l.level}`,
    value: l.fraction,
    max: 1,
    valueText: `${pct(l.fraction)} · ${l.learned}/${l.total}`,
    tone: l.unlocked ? "accent" : "muted",
  }));

  const wordModeBars: BarDatum[] = d.modes
    .filter((m) => m.group === "word")
    .map((m) => ({ label: m.label, value: m.mastered, max: m.total, tone: "accent" }));
  const sentModeBars: BarDatum[] = d.modes
    .filter((m) => m.group === "sentence")
    .map((m) => ({ label: m.label, value: m.mastered, max: m.total, tone: "known" }));
  const readingBar: BarDatum[] =
    d.reading.total > 0
      ? [{ label: "Чтение", value: d.reading.done, max: d.reading.total, tone: "ok" }]
      : [];

  const accuracyBars: BarDatum[] = d.modes
    .filter((m) => m.reps > 0)
    .map((m) => ({
      label: m.label,
      value: m.accuracy,
      max: 1,
      valueText: `${pct(m.accuracy)} · ${m.reps}`,
      tone: accuracyTone(m.accuracy),
    }));

  const posBars: BarDatum[] = d.pos.map((p) => ({
    label: p.label,
    value: p.learned,
    max: p.total,
    tone: "ok",
  }));

  const columns = d.boxes.map((b) => ({
    label: String(b.box),
    segments: [
      { key: "words", value: b.words, tone: "accent" },
      { key: "sentences", value: b.sentences, tone: "known" },
      { key: "reading", value: b.reading, tone: "ok" },
    ],
    caption: `Коробка ${b.box}${b.box === 5 ? " (мастерство)" : b.box === 0 ? " (новое)" : ""}: ${b.words} слов · ${b.sentences} фраз · ${b.reading} текстов`,
  }));

  const recencyTone: Record<string, string> = { today: "ok", week: "accent", month: "yellow", older: "muted" };
  const donutSegments = d.recency.map((r) => ({ label: r.label, value: r.count, tone: recencyTone[r.key]! }));
  const seenTracks = d.recency.reduce((s, r) => s + r.count, 0);

  return (
    <main className="app app--scroll dash">
      <h1 className="prompt prompt--home">📊 Метрики</h1>

      <section className="kpis">
        <KpiCard icon="✦" value={`${k.wordsLearned}/${k.wordsTotal}`} label="Слов выучено" sub={pct(k.wordsFraction)} />
        <KpiCard icon="💬" value={`${k.sentencesLearned}/${k.sentencesTotal}`} label="Фраз освоено" sub={`перевод · ${k.sentencesEligible} доступно`} />
        <KpiCard icon="🏆" value={`${k.level}/${k.levelsTotal}`} label="Уровень" sub="осваиваемый" />
        <KpiCard icon="🥇" value={k.fullyMastered} label="Полностью освоено" sub="слова и фразы, все режимы" />
        <KpiCard icon="🔥" value={k.streak} label="Серия дней" sub={`рекорд ${k.bestStreak}`} />
        <KpiCard icon="🎯" value={pct(k.accuracy)} label="Точность" sub={`${k.totalCorrect}/${k.totalReps}`} />
        <KpiCard icon="🔁" value={k.totalReps} label="Всего ответов" />
        <KpiCard icon="📖" value={`${k.textsDone}/${k.textsTotal}`} label="Тексты пройдено" sub="чтение и диалоги" />
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Сегодня</h2>
        <div className="dash__rings">
          <RingGauge
            value={d.today.lessons}
            max={d.today.goal}
            top={`${d.today.lessons}/${d.today.goal}`}
            bottom="уроков"
            tone={d.today.goalMet ? "ok" : "accent"}
          />
          <RingGauge
            value={d.today.accuracy}
            max={1}
            top={pct(d.today.accuracy)}
            bottom="точность"
            tone={accuracyTone(d.today.accuracy)}
          />
        </div>
        <p className="dash__note">
          {d.today.goalMet
            ? "Дневная цель выполнена! 🎉"
            : `Ответов сегодня: ${d.today.answered} (верных ${d.today.correct})`}
        </p>
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Уровень владения (CEFR)</h2>
        <p className="dash__sub">
          {cefr.complete
            ? `Весь курс пройден — уровень ${cefr.band}.`
            : `Сейчас осваиваете ${cefr.band}${cefr.nextBand ? ` · следующая ступень — ${cefr.nextBand}` : ""}.`}
        </p>
        <CefrBar p={cefr} />
        <div className="cefrdash">
          {cefrBands.map((b) => {
            const done = b.levels.filter(levelDone).length;
            return (
              <div key={b.band}>
                <div className="cefrband__hd">
                  <span className="cefrband__name">{b.band}</span>
                  <span className="cefrband__meta">
                    {done}/{b.levels.length} уровней
                    {!cefr.complete && cefr.band === b.band ? " · текущая цель" : ""}
                  </span>
                </div>
                <div className="cefrband__levels">
                  {b.levels.map((l) => {
                    const cls = levelDone(l)
                      ? " cefrlv--done"
                      : l.level === k.level
                        ? " cefrlv--current"
                        : "";
                    return (
                      <span key={l.level} className={"cefrlv" + cls}>
                        Ур. {l.level}
                        {levelDone(l) ? " ✓" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Прогресс по уровням</h2>
        <BarList items={levelBars} />
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Баланс режимов</h2>
        <BarList items={[...wordModeBars, ...sentModeBars, ...readingBar]} />
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Коробки Лейтнера</h2>
        <p className="dash__sub">0 — новое, 5 — мастерство.</p>
        <StackedColumns
          data={columns}
          legend={[
            { key: "words", label: "Слова", tone: "accent" },
            { key: "sentences", label: "Фразы", tone: "known" },
            { key: "reading", label: "Тексты", tone: "ok" },
          ]}
          emptyCaption="Наведите на столбец, чтобы увидеть числа."
        />
      </section>

      {accuracyBars.length > 0 && (
        <section className="dash__card">
          <h2 className="dash__title">Точность по режимам</h2>
          <BarList items={accuracyBars} />
        </section>
      )}

      <section className="dash__card">
        <h2 className="dash__title">Словарь по частям речи</h2>
        <BarList items={posBars} />
      </section>

      <section className="dash__card">
        <h2 className="dash__title">Свежесть практики</h2>
        <p className="dash__sub">Последняя практика · {seenTracks} элементов.</p>
        <Donut segments={donutSegments} centerLabel="всего" />
      </section>
    </main>
  );
}
