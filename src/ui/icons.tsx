/**
 * icons.tsx — small monoline UI icons (24×24, stroke=currentColor) used by the home layout:
 * the settings gear, the streak flame + check, and the action-card play/shuffle. Mode icons
 * (eye/pen/…) live with the ring in BalanceRing.tsx; these are the chrome around it. Lifted
 * verbatim from the design handoff so the silhouettes match the mock.
 */

import type { ReactElement } from "react";

const PATHS: Record<string, ReactElement> = {
  flame: <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.8-2.8 1.6-3.6C9 10 9.5 8.5 9 7c2 .5 3 2 3 2s.5-3 0-6Z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.3" />
      <path d="M19.2 13.4a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.07a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.07a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.07a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.07a1.6 1.6 0 0 0-1.47.97Z" />
    </>
  ),
  play: <path d="M8 5v14l11-7L8 5Z" />,
  shuffle: <path d="M4 6h4l9 12h3M4 18h4l3-4M16 4l4 2-4 2M16 16l4 2-4 2" />,
  check: <path d="M4 12.5 9.5 18 20 6" />,
  // --- Reading-flow monoline set (from the design handoff kit.jsx → ICONS) ---
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />,
  chart: <path d="M4 20V4M4 20h16M8 16l3.5-4 3 2.5L20 8" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  rules: (
    <>
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M8 9h7M8 13h7M8 17h4" />
    </>
  ),
  book: (
    <>
      <path d="M12 6S9.5 4 4 4v14c5.5 0 8 2 8 2s2.5-2 8-2V4c-5.5 0-8 2-8 2Z" />
      <path d="M12 6v14" />
    </>
  ),
  masks: (
    <>
      <path d="M3.5 5h8v6a4 4 0 0 1-8 0V5Z" />
      <path d="M12.5 9h8v6a4 4 0 0 1-8 0" />
      <path d="M5.5 8.5h1M8.5 8.5h1M14.5 12h1M17.5 12h1" />
    </>
  ),
  eye: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.1 7.3A16 16 0 0 0 2.5 12S6 18 12 18a8.7 8.7 0 0 0 3.3-.65" />
      <path d="M9.5 10.4a3.2 3.2 0 0 0 4.2 4.4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  sound: (
    <>
      <path d="M5 9v6h4l5 4V5L9 9H5Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 15h6M10 19h4M12 15v4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.2" />,
  skip: (
    <>
      <path d="M5 5v14l9-7-9-7Z" />
      <path d="M16 5v14" />
    </>
  ),
  refresh: <path d="M20 11A8 8 0 1 0 18.4 16M20 5v6h-6" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
};

export type UiIconName = keyof typeof PATHS;

export function UiIcon({ name, size = 22, strokeWidth = 1.7 }: { name: UiIconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {PATHS[name]}
    </svg>
  );
}
