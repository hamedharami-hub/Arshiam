import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LifeArchitectView from "./LifeArchitectView";
import type { LifeBlueprint } from "@/lib/lifeArchitect";

const mocks = vi.hoisted(() => ({ deploy: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("react-i18next", async (importOriginal) => ({ ...await importOriginal<typeof import("react-i18next")>(), useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/LifeSystemMap", () => ({ LifeSystemMap: () => null }));
vi.mock("@/components/VoiceInputButton", () => ({ VoiceInputButton: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success, warning: vi.fn(), info: vi.fn() } }));
const blueprint: LifeBlueprint = {
  title: "Review", summary: "", scientificInsight: "", recommendedWorkflow: "list",
  folders: [{ id: "f", name: "Folder", description: "", color: "blue" }],
  goals: [{ id: "g", folderId: "f", title: "Goal to review", description: "Goal detail", priority: "high", timeHorizon: "quarterly" }],
  coreValues: ["peace"], tasks: [], habits: [],
};
vi.mock("@/lib/lifeArchitect", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/lifeArchitect")>(),
  generateDeterministicBlueprint: () => blueprint,
  enhanceBlueprintWithAI: async () => blueprint,
  deployLifeBlueprint: mocks.deploy,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.deploy.mockImplementation(async (_bp, _uid, folders, _habits, _tasks, goals, values) => ({ foldersCount: folders.size, goalsCount: goals.size, habitsCount: 0, tasksCount: 0, valuesCount: values.size }));
});
async function review() {
  render(<MemoryRouter><LifeArchitectView /></MemoryRouter>);
  expect(screen.getByText(/Your current plan is not retimed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New plan at your pace" }));
  fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate My Life Blueprint" }));
  await screen.findByRole("checkbox", { name: "Goal to review" });
}
describe("Life Architect mutation review", () => {
  it("shows goals and values unchecked and passes explicit empty selections to deployment", async () => {
    await review();
    expect(screen.getByRole("checkbox", { name: "Goal to review" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Peace & Inner Balance" })).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("1 folders, 0 goals, 0 habits, 0 tasks, 0 values");
    fireEvent.click(screen.getByRole("button", { name: "Deploy System into My App" }));
    await waitFor(() => expect(mocks.deploy).toHaveBeenCalled());
    expect(mocks.deploy.mock.calls[0][5]).toEqual(new Set());
    expect(mocks.deploy.mock.calls[0][6]).toEqual(new Set());
  });
  it("previews opt-ins and disables goals when their folder is deselected", async () => {
    await review();
    fireEvent.click(screen.getByRole("checkbox", { name: "Goal to review" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Peace & Inner Balance" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 folders, 1 goals, 0 habits, 0 tasks, 1 values");
    fireEvent.click(screen.getByRole("checkbox", { name: "Folder" }));
    expect(screen.getByRole("checkbox", { name: "Goal to review" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("0 folders, 0 goals, 0 habits, 0 tasks, 1 values");
  });
  it("reports partial failure rather than claiming every previewed mutation succeeded", async () => {
    mocks.deploy.mockResolvedValue({ foldersCount: 0, goalsCount: 0, habitsCount: 0, tasksCount: 0, valuesCount: 0 });
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Deploy System into My App" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Some changes were not saved")));
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
