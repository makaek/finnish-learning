import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadProgress,
  loadState,
  onSyncError,
  pendingWrites,
  progressToRow,
  reportSyncError,
  rowToProgress,
  saveProgress,
  saveState,
  type SyncError,
} from "./backend";
import { emptyProgress, type ItemProgress } from "../core/progress";
import { emptyState, type UserState } from "../core/daily";

// With no VITE_SUPABASE_* env vars set (the test environment), the store falls back to
// localStorage. These tests exercise that path end to end.
describe("backend (localStorage fallback)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads empty progress on a fresh visitor", async () => {
    expect((await loadProgress()).size).toBe(0);
  });

  it("round-trips saved progress through storage", async () => {
    const item: ItemProgress = {
      kind: "recognition",
      itemId: "v1",
      box: 2,
      correctStreak: 2,
      totalCorrect: 4,
      totalSeen: 5,
      lastSeen: 1234,
    };
    await saveProgress([item]);
    const loaded = await loadProgress();
    expect(loaded.get("recognition:v1")).toEqual(item);
  });

  it("merges successive saves, overwriting the same item and keeping others", async () => {
    await saveProgress([emptyProgress("recognition", "v1"), emptyProgress("sentences", "s1")]);
    await saveProgress([{ ...emptyProgress("recognition", "v1"), box: 5 }]);

    const loaded = await loadProgress();
    expect(loaded.size).toBe(2);
    expect(loaded.get("recognition:v1")?.box).toBe(5);
    expect(loaded.get("sentences:s1")).toEqual(emptyProgress("sentences", "s1"));
  });

  it("treats an empty save as a no-op", async () => {
    await saveProgress([emptyProgress("recognition", "v1")]);
    await saveProgress([]);
    expect((await loadProgress()).size).toBe(1);
  });

  it("ignores corrupt or foreign localStorage payloads", async () => {
    localStorage.setItem("finnish-trainer/progress", JSON.stringify([{ nope: true }, 42, null]));
    expect((await loadProgress()).size).toBe(0);
  });
});

describe("row mapping (Supabase schema contract)", () => {
  it("round-trips an item through row form", () => {
    const item: ItemProgress = {
      kind: "sentences",
      itemId: "s3",
      box: 4,
      correctStreak: 4,
      totalCorrect: 9,
      totalSeen: 11,
      lastSeen: Date.UTC(2026, 0, 15, 12, 0, 0),
    };
    const row = progressToRow("user-123", item);
    expect(row.user_id).toBe("user-123");
    expect(row.item_id).toBe("s3");
    expect(row.last_seen).toBe("2026-01-15T12:00:00.000Z");
    expect(rowToProgress(row)).toEqual(item);
  });

  it("maps a never-seen item's lastSeen to null and back to 0", () => {
    const fresh = emptyProgress("recognition", "v7");
    const row = progressToRow("u", fresh);
    expect(row.last_seen).toBeNull();
    expect(rowToProgress(row).lastSeen).toBe(0);
  });
});

describe("sync-error reporting", () => {
  beforeEach(() => localStorage.clear());

  it("surfaces a PostgREST rejection with its full detail", () => {
    const seen: (SyncError | null)[] = [];
    const off = onSyncError((e) => seen.push(e));
    reportSyncError("saveProgress", {
      code: "42P10",
      message: "there is no unique or exclusion constraint matching the ON CONFLICT specification",
      details: "some details",
      hint: "some hint",
    });
    off();
    expect(seen).toEqual([
      {
        op: "saveProgress",
        kind: "rejected",
        code: "42P10",
        message:
          "there is no unique or exclusion constraint matching the ON CONFLICT specification",
        details: "some details",
        hint: "some hint",
        pending: 0,
      },
    ]);
  });

  it("surfaces an offline network throw as kind 'network' (no code)", () => {
    const seen: (SyncError | null)[] = [];
    const off = onSyncError((e) => seen.push(e));
    reportSyncError("loadProgress", new TypeError("Failed to fetch"));
    off();
    expect(seen).toEqual([
      {
        op: "loadProgress",
        kind: "network",
        code: undefined,
        message: "Failed to fetch",
        details: undefined,
        hint: undefined,
        pending: 0,
      },
    ]);
  });

  it("reports the queued-write count alongside the error", () => {
    localStorage.setItem(
      "finnish-trainer/fi/outbox",
      JSON.stringify([
        { ...emptyProgress("reading", "t1"), lastSeen: 5 },
        { ...emptyProgress("recite", "t1"), lastSeen: 5 },
      ]),
    );
    expect(pendingWrites()).toBe(2);
    const seen: (SyncError | null)[] = [];
    const off = onSyncError((e) => seen.push(e));
    reportSyncError("saveProgress", new TypeError("Failed to fetch"));
    off();
    expect(seen[0]?.pending).toBe(2);
  });

  it("falls back to a stringified message for a non-error throw", () => {
    const seen: (SyncError | null)[] = [];
    const off = onSyncError((e) => seen.push(e));
    reportSyncError("saveState", null);
    off();
    expect(seen[0]).toMatchObject({ op: "saveState", kind: "network", message: "null" });
  });

  it("treats an empty-string code as no code (kind 'network')", () => {
    const seen: (SyncError | null)[] = [];
    const off = onSyncError((e) => seen.push(e));
    reportSyncError("loadState", { code: "", message: "weird" });
    off();
    expect(seen[0]).toMatchObject({ kind: "network", code: undefined, message: "weird" });
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    onSyncError(listener)(); // subscribe then immediately unsubscribe
    reportSyncError("saveProgress", { code: "42501", message: "RLS denied" });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("daily state (localStorage fallback)", () => {
  beforeEach(() => localStorage.clear());

  it("loads an empty state for a fresh visitor", async () => {
    expect(await loadState()).toEqual(emptyState());
  });

  it("round-trips the daily state through storage", async () => {
    const state: UserState = {
      streak: 4,
      bestStreak: 7,
      lastQualifiedDate: "2026-01-10",
      todayDate: "2026-01-10",
      lessons: 10,
      answered: 100,
      correct: 95,
      qualified: true,
    };
    await saveState(state);
    expect(await loadState()).toEqual(state);
  });

  it("ignores a corrupt stored state", async () => {
    localStorage.setItem("finnish-trainer/state", JSON.stringify({ nope: true }));
    expect(await loadState()).toEqual(emptyState());
  });
});
