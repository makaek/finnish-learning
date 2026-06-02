/**
 * data/backend.ts — persistence boundary for learning progress.
 *
 * Keeps `src/core` pure (no I/O there) by owning all storage here. Progress is saved to
 * **Supabase** when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are configured;
 * otherwise — and on any network error — it transparently falls back to `localStorage`,
 * so `npm run dev`, tests, and offline use all work with zero credentials.
 *
 * Identity is a Supabase **anonymous** session (no login UI): every visitor gets a stable
 * `user_id`, and row-level security limits each user to their own rows. The anon key is
 * public by design.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_BOX,
  MIN_BOX,
  progressKey,
  toProgressMap,
  type ItemKind,
  type ItemProgress,
  type ProgressMap,
} from "../core/progress";
import { emptyState, type UserState } from "../core/daily";

const TABLE = "progress";
const STATE_TABLE = "user_state";
const LOCAL_KEY = "finnish-trainer/progress";
const LOCAL_STATE_KEY = "finnish-trainer/state";

/** Persistence contract the app codes against, regardless of backing store. */
export interface ProgressStore {
  /** Establish identity (anon sign-in) eagerly, so a fresh visitor has a session. */
  ensureSession(): Promise<void>;
  /** Load all of this user's progress. Never throws — degrades to local/empty. */
  loadProgress(): Promise<ProgressMap>;
  /** Upsert the given progress records. Never throws — degrades to local. */
  saveProgress(items: readonly ItemProgress[]): Promise<void>;
  /** Load the user's daily-loop state (streak etc.). Never throws — degrades to local/empty. */
  loadState(): Promise<UserState>;
  /** Upsert the daily-loop state. Never throws — degrades to local. */
  saveState(state: UserState): Promise<void>;
}

// --- localStorage store (fallback + offline) --------------------------------------------

/** Structural guard so a stale/foreign localStorage payload can't masquerade as progress. */
function isItemProgress(value: unknown): value is ItemProgress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.kind === "recognition" ||
      v.kind === "production" ||
      v.kind === "sentences" ||
      v.kind === "say_word" ||
      v.kind === "say_sentence" ||
      v.kind === "listen_word" ||
      v.kind === "listen_sentence") &&
    typeof v.itemId === "string" &&
    typeof v.box === "number" &&
    v.box >= MIN_BOX &&
    v.box <= MAX_BOX &&
    typeof v.correctStreak === "number" &&
    typeof v.totalCorrect === "number" &&
    typeof v.totalSeen === "number" &&
    typeof v.lastSeen === "number"
  );
}

/** Read the persisted progress list, tolerating absent/corrupt/unavailable storage. */
function readLocal(): ItemProgress[] {
  try {
    const raw = globalThis.localStorage?.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItemProgress) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: readonly ItemProgress[]): void {
  try {
    globalThis.localStorage?.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — best-effort only */
  }
}

/** Guard a localStorage daily-state payload. (A stale pre-slice-15 shape fails this → reset.) */
function isUserState(value: unknown): value is UserState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.streak === "number" &&
    typeof v.bestStreak === "number" &&
    typeof v.lastQualifiedDate === "string" &&
    typeof v.todayDate === "string" &&
    typeof v.lessons === "number" &&
    typeof v.answered === "number" &&
    typeof v.correct === "number" &&
    typeof v.qualified === "boolean"
  );
}

