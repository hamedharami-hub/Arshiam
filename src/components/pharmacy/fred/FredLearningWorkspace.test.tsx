import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { FredPracticeProvider } from "./FredPracticeContext";
import { FredRoutedWorkspace } from "./FredLearningWorkspace";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, lang: "en", isEn: true }) }));
function Navigation() {
  const location = useLocation(); const navigate = useNavigate();
  return <><output data-testid="location">{location.search}</output><button onClick={() => navigate(-1)}>Back</button></>;
}
function Workspace({ owner = "owner", route = "/app/pharmacy/fred?module=visualizer&mode=check&keep=yes" }) {
  return <MemoryRouter initialEntries={[route]}><Navigation /><FredPracticeProvider key={owner}><FredRoutedWorkspace userId={owner} /></FredPracticeProvider></MemoryRouter>;
}
beforeEach(() => localStorage.clear());
describe("FRED learning journey", () => {
  it("records understanding only after a correct answer and keeps it separate per account", () => {
    localStorage.setItem("arshnaz:fred-understanding:v1:another", '["dispense"]');
    render(<Workspace />);
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(localStorage.getItem("arshnaz:fred-understanding:v1:owner")).toBeNull();
    expect(screen.getByText("Review your answer.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(localStorage.getItem("arshnaz:fred-understanding:v1:owner")).toBe('["visualizer"]');
    expect(localStorage.getItem("arshnaz:fred-understanding:v1:another")).toBe('["dispense"]');
  });
  it("keeps unrelated URL options and restores the lesson with browser Back", async () => {
    render(<Workspace />);
    fireEvent.click(screen.getByTestId("fred-module-dispense"));
    expect(screen.getByTestId("location")).toHaveTextContent("module=dispense&mode=check&keep=yes");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("module=visualizer&mode=check&keep=yes"));
  });
  it("preserves workflow label edits when switching lessons and teaching modes", async () => {
    render(<Workspace route="/app/pharmacy/fred?module=workflow&mode=practice" />);
    fireEvent.change(await screen.findByTestId("fred-label-directions"), { target: { value: "My training label" } });
    fireEvent.click(screen.getByTestId("fred-module-visualizer"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /^Learn$/ }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByTestId("fred-module-workflow"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /^Practice$/ }), { button: 0, ctrlKey: false });
    expect(screen.getByTestId("fred-label-directions")).toHaveValue("My training label");
  });
});
