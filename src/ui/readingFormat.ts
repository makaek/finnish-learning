/**
 * readingFormat.ts — pure presentation helpers for the Reading flow (no JSX, so they live apart
 * from the components in readingKit.tsx and don't break React Fast Refresh).
 */

/**
 * Speaker → accent CSS variable. Assigned by appearance order so any authored dialog gets stable,
 * distinct hues (Pekka-teal / Liisa-violet in the design); a third+ speaker falls back to muted.
 */
const SPEAKER_VARS = ["var(--rd-teal)", "var(--rd-violet)", "var(--read)"];
export function speakerColor(role: string, roles: readonly string[]): string {
  const i = roles.indexOf(role);
  return i >= 0 && i < SPEAKER_VARS.length ? SPEAKER_VARS[i]! : "var(--muted)";
}

/** Russian plural of "реплика" (1 реплика / 2 реплики / 5 реплик). */
export function plReplika(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} реплика`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} реплики`;
  return `${n} реплик`;
}
