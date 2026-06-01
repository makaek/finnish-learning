/**
 * theme.ts — user-chosen colour theme, persisted locally (a device UI preference, not
 * learning data, so it never touches the backend). "system" follows the device via
 * `prefers-color-scheme`; "light"/"dark" force it by setting `data-theme` on <html>, which
 * pins `color-scheme` and thus every `light-dark()` token (see styles.css).
 *
 * The initial value is applied pre-paint by a tiny inline script in index.html to avoid a
 * flash; this module is the runtime source of truth for the toggle.
 */

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "finnish-trainer/theme";

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* storage unavailable — fall through to default */
  }
  return "system";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* best-effort */
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
