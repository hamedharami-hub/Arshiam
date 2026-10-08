import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NoteTaskLinkPills } from "./NoteTaskLinkPills";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));

function CurrentPath() {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}

describe("NoteTaskLinkPills", () => {
  it("opens a linked task from its note", () => {
    render(
      <MemoryRouter initialEntries={["/app/notes"]}>
        <NoteTaskLinkPills taskIds={["task-1"]} taskTitles={new Map([["task-1", "Prepare launch"]])} />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open linked task: Prepare launch" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/app/tasks/task-1");
  });

  it("encodes a task ID and renders unknown task titles safely", () => {
    render(
      <MemoryRouter initialEntries={["/app/notes"]}>
        <NoteTaskLinkPills taskIds={["task/one"]} taskTitles={new Map()} />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open linked task: Linked task 1" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/app/tasks/task%2Fone");
  });
});
