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
