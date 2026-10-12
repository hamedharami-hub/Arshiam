import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import WeekView from "./WeekView";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/useTapGestures", () => ({ useTapGestures: () => ({ handlers: {} }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

describe("weekly calendar controls", () => {
  it("supports buttons and keyboard zoom/reset with bounds", () => {
    render(<MemoryRouter><WeekView date={new Date(2026, 9, 13)} tasks={[]} holidays={[]} system="gregorian" onDayClick={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("120%")).toBeInTheDocument();
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "+" });
    expect(screen.getByText("140%")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "-" });
    expect(screen.getByText("120%")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "0" });
    expect(screen.getByText("100%")).toBeInTheDocument();
    for (let i = 0; i < 12; i++) fireEvent.keyDown(region, { key: "+" });
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
  it("passes clicked hour without changing day and exposes task links", () => {
    const click = vi.fn();
    render(<MemoryRouter><WeekView date={new Date(2026, 9, 13)} tasks={[{ id: "one", title: "One", priority: "medium", completed: false, due_date: new Date(2026, 9, 13, 14).toISOString() }]} holidays={[]} system="gregorian" onDayClick={() => {}} onSlotClick={click} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "2026-10-13 14:00 — Create task" }));
    expect(click).toHaveBeenCalledWith(new Date(2026, 9, 13), 14);
    expect(screen.getByRole("link", { name: "One" })).toHaveAttribute("href", "/app/tasks/one");
  });
});
