/**
 * ThemeToggle.tsx — a compact 3-way theme switch (Авто / Светлая / Тёмная). Self-contained:
 * reads the saved preference, applies it to <html>, and persists the choice. localStorage is
 * the source of truth, so re-mounting (e.g. returning to the home screen) re-reads correctly.
 */

import { useState } from "react";
import { applyTheme, loadTheme, saveTheme, type Theme } from "./theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Авто" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  }

  return (
    <div className="themetoggle" role="group" aria-label="Тема оформления">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={"themetoggle__opt" + (theme === o.value ? " themetoggle__opt--on" : "")}
          aria-pressed={theme === o.value}
          onClick={() => choose(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
