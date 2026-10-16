import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MiniAppsView from "./MiniAppsView";
import { loadMiniApps, saveMiniAppsLocal, type MiniApp } from "@/lib/miniAppsStore";
import { loadMiniAppsHistory, recordMiniAppVersions } from "@/lib/miniAppsHistory";

const mocks = vi.hoisted(() => ({
  user: { id: "u" },
  bindings: [] as { userId: string; name: string; apply: (data: unknown, updatedAt: number) => void }[],
  push: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/cloudStateSync", () => ({ bindCloudState: (userId: string, name: string, opts: { apply: (data: unknown, updatedAt: number) => void }) => {
  mocks.bindings.push({ userId, name, apply: opts.apply });
  return { stop: vi.fn(), push: mocks.push };
} }));

const app: MiniApp = { id: "one", name: "Tool", emoji: "", description: "", aiRequest: "", html: "<p>Original</p>", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const Library = () => <BrowserRouter><MiniAppsView /></BrowserRouter>;
const mount = () => render(<Library />);
const editSource = (html: string) => {
  if (!screen.queryByLabelText("Edit HTML source")) fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Edit HTML source"), { target: { value: html } });
};
beforeEach(() => {
  localStorage.clear();
  mocks.user = { id: "u" };
  mocks.bindings = [];
  mocks.push.mockClear();
  window.history.replaceState({ idx: 0 }, "", "/app/mini-apps");
  saveMiniAppsLocal("u", [app]);
});
afterEach(() => vi.restoreAllMocks());

describe("complete HTML library enhancements", () => {
  it.each(["Calculator", "Checklist", "Timer"])("creates the offline %s template as a separate non-running app", name => {
    mount();
    editSource("<p>Retained work</p>");
    fireEvent.click(screen.getByRole("button", { name: "Starter templates" }));
    fireEvent.click(screen.getByRole("button", { name: `Create ${name}` }));
    const apps = loadMiniApps("u");
    expect(apps).toHaveLength(2);
    expect(apps[0].html).toBe(app.html);
    expect(apps[1].name).toBe(name);
    expect(apps[1].html).toContain("<!doctype html>");
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue(apps[1].html);
    expect(screen.queryByTitle(`${name} — preview`)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("arshnaz_mini_app_draft_v1_u_one")!).html).toBe("<p>Retained work</p>");
    expect(loadMiniAppsHistory("u").versions.some(version => version.appId === apps[1].id)).toBe(true);
  });

  it("resizes the same iframe without changing srcDoc, token or in-frame state", () => {
    mount();
    const frame = screen.getByTitle("Tool — preview") as HTMLIFrameElement;
    const original = frame.srcdoc;
    const frameWindow = frame.contentWindow as unknown as Record<string, unknown>;
    frameWindow.qaCounter = 42;
    for (const [device, width] of [["Mobile", "390px"], ["Tablet", "768px"], ["Desktop", "1024px"]]) {
      fireEvent.click(screen.getByRole("button", { name: device }));
      expect(screen.getByTitle("Tool — preview")).toBe(frame);
      expect(frame.srcdoc).toBe(original);
      expect(screen.getByTestId("html-preview-width")).toHaveStyle({ width });
      expect((frame.contentWindow as unknown as Record<string, unknown>).qaCounter).toBe(42);
    }
    fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
    expect(screen.getByTestId("html-preview-width")).toHaveStyle({ width: "100%" });
  });

  it("captures original and changed code while Save does not rerun the preview", () => {
    mount();
    const frame = screen.getByTitle("Tool — preview");
    const original = frame.getAttribute("srcdoc");
    editSource("<p>Saved change</p>");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const versions = loadMiniAppsHistory("u").versions;
    expect(versions.map(version => version.app.html)).toEqual(["<p>Saved change</p>", app.html]);
    expect(versions[0].kind).toBe("save");
    expect(loadMiniApps("u")[0].html).toBe("<p>Saved change</p>");
    expect(frame.getAttribute("srcdoc")).toBe(original);
  });

  it("captures a manual checkpoint without saving or running code", () => {
    mount();
    editSource("<p>Manual checkpoint</p>");
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    fireEvent.click(screen.getByRole("button", { name: "Capture version" }));
    expect(loadMiniAppsHistory("u").versions[0].app.html).toBe("<p>Manual checkpoint</p>");
    expect(loadMiniApps("u")[0].html).toBe(app.html);
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(screen.getByTitle("Tool — preview").getAttribute("srcdoc")).toContain("Original");
  });

  it("backs up an unsaved draft before restore and leaves saved code and preview untouched", () => {
    mount();
    const frame = screen.getByTitle("Tool — preview");
    editSource("<p>Saved change</p>");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    editSource("<p>Unsaved work</p>");
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    const originalVersion = loadMiniAppsHistory("u").versions.find(version => version.app.html === app.html)!;
    fireEvent.change(screen.getByLabelText("Version to compare"), { target: { value: originalVersion.id } });
    fireEvent.click(screen.getByRole("button", { name: "Restore to draft" }));
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue(app.html);
    expect(loadMiniApps("u")[0].html).toBe("<p>Saved change</p>");
    expect(loadMiniAppsHistory("u").versions.some(version => version.app.html === "<p>Unsaved work</p>")).toBe(true);
    expect(screen.getByTitle("Tool — preview")).toBe(frame);
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("blocks a destructive Save if the previous version cannot be retained", () => {
    mount();
    editSource("<p>Cannot archive</p>");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith("arshnaz_mini_apps_history_v1_")) throw new Error("quota");
      originalSetItem.call(this, key, value);
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(loadMiniApps("u")[0].html).toBe(app.html);
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>Cannot archive</p>");
    expect(screen.getByRole("alert")).toHaveTextContent("could not be retained");
  });

  it("blocks restore when archiving the current draft fails", () => {
    recordMiniAppVersions("u", [app, { ...app, html: "<p>Previous alternative</p>" }]);
    mount();
    editSource("<p>Do not lose this draft</p>");
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Restore to draft" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(screen.getByLabelText("Edit HTML source")).toHaveValue("<p>Do not lose this draft</p>");
  });

  it("closes history on account change and ignores late history-cloud callbacks", () => {
    const initialHistory = recordMiniAppVersions("u", [app]);
    const { rerender } = mount();
    const oldBinding = mocks.bindings.find(binding => binding.userId === "u" && binding.name === "mini_apps_history_v1")!;
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    saveMiniAppsLocal("v", [{ ...app, id: "v-tool", name: "Other account" }]);
    mocks.user = { id: "v" };
    rerender(<Library />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => oldBinding.apply(initialHistory.data, initialHistory.updatedAt + 100));
    expect(loadMiniAppsHistory("v").versions).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("No versions yet");
  });

  it("renders historical HTML as inert code text", () => {
    recordMiniAppVersions("u", [{ ...app, html: '<img src=x onerror="alert(1)">' }]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    expect(screen.getByTestId("html-version-diff")).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(screen.getByTestId("html-version-diff").querySelector("img")).toBeNull();
  });

  it("maps runtime error lines back to the editor and disables stale jumps", () => {
    const source = "<script>\nthrow Error('QA');\n</script>";
    saveMiniAppsLocal("u", [{ ...app, html: source }]);
    mount();
    const frame = screen.getByTitle("Tool — preview") as HTMLIFrameElement;
    const prefix = frame.srcdoc.slice(0, frame.srcdoc.length - source.length);
    const offset = prefix.split("\n").length - 1;
    const token = JSON.parse(frame.srcdoc.match(/const token=(.*?);/)![1]);
    act(() => window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, data: { channel: "arshiam-mini-app", token, action: "runtimeError", payload: { message: "QA error", line: offset + 2, column: 1 } } })));
    fireEvent.click(screen.getByRole("button", { name: "Go to source line 2" }));
    const editor = screen.getByLabelText("Edit HTML source") as HTMLTextAreaElement;
    expect(editor.selectionStart).toBe(source.indexOf("throw"));
    editSource(source + "\n<!-- changed -->");
    expect(screen.getByRole("button", { name: "Go to source line 2" })).toBeDisabled();
  });
});

