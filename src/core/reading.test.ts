import { describe, it, expect } from "vitest";
import {
  flattenTexts,
  isTextUnlocked,
  rolesOf,
  sortTexts,
  type RawReading,
  type ReadingText,
} from "./reading";

const mk = (id: string, level: number, type: "text" | "dialog" = "text"): ReadingText => ({
  id,
  title: id,
  level,
  type,
  lines: [{ fi: "a", ru: "b" }],
});

describe("flattenTexts", () => {
  it("parses valid texts and dialogs, defaulting level to 1", () => {
    const out = flattenTexts({
      texts: [
        {
          id: "t1",
          title: "T1",
          level: 2,
          type: "dialog",
          lines: [
            { speaker: "Anna", fi: "Hei", ru: "Привет" },
            { speaker: "Mika", fi: "Moi", ru: "Здравствуй" },
          ],
        },
        { id: "t2", title: "T2", type: "text", lines: [{ fi: "Minä", ru: "Я" }] },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "t1", level: 2, type: "dialog" });
    expect(out[0]!.lines).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: "t2", type: "text", level: 1 });
  });

  it("drops malformed entries and malformed lines", () => {
    const out = flattenTexts({
      texts: [
        { id: "", title: "x", lines: [{ fi: "a", ru: "b" }] }, // no id
        { id: "tA", title: "", lines: [{ fi: "a", ru: "b" }] }, // no title
        { id: "tB", title: "ok", lines: [] }, // no lines
        { id: "t3", title: "ok", lines: [{ fi: "", ru: "b" }, { fi: "a", ru: "b" }] }, // 1 bad line
        "nope",
      ],
    });
    expect(out.map((t) => t.id)).toEqual(["t3"]);
    expect(out[0]!.lines).toHaveLength(1);
  });

  it("returns [] for a missing/invalid texts array", () => {
    expect(flattenTexts({})).toEqual([]);
    expect(flattenTexts({ texts: "x" } as unknown as RawReading)).toEqual([]);
  });

  it("defaults an unknown type to 'text'", () => {
    const out = flattenTexts({
      texts: [{ id: "t1", title: "x", type: "weird", lines: [{ fi: "a", ru: "b" }] }],
    });
    expect(out[0]!.type).toBe("text");
  });
});

describe("rolesOf", () => {
  it("returns distinct speakers in first-appearance order", () => {
    const t: ReadingText = {
      id: "t",
      title: "x",
      level: 1,
      type: "dialog",
      lines: [
        { speaker: "Anna", fi: "1", ru: "1" },
        { speaker: "Mika", fi: "2", ru: "2" },
        { speaker: "Anna", fi: "3", ru: "3" },
      ],
    };
    expect(rolesOf(t)).toEqual(["Anna", "Mika"]);
  });

  it("is empty for a monologue", () => {
    expect(rolesOf(mk("t", 1))).toEqual([]);
  });
});

describe("isTextUnlocked", () => {
  it("unlocks a text at or below the current level", () => {
    expect(isTextUnlocked(mk("t", 2), 3)).toBe(true);
    expect(isTextUnlocked(mk("t", 3), 3)).toBe(true);
    expect(isTextUnlocked(mk("t", 4), 3)).toBe(false);
  });
});

describe("sortTexts", () => {
  it("orders by level, then id", () => {
    const out = sortTexts([mk("t3", 2), mk("t1", 2), mk("t2", 1)]);
    expect(out.map((t) => t.id)).toEqual(["t2", "t1", "t3"]);
  });
});
