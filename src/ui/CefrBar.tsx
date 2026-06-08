/**
 * CefrBar.tsx — the compact "progress toward your next language milestone" strip (A1 → A2 …).
 * Shown on the home screen under the streak; taps through to the fuller breakdown on Метрики.
 */

import type { CefrProgress } from "../core/curriculum";

export default function CefrBar({ p, onClick }: { p: CefrProgress; onClick?: () => void }) {
  const pct = Math.round(p.fraction * 100);
  const caption = p.complete
    ? `Уровень ${p.band} освоен`
    : p.nextBand
      ? `${p.levelsDone}/${p.levelsTotal} уровней · до ${p.nextBand}`
      : `${p.levelsDone}/${p.levelsTotal} уровней`;

  const inner = (
    <>
      <span className="cefr__badge">{p.band}</span>
      <span className="cefr__main">
        <span className="cefr__track">
          <span className="cefr__fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="cefr__cap">{caption}</span>
      </span>
      <span className="cefr__pct">{pct}%</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="cefr"
        onClick={onClick}
        aria-label={`Уровень владения ${p.band}, ${pct}% — открыть метрики`}
      >
        {inner}
      </button>
    );
  }
  return <div className="cefr">{inner}</div>;
}
