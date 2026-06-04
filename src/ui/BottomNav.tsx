/**
 * BottomNav.tsx — the app's persistent bottom tab bar (Android-style).
 *
 * The single navigation surface for the four home screens. Tab `key`s match the `HomeScreen`
 * union in App.tsx, so the bar just hands the chosen key back to `setHomeScreen`. Shown only on
 * the home shell (no bar during a lesson, which stays full-screen and focused).
 */

export type HomeScreen = "roadmap" | "stats" | "rules" | "dashboard";

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
