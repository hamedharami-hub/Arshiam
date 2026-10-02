import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HorizonInboxTray } from "./HorizonInboxTray";
import { getTimeSettings } from "@/lib/timeHorizon";
import type { Task } from "@/lib/taskTypes";
vi.mock("react-i18next", () => ({ initReactI18next: { type: "3rdParty", init: () => {} }, useTranslation: () => ({ i18n: { language: "en" }, t: (value: string) => value }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
describe("unplanned task folder identity", () => {
  it("shows the existing folder and assigns a period without removing it", () => {
    const task = { id: "task", title: "Unscheduled", folder_id: "work", priority: "none", completed: false, status: "todo" } as Task;
    const assign = vi.fn();
    render(<MemoryRouter><HorizonInboxTray tasks={[task]} folders={[{ id: "work", name: "Work folder", parent_id: null, color: "#123456" }]} settings={getTimeSettings()} fa={false} onAssign={assign} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("horizon-inbox-tray-toggle"));
    expect(screen.getByText("Work folder")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("horizon-inbox-assign-task"));
    expect(assign).toHaveBeenCalledWith(expect.objectContaining({ folder_id: "work" }));
  });
});
