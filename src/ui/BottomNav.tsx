/**
 * BottomNav.tsx — the app's persistent bottom tab bar (Android-style).
 *
 * The single navigation surface for the four home screens. Tab `key`s match the `HomeScreen`
 * union in App.tsx, so the bar just hands the chosen key back to `setHomeScreen`. Shown only on
 * the home shell (no bar during a lesson, which stays full-screen and focused).
 */

// "reading" is a valid home screen but intentionally has NO footer tab — the library is opened
// from the home "Чтение" cards and exits via its own back button, so while it's active no tab is
// highlighted (by design). The other four values each map to a tab below.
export type HomeScreen = "roadmap" | "reading" | "stats" | "rules" | "dashboard";

// "reading" is intentionally NOT a tab — the library is opened from the home "Чтение" cards
// (Тексты / Диалоги) and returns via its own back button. The footer covers the always-on screens.
const TABS: { key: HomeScreen; icon: string; label: string }[] = [
  { key: "roadmap", icon: "🏠", label: "Главная" },
  { key: "stats", icon: "📈", label: "Прогресс" },
  { key: "dashboard", icon: "📊", label: "Метрики" },
  { key: "rules", icon: "📖", label: "Правила" },
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
              {t.icon}
            </span>
            <span className="bnav__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
