import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, Link } from "react-router-dom";
import MiniAppsView from "./MiniAppsView";
import { loadMiniApps, saveMiniAppsLocal, MAX_MINI_APP_HTML_BYTES, type MiniApp } from "@/lib/miniAppsStore";

const mocks = vi.hoisted(() => ({
  user: { id: "u" } as { id: string } | null,
  isEn: true,
  bindings: [] as { userId: string; apply: (data: unknown, updatedAt: number) => void }[],
  push: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: mocks.isEn, T: (fa: string, en: string) => mocks.isEn ? en : fa }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/cloudStateSync", () => ({ bindCloudState: (userId: string, _name: string, options: { apply: (data: unknown, updatedAt: number) => void }) => {
  mocks.bindings.push({ userId, apply: options.apply });
  return { stop: vi.fn(), push: mocks.push };
} }));
const app: MiniApp = { id: "one", name: "Tool", emoji: "", description: "", aiRequest: "", html: "<p>Original</p>", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
beforeEach(() => {
  localStorage.clear();
  mocks.user = { id: "u" };
  mocks.isEn = true;
  mocks.bindings = [];
  mocks.push.mockClear();
  window.history.replaceState({ idx: 0 }, "", "/app/mini-apps");
  saveMiniAppsLocal("u", [app]);
});
afterEach(() => vi.restoreAllMocks());
const Library = () => <BrowserRouter><Link to="/elsewhere">Leave library</Link><MiniAppsView /></BrowserRouter>;
const mount = () => render(<Library />);
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

describe("HTML library consistency", () => {
  it("does not run legacy empty HTML or silently delete its metadata", () => {
    saveMiniAppsLocal("u", [{ ...app, html: " " }]);
    mount();
    expect(screen.queryByTitle("Tool — preview")).not.toBeInTheDocument();
    expect(screen.getByText("HTML is empty; choose Edit to add source.")).toBeInTheDocument();
    expect(loadMiniApps("u")[0].name).toBe("Tool");
  });

  it("refreshes a clean active tool when another same-tab caller changes it", () => {
    mount();
    act(() => { saveMiniAppsLocal("u", [{ ...app, html: "<p>External update</p>" }]); });
    expect(screen.getByTitle("Tool — preview").getAttribute("srcdoc")).toContain("External update");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>External update</p>");
  });

  it("preserves a dirty editor while same-tab updates add another tool", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: "<p>My draft</p>" } });
    act(() => { saveMiniAppsLocal("u", [app, { ...app, id: "two", name: "Another tool" }]); });
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>My draft</p>");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(loadMiniApps("u").map(item => item.name)).toEqual(["Tool", "Another tool"]);
    expect(loadMiniApps("u")[0].html).toBe("<p>My draft</p>");
  });

  it("ignores malformed recoverable metadata instead of crashing", () => {
    localStorage.setItem("arshnaz_mini_app_draft_v1_u_one", JSON.stringify({ id: "one", html: "<p>Broken metadata</p>" }));
    mount();
    expect(screen.getByTitle("Tool — preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue(app.html);
  });

  it.each(["", "too-large"])("does not save, duplicate or run invalid HTML (%s)", value => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: value ? "x".repeat(MAX_MINI_APP_HTML_BYTES + 1) : "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(loadMiniApps("u")).toHaveLength(1);
    expect(loadMiniApps("u")[0].html).toBe(app.html);
    expect(screen.getByRole("button", { name: "Run latest source" })).toBeDisabled();
  });

  it("retains a visible copy suffix when duplicating a maximum-length name", () => {
    saveMiniAppsLocal("u", [{ ...app, name: "a".repeat(80) }]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(loadMiniApps("u")[1].name).toHaveLength(80);
    expect(loadMiniApps("u")[1].name.endsWith(" (copy)")).toBe(true);
  });
});

const importFile = (container: HTMLElement, text: () => Promise<string>, name = "imported.html", size = 100) => {
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [{ name, size, text }] } });
};

