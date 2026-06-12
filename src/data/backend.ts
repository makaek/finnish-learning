/**
 * data/backend.ts — persistence boundary for learning progress.
 *
 * Keeps `src/core` pure (no I/O there) by owning all storage here.
 *
 * **The Supabase backend is currently DISABLED** (see {@link BACKEND_ENABLED}): all state lives
 * in localStorage only, so the app is fully offline-first — nothing at startup can stall on the
 * network. The entire Supabase path (anonymous auth, outbox/retry, merge-on-load, sync-error
 * reporting) is kept compiled and dormant; flip the flag (with `VITE_SUPABASE_URL` /
 * `VITE_SUPABASE_ANON_KEY` configured) to restore server sync.
 *
 * When enabled: progress is saved to **Supabase**, and on any failure it transparently falls
 * back to `localStorage` + an outbox that retries, so `npm run dev`, tests, and offline use all
 * work with zero credentials. Identity is a Supabase **anonymous** session (no login UI): every
 * visitor gets a stable `user_id`, and row-level security limits each user to their own rows.
 * The anon key is public by design.
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
import { nsKey, storageLang } from "./languages/storage";

const TABLE = "progress";
const STATE_TABLE = "user_state";

// --- sync-error reporting ---------------------------------------------------------------
//
// The store degrades to localStorage on ANY failure so the app keeps working offline. But that
// also silently hid a real bug: a schema/constraint mismatch (PostgREST 42P10) made every upsert
// fail server-side, so progress only ever reached the device and the level never advanced. To make
// that diagnosable, EVERY caught backend failure is now surfaced to subscribers with its full
// detail (code/message/details/hint for a PostgREST error; the stringified error otherwise). The
// app still falls back to localStorage and keeps working — the banner is purely so a stuck sync is
// visible instead of silent. `kind` distinguishes a server REJECTION (PostgREST error, has a code)
// from a NETWORK reach failure (offline / fetch threw, no code), so the UI can word each correctly.
//
// On top of visibility, every failed write is QUEUED (an outbox in localStorage) and retried —
// when connectivity returns ("online" event), on the next save, and on the next app load — so
// progress made offline reaches the server once it's reachable instead of staying device-only.

/** A caught backend failure, surfaced for visibility (the store still degrades to localStorage). */
export interface SyncError {
  /** Which store operation failed. */
  op: "saveProgress" | "loadProgress" | "saveState" | "loadState";
  /** "rejected" = server refused it (PostgREST error w/ code); "network" = couldn't reach it. */
  kind: "rejected" | "network";
  /** PostgREST error code when present, e.g. "42P10" (bad ON CONFLICT) or "42501" (RLS denied). */
  code?: string;
  message: string;
  /** PostgREST `details`, if any (often the most specific clue). */
  details?: string;
  /** PostgREST `hint`, if any. */
  hint?: string;
  /** Writes currently queued for retry (progress records + the daily state, if pending). */
  pending: number;
}

/** Listeners get each failure, and `null` once a later sync succeeds (so a banner can clear). */
type SyncErrorListener = (err: SyncError | null) => void;
const syncErrorListeners = new Set<SyncErrorListener>();

/** Subscribe to backend sync errors; returns an unsubscribe function. */
export function onSyncError(listener: SyncErrorListener): () => void {
  syncErrorListeners.add(listener);
  return () => {
    syncErrorListeners.delete(listener);
  };
}

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" && v !== "" ? v : undefined;

/**
 * Report a caught backend failure to subscribers with as much detail as the error carries. A
 * PostgREST error is an object with `code`/`message`/`details`/`hint` (→ kind "rejected"); anything
 * else (a thrown fetch/TypeError when offline, etc.) becomes kind "network" with a best-effort
 * message. Exported for unit testing.
 */
export function reportSyncError(op: SyncError["op"], err: unknown): void {
  const e = (typeof err === "object" && err !== null ? err : {}) as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const code = asStr(e.code);
  const message = asStr(e.message) ?? String(err);
  const syncErr: SyncError = {
    op,
    kind: code ? "rejected" : "network",
    code,
    message,
    details: asStr(e.details),
    hint: asStr(e.hint),
    pending: pendingWrites(),
  };
  for (const listener of syncErrorListeners) listener(syncErr);
}

