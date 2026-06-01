import { describe, expect, it } from "vitest";
import {
  completeLesson,
  currentStreak,
  dateKey,
  DAILY_LESSONS_GOAL,
  emptyState,
  goalMet,
  recordAnswer,
  todayAccuracy,
  todayLessons,
  type UserState,
} from "./daily";

/** Simulate a fully qualifying day: 10 lessons + 100 answers at 90% accuracy. */
function qualifyingDay(state: UserState, day: string): UserState {
  let s = state;
  for (let i = 0; i < 100; i++) s = recordAnswer(s, day, i % 10 !== 0); // 90 correct / 100
  for (let i = 0; i < DAILY_LESSONS_GOAL; i++) s = completeLesson(s, day);
  return s;
}

describe("dateKey", () => {
  it("formats a local calendar day as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 0, 5, 12).getTime())).toBe("2026-01-05");
  });
});

describe("qualification (10 lessons + >=80% accuracy)", () => {
  it("does NOT qualify on activity alone", () => {
    let s = recordAnswer(emptyState(), "2026-01-01", true);
    s = completeLesson(s, "2026-01-01");
    expect(currentStreak(s, "2026-01-01")).toBe(0);
    expect(goalMet(s, "2026-01-01")).toBe(false);
  });

  it("qualifies and bumps the streak once the goal is met", () => {
    const s = qualifyingDay(emptyState(), "2026-01-01");
    expect(goalMet(s, "2026-01-01")).toBe(true);
    expect(s.streak).toBe(1);
    expect(s.qualified).toBe(true);
  });

  it("does NOT qualify with 10 lessons but accuracy below 80%", () => {
    let s = emptyState();
    for (let i = 0; i < 100; i++) s = recordAnswer(s, "2026-01-01", i % 10 < 7); // 70%
    for (let i = 0; i < DAILY_LESSONS_GOAL; i++) s = completeLesson(s, "2026-01-01");
    expect(goalMet(s, "2026-01-01")).toBe(false);
    expect(s.streak).toBe(0);
  });

  it("does NOT qualify with high accuracy but fewer than 10 lessons", () => {
    let s = emptyState();
    for (let i = 0; i < 100; i++) s = recordAnswer(s, "2026-01-01", true);
    for (let i = 0; i < DAILY_LESSONS_GOAL - 1; i++) s = completeLesson(s, "2026-01-01");
    expect(goalMet(s, "2026-01-01")).toBe(false);
    expect(s.streak).toBe(0);
  });

  it("only counts a qualifying day once", () => {
    let s = qualifyingDay(emptyState(), "2026-01-01");
    s = completeLesson(s, "2026-01-01"); // extra lesson, same day
    s = recordAnswer(s, "2026-01-01", true);
    expect(s.streak).toBe(1);
  });
});

describe("streak across days", () => {
  it("extends on consecutive qualifying days", () => {
    let s = qualifyingDay(emptyState(), "2026-01-01");
    s = qualifyingDay(s, "2026-01-02");
    expect(s.streak).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  it("resets to 1 after a missed (non-qualifying) day, keeping bestStreak", () => {
    let s = qualifyingDay(emptyState(), "2026-01-01"); // streak 1
    s = qualifyingDay(s, "2026-01-02"); // streak 2, best 2
    s = qualifyingDay(s, "2026-01-04"); // skipped the 3rd → streak resets
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it("rolls the per-day counters over to a new day", () => {
    const s = qualifyingDay(emptyState(), "2026-01-01");
    expect(todayLessons(s, "2026-01-02")).toBe(0);
    expect(todayAccuracy(s, "2026-01-02")).toBe(0);
  });
});

describe("currentStreak liveness", () => {
  const s: UserState = {
    streak: 4,
    bestStreak: 4,
    lastQualifiedDate: "2026-01-10",
    todayDate: "2026-01-10",
    lessons: 10,
    answered: 100,
    correct: 95,
    qualified: true,
  };

  it("stays alive today and the day after the last qualifying day", () => {
    expect(currentStreak(s, "2026-01-10")).toBe(4);
    expect(currentStreak(s, "2026-01-11")).toBe(4);
  });

  it("drops to 0 once two days have passed", () => {
    expect(currentStreak(s, "2026-01-12")).toBe(0);
  });
});
