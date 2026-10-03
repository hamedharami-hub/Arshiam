import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DueDatePicker } from "./DueDatePicker";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

describe("DueDatePicker all-day dates", () => {
  it("saves a selected day without inventing a 23:59 deadline", () => {
    const onChange = vi.fn();
    render(<DueDatePicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("adds a clock only when the user enables the time switch", () => {
    const onChange = vi.fn();
    render(<DueDatePicker value="2026-10-02" onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Time" }));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining("T"));
  });
});