/** Tell subscribers the queue fully drained — everything previously stuck is on the server now. */
function reportSyncOk(): void {
  for (const listener of syncErrorListeners) listener(null);
}

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
      v.kind === "listen_sentence" ||
      v.kind === "reading" ||
      v.kind === "recite" ||
      v.kind === "grammar") &&
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
    const raw = globalThis.localStorage?.getItem(nsKey("progress"));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItemProgress) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: readonly ItemProgress[]): void {
  try {
    globalThis.localStorage?.setItem(nsKey("progress"), JSON.stringify(items));
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
    const raw = globalThis.localStorage?.getItem(nsKey("state"));
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    return isUserState(parsed) ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

function writeLocalState(state: UserState): void {
  try {
    globalThis.localStorage?.setItem(nsKey("state"), JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

// --- offline outbox ----------------------------------------------------------------------
//
// Writes that failed to reach the server (offline, rejection, no session) are queued here —
// per language, like every other local bucket — and retried until they land. The local MIRROR
// (readLocal/writeLocal) is the source of truth for display; the outbox is strictly "what the
// server hasn't acknowledged yet".

/** Pending progress writes, merged by key (a later write to the same item replaces the older). */
function readOutbox(): ItemProgress[] {
  try {
    const raw = globalThis.localStorage?.getItem(nsKey("outbox"));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItemProgress) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: readonly ItemProgress[]): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    if (items.length === 0) ls.removeItem(nsKey("outbox"));
    else ls.setItem(nsKey("outbox"), JSON.stringify(items));
  } catch {
    /* best-effort */
  }
}

/** The daily state pending upload, if the last saveState failed (a single row — latest wins). */
function readStateOutbox(): UserState | null {
  try {
    const raw = globalThis.localStorage?.getItem(nsKey("state-outbox"));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isUserState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStateOutbox(state: UserState | null): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    if (state === null) ls.removeItem(nsKey("state-outbox"));
    else ls.setItem(nsKey("state-outbox"), JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

/** How many writes are queued for retry (shown in the sync banner). */
export function pendingWrites(): number {
  return readOutbox().length + (readStateOutbox() ? 1 : 0);
}

/** Merge progress lists by item key; later lists win over earlier ones. */
function mergeProgress(...lists: readonly (readonly ItemProgress[])[]): ItemProgress[] {
  const map: ProgressMap = new Map();
  for (const list of lists) for (const p of list) map.set(progressKey(p.kind, p.itemId), p);
  return [...map.values()];
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
  /** Target language this progress belongs to ("fi"/"en") — namespaces per-language mastery. */
  language: string;
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
    language: storageLang(),
    kind: p.kind,
    item_id: p.itemId,
    box: p.box,
    correct_streak: p.correctStreak,
    total_correct: p.totalCorrect,
    total_seen: p.totalSeen,
    last_seen: p.lastSeen ? new Date(p.lastSeen).toISOString() : null,
  };
}

/** A `user_state` row (one per user per language); date columns are SQL `date` or null. */
export interface UserStateRow {
  user_id: string;
  /** Target language this daily-loop state belongs to ("fi"/"en") — per-language streaks. */
  language: string;
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
    language: storageLang(),
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
  /**
   * Serializes ALL writes (saves and queue flushes) so no two operations can race the outbox
   * read-modify-write — an unserialized flush could clear items a concurrent save just queued.
   * Every chained task catches internally, so the chain can't wedge on a rejection.
   */
  private writeChain: Promise<void> = Promise.resolve();

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task);
    return this.writeChain;
  }

  constructor(
    private readonly client: SupabaseClient,
    private readonly fallback: ProgressStore,
  ) {
    // The moment connectivity returns, push anything queued while offline.
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.flushPending());
    }
  }

  /**
   * Upload queued writes (progress outbox + pending daily state). Reports ok when all drained.
   * Note: the outbox keys are per-language (nsKey), so this flushes the ACTIVE language's queue;
   * the other language's queue (if any) flushes when its loadProgress runs on the next switch.
   */
  private flushPending(): Promise<void> {
    return this.enqueue(() => this.doFlushPending());
  }

  private async doFlushPending(): Promise<void> {
    const uid = await this.userId().catch(() => null);
    if (!uid) return; // still no session — the queue stays and the next trigger retries
    const pending = readOutbox();
    if (pending.length > 0) {
      try {
        const { error } = await this.client
          .from(TABLE)
          .upsert(pending.map((p) => progressToRow(uid, p)), {
            onConflict: "user_id,language,kind,item_id",
          });
        if (error) throw error;
        writeOutbox([]);
      } catch (err) {
        console.warn("[backend] flushing queued progress failed (will retry):", err);
        reportSyncError("saveProgress", err);
        return; // leave the state queued too; the next trigger retries both
      }
    }
    const pendingState = readStateOutbox();
    if (pendingState) {
      try {
        const { error } = await this.client
          .from(STATE_TABLE)
          .upsert(userStateToRow(uid, pendingState), { onConflict: "user_id,language" });
        if (error) throw error;
        writeStateOutbox(null);
      } catch (err) {
        console.warn("[backend] flushing queued state failed (will retry):", err);
        reportSyncError("saveState", err);
        return;
      }
    }
    if (pending.length > 0 || pendingState) reportSyncOk();
  }

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
      // No session (offline): the local mirror already holds everything, queued writes included.
      if (!uid) return this.fallback.loadProgress();
      const { data, error } = await this.client
        .from(TABLE)
        .select("*")
        .eq("user_id", uid)
        .eq("language", storageLang());
      if (error) throw error;
      const merged = toProgressMap((data ?? []).map((row) => rowToProgress(row as ProgressRow)));
      // RESCUE: a local-mirror record AHEAD of the server (missing there, or answered more
      // recently) is progress the server never received — a save that failed offline, possibly
      // before the outbox existed. Overlay it so it shows NOW, and queue it so it uploads.
      const rescued: ItemProgress[] = [];
      for (const local of readLocal()) {
        const server = merged.get(progressKey(local.kind, local.itemId));
        if (!server || local.lastSeen > server.lastSeen) {
          merged.set(progressKey(local.kind, local.itemId), local);
          rescued.push(local);
        }
      }
      // Combine with the queue. Per key: a rescued record wins over a queued one (the mirror is
      // written before the outbox on every save, so for a shared key the mirror is never older),
      // while queue-only records (e.g. lastSeen-0 resets, which the mirror comparison above
      // would lose) survive untouched.
      const queued = mergeProgress(readOutbox(), rescued);
      for (const p of queued) merged.set(progressKey(p.kind, p.itemId), p);
      if (rescued.length > 0) writeOutbox(queued);
      // Refresh the mirror to the merged truth, then push the queue (failure → visible banner).
      writeLocal([...merged.values()]);
      if (pendingWrites() > 0) void this.flushPending();
      return merged;
    } catch (err) {
      console.warn("[backend] loadProgress fell back to local:", err);
      reportSyncError("loadProgress", err);
      return this.fallback.loadProgress();
    }
  }

  saveProgress(items: readonly ItemProgress[]): Promise<void> {
    if (items.length === 0) return Promise.resolve();
    return this.enqueue(() => this.doSaveProgress(items));
  }

  private async doSaveProgress(items: readonly ItemProgress[]): Promise<void> {
    // Mirror locally FIRST — whatever the network does, this device never loses the write.
    await this.fallback.saveProgress(items);
    // One upsert carries the new items plus anything still queued from earlier failures.
    const batch = mergeProgress(readOutbox(), items);
    try {
      const uid = await this.userId();
      if (!uid) throw new Error("нет сессии — анонимный вход не выполнен (offline?)");
      const rows = batch.map((item) => progressToRow(uid, item));
      const { error } = await this.client
        .from(TABLE)
        .upsert(rows, { onConflict: "user_id,language,kind,item_id" });
      if (error) throw error;
      writeOutbox([]);
      // The daily state may still be queued; drain it too before declaring the sync clean.
      if (readStateOutbox()) void this.flushPending();
      else reportSyncOk();
    } catch (err) {
      writeOutbox(batch); // queue the whole batch for retry (online event / next save / next load)
      console.warn("[backend] saveProgress queued for retry:", err);
      reportSyncError("saveProgress", err);
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
        .eq("language", storageLang())
        .maybeSingle();
      if (error) throw error;
      const server = data ? rowToUserState(data as UserStateRow) : emptyState();
      // RESCUE (like loadProgress): the freshest local candidate — the queued (unsynced) state
      // if present, else the mirror — wins over the server only when it's actually AHEAD (a save
      // that never landed). The server is always consulted, so a stale leftover queue entry
      // can't pin the visible state to an older day — it gets dropped instead.
      const local = readStateOutbox() ?? (await this.fallback.loadState());
      const localAhead =
        local.todayDate > server.todayDate ||
        (local.todayDate === server.todayDate &&
          (local.lessons > server.lessons ||
            (local.lessons === server.lessons && local.answered > server.answered)));
      if (localAhead) {
        writeStateOutbox(local);
        await this.fallback.saveState(local);
        void this.flushPending();
        return local;
      }
      writeStateOutbox(null); // anything still queued is not newer than the server — drop it
      await this.fallback.saveState(server); // keep the offline mirror fresh
      return server;
    } catch (err) {
      console.warn("[backend] loadState fell back to local:", err);
      reportSyncError("loadState", err);
      return this.fallback.loadState();
    }
  }

  saveState(state: UserState): Promise<void> {
    return this.enqueue(() => this.doSaveState(state));
  }

  private async doSaveState(state: UserState): Promise<void> {
    // Mirror locally first, same rationale as saveProgress.
    await this.fallback.saveState(state);
    try {
      const uid = await this.userId();
      if (!uid) throw new Error("нет сессии — анонимный вход не выполнен (offline?)");
      const { error } = await this.client
        .from(STATE_TABLE)
        .upsert(userStateToRow(uid, state), { onConflict: "user_id,language" });
      if (error) throw error;
      writeStateOutbox(null);
      if (readOutbox().length > 0) void this.flushPending();
      else reportSyncOk();
    } catch (err) {
      writeStateOutbox(state); // latest state wins — a single queued row is enough
      console.warn("[backend] saveState queued for retry:", err);
      reportSyncError("saveState", err);
    }
  }
}

// --- store selection --------------------------------------------------------------------

/**
 * Master switch for the Supabase backend. `false` = local-only persistence (the current mode):
 * the app never touches the network for progress, so an offline PWA boots instantly. Flip to
 * `true` (with the VITE_SUPABASE_* env vars set) to restore server sync — stale outbox entries
 * left in localStorage are then drained by the rescue/flush logic on the next load; do NOT
 * clear them while disabled.
 */
const BACKEND_ENABLED = false;

function createStore(): ProgressStore {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const local = new LocalStore();
  if (BACKEND_ENABLED && url && key) {
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
