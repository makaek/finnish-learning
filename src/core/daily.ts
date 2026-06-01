/**
 * daily.ts — pure daily-loop model: a streak that only advances on a *qualifying* day.
 *
 * A day qualifies once the learner finishes at least `DAILY_LESSONS_GOAL` lessons (sessions)
 * AND keeps the day's accuracy at or above `DAILY_ACCURACY`. The streak counts consecutive
 * qualifying days. PURE: no UI/DB. Dates are local "YYYY-MM-DD"; callers pass "today".
 */

/** Lessons (completed sessions) needed to qualify a day. */
export const DAILY_LESSONS_GOAL = 10;
/** Minimum share of correct first-attempt answers across the day to qualify. */
export const DAILY_ACCURACY = 0.8;

export interface UserState {
  /** Consecutive qualifying days (see `currentStreak` for the live value). */
  streak: number;
  bestStreak: number;
  /** Last day the goal was met, "YYYY-MM-DD" ("" if never). */
  lastQualifiedDate: string;
  /** The day the counters below belong to, "YYYY-MM-DD". */
  todayDate: string;
  /** Lessons (sessions) completed today. */
  lessons: number;
  /** Answers given today. */
  answered: number;
  /** Correct answers today. */
  correct: number;
  /** Whether today already counted toward the streak (so it only bumps once). */
  qualified: boolean;
}

export function emptyState(): UserState {
  return {
    streak: 0,
    bestStreak: 0,
    lastQualifiedDate: "",
    todayDate: "",
    lessons: 0,
    answered: 0,
    correct: 0,
    qualified: false,
  };
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

/** Reset the per-day counters when the calendar day has rolled over. */
function rollToToday(state: UserState, today: string): UserState {
  if (state.todayDate === today) return state;
  return { ...state, todayDate: today, lessons: 0, answered: 0, correct: 0, qualified: false };
}

/** Today's accuracy in [0, 1] (0 when nothing answered yet). */
function accuracyOf(state: UserState): number {
  return state.answered === 0 ? 0 : state.correct / state.answered;
}

/** If today now meets the goal and hasn't been counted, bump the streak (once). */
function maybeQualify(state: UserState, today: string): UserState {
  if (state.qualified) return state;
  if (state.lessons < DAILY_LESSONS_GOAL || accuracyOf(state) < DAILY_ACCURACY) return state;
  const streak = state.lastQualifiedDate
    ? daysBetween(state.lastQualifiedDate, today) === 1
      ? state.streak + 1
      : 1
    : 1;
  return {
    ...state,
    qualified: true,
    lastQualifiedDate: today,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

/** Record one answer toward today's accuracy. May qualify the day if it tips it over. */
export function recordAnswer(state: UserState, today: string, wasCorrect: boolean): UserState {
  const s = rollToToday(state, today);
  return maybeQualify(
    { ...s, answered: s.answered + 1, correct: s.correct + (wasCorrect ? 1 : 0) },
    today,
  );
}

/** Record one completed lesson (session). May qualify the day if it reaches the goal. */
export function completeLesson(state: UserState, today: string): UserState {
  const s = rollToToday(state, today);
  return maybeQualify({ ...s, lessons: s.lessons + 1 }, today);
}

/** Live streak: the stored value if the last qualifying day was today or yesterday, else 0. */
export function currentStreak(state: UserState, today: string): number {
  if (!state.lastQualifiedDate) return 0;
  return daysBetween(state.lastQualifiedDate, today) <= 1 ? state.streak : 0;
}

/** Lessons completed today (0 after the day rolls over). */
export function todayLessons(state: UserState, today: string): number {
  return state.todayDate === today ? state.lessons : 0;
}

/** Today's accuracy in [0, 1] (0 after the day rolls over or before any answers). */
export function todayAccuracy(state: UserState, today: string): number {
  return state.todayDate === today ? accuracyOf(state) : 0;
}

/** Whether today's goal (lessons + accuracy) is met. */
export function goalMet(state: UserState, today: string): boolean {
  return (
    todayLessons(state, today) >= DAILY_LESSONS_GOAL &&
    todayAccuracy(state, today) >= DAILY_ACCURACY
  );
}
