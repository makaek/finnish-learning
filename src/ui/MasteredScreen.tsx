/**
 * MasteredScreen.tsx — the «Прочитано!» celebration (MasteredR), shown once a text/dialog clears
 * BOTH parts of mastery (comprehension quiz + recited in every role). A summary + back to the list.
 */

import type { ReadingText } from "../core/reading";
import { reciteRoles, SOLO_ROLE } from "../core/reading";
import { UiIcon } from "./icons";

export default function MasteredScreen({
  text,
  hasQuestions,
  onBackToList,
  onReview,
}: {
  text: ReadingText;
  hasQuestions: boolean;
  /** Return to the library list. */
  onBackToList: () => void;
  /** Dismiss the celebration and stay on the (now mastered) reader. */
  onReview: () => void;
}) {
  const isDialog = text.type === "dialog";
  const roles = reciteRoles(text).filter((r) => r !== SOLO_ROLE);
  const reciteSub = isDialog && roles.length > 0 ? roles.join(" · ") : "по памяти";

  return (
    <main className="app">
      <section className="card">
        <div className="rd-center">
          <div className="rd-rings">
            <span className="rd-rings__o" />
            <span className="rd-rings__m" />
            <span className="rd-rings__disc">
              <UiIcon name="trophy" size={32} />
            </span>
          </div>
          <div className="rd-title">Прочитано!</div>
          <div className="rd-sub">«{text.title}» освоен — оба шага пройдены.</div>
        </div>

        <div className="rd-summary rd-summary--pad">
          {hasQuestions && (
            <div className="rd-srow">
              <span className="rd-srow__disc rd-srow__disc--done">
                <UiIcon name="check" size={18} strokeWidth={3} />
              </span>
              <div className="rd-srow__main">
                <div className="rd-srow__t">Ответы на вопросы</div>
                <div className="rd-srow__s">вопросы пройдены</div>
              </div>
              <span style={{ color: "var(--muted)", display: "flex" }}>
                <UiIcon name="rules" size={18} />
              </span>
            </div>
          )}
          <div className="rd-srow">
            <span className="rd-srow__disc rd-srow__disc--done">
              <UiIcon name="check" size={18} strokeWidth={3} />
            </span>
            <div className="rd-srow__main">
              <div className="rd-srow__t">{isDialog ? "Наизусть — все роли" : "Рассказано наизусть"}</div>
              <div className="rd-srow__s">{reciteSub}</div>
            </div>
            <span style={{ color: "var(--muted)", display: "flex" }}>
              <UiIcon name="mic" size={18} />
            </span>
          </div>
        </div>

        <div className="rd-actions">
          <button type="button" className="rd-cta" onClick={onBackToList}>
            {isDialog ? "К списку диалогов" : "К списку текстов"}
          </button>
          <button type="button" className="rd-ghost" onClick={onReview}>
            <UiIcon name="refresh" size={16} />
            Повторить позже
          </button>
        </div>
      </section>
    </main>
  );
}
