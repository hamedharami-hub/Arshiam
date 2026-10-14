import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { MethodCard } from "@/components/needs/NeedsBits";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "a" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/needs/service", () => ({ convertSuggestion: vi.fn(), needsDestinationId: () => "stable" }));
beforeEach(() => localStorage.clear());
it("nested method task previews inherit temporary retention and do not store private text", () => {
  render(<MemoryRouter><MethodCard id="grounding" sessionId="s" temporary /></MemoryRouter>);
  fireEvent.click(screen.getByTestId("method-toggle-grounding"));
  fireEvent.click(screen.getByTestId("method-add-task-grounding"));
  fireEvent.change(screen.getByRole("textbox", { name: "Details to copy into the task; optional and empty by default" }), { target: { value: "Temporary private preview" } });
  expect(screen.getByDisplayValue("Temporary private preview")).toBeInTheDocument();
  expect(Object.keys(localStorage).some(key => localStorage.getItem(key)?.includes("Temporary private preview"))).toBe(false);
});