describe("verified history save outcomes", () => {
  it("uses exactly the canonical saved app in the editor and version history", () => {
    mount();
    editSource("<p>Canonical edit</p>");
    fireEvent.change(screen.getByLabelText("Mini-app emoji"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const confirmed = loadMiniApps("u")[0];
    expect(screen.getByLabelText("Mini-app emoji")).toHaveValue(confirmed.emoji);
    expect(loadMiniAppsHistory("u").versions[0].app).toEqual(confirmed);
  });
  it("keeps the original and attempted version when the primary library save fails", () => {
    mount();
    editSource("<p>Failed save attempt</p>");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith("arshnaz_mini_apps_v1_")) throw new Error("library quota");
      originalSetItem.call(this, key, value);
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(loadMiniApps("u")[0].html).toBe(app.html);
    expect(loadMiniAppsHistory("u").versions.map(version => version.app.html)).toEqual(["<p>Failed save attempt</p>", app.html]);
    expect(loadMiniAppsHistory("u").versions[0].kind).toBe("checkpoint");
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });
  it("removes a deleted tool's history and retains a deletion fence", () => {
    recordMiniAppVersions("u", [app]);
    mount();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(loadMiniApps("u")).toHaveLength(0);
    expect(loadMiniAppsHistory("u").versions).toHaveLength(0);
    expect(loadMiniAppsHistory("u").deletedApps.some(entry => entry.appId === app.id)).toBe(true);
  });
});
