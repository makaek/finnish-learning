import { useEffect, useMemo, useRef, useState } from "react";
import { getPack } from "../data/languages/registry";
import { setStorageLang } from "../data/languages/storage";
import { setActiveTitles } from "../data/levelTitles";
import { loadLang, saveLang } from "./language";
import type { LangId } from "../data/languages/types";
import { rulesForPos, rulesForTeaches } from "../core/rules";
import {
  buildSession,
  DEFAULT_OPTION_COUNT,
  DEFAULT_SESSION_SIZE,
  SENTENCE_SESSION_SIZE,
} from "../core/quiz";
import { buildProductionSession } from "../core/produce";
import { buildSentenceSession } from "../core/sentenceSession";
import { buildMixedSession, MIX_SESSION_SIZE, type MixQuestion } from "../core/mixed";
import { applyOutcome } from "../core/srs";
import {
  activeVocab,
  eligibleSentences,
  masteringLevelGated,
  levelOf,
  LEARNED_BOX,
  WORD_MODES,
  SENTENCE_MODES,
} from "../core/levels";
import {
  completeLesson,
  currentStreak,
  dateKey,
  emptyState,
  recordAnswer,
  type UserState,
} from "../core/daily";
import {
  getProgress,
  progressKey,
  MAX_BOX,
  MIN_BOX,
  type ItemKind,
  type ItemProgress,
  type ProgressMap,
} from "../core/progress";
import { reciteRoleDone, reciteRoleId, reciteRoles } from "../core/reading";
import {
  loadProgress,
  loadState,
  onSyncError,
  saveProgress,
  saveState,
  type SyncError,
} from "../data/backend";
import { hiddenKey, loadHidden, saveHidden, type Group } from "./hidden";
import { loadRead, saveRead } from "./readingState";
import Roadmap, { type Mode } from "./Roadmap";
import Dashboard from "./Dashboard";
import Levels from "./Levels";
import RulesBook from "./RulesBook";
import Reading from "./Reading";
import BottomNav, { type HomeScreen } from "./BottomNav";
import { UiIcon } from "./icons";
import RecognitionCard from "./RecognitionCard";
import ProductionCard from "./ProductionCard";
import SentenceCard from "./SentenceCard";
import SessionSummary from "./SessionSummary";

/** `?test=1` unlocks every level and treats all words as learned, to bypass the curriculum. */
function readTestMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("test");
}

/**
 * Root: a level-gated home (Roadmap) plus one in-memory session of the chosen exercise.
 * Each answer advances the learner's mastery (Leitner box) and persists it via the backend;
 * sessions are weighted by mastery and gated by curriculum level so new words and sentences
 * appear only as earlier ones are learned.
 */
