/**
 * Reading.tsx — the "Чтение" tab: a level-sorted library of texts & dialogs.
 *
 * Browsing + difficulty gating only; the actual reading and role-play live in TextReader /
 * DialogPlay. Reading owns the device-local "finished" set and which text is open. It sits at
 * the home-screen layer, fully separate from the word/sentence quiz system.
 */

import { useMemo, useState } from "react";
import { activeLevel, levelStats, unlockedLevelsWith, type VocabLike } from "../core/levels";
import type { ProgressMap } from "../core/progress";
import { isTextUnlocked } from "../core/reading";
import { TEXTS } from "../data/texts";
import { loadRead, saveRead } from "./readingState";
import TextReader from "./TextReader";

interface ReadingProps {
  vocab: readonly VocabLike[];
  progress: ProgressMap;
  testMode: boolean;
  /** Count a completed role-play toward today's lessons (no accuracy effect). */
  onLessonDone: () => void;
}

export default function Reading({ vocab, progress, testMode, onLessonDone }: ReadingProps) {
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [openId, setOpenId] = useState<string | null>(null);

  const currentLevel = useMemo(() => {
    const s = levelStats(vocab, progress);
    return activeLevel(s, unlockedLevelsWith(s, testMode));
  }, [vocab, progress, testMode]);

  function markRead(id: string) {
    setRead((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRead(next);
      return next;
    });
  }

  const openText = openId ? TEXTS.find((t) => t.id === openId) : undefined;
  if (openText) {
    return (
      <TextReader
        text={openText}
        isRead={read.has(openText.id)}
        onBack={() => setOpenId(null)}
        onMarkRead={() => markRead(openText.id)}
        onLessonDone={onLessonDone}
      />
    );
  }

  return (
    <main className="app app--scroll">
      <section className="card">
        <h1 className="prompt prompt--home">📚 Чтение</h1>
        <p className="hint">Тексты и диалоги — от простого к сложному.</p>

        <ul className="reading">
          {TEXTS.map((t) => {
            const unlocked = testMode || isTextUnlocked(t, currentLevel);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={"readrow" + (unlocked ? "" : " readrow--locked")}
                  disabled={!unlocked}
                  onClick={() => setOpenId(t.id)}
                  aria-label={`${t.title}, уровень ${t.level}${unlocked ? "" : " — закрыто"}`}
                >
                  <span className="readrow__lv">Ур. {t.level}</span>
                  <span className="readrow__title">{t.title}</span>
                  <span className="readrow__badges" aria-hidden="true">
                    {read.has(t.id) && <span className="readrow__done">✓</span>}
                    {t.type === "dialog" && <span title="Диалог">🎭</span>}
                    {!unlocked && <span title={`Откройте уровень ${t.level}`}>🔒</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!testMode && currentLevel < Math.max(...TEXTS.map((t) => t.level)) && (
          <p className="hint">Новые тексты открываются по мере роста уровня.</p>
        )}
      </section>
    </main>
  );
}