describe("HTML imports", () => {
  it("preserves apps added while an imported file is being read", async () => {
    let finish!: (html: string) => void;
    const reading = new Promise<string>(resolve => { finish = resolve; });
    const { container } = mount();
    importFile(container, () => reading);
    act(() => { saveMiniAppsLocal("u", [app, { ...app, id: "two", name: "Concurrent tool" }]); });
    await act(async () => { finish("<p>Imported</p>"); });
    expect(loadMiniApps("u").map(item => item.name)).toEqual(["Tool", "Concurrent tool", "imported"]);
  });

  it("does not import whitespace-only HTML", async () => {
    const { container } = mount();
    await act(async () => { importFile(container, async () => " \n "); });
    expect(loadMiniApps("u")).toHaveLength(1);
  });

  it("does not commit an import after the library has unmounted", async () => {
    let finish!: (html: string) => void;
    const { container, unmount } = mount();
    importFile(container, () => new Promise(resolve => { finish = resolve; }));
    unmount();
    await act(async () => { finish("<p>Too late</p>"); });
    expect(loadMiniApps("u")).toHaveLength(1);
  });

  it("resets the file input even after rejecting its type or size", async () => {
    const { container } = mount();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const setter = vi.spyOn(input, "value", "set");
    await act(async () => { importFile(container, async () => "no", "wrong.txt"); });
    expect(setter).toHaveBeenCalledWith("");
    setter.mockClear();
    await act(async () => { importFile(container, async () => "no", "huge.html", MAX_MINI_APP_HTML_BYTES + 1); });
    expect(setter).toHaveBeenCalledWith("");
  });

  it.each(["v", null, "u-again"])("cancels a pending import on account change (%s)", async nextUser => {
    let finish!: (html: string) => void;
    saveMiniAppsLocal("v", [{ ...app, id: "v-tool", name: "Other account" }]);
    const { container, rerender } = mount();
    importFile(container, () => new Promise(resolve => { finish = resolve; }));
    mocks.user = nextUser === null ? null : { id: "v" };
    rerender(<Library />);
    if (nextUser === "u-again") {
      mocks.user = { id: "u" };
      rerender(<Library />);
    }
    await act(async () => { finish("<p>Old account import</p>"); });
    expect(loadMiniApps("u")).toHaveLength(1);
    expect(loadMiniApps("v")).toHaveLength(1);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Edit HTML source")).not.toBeInTheDocument();
  });

  it("ignores late callbacks from the previous account's cloud binding", () => {
    const { rerender } = mount();
    const oldBinding = mocks.bindings[0];
    saveMiniAppsLocal("v", [{ ...app, id: "v-tool", name: "Other account" }]);
    mocks.user = { id: "v" };
    rerender(<Library />);
    act(() => oldBinding.apply([{ ...app, name: "Late remote" }], Date.now() + 100));
    expect(screen.getByTitle("Other account — preview")).toBeInTheDocument();
    expect(screen.queryByTitle("Late remote — preview")).not.toBeInTheDocument();
    expect(loadMiniApps("u")[0].name).toBe("Tool");
  });

  it("unwraps AI fences on file import and starts in Edit without executing", async () => {
    const { container } = mount();
    await act(async () => { importFile(container, async () => "```html\n<p>AI tool</p>\n```"); });
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>AI tool</p>");
    expect(screen.queryByTitle("imported — preview")).not.toBeInTheDocument();
  });

  it("adds pasted HTML while preventing empty submissions", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Paste HTML" }));
    expect(screen.getByRole("button", { name: "Add to library" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New HTML name"), { target: { value: "Pasted calculator" } });
    fireEvent.change(screen.getByLabelText("HTML source to add"), { target: { value: "```html\n<p>Calculator</p>\n```" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
    expect(loadMiniApps("u").at(-1)).toMatchObject({ name: "Pasted calculator", html: "<p>Calculator</p>" });
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>Calculator</p>");
    expect(screen.queryByTitle("Pasted calculator — preview")).not.toBeInTheDocument();
  });

  it("shows compatibility hints and disables oversized pasted source", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Paste HTML" }));
    fireEvent.change(screen.getByLabelText("HTML source to add"), { target: { value: '<script src="https://example.com/a.js"></script>' } });
    expect(screen.getByText(/External scripts, images or styles/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to library" })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText("HTML source to add"), { target: { value: "س".repeat(MAX_MINI_APP_HTML_BYTES / 2 + 1) } });
    expect(screen.getByRole("button", { name: "Add to library" })).toBeDisabled();
  });

  it("supports adding HTML in the Persian interface", () => {
    mocks.isEn = false;
    mount();
    fireEvent.click(screen.getByRole("button", { name: "چسباندن HTML" }));
    fireEvent.change(screen.getByLabelText("کد HTML برای افزودن"), { target: { value: "<p>سلام</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "افزودن به مخزن" }));
    expect(screen.getByLabelText("ویرایش کد HTML")).toHaveValue("<p>سلام</p>");
  });
});

function sendPreviewMessage(action: string, payload: Record<string, unknown>, valid = true) {
  const frame = screen.getByTitle("Tool — preview") as HTMLIFrameElement;
  const token = JSON.parse(frame.srcdoc.match(/const token=(.*?);/)![1]);
  act(() => window.dispatchEvent(new MessageEvent("message", {
    source: frame.contentWindow,
    data: { channel: "arshiam-mini-app", token: valid ? token : "wrong-token", action, payload },
  })));
}

describe("HTML preview feedback", () => {
  it("shows errors as inert text and clears them on rerun", () => {
    mount();
    sendPreviewMessage("runtimeError", { message: '<img src=x onerror="alert(1)">', line: 10, column: 3 });
    expect(screen.getByRole("alert")).toHaveTextContent("Preview errors");
    expect(screen.getByRole("alert").querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Run latest source" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores forged tokens and caps preview errors", () => {
    mount();
    sendPreviewMessage("runtimeError", { message: "Forged" }, false);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    for (let i = 0; i < 10; i++) sendPreviewMessage("runtimeError", { message: `Error ${i}` });
    expect(screen.getByRole("alert").querySelectorAll("li")).toHaveLength(5);
  });

  it("invalidates an old bridge confirmation on rerun", () => {
    mount();
    sendPreviewMessage("createTask", { title: "Old preview task", description: "" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Old preview task");
    fireEvent.click(screen.getByRole("button", { name: "Run latest source", hidden: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/app/mini-apps");
  });

  it("invalidates a bridge confirmation when switching accounts", () => {
    const { rerender } = mount();
    sendPreviewMessage("copyText", { text: "Previous account text" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    mocks.user = { id: "v" };
    rerender(<Library />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
