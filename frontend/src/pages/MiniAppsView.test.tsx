import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, Link } from "react-router-dom";
import MiniAppsView from "./MiniAppsView";
import { saveMiniAppsLocal, type MiniApp } from "@/lib/miniAppsStore";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" }, loading: false }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/cloudStateSync", () => ({ bindCloudState: () => ({ stop: vi.fn(), push: vi.fn() }) }));
const app: MiniApp = { id: "one", name: "Tool", emoji: "", description: "", aiRequest: "", html: "<p>Original</p>", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({ idx: 0 }, "", "/app/mini-apps");
  saveMiniAppsLocal("u", [app]);
});
afterEach(() => vi.restoreAllMocks());
const mount = () => render(<BrowserRouter><Link to="/elsewhere">Leave library</Link><MiniAppsView /></BrowserRouter>);
describe("MiniApps verified retention and navigation", () => {
  it("retains edits and lets users navigate/reload without useless prompts", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: "<p>Durable draft</p>" } });
    expect(JSON.parse(localStorage.getItem("arshnaz_mini_app_draft_v1_u_one")!).html).toBe("<p>Durable draft</p>");
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(false);
    fireEvent.click(screen.getByText("Leave library"));
    expect(window.location.pathname).toBe("/elsewhere");
    expect(confirm).not.toHaveBeenCalled();
  });
  it.each(["throw", "silent"])("blocks SPA exit when storage fails (%s)", (mode) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { if (mode === "throw") throw new Error("quota"); });
    fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: "<p>At risk</p>" } });
    expect(screen.getByRole("alert")).toHaveTextContent("No recoverable copy");
    fireEvent.click(screen.getByText("Leave library"));
    expect(window.location.pathname).toBe("/app/mini-apps");
    expect(confirm).toHaveBeenCalledOnce();
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("opens a saved app in Run with metadata and an isolated preview, not source or forms", () => {
    mount();
    expect(screen.getByRole("button", { name: "Run" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("mini-app-metadata")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit HTML source")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tool name")).not.toBeInTheDocument();
    const preview = screen.getByTitle("Tool — preview");
    expect(preview).toHaveAttribute("sandbox", "allow-scripts");
    expect(preview.getAttribute("srcdoc")).toContain("Original");
    for (const name of ["Save", "Copy", "Download", "Duplicate", "Delete"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("reveals source and editable metadata only after explicit Edit", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue(app.html);
    expect(screen.getByLabelText("Tool name")).toHaveValue("Tool");
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.queryByLabelText("Edit HTML source")).not.toBeInTheDocument();
  });

  it("starts a newly created tool in Edit", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "New mini app" }));
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");
    expect((screen.getByLabelText("Edit HTML source") as HTMLTextAreaElement).value).toContain("<!doctype html>");
    expect(screen.queryByTitle("New mini app — preview")).not.toBeInTheDocument();
  });

  it("restores a retained dirty draft in Edit without pretending it was run", () => {
    localStorage.setItem("arshnaz_mini_app_draft_v1_u_one", JSON.stringify({ ...app, html: "<p>Retained draft</p>" }));
    mount();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>Retained draft</p>");
    expect(screen.queryByTitle("Tool — preview")).not.toBeInTheDocument();
  });

  it("marks the preview stale after edits and refreshes only when latest source is run", () => {
    mount();
    const rendered = screen.getByTitle("Tool — preview").getAttribute("srcdoc");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: "<p>Updated source</p>" } });
    expect(screen.getByRole("status")).toHaveTextContent("Preview is stale");
    expect(screen.getByTitle("Tool — preview").getAttribute("srcdoc")).toBe(rendered);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("status")).toHaveTextContent("Preview is stale");
    expect(screen.getByTitle("Tool — preview").getAttribute("srcdoc")).toBe(rendered);
    fireEvent.click(screen.getByRole("button", { name: "Run latest source" }));
    expect(screen.queryByText(/Preview is stale/)).not.toBeInTheDocument();
    expect(screen.getByTitle("Tool — preview").getAttribute("srcdoc")).toContain("Updated source");
    expect(screen.queryByText("Live preview")).not.toBeInTheDocument();
  });
});