function readLocalState(): UserState {
  try {
    const raw = globalThis.localStorage?.getItem(LOCAL_STATE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    return isUserState(parsed) ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

function writeLocalState(state: UserState): void {
  try {
    globalThis.localStorage?.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

class LocalStore implements ProgressStore {
  async ensureSession(): Promise<void> {
    /* nothing to authenticate locally */
  }

  async loadProgress(): Promise<ProgressMap> {
    return toProgressMap(readLocal());
  }

  async saveProgress(items: readonly ItemProgress[]): Promise<void> {
    if (items.length === 0) return;
    const merged = toProgressMap(readLocal());
    for (const item of items) merged.set(progressKey(item.kind, item.itemId), item);
    writeLocal([...merged.values()]);
  }

  async loadState(): Promise<UserState> {
    return readLocalState();
  }

  async saveState(state: UserState): Promise<void> {
    writeLocalState(state);
  }
}

// --- Supabase store ---------------------------------------------------------------------

/** A `progress` table row (snake_case columns; `last_seen` is a timestamptz). */
export interface ProgressRow {
  user_id: string;
  kind: string;
  item_id: string;
  box: number;
  correct_streak: number;
  total_correct: number;
  total_seen: number;
  last_seen: string | null;
}

export function rowToProgress(row: ProgressRow): ItemProgress {
  return {
    kind: row.kind as ItemKind,
    itemId: row.item_id,
    box: row.box,
    correctStreak: row.correct_streak,
    totalCorrect: row.total_correct,
    totalSeen: row.total_seen,
    lastSeen: row.last_seen ? Date.parse(row.last_seen) : 0,
  };
}

export function progressToRow(userId: string, p: ItemProgress): ProgressRow {
  return {
    user_id: userId,
    kind: p.kind,
    item_id: p.itemId,
    box: p.box,
    correct_streak: p.correctStreak,
    total_correct: p.totalCorrect,
    total_seen: p.totalSeen,
    last_seen: p.lastSeen ? new Date(p.lastSeen).toISOString() : null,
  };
}

/** A `user_state` row (one per user); date columns are SQL `date` or null. */
export interface UserStateRow {
  user_id: string;
  streak: number;
  best_streak: number;
  last_qualified_date: string | null;
  today_date: string | null;
  lessons: number;
  answered: number;
  correct: number;
  qualified: boolean;
}

export function rowToUserState(row: UserStateRow): UserState {
  return {
    streak: row.streak,
    bestStreak: row.best_streak,
    lastQualifiedDate: row.last_qualified_date ?? "",
    todayDate: row.today_date ?? "",
    lessons: row.lessons,
    answered: row.answered,
    correct: row.correct,
    qualified: row.qualified,
  };
}

export function userStateToRow(userId: string, s: UserState): UserStateRow {
  return {
    user_id: userId,
    streak: s.streak,
    best_streak: s.bestStreak,
    last_qualified_date: s.lastQualifiedDate || null,
    today_date: s.todayDate || null,
    lessons: s.lessons,
    answered: s.answered,
    correct: s.correct,
    qualified: s.qualified,
  };
}

/**
 * Supabase-backed store. Any failure (offline, RLS, transient) degrades to `fallback`
 * rather than surfacing — a learning app must keep working without the network.
 */
class SupabaseStore implements ProgressStore {
  /** In-flight anonymous sign-in, shared so concurrent callers don't each trigger one. */
  private pendingSignIn: Promise<string | null> | null = null;

  constructor(
    private readonly client: SupabaseClient,
    private readonly fallback: ProgressStore,
  ) {}

  /** Resolve (or lazily create) the anonymous user id, or null if auth is unavailable. */
  private async userId(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    if (!this.pendingSignIn) {
      this.pendingSignIn = this.client.auth
        .signInAnonymously()
        .then(({ data: signedIn, error }) => {
          this.pendingSignIn = null;
          return error || !signedIn.user ? null : signedIn.user.id;
        })
        // If the network layer rejects (vs. returning an in-band error), clear the cache
        // so we don't await a settled-rejected promise forever.
        .catch(() => {
          this.pendingSignIn = null;
          return null;
        });
    }
    return this.pendingSignIn;
  }

  async ensureSession(): Promise<void> {
    try {
      await this.userId();
    } catch (err) {
      console.warn("[backend] anonymous sign-in failed:", err);
    }
  }

  async loadProgress(): Promise<ProgressMap> {
    try {
      const uid = await this.userId();
      if (!uid) return this.fallback.loadProgress();
      const { data, error } = await this.client.from(TABLE).select("*").eq("user_id", uid);
      if (error) throw error;
      return toProgressMap((data ?? []).map((row) => rowToProgress(row as ProgressRow)));
    } catch (err) {
      console.warn("[backend] loadProgress fell back to local:", err);
      return this.fallback.loadProgress();
    }
  }

  async saveProgress(items: readonly ItemProgress[]): Promise<void> {
    if (items.length === 0) return;
    try {
      const uid = await this.userId();
      if (!uid) return this.fallback.saveProgress(items);
      const rows = items.map((item) => progressToRow(uid, item));
      const { error } = await this.client
        .from(TABLE)
        .upsert(rows, { onConflict: "user_id,kind,item_id" });
      if (error) throw error;
      // Mirror to local so an offline load later still sees this session's progress.
      await this.fallback.saveProgress(items);
    } catch (err) {
      console.warn("[backend] saveProgress fell back to local:", err);
      await this.fallback.saveProgress(items);
    }
  }

  async loadState(): Promise<UserState> {
    try {
      const uid = await this.userId();
      if (!uid) return this.fallback.loadState();
      const { data, error } = await this.client
        .from(STATE_TABLE)
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToUserState(data as UserStateRow) : emptyState();
    } catch (err) {
      console.warn("[backend] loadState fell back to local:", err);
      return this.fallback.loadState();
    }
  }

  async saveState(state: UserState): Promise<void> {
    try {
      const uid = await this.userId();
      if (!uid) return this.fallback.saveState(state);
      const { error } = await this.client
        .from(STATE_TABLE)
        .upsert(userStateToRow(uid, state), { onConflict: "user_id" });
      if (error) throw error;
      await this.fallback.saveState(state);
    } catch (err) {
      console.warn("[backend] saveState fell back to local:", err);
      await this.fallback.saveState(state);
    }
  }
}

// --- store selection --------------------------------------------------------------------

function createStore(): ProgressStore {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const local = new LocalStore();
  if (url && key) {
    const client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return new SupabaseStore(client, local);
  }
  return local;
}

/** The process-wide progress store, chosen once from the environment. */
export const progressStore: ProgressStore = createStore();

export const ensureSession = (): Promise<void> => progressStore.ensureSession();
export const loadProgress = (): Promise<ProgressMap> => progressStore.loadProgress();
export const saveProgress = (items: readonly ItemProgress[]): Promise<void> =>
  progressStore.saveProgress(items);
export const loadState = (): Promise<UserState> => progressStore.loadState();
export const saveState = (state: UserState): Promise<void> => progressStore.saveState(state);
