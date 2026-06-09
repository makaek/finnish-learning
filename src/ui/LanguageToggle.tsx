/**
 * LanguageToggle.tsx — a compact switch for the TARGET language (🇫🇮 Suomi / 🇬🇧 English), shown in
 * the home settings menu next to the theme switch. Unlike ThemeToggle it is NOT self-contained:
 * switching language must reload the other language's progress, so the choice is lifted to App
 * (via `value`/`onChange`); this component only renders the options.
 */

import { LANGUAGES } from "../data/languages/registry";
import type { LangId } from "../data/languages/types";

interface LanguageToggleProps {
  value: LangId;
  onChange: (lang: LangId) => void;
}

export default function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="themetoggle" role="group" aria-label="Язык изучения">
      {LANGUAGES.map((pack) => (
        <button
          key={pack.id}
          type="button"
          className={"themetoggle__opt" + (value === pack.id ? " themetoggle__opt--on" : "")}
          aria-pressed={value === pack.id}
          onClick={() => onChange(pack.id)}
        >
          {pack.flag} {pack.label}
        </button>
      ))}
    </div>
  );
}
