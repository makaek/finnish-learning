import { describe, it, expect, beforeEach } from "vitest";
import { nsKey, setStorageLang, storageLang, migrateBareToFi } from "./storage";

/**
 * Guards the per-language storage namespacing + the one-time bare→fi migration. The migration is
 * the data-safety-critical bit: an existing single-language learner's Finnish progress must land
 * under the `fi` namespace and never be lost or read from the wrong language.
 */

const ROOT = "finnish-trainer";

beforeEach(() => {
  localStorage.clear();
  setStorageLang("fi");
});

describe("nsKey / setStorageLang", () => {
  it("namespaces a bucket by the active language", () => {
    setStorageLang("fi");
    expect(nsKey("progress")).toBe(`${ROOT}/fi/progress`);
    setStorageLang("en");
    expect(storageLang()).toBe("en");
    expect(nsKey("progress")).toBe(`${ROOT}/en/progress`);
    expect(nsKey("state")).toBe(`${ROOT}/en/state`);
  });
});

describe("migrateBareToFi", () => {
  it("copies legacy bare keys into the fi namespace without deleting them", () => {
    localStorage.setItem(`${ROOT}/progress`, "[1]");
    localStorage.setItem(`${ROOT}/state`, "{}");
    localStorage.setItem(`${ROOT}/hidden`, "[]");
    localStorage.setItem(`${ROOT}/reading`, "[]");

    migrateBareToFi();

    expect(localStorage.getItem(`${ROOT}/fi/progress`)).toBe("[1]");
    expect(localStorage.getItem(`${ROOT}/fi/state`)).toBe("{}");
    expect(localStorage.getItem(`${ROOT}/fi/hidden`)).toBe("[]");
    expect(localStorage.getItem(`${ROOT}/fi/reading`)).toBe("[]");
    // bare keys are preserved (an older build still reads them)
    expect(localStorage.getItem(`${ROOT}/progress`)).toBe("[1]");
  });

  it("never overwrites already-migrated fi data (idempotent)", () => {
    localStorage.setItem(`${ROOT}/progress`, "[OLD]");
    localStorage.setItem(`${ROOT}/fi/progress`, "[NEW]");

    migrateBareToFi();
    migrateBareToFi();

    expect(localStorage.getItem(`${ROOT}/fi/progress`)).toBe("[NEW]");
  });

  it("does nothing when there are no bare keys", () => {
    migrateBareToFi();
    expect(localStorage.getItem(`${ROOT}/fi/progress`)).toBeNull();
  });
});
