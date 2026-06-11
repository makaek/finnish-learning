import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook, act } from "@testing-library/react";
import { useOnline } from "./useOnline";

afterEach(cleanup);

describe("useOnline", () => {
  it("starts from navigator.onLine (jsdom defaults to online)", () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });

  it("flips on the window offline/online events", () => {
    const { result } = renderHook(() => useOnline());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
