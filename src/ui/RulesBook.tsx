/**
 * RulesBook.tsx — the grammar "book": a scannable list of the fundamental rules.
 *
 * Two uses (driven by `overlay`): a home screen reached from the roadmap, and an overlay
 * opened from inside a lesson. When `highlightIds` is given (the rules relevant to the current
 * word/sentence), those rules sort to the top, are marked, and open by default so the learner
 * sees the point behind the exercise first; the rest stay collapsed to a one-line summary.
 */

import type { RuleItem } from "../core/rules";

interface RulesBookProps {
  rules: readonly RuleItem[];
  /** Ids of rules relevant to the current lesson item — surfaced first and pre-opened. */
  highlightIds?: readonly string[];
  /** True when shown over a lesson (renders as a modal with a backdrop). */
  overlay?: boolean;
  onClose: () => void;
}

function RuleRow({ rule, highlighted }: { rule: RuleItem; highlighted: boolean }) {
  return (
    <li className={"rulecard" + (highlighted ? " rulecard--hot" : "")}>
      <details open={highlighted}>
        <summary className="rulecard__summary">
          {highlighted && (
            <span className="rulecard__star" aria-label="По теме задания" title="По теме задания">
              ⭐
            </span>
          )}
          <span className="rulecard__title">{rule.title}</span>
          {rule.summary && <span className="rulecard__sub" lang="ru">{rule.summary}</span>}
        </summary>
        <div className="rulecard__body">
          <p lang="ru">{rule.body}</p>
          {rule.examples.length > 0 && (
            <ul className="rulecard__examples">
              {rule.examples.map((ex, i) => (
                <li key={i}>
                  <span className="rulecard__fi" lang="fi">{ex.fi}</span>
                  <span className="rulecard__ru" lang="ru">{ex.ru}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

export default function RulesBook({ rules, highlightIds, overlay = false, onClose }: RulesBookProps) {
  const hot = new Set(highlightIds ?? []);
  // Relevant rules first (in book order), then the rest (in book order).
  const ordered = [...rules].sort((a, b) => Number(hot.has(b.id)) - Number(hot.has(a.id)));

  const panel = (
    <div className="rulesbook__panel">
      <div className="rulesbook__head">
        <button type="button" className="exit" onClick={onClose}>
          {overlay ? "✕ Закрыть" : "← В меню"}
        </button>
        <h1 className="prompt prompt--home">Грамматика</h1>
        <p className="hint">
          {hot.size > 0
            ? "Правила по теме текущего задания отмечены ⭐ и открыты."
            : "Основные правила финского, которые встречаются в заданиях."}
        </p>
      </div>
      <ul className="rulelist">
        {ordered.map((r) => (
          <RuleRow key={r.id} rule={r} highlighted={hot.has(r.id)} />
        ))}
      </ul>
    </div>
  );

  if (overlay) {
    return (
      <div className="rulesbook rulesbook--overlay" role="dialog" aria-label="Грамматика" aria-modal="true">
        <button
          type="button"
          className="rulesbook__backdrop"
          aria-label="Закрыть"
          onClick={onClose}
        />
        {panel}
      </div>
    );
  }
  return <main className="app app--scroll rulesbook">{panel}</main>;
}
