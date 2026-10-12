import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Link, useLocation, useNavigate } from "react-router-dom";
import { useRecoverableExit } from "./useRecoverableExit";

let dirty = true;
let durable = false;
function Editor() {
  useRecoverableExit(() => dirty && !durable, "No recoverable copy. Leave?");
  const location = useLocation();
  const navigate = useNavigate();
  return <><p data-testid="route">{location.pathname}{location.search}</p><Link to="/other">Leave</Link><button onClick={() => navigate("/replaced", { replace: true })}>Replace</button><button onClick={() => navigate("?note=one", { replace: true })}>Query</button></>;
}
afterEach(() => { vi.restoreAllMocks(); dirty = true; durable = false; });
describe("recoverable BrowserRouter exit", () => {
  it("blocks link and programmatic replacement when retention failed, but allows an explicit exit", () => {
    window.history.replaceState({ idx: 0 }, "", "/edit");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BrowserRouter><Editor /></BrowserRouter>);
    fireEvent.click(screen.getByText("Leave"));
    expect(screen.getByTestId("route")).toHaveTextContent("/edit");
    fireEvent.click(screen.getByText("Replace"));
    expect(window.location.pathname).toBe("/edit");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText("Leave"));
    expect(screen.getByTestId("route")).toHaveTextContent("/other");
  });
  it("reads current durability at exit time and does not prompt for recoverable edits", () => {
    window.history.replaceState({ idx: 0 }, "", "/edit");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BrowserRouter><Editor /></BrowserRouter>);
    durable = true;
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(false);
    fireEvent.click(screen.getByText("Leave"));
    expect(screen.getByTestId("route")).toHaveTextContent("/other");
    expect(confirm).not.toHaveBeenCalled();
  });
  it("guards reload and rolls back rejected native back navigation before Router sees it", () => {
    window.history.replaceState({ idx: 2 }, "", "/edit");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    render(<BrowserRouter><Editor /></BrowserRouter>);
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(true);
    window.history.replaceState({ idx: 1 }, "", "/before");
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 1 } })));
    expect(go).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("route")).toHaveTextContent("/edit");
    window.history.replaceState({ idx: 2 }, "", "/edit");
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 2 } })));
    expect(screen.getByTestId("route")).toHaveTextContent("/edit");
  });
  it("does not prompt for same-path query updates", () => {
    window.history.replaceState({ idx: 0 }, "", "/edit");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BrowserRouter><Editor /></BrowserRouter>);
    fireEvent.click(screen.getByText("Query"));
    expect(screen.getByTestId("route")).toHaveTextContent("/edit?note=one");
    expect(confirm).not.toHaveBeenCalled();
  });
  it("cancels real browser Back then allows Back once a durable copy exists", async () => {
    window.history.replaceState({ idx: 0 }, "", "/before");
    window.history.pushState({ idx: 1 }, "", "/edit");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BrowserRouter><Editor /></BrowserRouter>);
    act(() => window.history.back());
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(window.location.pathname).toBe("/edit"));
    expect(screen.getByTestId("route")).toHaveTextContent("/edit");
    durable = true;
    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId("route")).toHaveTextContent("/before"));
    expect(confirm).toHaveBeenCalledOnce();
  });
  it("removes native listeners and restores navigator methods on cleanup", () => {
    window.history.replaceState({ idx: 0 }, "", "/edit");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = render(<BrowserRouter><Editor /><Link to="/other">Unguarded leave</Link></BrowserRouter>);
    view.rerender(<BrowserRouter><Link to="/other">Unguarded leave</Link></BrowserRouter>);
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(false);
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 1 } })));
    expect(confirm).not.toHaveBeenCalled();
    // The same navigator must be restored after just its guarded editor unmounts.
    fireEvent.click(screen.getByText("Unguarded leave"));
    expect(window.location.pathname).toBe("/other");
    expect(confirm).not.toHaveBeenCalled();
  });
});
