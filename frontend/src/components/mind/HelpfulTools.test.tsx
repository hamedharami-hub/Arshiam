import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HelpfulTools } from "./HelpfulTools";
import { readMindFeedback, recordMindFeedback } from "@/lib/mind/feedback";
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it("shows the actual denominator and non-helpful reports without inferring benefit", () => {
  recordMindFeedback("a", { toolId: "breathing", toolVersion: "1", sessionId: "1", response: "helpful" });
  recordMindFeedback("a", { toolId: "breathing", toolVersion: "1", sessionId: "2", response: "uncomfortable" });
  render(<MemoryRouter><HelpfulTools ownerId="a" /></MemoryRouter>);
  expect(screen.getByText("1 of 2 reports: helpful")).toBeInTheDocument();
  expect(screen.getByText(/Uncomfortable: 1/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Breathing exercise" })).toHaveAttribute("href", "/app/breathing");
});
it("does not keep the first account's reports visible after a switch", () => {
  recordMindFeedback("a", { toolId: "breathing", toolVersion: "1", sessionId: "1", response: "helpful" });
  const view = render(<MemoryRouter><HelpfulTools ownerId="a" /></MemoryRouter>);
  view.rerender(<MemoryRouter><HelpfulTools ownerId="b" /></MemoryRouter>);
  expect(screen.queryByText("Things you found helpful")).toBeNull();
});
it("requires confirmation and clears only feedback, not notes", () => {
  recordMindFeedback("a", { toolId: "breathing", toolVersion: "1", sessionId: "1", response: "helpful" });
  localStorage.setItem("note", "private");
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<MemoryRouter><HelpfulTools ownerId="a" /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Delete device feedback" }));
  expect(readMindFeedback("a")).toHaveLength(1);
  vi.mocked(window.confirm).mockReturnValue(true);
  act(() => fireEvent.click(screen.getByRole("button", { name: "Delete device feedback" })));
  expect(readMindFeedback("a")).toEqual([]);
  expect(localStorage.getItem("note")).toBe("private");
});
