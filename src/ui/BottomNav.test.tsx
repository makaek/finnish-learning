import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BottomNav from "./BottomNav";

afterEach(cleanup);

describe("BottomNav", () => {
  it("renders the four home tabs", () => {
    render(<BottomNav active="roadmap" onSelect={() => {}} />);
    for (const label of ["Главная", "Прогресс", "Метрики", "Правила"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("marks only the active tab as current", () => {
    render(<BottomNav active="dashboard" onSelect={() => {}} />);
    const current = screen.getAllByRole("button").filter(
      (b) => b.getAttribute("aria-current") === "page",
    );
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain("Метрики");
  });

  it("calls onSelect with the tapped tab's key", () => {
    const onSelect = vi.fn();
    render(<BottomNav active="roadmap" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Правила"));
    expect(onSelect).toHaveBeenCalledWith("rules");
  });
});
