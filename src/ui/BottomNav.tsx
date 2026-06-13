/**
 * BottomNav.tsx — the app's persistent bottom tab bar (Android-style).
 *
 * The single navigation surface for the home screens. Tab `key`s match the `HomeScreen` union in
 * App.tsx, so the bar just hands the chosen key back to `setHomeScreen`. Shown only on the home
 * shell (no bar during a lesson, which stays full-screen and focused).
 */

import { UiIcon, type UiIconName } from "./icons";

// "reading", "levels", "rules" and "trainer" are valid home screens but intentionally have NO
// footer tab — each is opened from another screen (reading from the home "Чтение" cards, levels
// from the Метрики hero, rules as link-only overlays from grammar topics, the trainer from its
// CTAs) and exits via its own back button, so while any is active no tab is highlighted (by
// design). «Правила» is no longer a tab — rules open as detail overlays from grammar topic rows
// and the trainer summary. The remaining three values each map to a tab below.
export type HomeScreen =
  | "roadmap"
  | "reading"
  | "rules"
  | "dashboard"
  | "levels"
  | "grammar"
  | "trainer";

// Icons are monoline SVGs (UiIcon), matching the home/reading design system — no emoji.
const TABS: { key: HomeScreen; icon: UiIconName; label: string }[] = [
  { key: "roadmap", icon: "home", label: "Главная" },
  { key: "dashboard", icon: "grid", label: "Метрики" },
  { key: "grammar", icon: "pen", label: "Грамматика" },
];

export default function BottomNav({
  active,
  onSelect,
}: {
  active: HomeScreen;
  onSelect: (screen: HomeScreen) => void;
}) {
  return (
    <nav className="bnav" aria-label="Навигация">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button
            type="button"
            key={t.key}
            className={"bnav__tab" + (on ? " bnav__tab--on" : "")}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(t.key)}
          >
            <span className="bnav__icon" aria-hidden="true">
              <UiIcon name={t.icon} size={23} strokeWidth={on ? 2 : 1.7} />
            </span>
            <span className="bnav__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
