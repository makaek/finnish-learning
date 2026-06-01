/**
 * daily.ts — pure daily-loop model: a per-day answer count and a consecutive-day streak.
 *
 * Drives the home screen's "Сегодня X/goal" ring and the 🔥 streak. PURE: no UI/DB. Dates
 * are local calendar days as "YYYY-MM-DD"; callers pass "today" (via `dateKey`) so the logic
 * is deterministic and unit-testable. Persistence lives in `src/data/backend.ts`.
 */

/** Answers (any type) needed in a day to count it "done". */
export const DAILY_GOAL = 20;

export interface UserState {
  /** Consecutive calendar days with activity (see `currentStreak` for the live value). */
  streak: number;
  /** Best streak ever reached. */
  bestStreak: number;
  /** Last day with any activity, "YYYY-MM-DD" ("" if never). */
  lastActiveDate: string;
  /** The day `todayCount` belongs to, "YYYY-MM-DD". */
  todayDate: string;
  /** Answers given on `todayDate`. */
  todayCount: number;
}

export function emptyState(): UserState {
  return { streak: 0, bestStreak: 0, lastActiveDate: "", todayDate: "", todayCount: 0 };
}

/** Local calendar day as "YYYY-MM-DD". */
export function dateKey(now: number = Date.now()): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole days from `a` to `b` (both "YYYY-MM-DD"); positive when b is later. */
function daysBetween(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00`).getTime();
  const tb = new Date(`${b}T00:00:00`).getTime();
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Fold one answer (given on day `today`) into the state. Same-day answers just bump the
 * count; the first answer of a new day advances the streak (+1 if yesterday was active,
 * otherwise it restarts at 1) and resets the day counter.
 */
export function applyActivity(state: UserState, today: string): UserState {
  if (state.todayDate === today) {
    return { ...state, todayCount: state.todayCount + 1 };
  }
  let streak = 1;
  if (state.lastActiveDate) {
    streak = daysBetween(state.lastActiveDate, today) === 1 ? state.streak + 1 : 1;
  }
  return {
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastActiveDate: today,
    todayDate: today,
    todayCount: 1,
  };
}

/** Live streak: the stored value if the last activity was today or yesterday, else 0 (broken). */
export function currentStreak(state: UserState, today: string): number {
  if (!state.lastActiveDate) return 0;
  return daysBetween(state.lastActiveDate, today) <= 1 ? state.streak : 0;
}

/** Answers logged for `today` (0 after the day rolls over). */
export function todayCount(state: UserState, today: string): number {
  return state.todayDate === today ? state.todayCount : 0;
}

/** Whether today's goal has been met. */
export function goalMet(state: UserState, today: string, goal: number = DAILY_GOAL): boolean {
  return todayCount(state, today) >= goal;
}
