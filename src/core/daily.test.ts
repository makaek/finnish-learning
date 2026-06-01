import { describe, expect, it } from "vitest";
import {
  applyActivity,
  currentStreak,
  dateKey,
  emptyState,
  goalMet,
  todayCount,
  type UserState,
} from "./daily";

describe("dateKey", () => {
  it("formats a local calendar day as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 0, 5, 12).getTime())).toBe("2026-01-05");
  });
});

describe("applyActivity", () => {
  it("starts a streak at 1 on the first ever answer", () => {
    expect(applyActivity(emptyState(), "2026-01-01")).toMatchObject({
      streak: 1,
      bestStreak: 1,
      lastActiveDate: "2026-01-01",
      todayDate: "2026-01-01",
      todayCount: 1,
    });
  });

  it("bumps only the count for more answers the same day", () => {
    let s = applyActivity(emptyState(), "2026-01-01");
    s = applyActivity(s, "2026-01-01");
    expect(s.todayCount).toBe(2);
    expect(s.streak).toBe(1);
  });

  it("extends the streak on a consecutive day and resets the day count", () => {
    let s = applyActivity(emptyState(), "2026-01-01");
    s = applyActivity(s, "2026-01-02");
    expect(s.streak).toBe(2);
    expect(s.todayCount).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it("restarts the streak after a missed day, keeping bestStreak", () => {
    let s: UserState = { streak: 5, bestStreak: 5, lastActiveDate: "2026-01-01", todayDate: "2026-01-01", todayCount: 9 };
    s = applyActivity(s, "2026-01-03"); // skipped the 2nd
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(5);
  });
});

describe("currentStreak", () => {
  const s: UserState = { streak: 4, bestStreak: 4, lastActiveDate: "2026-01-10", todayDate: "2026-01-10", todayCount: 3 };

  it("is alive when last active today or yesterday", () => {
    expect(currentStreak(s, "2026-01-10")).toBe(4);
    expect(currentStreak(s, "2026-01-11")).toBe(4);
  });

  it("is 0 once two or more days have passed", () => {
    expect(currentStreak(s, "2026-01-12")).toBe(0);
  });

  it("is 0 with no history", () => {
    expect(currentStreak(emptyState(), "2026-01-01")).toBe(0);
  });
});

describe("todayCount / goalMet", () => {
  const s: UserState = { streak: 1, bestStreak: 1, lastActiveDate: "2026-01-10", todayDate: "2026-01-10", todayCount: 20 };

  it("reports the count only for the current day", () => {
    expect(todayCount(s, "2026-01-10")).toBe(20);
    expect(todayCount(s, "2026-01-11")).toBe(0);
  });

  it("meets the goal at or above the threshold, per day", () => {
    expect(goalMet(s, "2026-01-10", 20)).toBe(true);
    expect(goalMet(s, "2026-01-10", 25)).toBe(false);
    expect(goalMet(s, "2026-01-11", 20)).toBe(false);
  });
});