export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  // Active TARGET language (the L2). The initializer POINTS persistence + level titles at the saved
  // language up front — synchronously, before the hidden/read useState initializers and the load
  // effect below run — so every read hits this language's (namespaced) storage. `changeLang` does
  // the same on a switch; the pack memo itself stays pure. getPack returns a stable per-id object.
  const [lang, setLang] = useState<LangId>(() => {
    const id = loadLang();
    setStorageLang(id);
    const p = getPack(id);
    setActiveTitles(p.titles, p.bands);
    return id;
  });
  const pack = useMemo(() => getPack(lang), [lang]);
  // Which non-exercise screen the home shows when mode is null.
  const [homeScreen, setHomeScreen] = useState<HomeScreen>("roadmap");
  // When the reading library is open, which kind it shows (set by the home "Чтение" cards).
  const [readingFilter, setReadingFilter] = useState<"text" | "dialog">("text");
  // In-lesson grammar overlay: open over the current card, highlighting the relevant rules.
  const [rulesOpen, setRulesOpen] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [testMode] = useState(readTestMode);
  // Items excluded from every lesson — the learner's hidden / «уже знаю» set, persisted locally.
  // Added to in-lesson via «Уже знаю» (descope an item you already know); legacy hides load too.
  const [hidden, setHidden] = useState<Set<string>>(loadHidden);
  // Texts/dialogs the learner has finished (read or rehearsed). Lifted here from Reading so the
  // home/dashboard/progress screens can fold reading into level completion. Device-local, like
  // `hidden` — same persistence rationale (a view marker, not graded data).
  const [read, setRead] = useState<Set<string>>(loadRead);

  function markRead(id: string) {
    setRead((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRead(next);
      return next;
    });
  }

  // Live mastery map, held in a ref so recording an answer never reshuffles the session
  // mid-run: builders read it only when (re)seeded on `start`. `progressView` mirrors it for
  // the home screen (updated on load and on returning home), so the roadmap stays reactive
  // without making the active session depend on it.
  const progressRef = useRef<ProgressMap>(new Map());
  const [progressView, setProgressView] = useState<ProgressMap>(new Map());
  const [ready, setReady] = useState(false);
  // Last server-side persistence REJECTION (e.g. a schema/constraint mismatch), surfaced as a
  // banner so a silent fall-back to localStorage can't hide a "progress isn't saving" bug again.
  // Only PostgREST rejections reach here (see backend.onSyncError) — offline blips stay quiet.
  const [syncError, setSyncError] = useState<SyncError | null>(null);
  // Guards against double-recording the same card (e.g. a fast double-tap before re-render).
  const lastRecordedRef = useRef<string | null>(null);
  // Daily-loop state (streak + today's count), same ref+view pattern as progress.
  const dailyRef = useRef<UserState>(emptyState());
  const [dailyView, setDailyView] = useState<UserState>(emptyState());
  // Keyed on `lang`: on first mount AND on every language switch, (re)load THIS language's progress
  // + daily state from its own storage namespace (setStorageLang already ran in the pack memo).
  useEffect(() => {
    let active = true;
    setReady(false);
    void Promise.all([loadProgress(), loadState()]).then(([loadedProgress, loadedState]) => {
      if (!active) return;
      progressRef.current = loadedProgress;
      setProgressView(loadedProgress);
      dailyRef.current = loadedState;
      setDailyView(loadedState);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [lang]);

  // Surface server-side persistence rejections (subscribed once for the app's lifetime). The
  // backend keeps working via its localStorage fallback, but a rejection means progress isn't
  // reaching the server — the user should know rather than silently lose cross-device sync.
  useEffect(() => onSyncError(setSyncError), []);

  /**
   * Switch the target language: persist the choice, point storage at the new namespace, reload the
   * device-local hidden/read sets from it, return to the home screen, and let the `lang`-keyed effect
   * + pack memo reload progress and swap content. The two languages' progress stay fully independent.
   */
  function changeLang(next: LangId) {
    if (next === lang) return;
    saveLang(next);
    // Point storage + level titles at the new language NOW, so the loadHidden/loadRead reads below
    // (and the title resolver during the next render) use the new namespace. The `lang`-keyed effect
    // then reloads progress/state; the pack memo swaps the content.
    setStorageLang(next);
    const p = getPack(next);
    setActiveTitles(p.titles, p.bands);
    setHidden(loadHidden());
    setRead(loadRead());
    setMode(null);
    setHomeScreen("roadmap");
    setLang(next);
  }

  // The level selection centres on: the gated mastering level, so every session draws ~70% from
  // the current level + ~30% earlier-level leftovers and NEVER from levels above it. Test mode opts
  // out (it unlocks everything, so a tester must be able to drill any level). Seed-keyed so it
  // re-reads the live mastery on each `start`.
  const sessionLevel = useMemo(
    () => (testMode ? undefined : masteringLevelGated(pack.vocab, pack.sentences, pack.texts, progressRef.current)),
    // `seed` is intentional (like the pool memos): it re-reads progressRef.current on each `start`.
    // `pack` is listed so a language switch recomputes the gated level from the new content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, testMode, pack],
  );

  // In-play pools: gated by level (and the learned-words rule for sentences), minus items the
  // learner has hidden (fully mastered → removed from every lesson). Reading progressRef (a
  // ref, not a dep) keeps gating/weighting current as of the last `start`; `seed` reseeds on
  // entry, and `hidden` makes hiding/unhiding take effect on the next session.
  const recognition = useMemo(
    () =>
      buildSession(
        activeVocab(pack.vocab, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        DEFAULT_OPTION_COUNT,
        progressRef.current,
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  const production = useMemo(
    () =>
      buildProductionSession(
        activeVocab(pack.vocab, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
        "production",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  const sentences = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(pack.sentences, pack.vocab, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
        "sentences",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  // Voice variants: same pools/questions as production/sentences, but weighted by their own
  // track so spoken practice is repeated and mastered independently.
  const sayWord = useMemo(
    () =>
      buildProductionSession(
        activeVocab(pack.vocab, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
        "say_word",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  const saySentence = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(pack.sentences, pack.vocab, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
        "say_sentence",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  // Listening (dictation) variants: same pools as production/sentences, but the prompt is
  // spoken Finnish (TTS) and the learner types what they hear; weighted by their own track.
  const listenWord = useMemo(
    () =>
      buildProductionSession(
        activeVocab(pack.vocab, progressRef.current, testMode).filter(
          (v) => !hidden.has(hiddenKey("word", v.id)),
        ),
        seed,
        DEFAULT_SESSION_SIZE,
        progressRef.current,
        "listen_word",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  const listenSentence = useMemo(
    () =>
      buildSentenceSession(
        eligibleSentences(pack.sentences, pack.vocab, progressRef.current, testMode).filter(
          (s) => !hidden.has(hiddenKey("sentence", s.id)),
        ),
        seed,
        SENTENCE_SESSION_SIZE,
        undefined,
        progressRef.current,
        "listen_sentence",
        sessionLevel,
      ),
    [seed, testMode, hidden, sessionLevel, pack],
  );
  // Микс ("добить уровень"): one run interleaving every word/sentence mode's NOT-yet-mastered
  // items at the current (gated) level — no reading. Each question carries the track it records,
  // so it routes to the right card + progress kind. Same pools/gating as the dedicated modes.
  const mixed = useMemo(() => {
    const level = masteringLevelGated(pack.vocab, pack.sentences, pack.texts, progressRef.current);
    const words = activeVocab(pack.vocab, progressRef.current, testMode).filter(
      (v) => !hidden.has(hiddenKey("word", v.id)),
    );
    const sents = eligibleSentences(pack.sentences, pack.vocab, progressRef.current, testMode).filter(
      (s) => !hidden.has(hiddenKey("sentence", s.id)),
    );
    return buildMixedSession(words, sents, progressRef.current, level, seed, MIX_SESSION_SIZE);
  }, [seed, testMode, hidden, pack]);

  function start(next: Mode) {
    // Refresh the home view now so it's current whenever we return — covers restart(), which
    // re-enters a mode without passing through goHome().
    setProgressView(new Map(progressRef.current));
    setMode(next);
    setSeed(Date.now());
    setIndex(0);
    setScore(0);
    setRulesOpen(false);
  }

  /**
   * Test-mode helper: mark every word and sentence mastered so unlocks (and the progress
   * screen, which lists items answered correctly at least once) can be exercised. Writes a
   * coherent "perfect" record — MAX_BOX correct out of MAX_BOX seen — not fake history.
   * Persists to the backend on purpose, so a tester can confirm it survives a reload — do
   * NOT add a no-persist guard.
   */
  function fillAllMastered() {
    const now = Date.now();
    const rows: ItemProgress[] = [];
    const mark = (kind: ItemKind, id: string) => {
      const p: ItemProgress = {
        kind,
        itemId: id,
        box: MAX_BOX,
        correctStreak: MAX_BOX,
        totalCorrect: MAX_BOX,
        totalSeen: MAX_BOX,
        lastSeen: now,
      };
      progressRef.current.set(progressKey(kind, id), p);
      rows.push(p);
    };
    for (const v of pack.vocab) {
      mark("recognition", v.id);
      mark("production", v.id);
      mark("say_word", v.id);
      mark("listen_word", v.id);
    }
    for (const s of pack.sentences) {
      mark("sentences", s.id);
      mark("say_sentence", s.id);
      mark("listen_sentence", s.id);
    }
    for (const t of pack.texts) {
      mark("reading", t.id);
    }
    setProgressView(new Map(progressRef.current));
    void saveProgress(rows);
  }

  /**
   * «Отметить пройденным» — mark every item in `level` as mastered. Raises the four word modes,
   * three sentence modes, and both reading parts (comprehension quiz + recitation in every role)
   * to MAX_BOX for the level's items. The current level is DERIVED ({@link masteringLevelGated}),
   * so mastering a level's items advances it and unlocks the next; nothing relocks. Idempotent —
   * items already at MAX_BOX are skipped, so re-running writes nothing. Persisted (fire-and-forget).
   * Only `box`/`lastSeen` change (no fabricated answer history), so accuracy stays honest.
   */
  /**
   * Visit every progress track of a level's items (4 word modes, 3 sentence modes, the reading
   * comprehension track + recitation aggregate and per-role), calling `visit(kind, id)`. Shared by
   * mark-passed and clean so the two always cover EXACTLY the same records.
   */
  function forEachLevelTrack(level: number, visit: (kind: ItemKind, id: string) => void) {
    for (const v of pack.vocab) {
      if (levelOf(v) !== level) continue;
      for (const kind of WORD_MODES) visit(kind, v.id);
    }
    for (const s of pack.sentences) {
      if (levelOf(s) !== level) continue;
      for (const kind of SENTENCE_MODES) visit(kind, s.id);
    }
    for (const t of pack.texts) {
      if (levelOf(t) !== level) continue;
      visit("reading", t.id); // comprehension-quiz track
      for (const role of reciteRoles(t)) visit("recite", reciteRoleId(t.id, role)); // per-role recite
      visit("recite", t.id); // role-agnostic aggregate that readingMastered reads
    }
  }

  /**
   * «Отметить пройденным» — mark every item in `level` as learned. Writes a coherent record (box =
   * LEARNED_BOX with totalSeen/totalCorrect = 2, so it reads as "2 clean answers" rather than a
   * box-only record with no practice history). Math.max never regresses a learner's real, higher
   * history and keeps totalSeen ≥ totalCorrect.
   * EVERY level item is upserted (no idempotency skip) so the backend definitely gets all rows. The
   * current level is DERIVED ({@link masteringLevelGated}), so this advances it + unlocks the next;
   * nothing relocks. Persisted (fire-and-forget).
   */
  function markLevelPassed(level: number) {
    const now = Date.now();
    const rows: ItemProgress[] = [];
    forEachLevelTrack(level, (kind, id) => {
      const prev = getProgress(progressRef.current, kind, id);
      const p: ItemProgress = {
        ...prev,
        kind,
        itemId: id,
        box: Math.max(prev.box, LEARNED_BOX),
        correctStreak: Math.max(prev.correctStreak, 2),
        totalCorrect: Math.max(prev.totalCorrect, 2),
        totalSeen: Math.max(prev.totalSeen, prev.totalCorrect, 2),
        lastSeen: now,
      };
      progressRef.current.set(progressKey(kind, id), p);
      rows.push(p);
    });
    setProgressView(new Map(progressRef.current));
    if (rows.length > 0) void saveProgress(rows);
  }

  /**
   * «Очистить уровень» — reset every track of a level's items to a brand-new record (box MIN_BOX, no
   * streak/seen/correct), persisted so the reset survives a reload. Used to redo the current level
   * from scratch and as the mechanism behind a rollback (cleaning the PREVIOUS level moves the derived
   * current level back to it). Only ever invoked for the current level / the level just below it, so
   * it can't strand a half-finished level ahead (no gap).
   */
  function cleanLevel(level: number) {
    const rows: ItemProgress[] = [];
    forEachLevelTrack(level, (kind, id) => {
      const p: ItemProgress = {
        kind,
        itemId: id,
        box: MIN_BOX,
        correctStreak: 0,
        totalCorrect: 0,
        totalSeen: 0,
        lastSeen: 0,
      };
      progressRef.current.set(progressKey(kind, id), p);
      rows.push(p);
    });
    setProgressView(new Map(progressRef.current));
    if (rows.length > 0) void saveProgress(rows);
  }

  /** Update the current item's mastery from the answer and persist it (fire-and-forget). */
  function recordOutcome(wasCorrect: boolean) {
    if (mode === null) return;
    // The exercise mode IS the progress track — each lesson type (incl. the two voice ones)
    // is recorded separately. `wasCorrect` is the FIRST-attempt result (the forced-correction
    // retry never changes it), so only first attempts count. The mix run is the exception: each
    // question carries its OWN kind (the track it drills), so we read that per-question. When
    // mode === "mix", mixItem is always defined here — recordOutcome only fires while a card is on
    // screen (index < total === mixed.length) — so the kind/id always come from it.
    const mixItem = mode === "mix" ? mixed[index] : undefined;
    const kind: ItemKind = mixItem ? mixItem.kind : (mode as ItemKind);
    const id = mixItem
      ? mixItem.card === "sentence"
        ? mixItem.q.id
        : mixItem.q.itemId
      : mode === "sentences"
        ? sentences[index]?.id
        : mode === "say_sentence"
          ? saySentence[index]?.id
          : mode === "listen_sentence"
            ? listenSentence[index]?.id
            : mode === "production"
              ? production[index]?.itemId
              : mode === "say_word"
                ? sayWord[index]?.itemId
                : mode === "listen_word"
                  ? listenWord[index]?.itemId
                  : recognition[index]?.itemId;
    if (id === undefined) return; // index past the end of the session — nothing to record
    // Each card key is unique per seed+mode+index, so this tag dedupes a double-fire.
    const tag = `${mode}:${seed}:${index}`;
    if (lastRecordedRef.current === tag) return;
    lastRecordedRef.current = tag;
    const next = applyOutcome(getProgress(progressRef.current, kind, id), wasCorrect, Date.now());
    // Mutating .current directly is intentional: refs don't trigger re-renders, so the
    // active session stays put; the next start()/reseed reads the updated mastery.
    progressRef.current.set(progressKey(kind, id), next);
    void saveProgress([next]);
  }

  /**
   * «Уже знаю» — descope a single word/sentence item: mark EVERY mode of its group (word: 4 /
   * sentence: 3) as learned (box ≥ LEARNED_BOX, a coherent 2/2 record) and HIDE it from lessons
   * (the existing hidden-set mechanism). Used by the in-lesson «Уже знаю» AND the level page's
   * swipe-to-know, so a known item actually counts toward level completion. Persisted.
   */
  function markItemKnown(group: Group, itemId: string) {
    const now = Date.now();
    const rows: ItemProgress[] = [];
    for (const kind of group === "word" ? WORD_MODES : SENTENCE_MODES) {
      const prev = getProgress(progressRef.current, kind, itemId);
      const p: ItemProgress = {
        ...prev,
        kind,
        itemId,
        box: Math.max(prev.box, LEARNED_BOX),
        correctStreak: Math.max(prev.correctStreak, LEARNED_BOX),
        totalCorrect: Math.max(prev.totalCorrect, LEARNED_BOX),
        totalSeen: Math.max(prev.totalSeen, prev.totalCorrect, LEARNED_BOX),
        lastSeen: now,
      };
      progressRef.current.set(progressKey(kind, itemId), p);
      rows.push(p);
    }
    setHidden((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(hiddenKey(group, itemId));
      saveHidden(nextSet);
      return nextSet;
    });
    setProgressView(new Map(progressRef.current));
    if (rows.length > 0) void saveProgress(rows);
  }

  /**
   * «Вернуть в уроки» — per-item reset (undo «Уже знаю» / un-master). Zeroes every track of the item
   * (word: 4 modes / sentence: 3 / text: the reading quiz + the recite aggregate & per-role records)
   * and removes it from the hidden set, so it re-enters the active list with a cleared strip. The
   * single-item analogue of {@link cleanLevel}. Persisted.
   */
  function resetItem(group: Group | "text", id: string) {
    const rows: ItemProgress[] = [];
    const zero = (kind: ItemKind, itemId: string) => {
      const p: ItemProgress = {
        kind,
        itemId,
        box: MIN_BOX,
        correctStreak: 0,
        totalCorrect: 0,
        totalSeen: 0,
        lastSeen: 0,
      };
      progressRef.current.set(progressKey(kind, itemId), p);
      rows.push(p);
    };
    if (group === "text") {
      zero("reading", id);
      const text = pack.texts.find((t) => t.id === id);
      if (text) for (const role of reciteRoles(text)) zero("recite", reciteRoleId(id, role));
      zero("recite", id);
    } else {
      for (const kind of group === "word" ? WORD_MODES : SENTENCE_MODES) zero(kind, id);
      setHidden((prev) => {
        if (!prev.has(hiddenKey(group, id))) return prev;
        const nextSet = new Set(prev);
        nextSet.delete(hiddenKey(group, id));
        saveHidden(nextSet);
        return nextSet;
      });
    }
    setProgressView(new Map(progressRef.current));
    if (rows.length > 0) void saveProgress(rows);
  }

  /** In-lesson «Уже знаю»: descope the CURRENT card's item, then skip to the next without scoring. */
  function markKnown() {
    if (mode === null) return;
    const mixItem = mode === "mix" ? mixed[index] : undefined;
    let group: Group;
    let id: string | undefined;
    if (mixItem) {
      group = mixItem.card === "sentence" ? "sentence" : "word";
      id = mixItem.card === "sentence" ? mixItem.q.id : mixItem.q.itemId;
    } else if (mode === "sentences" || mode === "say_sentence" || mode === "listen_sentence") {
      group = "sentence";
      id =
        mode === "sentences"
          ? sentences[index]?.id
          : mode === "say_sentence"
            ? saySentence[index]?.id
            : listenSentence[index]?.id;
    } else {
      group = "word";
      id =
        mode === "production"
          ? production[index]?.itemId
          : mode === "say_word"
            ? sayWord[index]?.itemId
            : mode === "listen_word"
              ? listenWord[index]?.itemId
              : recognition[index]?.itemId;
    }
    if (id === undefined) return;
    markItemKnown(group, id);
    setRulesOpen(false);
    setIndex((i) => i + 1); // skip this item — descoped, not answered (no score/daily change)
  }

  /** Length of the active session — used to detect when this answer completes a lesson. */
  function activeTotal(): number {
    if (mode === "mix") return mixed.length;
    if (mode === "sentences") return sentences.length;
    if (mode === "say_sentence") return saySentence.length;
    if (mode === "listen_sentence") return listenSentence.length;
    if (mode === "production") return production.length;
    if (mode === "say_word") return sayWord.length;
    if (mode === "listen_word") return listenWord.length;
    return recognition.length;
  }

  /** Reading: count a finished role-play as one lesson (no answer → accuracy untouched). */
  function countReadingLesson() {
    const next = completeLesson(dailyRef.current, dateKey());
    dailyRef.current = next;
    setDailyView(next);
    void saveState(next);
  }

  /**
   * Record a completed comprehension quiz on the text's `reading` track (one record per text).
   * `wasCorrect` is the all-first-attempts-correct result. A SINGLE fully-correct run marks the
   * text PASSED — its box reaches LEARNED_BOX (so it counts as done for level completion and the
   * library ✓), without claiming full mastery; repeated correct runs climb the box higher. A run
   * with any miss applies the normal demotion. Persisted; the ref mutation keeps any view stable.
   */
  function recordReading(textId: string, wasCorrect: boolean) {
    let next = applyOutcome(getProgress(progressRef.current, "reading", textId), wasCorrect, Date.now());
    if (wasCorrect) next = { ...next, box: Math.max(next.box, LEARNED_BOX) };
    progressRef.current.set(progressKey("reading", textId), next);
    setProgressView(new Map(progressRef.current));
    void saveProgress([next]);
  }

  /**
   * Record that a text/dialog was recited наизусть in one `role` (SOLO_ROLE for a monologue). Writes
   * the per-role `recite` record, and — once EVERY role has been recited — the role-agnostic
   * aggregate `recite:${textId}` that {@link readingMastered} reads. The aggregate is the second of
   * the two parts (with the comprehension quiz) that mark a text «Прочитано» / count it to its level.
   */
  function recordRecite(textId: string, role: string) {
    const text = pack.texts.find((t) => t.id === textId);
    if (!text) return;
    const now = Date.now();
    const writes: ItemProgress[] = [];
    const roleId = reciteRoleId(textId, role);
    const prevRole = getProgress(progressRef.current, "recite", roleId);
    const roleRec: ItemProgress = {
      ...prevRole,
      kind: "recite",
      itemId: roleId,
      box: MAX_BOX,
      correctStreak: prevRole.correctStreak + 1,
      totalCorrect: prevRole.totalCorrect + 1,
      totalSeen: prevRole.totalSeen + 1,
      lastSeen: now,
    };
    progressRef.current.set(progressKey("recite", roleId), roleRec);
    writes.push(roleRec);
    // Promote to the aggregate "all roles recited" flag once every role's record is set.
    if (reciteRoles(text).every((r) => reciteRoleDone(progressRef.current, textId, r))) {
      const prevAgg = getProgress(progressRef.current, "recite", textId);
      const aggRec: ItemProgress = { ...prevAgg, kind: "recite", itemId: textId, box: MAX_BOX, lastSeen: now };
      progressRef.current.set(progressKey("recite", textId), aggRec);
      writes.push(aggRec);
    }
    setProgressView(new Map(progressRef.current));
    void saveProgress(writes);
  }

  /** Record one answer toward today's goal; on the session's last answer, count a lesson. */
  function recordDaily(wasCorrect: boolean, lessonDone: boolean) {
    const today = dateKey();
    let next = recordAnswer(dailyRef.current, today, wasCorrect);
    if (lessonDone) next = completeLesson(next, today);
    dailyRef.current = next;
    setDailyView(next);
    void saveState(next);
  }

  function handleAnswered(wasCorrect: boolean) {
    recordOutcome(wasCorrect);
    recordDaily(wasCorrect, index + 1 >= activeTotal());
    if (wasCorrect) setScore((s) => s + 1);
    setIndex((i) => i + 1);
    setRulesOpen(false); // close the grammar overlay so the next item starts clean
  }

  function restart() {
    if (mode) start(mode);
  }

  function goHome() {
    // Refresh the home view from the latest mastery before leaving the session.
    setProgressView(new Map(progressRef.current));
    setHomeScreen("roadmap");
    setMode(null);
    setRulesOpen(false);
  }

  // A persistent, dismissible diagnostic when a backend request failed (so progress is only landing
  // in this device's localStorage). Shown on every screen — the failure fires during a session but
  // the user feels it as "my level won't advance" on the home screen. Shows the FULL error detail
  // (op · code · message · details · hint) so a stuck sync can be diagnosed straight from the phone.
  const syncBanner = syncError && (
    <div className="syncbanner" role="alert">
      <div className="syncbanner__body">
        <strong className="syncbanner__title">
          {syncError.kind === "rejected"
            ? "Сервер отклонил сохранение — прогресс только на этом устройстве"
            : "Не удалось связаться с сервером — прогресс только на этом устройстве"}
        </strong>
        <code className="syncbanner__detail">
          {syncError.op}
          {syncError.code ? ` · ${syncError.code}` : ""} · {syncError.message}
          {syncError.details ? `\ndetails: ${syncError.details}` : ""}
          {syncError.hint ? `\nhint: ${syncError.hint}` : ""}
        </code>
      </div>
      <button
        type="button"
        className="syncbanner__close"
        onClick={() => setSyncError(null)}
        aria-label="Скрыть предупреждение"
      >
        ×
      </button>
    </div>
  );

  if (mode === null) {
    // The home shell: one of the home screens, with the persistent bottom tab bar that navigates
    // between them. (The standalone «Прогресс» screen was removed — per-item progress now lives on
    // each level page, reached via Метрики → Уровни.)
    let screen;
    if (homeScreen === "reading") {
      screen = (
        <Reading
          vocab={pack.vocab}
          texts={pack.texts}
          gradeQuestion={pack.gradeQuestion}
          progress={progressView}
          testMode={testMode}
          onMarkRead={markRead}
          onLessonDone={countReadingLesson}
          onReadingResult={recordReading}
          onRecited={recordRecite}
          filterType={readingFilter}
          onBack={() => setHomeScreen("roadmap")}
        />
      );
    } else if (homeScreen === "rules") {
      screen = <RulesBook rules={pack.rules} />;
    } else if (homeScreen === "dashboard") {
      screen = (
        <Dashboard
          vocab={pack.vocab}
          sentences={pack.sentences}
          texts={pack.texts}
          progress={progressView}
          daily={dailyView}
          testMode={testMode}
          onGoLevels={() => setHomeScreen("levels")}
          onStart={start}
          onOpenReading={(type) => {
            setReadingFilter(type);
            setHomeScreen("reading");
          }}
        />
      );
    } else if (homeScreen === "levels") {
      screen = (
        <Levels
          vocab={pack.vocab}
          sentences={pack.sentences}
          texts={pack.texts}
          progress={progressView}
          hidden={hidden}
          read={read}
          onBack={() => setHomeScreen("dashboard")}
          onStart={start}
          onMarkPassed={markLevelPassed}
          onCleanLevel={cleanLevel}
          onKnown={markItemKnown}
          onResetItem={resetItem}
        />
      );
    } else {
      screen = (
        <Roadmap
          vocab={pack.vocab}
          sentences={pack.sentences}
          texts={pack.texts}
          progress={progressView}
          daily={dailyView}
          hidden={hidden}
          testMode={testMode}
          ready={ready}
          brand={pack.brand}
          lang={lang}
          onChangeLang={changeLang}
          onStart={start}
          onOpenReading={(type) => {
            setReadingFilter(type);
            setHomeScreen("reading");
          }}
          onTestFill={fillAllMastered}
          onShowStats={() => setHomeScreen("dashboard")}
        />
      );
    }
    return (
      <div className="home">
        {syncBanner}
        {screen}
        <BottomNav active={homeScreen} onSelect={setHomeScreen} />
      </div>
    );
  }

  // Each mode runs its own session; the voice modes reuse the production/sentence card +
  // grader but have their own session (weighted by their own track).
  const usesSentences =
    mode === "sentences" || mode === "say_sentence" || mode === "listen_sentence";
  const usesProduction = mode === "production" || mode === "say_word" || mode === "listen_word";
  const productionSession =
    mode === "say_word" ? sayWord : mode === "listen_word" ? listenWord : production;
  const sentenceSession =
    mode === "say_sentence" ? saySentence : mode === "listen_sentence" ? listenSentence : sentences;
  // The mix run carries its card type + track per question; everything else is a homogeneous mode.
  const mixItem = mode === "mix" ? mixed[index] : undefined;
  const total =
    mode === "mix"
      ? mixed.length
      : usesProduction
        ? productionSession.length
        : usesSentences
          ? sentenceSession.length
          : recognition.length;
  const finished = index >= total;
  // An exercise card is on screen (vs. the empty/summary states). Top-align + scroll these
  // so a typed answer's submit button stays reachable above the on-screen keyboard (and its
  // autofill toolbar) instead of being centered behind it.
  const showingCard = !finished && total > 0;

  /** The Russian word/sentence whose grammar rules to surface, given a card's source id. */
  const wordRules = (wordId?: string): string[] => {
    const word = wordId ? pack.vocab.find((v) => v.id === wordId) : undefined;
    return word ? rulesForPos(word.pos, pack.rules).map((r) => r.id) : [];
  };
  const sentenceRules = (sentenceId?: string): string[] =>
    rulesForTeaches(pack.sentences.find((s) => s.id === sentenceId)?.teaches, pack.rules).map((r) => r.id);

  // Rules relevant to the item on screen — highlighted ⭐ and pre-opened in the grammar overlay.
  // Sentences match by their `teaches` tag; words match by part of speech. The mix run resolves
  // from the current tagged question; the homogeneous modes from their session.
  const ruleHighlights: string[] = !showingCard
    ? []
    : mixItem
      ? mixItem.card === "sentence"
        ? sentenceRules(mixItem.q.id)
        : wordRules(mixItem.q.itemId)
      : usesSentences
        ? sentenceRules(sentenceSession[index]?.id)
        : wordRules(usesProduction ? productionSession[index]?.itemId : recognition[index]?.itemId);

  /** Render the active mix question on its matching card (each is tagged with its card + track). */
  const renderMix = (m: MixQuestion) => {
    if (m.card === "sentence") {
      return (
        <SentenceCard
          key={index}
          question={m.q}
          questionNumber={index + 1}
          total={total}
          grade={pack.grade}
          voice={m.voice}
          listen={m.listen}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      );
    }
    if (m.card === "production") {
      return (
        <ProductionCard
          key={index}
          question={m.q}
          questionNumber={index + 1}
          total={total}
          voice={m.voice}
          listen={m.listen}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      );
    }
    return (
      <RecognitionCard
        key={index}
        question={m.q}
        questionNumber={index + 1}
        total={total}
        onAnswered={handleAnswered}
        onOpenRules={() => setRulesOpen(true)}
      />
    );
  };

  return (
    <main className={showingCard ? "app app--scroll" : "app"}>
      {syncBanner}
      {/* Exit shown only while a card is on screen; the empty (total===0) and summary
          screens carry their own "В меню" button. */}
      {!finished && total > 0 && (
        <button type="button" className="exit" onClick={goHome}>
          ← В меню
        </button>
      )}
      {/* «Уже знаю»: descope the current item (mark its whole group learned + hide it), then skip. */}
      {showingCard && (
        <button
          type="button"
          className="known"
          onClick={markKnown}
          aria-label="Уже знаю — отметить выученным и убрать из уроков"
        >
          <UiIcon name="check" size={15} strokeWidth={2.4} />
          Уже знаю
        </button>
      )}
      {total === 0 ? (
        <section className="card">
          <h1 className="prompt">Пока пусто</h1>
          <p className="hint">
            {usesSentences
              ? "Нет предложений для этого уровня."
              : "Нет заданий для тренировки."}
          </p>
          <button type="button" className="next" onClick={goHome}>
            В меню
          </button>
        </section>
      ) : finished ? (
        <SessionSummary
          score={score}
          total={total}
          streak={currentStreak(dailyView, dateKey())}
          onRestart={restart}
          onHome={goHome}
        />
      ) : mixItem ? (
        renderMix(mixItem)
      ) : usesSentences ? (
        <SentenceCard
          key={index}
          question={sentenceSession[index]!}
          questionNumber={index + 1}
          total={total}
          grade={pack.grade}
          voice={mode === "say_sentence"}
          listen={mode === "listen_sentence"}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : usesProduction ? (
        <ProductionCard
          key={index}
          question={productionSession[index]!}
          questionNumber={index + 1}
          total={total}
          voice={mode === "say_word"}
          listen={mode === "listen_word"}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : (
        <RecognitionCard
          key={index}
          question={recognition[index]!}
          questionNumber={index + 1}
          total={total}
          onAnswered={handleAnswered}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}
      {rulesOpen && (
        <RulesBook
          rules={pack.rules}
          highlightIds={ruleHighlights}
          overlay
          onClose={() => setRulesOpen(false)}
        />
      )}
    </main>
  );
}
