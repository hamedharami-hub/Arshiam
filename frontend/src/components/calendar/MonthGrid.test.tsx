import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MonthGrid from "./MonthGrid";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));

it("supplements canonical priority dots with urgent and legacy labels", () => {
  render(<MonthGrid month={new Date(2026, 9, 13)} tasks={[
    { id: "urgent", title: "Urgent task", due_date: "2026-10-13", priority: "urgent", completed: false },
    { id: "legacy", title: "Legacy task", due_date: "2026-10-13", priority: "p2" as any, completed: false },
  ]} holidays={[]} system="gregorian" onDayClick={() => {}} />);
  expect(screen.getByText("Urgent")).toHaveClass("text-red-700");
  expect(screen.getByText("Medium")).toHaveClass("text-amber-600");
  expect(screen.getByText("Urgent task").previousElementSibling).toHaveClass("text-red-600");
  expect(screen.getByText("Legacy task").previousElementSibling).toHaveClass("text-amber-500");
});
