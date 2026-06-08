/**
 * readingKit.tsx — small shared pieces for the chat-bubble Reading flow (Library / Reader /
 * Quiz / Recite / Mastered). Monoline icons (UiIcon), brown "Чтение" accent. Pure presentation.
 */

import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "./icons";

/** The two-part mastery state of a library item (see core/levels `readingMastered`). */
export type MasteryState = "mastered" | "progress" | "new" | "locked";

/** Round letter avatar; `color` is any CSS colour (drives the ring + glyph). */
export function Avatar({ letter, color, size = 32 }: { letter: string; color: string; size?: number }) {
  return (
    <span
      className="rd-av"
      style={{ width: size, height: size, color, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

/** Header for the chat screens: title (+ trophy when mastered), a sub-line, and right-aligned actions. */
export function ChatHead({
  title,
  sub,
  subRead = false,
  mastered = false,
  right,
}: {
  title: string;
  sub: string;
  subRead?: boolean;
  mastered?: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="rd-head">
      <div className="rd-head__main">
        <div className="rd-head__titlerow">
          <h1 className="rd-head__title">{title}</h1>
          {mastered && <UiIcon name="trophy" size={17} />}
        </div>
        <div className={"rd-head__sub" + (subRead || mastered ? " rd-head__sub--read" : "")}>{sub}</div>
      </div>
      {right}
    </div>
  );
}

/** The library row's trailing mastery indicator. */
export function MasteryMark({ state }: { state: MasteryState }) {
  if (state === "mastered") {
    return (
      <span className="rd-mark rd-mark--pill">
        <UiIcon name="trophy" size={15} />
        Прочитано
      </span>
    );
  }
  if (state === "progress") {
    return (
      <span className="rd-mark rd-mark__dots" aria-hidden="true">
        <span className="rd-dot rd-dot--on" />
        <span className="rd-dot rd-dot--off" />
      </span>
    );
  }
  if (state === "locked") {
    return (
      <span className="rd-mark" style={{ color: "var(--muted)" }}>
        <UiIcon name="lock" size={17} />
      </span>
    );
  }
  return (
    <span className="rd-mark" style={{ color: "var(--read)" }}>
      <UiIcon name="arrow" size={18} />
    </span>
  );
}

/** A small wash icon-button (header eye/play, etc.). */
export function IconBtn({
  name,
  label,
  on = false,
  onClick,
  size = 19,
}: {
  name: UiIconName;
  label: string;
  on?: boolean;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      className={"rd-iconbtn" + (on ? " rd-iconbtn--on" : "")}
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
    >
      <UiIcon name={name} size={size} />
    </button>
  );
}
